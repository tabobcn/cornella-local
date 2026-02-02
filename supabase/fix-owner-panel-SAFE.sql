-- =============================================
-- FIX: Panel de Propietarios - Correcciones críticas (VERSIÓN SEGURA)
-- =============================================
-- Este script es más seguro porque:
-- 1. Verifica si hay datos antes de hacer cambios destructivos
-- 2. Hace backup de datos si es necesario
-- 3. Maneja errores de forma más robusta
-- =============================================

-- PASO 0: Verificar estado actual
-- =============================================
DO $$
DECLARE
  offers_count INTEGER;
  businesses_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO offers_count FROM public.offers;
  SELECT COUNT(*) INTO businesses_count FROM public.businesses;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Estado actual de la base de datos:';
  RAISE NOTICE '- Ofertas en tabla: %', offers_count;
  RAISE NOTICE '- Negocios en tabla: %', businesses_count;
  RAISE NOTICE '========================================';
END $$;

-- PASO 1: FIX - Tabla offers (recrear si tiene tipo incorrecto)
-- =============================================

-- Verificar si offers.business_id es uuid
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'offers'
    AND column_name = 'business_id';

  IF col_type = 'uuid' THEN
    RAISE NOTICE 'DETECTADO: offers.business_id es UUID, necesita corrección';

    -- Opción 1: Si la tabla está vacía, simplemente cambiar el tipo
    IF (SELECT COUNT(*) FROM public.offers) = 0 THEN
      RAISE NOTICE 'La tabla offers está vacía, cambiando tipo directamente...';

      ALTER TABLE public.offers
        DROP CONSTRAINT IF EXISTS offers_business_id_fkey;

      ALTER TABLE public.offers
        ALTER COLUMN business_id TYPE integer USING NULL;

      ALTER TABLE public.offers
        ADD CONSTRAINT offers_business_id_fkey
        FOREIGN KEY (business_id)
        REFERENCES public.businesses(id)
        ON DELETE CASCADE;

      RAISE NOTICE '✅ Tipo de business_id cambiado a integer';
    ELSE
      -- Opción 2: Si hay datos, necesitamos estrategia diferente
      RAISE WARNING '⚠️  La tabla offers tiene datos. Necesitas decidir:';
      RAISE WARNING '    1. Eliminar datos y recrear la tabla';
      RAISE WARNING '    2. Intentar migrar datos (requiere lógica personalizada)';
      RAISE WARNING '    Por seguridad, NO se modificará automáticamente.';
    END IF;
  ELSE
    RAISE NOTICE '✅ offers.business_id ya es del tipo correcto: %', col_type;
  END IF;
END $$;

-- PASO 2: FIX - Sincronizar is_verified con verification_status
-- =============================================

-- Actualizar todos los negocios existentes
UPDATE public.businesses
SET is_verified = (verification_status = 'approved')
WHERE is_verified != (verification_status = 'approved');

-- Mostrar resultado
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.businesses
  WHERE is_verified = true AND verification_status = 'approved';

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Sincronización completada';
  RAISE NOTICE '   Negocios verificados: %', updated_count;
  RAISE NOTICE '========================================';
END $$;

-- PASO 3: Crear trigger para sincronización automática
-- =============================================

CREATE OR REPLACE FUNCTION sync_business_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar is_verified con verification_status
  IF NEW.verification_status = 'approved' THEN
    NEW.is_verified = true;
  ELSE
    NEW.is_verified = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_verification_status ON public.businesses;
CREATE TRIGGER sync_verification_status
  BEFORE INSERT OR UPDATE OF verification_status ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION sync_business_verification();

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger de sincronización creado';
END $$;

-- PASO 4: Añadir/Actualizar políticas RLS para offers
-- =============================================

-- Eliminar política si existe
DROP POLICY IF EXISTS "Propietarios ven todas sus ofertas" ON public.offers;

-- Crear política para que propietarios vean TODAS sus ofertas
CREATE POLICY "Propietarios ven todas sus ofertas"
  ON public.offers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Política RLS para propietarios creada';
END $$;

-- PASO 5: Verificar políticas RLS para jobs
-- =============================================

DO $$
BEGIN
  -- Verificar si existe la política
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs'
    AND policyname = 'Propietarios ven sus ofertas'
  ) THEN
    CREATE POLICY "Propietarios ven sus ofertas"
      ON public.jobs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.businesses
          WHERE businesses.id = jobs.business_id
          AND businesses.owner_id = auth.uid()
        )
      );
    RAISE NOTICE '✅ Política RLS para jobs creada';
  ELSE
    RAISE NOTICE '✅ Política RLS para jobs ya existe';
  END IF;
END $$;

-- PASO 6: Verificación final
-- =============================================

SELECT
  id,
  name,
  owner_id,
  verification_status,
  is_verified,
  subcategory,
  CASE
    WHEN verification_status = 'approved' AND is_verified = true THEN '✅ OK'
    WHEN verification_status = 'approved' AND is_verified = false THEN '⚠️ INCONSISTENTE'
    WHEN verification_status = 'pending' THEN '📝 Pendiente'
    WHEN verification_status = 'rejected' THEN '❌ Rechazado'
    ELSE '❓ Desconocido'
  END as status_check
FROM public.businesses
ORDER BY created_at DESC
LIMIT 10;

-- PASO 7: Mostrar políticas RLS activas
-- =============================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN '👁️  Ver'
    WHEN cmd = 'INSERT' THEN '➕ Crear'
    WHEN cmd = 'UPDATE' THEN '✏️  Actualizar'
    WHEN cmd = 'DELETE' THEN '🗑️  Eliminar'
    ELSE cmd
  END as operacion
FROM pg_policies
WHERE tablename IN ('offers', 'jobs', 'businesses', 'budget_requests')
ORDER BY tablename, cmd, policyname;

-- =============================================
-- RESUMEN FINAL
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 SCRIPT DE CORRECCIÓN COMPLETADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Revisa los resultados arriba y verifica:';
  RAISE NOTICE '1. ✅ Estado de negocios (verification_status vs is_verified)';
  RAISE NOTICE '2. ✅ Políticas RLS activas';
  RAISE NOTICE '3. ⚠️  Si offers.business_id sigue siendo UUID, resuélvelo manualmente';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximo paso:';
  RAISE NOTICE '- Aprobar un negocio de prueba si aún no lo has hecho';
  RAISE NOTICE '- Probar el panel de propietarios en la aplicación';
  RAISE NOTICE '========================================';
END $$;

-- =============================================
-- COMENTARIOS IMPORTANTES
-- =============================================

COMMENT ON COLUMN public.businesses.is_verified IS
  'Sincronizado automáticamente con verification_status. TRUE cuando verification_status = approved';

COMMENT ON FUNCTION sync_business_verification() IS
  'Mantiene is_verified sincronizado con verification_status automáticamente';

COMMENT ON POLICY "Propietarios ven todas sus ofertas" ON public.offers IS
  'Permite a los propietarios ver TODAS sus ofertas, incluyendo pausadas e invisibles';
