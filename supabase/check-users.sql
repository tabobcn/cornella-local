-- =============================================
-- VERIFICAR USUARIOS EXISTENTES
-- =============================================

-- 1. Ver usuarios en auth.users (tabla de autenticación)
SELECT
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. Ver perfiles en public.profiles
SELECT
  id,
  email,
  full_name,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 3. Ver si existe carlos@test.com específicamente
SELECT
  'auth.users' as tabla,
  email,
  id
FROM auth.users
WHERE email = 'carlos@test.com'
UNION ALL
SELECT
  'public.profiles' as tabla,
  email,
  id::text
FROM public.profiles
WHERE email = 'carlos@test.com';

-- =============================================
-- NOTAS:
-- - Si no aparece carlos@test.com, necesitas crearlo
-- - Si aparece en auth.users pero no en profiles, hay un problema con el trigger
-- - Si no aparece en ningún lado, usa otro email o créalo
-- =============================================
