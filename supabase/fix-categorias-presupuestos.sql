-- ============================================================================
-- 2026-10-31: nombres de oficios en presupuestos = subcategorías de los negocios
-- ----------------------------------------------------------------------------
-- La pantalla de presupuestos guardaba "Climatización" y "Reparación móviles/PC"
-- (y antes ids como "cerrajero"), pero los negocios usan "Climatización y
-- calefacción", "Reparación de móviles y PC", "Cerrajero"... La política RLS
-- compara por igualdad, así que esos negocios no veían las solicitudes.
-- 1) Normaliza las solicitudes existentes.
-- 2) La solicitud nueva llega a los negocios con los nombres correctos (y acepta los antiguos):
--    aviso dentro de la app + push; las urgentes van marcadas con 🚨.
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
  v_urgent boolean := (NEW.urgency = 'urgent');
  v_title text;
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
  v_title := CASE WHEN v_urgent THEN '🚨 Presupuesto URGENTE' ELSE '💼 Nueva solicitud de presupuesto' END;

  FOR b IN
    SELECT bz.id, bz.name, bz.owner_id
      FROM public.businesses bz
     WHERE bz.subcategory IN (NEW.category, v_category)
       AND bz.is_verified = true
       AND bz.owner_id IS NOT NULL
       AND bz.owner_id IS DISTINCT FROM NEW.user_id
     ORDER BY bz.rating DESC NULLS LAST
     LIMIT 10
  LOOP
    -- Aviso dentro de la app (antes solo había push)
    INSERT INTO public.notifications (user_id, type, title, message, icon, data, is_read)
    VALUES (b.owner_id, 'new_budget_request', v_title,
            v_category || ': ' || left(COALESCE(NEW.description, ''), 90),
            'FileText', jsonb_build_object('request_id', NEW.id, 'business_id', b.id, 'urgent', v_urgent), false);
    BEGIN
      PERFORM public.send_push_notification(
        target_user_id := b.owner_id,
        notification_title := v_title,
        notification_message := 'Tienes una nueva solicitud en ' || v_category,
        notification_url := 'https://www.cornellalocal.es/?nav=incoming-budget-requests',
        notification_type := 'new_budget_request',
        require_interaction := v_urgent,
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
