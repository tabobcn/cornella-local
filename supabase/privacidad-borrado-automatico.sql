-- ============================================================================
-- 2026-10-31: privacidad — borrado automático, "Borrar mi cuenta" y "Descargar mis datos"
-- ----------------------------------------------------------------------------
-- Qué hace este script (se puede ejecutar más de una vez sin problema):
--  1) profiles.ban_reason: motivo de la suspensión, que se le enseña al usuario.
--  2) businesses.status_changed_at: cuándo cambió el estado (aprobado/rechazado...),
--     para saber cuándo toca borrar los documentos de verificación.
--  3) Avisos a quien denuncia: también cuando la denuncia se desestima.
--  4) delete_user_account(): borrado REAL de la cuenta (el propio usuario o un admin).
--  5) export_my_data(): el usuario descarga todos sus datos en un archivo.
--  6) admin_remove_business(): el admin retira un negocio indicando el motivo y el dueño
--     recibe el aviso.
--  7) privacy_cleanup(): limpieza diaria de datos que ya no hacen falta (ver plazos abajo).
--  8) run_privacy_cleanup() + pg_cron: cada noche llama a la Edge Function
--     "privacy-cleanup", que ejecuta privacy_cleanup() y borra los archivos con la API de
--     Storage (los archivos NO se pueden borrar con SQL).
--
-- PLAZOS (los mismos que dice la Política de Privacidad):
--  - Documentos de verificación y fotos de apelación: 2 días después de aprobar el negocio;
--    30 días después de rechazarlo si no se vuelve a enviar.
--  - CV de candidaturas: 2 días después de contratar/descartar al candidato o de cerrar la
--    oferta de empleo; como máximo 90 días.
--  - Candidaturas, solicitudes de presupuesto (con sus respuestas) y cupones: 12 meses.
--  - Avisos de la app: leídos a los 90 días; todos a los 6 meses.
--  - Dispositivos de notificaciones desactivados: 30 días.
--  - Denuncias cerradas y mensajes de soporte: 12 meses.
--  - Estadísticas de visitas: sin usuario a los 90 días; se borran a los 24 meses.
--  - Altas de negocio en borrador sin tocar: 6 meses.
--  - Archivos que ya no usa nada (fotos cambiadas, cuentas borradas...): 1 día para
--    documentos y CV, 7 días para fotos.
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Motivo de la suspensión de una cuenta
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;

CREATE OR REPLACE FUNCTION public.profiles_protect_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF NEW.ban_reason IS DISTINCT FROM OLD.ban_reason THEN
    RAISE EXCEPTION 'No puedes modificar ban_reason';
  END IF;

  -- El id es la PK, no debería cambiar nunca
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'No puedes modificar id';
  END IF;

  RETURN NEW;
END;
$function$;

-- La fecha de nacimiento ya no se pide ni se usa: se borra la que hubiera
UPDATE public.profiles SET birth_date = NULL WHERE birth_date IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Fecha del último cambio de estado del negocio
-- ---------------------------------------------------------------------------
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

UPDATE public.businesses
   SET status_changed_at = COALESCE(verified_at, updated_at, created_at)
 WHERE status_changed_at IS NULL;

CREATE OR REPLACE FUNCTION public.businesses_stamp_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    NEW.status_changed_at := now();
  ELSE
    -- Nadie la cambia a mano (así el dueño no puede retrasar el borrado de sus documentos)
    NEW.status_changed_at := OLD.status_changed_at;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.businesses_stamp_status_change() FROM PUBLIC, anon, authenticated;

-- Se ejecuta después de businesses_protect_privileged (orden alfabético), con el estado ya definitivo
DROP TRIGGER IF EXISTS businesses_stamp_status_change ON public.businesses;
CREATE TRIGGER businesses_stamp_status_change
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_stamp_status_change();

-- ---------------------------------------------------------------------------
-- 3) Quien denuncia recibe la respuesta, también si se desestima (DSA art. 16)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_user_report_resolved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.user_id IS NOT NULL
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('resolved', 'dismissed') THEN
    SELECT name INTO v_name FROM public.businesses WHERE id = NEW.business_id;
    INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
    VALUES (
      NEW.user_id,
      'report_resolved',
      CASE WHEN NEW.status = 'resolved' THEN '✅ Hemos revisado tu aviso' ELSE 'Hemos revisado tu aviso' END,
      CASE WHEN NEW.status = 'resolved'
        THEN 'Gracias por avisarnos sobre ' || COALESCE('"' || v_name || '"', 'el negocio') || '. Hemos tomado medidas.'
        ELSE 'Hemos revisado tu aviso sobre ' || COALESCE('"' || v_name || '"', 'el negocio')
             || ' y no hemos encontrado ningún incumplimiento. Si tienes más información, escríbenos a cornellalocal@gmail.com.'
      END,
      'CheckCircle2',
      jsonb_build_object('report_id', NEW.id, 'business_id', NEW.business_id, 'status', NEW.status),
      false
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_user_report_resolved() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Borrar una cuenta de verdad (el propio usuario, o un admin la de otro)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_target uuid := COALESCE(p_user_id, auth.uid());
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF v_target = v_uid AND EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND is_banned) THEN
    -- Una cuenta suspendida no se borra sola (podría volver a registrarse y saltarse la suspensión).
    -- La persona puede pedirlo por email y se valora caso a caso.
    RETURN json_build_object('success', false, 'error', 'account_suspended');
  END IF;
  IF v_target <> v_uid THEN
    IF NOT public.is_admin() THEN
      RETURN json_build_object('success', false, 'error', 'forbidden');
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_target AND is_admin) THEN
      RETURN json_build_object('success', false, 'error', 'cannot_delete_admin');
    END IF;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_target;
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM public.profiles WHERE id = v_target;
  END IF;

  -- Referencias que impedirían borrar el perfil
  UPDATE public.businesses SET verified_by = NULL WHERE verified_by = v_target;
  UPDATE public.offer_redemptions SET validated_by = NULL WHERE validated_by = v_target;

  -- Los 🔥 que dio dejan de contar
  UPDATE public.offers o
     SET fire_count = GREATEST(COALESCE(o.fire_count, 0) - f.n, 0)
    FROM (SELECT offer_id, count(*)::int AS n FROM public.offer_fires WHERE user_id = v_target GROUP BY offer_id) f
   WHERE o.id = f.offer_id;

  -- Sus negocios, con sus ofertas, empleos, reseñas recibidas, etc. (en cascada)
  DELETE FROM public.businesses WHERE owner_id = v_target;

  -- Mensajes de soporte que envió con su email
  IF v_email IS NOT NULL THEN
    DELETE FROM public.support_requests WHERE lower(email) = lower(v_email);
  END IF;

  -- Perfil (en cascada: favoritos, avisos, 🔥, cupones, dispositivos, denuncias) y la cuenta
  -- de acceso (en cascada: reseñas, solicitudes de presupuesto y candidaturas).
  -- Los archivos (fotos, CV, documentos) los borra la limpieza nocturna al quedar sin uso.
  DELETE FROM public.profiles WHERE id = v_target;
  DELETE FROM auth.users WHERE id = v_target;

  RETURN json_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Descargar mis datos (derecho de acceso y portabilidad)
--    OJO: la versión vigente está en panel-admin-servicios.sql (añade las solicitudes de servicios).
--    Si vuelves a ejecutar este archivo, ejecuta después panel-admin-servicios.sql.
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
    'mensajes_de_soporte', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('asunto', s.subject, 'mensaje', s.message, 'estado', s.status,
                                                   'fecha', s.created_at) ORDER BY s.created_at), '[]'::jsonb)
        FROM public.support_requests s WHERE v_email IS NOT NULL AND lower(s.email) = lower(v_email))
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) El admin retira un negocio indicando el motivo (DSA art. 17: explicar el motivo)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_remove_business(p_business_id integer, p_reason text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
  v_owner uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT name, owner_id INTO v_name, v_owner FROM public.businesses WHERE id = p_business_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Las denuncias abiertas sobre el negocio se dan por resueltas: así quien avisó recibe la respuesta
  UPDATE public.reports
     SET status = 'resolved', reviewed_by = auth.uid(), reviewed_at = now(),
         admin_notes = COALESCE(admin_notes || ' · ', '') || 'Negocio retirado'
   WHERE business_id = p_business_id AND status NOT IN ('resolved', 'dismissed');
  -- Avisos que apuntan al negocio (dejarían enlaces rotos), salvo las respuestas a denuncias
  DELETE FROM public.notifications
   WHERE data->>'business_id' = p_business_id::text
     AND type IS DISTINCT FROM 'report_resolved';
  -- El negocio, con sus ofertas, empleos, reseñas, favoritos... (en cascada)
  DELETE FROM public.businesses WHERE id = p_business_id;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
    VALUES (v_owner, 'business_removed', 'Hemos retirado tu negocio',
            COALESCE(v_name, 'Tu negocio') || ' ya no aparece en Cornellà Local. Motivo: '
              || COALESCE(NULLIF(btrim(p_reason), ''), 'incumplimiento de las condiciones de uso')
              || '. Si no estás de acuerdo, escríbenos a cornellalocal@gmail.com y lo revisaremos.',
            'AlertTriangle', jsonb_build_object('reason', NULLIF(btrim(p_reason), '')), false);
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_remove_business(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_business(integer, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Limpieza diaria. Devuelve qué filas ha borrado y qué archivos hay que borrar.
--    Solo la puede ejecutar la clave de servicio (la Edge Function privacy-cleanup).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.privacy_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n integer;
  v_rows jsonb := '{}'::jsonb;
  v_files jsonb;
  v_photos_candidates integer;
  v_photos_total integer;
  v_skip_photos boolean;
BEGIN
  -- Documentos de verificación y fotos de apelación: se quitan del negocio (los archivos
  -- quedan sin uso y se borran más abajo)
  UPDATE public.businesses
     SET verification_documents = '{}', appeal_images = '[]'::jsonb
   WHERE ((verification_status = 'approved'
           AND COALESCE(status_changed_at, verified_at, updated_at, created_at) < now() - interval '2 days')
       OR (verification_status = 'rejected'
           AND GREATEST(COALESCE(status_changed_at, created_at), COALESCE(updated_at, created_at)) < now() - interval '30 days'))
     AND (COALESCE(cardinality(verification_documents), 0) > 0
          OR (jsonb_typeof(appeal_images) = 'array' AND jsonb_array_length(appeal_images) > 0));
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('negocios_sin_documentos', n);

  -- CV de candidaturas
  UPDATE public.job_applications a
     SET cv_url = NULL
   WHERE a.cv_url IS NOT NULL
     AND ((a.status IN ('hired', 'rejected') AND a.updated_at < now() - interval '2 days')
          OR a.created_at < now() - interval '90 days'
          OR EXISTS (SELECT 1 FROM public.jobs j
                      WHERE j.id = a.job_id AND j.status = 'closed' AND j.updated_at < now() - interval '2 days'));
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('cv_retirados', n);

  -- Filas antiguas
  DELETE FROM public.notifications
   WHERE (is_read AND created_at < now() - interval '90 days') OR created_at < now() - interval '6 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('avisos', n);

  DELETE FROM public.push_subscriptions
   WHERE is_active = false AND COALESCE(last_used_at, created_at) < now() - interval '30 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('dispositivos', n);

  DELETE FROM public.job_applications WHERE created_at < now() - interval '12 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('candidaturas', n);

  DELETE FROM public.budget_requests WHERE created_at < now() - interval '12 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('presupuestos', n);

  DELETE FROM public.offer_redemptions WHERE created_at < now() - interval '12 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('cupones', n);

  DELETE FROM public.reports
   WHERE status IN ('resolved', 'dismissed') AND COALESCE(reviewed_at, created_at) < now() - interval '12 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('denuncias', n);

  DELETE FROM public.support_requests WHERE created_at < now() - interval '12 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('mensajes_soporte', n);

  UPDATE public.business_analytics SET user_id = NULL
   WHERE user_id IS NOT NULL AND created_at < now() - interval '90 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('estadisticas_anonimizadas', n);

  DELETE FROM public.business_analytics WHERE created_at < now() - interval '24 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('estadisticas', n);

  DELETE FROM public.businesses
   WHERE verification_status = 'draft'
     AND GREATEST(created_at, COALESCE(updated_at, created_at), COALESCE(status_changed_at, created_at))
         < now() - interval '6 months';
  GET DIAGNOSTICS n = ROW_COUNT;
  v_rows := v_rows || jsonb_build_object('borradores', n);

  -- Archivos sin uso: lo que no aparece en ninguna columna que guarde una ruta o URL de Storage
  CREATE TEMP TABLE IF NOT EXISTS _privacy_refs (path text) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _privacy_files (bucket text, path text) ON COMMIT DROP;
  TRUNCATE _privacy_refs, _privacy_files;

  INSERT INTO _privacy_refs (path)
  SELECT DISTINCT ltrim(split_part(
           regexp_replace(x, '^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/[^/]+/', ''),
           '?', 1), '/')
    FROM (
      SELECT unnest(verification_documents) AS x FROM public.businesses
      UNION ALL SELECT jsonb_array_elements_text(appeal_images) FROM public.businesses WHERE jsonb_typeof(appeal_images) = 'array'
      UNION ALL SELECT cover_photo FROM public.businesses
      UNION ALL SELECT logo_url FROM public.businesses
      UNION ALL SELECT unnest(images) FROM public.businesses
      UNION ALL SELECT image FROM public.offers
      UNION ALL SELECT unnest(photos) FROM public.budget_requests
      UNION ALL SELECT cv_url FROM public.job_applications
      UNION ALL SELECT avatar_url FROM public.profiles
    ) s
   WHERE x IS NOT NULL AND x <> '';

  INSERT INTO _privacy_files (bucket, path)
  SELECT o.bucket_id, o.name
    FROM storage.objects o
   WHERE o.bucket_id IN ('verification-documents', 'job-applications', 'business-photos')
     AND o.name NOT LIKE '%.emptyFolderPlaceholder'
     -- Solo nombres con caracteres normales: si un nombre lleva espacios o acentos, la URL guardada
     -- va codificada (%20...) y no se puede comparar con seguridad → ese archivo no se toca
     AND o.name ~ '^[A-Za-z0-9._/-]+$'
     AND o.created_at < now() - CASE WHEN o.bucket_id = 'business-photos' THEN interval '7 days' ELSE interval '1 day' END
     AND NOT EXISTS (SELECT 1 FROM _privacy_refs r WHERE r.path = o.name)
   ORDER BY o.created_at
   LIMIT 2000;

  -- Seguro: si de golpe saldrían más de 100 fotos y más de la mitad del total, algo raro pasa →
  -- no se tocan y la Edge Function lo marca como aviso (revisar a mano)
  SELECT count(*) INTO v_photos_candidates FROM _privacy_files WHERE bucket = 'business-photos';
  SELECT count(*) INTO v_photos_total FROM storage.objects WHERE bucket_id = 'business-photos';
  v_skip_photos := v_photos_candidates > 100 AND v_photos_candidates * 2 > v_photos_total;
  IF v_skip_photos THEN
    DELETE FROM _privacy_files WHERE bucket = 'business-photos';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket', bucket, 'path', path)), '[]'::jsonb)
    INTO v_files FROM _privacy_files;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'files', v_files,
    'fotos_omitidas_por_seguridad', CASE WHEN v_skip_photos THEN v_photos_candidates ELSE 0 END
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.privacy_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.privacy_cleanup() TO service_role;

-- ---------------------------------------------------------------------------
-- 8) Lanzador: llama a la Edge Function (que borra los archivos con la API de Storage)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_privacy_cleanup()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
   WHERE name = 'supabase_service_role_key'
   LIMIT 1;
  IF v_key IS NULL OR v_key = '' THEN
    RAISE WARNING 'Falta el secreto supabase_service_role_key en Vault';
    RETURN NULL;
  END IF;
  RETURN net.http_post(
    url := 'https://zwhlcgckhocdkdxilldo.supabase.co/functions/v1/privacy-cleanup',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    timeout_milliseconds := 120000
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_privacy_cleanup() FROM PUBLIC, anon, authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- 9) Programar la limpieza cada noche a las 03:17 (hora UTC; 04:17/05:17 en España)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

SELECT cron.schedule('limpieza-privacidad', '17 3 * * *', $$SELECT public.run_privacy_cleanup();$$);

-- Primera limpieza ahora mismo (borra los documentos y CV antiguos que ya tocaba borrar)
SELECT public.run_privacy_cleanup() AS primera_limpieza;

-- Comprobación: la tarea programada
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'limpieza-privacidad';
