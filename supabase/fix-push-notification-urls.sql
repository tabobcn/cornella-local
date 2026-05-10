-- ============================================================================
-- FIX: URLs de los triggers push para usar deep links canónicos
-- ============================================================================
-- Antes:  /#/coupon?id=XYZ  →  no abre la oferta (no es deep link de la app)
-- Ahora:  /?oferta=XYZ      →  abre la oferta directamente
--
-- Para los demás triggers (presupuestos, candidaturas, perfil) mantenemos
-- el hash legacy porque la lógica de navegación interna ya lo procesa.
-- ============================================================================

-- ─── TRIGGER 5: Nueva oferta de negocio favorito ─────────────────────────────
CREATE OR REPLACE FUNCTION push_notify_favorite_new_offer()
RETURNS TRIGGER AS $$
DECLARE
  fav_user UUID;
  business_name TEXT;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_visible = true AND NEW.status = 'active') THEN
    app_url := 'https://www.cornellalocal.es';

    SELECT name INTO business_name
    FROM public.businesses
    WHERE id = NEW.business_id;

    FOR fav_user IN
      SELECT user_id
      FROM public.favorites
      WHERE business_id = NEW.business_id
    LOOP
      PERFORM send_push_notification(
        target_user_id := fav_user,
        notification_title := '❤️ Nueva Oferta de tu Favorito',
        notification_message := business_name || ': ' || NEW.title,
        notification_url := app_url || '/?oferta=' || NEW.id,  -- deep link canónico
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


-- ─── TRIGGER nueva oferta empleo favorito ────────────────────────────────────
-- (definido en setup-push-missing-triggers.sql, lo redefinimos con deep link)
CREATE OR REPLACE FUNCTION push_notify_favorite_new_job()
RETURNS TRIGGER AS $$
DECLARE
  fav_user UUID;
  business_name TEXT;
  app_url TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) THEN
    app_url := 'https://www.cornellalocal.es';

    SELECT name INTO business_name
    FROM public.businesses
    WHERE id = NEW.business_id;

    FOR fav_user IN
      SELECT user_id
      FROM public.favorites
      WHERE business_id = NEW.business_id
    LOOP
      PERFORM send_push_notification(
        target_user_id := fav_user,
        notification_title := '💼 Nuevo empleo en tu Favorito',
        notification_message := business_name || ': ' || NEW.title,
        notification_url := app_url || '/?empleo=' || NEW.id,  -- deep link canónico
        notification_type := 'new_job_favorite',
        require_interaction := false,
        notification_metadata := jsonb_build_object(
          'business_name', business_name,
          'job_title', NEW.title,
          'job_id', NEW.id
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Verificación: mostrar URL templates de los triggers
SELECT
  routine_name,
  CASE
    WHEN routine_definition LIKE '%/?oferta=%' THEN '✅ deep link oferta'
    WHEN routine_definition LIKE '%/?empleo=%' THEN '✅ deep link empleo'
    WHEN routine_definition LIKE '%/#/%' THEN '⚠️ hash legacy (no abre detalle)'
    ELSE '?'
  END AS url_status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'push_notify_%'
ORDER BY routine_name;
