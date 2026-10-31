-- ============================================================================
-- 2026-10-31: permiso para anunciar el negocio en @cornella_informa
-- ----------------------------------------------------------------------------
-- instagram_consent   → el negocio acepta que se le anuncie (casilla en el alta)
-- instagram_format    → 'post' (publicación), 'story' (historia) o 'both'
-- instagram_posted_at → cuándo se publicó (lo marca n8n con la clave de servicio
--                       o un admin; el propietario no puede tocarlo)
-- La app solo muestra la casilla cuando estas columnas existen.
-- ============================================================================
BEGIN;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS instagram_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_format text,
  ADD COLUMN IF NOT EXISTS instagram_posted_at timestamptz;

ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_instagram_format_check;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_instagram_format_check
  CHECK (instagram_format IS NULL OR instagram_format IN ('post', 'story', 'both'));

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

-- Comprobación
SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name LIKE 'instagram_%'
 ORDER BY column_name;
