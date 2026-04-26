-- =====================================================
-- CORREGIR COLUMNAS FALTANTES
-- =====================================================

-- Añadir columnas que faltaron
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id);

-- Verificar que ahora existen las 4 columnas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'businesses'
AND column_name IN ('verification_documents', 'verification_notes', 'verified_at', 'verified_by')
ORDER BY column_name;
