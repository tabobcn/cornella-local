-- ====================================================
-- SETUP COMPLETO: PRESUPUESTOS
-- ====================================================
-- Ejecuta este archivo en Supabase SQL Editor para:
-- 1. Crear tabla budget_requests (solicitudes)
-- 2. Crear tabla budget_quotes (cotizaciones/respuestas)
-- 3. Configurar permisos y políticas RLS
-- ====================================================

-- ============================================
-- PARTE 1: TABLA DE SOLICITUDES
-- ============================================

DROP TABLE IF EXISTS public.budget_quotes CASCADE;
DROP TABLE IF EXISTS public.budget_requests CASCADE;

CREATE TABLE public.budget_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Información de la solicitud
  category text NOT NULL,
  description text NOT NULL,
  photos text[],

  -- Detalles de contacto y urgencia
  urgency text NOT NULL CHECK (urgency IN ('urgent', 'this-week', 'next-week')),
  address text NOT NULL,
  phone text NOT NULL,

  -- Estado
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'completed', 'cancelled')),

  -- Metadatos
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX idx_budget_requests_user_id ON public.budget_requests(user_id);
CREATE INDEX idx_budget_requests_category ON public.budget_requests(category);
CREATE INDEX idx_budget_requests_status ON public.budget_requests(status);
CREATE INDEX idx_budget_requests_created_at ON public.budget_requests(created_at DESC);

-- ============================================
-- PARTE 2: TABLA DE COTIZACIONES
-- ============================================

CREATE TABLE public.budget_quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_request_id uuid NOT NULL REFERENCES public.budget_requests(id) ON DELETE CASCADE,
  business_id integer NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Cotización
  price decimal(10, 2) NOT NULL,
  description text NOT NULL,
  estimated_duration text,

  -- Estado
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),

  -- Metadatos
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(budget_request_id, business_id)
);

-- Índices
CREATE INDEX idx_budget_quotes_request_id ON public.budget_quotes(budget_request_id);
CREATE INDEX idx_budget_quotes_business_id ON public.budget_quotes(business_id);
CREATE INDEX idx_budget_quotes_status ON public.budget_quotes(status);

-- ============================================
-- PARTE 3: ROW LEVEL SECURITY
-- ============================================

-- Budget Requests RLS
ALTER TABLE public.budget_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propias solicitudes"
  ON public.budget_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear solicitudes"
  ON public.budget_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus solicitudes"
  ON public.budget_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Propietarios ven solicitudes de su categoría"
  ON public.budget_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.owner_id = auth.uid()
      AND businesses.is_verified = true
      AND businesses.subcategory = budget_requests.category
    )
  );

-- Budget Quotes RLS
ALTER TABLE public.budget_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven cotizaciones de sus solicitudes"
  ON public.budget_quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_requests
      WHERE budget_requests.id = budget_quotes.budget_request_id
      AND budget_requests.user_id = auth.uid()
    )
  );

CREATE POLICY "Propietarios ven sus cotizaciones"
  ON public.budget_quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = budget_quotes.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propietarios pueden crear cotizaciones"
  ON public.budget_quotes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = budget_quotes.business_id
      AND businesses.owner_id = auth.uid()
      AND businesses.is_verified = true
    )
  );

CREATE POLICY "Propietarios pueden actualizar sus cotizaciones"
  ON public.budget_quotes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = budget_quotes.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios pueden actualizar estado de cotizaciones"
  ON public.budget_quotes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_requests
      WHERE budget_requests.id = budget_quotes.budget_request_id
      AND budget_requests.user_id = auth.uid()
    )
  );

-- ============================================
-- PARTE 4: TRIGGERS Y FUNCIONES
-- ============================================

-- Función para updated_at
CREATE OR REPLACE FUNCTION update_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER set_budget_requests_updated_at
  BEFORE UPDATE ON public.budget_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();

CREATE TRIGGER set_budget_quotes_updated_at
  BEFORE UPDATE ON public.budget_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT
  'budget_requests' as tabla,
  COUNT(*) as total_registros
FROM budget_requests
UNION ALL
SELECT
  'budget_quotes' as tabla,
  COUNT(*) as total_registros
FROM budget_quotes;

-- ============================================
-- Resultado esperado:
-- - 2 tablas creadas: budget_requests y budget_quotes
-- - Políticas RLS configuradas
-- - Triggers de updated_at activos
-- ============================================
