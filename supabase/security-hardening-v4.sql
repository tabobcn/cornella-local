-- ============================================================================
-- SECURITY HARDENING v4 — CornellaLocal (2026-10-30)
-- PARTE A: se puede ejecutar YA (no rompe la versión publicada)
-- PARTE B: ejecutar DESPUÉS de publicar la versión nueva del código
-- ============================================================================

-- ============================== PARTE A =====================================
BEGIN;

-- A1) Teléfono del cliente de un presupuesto: solo para él mismo o para el
--     negocio cuyo presupuesto ha aceptado
CREATE OR REPLACE FUNCTION public.get_budget_request_contact(p_request_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT br.phone
    FROM public.budget_requests br
   WHERE br.id = p_request_id
     AND (br.user_id = auth.uid()
          OR EXISTS (SELECT 1
                       FROM public.budget_quotes bq
                       JOIN public.businesses b ON b.id = bq.business_id
                      WHERE bq.budget_request_id = br.id
                        AND bq.status = 'accepted'
                        AND b.owner_id = auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.get_budget_request_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_budget_request_contact(uuid) TO authenticated;

-- A2) Reseñas: las reglas (30 días, 1 por negocio, 2 por semana, no al propio
--     negocio, editar solo 1 vez) se cumplen también en la base de datos.
--     El propietario del negocio solo puede responder, no cambiar nota ni texto.
CREATE OR REPLACE FUNCTION public.reviews_enforce_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_check json;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_uid IS NULL OR NEW.user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'No autorizado';
    END IF;
    v_check := public.can_user_review(v_uid, NEW.business_id);
    IF NOT COALESCE((v_check->>'can_review')::boolean, false) THEN
      RAISE EXCEPTION '%', COALESCE(v_check->>'reason', 'No puedes publicar esta reseña');
    END IF;
    IF NEW.rating IS NULL OR NEW.rating < 1 OR NEW.rating > 5 THEN
      RAISE EXCEPTION 'La valoración debe estar entre 1 y 5';
    END IF;
    NEW.edit_count := 0;
    NEW.owner_response := NULL;
    NEW.owner_response_at := NULL;
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.business_id := OLD.business_id;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;

  IF v_uid = OLD.user_id THEN
    IF NEW.comment IS DISTINCT FROM OLD.comment OR NEW.rating IS DISTINCT FROM OLD.rating THEN
      IF COALESCE(OLD.edit_count, 0) >= 1 THEN
        RAISE EXCEPTION 'Solo puedes editar tu reseña una vez';
      END IF;
      IF NEW.rating IS NULL OR NEW.rating < 1 OR NEW.rating > 5 THEN
        RAISE EXCEPTION 'La valoración debe estar entre 1 y 5';
      END IF;
      NEW.edit_count := COALESCE(OLD.edit_count, 0) + 1;
    ELSE
      NEW.edit_count := OLD.edit_count;
    END IF;
    NEW.owner_response := OLD.owner_response;
    NEW.owner_response_at := OLD.owner_response_at;
  ELSE
    -- Propietario del negocio: solo la respuesta
    NEW.rating := OLD.rating;
    NEW.comment := OLD.comment;
    NEW.edit_count := OLD.edit_count;
    IF NEW.owner_response IS DISTINCT FROM OLD.owner_response THEN
      NEW.owner_response_at := now();
    ELSE
      NEW.owner_response_at := OLD.owner_response_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reviews_enforce_rules() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS reviews_enforce_rules ON public.reviews;
CREATE TRIGGER reviews_enforce_rules
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_enforce_rules();

-- A3) Cotizaciones: el cliente solo puede cambiar el estado; el negocio no
--     puede marcarse como aceptado ni mover la cotización a otra solicitud
CREATE OR REPLACE FUNCTION public.budget_quotes_protect()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    RETURN NEW;
  END IF;
  NEW.id := OLD.id;
  NEW.budget_request_id := OLD.budget_request_id;
  NEW.business_id := OLD.business_id;
  NEW.created_at := OLD.created_at;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE id = OLD.business_id AND owner_id = auth.uid()) THEN
    NEW.status := OLD.status;
  ELSE
    NEW.price := OLD.price;
    NEW.description := OLD.description;
    NEW.estimated_duration := OLD.estimated_duration;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.budget_quotes_protect() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS budget_quotes_protect ON public.budget_quotes;
CREATE TRIGGER budget_quotes_protect
  BEFORE INSERT OR UPDATE ON public.budget_quotes
  FOR EACH ROW EXECUTE FUNCTION public.budget_quotes_protect();

COMMIT;

-- ============================== PARTE B =====================================
-- ⚠️ Solo DESPUÉS de publicar la versión nueva de la web: la versión antigua
-- pide todas las columnas de budget_requests y dejaría de cargar presupuestos.
-- Oculta el teléfono del cliente a los negocios a nivel de base de datos.
--
-- BEGIN;
-- REVOKE SELECT ON public.budget_requests FROM anon, authenticated;
-- GRANT SELECT (id, user_id, category, description, photos, urgency, address, status, created_at, updated_at)
--   ON public.budget_requests TO authenticated;
-- COMMIT;
