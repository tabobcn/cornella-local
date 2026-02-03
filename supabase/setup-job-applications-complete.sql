-- =============================================
-- SETUP COMPLETO: Sistema de Candidaturas a Empleos
-- =============================================
-- Este script configura el sistema completo para que usuarios
-- apliquen a empleos y propietarios gestionen candidaturas
-- =============================================

-- =============================================
-- LIMPIEZA PREVIA: Eliminar todo si existe
-- =============================================

-- Eliminar triggers si existen
DROP TRIGGER IF EXISTS trigger_notify_new_application ON public.job_applications;
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON public.job_applications;

-- Eliminar funciones si existen
DROP FUNCTION IF EXISTS notify_business_new_application() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Eliminar tabla si existe (esto también eliminará las policies)
DROP TABLE IF EXISTS public.job_applications CASCADE;

-- =============================================
-- TABLA: job_applications (Candidaturas)
-- =============================================
CREATE TABLE public.job_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Datos del candidato
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT, -- Mensaje de motivación
  cv_url TEXT, -- URL del CV (opcional, para futuro)

  -- Estado de la candidatura
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')),

  -- Notas del propietario (privadas)
  owner_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS: job_applications
-- =============================================

-- Usuarios pueden ver sus propias candidaturas
CREATE POLICY "Usuarios ven sus propias candidaturas"
  ON public.job_applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuarios pueden crear candidaturas
CREATE POLICY "Usuarios pueden aplicar a empleos"
  ON public.job_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Propietarios pueden ver candidaturas de sus empleos
CREATE POLICY "Propietarios ven candidaturas de sus empleos"
  ON public.job_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.businesses ON jobs.business_id::integer = businesses.id
      WHERE jobs.id = job_applications.job_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Propietarios pueden actualizar estado de candidaturas
CREATE POLICY "Propietarios actualizan candidaturas de sus empleos"
  ON public.job_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.businesses ON jobs.business_id::integer = businesses.id
      WHERE jobs.id = job_applications.job_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- =============================================
-- FUNCIÓN: Notificar a propietario cuando recibe candidatura
-- =============================================
CREATE OR REPLACE FUNCTION notify_business_new_application()
RETURNS TRIGGER AS $$
DECLARE
  job_title TEXT;
  business_id INTEGER;
  business_owner_id UUID;
  business_name TEXT;
BEGIN
  -- Solo notificar para candidaturas nuevas
  IF (TG_OP = 'INSERT') THEN

    -- Obtener datos del empleo y negocio
    SELECT
      jobs.title,
      jobs.business_id::integer,
      businesses.owner_id,
      businesses.name
    INTO
      job_title,
      business_id,
      business_owner_id,
      business_name
    FROM public.jobs
    JOIN public.businesses ON jobs.business_id::integer = businesses.id
    WHERE jobs.id = NEW.job_id;

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
      'new_application',
      'Nueva candidatura recibida',
      NEW.full_name || ' se inscribió en: ' || job_title,
      'Users',
      jsonb_build_object(
        'business_id', business_id,
        'job_id', NEW.job_id,
        'application_id', NEW.id,
        'applicant_name', NEW.full_name
      ),
      false
    );

    -- Log para debugging
    RAISE NOTICE 'Created notification for application % in job %', NEW.id, job_title;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger en tabla job_applications
DROP TRIGGER IF EXISTS trigger_notify_new_application ON public.job_applications;
CREATE TRIGGER trigger_notify_new_application
  AFTER INSERT ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_new_application();


-- =============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON public.job_applications;
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================
-- ÍNDICES: Optimizar rendimiento
-- =============================================

-- Índice para buscar candidaturas por empleo
CREATE INDEX IF NOT EXISTS idx_job_applications_job
  ON public.job_applications(job_id);

-- Índice para buscar candidaturas por usuario
CREATE INDEX IF NOT EXISTS idx_job_applications_user
  ON public.job_applications(user_id);

-- Índice para buscar candidaturas por estado
CREATE INDEX IF NOT EXISTS idx_job_applications_status
  ON public.job_applications(status);

-- Índice compuesto para queries de propietario (job + status)
CREATE INDEX IF NOT EXISTS idx_job_applications_job_status
  ON public.job_applications(job_id, status);

-- Índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_job_applications_created
  ON public.job_applications(created_at DESC);


-- =============================================
-- DATOS DE EJEMPLO (opcional, para testing)
-- =============================================

-- Insertar una candidatura de ejemplo (solo si existe el usuario carlos@test.com)
-- Descomenta para testing:
/*
DO $$
DECLARE
  test_user_id UUID;
  test_job_id UUID;
BEGIN
  -- Obtener ID del usuario de prueba
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'carlos@test.com' LIMIT 1;

  -- Obtener un empleo de ejemplo
  SELECT id INTO test_job_id FROM public.jobs LIMIT 1;

  IF test_user_id IS NOT NULL AND test_job_id IS NOT NULL THEN
    INSERT INTO public.job_applications (
      job_id,
      user_id,
      full_name,
      email,
      phone,
      message,
      status
    ) VALUES (
      test_job_id,
      test_user_id,
      'Carlos Ejemplo',
      'carlos@test.com',
      '+34 666 123 456',
      'Me interesa mucho esta posición. Tengo experiencia en el sector y estoy disponible de inmediato.',
      'pending'
    );

    RAISE NOTICE 'Candidatura de ejemplo creada';
  END IF;
END $$;
*/


-- =============================================
-- VERIFICACIÓN: Comprobar que todo se creó correctamente
-- =============================================

-- Listar funciones creadas
SELECT
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('notify_business_new_application', 'update_updated_at_column');

-- Listar triggers creados
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%job_applications%'
ORDER BY event_object_table;

-- Listar políticas de job_applications
SELECT
  policyname,
  permissive,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'job_applications'
ORDER BY policyname;

-- Listar índices creados
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE indexname LIKE 'idx_job_applications%'
ORDER BY indexname;

-- Ver estructura de la tabla
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'job_applications'
ORDER BY ordinal_position;


-- =============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =============================================

COMMENT ON TABLE public.job_applications IS
  'Candidaturas de usuarios a ofertas de empleo';

COMMENT ON COLUMN public.job_applications.status IS
  'Estado: pending (nueva), reviewed (revisada), shortlisted (preseleccionado), rejected (rechazada), hired (contratado)';

COMMENT ON FUNCTION notify_business_new_application() IS
  'Trigger function que notifica al propietario cuando recibe una nueva candidatura';

COMMENT ON FUNCTION update_updated_at_column() IS
  'Función genérica para actualizar updated_at automáticamente';


-- =============================================
-- SCRIPT COMPLETADO
-- =============================================
--
-- Este script configura:
-- ✅ Tabla job_applications con todos los campos necesarios
-- ✅ 4 políticas RLS (SELECT, INSERT, UPDATE para propietarios)
-- ✅ 2 triggers (notificaciones + updated_at)
-- ✅ 5 índices para optimización
-- ✅ Verificaciones para comprobar instalación
--
-- PRÓXIMOS PASOS:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Verificar que no hay errores
-- 3. Implementar formulario de aplicación en React
-- 4. Implementar BusinessCandidatesScreen
-- 5. Probar flujo completo
-- =============================================
