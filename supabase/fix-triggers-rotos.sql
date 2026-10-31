-- ============================================================================
-- FIX 2026-10-30: triggers de notificación que rompían funciones básicas
-- ----------------------------------------------------------------------------
-- Cinco funciones de trigger usaban columnas que no existen. Como son triggers
-- AFTER INSERT, el error deshacía la operación entera:
--
--  1. notify_budget_response       (budget_quotes)   NEW.request_id, estimated_price, notes
--  2. push_notify_budget_response  (budget_quotes)   NEW.request_id, estimated_price
--     → los negocios NO podían enviar cotizaciones (0 cotizaciones en la BD)
--  3. push_notify_new_budget_request (budget_requests) NEW.subcategory (es "category")
--     → los usuarios NO podían pedir presupuestos
--  4. push_notify_favorite_new_job (jobs)            NEW.is_active (es "status")
--     → los negocios NO podían publicar empleos (0 empleos en la BD)
--  5. push_notify_from_budget_result (notifications) NEW.status, NEW.business_id
--     → aceptar un presupuesto fallaba al crear la notificación al negocio
--
-- Además, si el envío del email o del push falla, ahora solo se registra un
-- aviso (WARNING) y la operación principal se guarda igualmente.
-- Comprobación tras ejecutarlo: query "columnas inexistentes" al final.
-- ============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.notify_budget_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_business text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT p.email INTO v_email
      FROM public.budget_requests br
      JOIN public.profiles p ON p.id = br.user_id
     WHERE br.id = NEW.budget_request_id;

    SELECT name INTO v_business FROM public.businesses WHERE id = NEW.business_id;

    IF v_email IS NOT NULL THEN
      BEGIN
        PERFORM public.send_email_notification(
          'budget_response',
          v_email,
          jsonb_build_object(
            'business_name', v_business,
            'estimated_price', NEW.price,
            'notes', NEW.description,
            'estimated_duration', NEW.estimated_duration,
            'app_url', 'https://www.cornellalocal.es'
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_budget_response (quote %): %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.push_notify_budget_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid;
  v_business text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO v_user FROM public.budget_requests WHERE id = NEW.budget_request_id;
    SELECT name INTO v_business FROM public.businesses WHERE id = NEW.business_id;

    IF v_user IS NOT NULL THEN
      BEGIN
        PERFORM public.send_push_notification(
          target_user_id := v_user,
          notification_title := '📋 Respuesta a tu presupuesto',
          notification_message := COALESCE(v_business, 'Un negocio') || ' te ha respondido: ' || NEW.price || ' €',
          notification_url := 'https://www.cornellalocal.es/?nav=my-budget-requests',
          notification_type := 'budget_response',
          require_interaction := false,
          notification_metadata := jsonb_build_object(
            'business_name', v_business,
            'estimated_price', NEW.price,
            'quote_id', NEW.id,
            'request_id', NEW.budget_request_id
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'push_notify_budget_response (quote %): %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Nueva solicitud de presupuesto → push a los negocios de esa categoría.
--    Mismo criterio que la app: businesses.subcategory = categoría pedida
--    (o su id antiguo en minúsculas), negocios verificados, sin avisarse a uno mismo.
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
    WHEN 'climatizacion' THEN 'Climatización'
    WHEN 'electricista' THEN 'Electricista'
    WHEN 'fontanero' THEN 'Fontanero'
    WHEN 'jardineria' THEN 'Jardinería'
    WHEN 'limpieza' THEN 'Limpieza'
    WHEN 'mudanzas' THEN 'Mudanzas'
    WHEN 'pintor' THEN 'Pintor'
    WHEN 'reparacion' THEN 'Reparación móviles/PC'
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

-- 4) Nuevo empleo → push a quienes tienen el negocio en favoritos
CREATE OR REPLACE FUNCTION public.push_notify_favorite_new_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  fav_user uuid;
  v_business text;
BEGIN
  IF TG_OP = 'INSERT' AND COALESCE(NEW.status, 'active') = 'active' THEN
    SELECT name INTO v_business FROM public.businesses WHERE id = NEW.business_id;

    FOR fav_user IN
      SELECT user_id FROM public.favorites WHERE business_id = NEW.business_id
    LOOP
      BEGIN
        PERFORM public.send_push_notification(
          target_user_id := fav_user,
          notification_title := '💼 Nuevo empleo en tu favorito',
          notification_message := COALESCE(v_business, 'Un negocio') || ': ' || NEW.title,
          notification_url := 'https://www.cornellalocal.es/?empleo=' || NEW.id,
          notification_type := 'new_job_favorite',
          require_interaction := false,
          notification_metadata := jsonb_build_object(
            'business_name', v_business,
            'job_title', NEW.title,
            'job_id', NEW.id
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'push_notify_favorite_new_job (job %): %', NEW.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- 5) Notificación in-app "presupuesto aceptado/rechazado" → push al negocio.
--    El trigger está en la tabla notifications (WHEN type IN (...)), así que
--    solo puede usar columnas de notifications.
CREATE OR REPLACE FUNCTION public.push_notify_from_budget_result()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_title text;
  v_message text;
  v_type text;
  v_interact boolean;
BEGIN
  IF NEW.type = 'budget_quote_accepted' THEN
    v_title := '🎉 ¡Te han elegido!';
    v_message := COALESCE(NEW.message, 'Un cliente ha aceptado tu presupuesto. ¡Ponte en contacto!');
    v_type := 'budget_accepted';
    v_interact := true;
  ELSIF NEW.type = 'budget_quote_rejected' THEN
    v_title := 'Presupuesto no seleccionado';
    v_message := COALESCE(NEW.message, 'El cliente eligió otro profesional. ¡Sigue intentándolo!');
    v_type := 'budget_rejected';
    v_interact := false;
  ELSE
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.send_push_notification(
      target_user_id := NEW.user_id,
      notification_title := v_title,
      notification_message := v_message,
      notification_url := 'https://www.cornellalocal.es/?nav=incoming-budget-requests',
      notification_type := v_type,
      require_interaction := v_interact,
      notification_metadata := COALESCE(NEW.data, '{}'::jsonb)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push_notify_from_budget_result (notification %): %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_budget_response() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.push_notify_budget_response() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.push_notify_new_budget_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.push_notify_favorite_new_job() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.push_notify_from_budget_result() FROM PUBLIC, anon, authenticated;

COMMIT;

-- Comprobación: debe devolver 0 filas (ningún trigger usa columnas inexistentes)
WITH refs AS (
  SELECT DISTINCT c.relname AS tabla, t.tgname, lower(m[2]) AS col
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace ns ON ns.oid = c.relnamespace AND ns.nspname = 'public'
    JOIN pg_proc p ON p.oid = t.tgfoid
    CROSS JOIN LATERAL regexp_matches(p.prosrc, '\m(NEW|OLD)\.([a-zA-Z_][a-zA-Z0-9_]*)', 'gi') AS m
   WHERE NOT t.tgisinternal
)
SELECT tabla, tgname, string_agg(col, ', ') AS columnas_inexistentes
  FROM refs r
 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns ic
                    WHERE ic.table_schema = 'public' AND ic.table_name = r.tabla AND ic.column_name = r.col)
 GROUP BY tabla, tgname;
