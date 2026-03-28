-- =============================================
-- SISTEMA DE FUEGOS EN OFERTAS (🔥)
-- 1 fuego por usuario por oferta
-- Las 3 ofertas con más fuegos aparecen como Destacadas
-- =============================================

-- 1. Añadir fire_count a offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS fire_count INTEGER DEFAULT 0;

-- 2. Tabla de fuegos
CREATE TABLE IF NOT EXISTS offer_fires (
  id SERIAL PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(offer_id, user_id)
);

ALTER TABLE offer_fires ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver los fuegos (para mostrar contadores)
CREATE POLICY "Anyone can read offer fires"
  ON offer_fires FOR SELECT USING (true);

-- Solo el propio usuario puede crear su fuego
CREATE POLICY "Users can insert own fires"
  ON offer_fires FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Solo el propio usuario puede quitar su fuego
CREATE POLICY "Users can delete own fires"
  ON offer_fires FOR DELETE USING (auth.uid() = user_id);

-- 3. RPC: toggle fuego (añadir o quitar)
CREATE OR REPLACE FUNCTION toggle_offer_fire(p_offer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
  v_new_count INTEGER;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM offer_fires WHERE offer_id = p_offer_id AND user_id = v_user_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Quitar fuego
    DELETE FROM offer_fires WHERE offer_id = p_offer_id AND user_id = v_user_id;
    UPDATE offers SET fire_count = GREATEST(0, COALESCE(fire_count, 0) - 1)
      WHERE id = p_offer_id RETURNING fire_count INTO v_new_count;
    RETURN json_build_object('fired', false, 'fire_count', v_new_count);
  ELSE
    -- Añadir fuego
    INSERT INTO offer_fires (offer_id, user_id) VALUES (p_offer_id, v_user_id);
    UPDATE offers SET fire_count = COALESCE(fire_count, 0) + 1
      WHERE id = p_offer_id RETURNING fire_count INTO v_new_count;
    RETURN json_build_object('fired', true, 'fire_count', v_new_count);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_offer_fires_offer ON offer_fires(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_fires_user ON offer_fires(user_id);

DO $$ BEGIN
  RAISE NOTICE 'Sistema de fuegos creado: tabla offer_fires + fire_count en offers + RPC toggle_offer_fire';
END $$;
