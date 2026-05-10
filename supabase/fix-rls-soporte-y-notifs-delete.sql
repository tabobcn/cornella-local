-- ============================================================================
-- FIX: dos problemas funcionales detectados en auditoría 2026-05-10
-- ============================================================================
-- 1) Formulario de soporte público no funciona (security-hardening.sql cerró el
--    insert a anon pero la app tiene formulario público). Volvemos a permitir
--    insert anónimo, manteniendo el rate limit y validaciones del trigger.
--
-- 2) Botón "Borrar leídas" en notificaciones no borra nada. Falta política RLS
--    DELETE para que cada usuario pueda borrar SUS propias notificaciones.
-- ============================================================================

-- ─── 1) SUPPORT_REQUESTS: permitir insert anónimo (con validación) ──────────
-- La tabla NO tiene columna user_id (sólo name/email/subject/message/status).
-- Validamos tamaños mínimos para evitar spam vacío; el trigger
-- support_rate_limit (security-hardening.sql) hace rate limit por email.

DROP POLICY IF EXISTS "support_insert_anon" ON public.support_requests;
DROP POLICY IF EXISTS "support_insert_authenticated" ON public.support_requests;
DROP POLICY IF EXISTS "Anyone can insert support requests" ON public.support_requests;

-- Insert para cualquiera (anon o authenticated) con validación mínima
CREATE POLICY "support_insert_any"
  ON public.support_requests FOR INSERT
  WITH CHECK (
    length(coalesce(name, '')) BETWEEN 1 AND 100
    AND length(coalesce(email, '')) BETWEEN 5 AND 200
    AND length(coalesce(message, '')) BETWEEN 5 AND 2000
  );


-- ─── 2) NOTIFICATIONS: permitir DELETE de las propias ──────────────────────

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ─── Verificación ───────────────────────────────────────────────────────────

SELECT 'support_requests policies' AS check, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'support_requests'
ORDER BY policyname;

SELECT 'notifications policies' AS check, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;
