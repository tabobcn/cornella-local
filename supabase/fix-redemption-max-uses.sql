-- =============================================
-- FIX: get_or_create_redemption verifica max_uses
-- Sin este fix, se puede obtener código aunque la oferta esté agotada
-- =============================================

CREATE OR REPLACE FUNCTION get_or_create_redemption(
  p_offer_id UUID,
  p_user_id UUID,
  p_business_id INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_redemption offer_redemptions%ROWTYPE;
  v_code TEXT;
  v_offer RECORD;
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

  -- Verificar límite de usos (max_uses) — protege contra race conditions
  SELECT max_uses, redemption_count INTO v_offer
  FROM offers WHERE id = p_offer_id;

  IF v_offer.max_uses IS NOT NULL AND COALESCE(v_offer.redemption_count, 0) >= v_offer.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'max_uses_reached');
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

DO $$ BEGIN
  RAISE NOTICE 'get_or_create_redemption actualizado: ahora verifica max_uses antes de crear código';
END $$;
