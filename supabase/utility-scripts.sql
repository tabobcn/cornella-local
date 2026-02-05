-- =============================================
-- SCRIPTS DE UTILIDAD PARA GESTIÓN DIARIA
-- =============================================
-- Colección de queries útiles para administración
-- =============================================

-- =============================================
-- GESTIÓN DE NEGOCIOS
-- =============================================

-- Ver negocios pendientes de aprobación
SELECT
  id,
  name,
  subcategory,
  owner_id,
  email,
  phone,
  created_at,
  verification_status
FROM businesses
WHERE verification_status = 'pending'
ORDER BY created_at DESC;

-- Aprobar un negocio específico
-- UPDATE businesses SET verification_status = 'approved' WHERE id = X;

-- Aprobar TODOS los negocios pendientes (usar con cuidado)
-- UPDATE businesses SET verification_status = 'approved' WHERE verification_status = 'pending';

-- Aprobar negocios creados en las últimas 24 horas
-- UPDATE businesses
-- SET verification_status = 'approved'
-- WHERE verification_status = 'pending'
--   AND created_at > NOW() - INTERVAL '24 hours';

-- Rechazar un negocio con motivo (añadir columna rejection_reason si no existe)
-- UPDATE businesses
-- SET verification_status = 'rejected'
-- WHERE id = X;

-- Ver estadísticas de negocios
SELECT
  verification_status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_week,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_month
FROM businesses
GROUP BY verification_status;


-- =============================================
-- GESTIÓN DE USUARIOS
-- =============================================

-- Ver usuarios registrados recientemente
SELECT
  id,
  email,
  full_name,
  created_at,
  EXTRACT(DAY FROM NOW() - created_at) as days_since_registration
FROM profiles
ORDER BY created_at DESC
LIMIT 20;

-- Ver usuarios más activos (con más candidaturas)
SELECT
  p.id,
  p.email,
  p.full_name,
  COUNT(ja.id) as total_applications
FROM profiles p
LEFT JOIN job_applications ja ON p.id = ja.user_id
GROUP BY p.id, p.email, p.full_name
ORDER BY total_applications DESC
LIMIT 20;

-- Ver usuarios con negocios
SELECT
  p.id,
  p.email,
  p.full_name,
  b.id as business_id,
  b.name as business_name,
  b.verification_status
FROM profiles p
INNER JOIN businesses b ON p.id = b.owner_id
ORDER BY p.created_at DESC;


-- =============================================
-- GESTIÓN DE CANDIDATURAS
-- =============================================

-- Ver candidaturas recientes
SELECT
  ja.id,
  ja.full_name as candidate_name,
  ja.email as candidate_email,
  j.title as job_title,
  b.name as business_name,
  ja.status,
  ja.created_at
FROM job_applications ja
JOIN jobs j ON ja.job_id = j.id
JOIN businesses b ON j.business_id = b.id
ORDER BY ja.created_at DESC
LIMIT 50;

-- Ver candidaturas pendientes por negocio
SELECT
  b.name as business_name,
  j.title as job_title,
  COUNT(*) FILTER (WHERE ja.status = 'pending') as pending,
  COUNT(*) FILTER (WHERE ja.status = 'reviewed') as reviewed,
  COUNT(*) FILTER (WHERE ja.status = 'shortlisted') as shortlisted,
  COUNT(*) FILTER (WHERE ja.status = 'hired') as hired,
  COUNT(*) FILTER (WHERE ja.status = 'rejected') as rejected
FROM businesses b
JOIN jobs j ON b.id = j.business_id
LEFT JOIN job_applications ja ON j.id = ja.job_id
GROUP BY b.id, b.name, j.id, j.title
HAVING COUNT(ja.id) > 0
ORDER BY pending DESC;


-- =============================================
-- GESTIÓN DE PRESUPUESTOS
-- =============================================

-- Ver solicitudes de presupuesto recientes
SELECT
  br.id,
  br.subcategory,
  br.description,
  br.urgency,
  p.email as user_email,
  br.status,
  COUNT(bq.id) as total_quotes,
  br.created_at
FROM budget_requests br
JOIN profiles p ON br.user_id = p.id
LEFT JOIN budget_quotes bq ON br.id = bq.request_id
GROUP BY br.id, br.subcategory, br.description, br.urgency, p.email, br.status, br.created_at
ORDER BY br.created_at DESC
LIMIT 50;

-- Ver tasa de respuesta de presupuestos
SELECT
  subcategory,
  COUNT(*) as total_requests,
  COUNT(DISTINCT CASE WHEN status = 'replied' THEN id END) as with_quotes,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN status = 'replied' THEN id END) / COUNT(*), 2) as response_rate_percent
FROM budget_requests
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY subcategory
ORDER BY response_rate_percent DESC;


-- =============================================
-- ESTADÍSTICAS GENERALES
-- =============================================

-- Dashboard general
SELECT
  'Usuarios totales' as metric,
  COUNT(*)::TEXT as value
FROM profiles
UNION ALL
SELECT
  'Negocios aprobados',
  COUNT(*)::TEXT
FROM businesses WHERE verification_status = 'approved'
UNION ALL
SELECT
  'Negocios pendientes',
  COUNT(*)::TEXT
FROM businesses WHERE verification_status = 'pending'
UNION ALL
SELECT
  'Ofertas activas',
  COUNT(*)::TEXT
FROM offers WHERE status = 'active' AND is_visible = true
UNION ALL
SELECT
  'Empleos activos',
  COUNT(*)::TEXT
FROM jobs WHERE status = 'active'
UNION ALL
SELECT
  'Candidaturas totales',
  COUNT(*)::TEXT
FROM job_applications
UNION ALL
SELECT
  'Presupuestos solicitados',
  COUNT(*)::TEXT
FROM budget_requests
UNION ALL
SELECT
  'Push subscriptions activas',
  COUNT(*)::TEXT
FROM push_subscriptions WHERE is_active = true;


-- =============================================
-- LIMPIEZA Y MANTENIMIENTO
-- =============================================

-- Limpiar push subscriptions inactivas (>30 días)
-- SELECT cleanup_old_push_subscriptions();

-- Limpiar ofertas expiradas (cambiar a inactive)
-- UPDATE offers
-- SET status = 'inactive'
-- WHERE expires_at < NOW()
--   AND status = 'active';

-- Ver ofertas que expiran pronto (próximos 7 días)
SELECT
  o.id,
  o.title,
  b.name as business_name,
  o.expires_at,
  EXTRACT(DAY FROM o.expires_at - NOW()) as days_until_expiry
FROM offers o
JOIN businesses b ON o.business_id = b.id
WHERE o.expires_at > NOW()
  AND o.expires_at < NOW() + INTERVAL '7 days'
  AND o.status = 'active'
ORDER BY o.expires_at ASC;


-- =============================================
-- ANALYTICS RÁPIDOS
-- =============================================

-- Negocios más vistos (últimos 30 días)
SELECT
  b.id,
  b.name,
  b.subcategory,
  b.view_count,
  b.click_count,
  ROUND(100.0 * b.click_count / NULLIF(b.view_count, 0), 2) as ctr_percent
FROM businesses b
WHERE b.view_count > 0
ORDER BY b.view_count DESC
LIMIT 20;

-- Ofertas más vistas
SELECT
  o.id,
  o.title,
  b.name as business_name,
  o.view_count,
  o.created_at
FROM offers o
JOIN businesses b ON o.business_id = b.id
WHERE o.view_count > 0
ORDER BY o.view_count DESC
LIMIT 20;

-- Empleos con más candidaturas
SELECT
  j.id,
  j.title,
  b.name as business_name,
  j.view_count,
  COUNT(ja.id) as total_applications,
  ROUND(100.0 * COUNT(ja.id) / NULLIF(j.view_count, 0), 2) as conversion_rate
FROM jobs j
JOIN businesses b ON j.business_id = b.id
LEFT JOIN job_applications ja ON j.id = ja.job_id
GROUP BY j.id, j.title, b.name, j.view_count
HAVING COUNT(ja.id) > 0
ORDER BY total_applications DESC
LIMIT 20;


-- =============================================
-- FUNCIONES ÚTILES
-- =============================================

-- Función para aprobar negocios en lote
CREATE OR REPLACE FUNCTION approve_pending_businesses(days_old INTEGER DEFAULT 1)
RETURNS TABLE(approved_count INTEGER) AS $$
DECLARE
  count INTEGER;
BEGIN
  UPDATE businesses
  SET verification_status = 'approved'
  WHERE verification_status = 'pending'
    AND created_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uso: SELECT * FROM approve_pending_businesses(1); -- Aprobar negocios de hace 1+ días


-- Función para obtener estadísticas de un negocio
CREATE OR REPLACE FUNCTION get_business_stats(business_id_param INTEGER)
RETURNS TABLE(
  metric TEXT,
  value TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Vistas totales' as metric,
    COALESCE(view_count, 0)::TEXT as value
  FROM businesses WHERE id = business_id_param
  UNION ALL
  SELECT
    'Clics totales',
    COALESCE(click_count, 0)::TEXT
  FROM businesses WHERE id = business_id_param
  UNION ALL
  SELECT
    'Ofertas publicadas',
    COUNT(*)::TEXT
  FROM offers WHERE business_id = business_id_param
  UNION ALL
  SELECT
    'Empleos publicados',
    COUNT(*)::TEXT
  FROM jobs WHERE business_id = business_id_param
  UNION ALL
  SELECT
    'Candidaturas recibidas',
    COUNT(DISTINCT ja.id)::TEXT
  FROM jobs j
  LEFT JOIN job_applications ja ON j.id = ja.job_id
  WHERE j.business_id = business_id_param
  UNION ALL
  SELECT
    'Presupuestos respondidos',
    COUNT(*)::TEXT
  FROM budget_quotes WHERE business_id = business_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uso: SELECT * FROM get_business_stats(14); -- Stats del negocio ID 14


-- =============================================
-- VERIFICACIONES DE SALUD
-- =============================================

-- Verificar integridad de datos
SELECT
  'Negocios sin propietario' as issue,
  COUNT(*)::TEXT as count
FROM businesses WHERE owner_id IS NULL
UNION ALL
SELECT
  'Empleos de negocios no aprobados',
  COUNT(*)::TEXT
FROM jobs j
JOIN businesses b ON j.business_id = b.id
WHERE b.verification_status != 'approved'
UNION ALL
SELECT
  'Ofertas de negocios no aprobados',
  COUNT(*)::TEXT
FROM offers o
JOIN businesses b ON o.business_id = b.id
WHERE b.verification_status != 'approved'
UNION ALL
SELECT
  'Candidaturas a empleos inactivos',
  COUNT(*)::TEXT
FROM job_applications ja
JOIN jobs j ON ja.job_id = j.id
WHERE j.status != 'active'
UNION ALL
SELECT
  'Push subscriptions duplicadas',
  COUNT(*)::TEXT - COUNT(DISTINCT (user_id, subscription->>'endpoint'))
FROM push_subscriptions;


-- =============================================
-- COMANDOS RÁPIDOS DE COPY-PASTE
-- =============================================

-- Ver todo lo importante de un vistazo:
/*
SELECT * FROM (
  SELECT 'Negocios pendientes' as tipo, COUNT(*)::TEXT as cantidad
  FROM businesses WHERE verification_status = 'pending'
  UNION ALL
  SELECT 'Candidaturas pendientes', COUNT(*)::TEXT
  FROM job_applications WHERE status = 'pending'
  UNION ALL
  SELECT 'Presupuestos sin respuesta', COUNT(*)::TEXT
  FROM budget_requests WHERE status = 'new'
) stats
WHERE cantidad::INTEGER > 0;
*/

-- Aprobar todos los negocios pendientes (CUIDADO):
-- UPDATE businesses SET verification_status = 'approved' WHERE verification_status = 'pending';

-- Ver actividad de hoy:
/*
SELECT
  'Nuevos usuarios' as activity,
  COUNT(*)::TEXT as count
FROM profiles WHERE created_at::DATE = CURRENT_DATE
UNION ALL
SELECT 'Nuevos negocios', COUNT(*)::TEXT
FROM businesses WHERE created_at::DATE = CURRENT_DATE
UNION ALL
SELECT 'Nuevas candidaturas', COUNT(*)::TEXT
FROM job_applications WHERE created_at::DATE = CURRENT_DATE
UNION ALL
SELECT 'Nuevos presupuestos', COUNT(*)::TEXT
FROM budget_requests WHERE created_at::DATE = CURRENT_DATE;
*/
