-- ============================================================================
-- FIX v2: URLs de los triggers push restantes → deep links ?nav=PANTALLA
-- ============================================================================
-- Antes:  /#/profile        →  el cliente no abría la página correcta
-- Ahora:  /?nav=profile     →  navega directo a esa pantalla
--
-- App.jsx tiene un deep link genérico ?nav=PAGE que setCurrentPage(PAGE).
-- ============================================================================

-- ─── TRIGGER 1: Nueva solicitud de presupuesto (al negocio) ──────────────────
CREATE OR REPLACE FUNCTION push_notify_new_budget_request()
RETURNS TRIGGER AS $$
DECLARE
  business_data RECORD;
  app_url TEXT;
BEGIN
  app_url := 'https://www.cornellalocal.es';

  FOR business_data IN
    SELECT
      businesses.id,
      businesses.name,
      businesses.owner_id
    FROM public.businesses
    WHERE businesses.subcategory = NEW.subcategory
      AND businesses.is_verified = true
      AND businesses.owner_id IS NOT NULL
    ORDER BY businesses.rating DESC NULLS LAST
    LIMIT 5
  LOOP
    PERFORM send_push_notification(
      target_user_id := business_data.owner_id,
      notification_title := '💼 Nueva Solicitud de Presupuesto',
      notification_message := 'Tienes una nueva solicitud en ' || NEW.subcategory,
      notification_url := app_url || '/?nav=incoming-budget-requests',
      notification_type := 'new_budget_request',
      require_interaction := false,
      notification_metadata := jsonb_build_object(
        'business_id', business_data.id,
        'business_name', business_data.name,
        'category', NEW.subcategory,
        'request_id', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── TRIGGER 2: Respuesta a presupuesto (al usuario) ─────────────────────────
CREATE OR REPLACE FUNCTION push_notify_budget_response()
RETURNS TRIGGER AS $$
DECLARE
  request_data RECORD;
  business_name TEXT;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    app_url := 'https://www.cornellalocal.es';

    SELECT br.user_id INTO request_data
    FROM public.budget_requests br
    WHERE br.id = NEW.request_id;

    SELECT name INTO business_name
    FROM public.businesses
    WHERE id = NEW.business_id;

    PERFORM send_push_notification(
      target_user_id := request_data.user_id,
      notification_title := '📋 Respuesta a tu Presupuesto',
      notification_message := business_name || ' te ha respondido: ' || NEW.estimated_price || '€',
      notification_url := app_url || '/?nav=my-budget-requests',
      notification_type := 'budget_response',
      require_interaction := false,
      notification_metadata := jsonb_build_object(
        'business_name', business_name,
        'estimated_price', NEW.estimated_price,
        'quote_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── TRIGGER 3: Nueva candidatura (al negocio) ───────────────────────────────
CREATE OR REPLACE FUNCTION push_notify_new_job_application()
RETURNS TRIGGER AS $$
DECLARE
  job_data RECORD;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    app_url := 'https://www.cornellalocal.es';

    SELECT
      jobs.title as job_title,
      businesses.name as business_name,
      businesses.owner_id
    INTO job_data
    FROM public.jobs
    JOIN public.businesses ON jobs.business_id = businesses.id
    WHERE jobs.id = NEW.job_id;

    PERFORM send_push_notification(
      target_user_id := job_data.owner_id,
      notification_title := '👤 Nueva Candidatura',
      notification_message := 'Han aplicado a tu oferta: ' || job_data.job_title,
      notification_url := app_url || '/?nav=business-candidates',
      notification_type := 'new_application',
      require_interaction := true,
      notification_metadata := jsonb_build_object(
        'job_title', job_data.job_title,
        'business_name', job_data.business_name,
        'application_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── TRIGGER 4: Cambio de estado de candidatura (al candidato) ───────────────
CREATE OR REPLACE FUNCTION push_notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  job_data RECORD;
  notification_title TEXT;
  notification_message TEXT;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status != 'pending') THEN
    app_url := 'https://www.cornellalocal.es';

    SELECT
      jobs.title as job_title,
      businesses.name as business_name
    INTO job_data
    FROM public.jobs
    JOIN public.businesses ON jobs.business_id = businesses.id
    WHERE jobs.id = NEW.job_id;

    CASE NEW.status
      WHEN 'hired' THEN
        notification_title := '🎉 ¡Felicidades! Has sido contratado';
        notification_message := job_data.business_name || ' te ha seleccionado para ' || job_data.job_title;
      WHEN 'shortlisted' THEN
        notification_title := '📋 Preseleccionado para Entrevista';
        notification_message := job_data.business_name || ' quiere entrevistarte para ' || job_data.job_title;
      WHEN 'reviewed' THEN
        notification_title := '👀 Candidatura en Revisión';
        notification_message := job_data.business_name || ' está revisando tu solicitud';
      WHEN 'rejected' THEN
        notification_title := 'Candidatura No Seleccionada';
        notification_message := 'Gracias por tu interés en ' || job_data.job_title;
      ELSE
        RETURN NEW;
    END CASE;

    PERFORM send_push_notification(
      target_user_id := NEW.user_id,
      notification_title := notification_title,
      notification_message := notification_message,
      notification_url := app_url || '/?nav=profile',
      notification_type := NEW.status,
      require_interaction := (NEW.status IN ('hired', 'shortlisted')),
      notification_metadata := jsonb_build_object(
        'job_title', job_data.job_title,
        'business_name', job_data.business_name,
        'status', NEW.status,
        'application_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── TRIGGER 5: Resultado de presupuesto (al negocio) ────────────────────────
-- Si hay función push_notify_from_budget_result, la actualizamos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'push_notify_from_budget_result') THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION push_notify_from_budget_result()
      RETURNS TRIGGER AS $body$
      DECLARE
        business_owner UUID;
        app_url TEXT := 'https://www.cornellalocal.es';
        notif_title TEXT;
        notif_msg TEXT;
        notif_type TEXT;
      BEGIN
        IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
          SELECT b.owner_id INTO business_owner
          FROM public.businesses b
          WHERE b.id = NEW.business_id;

          IF business_owner IS NULL THEN RETURN NEW; END IF;

          IF NEW.status = 'accepted' THEN
            notif_title := '✅ Presupuesto Aceptado';
            notif_msg := 'El cliente ha aceptado tu cotización';
            notif_type := 'budget_accepted';
          ELSIF NEW.status = 'rejected' THEN
            notif_title := 'Presupuesto No Seleccionado';
            notif_msg := 'El cliente ha elegido otra opción';
            notif_type := 'budget_rejected';
          ELSE
            RETURN NEW;
          END IF;

          PERFORM send_push_notification(
            target_user_id := business_owner,
            notification_title := notif_title,
            notification_message := notif_msg,
            notification_url := app_url || '/?nav=incoming-budget-requests',
            notification_type := notif_type,
            require_interaction := (NEW.status = 'accepted'),
            notification_metadata := jsonb_build_object(
              'quote_id', NEW.id,
              'business_id', NEW.business_id,
              'status', NEW.status
            )
          );
        END IF;
        RETURN NEW;
      END;
      $body$ LANGUAGE plpgsql SECURITY DEFINER;
    $func$;
  END IF;
END $$;


-- Verificación
SELECT
  routine_name,
  CASE
    WHEN routine_definition LIKE '%/?oferta=%' THEN '✅ deep link oferta'
    WHEN routine_definition LIKE '%/?empleo=%' THEN '✅ deep link empleo'
    WHEN routine_definition LIKE '%/?nav=%' THEN '✅ deep link ' || regexp_replace(substring(routine_definition from '/\?nav=([a-z\-]+)'), '_', ' ')
    WHEN routine_definition LIKE '%/#/%' THEN '⚠️ hash legacy'
    ELSE '?'
  END AS url_status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'push_notify_%'
ORDER BY routine_name;
