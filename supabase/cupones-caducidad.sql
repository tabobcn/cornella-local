-- ============================================================================
-- 2026-10-31: los códigos de cupón caducan si no se canjean a tiempo
-- ----------------------------------------------------------------------------
-- El negocio elige al crear la oferta cuánto tiempo tiene el cliente para canjear su código
-- en la tienda: 24 h, 48 h, 72 h o hasta que termine la oferta (offers.code_valid_hours;
-- NULL = hasta que termine). En las ofertas flash (8 horas) siempre es hasta que terminen.
--  - Al sacar el código se apunta hasta cuándo vale (offer_redemptions.expires_at).
--  - Si no se valida a tiempo, el código caduca ('expired') y el cupón vuelve a estar
--    disponible para otro vecino. Esa persona no puede sacar otro código de la misma oferta.
--  - Cada 15 minutos se liberan los cupones caducados (y también al sacar o validar un código).
--  - claimed_count = códigos en vigor + validados (lo que se enseña como "Quedan X de Y").
-- Además: las páginas de Google se regeneran también si cambia la dirección, el teléfono o el horario.
-- Se puede ejecutar más de una vez. Requiere limite-ofertas.sql y auditoria-arreglos.sql.
-- ============================================================================
BEGIN;

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS code_valid_hours integer;
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_code_valid_hours_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_code_valid_hours_check
  CHECK (code_valid_hours IS NULL OR code_valid_hours IN (24, 48, 72));

ALTER TABLE public.offer_redemptions ADD COLUMN IF NOT EXISTS expires_at timestamptz;
-- Los códigos que ya existían valen hasta que termine su oferta (como hasta ahora)
UPDATE public.offer_redemptions r
   SET expires_at = o.expires_at
  FROM public.offers o
 WHERE o.id = r.offer_id AND r.expires_at IS NULL AND r.status = 'pending';
CREATE INDEX IF NOT EXISTS offer_redemptions_pending_expiry_idx
  ON public.offer_redemptions (expires_at) WHERE status = 'pending';

-- Reglas de las ofertas (versión de limite-ofertas.sql + el tiempo para canjear, que tampoco
-- se puede cambiar tras publicar). Sin SECURITY DEFINER a propósito (current_user real).
CREATE OR REPLACE FUNCTION public.offers_enforce_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  v_reason text;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_reason := public.offer_publish_block_reason(NEW.business_id);
    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION '%', v_reason USING ERRCODE = 'P0001';
    END IF;
    NEW.created_at := now();
    NEW.starts_at := now();
    NEW.expires_at := now() + CASE WHEN COALESCE(NEW.is_flash, false) THEN interval '8 hours' ELSE interval '5 days' END;
    IF COALESCE(NEW.is_flash, false) THEN
      NEW.code_valid_hours := NULL;   -- flash: el código vale hasta que acabe (8 h)
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: el dueño solo puede pausar/reactivar y editar textos
  NEW.business_id := OLD.business_id;
  NEW.created_at := OLD.created_at;
  NEW.starts_at := OLD.starts_at;
  NEW.expires_at := OLD.expires_at;
  NEW.is_flash := OLD.is_flash;
  NEW.max_uses := OLD.max_uses;
  NEW.code_valid_hours := OLD.code_valid_hours;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.offers_enforce_rules() FROM PUBLIC, anon, authenticated;

-- Caduca los códigos vencidos de una oferta (o de todas si p_offer_id es NULL) y recalcula el
-- contador de cupones entregados. Devuelve cuántos códigos han caducado.
CREATE OR REPLACE FUNCTION public.expire_redemption_codes(p_offer_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_n integer;
  v_offers uuid[];
BEGIN
  -- Dos pasos: dentro de una misma sentencia (WITH) el recuento no vería los cambios de estado
  WITH expired AS (
    UPDATE public.offer_redemptions
       SET status = 'expired'
     WHERE status = 'pending'
       AND expires_at IS NOT NULL AND expires_at <= now()
       AND (p_offer_id IS NULL OR offer_id = p_offer_id)
    RETURNING offer_id
  )
  SELECT count(*), array_agg(DISTINCT offer_id) INTO v_n, v_offers FROM expired;

  IF v_n > 0 THEN
    UPDATE public.offers o
       SET claimed_count = (SELECT count(*) FROM public.offer_redemptions r
                             WHERE r.offer_id = o.id AND r.status IN ('pending', 'validated'))
     WHERE o.id = ANY (v_offers);
  END IF;
  RETURN v_n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.expire_redemption_codes(uuid) FROM PUBLIC, anon, authenticated;

-- Sacar código: reserva un cupón durante el tiempo que eligió el negocio
CREATE OR REPLACE FUNCTION public.get_or_create_redemption(p_offer_id uuid, p_user_id uuid, p_business_id integer)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_redemption public.offer_redemptions%ROWTYPE;
  v_offer record;
  v_active integer;
  v_code_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- FOR UPDATE: dos personas a la vez no pueden llevarse el último cupón
  SELECT id, business_id, max_uses, status, is_visible, starts_at, expires_at, code_valid_hours
    INTO v_offer
    FROM public.offers WHERE id = p_offer_id FOR UPDATE;

  -- Libera antes los códigos de esta oferta que ya han caducado
  IF FOUND THEN
    PERFORM public.expire_redemption_codes(p_offer_id);
  END IF;

  -- Si ya tiene código para esta oferta, se le devuelve el mismo (también si caducó: no puede sacar otro)
  SELECT * INTO v_redemption FROM public.offer_redemptions WHERE offer_id = p_offer_id AND user_id = v_uid;
  IF FOUND THEN
    RETURN json_build_object('code', v_redemption.code, 'status', v_redemption.status,
                             'created_at', v_redemption.created_at, 'expires_at', v_redemption.expires_at);
  END IF;

  IF v_offer.id IS NULL OR v_offer.status <> 'active' OR v_offer.is_visible IS NOT TRUE
     OR (v_offer.expires_at IS NOT NULL AND v_offer.expires_at <= now())
     OR (v_offer.starts_at IS NOT NULL AND v_offer.starts_at > now()) THEN
    RETURN json_build_object('success', false, 'error', 'offer_unavailable');
  END IF;

  SELECT count(*) INTO v_active FROM public.offer_redemptions
   WHERE offer_id = p_offer_id AND status IN ('pending', 'validated');
  IF v_offer.max_uses IS NOT NULL AND v_active >= v_offer.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'max_uses_reached');
  END IF;

  v_code_expires := CASE
    WHEN v_offer.code_valid_hours IS NULL THEN v_offer.expires_at
    ELSE LEAST(now() + make_interval(hours => v_offer.code_valid_hours), COALESCE(v_offer.expires_at, 'infinity'::timestamptz))
  END;

  INSERT INTO public.offer_redemptions (offer_id, user_id, business_id, code, status, expires_at)
  VALUES (p_offer_id, v_uid, v_offer.business_id, public.generate_redemption_code(), 'pending', v_code_expires)
  RETURNING * INTO v_redemption;
  UPDATE public.offers SET claimed_count = v_active + 1 WHERE id = p_offer_id;

  RETURN json_build_object('code', v_redemption.code, 'status', v_redemption.status,
                           'created_at', v_redemption.created_at, 'expires_at', v_redemption.expires_at);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_or_create_redemption(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_redemption(uuid, uuid, integer) TO authenticated;

-- Validar en tienda: un código caducado ya no vale (y su cupón vuelve a estar disponible)
CREATE OR REPLACE FUNCTION public.validate_redemption_code(p_code text, p_owner_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_redemption public.offer_redemptions%ROWTYPE;
  v_offer record;
  v_user record;
BEGIN
  IF v_uid IS NULL OR (p_owner_id IS NOT NULL AND p_owner_id <> v_uid) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permiso para validar códigos.');
  END IF;

  SELECT * INTO v_redemption FROM public.offer_redemptions WHERE code = UPPER(TRIM(p_code)) FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Código no encontrado. Revisa que está bien escrito.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_redemption.business_id AND owner_id = v_uid) THEN
    RETURN json_build_object('success', false, 'error', 'Este código no pertenece a tu negocio.');
  END IF;
  IF v_redemption.status = 'validated' THEN
    RETURN json_build_object('success', false, 'error', 'Este código ya fue utilizado anteriormente.');
  END IF;
  IF v_redemption.status = 'pending' AND v_redemption.expires_at IS NOT NULL AND v_redemption.expires_at <= now() THEN
    PERFORM public.expire_redemption_codes(v_redemption.offer_id);
    v_redemption.status := 'expired';
  END IF;
  IF v_redemption.status = 'expired' THEN
    RETURN json_build_object('success', false, 'error',
      'Este código caducó' || COALESCE(' el ' || to_char(v_redemption.expires_at AT TIME ZONE 'Europe/Madrid', 'DD/MM "a las" HH24:MI'), '')
      || ' sin canjearse. El cupón ya ha pasado a otro cliente.');
  END IF;

  SELECT title, discount_label, discount_value, max_uses, redemption_count INTO v_offer
    FROM public.offers WHERE id = v_redemption.offer_id FOR UPDATE;
  IF v_offer.max_uses IS NOT NULL AND COALESCE(v_offer.redemption_count, 0) >= v_offer.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Esta oferta ha alcanzado el límite de usos.');
  END IF;

  SELECT full_name INTO v_user FROM public.profiles WHERE id = v_redemption.user_id;
  UPDATE public.offer_redemptions SET status = 'validated', validated_at = NOW(), validated_by = v_uid WHERE id = v_redemption.id;
  UPDATE public.offers SET redemption_count = COALESCE(redemption_count, 0) + 1 WHERE id = v_redemption.offer_id;

  RETURN json_build_object(
    'success', true,
    'user_name', COALESCE(v_user.full_name, 'Cliente'),
    'offer_title', v_offer.title,
    'discount', COALESCE(v_offer.discount_label, v_offer.discount_value::text || '%'),
    'redemption_count', COALESCE(v_offer.redemption_count, 0) + 1,
    'max_uses', v_offer.max_uses
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_redemption_code(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_redemption_code(text, uuid) TO authenticated;

-- Las páginas de Google ahora muestran dirección, teléfono y horario: si el dueño los cambia,
-- también hay que regenerarlas (antes solo miraba nombre, fotos, descripción...)
DROP TRIGGER IF EXISTS businesses_mark_site_dirty ON public.businesses;
CREATE TRIGGER businesses_mark_site_dirty
  AFTER UPDATE OF name, slug, description, subcategory, neighborhood, cover_photo, images, rating, review_count,
                  category_id, is_published, verification_status, address, phone, opening_hours
  ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.mark_site_dirty();
-- Y se regeneran una vez para que salgan ya los datos nuevos
UPDATE public.site_rebuild_state SET dirty = true, marked_at = now() WHERE id = 1;

COMMIT;

-- Cada 15 minutos se liberan los cupones de los códigos caducados
SELECT cron.schedule('caducar-codigos', '*/15 * * * *', $$SELECT public.expire_redemption_codes();$$);
SELECT public.expire_redemption_codes();

-- Comprobación
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'caducar-codigos';
