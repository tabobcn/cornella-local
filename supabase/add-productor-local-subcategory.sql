-- ====================================================
-- AÑADIR SUBCATEGORÍA: Productor Local / Pagès
-- ====================================================
-- Nueva subcategoría para agricultores locales que venden directo
-- Categoría padre: Alimentación
-- ====================================================

-- Añadir la subcategoría "Productor Local"
INSERT INTO public.categories (name, slug, icon, description, parent_id)
VALUES (
  'Productor Local',
  'productor-local',
  'Tractor',
  'Agricultores locales - Venta directa del campo',
  (SELECT id FROM public.categories WHERE slug = 'alimentacion')
);

-- Verificar que se insertó correctamente
SELECT
  c.id,
  c.name,
  c.slug,
  c.icon,
  c.description,
  p.name as parent_category
FROM public.categories c
LEFT JOIN public.categories p ON c.parent_id = p.id
WHERE c.slug = 'productor-local';

-- ====================================================
-- NOTA: Esta subcategoría permite a los pagesos de Cornellà
-- registrar sus huertas y ventas ambulantes
-- Tags específicos están en: src/data/businessTagsByCategory.js
-- ====================================================
