-- ============================================================================
-- 2026-10-31: reglas de las ofertas aplicadas también en la base de datos
-- ----------------------------------------------------------------------------
-- Hasta ahora el límite de 1 oferta cada 7 días solo lo comprobaba la app, así que
-- se podía saltar (llamando directamente a la API, o borrando la oferta y creando otra).
-- Ahora lo garantiza la base de datos:
--  1) Solo publican ofertas los negocios aprobados.
--  2) 1 oferta cada 7 días por negocio, contando desde la última publicada AUNQUE SE BORRE
--     (se apunta en offer_publications, que nadie puede tocar desde la app).
--  3) La duración la pone el servidor: oferta normal 5 días, flash 8 horas.
--  4) Una vez creada, el dueño no puede cambiar las fechas, el tipo (flash/normal), el
--     negocio ni el número de cupones: solo pausarla o reactivarla.
-- Los administradores (y las funciones del sistema) no tienen estos límites.
-- Para cambiar el límite en el futuro (p. ej. premium), tocar v_weekly_limit en offer_publish_block_reason().
-- Se puede ejecutar más de una vez.
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.offer_publications (
  id bigserial PRIMARY KEY,
  business_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offer_publications_business_created_idx
  ON public.offer_publications (business_id, created_at DESC);
ALTER TABLE public.offer_publications ENABLE ROW LEVEL SECURITY;  -- sin políticas: nadie desde la app
REVOKE ALL ON public.offer_publications FROM anon, authenticated;

-- Apuntar las ofertas de los últimos 7 días que ya existen (solo la primera vez)
INSERT INTO public.offer_publications (business_id, created_at)
SELECT o.business_id, o.created_at
  FROM public.offers o
 WHERE o.created_at > now() - interval '7 days'
   AND NOT EXISTS (SELECT 1 FROM public.offer_publications p
                    WHERE p.business_id = o.business_id AND p.created_at = o.created_at);

-- ¿Puede este negocio publicar una oferta ahora? NULL = sí; si no, el motivo.
-- (SECURITY DEFINER para poder leer offer_publications, que los usuarios no ven)
CREATE OR REPLACE FUNCTION public.offer_publish_block_reason(p_business_id integer)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_weekly_limit integer := 1;   -- ofertas por negocio cada 7 días (premium: subir este número)
  v_status text;
BEGIN
  SELECT verification_status INTO v_status FROM public.businesses WHERE id = p_business_id;
  IF COALESCE(v_status, '') <> 'approved' THEN
    RETURN 'offer_business_not_approved';
  END IF;
  IF (SELECT count(*) FROM public.offer_publications
       WHERE business_id = p_business_id AND created_at > now() - interval '7 days') >= v_weekly_limit THEN
    RETURN 'offer_weekly_limit';
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.offer_publish_block_reason(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.offer_publish_block_reason(integer) TO authenticated;

-- Sin SECURITY DEFINER a propósito: así current_user es el rol real de quien llama
-- ('authenticated' desde la app) y la comprobación de abajo funciona.
CREATE OR REPLACE FUNCTION public.offers_enforce_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  v_reason text;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_reason := public.offer_publish_block_reason(NEW.business_id);
    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION '%', v_reason USING ERRCODE = 'P0001';
    END IF;
    NEW.created_at := now();
    NEW.starts_at := now();
    NEW.expires_at := now() + CASE WHEN COALESCE(NEW.is_flash, false) THEN interval '8 hours' ELSE interval '5 days' END;
    RETURN NEW;
  END IF;

  -- UPDATE: el dueño solo puede pausar/reactivar y editar textos
  NEW.business_id := OLD.business_id;
  NEW.created_at := OLD.created_at;
  NEW.starts_at := OLD.starts_at;
  NEW.expires_at := OLD.expires_at;
  NEW.is_flash := OLD.is_flash;
  NEW.max_uses := OLD.max_uses;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.offers_enforce_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS offers_enforce_rules ON public.offers;
CREATE TRIGGER offers_enforce_rules
  BEFORE INSERT OR UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.offers_enforce_rules();

-- Cada oferta creada se apunta (aunque luego se borre la oferta, el apunte queda)
CREATE OR REPLACE FUNCTION public.offers_log_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.offer_publications (business_id, created_at) VALUES (NEW.business_id, NEW.created_at);
  DELETE FROM public.offer_publications WHERE created_at < now() - interval '30 days';
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.offers_log_publication() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS offers_log_publication ON public.offers;
CREATE TRIGGER offers_log_publication
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.offers_log_publication();

COMMIT;

-- Comprobación: ofertas apuntadas de los últimos 7 días por negocio
SELECT b.name AS negocio, count(p.*) AS ofertas_ultimos_7_dias, max(p.created_at) AS ultima
  FROM public.offer_publications p JOIN public.businesses b ON b.id = p.business_id
 WHERE p.created_at > now() - interval '7 days'
 GROUP BY b.name ORDER BY b.name;
