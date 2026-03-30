-- =============================================
-- POLÍTICAS RLS PARA ADMINS EN PROFILES
-- =============================================
-- Permite a usuarios con is_admin=true actualizar y eliminar
-- cualquier perfil desde el panel de administración
-- =============================================

-- Política: admins pueden actualizar cualquier perfil (banear/desbanear)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check
    WHERE admin_check.id = auth.uid()
      AND admin_check.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check
    WHERE admin_check.id = auth.uid()
      AND admin_check.is_admin = true
  )
);

-- Política: admins pueden eliminar cualquier perfil
CREATE POLICY "Admins can delete any profile"
ON public.profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check
    WHERE admin_check.id = auth.uid()
      AND admin_check.is_admin = true
  )
);

-- Verificar políticas activas en profiles
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
