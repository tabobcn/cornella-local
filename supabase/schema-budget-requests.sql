-- ====================================================
-- TABLA: budget_requests (Solicitudes de presupuesto)
-- ====================================================

CREATE TABLE IF NOT EXISTS public.budget_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Información de la solicitud
  category text NOT NULL,
  description text NOT NULL,
  photos text[], -- Array de URLs de fotos

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

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_budget_requests_user_id ON public.budget_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_requests_category ON public.budget_requests(category);
CREATE INDEX IF NOT EXISTS idx_budget_requests_status ON public.budget_requests(status);
CREATE INDEX IF NOT EXISTS idx_budget_requests_created_at ON public.budget_requests(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.budget_requests ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden VER sus propias solicitudes
CREATE POLICY "Usuarios pueden ver sus propias solicitudes"
  ON public.budget_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios pueden CREAR solicitudes
CREATE POLICY "Usuarios pueden crear solicitudes"
  ON public.budget_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden ACTUALIZAR sus propias solicitudes
CREATE POLICY "Usuarios pueden actualizar sus solicitudes"
  ON public.budget_requests
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Los propietarios de negocios pueden VER solicitudes de su categoría
CREATE POLICY "Propietarios ven solicitudes de su categoría"
  ON public.budget_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.owner_id = auth.uid()
      AND businesses.is_verified = true
      AND businesses.subcategory = budget_requests.category
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_budget_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER set_budget_requests_updated_at
  BEFORE UPDATE ON public.budget_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_requests_updated_at();

-- Comentarios
COMMENT ON TABLE public.budget_requests IS 'Solicitudes de presupuesto de usuarios a negocios locales';
COMMENT ON COLUMN public.budget_requests.category IS 'Categoría del servicio solicitado (fontanero, electricista, etc.)';
COMMENT ON COLUMN public.budget_requests.urgency IS 'Nivel de urgencia: urgent, this-week, next-week';
COMMENT ON COLUMN public.budget_requests.status IS 'Estado de la solicitud: pending, quoted, accepted, completed, cancelled';
