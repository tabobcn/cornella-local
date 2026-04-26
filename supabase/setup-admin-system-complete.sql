-- =====================================================
-- SISTEMA COMPLETO DE ADMINISTRACIÓN
-- =====================================================
-- Autor: CornellaLocal
-- Fecha: 2026-02-12
-- Descripción: Sistema de moderación, reportes y administración
-- =====================================================

-- =====================================================
-- 1. AGREGAR CAMPO is_admin A PROFILES
-- =====================================================

-- Verificar si la columna ya existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna is_admin agregada a profiles';
  ELSE
    RAISE NOTICE 'Columna is_admin ya existe en profiles';
  END IF;
END $$;

-- =====================================================
-- 2. CREAR TABLA DE REPORTES
-- =====================================================

-- Eliminar tabla si existe (solo para desarrollo)
DROP TABLE IF EXISTS public.reports CASCADE;

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Quién reporta
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Qué reporta (businesses.id es INTEGER, no UUID)
  business_id INTEGER NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Tipo de reporte
  report_type TEXT NOT NULL CHECK (report_type IN (
    'false_tags',      -- Tags falsos o engañosos
    'wrong_price',     -- Oferta por encima del precio
    'bad_hours',       -- Horarios incorrectos
    'fake_info',       -- Información falsa
    'inappropriate',   -- Contenido inapropiado
    'other'            -- Otro
  )),

  -- Mensaje del usuario
  message TEXT NOT NULL,

  -- Estado del reporte
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Pendiente de revisión
    'reviewed',   -- Revisado (en proceso)
    'resolved',   -- Resuelto (acción tomada)
    'dismissed'   -- Desestimado (no procede)
  )),

  -- Metadatos de revisión
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT, -- Notas del admin sobre la resolución

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX idx_reports_user ON public.reports(user_id);
CREATE INDEX idx_reports_business ON public.reports(business_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_created ON public.reports(created_at DESC);
CREATE INDEX idx_reports_pending ON public.reports(status, created_at DESC) WHERE status = 'pending';

-- =====================================================
-- 3. RLS POLICIES PARA REPORTS
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios pueden crear reportes
DROP POLICY IF EXISTS "Usuarios pueden crear reportes" ON public.reports;
CREATE POLICY "Usuarios pueden crear reportes"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuarios pueden ver sus propios reportes
DROP POLICY IF EXISTS "Usuarios ven sus reportes" ON public.reports;
CREATE POLICY "Usuarios ven sus reportes"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins pueden ver todos los reportes
DROP POLICY IF EXISTS "Admins ven todos los reportes" ON public.reports;
CREATE POLICY "Admins ven todos los reportes"
  ON public.reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Admins pueden actualizar reportes
DROP POLICY IF EXISTS "Admins actualizan reportes" ON public.reports;
CREATE POLICY "Admins actualizan reportes"
  ON public.reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- 4. TRIGGER PARA UPDATED_AT EN REPORTS
-- =====================================================

CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reports_updated_at ON public.reports;
CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- =====================================================
-- 5. FUNCIÓN PARA NOTIFICAR ADMINS DE NUEVO REPORTE
-- =====================================================

CREATE OR REPLACE FUNCTION notify_admins_new_report()
RETURNS TRIGGER AS $$
DECLARE
  business_name TEXT;
  reporter_name TEXT;
  admin_id UUID;
BEGIN
  -- Obtener nombre del negocio
  SELECT name INTO business_name
  FROM public.businesses
  WHERE id = NEW.business_id;

  -- Obtener nombre del reportante
  SELECT full_name INTO reporter_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Notificar a todos los admins
  FOR admin_id IN
    SELECT id FROM public.profiles WHERE is_admin = true
  LOOP
    INSERT INTO public.notifications (
      user_id, type, title, message, icon, data, is_read
    ) VALUES (
      admin_id,
      'new_report',
      '⚠️ Nuevo reporte recibido',
      reporter_name || ' reportó un problema en "' || business_name || '"',
      'AlertCircle',
      jsonb_build_object(
        'report_id', NEW.id,
        'business_id', NEW.business_id,
        'report_type', NEW.report_type
      ),
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admins_new_report ON public.reports;
CREATE TRIGGER trigger_notify_admins_new_report
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_report();

-- =====================================================
-- 6. FUNCIÓN PARA NOTIFICAR USUARIO DE REPORTE RESUELTO
-- =====================================================

CREATE OR REPLACE FUNCTION notify_user_report_resolved()
RETURNS TRIGGER AS $$
DECLARE
  business_name TEXT;
BEGIN
  -- Solo notificar si el estado cambió a 'resolved'
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN

    -- Obtener nombre del negocio
    SELECT name INTO business_name
    FROM public.businesses
    WHERE id = NEW.business_id;

    -- Notificar al usuario que reportó
    INSERT INTO public.notifications (
      user_id, type, title, message, icon, data, is_read
    ) VALUES (
      NEW.user_id,
      'report_resolved',
      '✅ Tu reporte fue resuelto',
      'Hemos tomado acción sobre tu reporte de "' || business_name || '"',
      'CheckCircle2',
      jsonb_build_object(
        'report_id', NEW.id,
        'business_id', NEW.business_id
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_user_report_resolved ON public.reports;
CREATE TRIGGER trigger_notify_user_report_resolved
  AFTER UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_report_resolved();

-- =====================================================
-- 7. MARCAR USUARIO COMO ADMIN
-- =====================================================

-- IMPORTANTE: Cambia este email por el tuyo
-- Puedes buscar tu email actual con:
-- SELECT id, email, full_name FROM auth.users;

-- Opción 1: Por email (recomendado)
UPDATE public.profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'tabobcn@gmail.com' -- ⚠️ CAMBIA ESTO POR TU EMAIL
);

-- Opción 2: Por user_id (si conoces tu ID)
-- UPDATE public.profiles
-- SET is_admin = true
-- WHERE id = 'tu-user-id-aqui';

-- =====================================================
-- 8. VERIFICACIÓN FINAL
-- =====================================================

-- Ver administradores actuales
SELECT
  p.id,
  u.email,
  p.full_name,
  p.is_admin
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_admin = true;

-- Ver estructura de tabla reports
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;

-- Ver índices creados
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'reports';

-- Ver políticas RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'reports';

-- =====================================================
-- 9. DATOS DE PRUEBA (OPCIONAL)
-- =====================================================

-- Descomentar para crear reportes de prueba:
/*
-- Asegúrate de tener al menos un negocio y un usuario

-- Reporte de prueba 1: Tags falsos
INSERT INTO public.reports (user_id, business_id, report_type, message)
SELECT
  (SELECT id FROM public.profiles WHERE is_admin = false LIMIT 1),
  (SELECT id FROM public.businesses LIMIT 1),
  'false_tags',
  'El negocio dice que tiene terraza pero no tiene. Es engañoso.'
WHERE EXISTS (SELECT 1 FROM public.businesses);

-- Reporte de prueba 2: Precio incorrecto
INSERT INTO public.reports (user_id, business_id, report_type, message)
SELECT
  (SELECT id FROM public.profiles WHERE is_admin = false LIMIT 1),
  (SELECT id FROM public.businesses LIMIT 1 OFFSET 1),
  'wrong_price',
  'La oferta dice 20% pero en el local solo dan 10%. Publicidad engañosa.'
WHERE EXISTS (SELECT 1 FROM public.businesses);
*/

-- =====================================================
-- ✅ SCRIPT COMPLETADO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Sistema de administración instalado';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tablas creadas: reports';
  RAISE NOTICE 'Políticas RLS: 4 policies en reports';
  RAISE NOTICE 'Triggers: 3 triggers (updated_at, notify_admin, notify_user)';
  RAISE NOTICE 'Índices: 5 índices en reports';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: Verifica que tu usuario sea admin';
  RAISE NOTICE '    Ejecuta: SELECT * FROM profiles WHERE is_admin = true;';
  RAISE NOTICE '';
  RAISE NOTICE 'Siguiente paso: Implementar UI en React';
  RAISE NOTICE '========================================';
END $$;
