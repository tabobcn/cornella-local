// ==============================================
// FUNCIONES DE FORMATO Y HELPERS
// ==============================================
// Formatea datos para mostrar al usuario

/**
 * Formatea una fecha a formato español legible
 * @param {string|Date} date - Fecha a formatear
 * @param {string} format - 'short' | 'long' | 'relative'
 * @returns {string} Fecha formateada
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  switch (format) {
    case 'short':
      // "15 ene 2024"
      return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

    case 'long':
      // "15 de enero de 2024"
      return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

    case 'relative':
      // "Hace 2 horas", "Hace 3 días"
      return formatRelativeTime(d);

    case 'time':
      // "14:30"
      return d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });

    case 'datetime':
      // "15 ene 2024, 14:30"
      return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    default:
      return d.toLocaleDateString('es-ES');
  }
};

/**
 * Formatea tiempo relativo (ej: "Hace 2 horas")
 * @param {Date} date - Fecha a comparar
 * @returns {string} Tiempo relativo
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return 'Ahora';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  if (diffWeeks < 4) return `Hace ${diffWeeks} semana${diffWeeks > 1 ? 's' : ''}`;
  if (diffMonths < 12) return `Hace ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
  return `Hace ${diffYears} año${diffYears > 1 ? 's' : ''}`;
};

/**
 * Formatea un número con separadores de miles
 * @param {number} num - Número a formatear
 * @returns {string} Número formateado
 */
export const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  return new Intl.NumberFormat('es-ES').format(num);
};

/**
 * Formatea cantidad monetaria en euros
 * @param {number} amount - Cantidad a formatear
 * @param {boolean} showDecimals - Mostrar decimales
 * @returns {string} Cantidad formateada
 */
export const formatCurrency = (amount, showDecimals = true) => {
  if (!amount && amount !== 0) return '0€';

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
};

/**
 * Formatea porcentaje
 * @param {number} value - Valor a formatear (0-100)
 * @param {number} decimals - Decimales a mostrar
 * @returns {string} Porcentaje formateado
 */
export const formatPercentage = (value, decimals = 0) => {
  if (!value && value !== 0) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formatea distancia en metros/kilómetros
 * @param {number} meters - Distancia en metros
 * @returns {string} Distancia formateada
 */
export const formatDistance = (meters) => {
  if (!meters && meters !== 0) return '';

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  }
};

/**
 * Formatea teléfono a formato internacional
 * @param {string} phone - Teléfono a formatear
 * @returns {string} Teléfono formateado
 */
export const formatPhoneDisplay = (phone) => {
  if (!phone) return '';

  // Limpiar
  const clean = phone.replace(/[\s\-\(\)]/g, '');

  // Si ya tiene +34
  if (clean.startsWith('+34')) {
    const number = clean.slice(3);
    return `+34 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }

  // Si tiene 9 dígitos
  if (clean.length === 9) {
    return `+34 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }

  return phone;
};

/**
 * Trunca texto y añade "..."
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Capitaliza primera letra
 * @param {string} text - Texto a capitalizar
 * @returns {string} Texto capitalizado
 */
export const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Capitaliza cada palabra (Title Case)
 * @param {string} text - Texto a capitalizar
 * @returns {string} Texto en Title Case
 */
export const toTitleCase = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Genera iniciales de un nombre
 * @param {string} name - Nombre completo
 * @returns {string} Iniciales (máx 2 letras)
 */
export const getInitials = (name) => {
  if (!name) return '?';

  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Formatea tamaño de archivo
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Formatea horario de negocio
 * @param {object} hours - Objeto de horarios
 * @returns {string} Horario formateado
 */
export const formatBusinessHours = (hours) => {
  if (!hours) return 'No disponible';

  // Ejemplo: { open: "09:00", close: "20:00" }
  if (hours.open && hours.close) {
    return `${hours.open} - ${hours.close}`;
  }

  return 'Horario no especificado';
};

/**
 * Pluraliza una palabra según cantidad
 * @param {number} count - Cantidad
 * @param {string} singular - Forma singular
 * @param {string} plural - Forma plural (opcional)
 * @returns {string} Texto pluralizado
 */
export const pluralize = (count, singular, plural) => {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
};

/**
 * Genera slug desde texto (URL-friendly)
 * @param {string} text - Texto a convertir
 * @returns {string} Slug
 */
export const slugify = (text) => {
  if (!text) return '';

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno
    .trim();
};

/**
 * Extrae número de texto (ej: "Hace 3 días" -> 3)
 * @param {string} text - Texto con número
 * @returns {number|null} Número extraído
 */
export const extractNumber = (text) => {
  if (!text) return null;
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

/**
 * Calcula tiempo de lectura estimado
 * @param {string} text - Texto a analizar
 * @param {number} wpm - Palabras por minuto (default: 200)
 * @returns {string} Tiempo estimado
 */
export const estimateReadingTime = (text, wpm = 200) => {
  if (!text) return '0 min';

  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wpm);

  return `${minutes} min`;
};

/**
 * Formatea rating de estrellas
 * @param {number} rating - Rating (0-5)
 * @returns {string} Rating formateado
 */
export const formatRating = (rating) => {
  if (!rating && rating !== 0) return '0.0';
  return rating.toFixed(1);
};

/**
 * Comprueba si una fecha es hoy
 * @param {string|Date} date - Fecha a comprobar
 * @returns {boolean} Es hoy
 */
export const isToday = (date) => {
  const today = new Date();
  const d = new Date(date);
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Comprueba si una fecha es esta semana
 * @param {string|Date} date - Fecha a comprobar
 * @returns {boolean} Es esta semana
 */
export const isThisWeek = (date) => {
  const now = new Date();
  const d = new Date(date);
  const diffTime = Math.abs(now - d);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
};

/**
 * Obtiene nombre del día de la semana
 * @param {string|Date} date - Fecha
 * @param {string} format - 'short' | 'long'
 * @returns {string} Nombre del día
 */
export const getDayName = (date, format = 'long') => {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    weekday: format,
  });
};

export default {
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatDistance,
  formatPhoneDisplay,
  truncateText,
  capitalize,
  toTitleCase,
  getInitials,
  formatFileSize,
  formatBusinessHours,
  pluralize,
  slugify,
  extractNumber,
  estimateReadingTime,
  formatRating,
  isToday,
  isThisWeek,
  getDayName,
};
