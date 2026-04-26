-- ====================================================
-- Crear negocios de prueba para testing auto-reject
-- ====================================================
-- Crea 3 negocios (Fontanería, Electricidad, Limpieza)
-- Asociados al usuario test@cornella.local
-- ====================================================

DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Obtener user_id de test@cornella.local
  SELECT id INTO test_user_id
  FROM auth.users
  WHERE email = 'test@cornella.local';

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario test@cornella.local no encontrado';
  END IF;

  RAISE NOTICE 'User ID encontrado: %', test_user_id;

  -- Eliminar negocios de prueba anteriores (si existen)
  DELETE FROM public.businesses
  WHERE name IN (
    'Fontanería Rápida Cornellà',
    'Electricidad Profesional',
    'Limpieza Express Cornellà'
  );

  -- Crear Negocio 1: Fontanería
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
  ) VALUES (
    test_user_id,
    'Fontanería Rápida Cornellà',
    'Servicio de fontanería 24h en Cornellà. Reparaciones urgentes, instalaciones y mantenimiento.',
    'Fontanería',
    'Av. Sant Ildefons 123, Cornellà',
    '666111222',
    'fontaneria@cornella.local',
    true,
    'approved',
    NOW()
  );

  RAISE NOTICE 'Negocio 1 creado: Fontanería Rápida Cornellà';

  -- Crear Negocio 2: Electricidad
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
  ) VALUES (
    test_user_id,
    'Electricidad Profesional',
    'Instalaciones eléctricas certificadas. Boletines eléctricos y reparaciones.',
    'Electricidad',
    'Calle Rubió i Ors 456, Cornellà',
    '666333444',
    'electricidad@cornella.local',
    true,
    'approved',
    NOW()
  );

  RAISE NOTICE 'Negocio 2 creado: Electricidad Profesional';

  -- Crear Negocio 3: Limpieza
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
  ) VALUES (
    test_user_id,
    'Limpieza Express Cornellà',
    'Limpieza profesional para hogares y oficinas. Servicio rápido y eficiente.',
    'Limpieza',
    'Calle Almería 789, Cornellà',
    '666555666',
    'limpieza@cornella.local',
    true,
    'approved',
    NOW()
  );

  RAISE NOTICE 'Negocio 3 creado: Limpieza Express Cornellà';

END $$;

-- Verificar que se crearon correctamente
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
