-- =============================================
-- TRIGGERS PARA ENVIAR EMAILS AUTOMÁTICOS
-- =============================================
-- Llama a la Edge Function send-email cuando:
-- 1. Se crea una solicitud de presupuesto
-- 2. Se responde a un presupuesto
-- 3. Se recibe una candidatura
-- 4. Cambia el estado de una candidatura
-- =============================================

-- =============================================
-- FUNCIÓN HELPER: Llamar Edge Function
-- =============================================
CREATE OR REPLACE FUNCTION send_email_notification(
  email_type TEXT,
  recipient_email TEXT,
  email_data JSONB
)
RETURNS void AS $$
DECLARE
  function_url TEXT;
  anon_key TEXT;
BEGIN
  -- URL de la Edge Function (ajustar según tu proyecto)
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-email';
  anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Llamar a la Edge Function de forma asíncrona usando pg_net
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'type', email_type,
      'to', recipient_email,
      'data', email_data
    )
  );

  RAISE NOTICE 'Email notification queued: % to %', email_type, recipient_email;

EXCEPTION
  WHEN OTHERS THEN
    -- No fallar el trigger si el email falla
    RAISE WARNING 'Failed to send email notification: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- TRIGGER 1: Nueva solicitud de presupuesto
-- =============================================
CREATE OR REPLACE FUNCTION notify_new_budget_request()
RETURNS TRIGGER AS $$
DECLARE
  business_data RECORD;
  app_url TEXT;
BEGIN
  -- Obtener URL de la app
  app_url := 'https://cornellalocal.vercel.app'; -- Cambiar a tu dominio

  -- Obtener negocios de la categoría
  FOR business_data IN
    SELECT
      businesses.id,
      businesses.name,
      profiles.email as owner_email
    FROM public.businesses
    JOIN public.profiles ON businesses.owner_id = profiles.id
    WHERE businesses.subcategory = NEW.subcategory
      AND businesses.is_verified = true
      AND profiles.email IS NOT NULL
  LOOP
    -- Enviar email a cada propietario
    PERFORM send_email_notification(
      'new_budget_request',
      business_data.owner_email,
      jsonb_build_object(
        'business_name', business_data.name,
        'category', NEW.subcategory,
        'description', NEW.description,
        'urgency', NEW.urgency,
        'app_url', app_url,
        'request_id', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_notify_new_budget_request ON public.budget_requests;
CREATE TRIGGER trigger_notify_new_budget_request
  AFTER INSERT ON public.budget_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_budget_request();


-- =============================================
-- TRIGGER 2: Respuesta a presupuesto
-- =============================================
CREATE OR REPLACE FUNCTION notify_budget_response()
RETURNS TRIGGER AS $$
DECLARE
  request_data RECORD;
  business_data RECORD;
  app_url TEXT;
BEGIN
  -- Solo notificar cuando se crea una cotización
  IF (TG_OP = 'INSERT') THEN
    app_url := 'https://cornellalocal.vercel.app';

    -- Obtener datos de la solicitud y usuario
    SELECT
      br.user_id,
      profiles.email as user_email,
      profiles.full_name as user_name
    INTO request_data
    FROM public.budget_requests br
    JOIN public.profiles ON br.user_id = profiles.id
    WHERE br.id = NEW.request_id;

    -- Obtener datos del negocio
    SELECT name INTO business_data
    FROM public.businesses
    WHERE id = NEW.business_id;

    -- Enviar email al usuario
    IF request_data.user_email IS NOT NULL THEN
      PERFORM send_email_notification(
        'budget_response',
        request_data.user_email,
        jsonb_build_object(
          'business_name', business_data.name,
          'estimated_price', NEW.estimated_price,
          'notes', NEW.notes,
          'app_url', app_url
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_notify_budget_response ON public.budget_quotes;
CREATE TRIGGER trigger_notify_budget_response
  AFTER INSERT ON public.budget_quotes
  FOR EACH ROW
  EXECUTE FUNCTION notify_budget_response();


-- =============================================
-- TRIGGER 3: Nueva candidatura a empleo
-- =============================================
CREATE OR REPLACE FUNCTION notify_new_job_application_email()
RETURNS TRIGGER AS $$
DECLARE
  job_data RECORD;
  owner_email TEXT;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    app_url := 'https://cornellalocal.vercel.app';

    -- Obtener datos del empleo y propietario
    SELECT
      jobs.title as job_title,
      businesses.name as business_name,
      profiles.email as owner_email
    INTO job_data
    FROM public.jobs
    JOIN public.businesses ON jobs.business_id = businesses.id
    JOIN public.profiles ON businesses.owner_id = profiles.id
    WHERE jobs.id = NEW.job_id;

    -- Enviar email al propietario
    IF job_data.owner_email IS NOT NULL THEN
      PERFORM send_email_notification(
        'new_job_application',
        job_data.owner_email,
        jsonb_build_object(
          'business_name', job_data.business_name,
          'job_title', job_data.job_title,
          'candidate_name', NEW.full_name,
          'candidate_email', NEW.email,
          'candidate_phone', NEW.phone,
          'message', NEW.message,
          'app_url', app_url,
          'application_id', NEW.id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_notify_new_job_application_email ON public.job_applications;
CREATE TRIGGER trigger_notify_new_job_application_email
  AFTER INSERT ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_job_application_email();


-- =============================================
-- TRIGGER 4: Cambio de estado de candidatura
-- =============================================
CREATE OR REPLACE FUNCTION notify_application_status_change_email()
RETURNS TRIGGER AS $$
DECLARE
  job_data RECORD;
  candidate_email TEXT;
  app_url TEXT;
BEGIN
  -- Solo notificar cuando cambia el estado y no es "pending"
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status != 'pending') THEN
    app_url := 'https://cornellalocal.vercel.app';

    -- Obtener email del candidato
    SELECT profiles.email INTO candidate_email
    FROM public.profiles
    WHERE profiles.id = NEW.user_id;

    -- Obtener datos del empleo
    SELECT
      jobs.title as job_title,
      businesses.name as business_name
    INTO job_data
    FROM public.jobs
    JOIN public.businesses ON jobs.business_id = businesses.id
    WHERE jobs.id = NEW.job_id;

    -- Enviar email al candidato
    IF candidate_email IS NOT NULL THEN
      PERFORM send_email_notification(
        'application_status_change',
        candidate_email,
        jsonb_build_object(
          'candidate_name', NEW.full_name,
          'job_title', job_data.job_title,
          'business_name', job_data.business_name,
          'status', NEW.status,
          'interview_date', NEW.interview_date,
          'app_url', app_url,
          'application_id', NEW.id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_notify_application_status_change_email ON public.job_applications;
CREATE TRIGGER trigger_notify_application_status_change_email
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_status_change_email();


-- =============================================
-- TRIGGER 5 (OPCIONAL): Nueva oferta de favorito
-- =============================================
-- Este trigger envía email cuando un negocio favorito publica una oferta
CREATE OR REPLACE FUNCTION notify_favorite_new_offer()
RETURNS TRIGGER AS $$
DECLARE
  fav_user RECORD;
  business_name TEXT;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_visible = true AND NEW.status = 'active') THEN
    app_url := 'https://cornellalocal.vercel.app';

    -- Obtener nombre del negocio
    SELECT name INTO business_name
    FROM public.businesses
    WHERE id = NEW.business_id;

    -- Para cada usuario que tenga este negocio en favoritos
    FOR fav_user IN
      SELECT profiles.email, profiles.full_name
      FROM public.favorites
      JOIN public.profiles ON favorites.user_id = profiles.id
      WHERE favorites.business_id = NEW.business_id
        AND profiles.email IS NOT NULL
    LOOP
      PERFORM send_email_notification(
        'new_offer_favorite',
        fav_user.email,
        jsonb_build_object(
          'business_name', business_name,
          'title', NEW.title,
          'description', NEW.description,
          'discount', NEW.discount_label,
          'type', 'offer',
          'item_id', NEW.id,
          'app_url', app_url
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ofertas (comentado por defecto, descomentar si quieres activarlo)
-- DROP TRIGGER IF EXISTS trigger_notify_favorite_new_offer ON public.offers;
-- CREATE TRIGGER trigger_notify_favorite_new_offer
--   AFTER INSERT ON public.offers
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_favorite_new_offer();


-- =============================================
-- TRIGGER 6 (OPCIONAL): Nuevo empleo de favorito
-- =============================================
CREATE OR REPLACE FUNCTION notify_favorite_new_job()
RETURNS TRIGGER AS $$
DECLARE
  fav_user RECORD;
  business_name TEXT;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') THEN
    app_url := 'https://cornellalocal.vercel.app';

    -- Obtener nombre del negocio
    SELECT name INTO business_name
    FROM public.businesses
    WHERE id = NEW.business_id::integer;

    -- Para cada usuario que tenga este negocio en favoritos
    FOR fav_user IN
      SELECT profiles.email, profiles.full_name
      FROM public.favorites
      JOIN public.profiles ON favorites.user_id = profiles.id
      WHERE favorites.business_id = NEW.business_id::integer
        AND profiles.email IS NOT NULL
    LOOP
      PERFORM send_email_notification(
        'new_offer_favorite',
        fav_user.email,
        jsonb_build_object(
          'business_name', business_name,
          'title', NEW.title,
          'description', NEW.description,
          'type', 'job',
          'item_id', NEW.id,
          'app_url', app_url
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para empleos (comentado por defecto, descomentar si quieres activarlo)
-- DROP TRIGGER IF EXISTS trigger_notify_favorite_new_job ON public.jobs;
-- CREATE TRIGGER trigger_notify_favorite_new_job
--   AFTER INSERT ON public.jobs
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_favorite_new_job();


-- =============================================
-- VERIFICAR TRIGGERS CREADOS
-- =============================================
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%email%'
ORDER BY event_object_table, trigger_name;
