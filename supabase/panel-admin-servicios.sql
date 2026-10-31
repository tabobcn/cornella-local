-- ============================================================================
-- 2026-10-31: más cosas que se llevan desde el panel de administración
-- ----------------------------------------------------------------------------
-- 1) app_settings: interruptores que el admin cambia desde el panel. El primero,
--    services_offer_enabled, enseña (o no) a los negocios la tarjeta "¿Quieres una web o un vídeo?".
--    Empieza APAGADO: nada cambia para los negocios hasta que lo enciendas en Panel → Servicios.
-- 2) Permisos del negocio con fecha:
--    - services_contact_consent (+ _at): el negocio acepta que le informemos de servicios de web y vídeo.
--    - instagram_consent_changed_at: cuándo dio o quitó el permiso de Instagram (para el plazo de 30 días).
-- 3) service_requests: el negocio pide información sobre una web o un vídeo; los admins reciben un aviso.
--    Una sola solicitud abierta por negocio. Las cerradas se borran a los 12 meses.
-- 4) admin_remove_review(id, motivo): el admin retira una reseña y su autor recibe el motivo (DSA art. 17).
-- 5) system_job_log + admin_system_status(): el panel enseña si la limpieza nocturna y la actualización de
--    la web han ido bien. Si fallan, los admins reciben un aviso.
-- 6) export_my_data() incluye las solicitudes de servicios.
-- Requiere haber ejecutado antes privacidad-borrado-automatico.sql y seo-reconstruir-web.sql.
-- Se puede ejecutar más de una vez.
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Ajustes de la app
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_settings_read ON public.app_settings;
CREATE POLICY app_settings_read ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS app_settings_admin_insert ON public.app_settings;
CREATE POLICY app_settings_admin_insert ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
DROP POLICY IF EXISTS app_settings_admin_update ON public.app_settings;
CREATE POLICY app_settings_admin_update ON public.app_settings FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
REVOKE ALL ON public.app_settings FROM anon, authenticated;
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.app_settings_stamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.app_settings_stamp() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS app_settings_stamp ON public.app_settings;
CREATE TRIGGER app_settings_stamp BEFORE INSERT OR UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.app_settings_stamp();

INSERT INTO public.app_settings (key, value) VALUES ('services_offer_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.services_offer_enabled()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT value = 'true'::jsonb FROM public.app_settings WHERE key = 'services_offer_enabled'), false);
$$;

-- ---------------------------------------------------------------------------
-- 2) Permisos del negocio, con la fecha en que se dieron o se quitaron
-- ---------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS services_contact_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS services_contact_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS instagram_consent_changed_at timestamptz;

-- Primero se quita el trigger para poder rellenar las fechas que faltan
DROP TRIGGER IF EXISTS businesses_stamp_consents ON public.businesses;
UPDATE public.businesses
   SET instagram_consent_changed_at = COALESCE(updated_at, created_at, now())
 WHERE instagram_consent_changed_at IS NULL
   AND (instagram_consent OR instagram_posted_at IS NOT NULL);

-- Sin SECURITY DEFINER: solo pone fechas, no comprueba permisos
CREATE OR REPLACE FUNCTION public.businesses_stamp_consents()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.services_contact_consent_at := CASE WHEN NEW.services_contact_consent THEN now() END;
    NEW.instagram_consent_changed_at := CASE WHEN NEW.instagram_consent THEN now() END;
    RETURN NEW;
  END IF;
  IF NEW.services_contact_consent IS DISTINCT FROM OLD.services_contact_consent THEN
    NEW.services_contact_consent_at := now();
  ELSE
    NEW.services_contact_consent_at := OLD.services_contact_consent_at;
  END IF;
  IF NEW.instagram_consent IS DISTINCT FROM OLD.instagram_consent THEN
    NEW.instagram_consent_changed_at := now();
  ELSE
    NEW.instagram_consent_changed_at := OLD.instagram_consent_changed_at;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.businesses_stamp_consents() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER businesses_stamp_consents BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_stamp_consents();

-- ---------------------------------------------------------------------------
-- 3) Solicitudes de servicios (web / vídeo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_requests (
  id bigserial PRIMARY KEY,
  business_id integer NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service text NOT NULL CHECK (service IN ('web', 'video', 'web_video')),
  message text CHECK (char_length(message) <= 1000),
  contact_phone text CHECK (char_length(contact_phone) <= 30),
  status text NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'hecho', 'descartado')),
  admin_notes text CHECK (char_length(admin_notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON public.service_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS service_requests_business_idx ON public.service_requests (business_id);
CREATE INDEX IF NOT EXISTS service_requests_owner_idx ON public.service_requests (owner_id);
-- Una sola solicitud abierta por negocio
CREATE UNIQUE INDEX IF NOT EXISTS service_requests_one_open_per_business
  ON public.service_requests (business_id) WHERE status IN ('nuevo', 'contactado');

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_requests_select ON public.service_requests;
CREATE POLICY service_requests_select ON public.service_requests FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
DROP POLICY IF EXISTS service_requests_insert_own ON public.service_requests;
CREATE POLICY service_requests_insert_own ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS service_requests_admin_update ON public.service_requests;
CREATE POLICY service_requests_admin_update ON public.service_requests FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
DROP POLICY IF EXISTS service_requests_delete ON public.service_requests;
CREATE POLICY service_requests_delete ON public.service_requests FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
REVOKE ALL ON public.service_requests FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT USAGE ON SEQUENCE public.service_requests_id_seq TO authenticated;

-- Reglas al crear y al cambiar (sin SECURITY DEFINER: current_user es el rol real de quien llama)
CREATE OR REPLACE FUNCTION public.service_requests_enforce()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.business_id := OLD.business_id;
    NEW.owner_id := OLD.owner_id;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := now();
    IF NEW.status IN ('hecho', 'descartado') THEN
      NEW.closed_at := CASE WHEN OLD.status IN ('hecho', 'descartado') THEN OLD.closed_at ELSE now() END;
    ELSE
      NEW.closed_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- INSERT desde la app (los admins y las funciones del sistema no tienen estos límites)
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    NEW.owner_id := auth.uid();
    NEW.status := 'nuevo';
    NEW.admin_notes := NULL;
    NEW.closed_at := NULL;
    NEW.created_at := now();
    NEW.updated_at := now();
    IF NOT public.services_offer_enabled() THEN
      RAISE EXCEPTION 'services_disabled' USING ERRCODE = 'P0001';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.businesses
                    WHERE id = NEW.business_id AND owner_id = auth.uid() AND verification_status = 'approved') THEN
      RAISE EXCEPTION 'service_business_not_approved' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  NEW.message := NULLIF(btrim(NEW.message), '');
  NEW.contact_phone := NULLIF(btrim(NEW.contact_phone), '');
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.service_requests_enforce() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS service_requests_enforce ON public.service_requests;
CREATE TRIGGER service_requests_enforce BEFORE INSERT OR UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.service_requests_enforce();

-- Aviso (en la app y push) a los administradores
CREATE OR REPLACE FUNCTION public.service_requests_notify_admins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  a record;
  v_name text;
  v_what text;
BEGIN
  SELECT name INTO v_name FROM public.businesses WHERE id = NEW.business_id;
  v_what := CASE NEW.service WHEN 'web' THEN 'una página web' WHEN 'video' THEN 'un vídeo' ELSE 'una web y un vídeo' END;
  FOR a IN SELECT id FROM public.profiles WHERE is_admin = true LOOP
    INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
    VALUES (a.id, 'service_request', 'Nueva solicitud de servicios',
            COALESCE(v_name, 'Un negocio') || ' pide información sobre ' || v_what || '.',
            'Sparkles', jsonb_build_object('business_id', NEW.business_id, 'service_request_id', NEW.id), false);
    BEGIN
      PERFORM public.send_push_notification(
        target_user_id := a.id,
        notification_title := '💡 Nueva solicitud de servicios',
        notification_message := COALESCE(v_name, 'Un negocio') || ' pide información sobre ' || v_what,
        notification_url := 'https://www.cornellalocal.es/?nav=admin-services',
        notification_type := 'service_request'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'push admin (servicio %): %', NEW.id, SQLERRM;
    END;
  END LOOP;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.service_requests_notify_admins() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS service_requests_notify_admins ON public.service_requests;
CREATE TRIGGER service_requests_notify_admins AFTER INSERT ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.service_requests_notify_admins();

-- ---------------------------------------------------------------------------
-- 4) Retirar una reseña con motivo
-- ---------------------------------------------------------------------------
-- El admin ve todas las reseñas (también las de negocios aún sin verificar)
DROP POLICY IF EXISTS reviews_admin_select ON public.reviews;
CREATE POLICY reviews_admin_select ON public.reviews FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.admin_remove_review(p_review_id uuid, p_reason text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid;
  v_business text;
  v_reason text := NULLIF(btrim(left(p_reason, 300)), '');
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT r.user_id, b.name INTO v_user, v_business
    FROM public.reviews r LEFT JOIN public.businesses b ON b.id = r.business_id
   WHERE r.id = p_review_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  DELETE FROM public.reviews WHERE id = p_review_id;   -- la media del negocio se recalcula sola (trigger)

  IF v_user IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user) THEN
    INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
    VALUES (v_user, 'review_removed', 'Hemos retirado tu reseña',
            'Tu reseña sobre ' || COALESCE(v_business, 'un negocio') || ' ya no se muestra. Motivo: '
              || COALESCE(v_reason, 'no cumple las normas de las reseñas')
              || '. Si no estás de acuerdo, escríbenos a cornellalocal@gmail.com y lo revisaremos.',
            'AlertTriangle', jsonb_build_object('reason', v_reason), false);
  END IF;
  RETURN json_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_remove_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_review(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Registro de las tareas nocturnas y estado del sistema
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_job_log (
  id bigserial PRIMARY KEY,
  job text NOT NULL,
  request_id bigint,
  requested_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  ok boolean,
  status_code integer,
  summary jsonb,
  error text
);
CREATE INDEX IF NOT EXISTS system_job_log_job_idx ON public.system_job_log (job, requested_at DESC);
ALTER TABLE public.system_job_log ENABLE ROW LEVEL SECURITY;   -- sin políticas: nadie desde la app
REVOKE ALL ON public.system_job_log FROM anon, authenticated;

-- La limpieza nocturna apunta su petición para poder recoger luego el resultado
CREATE OR REPLACE FUNCTION public.run_privacy_cleanup()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text;
  v_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
   WHERE name = 'supabase_service_role_key'
   LIMIT 1;
  IF v_key IS NULL OR v_key = '' THEN
    RAISE WARNING 'Falta el secreto supabase_service_role_key en Vault';
    INSERT INTO public.system_job_log (job, finished_at, ok, error)
    VALUES ('limpieza-privacidad', now(), false, 'falta la clave supabase_service_role_key en el Vault');
    RETURN NULL;
  END IF;
  v_id := net.http_post(
    url := 'https://zwhlcgckhocdkdxilldo.supabase.co/functions/v1/privacy-cleanup',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    timeout_milliseconds := 120000
  );
  INSERT INTO public.system_job_log (job, request_id) VALUES ('limpieza-privacidad', v_id);
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_privacy_cleanup() FROM PUBLIC, anon, authenticated;

-- La actualización de la web también (y apunta cuando no hay cambios)
CREATE OR REPLACE FUNCTION public.run_site_rebuild()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text;
  v_id bigint;
BEGIN
  IF NOT COALESCE((SELECT dirty FROM public.site_rebuild_state WHERE id = 1), false) THEN
    INSERT INTO public.system_job_log (job, finished_at, ok, summary)
    VALUES ('reconstruir-web', now(), true, '{"resultado": "sin cambios"}'::jsonb);
    RETURN 'sin cambios';
  END IF;
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vercel_deploy_hook' LIMIT 1;
  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'Falta el secreto vercel_deploy_hook en Vault';
    INSERT INTO public.system_job_log (job, finished_at, ok, error)
    VALUES ('reconstruir-web', now(), false, 'falta la URL del Deploy Hook en el Vault');
    RETURN 'falta la URL del Deploy Hook';
  END IF;
  v_id := net.http_post(url := v_url, body := '{}'::jsonb, timeout_milliseconds := 30000);
  UPDATE public.site_rebuild_state SET dirty = false, last_requested_at = now() WHERE id = 1;
  INSERT INTO public.system_job_log (job, request_id) VALUES ('reconstruir-web', v_id);
  RETURN 'despliegue pedido';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_site_rebuild() FROM PUBLIC, anon, authenticated;

-- Recoge las respuestas (pg_net solo las guarda unas 6 horas) y avisa a los admins si algo ha fallado
CREATE OR REPLACE FUNCTION public.collect_system_job_results()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  r record;
  a record;
  v_summary jsonb;
  v_ok boolean;
  v_error text;
  v_label text;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT l.id, l.job, l.requested_at, h.id AS resp_id, h.status_code, h.content, h.timed_out, h.error_msg, h.created
      FROM public.system_job_log l
      LEFT JOIN net._http_response h ON h.id = l.request_id
     WHERE l.finished_at IS NULL
  LOOP
    IF r.resp_id IS NULL THEN
      IF r.requested_at > now() - interval '3 hours' THEN
        CONTINUE;   -- todavía puede llegar
      END IF;
      v_ok := false;
      v_error := 'no ha llegado respuesta';
      UPDATE public.system_job_log SET finished_at = now(), ok = false, error = v_error WHERE id = r.id;
    ELSE
      BEGIN
        v_summary := r.content::jsonb;
      EXCEPTION WHEN OTHERS THEN
        v_summary := to_jsonb(left(COALESCE(r.content, ''), 500));
      END;
      v_ok := COALESCE(r.status_code BETWEEN 200 AND 299 AND r.status_code <> 207, false)
              AND NOT COALESCE(r.timed_out, false);
      v_error := CASE WHEN v_ok THEN NULL
                      WHEN r.timed_out THEN 'tiempo de espera agotado'
                      WHEN r.error_msg IS NOT NULL THEN r.error_msg
                      WHEN r.status_code = 207 THEN 'terminó con avisos (ver detalle)'
                      ELSE 'respuesta ' || COALESCE(r.status_code::text, 'vacía') END;
      UPDATE public.system_job_log
         SET finished_at = COALESCE(r.created, now()), ok = v_ok, status_code = r.status_code,
             summary = v_summary, error = v_error
       WHERE id = r.id;
    END IF;
    n := n + 1;

    IF NOT v_ok THEN
      v_label := CASE r.job WHEN 'limpieza-privacidad' THEN 'La limpieza nocturna de datos'
                            WHEN 'reconstruir-web' THEN 'La actualización de la web'
                            ELSE r.job END;
      FOR a IN SELECT id FROM public.profiles WHERE is_admin = true LOOP
        INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
        VALUES (a.id, 'system_job_failed', 'Algo no ha ido bien esta noche',
                v_label || ' no ha terminado bien: ' || v_error || '. Míralo en el panel de administración.',
                'AlertTriangle', jsonb_build_object('job', r.job, 'log_id', r.id), false);
      END LOOP;
    END IF;
  END LOOP;

  DELETE FROM public.system_job_log WHERE requested_at < now() - interval '90 days';
  RETURN n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.collect_system_job_results() FROM PUBLIC, anon, authenticated;

-- Lo que enseña la tarjeta "Estado del sistema" del panel (solo admins)
CREATE OR REPLACE FUNCTION public.admin_system_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM public.collect_system_job_results();
  RETURN jsonb_build_object(
    'ahora', now(),
    'limpieza', (SELECT to_jsonb(l) - 'request_id' FROM public.system_job_log l
                  WHERE l.job = 'limpieza-privacidad' ORDER BY l.requested_at DESC LIMIT 1),
    'web', (SELECT to_jsonb(l) - 'request_id' FROM public.system_job_log l
             WHERE l.job = 'reconstruir-web' ORDER BY l.requested_at DESC LIMIT 1),
    'web_cambios_pendientes', (SELECT dirty FROM public.site_rebuild_state WHERE id = 1),
    'web_ultimo_despliegue', (SELECT last_requested_at FROM public.site_rebuild_state WHERE id = 1),
    'tareas', (SELECT COALESCE(jsonb_agg(jsonb_build_object('nombre', jobname, 'horario', schedule, 'activa', active)
                                         ORDER BY jobname), '[]'::jsonb)
                 FROM cron.job
                WHERE jobname IN ('limpieza-privacidad', 'reconstruir-web', 'recoger-resultados', 'limpieza-servicios'))
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_system_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_system_status() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Descargar mis datos: ahora incluye las solicitudes de servicios
--    (versión vigente; sustituye a la de privacidad-borrado-automatico.sql)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  RETURN jsonb_build_object(
    'generado', now(),
    'responsable', 'Cornellà Local · cornellalocal@gmail.com',
    'cuenta', (
      SELECT jsonb_build_object('email', u.email, 'creada', u.created_at, 'ultimo_acceso', u.last_sign_in_at,
                                'acceso_con', u.raw_app_meta_data->>'provider')
        FROM auth.users u WHERE u.id = v_uid),
    'perfil', (SELECT to_jsonb(p) - 'is_admin' FROM public.profiles p WHERE p.id = v_uid),
    'favoritos', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('negocio', b.name, 'desde', f.created_at) ORDER BY f.created_at), '[]'::jsonb)
        FROM public.favorites f LEFT JOIN public.businesses b ON b.id = f.business_id
       WHERE f.user_id = v_uid),
    'resenas', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('negocio', b.name, 'puntuacion', r.rating, 'comentario', r.comment,
                                                   'respuesta_del_negocio', r.owner_response, 'fecha', r.created_at)
                                ORDER BY r.created_at), '[]'::jsonb)
        FROM public.reviews r LEFT JOIN public.businesses b ON b.id = r.business_id
       WHERE r.user_id = v_uid),
    'solicitudes_de_presupuesto', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'oficio', br.category, 'descripcion', br.description, 'direccion', br.address, 'telefono', br.phone,
               'urgencia', br.urgency, 'estado', br.status, 'fotos', br.photos, 'fecha', br.created_at,
               'respuestas', (
                 SELECT COALESCE(jsonb_agg(jsonb_build_object('negocio', b.name, 'precio', q.price, 'mensaje', q.description,
                                                              'estado', q.status, 'fecha', q.created_at)), '[]'::jsonb)
                   FROM public.budget_quotes q LEFT JOIN public.businesses b ON b.id = q.business_id
                  WHERE q.budget_request_id = br.id)
             ) ORDER BY br.created_at), '[]'::jsonb)
        FROM public.budget_requests br WHERE br.user_id = v_uid),
    'candidaturas', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'empleo', j.title, 'negocio', b.name, 'nombre', a.full_name, 'email', a.email, 'telefono', a.phone,
               'mensaje', a.message, 'cv_guardado', a.cv_url IS NOT NULL, 'estado', a.status,
               'entrevista', a.interview_date, 'lugar_entrevista', a.interview_location, 'fecha', a.created_at
             ) ORDER BY a.created_at), '[]'::jsonb)
        FROM public.job_applications a
        LEFT JOIN public.jobs j ON j.id = a.job_id
        LEFT JOIN public.businesses b ON b.id = j.business_id
       WHERE a.user_id = v_uid),
    'cupones', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('oferta', o.title, 'codigo', r.code, 'estado', r.status,
                                                   'pedido', r.created_at, 'canjeado', r.validated_at)
                                ORDER BY r.created_at), '[]'::jsonb)
        FROM public.offer_redemptions r LEFT JOIN public.offers o ON o.id = r.offer_id
       WHERE r.user_id = v_uid),
    'fuegos_dados', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('oferta', o.title, 'fecha', f.created_at) ORDER BY f.created_at), '[]'::jsonb)
        FROM public.offer_fires f LEFT JOIN public.offers o ON o.id = f.offer_id
       WHERE f.user_id = v_uid),
    'avisos', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('titulo', n.title, 'mensaje', n.message, 'leido', n.is_read,
                                                   'fecha', n.created_at) ORDER BY n.created_at DESC), '[]'::jsonb)
        FROM public.notifications n WHERE n.user_id = v_uid),
    'denuncias_enviadas', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('negocio', b.name, 'tipo', r.report_type, 'mensaje', r.message,
                                                   'estado', r.status, 'fecha', r.created_at) ORDER BY r.created_at), '[]'::jsonb)
        FROM public.reports r LEFT JOIN public.businesses b ON b.id = r.business_id
       WHERE r.user_id = v_uid),
    'cupones_guardados', (
      SELECT COALESCE(jsonb_agg(to_jsonb(c) - 'user_id'), '[]'::jsonb)
        FROM public.saved_coupons c WHERE c.user_id = v_uid),
    'dispositivos_con_notificaciones', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('navegador', s.user_agent, 'activo', s.is_active,
                                                   'alta', s.created_at, 'ultimo_uso', s.last_used_at)), '[]'::jsonb)
        FROM public.push_subscriptions s WHERE s.user_id = v_uid),
    'negocios', (
      SELECT COALESCE(jsonb_agg(to_jsonb(b) - 'verification_documents' - 'appeal_images' - 'verified_by'), '[]'::jsonb)
        FROM public.businesses b WHERE b.owner_id = v_uid),
    'solicitudes_de_servicios', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('negocio', b.name, 'servicio', s.service, 'mensaje', s.message,
                                                   'telefono', s.contact_phone, 'estado', s.status,
                                                   'notas_internas', s.admin_notes, 'fecha', s.created_at)
                                ORDER BY s.created_at), '[]'::jsonb)
        FROM public.service_requests s LEFT JOIN public.businesses b ON b.id = s.business_id
       WHERE s.owner_id = v_uid),
    'mensajes_de_soporte', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('asunto', s.subject, 'mensaje', s.message, 'estado', s.status,
                                                   'fecha', s.created_at) ORDER BY s.created_at), '[]'::jsonb)
        FROM public.support_requests s WHERE v_email IS NOT NULL AND lower(s.email) = lower(v_email))
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- 7) Tareas programadas
-- ---------------------------------------------------------------------------
-- Cada hora (minuto 7) se recogen los resultados de las tareas nocturnas
SELECT cron.schedule('recoger-resultados', '7 * * * *', $$SELECT public.collect_system_job_results();$$);
-- Cada noche se borran las solicitudes de servicios cerradas hace más de 12 meses
SELECT cron.schedule('limpieza-servicios', '19 3 * * *',
  $$DELETE FROM public.service_requests WHERE status IN ('hecho', 'descartado') AND closed_at < now() - interval '12 months';$$);

-- Comprobación
SELECT jobname, schedule, active FROM cron.job
 WHERE jobname IN ('limpieza-privacidad', 'reconstruir-web', 'recoger-resultados', 'limpieza-servicios')
 ORDER BY jobname;
