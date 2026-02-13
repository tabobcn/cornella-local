-- =============================================
-- SISTEMA DE PUSH NOTIFICATIONS (Web Push API)
-- =============================================
-- Tabla para almacenar subscripciones de dispositivos
-- Triggers para enviar push notifications automáticas
-- =============================================

-- =============================================
-- TABLA: push_subscriptions
-- =============================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Índice único por user_id + endpoint (expresión JSONB, requiere índice separado)
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_unique
  ON public.push_subscriptions(user_id, (subscription->>'endpoint'));

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(user_id) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven sus propias subscripciones
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden insertar sus propias subscripciones
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias subscripciones
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propias subscripciones
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);


-- =============================================
-- FUNCIÓN HELPER: Enviar Push Notification
-- =============================================
CREATE OR REPLACE FUNCTION send_push_notification(
  target_user_id UUID,
  notification_title TEXT,
  notification_message TEXT,
  notification_url TEXT DEFAULT '/',
  notification_type TEXT DEFAULT 'general',
  notification_icon TEXT DEFAULT '/icons/icon-192x192.png',
  require_interaction BOOLEAN DEFAULT false,
  notification_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER AS $$
DECLARE
  subscription_record RECORD;
  function_url TEXT;
  anon_key TEXT;
  notifications_sent INTEGER := 0;
BEGIN
  -- URL de la Edge Function
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';
  anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Obtener todas las subscripciones activas del usuario
  FOR subscription_record IN
    SELECT subscription
    FROM public.push_subscriptions
    WHERE user_id = target_user_id
      AND is_active = true
  LOOP
    -- Llamar a la Edge Function de push
    BEGIN
      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        ),
        body := jsonb_build_object(
          'subscription', subscription_record.subscription,
          'title', notification_title,
          'message', notification_message,
          'url', notification_url,
          'type', notification_type,
          'icon', notification_icon,
          'requireInteraction', require_interaction,
          'metadata', notification_metadata
        )
      );

      notifications_sent := notifications_sent + 1;

      -- Actualizar last_used_at
      UPDATE public.push_subscriptions
      SET last_used_at = NOW()
      WHERE user_id = target_user_id
        AND subscription = subscription_record.subscription;

    EXCEPTION
      WHEN OTHERS THEN
        -- Si falla, marcar subscription como inactiva
        UPDATE public.push_subscriptions
        SET is_active = false
        WHERE subscription = subscription_record.subscription;

        RAISE WARNING 'Failed to send push to subscription: %', SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Sent % push notifications to user %', notifications_sent, target_user_id;
  RETURN notifications_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- TRIGGER 1: Nueva solicitud de presupuesto
-- =============================================
CREATE OR REPLACE FUNCTION push_notify_new_budget_request()
RETURNS TRIGGER AS $$
DECLARE
  business_data RECORD;
  app_url TEXT;
BEGIN
  app_url := 'https://cornellalocal.vercel.app';

  -- Enviar push a los top 5 negocios mejor valorados de la categoría
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
    LIMIT 5  -- Solo los top 5 para no saturar
  LOOP
    -- Enviar push notification
    PERFORM send_push_notification(
      target_user_id := business_data.owner_id,
      notification_title := '💼 Nueva Solicitud de Presupuesto',
      notification_message := 'Tienes una nueva solicitud en ' || NEW.subcategory,
      notification_url := app_url || '/#/incoming-budget-requests',
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

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_push_new_budget_request ON public.budget_requests;
CREATE TRIGGER trigger_push_new_budget_request
  AFTER INSERT ON public.budget_requests
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_new_budget_request();


-- =============================================
-- TRIGGER 2: Respuesta a presupuesto
-- =============================================
CREATE OR REPLACE FUNCTION push_notify_budget_response()
RETURNS TRIGGER AS $$
DECLARE
  request_data RECORD;
  business_name TEXT;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    app_url := 'https://cornellalocal.vercel.app';

    -- Obtener datos de la solicitud
    SELECT br.user_id
    INTO request_data
    FROM public.budget_requests br
    WHERE br.id = NEW.request_id;

    -- Obtener nombre del negocio
    SELECT name INTO business_name
    FROM public.businesses
    WHERE id = NEW.business_id;

    -- Enviar push al usuario
    PERFORM send_push_notification(
      target_user_id := request_data.user_id,
      notification_title := '📋 Respuesta a tu Presupuesto',
      notification_message := business_name || ' te ha respondido: ' || NEW.estimated_price || '€',
      notification_url := app_url || '/#/budget-request',
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

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_push_budget_response ON public.budget_quotes;
CREATE TRIGGER trigger_push_budget_response
  AFTER INSERT ON public.budget_quotes
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_budget_response();


-- =============================================
-- TRIGGER 3: Nueva candidatura
-- =============================================
CREATE OR REPLACE FUNCTION push_notify_new_job_application()
RETURNS TRIGGER AS $$
DECLARE
  job_data RECORD;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    app_url := 'https://cornellalocal.vercel.app';

    -- Obtener datos del empleo y propietario
    SELECT
      jobs.title as job_title,
      businesses.name as business_name,
      businesses.owner_id
    INTO job_data
    FROM public.jobs
    JOIN public.businesses ON jobs.business_id = businesses.id
    WHERE jobs.id = NEW.job_id;

    -- Enviar push al propietario
    PERFORM send_push_notification(
      target_user_id := job_data.owner_id,
      notification_title := '👤 Nueva Candidatura',
      notification_message := NEW.full_name || ' aplicó a ' || job_data.job_title,
      notification_url := app_url || '/#/business-candidates',
      notification_type := 'new_application',
      require_interaction := true,  -- Requiere acción
      notification_metadata := jsonb_build_object(
        'job_title', job_data.job_title,
        'candidate_name', NEW.full_name,
        'application_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_push_new_job_application ON public.job_applications;
CREATE TRIGGER trigger_push_new_job_application
  AFTER INSERT ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_new_job_application();


-- =============================================
-- TRIGGER 4: Cambio de estado de candidatura
-- =============================================
CREATE OR REPLACE FUNCTION push_notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  job_data RECORD;
  notification_title TEXT;
  notification_message TEXT;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status != 'pending') THEN
    app_url := 'https://cornellalocal.vercel.app';

    -- Obtener datos del empleo
    SELECT
      jobs.title as job_title,
      businesses.name as business_name
    INTO job_data
    FROM public.jobs
    JOIN public.businesses ON jobs.business_id = businesses.id
    WHERE jobs.id = NEW.job_id;

    -- Configurar mensaje según el estado
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
        RETURN NEW;  -- No notificar otros estados
    END CASE;

    -- Enviar push al candidato
    PERFORM send_push_notification(
      target_user_id := NEW.user_id,
      notification_title := notification_title,
      notification_message := notification_message,
      notification_url := app_url || '/#/profile',
      notification_type := NEW.status,
      require_interaction := (NEW.status IN ('hired', 'shortlisted')),  -- Requiere acción si es importante
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

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_push_application_status_change ON public.job_applications;
CREATE TRIGGER trigger_push_application_status_change
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_application_status_change();


-- =============================================
-- TRIGGER 5: Nueva oferta de negocio favorito
-- =============================================
CREATE OR REPLACE FUNCTION push_notify_favorite_new_offer()
RETURNS TRIGGER AS $$
DECLARE
  fav_user UUID;
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
      SELECT user_id
      FROM public.favorites
      WHERE business_id = NEW.business_id
    LOOP
      PERFORM send_push_notification(
        target_user_id := fav_user,
        notification_title := '❤️ Nueva Oferta de tu Favorito',
        notification_message := business_name || ': ' || NEW.title,
        notification_url := app_url || '/#/coupon?id=' || NEW.id,
        notification_type := 'new_offer_favorite',
        require_interaction := false,
        notification_metadata := jsonb_build_object(
          'business_name', business_name,
          'offer_title', NEW.title,
          'offer_id', NEW.id
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_push_favorite_new_offer ON public.offers;
CREATE TRIGGER trigger_push_favorite_new_offer
  AFTER INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_favorite_new_offer();


-- =============================================
-- FUNCIÓN: Limpiar subscripciones antiguas
-- =============================================
-- Ejecutar periódicamente para eliminar subscripciones inactivas
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.push_subscriptions
  WHERE is_active = false
    AND last_used_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- VERIFICAR TRIGGERS CREADOS
-- =============================================
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%push%'
ORDER BY event_object_table, trigger_name;
