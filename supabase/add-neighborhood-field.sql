-- ====================================================
-- Añadir campo "neighborhood" (barrio) a la tabla businesses
-- ====================================================
-- Este script añade el campo obligatorio de barrio
-- para que los negocios puedan especificar su ubicación
-- ====================================================

-- Añadir columna neighborhood
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Crear índice para búsquedas por barrio
CREATE INDEX IF NOT EXISTS idx_businesses_neighborhood
ON public.businesses(neighborhood);

-- Verificar la columna
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'businesses'
AND column_name = 'neighborhood';

-- ====================================================
-- NOTA: Los negocios existentes tendrán neighborhood = NULL
-- Puedes actualizarlos manualmente o dejar que los propietarios
-- lo actualicen desde el panel de edición
-- ====================================================
