-- =============================================
-- SETUP COMPLETO: Sistema de Notificaciones Automáticas
-- =============================================
-- Este script configura notificaciones automáticas cuando negocios
-- favoritos publican ofertas o empleos.
-- =============================================

-- =============================================
-- FUNCIÓN: Notificar a usuarios cuando se crea oferta
-- =============================================
CREATE OR REPLACE FUNCTION notify_favorited_users_new_offer()
RETURNS TRIGGER AS $$
DECLARE
  business_name TEXT;
  fav_user_id UUID;
BEGIN
  -- Solo notificar para ofertas nuevas, visibles y activas
  IF (TG_OP = 'INSERT' AND NEW.is_visible = true AND NEW.status = 'active') THEN

    -- Obtener nombre del negocio
    SELECT name INTO business_name
    FROM public.businesses
    WHERE id = NEW.business_id;

    -- Encontrar todos los usuarios que favoritearon este negocio
    FOR fav_user_id IN
      SELECT user_id
      FROM public.favorites
      WHERE business_id = NEW.business_id
    LOOP
      -- Crear notificación para cada usuario
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        icon,
        data,
        is_read
      ) VALUES (
        fav_user_id,
        'new_offer',
        'Nueva oferta en ' || business_name,
        NEW.title || COALESCE(' - ' || NEW.discount_label, ''),
        'Tag',
        jsonb_build_object(
          'business_id', NEW.business_id,
          'offer_id', NEW.id,
          'is_flash', NEW.is_flash
        ),
        false
      );
    END LOOP;

    -- Log para debugging
    RAISE NOTICE 'Created notifications for offer % in business %', NEW.id, business_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger en tabla offers
DROP TRIGGER IF EXISTS trigger_notify_new_offer ON public.offers;
CREATE TRIGGER trigger_notify_new_offer
  AFTER INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_favorited_users_new_offer();


-- =============================================
-- FUNCIÓN: Notificar a usuarios cuando se crea empleo
-- =============================================
CREATE OR REPLACE FUNCTION notify_favorited_users_new_job()
RETURNS TRIGGER AS $$
DECLARE
  business_name TEXT;
  fav_user_id UUID;
BEGIN
  -- Solo notificar para empleos nuevos y activos
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') THEN

    -- Obtener nombre del negocio
    SELECT name INTO business_name
    FROM public.businesses
    WHERE id = NEW.business_id;

    -- Encontrar todos los usuarios que favoritearon este negocio
    FOR fav_user_id IN
      SELECT user_id
      FROM public.favorites
      WHERE business_id = NEW.business_id
    LOOP
      -- Crear notificación para cada usuario
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        icon,
        data,
        is_read
      ) VALUES (
        fav_user_id,
        'new_job',
        'Nueva oferta de empleo en ' || business_name,
        NEW.title,
        'Briefcase',
        jsonb_build_object(
          'business_id', NEW.business_id,
          'job_id', NEW.id,
          'job_type', NEW.type
        ),
        false
      );
    END LOOP;

    -- Log para debugging
    RAISE NOTICE 'Created notifications for job % in business %', NEW.id, business_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger en tabla jobs
DROP TRIGGER IF EXISTS trigger_notify_new_job ON public.jobs;
CREATE TRIGGER trigger_notify_new_job
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_favorited_users_new_job();


-- =============================================
-- POLÍTICA RLS: Permitir inserts desde triggers
-- =============================================
-- Los triggers usan SECURITY DEFINER para bypassear RLS,
-- pero añadimos esta política por si se necesita insertar manualmente
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);


-- =============================================
-- ÍNDICES: Optimizar rendimiento de queries
-- =============================================

-- Índice para buscar favoritos por negocio (usado en triggers)
CREATE INDEX IF NOT EXISTS idx_favorites_business
  ON public.favorites(business_id);

-- Índice para buscar favoritos por usuario
CREATE INDEX IF NOT EXISTS idx_favorites_user
  ON public.favorites(user_id);

-- Índice compuesto para notificaciones por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- Índice parcial para notificaciones no leídas (optimiza badge count)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id, is_read)
  WHERE is_read = false;


-- =============================================
-- VERIFICACIÓN: Comprobar que todo se creó correctamente
-- =============================================

-- Listar funciones creadas
SELECT
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE 'notify_favorited_users%';

-- Listar triggers creados
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_notify%'
ORDER BY event_object_table;

-- Listar políticas de notifications
SELECT
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- Listar índices creados
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE indexname LIKE 'idx_favorites%' OR indexname LIKE 'idx_notifications%'
ORDER BY tablename, indexname;


-- =============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =============================================

COMMENT ON FUNCTION notify_favorited_users_new_offer() IS
  'Trigger function que crea notificaciones para usuarios que favoritearon un negocio cuando este publica una oferta';

COMMENT ON FUNCTION notify_favorited_users_new_job() IS
  'Trigger function que crea notificaciones para usuarios que favoritearon un negocio cuando este publica un empleo';


-- =============================================
-- SCRIPT COMPLETADO
-- =============================================
--
-- Este script configura:
-- ✅ 2 funciones de trigger (ofertas y empleos)
-- ✅ 2 triggers automáticos
-- ✅ 1 política RLS para inserts
-- ✅ 4 índices para optimización
--
-- PRÓXIMOS PASOS:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Verificar resultados de las queries de verificación
-- 3. Probar creando una oferta en un negocio favoriteado
-- 4. Verificar que aparezca notificación en tabla notifications
-- =============================================
