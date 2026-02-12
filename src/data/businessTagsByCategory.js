// ====================================================
// SISTEMA DE TAGS POR CATEGORÍA Y SUBCATEGORÍA
// ====================================================
// Tags funcionales y específicos para filtrar servicios
// Organizado por categoría > subcategoría > tags
// ====================================================

export const tagsBySubcategory = {
  // ====================================================
  // RESTAURACIÓN Y HOSTELERÍA (Categoría 3)
  // ====================================================

  // Restaurante
  'Restaurante': [
    'Menú diario',
    'Menú degustación',
    'Menú grupos (10+ personas)',
    'Menú celebraciones',
    'Terraza exterior',
    'Reservas online',
    'Comida para llevar',
    'Delivery propio',
    'Parking gratis',
    'Menú infantil',
    '100% Vegetariano',
    '100% Vegano',
    'Opciones vegetarianas',
    'Opciones veganas',
    'Sin gluten',
    'Cocina de mercado',
    'Producto km 0',
    'Cocina casera',
    'Pet friendly'
  ],

  // Bar / Cafetería
  'Bar': [
    'Menú diario',
    'Tapas incluidas con bebida',
    'Desayunos',
    'Brunch fin de semana',
    'Terraza',
    'WiFi gratis',
    'Eventos deportivos (TV)',
    'Música en vivo',
    'Comida para llevar',
    'Parking cercano',
    'Zona infantil',
    'Pet friendly'
  ],

  'Cafetería': [
    'Café artesanal',
    'Desayunos',
    'Brunch fin de semana',
    'Repostería casera',
    'Terraza',
    'WiFi gratis',
    'Comida para llevar',
    'Opciones sin gluten',
    'Opciones veganas',
    'Parking cercano',
    'Pet friendly'
  ],

  // Pizzería
  'Pizzería': [
    'Comida para llevar',
    'Delivery propio',
    'Horno de leña',
    'Masa artesanal',
    'Opciones vegetarianas',
    'Opciones veganas',
    'Sin gluten',
    'Terraza',
    'Parking gratis',
    'Menú grupos'
  ],

  // ====================================================
  // COMERCIOS Y TIENDAS (Categoría 2)
  // ====================================================

  // Panadería / Pastelería
  'Panadería': [
    'Pan artesanal',
    'Masa madre',
    'Sin gluten',
    'Bollería casera',
    'Tartas por encargo',
    'Catering',
    'Productos ecológicos',
    'Envío a domicilio'
  ],

  'Pastelería': [
    'Tartas por encargo',
    'Bollería artesanal',
    'Sin gluten',
    'Opciones veganas',
    'Catering',
    'Decoración personalizada',
    'Envío a domicilio'
  ],

  // Supermercado / Alimentación
  'Supermercado': [
    'Productos frescos',
    'Productos caseros',
    'Frutas km 0',
    'Verduras km 0',
    'Productos ecológicos',
    'Productos locales',
    'Sin intermediarios',
    'Delivery propio',
    'Carnicería propia',
    'Pescadería propia',
    'Frutería propia',
    'Panadería propia',
    'Parking gratis'
  ],

  'Frutería': [
    'Frutas km 0',
    'Verduras km 0',
    'Productos ecológicos',
    'Productos locales',
    'Frutas de temporada',
    'Verduras de temporada',
    'Sin intermediarios',
    'Delivery propio'
  ],

  // NUEVA: Productor Local / Pagès
  'Productor Local': [
    'Huerta propia en Cornellà',
    'Venta directa del productor',
    'Productos km 0',
    'Frutas de temporada',
    'Verduras de temporada',
    'Cultivo ecológico certificado',
    'Sin intermediarios',
    'Venta ambulante',
    'Agricultura familiar',
    'Recién cosechado',
    'Fruta del día',
    'Cestas personalizadas',
    'Delivery a domicilio',
    'Pedidos por encargo'
  ],

  'Pagès': [ // Alias para Productor Local
    'Huerta propia en Cornellà',
    'Venta directa del productor',
    'Productos km 0',
    'Frutas de temporada',
    'Verduras de temporada',
    'Cultivo ecológico certificado',
    'Sin intermediarios',
    'Venta ambulante',
    'Agricultura familiar',
    'Recién cosechado',
    'Fruta del día',
    'Cestas personalizadas',
    'Delivery a domicilio',
    'Pedidos por encargo'
  ],

  // Librería / Papelería
  'Librería': [
    'Libros nuevos',
    'Libros segunda mano',
    'Material escolar',
    'Regalos',
    'Club de lectura',
    'Eventos literarios',
    'Encargo de libros',
    'Envoltorio regalo gratis'
  ],

  'Papelería': [
    'Material escolar',
    'Material oficina',
    'Regalos',
    'Fotocopias',
    'Encuadernación',
    'Impresión',
    'Envoltorio regalo gratis'
  ],

  // Floristería
  'Floristería': [
    'Flores frescas diarias',
    'Plantas de interior',
    'Plantas exterior',
    'Ramos personalizados',
    'Envío a domicilio',
    'Decoración eventos',
    'Macetas artesanales',
    'Cuidado plantas'
  ],

  // ====================================================
  // MODA Y COMPLEMENTOS (Categoría 1)
  // ====================================================

  'Moda Mujer': [
    'Últimas tendencias',
    'Tallas grandes',
    'Ropa sostenible',
    'Marcas europeas',
    'Probadores amplios',
    'Alteraciones gratis',
    'Personal shopper',
    'Envoltorio regalo'
  ],

  'Moda Hombre': [
    'Últimas tendencias',
    'Tallas grandes',
    'Ropa sostenible',
    'Marcas europeas',
    'Probadores amplios',
    'Alteraciones gratis',
    'Personal shopper',
    'Envoltorio regalo'
  ],

  'Calzado': [
    'Marcas reconocidas',
    'Calzado cómodo',
    'Deportivas',
    'Calzado infantil',
    'Tallas especiales',
    'Asesoramiento personalizado',
    'Cambios sin ticket'
  ],

  'Complementos': [
    'Joyería artesanal',
    'Reparación joyas',
    'Grabado personalizado',
    'Envoltorio regalo',
    'Relojes',
    'Gafas de sol',
    'Bisutería'
  ],

  'Joyería': [
    'Joyería artesanal',
    'Joyas personalizadas',
    'Reparación joyas',
    'Grabado personalizado',
    'Relojes',
    'Tasación gratuita',
    'Envoltorio regalo'
  ],

  // ====================================================
  // SERVICIOS (Categoría 4)
  // ====================================================

  'Peluquería': [
    'Corte sin cita',
    'Coloración',
    'Mechas',
    'Tratamientos capilares',
    'Peinados eventos',
    'Depilación',
    'Manicura/Pedicura',
    'Primera cita descuento'
  ],

  'Barbería': [
    'Corte sin cita',
    'Barbería tradicional',
    'Afeitado tradicional',
    'Arreglo barba',
    'Tratamientos capilares',
    'Productos exclusivos'
  ],

  'Centro de Estética': [
    'Depilación láser',
    'Tratamientos faciales',
    'Masajes',
    'Manicura/Pedicura',
    'Maquillaje',
    'Micropigmentación',
    'Primera cita descuento'
  ],

  'Taller Mecánico': [
    'Revisión pre-ITV',
    'ITV in situ',
    'Neumáticos',
    'Diagnosis electrónica',
    'Mecánica rápida',
    'Chapa y pintura',
    'Vehículo sustitución',
    'Presupuesto sin compromiso'
  ],

  'Farmacia': [
    'Farmacia de guardia',
    'Medición tensión gratis',
    'Análisis',
    'Ortopedia',
    'Nutrición',
    'Envío a domicilio',
    'Test COVID/Antígenos'
  ],

  // ====================================================
  // OCIO Y SALUD (Categoría 5)
  // ====================================================

  'Gimnasio': [
    'Sala musculación',
    'Clases dirigidas',
    'Spinning',
    'Yoga / Pilates',
    'Entrenador personal',
    'Piscina',
    'Sauna',
    'Primera clase gratis',
    'Horario 24h',
    'Zona cardio'
  ],

  'Centro Médico': [
    'Medicina general',
    'Pediatría',
    'Fisioterapia',
    'Psicología',
    'Nutrición',
    'Odontología',
    'Primera consulta gratis',
    'Cita online',
    'Urgencias'
  ],

  'Clínica': [
    'Medicina general',
    'Pediatría',
    'Fisioterapia',
    'Psicología',
    'Nutrición',
    'Odontología',
    'Primera consulta gratis',
    'Cita online',
    'Urgencias'
  ],

  // ====================================================
  // HOGAR Y CONSTRUCCIÓN (Categoría 6)
  // ====================================================

  'Fontanería': [
    'Urgencias 24h',
    'Presupuesto sin compromiso',
    'Reparaciones rápidas',
    'Instalaciones nuevas',
    'Certificados oficiales',
    'Garantía trabajos'
  ],

  'Electricidad': [
    'Urgencias 24h',
    'Presupuesto sin compromiso',
    'Reparaciones rápidas',
    'Instalaciones nuevas',
    'Certificados oficiales',
    'Garantía trabajos',
    'Boletín eléctrico'
  ],

  'Pintura': [
    'Presupuesto sin compromiso',
    'Pintura ecológica',
    'Decoración interiores',
    'Acabados profesionales',
    'Licencias incluidas',
    'Garantía trabajos'
  ],

  'Reformas': [
    'Presupuesto sin compromiso',
    'Reformas integrales',
    'Diseño 3D',
    'Cocinas',
    'Baños',
    'Licencias incluidas',
    'Garantía trabajos'
  ],

  // ====================================================
  // TECNOLOGÍA (Categoría 7)
  // ====================================================

  'Informática': [
    'Reparación ordenadores',
    'Reparación portátiles',
    'Recuperación datos',
    'Presupuesto gratis',
    'Reparación en el día',
    'Garantía reparaciones',
    'Montaje equipos'
  ],

  'Telefonía': [
    'Reparación pantallas',
    'Cambio batería',
    'Reparación móviles',
    'Reparación tablets',
    'Presupuesto gratis',
    'Reparación en el día',
    'Garantía reparaciones'
  ],

  // ====================================================
  // OTROS (Categoría 8) - Tags genéricos
  // ====================================================

  'Otros': [
    'Atención personalizada',
    'Parking cercano',
    'Accesible PMR',
    'WiFi gratis',
    'Tarjetas aceptadas',
    'Bizum',
    'Pet friendly'
  ]
};

// Helper: Obtener tags por subcategoría
export const getTagsBySubcategory = (subcategory) => {
  if (!subcategory) return [];
  return tagsBySubcategory[subcategory] || [];
};

// Helper: Verificar si existe configuración para una subcategoría
export const hasTagsForSubcategory = (subcategory) => {
  return subcategory && tagsBySubcategory[subcategory] !== undefined;
};
