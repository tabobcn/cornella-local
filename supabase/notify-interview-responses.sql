-- =============================================
-- NOTIFICAR RESPUESTAS A ENTREVISTAS
-- =============================================
-- Este trigger notifica al PROPIETARIO cuando:
-- - El candidato acepta la entrevista
-- - El candidato propone otra fecha
-- =============================================

CREATE OR REPLACE FUNCTION notify_owner_interview_response()
RETURNS TRIGGER AS $$
DECLARE
  job_title TEXT;
  business_owner_id UUID;
  business_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Solo notificar cuando cambia interview_confirmed
  IF (TG_OP = 'UPDATE' AND
      OLD.interview_confirmed IS DISTINCT FROM NEW.interview_confirmed AND
      NEW.interview_confirmed IS NOT NULL) THEN

    -- Obtener datos del empleo y negocio
    SELECT
      jobs.title,
      businesses.owner_id,
      businesses.name
    INTO
      job_title,
      business_owner_id,
      business_name
    FROM public.jobs
    JOIN public.businesses ON jobs.business_id::integer = businesses.id
    WHERE jobs.id = NEW.job_id;

    -- Determinar mensaje según la respuesta
    CASE NEW.interview_confirmed
      WHEN 'accepted' THEN
        notification_title := '✓ Entrevista confirmada';
        notification_message := NEW.full_name || ' confirmó su asistencia a la entrevista de ' || job_title;

      WHEN 'counter_proposed' THEN
        notification_title := '↻ Nueva fecha propuesta';
        notification_message := NEW.full_name || ' propuso otra fecha para la entrevista de ' || job_title;

      ELSE
        RETURN NEW; -- No notificar otros estados
    END CASE;

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
      'interview_response',
      notification_title,
      notification_message,
      CASE NEW.interview_confirmed
        WHEN 'accepted' THEN 'CheckCircle2'
        WHEN 'counter_proposed' THEN 'Calendar'
        ELSE 'Bell'
      END,
      jsonb_build_object(
        'application_id', NEW.id,
        'job_id', NEW.job_id,
        'candidate_name', NEW.full_name,
        'interview_confirmed', NEW.interview_confirmed,
        'candidate_proposed_date', NEW.candidate_proposed_date
      ),
      false
    );

    RAISE NOTICE 'Notificación enviada al propietario: respuesta de entrevista %', NEW.interview_confirmed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_notify_interview_response ON public.job_applications;
CREATE TRIGGER trigger_notify_interview_response
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_interview_response();

-- Verificar que los triggers existen
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'job_applications'
ORDER BY trigger_name;
