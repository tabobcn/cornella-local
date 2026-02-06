// ==============================================
// FUNCIONES HELPER GENERALES
// ==============================================

/**
 * Debounce - Retrasa la ejecución de una función
 * Útil para búsquedas en tiempo real
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle - Limita la frecuencia de ejecución
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Límite en ms
 * @returns {Function} Función throttled
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} Éxito de la operación
 */
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  } catch (err) {
    console.error('Error copiando al portapapeles:', err);
    return false;
  }
};

/**
 * Comparte contenido usando Web Share API (móvil)
 * @param {object} data - { title, text, url }
 * @returns {Promise<boolean>} Éxito de la operación
 */
export const shareContent = async (data) => {
  try {
    if (navigator.share) {
      await navigator.share(data);
      return true;
    } else {
      // Fallback: copiar URL al portapapeles
      if (data.url) {
        return await copyToClipboard(data.url);
      }
      return false;
    }
  } catch (err) {
    // Usuario canceló o error
    if (err.name !== 'AbortError') {
      console.error('Error compartiendo:', err);
    }
    return false;
  }
};

/**
 * Comprueba si estamos en dispositivo móvil
 * @returns {boolean} Es móvil
 */
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Comprueba si estamos en iOS
 * @returns {boolean} Es iOS
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

/**
 * Comprueba si la app está instalada como PWA
 * @returns {boolean} Es PWA instalada
 */
export const isPWA = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
};

/**
 * Scroll suave a un elemento
 * @param {string} elementId - ID del elemento
 * @param {number} offset - Offset en px
 */
export const scrollToElement = (elementId, offset = 0) => {
  const element = document.getElementById(elementId);
  if (element) {
    const y = element.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
};

/**
 * Scroll al inicio de la página
 */
export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Genera un ID único simple
 * @returns {string} ID único
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Genera un color aleatorio (hex)
 * @returns {string} Color hex
 */
export const randomColor = () => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
};

/**
 * Espera X milisegundos (helper para async/await)
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise} Promesa que se resuelve después de ms
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Agrupa array por propiedad
 * @param {Array} array - Array a agrupar
 * @param {string} key - Propiedad por la que agrupar
 * @returns {object} Objeto con arrays agrupados
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Elimina duplicados de un array
 * @param {Array} array - Array con duplicados
 * @param {string} key - Propiedad única (opcional)
 * @returns {Array} Array sin duplicados
 */
export const removeDuplicates = (array, key = null) => {
  if (!key) {
    return [...new Set(array)];
  }

  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

/**
 * Ordena array por propiedad
 * @param {Array} array - Array a ordenar
 * @param {string} key - Propiedad por la que ordenar
 * @param {string} order - 'asc' | 'desc'
 * @returns {Array} Array ordenado
 */
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Combina clases CSS (útil con Tailwind)
 * @param  {...any} classes - Clases a combinar
 * @returns {string} String de clases
 */
export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Formatea error de Supabase
 * @param {object} error - Error de Supabase
 * @returns {string} Mensaje de error legible
 */
export const formatSupabaseError = (error) => {
  if (!error) return 'Error desconocido';

  // Errores comunes
  if (error.code === '23505') return 'Este registro ya existe';
  if (error.code === '23503') return 'Referencia inválida';
  if (error.code === '42501') return 'No tienes permiso para esta acción';
  if (error.message?.includes('JWT')) return 'Sesión expirada. Vuelve a iniciar sesión';

  return error.message || 'Error en la operación';
};

/**
 * Retry automático para funciones asíncronas
 * @param {Function} fn - Función a ejecutar
 * @param {number} retries - Número de reintentos
 * @param {number} delay - Delay entre reintentos (ms)
 * @returns {Promise} Resultado de la función
 */
export const retryAsync = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;

    await sleep(delay);
    return retryAsync(fn, retries - 1, delay * 2); // Exponential backoff
  }
};

/**
 * Valida si un objeto está vacío
 * @param {object} obj - Objeto a validar
 * @returns {boolean} Está vacío
 */
export const isEmpty = (obj) => {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  if (typeof obj === 'string') return obj.trim().length === 0;
  return false;
};

/**
 * Deep clone de un objeto
 * @param {any} obj - Objeto a clonar
 * @returns {any} Clon profundo
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Obtiene valor anidado de objeto de forma segura
 * @param {object} obj - Objeto
 * @param {string} path - Path (ej: "user.profile.name")
 * @param {any} defaultValue - Valor por defecto
 * @returns {any} Valor encontrado o default
 */
export const getNestedValue = (obj, path, defaultValue = null) => {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return defaultValue;
    }
  }

  return result !== undefined ? result : defaultValue;
};

/**
 * Calcula distancia entre dos coordenadas (Haversine)
 * @param {number} lat1 - Latitud 1
 * @param {number} lon1 - Longitud 1
 * @param {number} lat2 - Latitud 2
 * @param {number} lon2 - Longitud 2
 * @returns {number} Distancia en metros
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Comprueba si un string es JSON válido
 * @param {string} str - String a validar
 * @returns {boolean} Es JSON válido
 */
export const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

/**
 * Parsea query params de URL
 * @param {string} url - URL con query params
 * @returns {object} Objeto con params
 */
export const parseQueryParams = (url) => {
  const params = {};
  const queryString = url.split('?')[1];

  if (!queryString) return params;

  queryString.split('&').forEach(param => {
    const [key, value] = param.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });

  return params;
};

/**
 * Genera query string desde objeto
 * @param {object} params - Objeto de parámetros
 * @returns {string} Query string
 */
export const buildQueryString = (params) => {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
};

export default {
  debounce,
  throttle,
  copyToClipboard,
  shareContent,
  isMobile,
  isIOS,
  isPWA,
  scrollToElement,
  scrollToTop,
  generateId,
  randomColor,
  sleep,
  groupBy,
  removeDuplicates,
  sortBy,
  classNames,
  formatSupabaseError,
  retryAsync,
  isEmpty,
  deepClone,
  getNestedValue,
  calculateDistance,
  isValidJSON,
  parseQueryParams,
  buildQueryString,
};
