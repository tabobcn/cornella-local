-- Verificar qué negocios tiene test@cornella.local AHORA
SELECT
  b.id,
  b.name,
  b.subcategory,
  b.owner_id,
  u.email
FROM public.businesses b
JOIN auth.users u ON b.owner_id = u.id
WHERE u.email = 'test@cornella.local'
ORDER BY b.name;

-- Ver si los 3 negocios de prueba existen (con cualquier owner)
SELECT
  id,
  name,
  subcategory,
  owner_id
FROM public.businesses
WHERE name IN (
  'Fontanería Rápida Cornellà',
  'Electricidad Profesional',
  'Limpieza Express Cornellà'
)
ORDER BY name;
