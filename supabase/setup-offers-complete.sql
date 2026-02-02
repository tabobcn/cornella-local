-- ====================================================
-- SETUP COMPLETO: OFERTAS
-- ====================================================
-- Ejecuta este archivo en Supabase SQL Editor para:
-- 1. Crear la tabla offers
-- 2. Configurar permisos y políticas RLS
-- 3. Insertar ofertas de ejemplo
-- ====================================================

-- ============================================
-- PARTE 1: CREAR TABLA Y CONFIGURACIÓN
-- ============================================

-- Eliminar tabla si existe (para desarrollo)
DROP TABLE IF EXISTS public.offers CASCADE;

CREATE TABLE public.offers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id integer NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Información de la oferta
  title text NOT NULL,
  description text,
  image text,

  -- Descuento
  discount_type text CHECK (discount_type IN ('percentage', 'fixed_amount', '2x1', 'free', 'custom')),
  discount_value decimal(10, 2),
  discount_label text,

  -- Precios (opcional)
  original_price decimal(10, 2),
  discounted_price decimal(10, 2),

  -- Fechas y duración
  starts_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone NOT NULL,

  -- Estado y visibilidad
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  is_flash boolean DEFAULT false,
  is_visible boolean DEFAULT true,

  -- Metadatos
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_offers_business_id ON public.offers(business_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON public.offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_offers_is_flash ON public.offers(is_flash);

-- RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ofertas visibles son públicas"
  ON public.offers FOR SELECT
  USING (is_visible = true AND status = 'active');

CREATE POLICY "Propietarios pueden crear ofertas"
  ON public.offers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propietarios pueden actualizar sus ofertas"
  ON public.offers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propietarios pueden eliminar sus ofertas"
  ON public.offers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();

-- ============================================
-- PARTE 2: INSERTAR OFERTAS DE EJEMPLO
-- ============================================

INSERT INTO public.offers (
  business_id, title, description, image,
  discount_type, discount_value, discount_label,
  original_price, discounted_price,
  starts_at, expires_at,
  status, is_flash, is_visible
) VALUES

-- OFERTAS FLASH (5 ofertas urgentes)
(
  (SELECT id FROM businesses WHERE name = 'Pizzeria Bella Napoli' LIMIT 1),
  '2x1 en Pizzas Medianas',
  'Lleva 2 pizzas medianas y paga solo 1. Válido para comer en local o para llevar.',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop',
  '2x1', NULL, '2x1',
  24.00, 12.00,
  NOW(), NOW() + INTERVAL '3 hours',
  'active', true, true
),
(
  (SELECT id FROM businesses WHERE name = 'Café del Barrio' LIMIT 1),
  'Desayuno Completo -30%',
  'Café, tostadas, zumo natural y bollería casera. ¡Empieza bien el día!',
  'https://images.unsplash.com/photo-1533920379810-6bedac961555?w=800&h=600&fit=crop',
  'percentage', 30.00, '-30%',
  8.50, 5.95,
  NOW(), NOW() + INTERVAL '2 hours',
  'active', true, true
),
(
  (SELECT id FROM businesses WHERE name = 'Panadería Artesana Cal Miquel' LIMIT 1),
  'Pan de Masa Madre - 2ª Unidad Gratis',
  'Compra 1 barra de pan de masa madre y llévate la 2ª gratis. Solo hoy!',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop',
  'free', NULL, '2ª Gratis',
  3.50, 3.50,
  NOW(), NOW() + INTERVAL '5 hours',
  'active', true, true
),
(
  (SELECT id FROM businesses WHERE name = 'Moda & Tendencias' LIMIT 1),
  'Flash Sale: -50% en Camisetas',
  'Toda nuestra colección de camisetas con 50% de descuento. Stock limitado!',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=600&fit=crop',
  'percentage', 50.00, '-50%',
  25.00, 12.50,
  NOW(), NOW() + INTERVAL '4 hours',
  'active', true, true
),
(
  (SELECT id FROM businesses WHERE name = 'FitZone Cornellà' LIMIT 1),
  'Primera Clase de Spinning GRATIS',
  'Prueba nuestra clase de spinning sin compromiso. Plazas limitadas!',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop',
  'free', NULL, 'GRATIS',
  15.00, 0.00,
  NOW(), NOW() + INTERVAL '6 hours',
  'active', true, true
),

-- OFERTAS NORMALES (7 ofertas con más duración)
(
  (SELECT id FROM businesses WHERE name = 'El Rincón de Pepe' LIMIT 1),
  'Menú del Día - Solo 12€',
  'Incluye primero, segundo, postre, pan y bebida. De lunes a viernes.',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
  'custom', NULL, '12€',
  18.00, 12.00,
  NOW(), NOW() + INTERVAL '7 days',
  'active', false, true
),
(
  (SELECT id FROM businesses WHERE name = 'Librería Pages' LIMIT 1),
  '20% Descuento en Libros Infantiles',
  'Toda nuestra sección infantil con descuento especial. Fomenta la lectura!',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=600&fit=crop',
  'percentage', 20.00, '-20%',
  NULL, NULL,
  NOW(), NOW() + INTERVAL '14 days',
  'active', false, true
),
(
  (SELECT id FROM businesses WHERE name = 'Salón Style & Cut' LIMIT 1),
  'Pack Corte + Tinte - Ahorra 15€',
  'Corte de pelo + tinte completo por solo 45€. Pide cita previa.',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop',
  'fixed_amount', 15.00, '-15€',
  60.00, 45.00,
  NOW(), NOW() + INTERVAL '30 days',
  'active', false, true
),
(
  (SELECT id FROM businesses WHERE name = 'Floristería Rosa & Lila' LIMIT 1),
  'Ramos de San Valentín desde 19.90€',
  'Prepara el día de San Valentín con nuestros ramos especiales. Reserva ya!',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&h=600&fit=crop',
  'custom', NULL, 'Desde 19.90€',
  NULL, 19.90,
  NOW(), NOW() + INTERVAL '10 days',
  'active', false, true
),
(
  (SELECT id FROM businesses WHERE name = 'Taller AutoCornellà' LIMIT 1),
  'Revisión Pre-ITV - 29€',
  'Revisión completa antes de pasar la ITV. Detectamos y solucionamos problemas.',
  'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=600&fit=crop',
  'custom', NULL, '29€',
  45.00, 29.00,
  NOW(), NOW() + INTERVAL '21 days',
  'active', false, true
),
(
  (SELECT id FROM businesses WHERE name = 'Calzados Martínez' LIMIT 1),
  'Nueva Colección Primavera - 10% DTO',
  'Descuento en toda la nueva colección de primavera/verano. Ven a verla!',
  'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=600&fit=crop',
  'percentage', 10.00, '-10%',
  NULL, NULL,
  NOW(), NOW() + INTERVAL '45 days',
  'active', false, true
),
(
  (SELECT id FROM businesses WHERE name = 'Farmàcia Vila' LIMIT 1),
  '2x1 en Cremas Solares',
  'Prepárate para el verano. Segunda unidad gratis en cremas solares seleccionadas.',
  'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&h=600&fit=crop',
  '2x1', NULL, '2x1',
  18.50, 18.50,
  NOW(), NOW() + INTERVAL '20 days',
  'active', false, true
);

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT
  o.title,
  b.name as business_name,
  o.discount_label,
  o.is_flash,
  EXTRACT(EPOCH FROM (o.expires_at - NOW()))/3600 as hours_left,
  o.status
FROM offers o
JOIN businesses b ON o.business_id = b.id
ORDER BY o.is_flash DESC, o.created_at DESC;

-- ============================================
-- Resultado esperado:
-- - 5 ofertas flash (is_flash = true) con 2-6 horas restantes
-- - 7 ofertas normales (is_flash = false) con varios días restantes
-- Total: 12 ofertas activas
-- ============================================
