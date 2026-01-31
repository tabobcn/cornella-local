-- =============================================
-- DATOS INICIALES PARA CORNELLÀ LOCAL
-- Ejecutar DESPUÉS de schema.sql
-- =============================================

-- Categorías principales
insert into public.categories (name, slug, icon, description) values
('Restaurantes', 'restaurantes', 'UtensilsCrossed', 'Bares, cafeterías y restaurantes'),
('Alimentación', 'alimentacion', 'ShoppingBasket', 'Supermercados, fruterías y tiendas de alimentación'),
('Moda', 'moda', 'Shirt', 'Ropa, calzado y complementos'),
('Servicios', 'servicios', 'Wrench', 'Profesionales y servicios para el hogar'),
('Salud', 'salud', 'HeartPulse', 'Farmacias, clínicas y bienestar'),
('Hogar', 'hogar', 'Armchair', 'Muebles, decoración y hogar'),
('Otros', 'otros', 'Store', 'Otras tiendas y servicios');

-- Subcategorías de Restaurantes
insert into public.categories (name, slug, icon, description, parent_id) values
('Tapas y Raciones', 'tapas', 'Beer', 'Bares de tapas', (select id from public.categories where slug = 'restaurantes')),
('Pizzerías', 'pizzerias', 'Pizza', 'Pizzas y comida italiana', (select id from public.categories where slug = 'restaurantes')),
('Cafeterías', 'cafeterias', 'Coffee', 'Cafeterías y pastelerías', (select id from public.categories where slug = 'restaurantes')),
('Comida Asiática', 'asiatica', 'UtensilsCrossed', 'Restaurantes asiáticos', (select id from public.categories where slug = 'restaurantes'));

-- Subcategorías de Servicios (profesionales)
insert into public.categories (name, slug, icon, description, parent_id) values
('Fontaneros', 'fontaneros', 'Droplet', 'Fontanería y desatascos', (select id from public.categories where slug = 'servicios')),
('Electricistas', 'electricistas', 'Lightbulb', 'Instalaciones eléctricas', (select id from public.categories where slug = 'servicios')),
('Pintores', 'pintores', 'Paintbrush', 'Pintura y decoración', (select id from public.categories where slug = 'servicios')),
('Cerrajeros', 'cerrajeros', 'Key', 'Cerrajería 24h', (select id from public.categories where slug = 'servicios')),
('Albañiles', 'albaniles', 'Hammer', 'Reformas y construcción', (select id from public.categories where slug = 'servicios')),
('Limpieza', 'limpieza', 'Sparkles', 'Servicios de limpieza', (select id from public.categories where slug = 'servicios')),
('Carpinteros', 'carpinteros', 'Hammer', 'Carpintería y muebles a medida', (select id from public.categories where slug = 'servicios')),
('Jardinería', 'jardineria', 'Flower2', 'Jardinería y paisajismo', (select id from public.categories where slug = 'servicios'));

-- Subcategorías de Alimentación
insert into public.categories (name, slug, icon, description, parent_id) values
('Fruterías', 'fruterias', 'Apple', 'Frutas y verduras frescas', (select id from public.categories where slug = 'alimentacion')),
('Carnicerías', 'carnicerias', 'Beef', 'Carnes y embutidos', (select id from public.categories where slug = 'alimentacion')),
('Pescaderías', 'pescaderias', 'Fish', 'Pescado y marisco fresco', (select id from public.categories where slug = 'alimentacion')),
('Panaderías', 'panaderias', 'Croissant', 'Pan y bollería artesanal', (select id from public.categories where slug = 'alimentacion')),
('Supermercados', 'supermercados', 'ShoppingCart', 'Supermercados y tiendas', (select id from public.categories where slug = 'alimentacion'));

-- Subcategorías de Moda
insert into public.categories (name, slug, icon, description, parent_id) values
('Ropa Mujer', 'ropa-mujer', 'Shirt', 'Moda femenina', (select id from public.categories where slug = 'moda')),
('Ropa Hombre', 'ropa-hombre', 'Shirt', 'Moda masculina', (select id from public.categories where slug = 'moda')),
('Ropa Infantil', 'ropa-infantil', 'Baby', 'Ropa para niños', (select id from public.categories where slug = 'moda')),
('Calzado', 'calzado', 'Footprints', 'Zapaterías', (select id from public.categories where slug = 'moda')),
('Joyerías', 'joyerias', 'Gem', 'Joyas y complementos', (select id from public.categories where slug = 'moda')),
('Peluquerías', 'peluquerias', 'Scissors', 'Peluquerías y estética', (select id from public.categories where slug = 'moda'));

-- Subcategorías de Salud
insert into public.categories (name, slug, icon, description, parent_id) values
('Farmacias', 'farmacias', 'Pill', 'Farmacias y parafarmacia', (select id from public.categories where slug = 'salud')),
('Dentistas', 'dentistas', 'Smile', 'Clínicas dentales', (select id from public.categories where slug = 'salud')),
('Fisioterapia', 'fisioterapia', 'Activity', 'Fisioterapeutas', (select id from public.categories where slug = 'salud')),
('Centros de Belleza', 'belleza', 'Sparkles', 'Estética y belleza', (select id from public.categories where slug = 'salud')),
('Gimnasios', 'gimnasios', 'Dumbbell', 'Gimnasios y fitness', (select id from public.categories where slug = 'salud'));

-- Subcategorías de Hogar
insert into public.categories (name, slug, icon, description, parent_id) values
('Muebles', 'muebles', 'Armchair', 'Tiendas de muebles', (select id from public.categories where slug = 'hogar')),
('Iluminación', 'iluminacion', 'Lamp', 'Lámparas y luces', (select id from public.categories where slug = 'hogar')),
('Electrodomésticos', 'electrodomesticos', 'Refrigerator', 'Electrodomésticos', (select id from public.categories where slug = 'hogar')),
('Colchones', 'colchones', 'Bed', 'Colchones y descanso', (select id from public.categories where slug = 'hogar')),
('Floristerías', 'floristerias', 'Flower', 'Flores y plantas', (select id from public.categories where slug = 'hogar'));
