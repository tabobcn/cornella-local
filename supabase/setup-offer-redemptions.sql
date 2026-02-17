-- =============================================
-- SISTEMA DE REDENCIÓN DE OFERTAS
-- Código único por usuario+oferta
-- Propietario valida desde su panel
-- =============================================

-- 1. Añadir redemption_count a offers (si no existe)
ALTER TABLE offers ADD COLUMN IF NOT EXISTS redemption_count INTEGER DEFAULT 0;

-- 2. Tabla de redenciones
CREATE TABLE IF NOT EXISTS offer_redemptions (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, validated, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES profiles(id),
  UNIQUE(offer_id, user_id) -- 1 código por usuario por oferta
);

-- 3. RLS
ALTER TABLE offer_redemptions ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden crear y ver sus propios códigos
CREATE POLICY "Users can create own redemptions"
  ON offer_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own redemptions"
  ON offer_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- Propietarios pueden ver y validar códigos de sus ofertas
CREATE POLICY "Owners can read their offer redemptions"
  ON offer_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = offer_redemptions.business_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can validate redemptions"
  ON offer_redemptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = offer_redemptions.business_id AND owner_id = auth.uid()
    )
  );

-- 4. Función para generar código único
CREATE OR REPLACE FUNCTION generate_redemption_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Genera código tipo CL-A7X3 (letras y números, sin 0, O, I, 1 para evitar confusión)
    v_code := 'CL-' || UPPER(
      CHR(65 + (RANDOM() * 25)::INT) ||
      CHR(50 + (RANDOM() * 7)::INT) ||
      CHR(65 + (RANDOM() * 25)::INT) ||
      CHR(50 + (RANDOM() * 7)::INT)
    );
    SELECT EXISTS(SELECT 1 FROM offer_redemptions WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 5. RPC: Obtener o crear código de redención (llamado por el usuario)
CREATE OR REPLACE FUNCTION get_or_create_redemption(
  p_offer_id INTEGER,
  p_user_id UUID,
  p_business_id INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_redemption offer_redemptions%ROWTYPE;
  v_code TEXT;
BEGIN
  -- Verificar si ya tiene código
  SELECT * INTO v_redemption
  FROM offer_redemptions
  WHERE offer_id = p_offer_id AND user_id = p_user_id;

  IF FOUND THEN
    RETURN json_build_object(
      'code', v_redemption.code,
      'status', v_redemption.status,
      'created_at', v_redemption.created_at
    );
  END IF;

  -- Generar nuevo código
  v_code := generate_redemption_code();

  INSERT INTO offer_redemptions (offer_id, user_id, business_id, code, status)
  VALUES (p_offer_id, p_user_id, p_business_id, v_code, 'pending')
  RETURNING * INTO v_redemption;

  RETURN json_build_object(
    'code', v_redemption.code,
    'status', v_redemption.status,
    'created_at', v_redemption.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Validar código (llamado por el propietario)
CREATE OR REPLACE FUNCTION validate_redemption_code(
  p_code TEXT,
  p_owner_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_redemption offer_redemptions%ROWTYPE;
  v_offer RECORD;
  v_user RECORD;
BEGIN
  -- Buscar el código (case-insensitive)
  SELECT * INTO v_redemption
  FROM offer_redemptions
  WHERE code = UPPER(TRIM(p_code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Código no encontrado. Revisa que está bien escrito.');
  END IF;

  -- Verificar que el negocio pertenece al propietario
  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = v_redemption.business_id AND owner_id = p_owner_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Este código no pertenece a tu negocio.');
  END IF;

  -- Verificar estado
  IF v_redemption.status = 'validated' THEN
    RETURN json_build_object('success', false, 'error', 'Este código ya fue utilizado anteriormente.');
  END IF;

  IF v_redemption.status = 'expired' THEN
    RETURN json_build_object('success', false, 'error', 'Este código ha expirado.');
  END IF;

  -- Obtener datos de la oferta
  SELECT title, discount_label, discount_value INTO v_offer
  FROM offers WHERE id = v_redemption.offer_id;

  -- Obtener nombre del usuario
  SELECT full_name INTO v_user
  FROM profiles WHERE id = v_redemption.user_id;

  -- Marcar como validado
  UPDATE offer_redemptions
  SET status = 'validated', validated_at = NOW(), validated_by = p_owner_id
  WHERE id = v_redemption.id;

  -- Incrementar contador de redenciones en la oferta
  UPDATE offers
  SET redemption_count = COALESCE(redemption_count, 0) + 1
  WHERE id = v_redemption.offer_id;

  RETURN json_build_object(
    'success', true,
    'user_name', COALESCE(v_user.full_name, 'Cliente'),
    'offer_title', v_offer.title,
    'discount', COALESCE(v_offer.discount_label, v_offer.discount_value::TEXT || '%')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Índices
CREATE INDEX IF NOT EXISTS idx_redemptions_offer ON offer_redemptions(offer_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON offer_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_business ON offer_redemptions(business_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_code ON offer_redemptions(code);
