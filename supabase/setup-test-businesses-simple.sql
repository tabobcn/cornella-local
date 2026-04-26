-- ====================================================
-- Crear negocios de prueba para testing auto-reject
-- ====================================================
-- VERSIÓN SIMPLE (sin DO $$)
-- ====================================================

-- Paso 1: Eliminar negocios de prueba anteriores (si existen)
DELETE FROM public.businesses
WHERE name IN (
  'Fontanería Rápida Cornellà',
  'Electricidad Profesional',
  'Limpieza Express Cornellà'
);

-- Paso 2: Crear Negocio 1 - Fontanería
INSERT INTO public.businesses (
  owner_id,
  name,
  description,
  subcategory,
  address,
  phone,
  email,
  is_verified,
  verification_status,
  created_at
)
SELECT
  id as owner_id,
  'Fontanería Rápida Cornellà' as name,
  'Servicio de fontanería 24h en Cornellà. Reparaciones urgentes, instalaciones y mantenimiento.' as description,
  'Fontanería' as subcategory,
  'Av. Sant Ildefons 123, Cornellà' as address,
  '666111222' as phone,
  'fontaneria@cornella.local' as email,
  true as is_verified,
  'approved' as verification_status,
  NOW() as created_at
FROM auth.users
WHERE email = 'test@cornella.local';

-- Paso 3: Crear Negocio 2 - Electricidad
INSERT INTO public.businesses (
  owner_id,
  name,
  description,
  subcategory,
  address,
  phone,
  email,
  is_verified,
  verification_status,
  created_at
)
SELECT
  id as owner_id,
  'Electricidad Profesional' as name,
  'Instalaciones eléctricas certificadas. Boletines eléctricos y reparaciones.' as description,
  'Electricidad' as subcategory,
  'Calle Rubió i Ors 456, Cornellà' as address,
  '666333444' as phone,
  'electricidad@cornella.local' as email,
  true as is_verified,
  'approved' as verification_status,
  NOW() as created_at
FROM auth.users
WHERE email = 'test@cornella.local';

-- Paso 4: Crear Negocio 3 - Limpieza
INSERT INTO public.businesses (
  owner_id,
  name,
  description,
  subcategory,
  address,
  phone,
  email,
  is_verified,
  verification_status,
  created_at
)
SELECT
  id as owner_id,
  'Limpieza Express Cornellà' as name,
  'Limpieza profesional para hogares y oficinas. Servicio rápido y eficiente.' as description,
  'Limpieza' as subcategory,
  'Calle Almería 789, Cornellà' as address,
  '666555666' as phone,
  'limpieza@cornella.local' as email,
  true as is_verified,
  'approved' as verification_status,
  NOW() as created_at
FROM auth.users
WHERE email = 'test@cornella.local';

-- Paso 5: Verificar que se crearon correctamente
SELECT
  id,
  name,
  subcategory,
  is_verified,
  verification_status,
  owner_id
FROM public.businesses
WHERE name IN (
  'Fontanería Rápida Cornellà',
  'Electricidad Profesional',
  'Limpieza Express Cornellà'
)
ORDER BY name;
