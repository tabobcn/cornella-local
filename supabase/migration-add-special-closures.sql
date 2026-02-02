-- Añadir campo special_closures a la tabla businesses
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS special_closures jsonb;

-- Comentario descriptivo
COMMENT ON COLUMN public.businesses.special_closures IS 'Días especiales de cierre del negocio. Formato: [{"date": "2026-02-14", "name": "San Valentín"}]';
