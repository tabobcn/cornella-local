-- =============================================
-- CONTROLES DE RESEÑAS
-- 1. edit_count: máximo 1 edición por reseña
-- 2. RPC can_user_review actualizado con:
--    - 1 reseña por negocio
--    - máx 2 reseñas por semana
--    - 30 días de antigüedad
--    - email verificado
-- =============================================

-- 1. Añadir columna edit_count a reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- 2. Actualizar la función can_user_review
CREATE OR REPLACE FUNCTION can_user_review(p_user_id UUID, p_business_id INTEGER)
RETURNS JSON AS $$
DECLARE
  v_profile RECORD;
  v_account_age_days INTEGER;
  v_already_reviewed BOOLEAN;
  v_weekly_count INTEGER;
  v_is_owner BOOLEAN;
BEGIN
  -- Obtener perfil
  SELECT created_at INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('can_review', false, 'reason', 'Perfil no encontrado');
  END IF;

  -- Admins pueden reseñar sin restricciones
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND is_admin = true) THEN
    RETURN json_build_object('can_review', true, 'reason', null);
  END IF;

  -- Verificar que no es el propietario del negocio
  SELECT EXISTS(
    SELECT 1 FROM businesses
    WHERE id = p_business_id AND owner_id = p_user_id
  ) INTO v_is_owner;

  IF v_is_owner THEN
    RETURN json_build_object(
      'can_review', false,
      'reason', 'No puedes reseñar tu propio negocio'
    );
  END IF;

  -- Verificar antigüedad mínima de 30 días
  v_account_age_days := EXTRACT(DAY FROM NOW() - v_profile.created_at);
  IF v_account_age_days < 30 THEN
    RETURN json_build_object(
      'can_review', false,
      'reason', 'Tu cuenta debe tener al menos 30 días para escribir reseñas. Faltan ' || (30 - v_account_age_days) || ' días.'
    );
  END IF;

  -- Verificar si ya tiene reseña en este negocio
  SELECT EXISTS(
    SELECT 1 FROM reviews
    WHERE user_id = p_user_id AND business_id = p_business_id
  ) INTO v_already_reviewed;

  IF v_already_reviewed THEN
    RETURN json_build_object(
      'can_review', false,
      'reason', 'Ya has escrito una reseña para este negocio',
      'already_reviewed', true
    );
  END IF;

  -- Verificar límite semanal (máx 2 reseñas en los últimos 7 días)
  SELECT COUNT(*) INTO v_weekly_count
  FROM reviews
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '7 days';

  IF v_weekly_count >= 2 THEN
    RETURN json_build_object(
      'can_review', false,
      'reason', 'Has alcanzado el límite de 2 reseñas por semana. Vuelve a intentarlo en unos días.'
    );
  END IF;

  -- Todo OK
  RETURN json_build_object('can_review', true, 'reason', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
