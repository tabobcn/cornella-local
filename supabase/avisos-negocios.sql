-- ============================================================================
-- 2026-10-31: avisos del administrador a todos los negocios verificados
-- ----------------------------------------------------------------------------
-- Panel de Admin → "Avisar a los negocios": el admin escribe un título y un mensaje y llega a
-- los dueños de todos los negocios aprobados como aviso en la app (campana) y, si quiere, como
-- notificación push en los dispositivos que las tengan activadas.
-- Solo para INFORMACIÓN DEL SERVICIO (novedades, cambios en las condiciones, incidencias).
-- Para ofrecer servicios propios (web, vídeo) se usa Panel → Servicios: solo a quien dio permiso.
-- Se guarda un historial (sin datos personales: título, mensaje, a cuántos llegó).
-- Se puede ejecutar más de una vez.
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
  id bigserial PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  message text NOT NULL CHECK (char_length(message) BETWEEN 3 AND 600),
  audience text NOT NULL DEFAULT 'negocios_verificados',
  with_push boolean NOT NULL DEFAULT true,
  recipients integer NOT NULL DEFAULT 0,
  push_sent integer NOT NULL DEFAULT 0,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_broadcasts_created_idx ON public.admin_broadcasts (created_at DESC);
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_broadcasts_admin_select ON public.admin_broadcasts;
CREATE POLICY admin_broadcasts_admin_select ON public.admin_broadcasts FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
REVOKE ALL ON public.admin_broadcasts FROM anon, authenticated;
GRANT SELECT ON public.admin_broadcasts TO authenticated;   -- solo lectura (y solo admins, por la política)

-- Envía el aviso. Devuelve {success, recipients, push_sent} o {success:false, error}.
CREATE OR REPLACE FUNCTION public.admin_send_business_broadcast(p_title text, p_message text, p_with_push boolean DEFAULT true)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_title text := btrim(COALESCE(p_title, ''));
  v_message text := btrim(COALESCE(p_message, ''));
  v_id bigint;
  v_recipients integer := 0;
  v_push integer := 0;
  r record;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF char_length(v_title) < 3 OR char_length(v_title) > 80 THEN
    RETURN json_build_object('success', false, 'error', 'bad_title');
  END IF;
  IF char_length(v_message) < 3 OR char_length(v_message) > 600 THEN
    RETURN json_build_object('success', false, 'error', 'bad_message');
  END IF;
  -- Evita enviarlo dos veces por un doble clic
  IF EXISTS (SELECT 1 FROM public.admin_broadcasts WHERE created_at > now() - interval '2 minutes') THEN
    RETURN json_build_object('success', false, 'error', 'too_soon');
  END IF;

  INSERT INTO public.admin_broadcasts (title, message, with_push, sent_by)
  VALUES (v_title, v_message, COALESCE(p_with_push, true), auth.uid())
  RETURNING id INTO v_id;

  -- Un aviso por dueño (aunque tenga varios negocios), solo cuentas no suspendidas
  FOR r IN
    SELECT DISTINCT b.owner_id AS id
      FROM public.businesses b
      JOIN public.profiles p ON p.id = b.owner_id
     WHERE b.verification_status = 'approved'
       AND COALESCE(p.is_banned, false) = false
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
    VALUES (r.id, 'admin_broadcast', v_title, v_message, 'Info', jsonb_build_object('broadcast_id', v_id), false);
    v_recipients := v_recipients + 1;
    IF COALESCE(p_with_push, true) THEN
      BEGIN
        v_push := v_push + COALESCE(public.send_push_notification(
          target_user_id := r.id,
          notification_title := '📣 ' || v_title,
          notification_message := left(v_message, 180),
          notification_url := 'https://www.cornellalocal.es/?nav=notifications',
          notification_type := 'admin_broadcast'
        ), 0);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'push aviso % a %: %', v_id, r.id, SQLERRM;
      END;
    END IF;
  END LOOP;

  UPDATE public.admin_broadcasts SET recipients = v_recipients, push_sent = v_push WHERE id = v_id;
  RETURN json_build_object('success', true, 'recipients', v_recipients, 'push_sent', v_push);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_send_business_broadcast(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_send_business_broadcast(text, text, boolean) TO authenticated;

COMMIT;

-- Comprobación: a cuántos dueños llegaría ahora
SELECT count(DISTINCT b.owner_id) AS duenos_de_negocios_verificados
  FROM public.businesses b JOIN public.profiles p ON p.id = b.owner_id
 WHERE b.verification_status = 'approved' AND COALESCE(p.is_banned, false) = false;
