-- ============================================================================
-- SECURITY HARDENING v2 — CornellaLocal
-- Cierra escalada de privilegios via UPDATE en profiles.is_admin / is_banned
-- Auditoría 2026-05-10
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================
-- Problema: la política "Usuarios pueden actualizar su propio perfil" usa
-- USING (auth.uid() = id) con WITH CHECK también amplio, lo que permite que
-- un usuario haga:
--   update profiles set is_admin=true where id=auth.uid()
-- y se auto-promocione a admin / se desbanee.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Trigger BEFORE UPDATE que bloquea cambios en columnas privilegiadas
--    salvo que el caller sea admin verificado o service_role
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.profiles_protect_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  -- service_role puede hacer cualquier cosa (triggers, edge functions con clave)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Verificar si el caller es admin (consultando la tabla, no la respuesta del cliente)
  SELECT COALESCE(p.is_admin, false) INTO caller_is_admin
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF caller_is_admin THEN
    RETURN NEW;
  END IF;

  -- Usuario normal: bloquear cualquier cambio en columnas privilegiadas
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'No puedes modificar is_admin';
  END IF;

  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    RAISE EXCEPTION 'No puedes modificar is_banned';
  END IF;

  -- El id es la PK, no debería cambiar nunca
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'No puedes modificar id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileged ON public.profiles;
CREATE TRIGGER profiles_protect_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_privileged_columns();

-- ----------------------------------------------------------------------------
-- 2) Verificación: listar políticas + trigger activos
-- ----------------------------------------------------------------------------

SELECT 'profiles policies' AS check, policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT 'profiles triggers' AS check, trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
ORDER BY trigger_name;

-- ============================================================================
-- FIN.
-- Test rápido tras ejecutar (desde un user no-admin autenticado):
--   update profiles set is_admin=true where id=auth.uid();
--   -- debe fallar con "No puedes modificar is_admin"
-- ============================================================================
