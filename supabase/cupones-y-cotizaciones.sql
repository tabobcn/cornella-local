-- ============================================================================
-- 2026-10-31: cupones que se agotan al sacarlos + aviso de cotización recibida
-- ----------------------------------------------------------------------------
-- 1) Cupones: antes solo contaban los VALIDADOS en tienda (redemption_count), así
--    que con 10 cupones podían sacar código 50 personas y 40 se encontraban la
--    oferta agotada en el mostrador. Ahora claimed_count cuenta los códigos
--    entregados: baja al sacarlo y al llegar al límite no se dan más.
--    redemption_count sigue contando los validados (lo que ve el negocio).
-- 2) Los contadores de ofertas solo los cambian las funciones del sistema.
-- 3) Cotización nueva → aviso dentro de la app para el cliente (antes solo push/email).
-- ============================================================================
BEGIN;

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS claimed_count integer NOT NULL DEFAULT 0;

UPDATE public.offers o
   SET claimed_count = (SELECT count(*) FROM public.offer_redemptions r
                         WHERE r.offer_id = o.id AND COALESCE(r.status, '') <> 'expired');

CREATE OR REPLACE FUNCTION public.get_or_create_redemption(p_offer_id uuid, p_user_id uuid, p_business_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_redemption public.offer_redemptions%ROWTYPE;
  v_offer record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Si ya tiene código para esta oferta, se le devuelve el mismo (no gasta otro cupón)
  SELECT * INTO v_redemption FROM public.offer_redemptions WHERE offer_id = p_offer_id AND user_id = v_uid;
  IF FOUND THEN
    RETURN json_build_object('code', v_redemption.code, 'status', v_redemption.status, 'created_at', v_redemption.created_at);
  END IF;

  -- FOR UPDATE: dos personas a la vez no pueden llevarse el último cupón
  SELECT id, business_id, max_uses, claimed_count, status, is_visible
    INTO v_offer FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR v_offer.status <> 'active' OR v_offer.is_visible IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'offer_unavailable');
  END IF;
  IF v_offer.max_uses IS NOT NULL AND COALESCE(v_offer.claimed_count, 0) >= v_offer.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'max_uses_reached');
  END IF;

  INSERT INTO public.offer_redemptions (offer_id, user_id, business_id, code, status)
  VALUES (p_offer_id, v_uid, v_offer.business_id, public.generate_redemption_code(), 'pending')
  RETURNING * INTO v_redemption;

  UPDATE public.offers SET claimed_count = COALESCE(claimed_count, 0) + 1 WHERE id = p_offer_id;

  RETURN json_build_object('code', v_redemption.code, 'status', v_redemption.status, 'created_at', v_redemption.created_at);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_or_create_redemption(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_redemption(uuid, uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.offers_protect_counters()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.claimed_count := 0;
    NEW.redemption_count := 0;
  ELSE
    NEW.claimed_count := OLD.claimed_count;
    NEW.redemption_count := OLD.redemption_count;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.offers_protect_counters() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS offers_protect_counters ON public.offers;
CREATE TRIGGER offers_protect_counters
  BEFORE INSERT OR UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.offers_protect_counters();

CREATE OR REPLACE FUNCTION public.push_notify_budget_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid;
  v_business text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO v_user FROM public.budget_requests WHERE id = NEW.budget_request_id;
    SELECT name INTO v_business FROM public.businesses WHERE id = NEW.business_id;

    IF v_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
      VALUES (v_user, 'budget_quote_received', 'Has recibido un presupuesto',
              COALESCE(v_business, 'Un negocio') || ' te ofrece ' || NEW.price || ' €. Compara y elige el que prefieras.',
              'FileText', jsonb_build_object('budget_request_id', NEW.budget_request_id, 'quote_id', NEW.id, 'business_id', NEW.business_id), false);
      BEGIN
        PERFORM public.send_push_notification(
          target_user_id := v_user,
          notification_title := '📋 Respuesta a tu presupuesto',
          notification_message := COALESCE(v_business, 'Un negocio') || ' te ha respondido: ' || NEW.price || ' €',
          notification_url := 'https://www.cornellalocal.es/?nav=my-budget-requests',
          notification_type := 'budget_response',
          require_interaction := false,
          notification_metadata := jsonb_build_object(
            'business_name', v_business,
            'estimated_price', NEW.price,
            'quote_id', NEW.id,
            'request_id', NEW.budget_request_id
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'push_notify_budget_response (quote %): %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.push_notify_budget_response() FROM PUBLIC, anon, authenticated;

COMMIT;

SELECT title, max_uses, claimed_count AS cupones_entregados, redemption_count AS validados_en_tienda
  FROM public.offers WHERE max_uses IS NOT NULL ORDER BY created_at DESC LIMIT 10;
