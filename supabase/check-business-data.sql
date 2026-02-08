-- ====================================================
-- VERIFICAR DATOS DEL NEGOCIO Y PRESUPUESTOS
-- ====================================================

-- Paso 1: Ver el negocio del usuario actual
-- (Reemplaza el owner_id con el del usuario carlos@test.com)
SELECT
  id,
  name,
  category_id,
  subcategory,
  is_verified,
  verification_status
FROM public.businesses
WHERE owner_id = '2146040a-47f8-4101-af75-7cbbb39d09f2'::uuid;

-- Paso 2: Ver los presupuestos insertados
SELECT
  id,
  category,
  description,
  status,
  created_at
FROM public.budget_requests
WHERE category = 'Bar y cafetería'
ORDER BY created_at DESC;

-- Paso 3: Verificar si hacen match
-- El problema es que:
-- - businesses.subcategory debe coincidir EXACTAMENTE con budget_requests.category
-- - El negocio de ejemplo "Café del Barrio" (id 14) tiene subcategory = 'Cafetería'
-- - Los presupuestos fueron insertados con category = 'Bar y cafetería'
-- Por eso NO coinciden!

-- Solución 1: Actualizar el negocio del usuario para que tenga subcategory = 'Bar y cafetería'
-- UPDATE public.businesses
-- SET subcategory = 'Bar y cafetería'
-- WHERE owner_id = '2146040a-47f8-4101-af75-7cbbb39d09f2'::uuid;

-- Solución 2: O actualizar los presupuestos para que tengan category = 'Cafetería'
-- UPDATE public.budget_requests
-- SET category = 'Cafetería'
-- WHERE category = 'Bar y cafetería';
