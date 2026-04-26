-- ====================================================
-- Crear 3 respuestas para el presupuesto de prueba
-- ====================================================

-- Respuesta 1: Fontanería Rápida (80€)
INSERT INTO public.budget_quotes (
  budget_request_id,
  business_id,
  price,
  description,
  created_at
)
SELECT
  '85a02783-c8c7-4b5c-bf76-0c23c1868bad'::uuid,
  b.id,
  80.00,
  'Reparación urgente en 24h. Incluye mano de obra y materiales.',
  NOW()
FROM public.businesses b
WHERE b.name = 'Fontanería Rápida Cornellà';

-- Respuesta 2: Electricidad Profesional (120€)
INSERT INTO public.budget_quotes (
  budget_request_id,
  business_id,
  price,
  description,
  created_at
)
SELECT
  '85a02783-c8c7-4b5c-bf76-0c23c1868bad'::uuid,
  b.id,
  120.00,
  'Servicio profesional certificado. Garantía incluida.',
  NOW() + INTERVAL '10 minutes'
FROM public.businesses b
WHERE b.name = 'Electricidad Profesional';

-- Respuesta 3: Limpieza Express (150€)
INSERT INTO public.budget_quotes (
  budget_request_id,
  business_id,
  price,
  description,
  created_at
)
SELECT
  '85a02783-c8c7-4b5c-bf76-0c23c1868bad'::uuid,
  b.id,
  150.00,
  'Trabajo de calidad. Productos ecológicos.',
  NOW() + INTERVAL '20 minutes'
FROM public.businesses b
WHERE b.name = 'Limpieza Express Cornellà';

-- Verificar las 3 respuestas
SELECT
  bq.id,
  b.name as negocio,
  bq.price,
  bq.description,
  b.owner_id
FROM public.budget_quotes bq
JOIN public.businesses b ON bq.business_id = b.id
WHERE bq.budget_request_id = '85a02783-c8c7-4b5c-bf76-0c23c1868bad'::uuid
ORDER BY bq.created_at;
