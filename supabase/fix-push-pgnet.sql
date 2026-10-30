-- ============================================================================
-- FIX 2026-10-31: los push y los emails automáticos no salían
-- ----------------------------------------------------------------------------
-- 1) La extensión pg_net (la que hace las llamadas HTTP a las Edge Functions
--    send-push y send-email) no estaba activada: no existía el esquema "net".
-- 2) send_push_notification, al fallar un envío, marcaba la suscripción del
--    móvil como inactiva. Con pg_net ausente fallaban TODOS, así que iba dando
--    de baja a los usuarios en silencio (9 suscripciones desde mayo).
--    Ahora solo deja un aviso en el log; las caducadas las detecta send-push.
-- 3) Se reactivan las suscripciones desactivadas por este fallo (la app no
--    desactiva suscripciones en ningún otro sitio).
-- ============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.send_push_notification(
  target_user_id uuid,
  notification_title text,
  notification_message text,
  notification_url text DEFAULT '/'::text,
  notification_type text DEFAULT 'general'::text,
  notification_icon text DEFAULT '/icons/icon-192x192.png'::text,
  require_interaction boolean DEFAULT false,
  notification_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Máximo 50 dispositivos por usuario (evita abusos con miles de suscripciones falsas)
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
        -- Antes se desactivaba la suscripción aquí: con cualquier fallo (p. ej. sin pg_net)
        -- se daba de baja al usuario. Ahora solo se registra el aviso.
        RAISE WARNING 'Failed to send push to subscription: %', SQLERRM;
    END;
  END LOOP;

  RETURN notifications_sent;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.send_push_notification(uuid, text, text, text, text, text, boolean, jsonb) FROM PUBLIC, anon, authenticated;

UPDATE public.push_subscriptions SET is_active = true WHERE is_active = false;

COMMIT;

-- Comprobación
SELECT (SELECT count(*) FROM pg_extension WHERE extname = 'pg_net') AS pg_net_activo,
       (SELECT count(*) FROM public.push_subscriptions WHERE is_active) AS suscripciones_activas;
