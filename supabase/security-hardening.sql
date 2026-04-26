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

-- ----------------------------------------------------------------------------
-- 5) BUSINESS-PHOTOS STORAGE: forzar carpeta del usuario en INSERT
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated can upload business photos" ON storage.objects;
DROP POLICY IF EXISTS "business-photos-insert" ON storage.objects;

CREATE POLICY "business-photos-insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
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
