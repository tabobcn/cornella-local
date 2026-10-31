-- Pegar entero en el SQL Editor de Supabase (3 partes, cada una en su transacción)

-- ============================================================================
-- 2026-10-31: permiso para anunciar el negocio en @cornella_informa
-- ----------------------------------------------------------------------------
-- instagram_consent   → el negocio acepta que @cornella_informa lo anuncie
-- instagram_posted_at → cuándo se publicó (lo marca n8n con la clave de servicio
--                       o un admin; el propietario no puede tocarlo)
-- La app solo muestra la casilla cuando estas columnas existen.
-- ============================================================================
BEGIN;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS instagram_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_posted_at timestamptz;

-- (una versión previa de este script añadía el formato publicación/historia: ya no se usa)
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_instagram_format_check;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS instagram_format;

CREATE OR REPLACE FUNCTION public.businesses_protect_instagram_posted()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.instagram_posted_at := NULL;
  ELSE
    NEW.instagram_posted_at := OLD.instagram_posted_at;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.businesses_protect_instagram_posted() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS businesses_protect_instagram_posted ON public.businesses;
CREATE TRIGGER businesses_protect_instagram_posted
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_protect_instagram_posted();

COMMIT;

SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name LIKE 'instagram_%'
 ORDER BY column_name;

-- ============================================================================
-- 2026-10-31: nombres de oficios en presupuestos = subcategorías de los negocios
-- ----------------------------------------------------------------------------
-- La pantalla de presupuestos guardaba "Climatización" y "Reparación móviles/PC"
-- (y antes ids como "cerrajero"), pero los negocios usan "Climatización y
-- calefacción", "Reparación de móviles y PC", "Cerrajero"... La política RLS
-- compara por igualdad, así que esos negocios no veían las solicitudes.
-- 1) Normaliza las solicitudes existentes.
-- 2) El push de "nueva solicitud" usa los nombres correctos (y acepta los antiguos).
-- ============================================================================
BEGIN;

UPDATE public.budget_requests
   SET category = CASE lower(category)
     WHEN 'albanil' THEN 'Albañil y reformas'
     WHEN 'carpintero' THEN 'Carpintero'
     WHEN 'cerrajero' THEN 'Cerrajero'
     WHEN 'climatizacion' THEN 'Climatización y calefacción'
     WHEN 'climatización' THEN 'Climatización y calefacción'
     WHEN 'electricista' THEN 'Electricista'
     WHEN 'fontanero' THEN 'Fontanero'
     WHEN 'jardineria' THEN 'Jardinería'
     WHEN 'limpieza' THEN 'Limpieza'
     WHEN 'mudanzas' THEN 'Mudanzas'
     WHEN 'pintor' THEN 'Pintor'
     WHEN 'reparacion' THEN 'Reparación de móviles y PC'
     WHEN 'reparación móviles/pc' THEN 'Reparación de móviles y PC'
     ELSE category
   END
 WHERE lower(category) IN ('albanil', 'carpintero', 'cerrajero', 'climatizacion', 'climatización', 'electricista',
                           'fontanero', 'jardineria', 'limpieza', 'mudanzas', 'pintor', 'reparacion', 'reparación móviles/pc')
   AND category NOT IN ('Carpintero', 'Cerrajero', 'Electricista', 'Fontanero', 'Limpieza', 'Mudanzas', 'Pintor');

CREATE OR REPLACE FUNCTION public.push_notify_new_budget_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  b record;
  v_category text;
BEGIN
  v_category := CASE lower(COALESCE(NEW.category, ''))
    WHEN 'albanil' THEN 'Albañil y reformas'
    WHEN 'carpintero' THEN 'Carpintero'
    WHEN 'cerrajero' THEN 'Cerrajero'
    WHEN 'climatizacion' THEN 'Climatización y calefacción'
    WHEN 'climatización' THEN 'Climatización y calefacción'
    WHEN 'electricista' THEN 'Electricista'
    WHEN 'fontanero' THEN 'Fontanero'
    WHEN 'jardineria' THEN 'Jardinería'
    WHEN 'limpieza' THEN 'Limpieza'
    WHEN 'mudanzas' THEN 'Mudanzas'
    WHEN 'pintor' THEN 'Pintor'
    WHEN 'reparacion' THEN 'Reparación de móviles y PC'
    WHEN 'reparación móviles/pc' THEN 'Reparación de móviles y PC'
    ELSE NEW.category
  END;

  FOR b IN
    SELECT bz.id, bz.name, bz.owner_id
      FROM public.businesses bz
     WHERE bz.subcategory IN (NEW.category, v_category)
       AND bz.is_verified = true
       AND bz.owner_id IS NOT NULL
       AND bz.owner_id IS DISTINCT FROM NEW.user_id
     ORDER BY bz.rating DESC NULLS LAST
     LIMIT 5
  LOOP
    BEGIN
      PERFORM public.send_push_notification(
        target_user_id := b.owner_id,
        notification_title := '💼 Nueva solicitud de presupuesto',
        notification_message := 'Tienes una nueva solicitud en ' || v_category,
        notification_url := 'https://www.cornellalocal.es/?nav=incoming-budget-requests',
        notification_type := 'new_budget_request',
        require_interaction := false,
        notification_metadata := jsonb_build_object(
          'business_id', b.id,
          'business_name', b.name,
          'category', v_category,
          'request_id', NEW.id
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'push_notify_new_budget_request (request %): %', NEW.id, SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.push_notify_new_budget_request() FROM PUBLIC, anon, authenticated;

COMMIT;

SELECT category, count(*) AS solicitudes FROM public.budget_requests GROUP BY category ORDER BY 1;

-- ============================================================================
-- 2026-10-31: alta completa antes de enviar + notificaciones de verificación
-- ----------------------------------------------------------------------------
-- 1) Nuevo estado 'draft' (borrador): el negocio se crea así y el dueño rellena
--    los 4 pasos (información, horario, fotos, documentos). Al pulsar "Enviar
--    solicitud" pasa a 'pending' y solo entonces lo ve el administrador.
-- 2) Notificaciones automáticas (en la app + push):
--    - al enviar la solicitud: al dueño ("Solicitud enviada") y a los admins
--    - al aprobar: al dueño, con los siguientes pasos (la aprobación ya publica)
--    - al rechazar: al dueño, con el motivo
-- ============================================================================
BEGIN;

ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_verification_status_check;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_verification_status_check
  CHECK (verification_status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text]));

-- Igual que la versión anterior, pero un negocio nuevo empieza como borrador
CREATE OR REPLACE FUNCTION public.businesses_protect_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'draft';
    NEW.is_verified := false;
    NEW.is_published := false;
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
    NEW.verification_notes := NULL;
    NEW.rejection_reason := NULL;
    NEW.rejection_count := 0;
    NEW.rating := 0;
    NEW.review_count := 0;
    NEW.view_count := 0;
    NEW.click_count := 0;
    RETURN NEW;
  END IF;
  NEW.id := OLD.id;
  NEW.owner_id := OLD.owner_id;
  -- El dueño solo puede pasar su negocio a 'pending' (enviar o reenviar la solicitud),
  -- nunca aprobarlo ni volver a borrador
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT (NEW.verification_status = 'pending' AND COALESCE(OLD.verification_status, '') <> 'approved') THEN
      NEW.verification_status := OLD.verification_status;
    END IF;
  END IF;
  NEW.is_verified := OLD.is_verified;
  NEW.verified_at := OLD.verified_at;
  NEW.verified_by := OLD.verified_by;
  NEW.verification_notes := OLD.verification_notes;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.rejection_count := OLD.rejection_count;
  NEW.rating := OLD.rating;
  NEW.review_count := OLD.review_count;
  NEW.view_count := OLD.view_count;
  NEW.click_count := OLD.click_count;
  NEW.last_viewed_at := OLD.last_viewed_at;
  IF NEW.is_published AND COALESCE(NEW.verification_status, '') <> 'approved' THEN
    NEW.is_published := false;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.businesses_notify_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  a record;
BEGIN
  IF NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status OR NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.verification_status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
    VALUES (NEW.owner_id, 'business_submitted', 'Solicitud enviada',
            'Hemos recibido la solicitud de ' || COALESCE(NEW.name, 'tu negocio') || '. Te avisaremos en cuanto la revisemos.',
            'Clock', jsonb_build_object('business_id', NEW.id), false);

    FOR a IN SELECT id FROM public.profiles WHERE is_admin = true AND id IS DISTINCT FROM NEW.owner_id LOOP
      INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
      VALUES (a.id, 'business_pending_review', 'Nueva solicitud de negocio',
              COALESCE(NEW.name, 'Un negocio') || ' espera tu revisión.',
              'Store', jsonb_build_object('business_id', NEW.id), false);
      BEGIN
        PERFORM public.send_push_notification(
          target_user_id := a.id,
          notification_title := '🏪 Nueva solicitud de negocio',
          notification_message := COALESCE(NEW.name, 'Un negocio') || ' espera tu revisión',
          notification_url := 'https://www.cornellalocal.es/?nav=admin-approve-businesses',
          notification_type := 'business_pending_review'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'push admin (business %): %', NEW.id, SQLERRM;
      END;
    END LOOP;

  ELSIF NEW.verification_status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
    VALUES (NEW.owner_id, 'business_approved', '¡Tu negocio ya está publicado!',
            COALESCE(NEW.name, 'Tu negocio') || ' ya aparece en Cornellà Local. Siguientes pasos: publica tu primera oferta, revisa tu ficha y comparte el enlace con tus clientes.',
            'BadgeCheck', jsonb_build_object('business_id', NEW.id), false);
    BEGIN
      PERFORM public.send_push_notification(
        target_user_id := NEW.owner_id,
        notification_title := '✅ ¡Negocio verificado!',
        notification_message := COALESCE(NEW.name, 'Tu negocio') || ' ya está publicado en Cornellà Local',
        notification_url := 'https://www.cornellalocal.es/?nav=owner-dashboard',
        notification_type := 'business_approved',
        require_interaction := true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'push aprobado (business %): %', NEW.id, SQLERRM;
    END;

  ELSIF NEW.verification_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
    VALUES (NEW.owner_id, 'business_rejected', 'Solicitud no aprobada',
            COALESCE('Motivo: ' || NULLIF(NEW.verification_notes, ''), 'Revisa los datos de tu negocio') || '. Puedes corregirlo y volver a enviarla.',
            'X', jsonb_build_object('business_id', NEW.id), false);
    BEGIN
      PERFORM public.send_push_notification(
        target_user_id := NEW.owner_id,
        notification_title := 'Solicitud no aprobada',
        notification_message := 'Revisa los datos de ' || COALESCE(NEW.name, 'tu negocio') || ' y vuelve a enviarla',
        notification_url := 'https://www.cornellalocal.es/?nav=business-appeal',
        notification_type := 'business_rejected'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'push rechazado (business %): %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.businesses_notify_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS businesses_notify_status_change ON public.businesses;
CREATE TRIGGER businesses_notify_status_change
  AFTER UPDATE OF verification_status ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_notify_status_change();

COMMIT;

SELECT pg_get_constraintdef(oid) AS estados_permitidos
  FROM pg_constraint WHERE conname = 'businesses_verification_status_check';
