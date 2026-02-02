-- Añadir campo verified_at a la tabla businesses
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- Actualizar La Tagliatella para que esté verificado y aparezca en búsquedas
UPDATE public.businesses
SET
  is_verified = true,
  verification_status = 'approved',
  verified_at = now()
WHERE name = 'La Tagliatella';

-- Si quieres verificar todos los negocios existentes (opcional):
-- UPDATE public.businesses
-- SET
--   is_verified = true,
--   verification_status = 'approved',
--   verified_at = now()
-- WHERE is_verified = false;
