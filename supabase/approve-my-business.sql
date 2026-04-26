-- =====================================================
-- APROBAR MI NEGOCIO PARA QUE APAREZCA EN LA WEB
-- =====================================================

-- Ver tu negocio actual
SELECT
  id,
  name,
  verification_status,
  is_verified,
  subcategory,
  neighborhood
FROM businesses
WHERE name ILIKE '%cafeteria central%';

-- Aprobar tu negocio (aparecerá en la web)
UPDATE businesses
SET
  verification_status = 'approved',
  is_verified = true
WHERE name ILIKE '%cafeteria central%';

-- Verificar que se aprobó
SELECT
  id,
  name,
  verification_status,
  is_verified,
  subcategory,
  neighborhood
FROM businesses
WHERE name ILIKE '%cafeteria central%';

-- ✅ ¡Listo! Tu negocio ahora aparecerá en:
-- - Búsqueda general
-- - Categoría "Restauración y Hostelería"
-- - Subcategoría "Bar y cafetería"
-- - Barrio seleccionado
