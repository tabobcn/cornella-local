-- =============================================
-- FIX: Panel de Propietarios - Correcciones críticas
-- =============================================

-- 1. FIX: Cambiar offers.business_id de UUID a INTEGER
-- =============================================

-- Primero, eliminar la constraint de foreign key existente
ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_business_id_fkey;

-- Cambiar el tipo de columna de UUID a INTEGER
-- IMPORTANTE: Esto solo funciona si la tabla está vacía o si los IDs son compatibles
ALTER TABLE public.offers
  ALTER COLUMN business_id TYPE integer USING business_id::text::integer;

-- Volver a crear la foreign key constraint
ALTER TABLE public.offers
  ADD CONSTRAINT offers_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES public.businesses(id)
  ON DELETE CASCADE;

-- 2. FIX: Sincronizar is_verified con verification_status
-- =============================================

-- Actualizar is_verified basado en verification_status
UPDATE public.businesses
SET is_verified = (verification_status = 'approved');

-- Crear función para mantener is_verified sincronizado
CREATE OR REPLACE FUNCTION sync_business_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando verification_status cambia, actualizar is_verified
  IF NEW.verification_status = 'approved' THEN
    NEW.is_verified = true;
  ELSE
    NEW.is_verified = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS sync_verification_status ON public.businesses;
CREATE TRIGGER sync_verification_status
  BEFORE INSERT OR UPDATE OF verification_status ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION sync_business_verification();

-- 3. FIX: Añadir política RLS para que propietarios vean TODAS sus ofertas
-- =============================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Propietarios ven todas sus ofertas" ON public.offers;

-- Crear nueva política para que propietarios vean sus ofertas (incluso pausadas/invisibles)
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

-- 4. FIX: Verificar que las políticas de jobs permitan ver todas las ofertas del propietario
-- =============================================

-- Esta política ya existe en schema-jobs.sql (líneas 54-64), solo verificamos que esté activa
-- Si no existe, la creamos
DO $$
BEGIN
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
  END IF;
END $$;

-- 5. VERIFICACIÓN: Mostrar estado actual de verificación de negocios
-- =============================================

SELECT
  id,
  name,
  owner_id,
  verification_status,
  is_verified,
  CASE
    WHEN verification_status = 'approved' AND is_verified = true THEN '✅ OK'
    WHEN verification_status = 'approved' AND is_verified = false THEN '⚠️ INCONSISTENTE'
    ELSE '📝 ' || verification_status
  END as status_check
FROM public.businesses
ORDER BY created_at DESC;

-- =============================================
-- COMENTARIOS Y NOTAS
-- =============================================

COMMENT ON COLUMN public.businesses.is_verified IS
  'Sincronizado automáticamente con verification_status. TRUE cuando verification_status = approved';

COMMENT ON FUNCTION sync_business_verification() IS
  'Mantiene is_verified sincronizado con verification_status automáticamente';

-- =============================================
-- SCRIPT COMPLETADO
-- =============================================
--
-- Este script corrige:
-- ✅ Tipo de offers.business_id (uuid → integer)
-- ✅ Sincronización entre is_verified y verification_status
-- ✅ Políticas RLS para que propietarios vean todas sus ofertas/empleos
-- ✅ Triggers para mantener la consistencia automáticamente
--
-- PRÓXIMOS PASOS:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Verificar que el SELECT final muestre ✅ OK para negocios aprobados
-- 3. Probar el panel de propietarios en la aplicación
-- =============================================
