-- ============================================================================
-- HARDENING FUNCIONES SECURITY DEFINER + LIMIT en push fan-out
-- Auditoría 2026-05-10
-- ============================================================================
-- Cambios:
--   1) send_push_notification: añadir LIMIT 50 al loop (DoS si user tiene
--      muchas push_subscriptions activas — caso real: cuenta hackeada).
--   2) Todas las funciones SECURITY DEFINER push_notify_* obtienen
--      SET search_path = public (previene ataques de search_path hijack).
-- ============================================================================

-- ─── 1) send_push_notification con LIMIT y search_path ──────────────────────

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
  service_role_key TEXT;
  notifications_sent INTEGER := 0;
BEGIN
  function_url := 'https://zwhlcgckhocdkdxilldo.supabase.co/functions/v1/send-push';
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING 'Missing Vault secret: supabase_service_role_key';
    RETURN 0;
  END IF;

  -- LIMIT 50 dispositivos por user para prevenir abuso si la cuenta tiene
  -- muchas subscriptions registradas (atacante con miles de fake devices).
  FOR subscription_record IN
    SELECT subscription
    FROM public.push_subscriptions
    WHERE user_id = target_user_id
      AND is_active = true
    ORDER BY last_used_at DESC NULLS LAST
    LIMIT 50
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
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

      UPDATE public.push_subscriptions
      SET last_used_at = NOW()
      WHERE user_id = target_user_id
        AND subscription = subscription_record.subscription;

    EXCEPTION
      WHEN OTHERS THEN
        UPDATE public.push_subscriptions
        SET is_active = false
        WHERE subscription = subscription_record.subscription;
        RAISE WARNING 'Failed to send push to subscription: %', SQLERRM;
    END;
  END LOOP;

  RETURN notifications_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── 2) ALTER FUNCTION para añadir search_path al resto de SECURITY DEFINER ─

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOR fn IN
    SELECT proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        'push_notify_new_budget_request',
        'push_notify_budget_response',
        'push_notify_new_job_application',
        'push_notify_application_status_change',
        'push_notify_favorite_new_offer',
        'push_notify_favorite_new_job',
        'push_notify_from_budget_result',
        'cleanup_old_push_subscriptions'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%s SET search_path = public', fn);
      RAISE NOTICE 'search_path fijado en %', fn;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No se pudo fijar search_path en % (probable que no exista): %', fn, SQLERRM;
    END;
  END LOOP;
END $$;


-- ─── Verificación ───────────────────────────────────────────────────────────

SELECT
  proname,
  prosecdef AS security_definer,
  proconfig AS config_settings  -- debe contener "search_path=public"
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND prosecdef = true
  AND (proname LIKE 'push_notify_%' OR proname IN ('send_push_notification', 'cleanup_old_push_subscriptions', 'register_push_subscription'))
ORDER BY proname;
