-- =============================================
-- FIX: Panel de Propietarios - Correcciones críticas
-- VERSIÓN 2: Elimina políticas primero
-- =============================================

-- PASO 1: Eliminar TODAS las políticas RLS de offers
-- =============================================
DROP POLICY IF EXISTS "Ofertas visibles son públicas" ON public.offers;
DROP POLICY IF EXISTS "Propietarios pueden crear ofertas" ON public.offers;
DROP POLICY IF EXISTS "Propietarios pueden actualizar sus ofertas" ON public.offers;
DROP POLICY IF EXISTS "Propietarios pueden eliminar sus ofertas" ON public.offers;
DROP POLICY IF EXISTS "Propietarios ven todas sus ofertas" ON public.offers;

-- PASO 2: Cambiar offers.business_id de UUID a INTEGER
-- =============================================

-- Eliminar la constraint de foreign key existente
ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_business_id_fkey;

-- Cambiar el tipo de columna de UUID a INTEGER
ALTER TABLE public.offers
  ALTER COLUMN business_id TYPE integer USING business_id::text::integer;

-- Volver a crear la foreign key constraint
ALTER TABLE public.offers
  ADD CONSTRAINT offers_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES public.businesses(id)
  ON DELETE CASCADE;

-- PASO 3: RECREAR todas las políticas RLS de offers
-- =============================================

-- Política: Cualquiera puede VER ofertas activas y visibles
CREATE POLICY "Ofertas visibles son públicas"
  ON public.offers
  FOR SELECT
  USING (is_visible = true AND status = 'active');

-- Política: Propietarios ven TODAS sus ofertas (incluso pausadas/invisibles)
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

-- Política: Solo el propietario del negocio puede CREAR ofertas
CREATE POLICY "Propietarios pueden crear ofertas"
  ON public.offers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Política: Solo el propietario del negocio puede ACTUALIZAR sus ofertas
CREATE POLICY "Propietarios pueden actualizar sus ofertas"
  ON public.offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Política: Solo el propietario del negocio puede ELIMINAR sus ofertas
CREATE POLICY "Propietarios pueden eliminar sus ofertas"
  ON public.offers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- PASO 4: Sincronizar is_verified con verification_status
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

-- PASO 5: Verificar políticas de jobs
-- =============================================

-- Política para que propietarios vean sus empleos
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

-- PASO 6: VERIFICACIÓN FINAL
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
-- SCRIPT COMPLETADO V2
-- =============================================
--
-- Este script corrige:
-- ✅ Elimina políticas RLS primero (evita el error 0A000)
-- ✅ Tipo de offers.business_id (uuid → integer)
-- ✅ Sincronización entre is_verified y verification_status
-- ✅ Recrea políticas RLS con la nueva para propietarios
-- ✅ Triggers para mantener la consistencia automáticamente
--
-- PRÓXIMOS PASOS:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Verificar que el SELECT final muestre ✅ OK para negocios aprobados
-- 3. Aprobar tu negocio de prueba si es necesario
-- 4. Probar el panel de propietarios en la aplicación
-- =============================================
