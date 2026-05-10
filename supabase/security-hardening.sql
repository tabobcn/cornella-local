-- ============================================================================
-- SECURITY HARDENING — CornellaLocal
-- Cierra políticas RLS demasiado permisivas detectadas en auditoría 2026-04-25
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================
-- Si alguna política no existe en tu BD, los DROP IF EXISTS no fallarán.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) PROFILES: el SELECT actual permite a anónimos leer email/teléfono/birth_date
-- Solución: vista pública con sólo campos no sensibles + restringir SELECT directo
-- ----------------------------------------------------------------------------

-- Cambiar política SELECT para que solo el dueño + admins vean datos sensibles.
-- Otros usuarios autenticados pueden seguir viendo nombre y avatar (necesario
-- para reseñas, candidaturas, etc.) pero NO email/phone/birth_date/is_admin.
DROP POLICY IF EXISTS "Perfiles públicos son visibles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

CREATE POLICY "profiles_select_self"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  ));

-- Vista pública con datos NO sensibles para el resto de la app
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, full_name, avatar_url, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2) SUPPORT_REQUESTS: WITH CHECK (true) permite spam ilimitado anónimo
-- Solución: exigir auth, limitar tamaño y ratear por email
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can insert support requests" ON public.support_requests;

CREATE POLICY "support_insert_authenticated"
  ON public.support_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
    AND length(coalesce(message, '')) BETWEEN 5 AND 2000
  );

-- Permitir 1 mensaje sin auth (formulario de contacto público) pero rate-limited
-- vía función. Si prefieres bloquear anónimos completamente, comenta el bloque.
CREATE OR REPLACE FUNCTION public.support_insert_anon_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  IF NEW.email IS NULL THEN
    RAISE EXCEPTION 'email es obligatorio';
  END IF;
  IF length(coalesce(NEW.message, '')) NOT BETWEEN 5 AND 2000 THEN
    RAISE EXCEPTION 'mensaje fuera de rango';
  END IF;
  SELECT count(*) INTO recent_count
  FROM public.support_requests
  WHERE email = NEW.email
    AND created_at > now() - interval '1 hour';
  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Demasiadas solicitudes recientes. Espera una hora.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_rate_limit ON public.support_requests;
CREATE TRIGGER support_rate_limit
  BEFORE INSERT ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.support_insert_anon_check();

-- ----------------------------------------------------------------------------
-- 3) BUSINESS_ANALYTICS: WITH CHECK (true) permite falsear métricas
-- Solución: limitar a authenticated y exigir que user_id coincida si se envía
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.business_analytics;

CREATE POLICY "business_analytics_insert"
  ON public.business_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 4) NOTIFICATIONS: WITH CHECK (true) permite suplantar al sistema
-- Solo service_role / triggers SECURITY DEFINER deberían insertar
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "notifications_insert_system_only"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Notificar cambios de verificación desde la BD, sin depender de INSERTs
-- directos desde el cliente (bloqueados por la política anterior).
CREATE OR REPLACE FUNCTION public.notify_business_verification_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title text;
  notification_message text;
  notification_type text;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.verification_status IS NOT DISTINCT FROM NEW.verification_status THEN
    RETURN NEW;
  END IF;

  IF NEW.verification_status = 'approved' THEN
    notification_type := 'business_approved';
    notification_title := '¡Tu negocio ha sido aprobado! Completa tu perfil';
    notification_message := 'Enhorabuena. "' || NEW.name || '" ya aparece en Cornellà Local. Añade foto de portada, galería y descripción para que los clientes te encuentren mejor.';
  ELSIF NEW.verification_status = 'rejected' THEN
    notification_type := 'business_rejected';
    notification_title := 'Solicitud de negocio rechazada';
    notification_message := '"' || NEW.name || '": ' || COALESCE(NEW.rejection_reason, NEW.verification_notes, 'No cumple los requisitos.') || '. Puedes apelar con más información.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
  VALUES (
    NEW.owner_id,
    notification_type,
    notification_title,
    notification_message,
    jsonb_build_object('business_id', NEW.id, 'verification_status', NEW.verification_status),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_business_verification_change ON public.businesses;
CREATE TRIGGER trigger_notify_business_verification_change
  AFTER UPDATE OF verification_status ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.notify_business_verification_change();

CREATE OR REPLACE FUNCTION public.notify_budget_quote_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_owner uuid;
  business_name text;
BEGIN
  SELECT user_id INTO request_owner
  FROM public.budget_requests
  WHERE id = NEW.budget_request_id;

  SELECT name INTO business_name
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF request_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
    VALUES (
      request_owner,
      'budget_quote_received',
      'Nuevo presupuesto recibido',
      COALESCE(business_name, 'Un negocio') || ' te ha enviado un presupuesto de ' || NEW.price || '€',
      jsonb_build_object(
        'budget_request_id', NEW.budget_request_id,
        'business_id', NEW.business_id,
        'business_name', business_name,
        'price', NEW.price
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_budget_quote_received ON public.budget_quotes;
CREATE TRIGGER trigger_notify_budget_quote_received
  AFTER INSERT ON public.budget_quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_budget_quote_received();

CREATE OR REPLACE FUNCTION public.notify_budget_quote_result(
  p_budget_request_id uuid,
  p_accepted_quote_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_record record;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.budget_requests
    WHERE id = p_budget_request_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No puedes notificar resultados de este presupuesto';
  END IF;

  FOR quote_record IN
    SELECT bq.id, bq.business_id, bq.price, b.owner_id
    FROM public.budget_quotes bq
    JOIN public.businesses b ON b.id = bq.business_id
    WHERE bq.budget_request_id = p_budget_request_id
      AND b.owner_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
    VALUES (
      quote_record.owner_id,
      CASE WHEN quote_record.id = p_accepted_quote_id THEN 'budget_quote_accepted' ELSE 'budget_quote_rejected' END,
      CASE WHEN quote_record.id = p_accepted_quote_id THEN '¡Presupuesto aceptado!' ELSE 'Presupuesto no seleccionado' END,
      CASE
        WHEN quote_record.id = p_accepted_quote_id THEN 'Un cliente ha aceptado tu presupuesto de ' || quote_record.price || '€'
        ELSE 'El cliente ha elegido otro profesional. ¡Gracias por participar!'
      END,
      jsonb_build_object(
        'budget_request_id', p_budget_request_id,
        'business_id', quote_record.business_id,
        'price', quote_record.price
      ),
      false
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_budget_quote_result(uuid, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5) BUSINESS-PHOTOS STORAGE: forzar carpeta del usuario en INSERT
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated can upload business photos" ON storage.objects;
DROP POLICY IF EXISTS "business-photos-insert" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir fotos" ON storage.objects;

CREATE POLICY "business-photos-insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ----------------------------------------------------------------------------
-- 5b) JOB-APPLICATIONS STORAGE: CVs privados y separados por usuario
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-applications', 'job-applications', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "job-applications-insert-own-cv" ON storage.objects;
DROP POLICY IF EXISTS "job-applications-read-own-cv" ON storage.objects;
DROP POLICY IF EXISTS "job-applications-read-owner-cv" ON storage.objects;

CREATE POLICY "job-applications-insert-own-cv"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-applications'
    AND (storage.foldername(name))[1] = 'cvs'
    AND left(storage.filename(name), 37) = auth.uid()::text || '_'
  );

CREATE POLICY "job-applications-read-own-cv"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-applications'
    AND (storage.foldername(name))[1] = 'cvs'
    AND left(storage.filename(name), 37) = auth.uid()::text || '_'
  );

CREATE POLICY "job-applications-read-owner-cv"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-applications'
    AND EXISTS (
      SELECT 1
      FROM public.job_applications ja
      JOIN public.jobs j ON j.id = ja.job_id
      JOIN public.businesses b ON b.id = j.business_id::integer
      WHERE b.owner_id = auth.uid()
        AND ja.cv_url = storage.objects.name
    )
  );

-- ----------------------------------------------------------------------------
-- 6) OFFER_FIRES: SELECT abierto a todos — solo necesitan ver su propio fuego
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can read offer fires" ON public.offer_fires;

CREATE POLICY "offer_fires_select_own"
  ON public.offer_fires FOR SELECT
  USING (auth.uid() = user_id);

-- (El conteo público se obtiene de offers.fire_count, mantenido por trigger)

-- ----------------------------------------------------------------------------
-- 7) REVIEWS: forzar pasar por RPC can_user_review (revoca INSERT directo)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated can create review" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_via_rpc" ON public.reviews;

-- Solo permitimos INSERT vía función SECURITY DEFINER. Si no tienes una RPC
-- create_review() todavía, el flujo actual seguirá funcionando porque la RPC
-- can_user_review() valida en frontend; pero idealmente migrar a:
--   create or replace function public.create_review(business_id int, rating int, comment text)
--     returns reviews language plpgsql security definer
--   as $$ ... validar can_user_review ... insert into reviews ... $$;
-- y dar grant execute a authenticated.
-- Mientras tanto, dejamos INSERT autenticado pero con un trigger que valida:

CREATE OR REPLACE FUNCTION public.reviews_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No puedes crear reseñas en nombre de otro usuario';
  END IF;
  -- Reusar la RPC existente si está disponible
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_user_review') THEN
    IF NOT (SELECT public.can_user_review(NEW.user_id, NEW.business_id)) THEN
      RAISE EXCEPTION 'No cumples los requisitos para reseñar este negocio';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_validate_before_insert ON public.reviews;
CREATE TRIGGER reviews_validate_before_insert
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_validate_insert();

CREATE POLICY "reviews_insert_authenticated"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 8) BUDGET_QUOTES UPDATE: limitar campos modificables al usuario
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.budget_quotes_protect_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- El usuario solicitante solo puede cambiar status (aceptar/rechazar)
  IF auth.uid() = (SELECT user_id FROM public.budget_requests WHERE id = NEW.budget_request_id) THEN
    IF NEW.price IS DISTINCT FROM OLD.price
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.business_id IS DISTINCT FROM OLD.business_id THEN
      RAISE EXCEPTION 'Solo puedes cambiar el estado de la cotización';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS budget_quotes_protect ON public.budget_quotes;
CREATE TRIGGER budget_quotes_protect
  BEFORE UPDATE ON public.budget_quotes
  FOR EACH ROW EXECUTE FUNCTION public.budget_quotes_protect_columns();

-- ============================================================================
-- FIN.
-- Después de ejecutar:
--   1) Reset service_role key en Settings → API → Reset
--   2) Regenerar par VAPID y actualizar secrets
--   3) Re-deploy send-push con verify-jwt habilitado
-- ============================================================================
