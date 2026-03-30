-- =============================================
-- ADD is_banned COLUMN TO profiles
-- =============================================
-- Permite banear usuarios desde el panel de administración
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Índice para filtrar usuarios baneados eficientemente
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned) WHERE is_banned = true;

-- Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'is_banned';
