-- =====================================================
-- AÑADIR COLUMNAS FALTANTES A BUSINESSES
-- =====================================================

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS cover_photo TEXT,
ADD COLUMN IF NOT EXISTS special_closures JSONB DEFAULT '[]'::jsonb;

-- Verificar resultado
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'businesses'
AND column_name IN ('cover_photo', 'special_closures', 'neighborhood', 'is_published')
ORDER BY column_name;
