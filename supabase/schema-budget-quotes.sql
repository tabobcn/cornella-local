-- ====================================================
-- TABLA: budget_quotes (Respuestas/Cotizaciones de negocios)
-- ====================================================

CREATE TABLE IF NOT EXISTS public.budget_quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_request_id uuid NOT NULL REFERENCES public.budget_requests(id) ON DELETE CASCADE,
  business_id integer NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Cotización
  price decimal(10, 2) NOT NULL,
  description text NOT NULL,
  estimated_duration text, -- Ej: "2-3 días", "1 semana"

  -- Estado
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),

  -- Metadatos
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraint: Un negocio solo puede cotizar una vez por solicitud
  UNIQUE(budget_request_id, business_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_budget_quotes_request_id ON public.budget_quotes(budget_request_id);
CREATE INDEX IF NOT EXISTS idx_budget_quotes_business_id ON public.budget_quotes(business_id);
CREATE INDEX IF NOT EXISTS idx_budget_quotes_status ON public.budget_quotes(status);

-- RLS
ALTER TABLE public.budget_quotes ENABLE ROW LEVEL SECURITY;

-- Política: El usuario que hizo la solicitud puede VER las cotizaciones
CREATE POLICY "Usuarios ven cotizaciones de sus solicitudes"
  ON public.budget_quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_requests
      WHERE budget_requests.id = budget_quotes.budget_request_id
      AND budget_requests.user_id = auth.uid()
    )
  );

-- Política: Los propietarios del negocio pueden VER sus propias cotizaciones
CREATE POLICY "Propietarios ven sus cotizaciones"
  ON public.budget_quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = budget_quotes.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Política: Los propietarios pueden CREAR cotizaciones para sus negocios
CREATE POLICY "Propietarios pueden crear cotizaciones"
  ON public.budget_quotes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = budget_quotes.business_id
      AND businesses.owner_id = auth.uid()
      AND businesses.is_verified = true
    )
  );

-- Política: Los propietarios pueden ACTUALIZAR sus cotizaciones
CREATE POLICY "Propietarios pueden actualizar sus cotizaciones"
  ON public.budget_quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = budget_quotes.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden ACTUALIZAR el estado de cotizaciones (aceptar/rechazar)
CREATE POLICY "Usuarios pueden actualizar estado de cotizaciones"
  ON public.budget_quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_requests
      WHERE budget_requests.id = budget_quotes.budget_request_id
      AND budget_requests.user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER set_budget_quotes_updated_at
  BEFORE UPDATE ON public.budget_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_requests_updated_at();

-- Comentarios
COMMENT ON TABLE public.budget_quotes IS 'Cotizaciones de negocios en respuesta a solicitudes de presupuesto';
COMMENT ON COLUMN public.budget_quotes.price IS 'Precio cotizado en euros';
COMMENT ON COLUMN public.budget_quotes.status IS 'Estado: pending, accepted, rejected';
