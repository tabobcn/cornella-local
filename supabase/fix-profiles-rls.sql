-- =============================================
-- FIX: Añadir políticas RLS a la tabla profiles
-- =============================================
-- PROBLEMA: La tabla profiles no tiene políticas RLS,
-- por lo que nadie puede leer/escribir, causando timeout en login
-- =============================================

-- Habilitar RLS en profiles (por si acaso)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Política: Los usuarios pueden insertar su propio perfil (para el trigger)
CREATE POLICY "Usuarios pueden crear su propio perfil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Política: Los perfiles públicos pueden ser vistos por todos (opcional)
-- Esta política permite ver nombres/avatares de otros usuarios en reseñas, etc.
CREATE POLICY "Perfiles públicos son visibles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- VERIFICACIÓN: Ver políticas creadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- =============================================
-- NOTAS
-- =============================================
-- Con estas políticas:
-- ✅ Los usuarios pueden leer su propio perfil (login funcionará)
-- ✅ Los usuarios pueden actualizar su perfil
-- ✅ Todos pueden ver información pública de otros usuarios
-- ✅ El trigger de creación automática funcionará
-- =============================================
