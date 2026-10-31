-- ============================================================================
-- 2026-10-31: arreglos de la auditoría completa
-- ----------------------------------------------------------------------------
-- 1) GRAVE: las reglas de admin de la tabla profiles se consultaban a sí mismas
--    ("infinite recursion detected in policy for relation profiles"). Por eso fallaba
--    CUALQUIER cambio de perfil: editar nombre o foto, suspender/quitar suspensión desde el
--    panel y la sincronización del perfil al entrar. Ahora usan is_admin(), como las demás.
-- 2) No se podían dar códigos de ofertas caducadas... pero sí se daban: la función no miraba
--    la fecha. Ahora una oferta pasada de fecha (o que aún no ha empezado) no da códigos.
-- 3) Datos: valoración media desfasada de un negocio (reseña anterior al cálculo automático),
--    usuarios sin perfil y nombres de negocio con espacios al principio o al final.
-- Se puede ejecutar más de una vez.
-- ============================================================================
BEGIN;

-- 1) Reglas de admin en profiles sin recursión
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile" ON public.profiles FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

-- 2) Códigos de cupón: solo de ofertas vigentes
CREATE OR REPLACE FUNCTION public.get_or_create_redemption(p_offer_id uuid, p_user_id uuid, p_business_id integer)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_redemption public.offer_redemptions%ROWTYPE;
  v_offer record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Si ya tiene código para esta oferta, se le devuelve el mismo (no gasta otro cupón)
  SELECT * INTO v_redemption FROM public.offer_redemptions WHERE offer_id = p_offer_id AND user_id = v_uid;
  IF FOUND THEN
    RETURN json_build_object('code', v_redemption.code, 'status', v_redemption.status, 'created_at', v_redemption.created_at);
  END IF;

  -- FOR UPDATE: dos personas a la vez no pueden llevarse el último cupón
  SELECT id, business_id, max_uses, claimed_count, status, is_visible, starts_at, expires_at
    INTO v_offer
    FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR v_offer.status <> 'active' OR v_offer.is_visible IS NOT TRUE
     OR (v_offer.expires_at IS NOT NULL AND v_offer.expires_at <= now())
     OR (v_offer.starts_at IS NOT NULL AND v_offer.starts_at > now()) THEN
    RETURN json_build_object('success', false, 'error', 'offer_unavailable');
  END IF;
  IF v_offer.max_uses IS NOT NULL AND COALESCE(v_offer.claimed_count, 0) >= v_offer.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'max_uses_reached');
  END IF;

  INSERT INTO public.offer_redemptions (offer_id, user_id, business_id, code, status)
  VALUES (p_offer_id, v_uid, v_offer.business_id, public.generate_redemption_code(), 'pending')
  RETURNING * INTO v_redemption;
  UPDATE public.offers SET claimed_count = COALESCE(claimed_count, 0) + 1 WHERE id = p_offer_id;

  RETURN json_build_object('code', v_redemption.code, 'status', v_redemption.status, 'created_at', v_redemption.created_at);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_or_create_redemption(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_redemption(uuid, uuid, integer) TO authenticated;

-- 3a) Valoración media y número de reseñas al día
UPDATE public.businesses b
   SET rating = COALESCE(s.avg_rating, 0), review_count = COALESCE(s.total, 0)
  FROM (SELECT bb.id, ROUND(AVG(r.rating)::numeric, 1) AS avg_rating, COUNT(r.id) AS total
          FROM public.businesses bb LEFT JOIN public.reviews r ON r.business_id = bb.id
         GROUP BY bb.id) s
 WHERE s.id = b.id
   AND (COALESCE(b.review_count, 0) <> COALESCE(s.total, 0)
        OR ROUND(COALESCE(b.rating, 0), 1) <> COALESCE(s.avg_rating, 0));

-- 3b) Usuarios que se quedaron sin perfil (se crea igual que al registrarse)
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name'
  FROM auth.users u
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 3c) Nombres de negocio sin espacios sobrantes
UPDATE public.businesses SET name = btrim(name) WHERE name <> btrim(name);

COMMIT;

-- Comprobación (todo debe dar 0)
SELECT
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
      AND (qual ~* 'from\s+profiles' OR with_check ~* 'from\s+profiles')) AS reglas_con_recursion,
  (SELECT count(*) FROM public.businesses b
    WHERE COALESCE(b.review_count, 0) <> (SELECT count(*) FROM public.reviews r WHERE r.business_id = b.id)) AS valoraciones_desfasadas,
  (SELECT count(*) FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)) AS usuarios_sin_perfil,
  (SELECT count(*) FROM public.businesses WHERE name <> btrim(name)) AS nombres_con_espacios;
