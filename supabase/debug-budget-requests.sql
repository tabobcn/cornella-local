-- ====================================================
-- DEBUG: Por qué no aparecen los presupuestos
-- ====================================================

-- 1. Ver el user_id de test@cornella.local
SELECT id, email FROM auth.users WHERE email = 'test@cornella.local';

-- 2. Ver negocios del usuario test@cornella.local
SELECT
  id,
  name,
  subcategory,
  is_verified,
  verification_status,
  owner_id
FROM public.businesses
WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'test@cornella.local')
ORDER BY name;

-- 3. Ver todos los presupuestos TEST AUTO-REJECT
SELECT
  id,
  category,
  description,
  status,
  user_id,
  created_at
FROM public.budget_requests
WHERE description LIKE '%TEST AUTO-REJECT%'
ORDER BY created_at DESC;

-- 4. Ver si las categorías coinciden EXACTAMENTE
SELECT
  'Negocios' as source,
  DISTINCT subcategory as categoria
FROM public.businesses
WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'test@cornella.local')
UNION ALL
SELECT
  'Presupuestos' as source,
  DISTINCT category as categoria
FROM public.budget_requests
WHERE description LIKE '%TEST AUTO-REJECT%'
ORDER BY source, categoria;

-- 5. Test de política RLS (simula lo que ve el usuario)
-- Necesitas estar logueado como test@cornella.local para que funcione
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "(USER_ID_AQUI)"}';

SELECT
  br.id,
  br.category,
  br.description,
  br.status
FROM public.budget_requests br
WHERE EXISTS (
  SELECT 1 FROM public.businesses b
  WHERE b.owner_id = auth.uid()
  AND b.is_verified = true
  AND b.subcategory = br.category
)
AND br.status IN ('pending', 'quoted')
ORDER BY br.created_at DESC;
