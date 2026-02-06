// ==============================================
// CONSTANTES DE LA APLICACIÓN
// ==============================================
// Centraliza valores mágicos para facilitar mantenimiento

// URLs y Endpoints
export const APP_CONFIG = {
  name: 'CornellaLocal',
  domain: 'https://cornellalocal.es',
  supportEmail: 'soporte@cornellalocal.es',
  version: '1.0.0',
};

// Límites y Validaciones
export const LIMITS = {
  // Reseñas
  review: {
    minLength: 10,
    maxLength: 500,
    minAccountAgeDays: 30,
  },

  // Presupuestos
  budgetRequest: {
    descriptionMinLength: 20,
    descriptionMaxLength: 500,
    maxPhotos: 3,
  },

  // Candidaturas
  jobApplication: {
    messageMinLength: 50,
    messageMaxLength: 1000,
  },

  // Ofertas
  offer: {
    titleMaxLength: 100,
    descriptionMaxLength: 300,
    maxFlashDurationHours: 24,
  },

  // Empleos
  job: {
    titleMaxLength: 100,
    descriptionMaxLength: 1000,
  },

  // General
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxImageWidth: 1920,
  maxImageHeight: 1080,
};

// Timeouts y Delays
export const TIMING = {
  toastDuration: 3000,
  debounceSearch: 300,
  autoSaveDelay: 1000,
  refreshCooldown: 2000,
  animationDuration: 300,
  notificationDuration: 5000,
};

// Mensajes de Error Comunes
export const ERROR_MESSAGES = {
  network: 'Error de conexión. Comprueba tu internet.',
  generic: 'Algo salió mal. Inténtalo de nuevo.',
  unauthorized: 'Debes iniciar sesión para continuar.',
  notFound: 'No encontrado.',
  serverError: 'Error del servidor. Inténtalo más tarde.',
  invalidData: 'Datos no válidos. Revisa el formulario.',
  timeout: 'La operación tardó demasiado. Inténtalo de nuevo.',
};

// Mensajes de Éxito
export const SUCCESS_MESSAGES = {
  saved: '¡Guardado correctamente!',
  deleted: 'Eliminado correctamente',
  sent: '¡Enviado!',
  updated: 'Actualizado correctamente',
  created: '¡Creado exitosamente!',
};

// Categorías de Servicios (para presupuestos)
export const SERVICE_CATEGORIES = [
  'Albañil y reformas',
  'Carpintero',
  'Cerrajero',
  'Climatización',
  'Electricista',
  'Fontanero',
  'Jardinería',
  'Limpieza',
  'Mudanzas',
  'Pintor',
  'Reparación móviles',
  'Reformas',
  'Construcción',
  'Mantenimiento',
];

// Estados de Candidaturas
export const APPLICATION_STATUS = {
  pending: { label: 'Pendiente', color: 'gray' },
  reviewed: { label: 'En revisión', color: 'blue' },
  shortlisted: { label: 'Preseleccionado', color: 'amber' },
  hired: { label: 'Contratado', color: 'green' },
  rejected: { label: 'Rechazado', color: 'red' },
};

// Estados de Presupuestos
export const BUDGET_STATUS = {
  new: { label: 'Nuevo', color: 'blue' },
  replied: { label: 'Respondido', color: 'green' },
  accepted: { label: 'Aceptado', color: 'green' },
  rejected: { label: 'Rechazado', color: 'red' },
};

// Niveles de Urgencia
export const URGENCY_LEVELS = {
  urgent: { label: 'Urgente', color: 'red', icon: 'Zap' },
  'this-week': { label: 'Esta semana', color: 'amber', icon: 'Calendar' },
  'next-week': { label: 'Sin prisa', color: 'green', icon: 'Clock' },
};

// Coordenadas de Cornellà de Llobregat
export const LOCATION = {
  latitude: 41.3558,
  longitude: 2.0741,
  city: 'Cornellà de Llobregat',
  postalCode: '08940',
  province: 'Barcelona',
  region: 'Catalunya',
  country: 'España',
};

// Configuración de Cache (Service Worker)
export const CACHE_CONFIG = {
  version: 'v1',
  staticCacheName: 'cornellalocal-static-v1',
  dynamicCacheName: 'cornellalocal-dynamic-v1',
  imageCacheName: 'cornellalocal-images-v1',
  maxDynamicCacheItems: 50,
  maxImageCacheItems: 100,
};

// Configuración de Notificaciones Push
export const PUSH_CONFIG = {
  vibrationPattern: [200, 100, 200],
  urgentVibration: [300, 100, 300, 100, 300],
  iconPath: '/icons/icon-192x192.png',
  badgePath: '/icons/icon-72x72.png',
};

// Analytics Events (listos para conectar)
export const ANALYTICS_EVENTS = {
  // Negocios
  businessViewed: 'business_viewed',
  businessClicked: 'business_clicked',
  businessFavorited: 'business_favorited',

  // Ofertas
  offerViewed: 'offer_viewed',
  offerRedeemed: 'offer_redeemed',

  // Empleos
  jobViewed: 'job_viewed',
  jobApplied: 'job_applied',

  // Presupuestos
  budgetRequested: 'budget_requested',
  budgetQuoteReceived: 'budget_quote_received',

  // Usuario
  userRegistered: 'user_registered',
  userLoggedIn: 'user_logged_in',

  // Búsqueda
  searchPerformed: 'search_performed',
  filterApplied: 'filter_applied',
};

// Patrones Regex (reutilizables)
export const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phoneSpanish: /^(\+34|0034)?[6-9]\d{8}$/,
  postalCodeSpanish: /^[0-5]\d{4}$/,
  nifCif: /^(\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9]|[XYZ]\d{7}[A-Z])$/,
  url: /^https?:\/\/.+/,
};

// Tamaños de Pantalla
export const BREAKPOINTS = {
  mobile: 448,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

// Colores del Sistema (matching Tailwind config)
export const COLORS = {
  primary: '#567ac7',
  primaryDark: '#405b94',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export default {
  APP_CONFIG,
  LIMITS,
  TIMING,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  SERVICE_CATEGORIES,
  APPLICATION_STATUS,
  BUDGET_STATUS,
  URGENCY_LEVELS,
  LOCATION,
  CACHE_CONFIG,
  PUSH_CONFIG,
  ANALYTICS_EVENTS,
  REGEX_PATTERNS,
  BREAKPOINTS,
  COLORS,
};
