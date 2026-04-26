-- ====================================================
-- Crear respuestas automáticas a los 3 presupuestos
-- ====================================================
-- Cada negocio responde a SU presupuesto correspondiente
-- ====================================================

-- 1. Fontanería responde al presupuesto de Fontanería
INSERT INTO public.budget_quotes (
  budget_request_id,
  business_id,
  price,
  description,
  created_at
)
SELECT
  br.id as budget_request_id,
  b.id as business_id,
  80.00 as price,
  'Podemos reparar la fuga en 24 horas. Incluye revisión completa de tuberías.' as description,
  NOW() as created_at
FROM public.budget_requests br
CROSS JOIN public.businesses b
WHERE br.description = 'TEST AUTO-REJECT: Reparar fuga de agua en cocina'
  AND b.name = 'Fontanería Rápida Cornellà'
  AND NOT EXISTS (
    SELECT 1 FROM public.budget_quotes
    WHERE budget_request_id = br.id AND business_id = b.id
  );

-- 2. Electricidad responde al presupuesto de Electricidad
INSERT INTO public.budget_quotes (
  budget_request_id,
  business_id,
  price,
  description,
  created_at
)
SELECT
  br.id as budget_request_id,
  b.id as business_id,
  120.00 as price,
  'Instalación certificada de enchufes con boletín eléctrico incluido.' as description,
  NOW() as created_at
FROM public.budget_requests br
CROSS JOIN public.businesses b
WHERE br.description = 'TEST AUTO-REJECT: Instalación de enchufes adicionales'
  AND b.name = 'Electricidad Profesional'
  AND NOT EXISTS (
    SELECT 1 FROM public.budget_quotes
    WHERE budget_request_id = br.id AND business_id = b.id
  );

-- 3. Limpieza responde al presupuesto de Limpieza
INSERT INTO public.budget_quotes (
  budget_request_id,
  business_id,
  price,
  description,
  created_at
)
SELECT
  br.id as budget_request_id,
  b.id as business_id,
  150.00 as price,
  'Limpieza profunda de 4 horas con productos ecológicos. Garantía de satisfacción.' as description,
  NOW() as created_at
FROM public.budget_requests br
CROSS JOIN public.businesses b
WHERE br.description = 'TEST AUTO-REJECT: Limpieza profunda del hogar'
  AND b.name = 'Limpieza Express Cornellà'
  AND NOT EXISTS (
    SELECT 1 FROM public.budget_quotes
    WHERE budget_request_id = br.id AND business_id = b.id
  );

-- Verificar que se crearon las 3 respuestas
SELECT
  bq.id,
  b.name as negocio,
  br.category,
  bq.price,
  LEFT(bq.description, 50) as descripcion_corta,
  bq.created_at
FROM public.budget_quotes bq
JOIN public.businesses b ON bq.business_id = b.id
JOIN public.budget_requests br ON bq.budget_request_id = br.id
WHERE br.description LIKE '%TEST AUTO-REJECT%'
ORDER BY bq.created_at DESC;
