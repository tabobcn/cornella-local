-- ====================================================
-- Verificar negocios existentes para testing
-- ====================================================

-- Ver negocios con las categorías necesarias
SELECT
  id,
  name,
  subcategory,
  owner_id,
  is_verified,
  verification_status
FROM public.businesses
WHERE subcategory IN ('Fontanería', 'Electricidad', 'Limpieza')
ORDER BY subcategory, name;

-- Si no hay suficientes, crear negocios de prueba
-- (Descomentar y ejecutar solo si es necesario)

/*
-- Usuario test@cornella.local
-- ID: (necesitas obtenerlo con: SELECT id FROM auth.users WHERE email = 'test@cornella.local')

-- Negocio 1: Fontanería
INSERT INTO public.businesses (
  owner_id,
  name,
  description,
  subcategory,
  address,
  phone,
  is_verified,
  verification_status
) VALUES (
  'TU_USER_ID_AQUI'::uuid,
  'Fontanería Rápida Cornellà',
  'Servicio de fontanería 24h en Cornellà',
  'Fontanería',
  'Calle Ejemplo 456, Cornellà',
  '666111222',
  true,
  'approved'
);

-- Negocio 2: Electricidad
INSERT INTO public.businesses (
  owner_id,
  name,
  description,
  subcategory,
  address,
  phone,
  is_verified,
  verification_status
) VALUES (
  'TU_USER_ID_AQUI'::uuid,
  'Electricidad Profesional',
  'Instalaciones eléctricas certificadas',
  'Electricidad',
  'Calle Ejemplo 789, Cornellà',
  '666333444',
  true,
  'approved'
);

-- Negocio 3: Limpieza
INSERT INTO public.businesses (
  owner_id,
  name,
  description,
  subcategory,
  address,
  phone,
  is_verified,
  verification_status
) VALUES (
  'TU_USER_ID_AQUI'::uuid,
  'Limpieza Express',
  'Limpieza profesional para hogares y oficinas',
  'Limpieza',
  'Calle Ejemplo 101, Cornellà',
  '666555666',
  true,
  'approved'
);
*/
