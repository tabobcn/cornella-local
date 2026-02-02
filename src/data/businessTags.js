// Etiquetas por categoría de negocio
export const businessTagsByCategory = {
  // Restaurantes & Bares
  restaurantes: [
    'Menú diario',
    'Menú degustación',
    'Menú festivo',
    'Terraza',
    'Reservas online',
    'Delivery',
    'Para llevar',
    'Apto celíacos',
    'Opciones veganas',
    'Parking propio',
    'Grupos grandes',
    'Menú infantil',
  ],

  // Peluquerías & Estética
  peluquerias: [
    'Con cita previa',
    'Sin cita',
    'Coloración',
    'Mechas/Balayage',
    'Permanente',
    'Tratamientos capilares',
    'Manicura/Pedicura',
    'Depilación',
    'Barbería',
    'Extensiones',
  ],

  // Gimnasios & Deportes
  gimnasios: [
    'Clases dirigidas',
    'Personal trainer',
    'Spinning',
    'Yoga',
    'Pilates',
    'Musculación',
    'Cardio',
    'Piscina',
    'Sauna',
    'Horario 24h',
  ],

  // Supermercados & Alimentación
  supermercados: [
    'Productos frescos',
    'Productos ecológicos',
    'Sin gluten',
    'Vegano',
    'Delivery',
    'Productos locales',
    'Carnicería',
    'Pescadería',
    'Panadería artesanal',
  ],

  // Moda & Complementos
  moda: [
    'Tallas grandes',
    'Ropa infantil',
    'Ropa deportiva',
    'Calzado',
    'Complementos',
    'Joyería',
    'Relojes',
    'Gafas de sol',
    'Arreglos y retouches',
  ],

  // Servicios Profesionales
  servicios: [
    'Presupuesto sin compromiso',
    'Urgencias 24h',
    'Garantía incluida',
    'Desplazamiento gratuito',
    'Materiales incluidos',
    'Pago aplazado',
  ],

  // Hogar & Decoración
  hogar: [
    'Asesoramiento gratuito',
    'Instalación incluida',
    'Productos sostenibles',
    'Hecho a medida',
    'Outlet/Ofertas',
    'Catálogo online',
  ],

  // Salud & Bienestar
  salud: [
    'Con cita previa',
    'Urgencias',
    'Seguros médicos',
    'Primera consulta gratis',
    'Tratamientos personalizados',
    'Domingos abierto',
  ],

  // Educación & Formación
  educacion: [
    'Clases particulares',
    'Grupos reducidos',
    'Online disponible',
    'Material incluido',
    'Certificado oficial',
    'Prueba gratuita',
  ],
};

// Etiquetas generales (para todas las categorías)
export const generalTags = [
  'Parking cercano',
  'Accesible',
  'WiFi gratis',
  'Pago con tarjeta',
  'Bizum',
];

// Función para obtener las etiquetas de una categoría
export const getTagsForCategory = (categorySlug) => {
  const categoryTags = businessTagsByCategory[categorySlug] || [];
  return [...generalTags, ...categoryTags];
};

// Función para obtener todas las etiquetas únicas
export const getAllTags = () => {
  const allCategoryTags = Object.values(businessTagsByCategory).flat();
  return [...new Set([...generalTags, ...allCategoryTags])];
};
