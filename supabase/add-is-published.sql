-- =====================================================
-- AÑADIR CAMPO is_published A BUSINESSES
-- =====================================================

-- Añadir columna
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Los negocios ya aprobados y visibles → marcarlos como publicados
UPDATE public.businesses
SET is_published = true
WHERE is_verified = true AND verification_status = 'approved';

-- Verificar resultado
SELECT id, name, verification_status, is_verified, is_published
FROM public.businesses
ORDER BY created_at DESC;
