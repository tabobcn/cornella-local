-- =============================================
-- LÍMITE DE USOS EN OFERTAS
-- Añade max_uses a offers y actualiza RPCs
-- =============================================

-- 1. Añadir columna max_uses (null = ilimitado)
ALTER TABLE offers ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT NULL;

-- 2. Actualizar RPC get_or_create_redemption para verificar límite
CREATE OR REPLACE FUNCTION get_or_create_redemption(
  p_offer_id UUID,
  p_user_id UUID,
  p_business_id INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_redemption offer_redemptions%ROWTYPE;
  v_offer RECORD;
  v_code TEXT;
BEGIN
  -- Verificar si el usuario ya tiene un código (siempre se le muestra el suyo)
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

  -- Verificar si la oferta ha alcanzado el límite de usos
  SELECT max_uses, redemption_count INTO v_offer FROM offers WHERE id = p_offer_id;
  IF v_offer.max_uses IS NOT NULL AND COALESCE(v_offer.redemption_count, 0) >= v_offer.max_uses THEN
    RETURN json_build_object('error', 'Esta oferta ha alcanzado el límite de usos.');
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

-- 3. Actualizar RPC validate_redemption_code para verificar límite
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
  SELECT * INTO v_redemption
  FROM offer_redemptions
  WHERE code = UPPER(TRIM(p_code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Código no encontrado. Revisa que está bien escrito.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = v_redemption.business_id AND owner_id = p_owner_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Este código no pertenece a tu negocio.');
  END IF;

  IF v_redemption.status = 'validated' THEN
    RETURN json_build_object('success', false, 'error', 'Este código ya fue utilizado anteriormente.');
  END IF;

  IF v_redemption.status = 'expired' THEN
    RETURN json_build_object('success', false, 'error', 'Este código ha expirado.');
  END IF;

  -- Obtener datos de la oferta
  SELECT title, discount_label, discount_value, max_uses, redemption_count INTO v_offer
  FROM offers WHERE id = v_redemption.offer_id;

  -- Verificar límite (por si acaso)
  IF v_offer.max_uses IS NOT NULL AND COALESCE(v_offer.redemption_count, 0) >= v_offer.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Esta oferta ha alcanzado el límite de usos.');
  END IF;

  SELECT full_name INTO v_user FROM profiles WHERE id = v_redemption.user_id;

  UPDATE offer_redemptions
  SET status = 'validated', validated_at = NOW(), validated_by = p_owner_id
  WHERE id = v_redemption.id;

  UPDATE offers
  SET redemption_count = COALESCE(redemption_count, 0) + 1
  WHERE id = v_redemption.offer_id;

  RETURN json_build_object(
    'success', true,
    'user_name', COALESCE(v_user.full_name, 'Cliente'),
    'offer_title', v_offer.title,
    'discount', COALESCE(v_offer.discount_label, v_offer.discount_value::TEXT || '%'),
    'redemption_count', COALESCE(v_offer.redemption_count, 0) + 1,
    'max_uses', v_offer.max_uses
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
