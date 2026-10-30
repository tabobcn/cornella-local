-- ============================================================================
-- SECURITY HARDENING v3 — CornellaLocal (auditoría 2026-10-30)
-- Aplicado en producción vía migración "security_hardening_v3".
-- Compatible con el frontend actual (no rompe nada): el código ya lee solo el
-- perfil propio (o todos si es admin) y ya usa URLs firmadas para documentos y CVs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Helper: ¿el usuario actual es admin? (SECURITY DEFINER para no causar
--    recursión en las políticas de profiles)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1) PROFILES: nadie puede leer email/teléfono/fecha de nacimiento de otros
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles públicos son visibles" ON public.profiles;
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON public.profiles;
CREATE POLICY "Admins pueden ver todos los perfiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());
-- (se mantiene "Usuarios pueden ver su propio perfil": auth.uid() = id)

-- ----------------------------------------------------------------------------
-- 2) STORAGE: documentos de verificación y CVs privados
-- ----------------------------------------------------------------------------
UPDATE storage.buckets SET public = false WHERE id IN ('verification-documents', 'job-applications');

-- verification-documents: cada propietario en su carpeta {uid}/...; admin lo ve todo
DROP POLICY IF EXISTS "Propietarios pueden ver sus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Propietarios pueden subir documentos" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs-insert-own" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs-read-own-or-admin" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs-delete-own" ON storage.objects;
CREATE POLICY "verification-docs-insert-own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "verification-docs-read-own-or-admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'verification-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY "verification-docs-delete-own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- job-applications: el candidato sube/lee su CV (cvs/{uid}_...); el dueño de la oferta y admin lo leen
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir CVs" ON storage.objects;
DROP POLICY IF EXISTS "job-applications-insert-own-cv" ON storage.objects;
DROP POLICY IF EXISTS "job-applications-read-own-cv" ON storage.objects;
DROP POLICY IF EXISTS "job-applications-read-owner-cv" ON storage.objects;
CREATE POLICY "job-applications-insert-own-cv" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-applications' AND (storage.foldername(name))[1] = 'cvs'
              AND left(storage.filename(name), 37) = auth.uid()::text || '_');
CREATE POLICY "job-applications-read-own-cv" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'job-applications' AND (
           (storage.foldername(name))[1] = 'cvs' AND left(storage.filename(name), 37) = auth.uid()::text || '_'
           OR public.is_admin()));
CREATE POLICY "job-applications-read-owner-cv" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'job-applications' AND EXISTS (
           SELECT 1 FROM public.job_applications ja
           JOIN public.jobs j ON j.id = ja.job_id
           JOIN public.businesses b ON b.id = j.business_id
           WHERE b.owner_id = auth.uid() AND ja.cv_url = storage.objects.name));

-- ----------------------------------------------------------------------------
-- 3) BUSINESSES: solo se ven públicamente los negocios aprobados y publicados
--    (el propietario sigue viendo el suyo y el admin todos)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON public.businesses;
DROP POLICY IF EXISTS "Negocios publicados son públicos" ON public.businesses;
DROP POLICY IF EXISTS "Propietarios ven su negocio" ON public.businesses;
CREATE POLICY "Negocios publicados son públicos" ON public.businesses FOR SELECT
  USING (verification_status = 'approved' AND is_published = true);
CREATE POLICY "Propietarios ven su negocio" ON public.businesses FOR SELECT
  USING (auth.uid() = owner_id);

-- Bloquear autoverificación y manipulación de valoraciones/contadores
CREATE OR REPLACE FUNCTION public.businesses_protect_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Funciones del sistema (SECURITY DEFINER), service_role y admins: sin restricción
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'pending';
    NEW.is_verified := false;
    NEW.is_published := false;
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
    NEW.verification_notes := NULL;
    NEW.rejection_reason := NULL;
    NEW.rejection_count := 0;
    NEW.rating := 0;
    NEW.review_count := 0;
    NEW.view_count := 0;
    NEW.click_count := 0;
    RETURN NEW;
  END IF;

  -- UPDATE por el propietario
  NEW.id := OLD.id;
  NEW.owner_id := OLD.owner_id;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    -- Solo puede volver a "pendiente" (reenviar / apelar) si no estaba aprobado
    IF NOT (NEW.verification_status = 'pending' AND COALESCE(OLD.verification_status, '') <> 'approved') THEN
      NEW.verification_status := OLD.verification_status;
    END IF;
  END IF;
  NEW.is_verified := OLD.is_verified;
  NEW.verified_at := OLD.verified_at;
  NEW.verified_by := OLD.verified_by;
  NEW.verification_notes := OLD.verification_notes;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.rejection_count := OLD.rejection_count;
  NEW.rating := OLD.rating;
  NEW.review_count := OLD.review_count;
  NEW.view_count := OLD.view_count;
  NEW.click_count := OLD.click_count;
  NEW.last_viewed_at := OLD.last_viewed_at;
  IF NEW.is_published AND COALESCE(NEW.verification_status, '') <> 'approved' THEN
    NEW.is_published := false;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS businesses_protect_privileged ON public.businesses;
CREATE TRIGGER businesses_protect_privileged
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_protect_privileged_columns();

-- La valoración media ahora la calcula la base de datos (antes solo hacía un log
-- y el UPDATE del cliente lo bloqueaba RLS, así que la nota nunca se guardaba)
CREATE OR REPLACE FUNCTION public.update_business_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_id integer := COALESCE(NEW.business_id, OLD.business_id);
BEGIN
  UPDATE public.businesses b
     SET rating = COALESCE(s.avg_rating, 0),
         review_count = COALESCE(s.total, 0)
    FROM (SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS total
            FROM public.reviews WHERE business_id = v_business_id) s
   WHERE b.id = v_business_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ----------------------------------------------------------------------------
-- 4) CUPONES: la identidad sale de la sesión, no de un parámetro
-- ----------------------------------------------------------------------------
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

  SELECT * INTO v_redemption FROM public.offer_redemptions WHERE offer_id = p_offer_id AND user_id = v_uid;
  IF FOUND THEN
    RETURN json_build_object('code', v_redemption.code, 'status', v_redemption.status, 'created_at', v_redemption.created_at);
  END IF;

  SELECT id, business_id, max_uses, redemption_count, status, is_visible
    INTO v_offer FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR v_offer.status <> 'active' OR v_offer.is_visible IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'offer_unavailable');
  END IF;
  IF v_offer.max_uses IS NOT NULL AND COALESCE(v_offer.redemption_count, 0) >= v_offer.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'max_uses_reached');
  END IF;

  INSERT INTO public.offer_redemptions (offer_id, user_id, business_id, code, status)
  VALUES (p_offer_id, v_uid, v_offer.business_id, public.generate_redemption_code(), 'pending')
  RETURNING * INTO v_redemption;

  RETURN json_build_object('code', v_redemption.code, 'status', v_redemption.status, 'created_at', v_redemption.created_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_redemption_code(p_code text, p_owner_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
  IF v_redemption.status = 'expired' THEN
    RETURN json_build_object('success', false, 'error', 'Este código ha expirado.');
  END IF;

  SELECT title, discount_label, discount_value, max_uses, redemption_count
    INTO v_offer FROM public.offers WHERE id = v_redemption.offer_id FOR UPDATE;
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

-- ----------------------------------------------------------------------------
-- 5) ESTADÍSTICAS: solo el propietario del negocio o un admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_business_stats(p_business_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin() OR EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.can_view_business_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_business_stats(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_business_stats(p_business_id integer, p_days integer DEFAULT 30)
RETURNS TABLE(total_views bigint, total_clicks bigint, total_favorites bigint, unique_visitors bigint, avg_daily_views numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.can_view_business_stats(p_business_id) THEN RETURN; END IF;
  RETURN QUERY
  SELECT COUNT(*) FILTER (WHERE event_type = 'view'),
         COUNT(*) FILTER (WHERE event_type IN ('click_phone', 'click_website', 'click_share')),
         COUNT(*) FILTER (WHERE event_type = 'favorite'),
         COUNT(DISTINCT user_id),
         ROUND(COUNT(*) FILTER (WHERE event_type = 'view')::numeric / NULLIF(p_days, 0), 2)
    FROM public.business_analytics
   WHERE business_id = p_business_id AND created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_stats(p_business_id integer, p_days integer DEFAULT 30)
RETURNS TABLE(date date, views bigint, clicks bigint, favorites bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.can_view_business_stats(p_business_id) THEN RETURN; END IF;
  RETURN QUERY
  SELECT ba.created_at::date,
         COUNT(*) FILTER (WHERE ba.event_type = 'view'),
         COUNT(*) FILTER (WHERE ba.event_type IN ('click_phone', 'click_website', 'click_share')),
         COUNT(*) FILTER (WHERE ba.event_type = 'favorite')
    FROM public.business_analytics ba
   WHERE ba.business_id = p_business_id AND ba.created_at >= NOW() - INTERVAL '1 day' * p_days
   GROUP BY ba.created_at::date
   ORDER BY 1 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_hourly_distribution(p_business_id integer, p_days integer DEFAULT 7)
RETURNS TABLE(hour integer, view_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.can_view_business_stats(p_business_id) THEN RETURN; END IF;
  RETURN QUERY
  SELECT EXTRACT(HOUR FROM ba.created_at)::integer, COUNT(*)
    FROM public.business_analytics ba
   WHERE ba.business_id = p_business_id AND ba.event_type = 'view'
     AND ba.created_at >= NOW() - INTERVAL '1 day' * p_days
   GROUP BY 1
   ORDER BY 1;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6) PRESUPUESTOS: la función que llama el frontend al aceptar no existía
--    (el usuario veía "Error al aceptar el presupuesto" aunque sí se aceptaba)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_budget_quote_result(p_budget_request_id uuid, p_accepted_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  q record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.budget_requests WHERE id = p_budget_request_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'No puedes notificar resultados de este presupuesto';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.budget_quotes WHERE id = p_accepted_quote_id AND budget_request_id = p_budget_request_id) THEN
    RAISE EXCEPTION 'La cotización no pertenece a este presupuesto';
  END IF;

  UPDATE public.budget_quotes
     SET status = CASE WHEN id = p_accepted_quote_id THEN 'accepted' ELSE 'rejected' END
   WHERE budget_request_id = p_budget_request_id;

  FOR q IN
    SELECT bq.id, bq.business_id, bq.price, b.owner_id
      FROM public.budget_quotes bq
      JOIN public.businesses b ON b.id = bq.business_id
     WHERE bq.budget_request_id = p_budget_request_id AND b.owner_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
    VALUES (
      q.owner_id,
      CASE WHEN q.id = p_accepted_quote_id THEN 'budget_quote_accepted' ELSE 'budget_quote_rejected' END,
      CASE WHEN q.id = p_accepted_quote_id THEN '¡Presupuesto aceptado!' ELSE 'Presupuesto no seleccionado' END,
      CASE WHEN q.id = p_accepted_quote_id
           THEN 'Un cliente ha aceptado tu presupuesto de ' || q.price || '€'
           ELSE 'El cliente ha elegido otro profesional. ¡Gracias por participar!' END,
      jsonb_build_object('budget_request_id', p_budget_request_id, 'business_id', q.business_id, 'price', q.price),
      false
    );
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7) OFFER_FIRES: cada usuario ve solo sus propios fuegos (el total va en offers.fire_count)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read offer fires" ON public.offer_fires;
DROP POLICY IF EXISTS "Users can read own fires" ON public.offer_fires;
CREATE POLICY "Users can read own fires" ON public.offer_fires FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 8) PERMISOS DE FUNCIONES
-- ----------------------------------------------------------------------------
-- Nadie desde la web puede llamar directamente a las funciones de envío ni a las de triggers
REVOKE EXECUTE ON FUNCTION public.send_email_notification(text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_push_notification(uuid, text, text, text, text, text, boolean, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_push_subscriptions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_redemption_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.businesses_protect_privileged_columns() FROM PUBLIC, anon, authenticated;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Solo usuarios con sesión
REVOKE EXECUTE ON FUNCTION public.can_user_review(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_write_reviews(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_redemption(uuid, uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_redemption_code(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_offer_fire(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_push_subscription(jsonb, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_business_stats(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_stats(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_hourly_distribution(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_budget_quote_result(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_user_review(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_reviews(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_redemption(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_redemption_code(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_offer_fire(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_stats(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_stats(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hourly_distribution(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_budget_quote_result(uuid, uuid) TO authenticated;

-- search_path fijo en las funciones de email que no lo tenían
ALTER FUNCTION public.send_email_notification(text, text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_new_budget_request() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_budget_response() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_new_job_application_email() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_application_status_change_email() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_favorite_new_offer() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_favorite_new_job() SET search_path = public, pg_temp;
