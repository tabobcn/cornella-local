-- ====================================================
-- OFERTAS DE EMPLEO DE EJEMPLO
-- ====================================================

INSERT INTO public.jobs (
  business_id, title, description,
  salary_min, salary_max, salary_note,
  type, contract, modality,
  location, address,
  requirements, benefits,
  status
) VALUES

-- 1. Café del Barrio - Camarero/a
(
  (SELECT id FROM businesses WHERE name = 'Café del Barrio' LIMIT 1),
  'Camarero/a de Sala',
  'Buscamos una persona dinámica y con don de gentes para unirse a nuestro equipo. Como camarero/a, serás la cara visible de nuestro negocio, atendiendo a los clientes y manteniendo el buen ambiente que nos caracteriza.

Ofrecemos un ambiente de trabajo agradable, formación continua y oportunidades de crecimiento dentro de la empresa.',
  18000, 20000, 'Según experiencia',
  'Completa', 'Indefinido', 'Presencial',
  'Cornellà Centro', 'Carrer de Sant Ildefons, 45, Cornellà de Llobregat',
  ARRAY[
    'Experiencia mínima de 1 año en hostelería',
    'Idiomas: Catalán y Castellano nivel alto',
    'Disponibilidad para trabajar fines de semana',
    'Residencia en Cornellà o alrededores'
  ],
  '[
    {"icon": "Percent", "title": "Descuentos", "description": "En productos de la cafetería"},
    {"icon": "BookOpen", "title": "Formación Continua", "description": "Cursos de barista y atención al cliente"}
  ]'::jsonb,
  'active'
),

-- 2. Pizzeria Bella Napoli - Cocinero/a
(
  (SELECT id FROM businesses WHERE name = 'Pizzeria Bella Napoli' LIMIT 1),
  'Pizzero/a Profesional',
  'Buscamos pizzero/a con experiencia para nuestra cocina. Debes tener conocimientos en elaboración de masa madre, manejo de horno de leña y preparación de ingredientes.

Trabajarás en un equipo joven y dinámico en una pizzería con gran afluencia de público.',
  20000, 24000, 'Incluye propinas',
  'Completa', 'Indefinido', 'Presencial',
  'Cornellà Centro', 'Avinguda de Can Boixeres, 12, Cornellà de Llobregat',
  ARRAY[
    'Experiencia mínima de 2 años como pizzero',
    'Conocimiento de cocina italiana',
    'Disponibilidad tardes y fines de semana',
    'Carnet de manipulador de alimentos'
  ],
  '[
    {"icon": "UtensilsCrossed", "title": "Comida incluida", "description": "Comidas durante el turno"},
    {"icon": "TrendingUp", "title": "Propinas", "description": "Reparto equitativo de propinas"}
  ]'::jsonb,
  'active'
),

-- 3. Panadería Cal Miquel - Dependiente/a
(
  (SELECT id FROM businesses WHERE name = 'Panadería Artesana Cal Miquel' LIMIT 1),
  'Dependiente/a de Panadería',
  'Buscamos dependiente/a para atención al cliente en nuestra panadería artesanal. Responsable de venta, cobro y mantenimiento del mostrador.

Horario de mañanas ideal para personas madrugadoras. Buen ambiente laboral en negocio familiar consolidado.',
  16000, 18000, NULL,
  'Completa', 'Indefinido', 'Presencial',
  'Cornellà Centro', 'Carrer de Laureà Miró, 78, Cornellà de Llobregat',
  ARRAY[
    'Experiencia en atención al cliente',
    'Disponibilidad horario de mañanas (6:00-14:00)',
    'Persona responsable y puntual',
    'Valorable conocimiento del sector'
  ],
  '[
    {"icon": "Coffee", "title": "Desayuno diario", "description": "Desayuno incluido"},
    {"icon": "Percent", "title": "Descuento empleado", "description": "20% en todos los productos"}
  ]'::jsonb,
  'active'
),

-- 4. Librería Pages - Dependiente/a Media Jornada
(
  (SELECT id FROM businesses WHERE name = 'Librería Pages' LIMIT 1),
  'Dependiente/a Librería (Media Jornada)',
  'Buscamos amante de los libros para unirse a nuestro equipo. Atención al cliente, asesoramiento en lectura, gestión de stock y organización de eventos literarios.

Ideal para estudiantes o personas que buscan compaginar con otras actividades.',
  12000, 14000, 'Media jornada tardes',
  'Media Jornada', 'Indefinido', 'Presencial',
  'Cornellà Centro', 'Plaça de l''Església, 5, Cornellà de Llobregat',
  ARRAY[
    'Pasión por la lectura y los libros',
    'Disponibilidad horario tardes (16:30-20:30)',
    'Buen nivel de catalán y castellano',
    'Valorable experiencia en retail'
  ],
  '[
    {"icon": "BookOpen", "title": "Descuento en libros", "description": "30% descuento empleado"},
    {"icon": "Users", "title": "Club de lectura", "description": "Participación en eventos literarios"}
  ]'::jsonb,
  'active'
),

-- 5. Salón Style & Cut - Peluquero/a
(
  (SELECT id FROM businesses WHERE name = 'Salón Style & Cut' LIMIT 1),
  'Peluquero/a Profesional',
  'Buscamos peluquero/a con título oficial para incorporación inmediata. Dominio de técnicas de corte, coloración y tratamientos capilares.

Ofrecemos clientela fija, ambiente profesional y posibilidad de desarrollo profesional.',
  18000, 24000, 'Según cartera de clientes',
  'Completa', 'Indefinido', 'Presencial',
  'Cornellà Centro', 'Avinguda de Sant Ildefons, 156, Cornellà de Llobregat',
  ARRAY[
    'Título oficial de peluquería',
    'Experiencia mínima de 3 años',
    'Conocimientos actualizados de tendencias',
    'Cartera de clientes valorable'
  ],
  '[
    {"icon": "Scissors", "title": "Material incluido", "description": "Herramientas profesionales"},
    {"icon": "GraduationCap", "title": "Formación", "description": "Cursos de actualización pagados"}
  ]'::jsonb,
  'active'
),

-- 6. Taller AutoCornellà - Mecánico/a
(
  (SELECT id FROM businesses WHERE name = 'Taller AutoCornellà' LIMIT 1),
  'Mecánico/a de Automóviles',
  'Taller consolidado busca mecánico/a con experiencia para incorporación inmediata. Diagnóstico y reparación de vehículos multimarca.

Contrato indefinido desde el primer día, buen ambiente laboral y herramientas profesionales.',
  22000, 28000, 'Según experiencia y especialización',
  'Completa', 'Indefinido', 'Presencial',
  'Cornellà', 'Carrer de la Fontsanta, 89, Cornellà de Llobregat',
  ARRAY[
    'Título de FP en Automoción o experiencia equivalente',
    'Mínimo 3 años de experiencia',
    'Conocimientos de electrónica del automóvil',
    'Carnet de conducir tipo B'
  ],
  '[
    {"icon": "Wrench", "title": "Herramientas", "description": "Herramientas profesionales incluidas"},
    {"icon": "Car", "title": "Vehículo empresa", "description": "Para desplazamientos laborales"}
  ]'::jsonb,
  'active'
),

-- 7. FitZone Cornellà - Entrenador/a Personal
(
  (SELECT id FROM businesses WHERE name = 'FitZone Cornellà' LIMIT 1),
  'Entrenador/a Personal',
  'Buscamos entrenador/a personal con certificación oficial para impartir clases dirigidas y entrenamientos personalizados.

Gimnasio moderno con clientela consolidada. Posibilidad de desarrollo profesional y especialización.',
  20000, 26000, 'Más comisiones por clases personales',
  'Completa', 'Indefinido', 'Presencial',
  'Cornellà', 'Carrer del Progrés, 45, Cornellà de Llobregat',
  ARRAY[
    'Certificación oficial de entrenador personal',
    'Experiencia mínima de 2 años',
    'Conocimientos de nutrición deportiva',
    'Disponibilidad tardes y algún fin de semana'
  ],
  '[
    {"icon": "Dumbbell", "title": "Gimnasio gratis", "description": "Uso ilimitado de instalaciones"},
    {"icon": "TrendingUp", "title": "Comisiones", "description": "Por clases personales"}
  ]'::jsonb,
  'active'
),

-- 8. Moda & Tendencias - Dependiente/a Temporal
(
  (SELECT id FROM businesses WHERE name = 'Moda & Tendencias' LIMIT 1),
  'Dependiente/a Temporada Primavera-Verano',
  'Buscamos dependiente/a para refuerzo de temporada (marzo-septiembre). Atención al cliente, venta y visual merchandising.

Incorporación inmediata. Posibilidad de prórroga según rendimiento.',
  15000, 16000, 'Contrato 6 meses',
  'Completa', 'Temporal', 'Presencial',
  'Cornellà Centro', 'Carrer de Sant Ferran, 67, Cornellà de Llobregat',
  ARRAY[
    'Experiencia en retail de moda',
    'Buen nivel de catalán y castellano',
    'Disponibilidad inmediata',
    'Persona con estilo y pasión por la moda'
  ],
  '[
    {"icon": "Shirt", "title": "Descuento", "description": "40% en toda la tienda"},
    {"icon": "Star", "title": "Posibilidad indefinido", "description": "Según rendimiento"}
  ]'::jsonb,
  'active'
);

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT
  j.title,
  b.name as business_name,
  j.type,
  j.salary_min || '-' || j.salary_max as salary_range,
  j.status
FROM jobs j
JOIN businesses b ON j.business_id = b.id
ORDER BY j.created_at DESC;

-- ============================================
-- PARA ELIMINAR (antes del lanzamiento):
-- ============================================
-- DELETE FROM jobs WHERE business_id IN (
--   SELECT id FROM businesses WHERE owner_id = 'd1cc1a18-c216-4831-b17c-921254edbfcb'
-- );
