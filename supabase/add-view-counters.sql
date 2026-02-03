-- =============================================
-- SISTEMA DE CONTADORES DE VISTAS Y CLICS
-- =============================================
-- Añade campos para rastrear vistas y clics en:
-- - Negocios (businesses)
-- - Ofertas (offers)
-- - Empleos (jobs)
-- =============================================

-- Añadir columnas a businesses
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Añadir columnas a offers
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Añadir columnas a jobs
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_businesses_view_count ON public.businesses(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_offers_view_count ON public.offers(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_view_count ON public.jobs(view_count DESC);

-- Función para incrementar vistas de negocio
CREATE OR REPLACE FUNCTION increment_business_views(business_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.businesses
  SET
    view_count = COALESCE(view_count, 0) + 1,
    last_viewed_at = NOW()
  WHERE id = business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar clics en negocio (teléfono, mapa, web)
CREATE OR REPLACE FUNCTION increment_business_clicks(business_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.businesses
  SET click_count = COALESCE(click_count, 0) + 1
  WHERE id = business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar vistas de oferta
CREATE OR REPLACE FUNCTION increment_offer_views(offer_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.offers
  SET
    view_count = COALESCE(view_count, 0) + 1,
    last_viewed_at = NOW()
  WHERE id = offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar vistas de empleo
CREATE OR REPLACE FUNCTION increment_job_views(job_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.jobs
  SET
    view_count = COALESCE(view_count, 0) + 1,
    last_viewed_at = NOW()
  WHERE id = job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas RLS para las funciones (permitir a todos llamarlas)
GRANT EXECUTE ON FUNCTION increment_business_views(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_business_clicks(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_offer_views(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_job_views(UUID) TO anon, authenticated;

-- Verificar
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('businesses', 'offers', 'jobs')
AND column_name LIKE '%count%'
OR column_name LIKE '%viewed%'
ORDER BY table_name, column_name;
