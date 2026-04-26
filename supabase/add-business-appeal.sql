-- =====================================================
-- AÑADIR CAMPOS PARA SISTEMA DE APELACIÓN DE NEGOCIOS
-- =====================================================

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appeal_message TEXT,
ADD COLUMN IF NOT EXISTS appeal_images JSONB DEFAULT '[]'::jsonb;

-- Verificar resultado
SELECT id, name, verification_status, rejection_count, rejection_reason
FROM public.businesses
ORDER BY created_at DESC;
