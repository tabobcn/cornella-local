-- =============================================
-- PUSH NOTIFICATIONS — FIXES + TRIGGERS FALTANTES
-- =============================================
-- 1. Fix push_notify_budget_response: NEW.request_id → NEW.budget_request_id
-- 2. Nueva oferta de empleo en negocio favorito
-- 3. Push al negocio cuando su presupuesto es aceptado
-- 4. Push al negocio cuando su presupuesto no fue elegido
-- =============================================

-- =============================================
-- 1. FIX: push_notify_budget_response
--    Antes usaba NEW.request_id (columna inexistente en budget_quotes)
-- =============================================
CREATE OR REPLACE FUNCTION push_notify_budget_response()
RETURNS TRIGGER AS $$
DECLARE
  request_user_id UUID;
  business_name TEXT;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    app_url := 'https://www.cornellalocal.es';

    -- FIX: era NEW.request_id → ahora NEW.budget_request_id
    SELECT br.user_id
    INTO request_user_id
    FROM public.budget_requests br
    WHERE br.id = NEW.budget_request_id;

    SELECT name INTO business_name
    FROM public.businesses
    WHERE id = NEW.business_id;

    IF request_user_id IS NOT NULL THEN
      PERFORM send_push_notification(
        target_user_id := request_user_id,
        notification_title := '📋 Tienes un presupuesto',
        notification_message := (COALESCE(business_name, 'Un negocio') || ' te envió una oferta: ' || COALESCE(NEW.estimated_price::TEXT, '') || '€'),
        notification_url := app_url || '/#/my-budget-requests',
        notification_type := 'budget_response',
        require_interaction := false,
        notification_metadata := jsonb_build_object(
          'business_name', business_name,
          'estimated_price', NEW.estimated_price,
          'quote_id', NEW.id
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger (ya existe, se reemplaza la función)
DROP TRIGGER IF EXISTS trigger_push_budget_response ON public.budget_quotes;
CREATE TRIGGER trigger_push_budget_response
  AFTER INSERT ON public.budget_quotes
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_budget_response();


-- =============================================
-- 2. NUEVO: Push cuando un negocio favorito publica empleo
-- =============================================
CREATE OR REPLACE FUNCTION push_notify_favorite_new_job()
RETURNS TRIGGER AS $$
DECLARE
  fav_user UUID;
  business_name TEXT;
  app_url TEXT;
BEGIN
  app_url := 'https://www.cornellalocal.es';

  -- Obtener nombre del negocio
  SELECT name INTO business_name
  FROM public.businesses
  WHERE id = NEW.business_id;

  -- Notificar a todos los usuarios que tienen este negocio en favoritos
  FOR fav_user IN
    SELECT user_id
    FROM public.favorites
    WHERE business_id = NEW.business_id
  LOOP
    PERFORM send_push_notification(
      target_user_id := fav_user,
      notification_title := '💼 Nuevo Empleo — ' || COALESCE(business_name, 'Negocio favorito'),
      notification_message := COALESCE(NEW.title, 'Nueva oferta de trabajo disponible') || ' · ¡Inscríbete ahora!',
      notification_url := app_url || '/#/offers',
      notification_type := 'new_job_favorite',
      require_interaction := false,
      notification_metadata := jsonb_build_object(
        'business_name', business_name,
        'job_title', NEW.title,
        'job_id', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_push_favorite_new_job ON public.jobs;
CREATE TRIGGER trigger_push_favorite_new_job
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_favorite_new_job();


-- =============================================
-- 3 & 4. NUEVO: Push al negocio al aceptar/rechazar presupuesto
--    Se dispara desde la tabla notifications (las notificaciones
--    in-app ya se crean en el frontend → las amplificamos a push)
-- =============================================
CREATE OR REPLACE FUNCTION push_notify_from_budget_result()
RETURNS TRIGGER AS $$
DECLARE
  app_url TEXT;
  push_title TEXT;
  push_message TEXT;
  push_type TEXT;
  push_interact BOOLEAN;
BEGIN
  app_url := 'https://www.cornellalocal.es';

  IF NEW.type = 'budget_quote_accepted' THEN
    push_title    := '🎉 ¡Te eligieron!';
    push_message  := COALESCE(NEW.message, 'Un cliente ha aceptado tu presupuesto. ¡Ponte en contacto!');
    push_type     := 'budget_accepted';
    push_interact := true;

  ELSIF NEW.type = 'budget_quote_rejected' THEN
    push_title    := 'Presupuesto no seleccionado';
    push_message  := COALESCE(NEW.message, 'El cliente eligió otro profesional. ¡Sigue intentándolo!');
    push_type     := 'budget_rejected';
    push_interact := false;

  ELSE
    RETURN NEW;  -- Tipo no relevante, no enviar push
  END IF;

  PERFORM send_push_notification(
    target_user_id    := NEW.user_id,
    notification_title   := push_title,
    notification_message := push_message,
    notification_url     := app_url || '/#/incoming-budget-requests',
    notification_type    := push_type,
    require_interaction  := push_interact,
    notification_metadata := COALESCE(NEW.data, '{}'::jsonb)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_push_budget_result ON public.notifications;
CREATE TRIGGER trigger_push_budget_result
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.type IN ('budget_quote_accepted', 'budget_quote_rejected'))
  EXECUTE FUNCTION push_notify_from_budget_result();


-- =============================================
-- VERIFICAR TODOS LOS TRIGGERS PUSH
-- =============================================
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%push%'
ORDER BY event_object_table, trigger_name;
