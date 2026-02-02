-- ====================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ====================================================
-- Ve a: https://supabase.com/dashboard/project/zwhlcgckhocdkdxilldo/sql
-- Copia y pega todo este contenido y ejecuta
-- ====================================================

-- 1. Primero añadir la columna special_closures
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS special_closures jsonb;

-- 2. Insertar negocios de ejemplo (SIN verificar duplicados)
INSERT INTO public.businesses (
  owner_id, name, description, address, phone, website,
  category_id, subcategory, tags,
  latitude, longitude, opening_hours, special_closures,
  is_verified, verification_status, verified_at,
  rating, review_count
) VALUES

-- Café del Barrio
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'Café del Barrio',
 'Cafetería acogedora con especialidades de café artesanal, repostería casera y desayunos completos. WiFi gratis y terraza.',
 'Carrer de Sant Ildefons, 45, Cornellà de Llobregat', '936 377 100', 'https://cafedelbarrio.example.com',
 3, 'Cafetería', ARRAY['café', 'desayunos', 'wifi', 'terraza'],
 41.3569, 2.0742,
 '{"monday":{"enabled":true,"morning":{"start":"07:00","end":"13:00"},"afternoon":{"start":"16:00","end":"20:00"}},"tuesday":{"enabled":true,"morning":{"start":"07:00","end":"13:00"},"afternoon":{"start":"16:00","end":"20:00"}},"wednesday":{"enabled":true,"morning":{"start":"07:00","end":"13:00"},"afternoon":{"start":"16:00","end":"20:00"}},"thursday":{"enabled":true,"morning":{"start":"07:00","end":"13:00"},"afternoon":{"start":"16:00","end":"20:00"}},"friday":{"enabled":true,"morning":{"start":"07:00","end":"13:00"},"afternoon":{"start":"16:00","end":"20:00"}},"saturday":{"enabled":true,"morning":{"start":"08:00","end":"14:00"},"afternoon":{"start":"17:00","end":"21:00"}},"sunday":{"enabled":false}}'::jsonb,
 NULL,
 true, 'approved', NOW() - INTERVAL '45 days', 4.5, 28),

-- Pizzeria Bella Napoli
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'Pizzeria Bella Napoli',
 'Auténtica pizza napolitana con horno de leña. Masa madre artesanal e ingredientes italianos importados. Delivery disponible.',
 'Avinguda de Can Boixeres, 12, Cornellà de Llobregat', '933 775 234', NULL,
 3, 'Restaurante', ARRAY['pizza', 'italiano', 'delivery', 'terraza'],
 41.3601, 2.0789,
 '{"monday":{"enabled":false},"tuesday":{"enabled":true,"morning":{"start":"","end":""},"afternoon":{"start":"13:00","end":"16:00"}},"wednesday":{"enabled":true,"morning":{"start":"","end":""},"afternoon":{"start":"13:00","end":"16:00"}},"thursday":{"enabled":true,"morning":{"start":"","end":""},"afternoon":{"start":"13:00","end":"16:00"}},"friday":{"enabled":true,"morning":{"start":"","end":""},"afternoon":{"start":"13:00","end":"23:00"}},"saturday":{"enabled":true,"morning":{"start":"","end":""},"afternoon":{"start":"13:00","end":"23:00"}},"sunday":{"enabled":true,"morning":{"start":"","end":""},"afternoon":{"start":"13:00","end":"16:00"}}}'::jsonb,
 '[{"date":"2026-02-06","name":"Vacaciones personal"}]'::jsonb,
 true, 'approved', NOW() - INTERVAL '15 days', 4.7, 42),

-- El Rincón de Pepe
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'El Rincón de Pepe',
 'Bar tradicional de tapas y raciones. Especialidad en jamón ibérico, tortilla española y croquetas caseras.',
 'Carrer de Rubió i Ors, 23, Cornellà de Llobregat', '933 771 890', NULL,
 3, 'Bar', ARRAY['tapas', 'jamón', 'vino', 'tradicional'],
 41.3545, 2.0701,
 '{"monday":{"enabled":true,"morning":{"start":"08:00","end":"12:00"},"afternoon":{"start":"18:00","end":"23:00"}},"tuesday":{"enabled":true,"morning":{"start":"08:00","end":"12:00"},"afternoon":{"start":"18:00","end":"23:00"}},"wednesday":{"enabled":true,"morning":{"start":"08:00","end":"12:00"},"afternoon":{"start":"18:00","end":"23:00"}},"thursday":{"enabled":true,"morning":{"start":"08:00","end":"12:00"},"afternoon":{"start":"18:00","end":"23:00"}},"friday":{"enabled":true,"morning":{"start":"08:00","end":"12:00"},"afternoon":{"start":"18:00","end":"01:00"}},"saturday":{"enabled":true,"morning":{"start":"","end":""},"afternoon":{"start":"18:00","end":"01:00"}},"sunday":{"enabled":false}}'::jsonb,
 NULL,
 true, 'approved', NOW() - INTERVAL '120 days', 4.3, 67),

-- Panadería Artesana Cal Miquel
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'Panadería Artesana Cal Miquel',
 'Panadería artesanal con más de 30 años de tradición. Pan de masa madre, bollería casera y pastelería por encargo.',
 'Carrer de Laureà Miró, 78, Cornellà de Llobregat', '933 774 567', NULL,
 2, 'Panadería', ARRAY['pan', 'bollería', 'artesanal', 'local'],
 41.3578, 2.0735,
 '{"monday":{"enabled":true,"morning":{"start":"07:30","end":"14:00"},"afternoon":{"start":"17:00","end":"20:30"}},"tuesday":{"enabled":true,"morning":{"start":"07:30","end":"14:00"},"afternoon":{"start":"17:00","end":"20:30"}},"wednesday":{"enabled":true,"morning":{"start":"07:30","end":"14:00"},"afternoon":{"start":"17:00","end":"20:30"}},"thursday":{"enabled":true,"morning":{"start":"07:30","end":"14:00"},"afternoon":{"start":"17:00","end":"20:30"}},"friday":{"enabled":true,"morning":{"start":"07:30","end":"14:00"},"afternoon":{"start":"17:00","end":"20:30"}},"saturday":{"enabled":true,"morning":{"start":"08:00","end":"14:30"},"afternoon":{"start":"","end":""}},"sunday":{"enabled":true,"morning":{"start":"08:00","end":"14:00"},"afternoon":{"start":"","end":""}}}'::jsonb,
 NULL,
 true, 'approved', NOW() - INTERVAL '8 days', 4.8, 95),

-- Librería Pages
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'Librería Pages',
 'Librería independiente con amplio catálogo, zona infantil y club de lectura mensual. También papelería y regalos.',
 'Plaça de l''Església, 5, Cornellà de Llobregat', '936 393 456', 'https://libreriapages.example.com',
 2, 'Librería', ARRAY['libros', 'papelería', 'regalos', 'infantil'],
 41.3590, 2.0750,
 '{"monday":{"enabled":true,"morning":{"start":"09:30","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"tuesday":{"enabled":true,"morning":{"start":"09:30","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"wednesday":{"enabled":true,"morning":{"start":"09:30","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"thursday":{"enabled":true,"morning":{"start":"09:30","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"friday":{"enabled":true,"morning":{"start":"09:30","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"saturday":{"enabled":true,"morning":{"start":"10:00","end":"14:00"},"afternoon":{"start":"17:00","end":"20:30"}},"sunday":{"enabled":false}}'::jsonb,
 NULL,
 true, 'approved', NOW() - INTERVAL '3 days', 4.6, 34),

-- Floristería Rosa & Lila
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'Floristería Rosa & Lila',
 'Floristería con flores frescas diarias, arreglos florales personalizados y plantas de interior. Servicio a domicilio.',
 'Carrer de Mossèn Jacint Verdaguer, 34, Cornellà de Llobregat', '933 770 234', NULL,
 2, 'Floristería', ARRAY['flores', 'plantas', 'ramos', 'delivery'],
 41.3558, 2.0728,
 '{"monday":{"enabled":true,"morning":{"start":"09:00","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"tuesday":{"enabled":true,"morning":{"start":"09:00","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"wednesday":{"enabled":true,"morning":{"start":"09:00","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"thursday":{"enabled":true,"morning":{"start":"09:00","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"friday":{"enabled":true,"morning":{"start":"09:00","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"saturday":{"enabled":true,"morning":{"start":"09:00","end":"14:00"},"afternoon":{"start":"","end":""}},"sunday":{"enabled":false}}'::jsonb,
 '[{"date":"2026-02-14","name":"San Valentín - Solo mañana"}]'::jsonb,
 true, 'approved', NOW() - INTERVAL '22 days', 4.4, 18),

-- Salón Style & Cut
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'Salón Style & Cut',
 'Salón de peluquería unisex. Cortes modernos, coloración, mechas y tratamientos capilares. Pide cita previa.',
 'Avinguda de Sant Ildefons, 156, Cornellà de Llobregat', '933 782 345', NULL,
 4, 'Peluquería', ARRAY['peluquería', 'coloración', 'tratamientos', 'unisex'],
 41.3612, 2.0695,
 '{"monday":{"enabled":false},"tuesday":{"enabled":true,"morning":{"start":"09:30","end":"13:00"},"afternoon":{"start":"16:00","end":"20:00"}},"wednesday":{"enabled":true,"morning":{"start":"09:30","end":"13:00"},"afternoon":{"start":"16:00","end":"20:00"}},"thursday":{"enabled":true,"morning":{"start":"09:30","end":"13:00"},"afternoon":{"start":"16:00","end":"20:00"}},"friday":{"enabled":true,"morning":{"start":"09:30","end":"13:00"},"afternoon":{"start":"16:00","end":"20:00"}},"saturday":{"enabled":true,"morning":{"start":"09:00","end":"14:00"},"afternoon":{"start":"","end":""}},"sunday":{"enabled":false}}'::jsonb,
 NULL,
 true, 'approved', NOW() - INTERVAL '60 days', 4.7, 52),

-- Taller AutoCornellà
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'Taller AutoCornellà',
 'Taller mecánico multimarca. Revisiones, ITV, neumáticos y reparaciones en general. Presupuesto sin compromiso.',
 'Carrer de la Fontsanta, 89, Cornellà de Llobregat', '933 765 432', 'https://autocornella.example.com',
 4, 'Taller Mecánico', ARRAY['mecánica', 'ITV', 'neumáticos', 'revisión'],
 41.3524, 2.0698,
 '{"monday":{"enabled":true,"morning":{"start":"08:00","end":"13:00"},"afternoon":{"start":"15:00","end":"19:00"}},"tuesday":{"enabled":true,"morning":{"start":"08:00","end":"13:00"},"afternoon":{"start":"15:00","end":"19:00"}},"wednesday":{"enabled":true,"morning":{"start":"08:00","end":"13:00"},"afternoon":{"start":"15:00","end":"19:00"}},"thursday":{"enabled":true,"morning":{"start":"08:00","end":"13:00"},"afternoon":{"start":"15:00","end":"19:00"}},"friday":{"enabled":true,"morning":{"start":"08:00","end":"13:00"},"afternoon":{"start":"15:00","end":"19:00"}},"saturday":{"enabled":true,"morning":{"start":"08:30","end":"13:00"},"afternoon":{"start":"","end":""}},"sunday":{"enabled":false}}'::jsonb,
 NULL,
 true, 'approved', NOW() - INTERVAL '90 days', 4.5, 73),

-- FitZone Cornellà
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'FitZone Cornellà',
 'Centro deportivo con sala de musculación, clases dirigidas, spinning y entrenadores personales. Primera clase gratis.',
 'Carrer del Progrés, 45, Cornellà de Llobregat', '936 391 234', 'https://fitzonecornella.example.com',
 5, 'Gimnasio', ARRAY['fitness', 'musculación', 'spinning', 'yoga'],
 41.3595, 2.0715,
 '{"monday":{"enabled":true,"morning":{"start":"07:00","end":"22:00"},"afternoon":{"start":"","end":""}},"tuesday":{"enabled":true,"morning":{"start":"07:00","end":"22:00"},"afternoon":{"start":"","end":""}},"wednesday":{"enabled":true,"morning":{"start":"07:00","end":"22:00"},"afternoon":{"start":"","end":""}},"thursday":{"enabled":true,"morning":{"start":"07:00","end":"22:00"},"afternoon":{"start":"","end":""}},"friday":{"enabled":true,"morning":{"start":"07:00","end":"22:00"},"afternoon":{"start":"","end":""}},"saturday":{"enabled":true,"morning":{"start":"09:00","end":"14:00"},"afternoon":{"start":"17:00","end":"20:00"}},"sunday":{"enabled":true,"morning":{"start":"09:00","end":"14:00"},"afternoon":{"start":"","end":""}}}'::jsonb,
 '[{"date":"2026-02-10","name":"Mantenimiento equipos"}]'::jsonb,
 true, 'approved', NOW() - INTERVAL '5 days', 4.6, 89),

-- Farmàcia Vila
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'Farmàcia Vila',
 'Farmacia de guardia con servicio de análisis, medición de tensión y asesoramiento farmacéutico. Ortopedia disponible.',
 'Plaça dels Països Catalans, 2, Cornellà de Llobregat', '933 771 123', NULL,
 4, 'Farmacia', ARRAY['farmacia', 'análisis', 'ortopedia', 'guardia'],
 41.3580, 2.0755,
 '{"monday":{"enabled":true,"morning":{"start":"09:00","end":"21:00"},"afternoon":{"start":"","end":""}},"tuesday":{"enabled":true,"morning":{"start":"09:00","end":"21:00"},"afternoon":{"start":"","end":""}},"wednesday":{"enabled":true,"morning":{"start":"09:00","end":"21:00"},"afternoon":{"start":"","end":""}},"thursday":{"enabled":true,"morning":{"start":"09:00","end":"21:00"},"afternoon":{"start":"","end":""}},"friday":{"enabled":true,"morning":{"start":"09:00","end":"21:00"},"afternoon":{"start":"","end":""}},"saturday":{"enabled":true,"morning":{"start":"09:30","end":"14:00"},"afternoon":{"start":"","end":""}},"sunday":{"enabled":false}}'::jsonb,
 NULL,
 true, 'approved', NOW() - INTERVAL '180 days', 4.9, 124),

-- Moda & Tendencias
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'Moda & Tendencias',
 'Boutique de moda femenina con las últimas tendencias. Ropa, complementos y accesorios de marcas europeas.',
 'Carrer de Sant Ferran, 67, Cornellà de Llobregat', '933 778 901', NULL,
 1, 'Moda Mujer', ARRAY['ropa', 'complementos', 'moda', 'tendencias'],
 41.3562, 2.0720,
 '{"monday":{"enabled":true,"morning":{"start":"10:00","end":"13:30"},"afternoon":{"start":"17:00","end":"20:30"}},"tuesday":{"enabled":true,"morning":{"start":"10:00","end":"13:30"},"afternoon":{"start":"17:00","end":"20:30"}},"wednesday":{"enabled":true,"morning":{"start":"10:00","end":"13:30"},"afternoon":{"start":"17:00","end":"20:30"}},"thursday":{"enabled":true,"morning":{"start":"10:00","end":"13:30"},"afternoon":{"start":"17:00","end":"20:30"}},"friday":{"enabled":true,"morning":{"start":"10:00","end":"13:30"},"afternoon":{"start":"17:00","end":"20:30"}},"saturday":{"enabled":true,"morning":{"start":"10:00","end":"14:00"},"afternoon":{"start":"17:00","end":"21:00"}},"sunday":{"enabled":false}}'::jsonb,
 '[{"date":"2026-02-03","name":"Inventario anual"},{"date":"2026-02-04","name":"Inventario anual"}]'::jsonb,
 true, 'approved', NOW() - INTERVAL '12 days', 4.2, 31),

-- Calzados Martínez
('d1cc1a18-c216-4831-b17c-921254edbfcb', 'Calzados Martínez',
 'Zapatería familiar con calzado de calidad para toda la familia. Marcas reconocidas y asesoramiento personalizado.',
 'Avinguda de Salvador Allende, 34, Cornellà de Llobregat', '933 773 567', NULL,
 1, 'Calzado', ARRAY['zapatos', 'deportivas', 'infantil', 'marcas'],
 41.3540, 2.0710,
 '{"monday":{"enabled":true,"morning":{"start":"09:30","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"tuesday":{"enabled":true,"morning":{"start":"09:30","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"wednesday":{"enabled":true,"morning":{"start":"09:30","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"thursday":{"enabled":true,"morning":{"start":"09:30","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"friday":{"enabled":true,"morning":{"start":"09:30","end":"13:30"},"afternoon":{"start":"16:30","end":"20:00"}},"saturday":{"enabled":true,"morning":{"start":"10:00","end":"14:00"},"afternoon":{"start":"17:00","end":"20:30"}},"sunday":{"enabled":false}}'::jsonb,
 NULL,
 true, 'approved', NOW() - INTERVAL '200 days', 4.4, 46);

-- 3. Verificar que se han insertado
SELECT name, category_id, subcategory, is_verified, verified_at
FROM businesses
WHERE owner_id = 'd1cc1a18-c216-4831-b17c-921254edbfcb'
ORDER BY created_at DESC;

-- ====================================================
-- PARA ELIMINAR TODOS LOS NEGOCIOS DE EJEMPLO (antes del lanzamiento):
-- ====================================================
-- DELETE FROM businesses WHERE owner_id = 'd1cc1a18-c216-4831-b17c-921254edbfcb';
