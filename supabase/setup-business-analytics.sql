-- =====================================================
-- SISTEMA DE ANALYTICS PARA NEGOCIOS
-- =====================================================
-- Fecha: 2026-02-12
-- Descripción: Tracking de vistas, clics y engagement
-- =====================================================

-- =====================================================
-- 1. TABLA DE ANALYTICS EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.business_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id INTEGER NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click_phone', 'click_website', 'click_share', 'favorite', 'unfavorite')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índice por negocio y fecha (para queries de rango)
CREATE INDEX IF NOT EXISTS idx_analytics_business_date
  ON public.business_analytics(business_id, created_at DESC);

-- Índice por tipo de evento
CREATE INDEX IF NOT EXISTS idx_analytics_event_type
  ON public.business_analytics(event_type);

-- Índice por usuario (para análisis de comportamiento)
CREATE INDEX IF NOT EXISTS idx_analytics_user
  ON public.business_analytics(user_id);

-- Índice compuesto para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_analytics_business_event_date
  ON public.business_analytics(business_id, event_type, created_at DESC);

-- =====================================================
-- 3. POLÍTICAS RLS
-- =====================================================

ALTER TABLE public.business_analytics ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede insertar eventos (para tracking)
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.business_analytics;
CREATE POLICY "Anyone can insert analytics events"
  ON public.business_analytics FOR INSERT
  WITH CHECK (true);

-- Propietarios pueden ver analytics de su negocio
DROP POLICY IF EXISTS "Owners can view their business analytics" ON public.business_analytics;
CREATE POLICY "Owners can view their business analytics"
  ON public.business_analytics FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Admins pueden ver todos los analytics
DROP POLICY IF EXISTS "Admins can view all analytics" ON public.business_analytics;
CREATE POLICY "Admins can view all analytics"
  ON public.business_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- 4. FUNCIÓN AUXILIAR: OBTENER STATS RESUMIDAS
-- =====================================================

CREATE OR REPLACE FUNCTION get_business_stats(
  p_business_id INTEGER,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_views BIGINT,
  total_clicks BIGINT,
  total_favorites BIGINT,
  unique_visitors BIGINT,
  avg_daily_views NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'view') as total_views,
    COUNT(*) FILTER (WHERE event_type IN ('click_phone', 'click_website', 'click_share')) as total_clicks,
    COUNT(*) FILTER (WHERE event_type = 'favorite') as total_favorites,
    COUNT(DISTINCT user_id) as unique_visitors,
    ROUND(
      COUNT(*) FILTER (WHERE event_type = 'view')::NUMERIC / NULLIF(p_days, 0),
      2
    ) as avg_daily_views
  FROM public.business_analytics
  WHERE business_id = p_business_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNCIÓN: STATS POR HORA DEL DÍA
-- =====================================================

CREATE OR REPLACE FUNCTION get_hourly_distribution(
  p_business_id INTEGER,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  hour INTEGER,
  view_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM created_at)::INTEGER as hour,
    COUNT(*) as view_count
  FROM public.business_analytics
  WHERE business_id = p_business_id
    AND event_type = 'view'
    AND created_at >= NOW() - INTERVAL '1 day' * p_days
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNCIÓN: STATS DIARIAS (ÚLTIMOS N DÍAS)
-- =====================================================

CREATE OR REPLACE FUNCTION get_daily_stats(
  p_business_id INTEGER,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  views BIGINT,
  clicks BIGINT,
  favorites BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    created_at::DATE as date,
    COUNT(*) FILTER (WHERE event_type = 'view') as views,
    COUNT(*) FILTER (WHERE event_type IN ('click_phone', 'click_website', 'click_share')) as clicks,
    COUNT(*) FILTER (WHERE event_type = 'favorite') as favorites
  FROM public.business_analytics
  WHERE business_id = p_business_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days
  GROUP BY created_at::DATE
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ✅ SCRIPT COMPLETADO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Sistema de Analytics instalado';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tabla creada: business_analytics';
  RAISE NOTICE 'Índices: 4 índices optimizados';
  RAISE NOTICE 'Políticas RLS: 3 policies';
  RAISE NOTICE 'Funciones: 3 funciones de agregación';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tipos de eventos soportados:';
  RAISE NOTICE '   - view (visita al detalle)';
  RAISE NOTICE '   - click_phone (clic en teléfono)';
  RAISE NOTICE '   - click_website (clic en web)';
  RAISE NOTICE '   - click_share (compartir)';
  RAISE NOTICE '   - favorite (añadir favorito)';
  RAISE NOTICE '   - unfavorite (quitar favorito)';
  RAISE NOTICE '========================================';
END $$;
