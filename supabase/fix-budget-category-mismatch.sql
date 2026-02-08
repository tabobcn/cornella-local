-- ====================================================
-- CORREGIR MISMATCH ENTRE NEGOCIO Y PRESUPUESTOS
-- ====================================================
-- Problema: businesses.subcategory NO coincide con budget_requests.category
-- La política RLS requiere que coincidan EXACTAMENTE
-- ====================================================

-- Solución: Actualizar el negocio del usuario para que tenga subcategory = 'Bar y cafetería'
-- (Esto permitirá que vea los presupuestos insertados)

UPDATE public.businesses
SET subcategory = 'Bar y cafetería'
WHERE owner_id = '2146040a-47f8-4101-af75-7cbbb39d09f2'::uuid;

-- Verificar que se actualizó correctamente
SELECT
  id,
  name,
  subcategory,
  is_verified,
  verification_status
FROM public.businesses
WHERE owner_id = '2146040a-47f8-4101-af75-7cbbb39d09f2'::uuid;

-- Ahora verificar que el usuario pueda ver los presupuestos
-- (Simula la query que hace la app)
SELECT
  id,
  category,
  description,
  urgency,
  status,
  created_at
FROM public.budget_requests
WHERE category = 'Bar y cafetería'
  AND status IN ('pending', 'quoted')
ORDER BY created_at DESC;
