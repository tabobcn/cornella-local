-- =============================================
-- NOTIFICAR AL CANDIDATO CUANDO CAMBIA SU ESTADO
-- =============================================
-- Trigger que notifica al candidato cuando:
-- - Su candidatura es revisada
-- - Es preseleccionado para entrevista
-- - Es descartado
-- - Es contratado
-- =============================================

CREATE OR REPLACE FUNCTION notify_candidate_status_change()
RETURNS TRIGGER AS $$
DECLARE
  job_title TEXT;
  business_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Solo notificar en UPDATEs de status
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN

    -- Obtener datos del empleo y negocio
    SELECT
      jobs.title,
      businesses.name
    INTO
      job_title,
      business_name
    FROM public.jobs
    JOIN public.businesses ON jobs.business_id::integer = businesses.id
    WHERE jobs.id = NEW.job_id;

    -- Determinar tipo de notificación según el nuevo estado
    CASE NEW.status
      WHEN 'reviewed' THEN
        notification_type := 'application_reviewed';
        notification_title := 'Tu candidatura está en revisión';
        notification_message := business_name || ' está revisando tu solicitud para ' || job_title;

      WHEN 'shortlisted' THEN
        notification_type := 'interview_scheduled';
        notification_title := '¡Entrevista programada!';
        notification_message := business_name || ' te ha programado una entrevista para ' || job_title;

      WHEN 'rejected' THEN
        notification_type := 'application_rejected';
        notification_title := 'Candidatura no seleccionada';
        notification_message := 'Gracias por tu interés en ' || job_title || ' en ' || business_name;

      WHEN 'hired' THEN
        notification_type := 'application_hired';
        notification_title := '¡Felicidades! Has sido contratado';
        notification_message := business_name || ' te ha seleccionado para ' || job_title || '. ¡Enhorabuena!';

      ELSE
        RETURN NEW; -- No notificar otros estados
    END CASE;

    -- Crear notificación para el candidato
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      icon,
      data,
      is_read
    ) VALUES (
      NEW.user_id,
      notification_type,
      notification_title,
      notification_message,
      CASE NEW.status
        WHEN 'reviewed' THEN 'Eye'
        WHEN 'shortlisted' THEN 'Calendar'
        WHEN 'rejected' THEN 'XCircle'
        WHEN 'hired' THEN 'PartyPopper'
        ELSE 'Briefcase'
      END,
      jsonb_build_object(
        'application_id', NEW.id,
        'job_id', NEW.job_id,
        'business_name', business_name,
        'job_title', job_title,
        'status', NEW.status,
        'interview_date', NEW.interview_date
      ),
      false
    );

    RAISE NOTICE 'Notificación enviada al candidato % para cambio de estado: %', NEW.user_id, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_notify_candidate_updates ON public.job_applications;
CREATE TRIGGER trigger_notify_candidate_updates
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_candidate_status_change();

-- Añadir campo para confirmación de entrevista
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS interview_confirmed TEXT CHECK (interview_confirmed IN ('pending', 'accepted', 'rejected', 'counter_proposed'));

-- Añadir campo para fecha propuesta por candidato
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS candidate_proposed_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS candidate_proposed_message TEXT;

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'job_applications'
AND column_name LIKE '%interview%'
OR column_name LIKE '%candidate%';
