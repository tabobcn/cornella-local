-- ====================================================
-- TABLA: offers (Ofertas y promociones de negocios)
-- ====================================================

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Información de la oferta
  title text NOT NULL,
  description text,
  image text,

  -- Descuento
  discount_type text CHECK (discount_type IN ('percentage', 'fixed_amount', '2x1', 'free', 'custom')),
  discount_value decimal(10, 2), -- Porcentaje (ej: 30.00) o cantidad fija (ej: 5.50)
  discount_label text, -- Etiqueta personalizada como "50% DTO", "2x1", etc.

  -- Precios (opcional)
  original_price decimal(10, 2),
  discounted_price decimal(10, 2),

  -- Fechas y duración
  starts_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone NOT NULL,

  -- Estado y visibilidad
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  is_flash boolean DEFAULT false, -- true = oferta flash (urgente), false = oferta normal
  is_visible boolean DEFAULT true,

  -- Metadatos
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_offers_business_id ON public.offers(business_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON public.offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_offers_is_flash ON public.offers(is_flash);

-- RLS (Row Level Security)
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede VER ofertas activas y visibles
CREATE POLICY "Ofertas visibles son públicas"
  ON public.offers
  FOR SELECT
  USING (is_visible = true AND status = 'active');

-- Política: Solo el propietario del negocio puede CREAR ofertas
CREATE POLICY "Propietarios pueden crear ofertas"
  ON public.offers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Política: Solo el propietario del negocio puede ACTUALIZAR sus ofertas
CREATE POLICY "Propietarios pueden actualizar sus ofertas"
  ON public.offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Política: Solo el propietario del negocio puede ELIMINAR sus ofertas
CREATE POLICY "Propietarios pueden eliminar sus ofertas"
  ON public.offers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_offers_updated_at ON public.offers;
CREATE TRIGGER set_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();

-- Función para marcar ofertas expiradas automáticamente
CREATE OR REPLACE FUNCTION mark_expired_offers()
RETURNS void AS $$
BEGIN
  UPDATE public.offers
  SET status = 'expired'
  WHERE expires_at < timezone('utc'::text, now())
  AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE public.offers IS 'Ofertas y promociones de negocios locales';
COMMENT ON COLUMN public.offers.is_flash IS 'true = Oferta flash (urgente, tiempo limitado), false = Oferta normal';
COMMENT ON COLUMN public.offers.discount_type IS 'Tipo de descuento: percentage, fixed_amount, 2x1, free, custom';
COMMENT ON COLUMN public.offers.discount_label IS 'Etiqueta de descuento mostrada al usuario (ej: "50% DTO", "2x1")';
