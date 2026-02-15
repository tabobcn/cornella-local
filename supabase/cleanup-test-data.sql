-- =============================================
-- CLEANUP: Borrar datos de prueba
-- Conservar: negocios 80 y 82 (los tuyos aprobados)
-- Borrar: negocio 81 (rechazado), todas las reseñas
-- =============================================

-- 1. Borrar todas las reseñas
DELETE FROM reviews;

-- 2. Borrar datos relacionados al negocio 81
DELETE FROM offers    WHERE business_id = 81;
DELETE FROM jobs      WHERE business_id = 81;
DELETE FROM favorites WHERE business_id = 81;

-- 3. Borrar el negocio 81 (Cafeteria Cornella - rechazada)
DELETE FROM businesses WHERE id = 81;

-- 4. Verificar resultado final
SELECT id, name, verification_status, is_published FROM businesses ORDER BY id;
SELECT COUNT(*) AS total_reviews FROM reviews;
