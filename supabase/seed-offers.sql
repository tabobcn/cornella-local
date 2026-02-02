-- ====================================================
-- OFERTAS DE EJEMPLO PARA DESARROLLO
-- ====================================================
-- IMPORTANTE: Ejecutar DESPUÉS de crear la tabla offers
-- Este archivo inserta ofertas para los negocios existentes
-- ====================================================

-- Primero, obtenemos los IDs de los negocios (para referencia)
-- SELECT id, name FROM businesses WHERE owner_id = 'd1cc1a18-c216-4831-b17c-921254edbfcb' ORDER BY name;

-- ====================================================
-- OFERTAS FLASH (urgentes, tiempo limitado)
-- ====================================================

INSERT INTO public.offers (
  business_id, title, description, image,
  discount_type, discount_value, discount_label,
  original_price, discounted_price,
  starts_at, expires_at,
  status, is_flash, is_visible
)
-- Nota: Reemplaza los business_id con los UUIDs reales de tu base de datos
-- Por ahora usamos subqueries para encontrar los negocios por nombre
VALUES

-- 1. Oferta Flash: Pizzeria Bella Napoli - 2x1 en pizzas
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

-- 2. Oferta Flash: Café del Barrio - Desayuno con descuento
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

-- 3. Oferta Flash: Panadería Cal Miquel - Pan recién horneado
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

-- 4. Oferta Flash: Moda & Tendencias - Rebajas flash
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

-- 5. Oferta Flash: FitZone Cornellà - Primera clase gratis
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

-- ====================================================
-- OFERTAS NORMALES (más duración)
-- ====================================================

-- 6. El Rincón de Pepe - Menú del día
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

-- 7. Librería Pages - Descuento en libros infantiles
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

-- 8. Salón Style & Cut - Paquete corte + tinte
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

-- 9. Floristería Rosa & Lila - Ramos especiales
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

-- 10. Taller AutoCornellà - Revisión pre-ITV
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

-- 11. Calzados Martínez - Nueva colección primavera
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

-- 12. Farmàcia Vila - Productos dermocosméticos
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

-- ====================================================
-- Verificación
-- ====================================================
SELECT
  o.title,
  b.name as business_name,
  o.discount_label,
  o.is_flash,
  o.expires_at,
  o.status
FROM offers o
JOIN businesses b ON o.business_id = b.id
ORDER BY o.is_flash DESC, o.created_at DESC;

-- ====================================================
-- PARA ELIMINAR TODAS LAS OFERTAS DE EJEMPLO (antes del lanzamiento):
-- ====================================================
-- DELETE FROM offers WHERE business_id IN (
--   SELECT id FROM businesses WHERE owner_id = 'd1cc1a18-c216-4831-b17c-921254edbfcb'
-- );
