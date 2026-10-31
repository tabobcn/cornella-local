-- ============================================================================
-- RENDIMIENTO 2026-10-30 (avisos del Performance Advisor de Supabase)
-- ----------------------------------------------------------------------------
-- 1) auth_rls_initplan: las políticas RLS llamaban a auth.uid() / is_admin()
--    por CADA fila. Envueltas en (select ...) se calculan una vez por consulta.
--    La lógica de cada política NO cambia: solo cuándo se evalúa la función.
--    Se reescriben automáticamente (public y storage) y es idempotente.
-- 2) Índices para las 6 claves foráneas sin índice (sobre todo businesses.owner_id,
--    que se usa en casi todas las políticas y pantallas de propietario).
-- 3) Políticas EXACTAMENTE duplicadas (misma tabla, acción, roles y condición):
--    se deja una. No se tocan las que solo se parecen.
-- Los "índices sin usar" del asesor NO se borran: con tan pocos datos es normal.
-- ============================================================================
BEGIN;

-- 2) Índices de claves foráneas
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id            ON public.businesses (owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_verified_by         ON public.businesses (verified_by);
CREATE INDEX IF NOT EXISTS idx_budget_responses_business_id   ON public.budget_responses (business_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id           ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_validated_by ON public.offer_redemptions (validated_by);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by            ON public.reports (reviewed_by);

-- 3) Duplicados exactos
DO $$
DECLARE
  d record;
BEGIN
  FOR d IN
    SELECT schemaname, tablename, policyname
      FROM (
        SELECT p.*, row_number() OVER (
                 PARTITION BY schemaname, tablename, cmd, permissive, roles, COALESCE(qual, ''), COALESCE(with_check, '')
                 ORDER BY policyname) AS rn
          FROM pg_policies p
         WHERE schemaname = 'public'
      ) x
     WHERE rn > 1
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', d.policyname, d.schemaname, d.tablename);
    RAISE NOTICE 'Duplicada eliminada: %.% "%"', d.schemaname, d.tablename, d.policyname;
  END LOOP;
END $$;

-- 1) auth.uid() / auth.role() / auth.jwt() / is_admin() evaluados una sola vez
DO $$
DECLARE
  p record;
  v_using text;
  v_check text;
  v_sql text;
  n_ok int := 0;
  n_err int := 0;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies
     WHERE schemaname IN ('public', 'storage')
       AND (COALESCE(qual, '') || ' ' || COALESCE(with_check, ''))
           ~ '(?<!SELECT )(\mauth\.(uid|role|jwt)\(\)|\m(public\.)?is_admin\(\))'
  LOOP
    v_using := p.qual;
    v_check := p.with_check;
    IF v_using IS NOT NULL THEN
      v_using := regexp_replace(v_using, '(?<!SELECT )\mauth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g');
      v_using := regexp_replace(v_using, '(?<!SELECT )\m(public\.)?is_admin\(\)', '(select public.is_admin())', 'g');
    END IF;
    IF v_check IS NOT NULL THEN
      v_check := regexp_replace(v_check, '(?<!SELECT )\mauth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g');
      v_check := regexp_replace(v_check, '(?<!SELECT )\m(public\.)?is_admin\(\)', '(select public.is_admin())', 'g');
    END IF;

    v_sql := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF v_using IS NOT NULL THEN v_sql := v_sql || ' USING (' || v_using || ')'; END IF;
    IF v_check IS NOT NULL THEN v_sql := v_sql || ' WITH CHECK (' || v_check || ')'; END IF;

    BEGIN
      EXECUTE v_sql;
      n_ok := n_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      n_err := n_err + 1;
      RAISE WARNING 'No se pudo optimizar %.% "%": %', p.schemaname, p.tablename, p.policyname, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Políticas optimizadas: %, con error (sin cambios): %', n_ok, n_err;
END $$;

COMMIT;

-- Comprobación: políticas que aún evalúan auth.*() / is_admin() por fila (debería salir 0)
SELECT count(*) AS politicas_sin_optimizar
  FROM pg_policies
 WHERE schemaname IN ('public', 'storage')
   AND (COALESCE(qual, '') || ' ' || COALESCE(with_check, ''))
       ~ '(?<!SELECT )(\mauth\.(uid|role|jwt)\(\)|\m(public\.)?is_admin\(\))';
