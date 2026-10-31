-- ============================================================================
-- 2026-10-31: las páginas públicas de los negocios (SEO) se actualizan solas
-- ----------------------------------------------------------------------------
-- Las páginas /negocio/... y el sitemap se generan al desplegar la web. Antes, un negocio
-- borrado seguía publicado (y uno nuevo no aparecía en Google) hasta el siguiente despliegue.
-- Ahora:
--  1) Cuando cambia algo que sale en esas páginas (alta, baja, nombre, fotos, valoración...),
--     se apunta que la web "tiene cambios".
--  2) Cada noche a las 03:47 UTC, si hay cambios, la base de datos pide a Vercel que vuelva
--     a desplegar la web (Deploy Hook). Si no hay cambios, no hace nada.
--
-- ANTES DE EJECUTAR: crea el Deploy Hook en Vercel → proyecto cornella-local → Settings →
-- Git → Deploy Hooks → nombre "actualizar-negocios", rama "main" → Create Hook, copia la URL
-- y pégala abajo en lugar de PEGA_AQUI_LA_URL_DEL_DEPLOY_HOOK (entre las comillas).
-- La URL se guarda cifrada en el Vault (no queda en ninguna tabla).
-- Se puede ejecutar más de una vez (si cambias la URL, se actualiza).
-- ============================================================================

-- 0) Guardar la URL del Deploy Hook en el Vault
DO $$
DECLARE
  v_url text := 'PEGA_AQUI_LA_URL_DEL_DEPLOY_HOOK';
  v_id uuid;
BEGIN
  IF v_url NOT LIKE 'https://api.vercel.com/%' THEN
    RAISE EXCEPTION 'Pega la URL del Deploy Hook de Vercel (empieza por https://api.vercel.com/) en v_url';
  END IF;
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'vercel_deploy_hook';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(v_url, 'vercel_deploy_hook', 'Deploy Hook de Vercel para regenerar las páginas de negocios');
  ELSE
    PERFORM vault.update_secret(v_id, v_url);
  END IF;
END $$;

BEGIN;

-- 1) Estado: ¿hay cambios pendientes de publicar en la web?
CREATE TABLE IF NOT EXISTS public.site_rebuild_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dirty boolean NOT NULL DEFAULT false,
  marked_at timestamptz,
  last_requested_at timestamptz
);
INSERT INTO public.site_rebuild_state (id, dirty) VALUES (1, true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.site_rebuild_state ENABLE ROW LEVEL SECURITY;   -- sin políticas: nadie desde la app
REVOKE ALL ON public.site_rebuild_state FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_site_dirty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  -- Solo importan los negocios que están o estaban publicados (un borrador no sale en la web)
  IF (TG_OP = 'DELETE' AND OLD.is_published AND OLD.verification_status = 'approved')
     OR (TG_OP = 'UPDATE' AND ((OLD.is_published AND OLD.verification_status = 'approved')
                               OR (NEW.is_published AND NEW.verification_status = 'approved'))) THEN
    UPDATE public.site_rebuild_state SET dirty = true, marked_at = now() WHERE id = 1;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_site_dirty() FROM PUBLIC, anon, authenticated;

-- Las columnas que usan las páginas (scripts/prerender-negocios.mjs) + las que publican o retiran
DROP TRIGGER IF EXISTS businesses_mark_site_dirty ON public.businesses;
CREATE TRIGGER businesses_mark_site_dirty
  AFTER UPDATE OF name, slug, description, subcategory, neighborhood, cover_photo, images, rating, review_count,
                  category_id, is_published, verification_status
  ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.mark_site_dirty();

DROP TRIGGER IF EXISTS businesses_mark_site_dirty_delete ON public.businesses;
CREATE TRIGGER businesses_mark_site_dirty_delete
  AFTER DELETE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.mark_site_dirty();

-- 2) Pedir el despliegue si hay cambios
CREATE OR REPLACE FUNCTION public.run_site_rebuild()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text;
BEGIN
  IF NOT (SELECT dirty FROM public.site_rebuild_state WHERE id = 1) THEN
    RETURN 'sin cambios';
  END IF;
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vercel_deploy_hook' LIMIT 1;
  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'Falta el secreto vercel_deploy_hook en Vault';
    RETURN 'falta la URL del Deploy Hook';
  END IF;
  PERFORM net.http_post(url := v_url, body := '{}'::jsonb, timeout_milliseconds := 30000);
  UPDATE public.site_rebuild_state SET dirty = false, last_requested_at = now() WHERE id = 1;
  RETURN 'despliegue pedido';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_site_rebuild() FROM PUBLIC, anon, authenticated;

COMMIT;

-- 3) Cada noche a las 03:47 UTC (después de la limpieza de las 03:17)
SELECT cron.schedule('reconstruir-web', '47 3 * * *', $$SELECT public.run_site_rebuild();$$);

-- Comprobación
SELECT jobname, schedule, active FROM cron.job WHERE jobname IN ('limpieza-privacidad', 'reconstruir-web') ORDER BY jobname;
