-- =============================================
-- VERIFICAR ESTADO DE LA BASE DE DATOS
-- =============================================
-- Este script solo VERIFICA, no hace cambios
-- =============================================

-- 1. VERIFICAR TIPO DE COLUMNA offers.business_id
-- =============================================
SELECT
  table_name,
  column_name,
  data_type,
  CASE
    WHEN data_type = 'uuid' THEN '❌ INCORRECTO (debería ser integer)'
    WHEN data_type = 'integer' THEN '✅ CORRECTO'
    ELSE '❓ DESCONOCIDO'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'offers'
  AND column_name = 'business_id';

-- 2. VERIFICAR TIPO DE COLUMNA businesses.id
-- =============================================
SELECT
  table_name,
  column_name,
  data_type,
  CASE
    WHEN data_type = 'integer' THEN '✅ CORRECTO'
    ELSE '❓ INESPERADO'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'businesses'
  AND column_name = 'id';

-- 3. CONTAR REGISTROS EN TABLAS PRINCIPALES
-- =============================================
SELECT
  'businesses' as tabla,
  COUNT(*) as cantidad
FROM public.businesses
UNION ALL
SELECT
  'offers' as tabla,
  COUNT(*) as cantidad
FROM public.offers
UNION ALL
SELECT
  'jobs' as tabla,
  COUNT(*) as cantidad
FROM public.jobs
UNION ALL
SELECT
  'budget_requests' as tabla,
  COUNT(*) as cantidad
FROM public.budget_requests
ORDER BY tabla;

-- 4. VERIFICAR SINCRONIZACIÓN is_verified vs verification_status
-- =============================================
SELECT
  id,
  name,
  verification_status,
  is_verified,
  CASE
    WHEN verification_status = 'approved' AND is_verified = true THEN '✅ OK'
    WHEN verification_status = 'approved' AND is_verified = false THEN '❌ INCONSISTENTE'
    WHEN verification_status = 'pending' AND is_verified = false THEN '✅ OK'
    WHEN verification_status = 'rejected' AND is_verified = false THEN '✅ OK'
    ELSE '⚠️  REVISAR'
  END as sincronizacion_status
FROM public.businesses
ORDER BY created_at DESC;

-- 5. VERIFICAR POLÍTICAS RLS ACTIVAS
-- =============================================
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN '👁️'
    WHEN cmd = 'INSERT' THEN '➕'
    WHEN cmd = 'UPDATE' THEN '✏️'
    WHEN cmd = 'DELETE' THEN '🗑️'
  END as icono
FROM pg_policies
WHERE tablename IN ('offers', 'jobs', 'businesses', 'budget_requests')
ORDER BY tablename, cmd, policyname;

-- 6. BUSCAR POLÍTICA ESPECÍFICA PARA PROPIETARIOS EN OFFERS
-- =============================================
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'offers'
      AND policyname = 'Propietarios ven todas sus ofertas'
    ) THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE (necesita crearse)'
  END as "Política: Propietarios ven todas sus ofertas";

-- 7. BUSCAR POLÍTICA ESPECÍFICA PARA PROPIETARIOS EN JOBS
-- =============================================
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'jobs'
      AND policyname = 'Propietarios ven sus ofertas'
    ) THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE (necesita crearse)'
  END as "Política: Propietarios ven sus ofertas (jobs)";

-- 8. VERIFICAR SI EXISTE EL TRIGGER DE SINCRONIZACIÓN
-- =============================================
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'sync_verification_status'
    ) THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE (necesita crearse)'
  END as "Trigger: sync_verification_status";

-- 9. VERIFICAR ESTRUCTURA DE COLUMNAS EN businesses
-- =============================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'businesses'
  AND column_name IN ('id', 'owner_id', 'verification_status', 'is_verified', 'subcategory')
ORDER BY ordinal_position;

-- =============================================
-- RESUMEN
-- =============================================
-- Revisa los resultados arriba para identificar qué necesita corregirse:
--
-- ❌ = Necesita corrección
-- ✅ = Está correcto
-- ⚠️  = Revisar manualmente
-- ❓ = Estado desconocido
-- =============================================
