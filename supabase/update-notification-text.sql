-- =============================================
-- ACTUALIZAR TEXTO DE NOTIFICACIÓN
-- =============================================
-- Cambiar "aplicó a" por "se inscribió en"
-- =============================================

CREATE OR REPLACE FUNCTION notify_business_new_application()
RETURNS TRIGGER AS $$
DECLARE
  job_title TEXT;
  business_id INTEGER;
  business_owner_id UUID;
  business_name TEXT;
BEGIN
  -- Solo notificar para candidaturas nuevas
  IF (TG_OP = 'INSERT') THEN

    -- Obtener datos del empleo y negocio
    SELECT
      jobs.title,
      jobs.business_id::integer,
      businesses.owner_id,
      businesses.name
    INTO
      job_title,
      business_id,
      business_owner_id,
      business_name
    FROM public.jobs
    JOIN public.businesses ON jobs.business_id::integer = businesses.id
    WHERE jobs.id = NEW.job_id;

    -- Crear notificación para el propietario
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      icon,
      data,
      is_read
    ) VALUES (
      business_owner_id,
      'new_application',
      'Nueva candidatura recibida',
      NEW.full_name || ' se inscribió en: ' || job_title,
      'Users',
      jsonb_build_object(
        'business_id', business_id,
        'job_id', NEW.job_id,
        'application_id', NEW.id,
        'applicant_name', NEW.full_name
      ),
      false
    );

    -- Log para debugging
    RAISE NOTICE 'Created notification for application % in job %', NEW.id, job_title;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que se actualizó
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'notify_business_new_application';
