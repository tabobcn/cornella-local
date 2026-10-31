// CornellaLocal - Plataforma de comercio local
import { useState, useEffect, useRef, useMemo, useCallback, Component, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { getTagsForCategory } from './data/businessTags';
import { getTagsBySubcategory, hasTagsForSubcategory } from './data/businessTagsByCategory';
import {
  Home, Map, Tag, Heart, User, Search, Bell, ChevronDown, SlidersHorizontal,
  Clock, Plus, Star, MapPin, UtensilsCrossed, ShoppingBasket, Shirt, Wrench,
  HeartPulse, Armchair, Store, MoreHorizontal, Zap, ArrowLeft, Share2,
  Phone, MessageCircle, Globe, Hammer, Paintbrush, Key, Lightbulb, Droplet,
  ChevronRight, Navigation, Settings, Edit3, Shield, LogOut, Mic, Locate,
  Filter, Compass, Coffee, ShoppingBag, Building2, MessageSquare, PiggyBank,
  Calendar, Ticket, TrendingUp, Award, Lock, Truck, Menu, Info, ChevronUp,
  BadgeCheck, Mail, Eye, EyeOff, Check, KeyRound, RotateCcw, HelpCircle,
  Beer, Pizza, IceCream, Cake, Apple, Beef, Fish, Croissant, Leaf, Baby,
  Footprints, Watch, Gem, Scissors, Car, Pill, Smile, Activity, Sparkles,
  Dumbbell, Lamp, Refrigerator, Bed, Flower2, Tent, PenTool, BookOpen,
  Flower, Camera, PawPrint, Gamepad2, ShoppingCart, Smartphone, Copyright,
  RefreshCw, Send, Pause, Timer, Edit2, Trash2, Users, FileText, Briefcase,
  Archive, X, ArrowRight, UserSearch, ClipboardList, Upload, CheckCircle2, UserCheck,
  ExternalLink, PartyPopper, Image, FileUp, CircleDot, LayoutDashboard, CreditCard,
  BellRing, BellOff, Languages, History, Trash, AlertCircle, ChevronLeft,
  Volume2, VolumeX, Moon, Sun, Vibrate, TreePine, Snowflake, Wine,
  Sandwich, Utensils, Circle, Droplets, Hand, MousePointerClick, Flag,
  ShieldAlert, UserCog, BarChart3, XCircle, UserX, ShieldOff, CheckCircle, AlertTriangle, Cookie, Percent, Scale, Download
} from 'lucide-react';

import {
  categories, navItems, termsAndConditions,
  userReviews, userJobApplications, businessOffers
} from './data/mockData';

// Utilidades y Helpers
import { LIMITS, TIMING, ERROR_MESSAGES, SUCCESS_MESSAGES, SERVICE_CATEGORIES, REGEX_PATTERNS } from './constants';
import { formatDate, formatRelativeTime, formatCurrency, getInitials, pluralize } from './utils/formatters';
import { debounce, copyToClipboard, shareContent, formatSupabaseError, scrollToTop } from './utils/helpers';
import {
  BusinessListSkeleton,
  BusinessCardSkeleton,
  OfferCardSkeleton,
  OfferListSkeleton,
  JobCardSkeleton,
  JobListSkeleton,
  BusinessDetailSkeleton,
  NotificationSkeleton,
  ReviewSkeleton,
  ApplicationSkeleton,
  StatCardSkeleton,
  CategoryGridSkeleton
} from './components/LoadingSkeletons';
import { DeleteConfirmModal, DeactivateConfirmModal } from './components/ConfirmModal';

// Pantallas de propietario, administración y textos legales: se descargan solo al abrirlas.
// Si falla la descarga (p. ej. tras un despliegue nuevo los ficheros antiguos ya no existen),
// se recarga la página una vez para obtener la versión actual.
const CHUNK_RELOAD_KEY = 'chunk-reload-at';
const lazyNamed = (loader, name) => lazy(() => loader()
  .then((m) => {
    try { sessionStorage.removeItem(CHUNK_RELOAD_KEY); } catch (e) { /* sin almacenamiento */ }
    return { default: m[name] };
  })
  .catch((error) => {
    let last = 0;
    try { last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0); } catch (e) { /* sin almacenamiento */ }
    if (Date.now() - last > 30000) {
      try { sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now())); } catch (e) { /* sin almacenamiento */ }
      window.location.reload();
      return new Promise(() => {});
    }
    throw error;
  }));

const PageLoadingFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    <span className="sr-only">Cargando…</span>
  </div>
);
const loadOwnerScreens = () => import('./screens/owner.jsx');
const IncomingBudgetRequestsScreen = lazyNamed(loadOwnerScreens, 'IncomingBudgetRequestsScreen');
const BusinessOffersScreen = lazyNamed(loadOwnerScreens, 'BusinessOffersScreen');
const BusinessJobsScreen = lazyNamed(loadOwnerScreens, 'BusinessJobsScreen');
const BusinessCandidatesScreen = lazyNamed(loadOwnerScreens, 'BusinessCandidatesScreen');
const CreateJobOfferScreen = lazyNamed(loadOwnerScreens, 'CreateJobOfferScreen');
const BusinessDataScreen = lazyNamed(loadOwnerScreens, 'BusinessDataScreen');
const BusinessVerificationScreen = lazyNamed(loadOwnerScreens, 'BusinessVerificationScreen');
const BusinessAppealScreen = lazyNamed(loadOwnerScreens, 'BusinessAppealScreen');
const EditBusinessScreen = lazyNamed(loadOwnerScreens, 'EditBusinessScreen');
const CreateOfferScreen = lazyNamed(loadOwnerScreens, 'CreateOfferScreen');
const ValidateCodeScreen = lazyNamed(loadOwnerScreens, 'ValidateCodeScreen');
const BusinessOwnerDashboard = lazyNamed(loadOwnerScreens, 'BusinessOwnerDashboard');
const BusinessStatsScreen = lazyNamed(loadOwnerScreens, 'BusinessStatsScreen');
const loadAdminScreens = () => import('./screens/admin.jsx');
const AdminUsersScreen = lazyNamed(loadAdminScreens, 'AdminUsersScreen');
const AdminSupportScreen = lazyNamed(loadAdminScreens, 'AdminSupportScreen');
const AdminDashboard = lazyNamed(loadAdminScreens, 'AdminDashboard');
const AdminAllBusinessesScreen = lazyNamed(loadAdminScreens, 'AdminAllBusinessesScreen');
const BusinessApprovalScreen = lazyNamed(loadAdminScreens, 'BusinessApprovalScreen');
const BusinessAnalyticsScreen = lazyNamed(loadAdminScreens, 'BusinessAnalyticsScreen');
const ReportsScreen = lazyNamed(loadAdminScreens, 'ReportsScreen');
const AdminServicesScreen = lazyNamed(loadAdminScreens, 'AdminServicesScreen');
const AdminInstagramScreen = lazyNamed(loadAdminScreens, 'AdminInstagramScreen');
const AdminReviewsScreen = lazyNamed(loadAdminScreens, 'AdminReviewsScreen');
const loadLegalScreens = () => import('./screens/legal.jsx');
const TermsScreen = lazyNamed(loadLegalScreens, 'TermsScreen');
const PrivacyPolicyScreen = lazyNamed(loadLegalScreens, 'PrivacyPolicyScreen');
const LegalNoticeScreen = lazyNamed(loadLegalScreens, 'LegalNoticeScreen');
const CookiesPolicyScreen = lazyNamed(loadLegalScreens, 'CookiesPolicyScreen');


// ==============================================
// FUNCIONES HELPER
// ==============================================

export const getPrivateStoragePath = (value, bucketName) => {
  if (!value) return '';
  const raw = String(value);

  try {
    const url = new URL(raw);
    const markers = [
      `/storage/v1/object/public/${bucketName}/`,
      `/storage/v1/object/sign/${bucketName}/`,
      `/storage/v1/object/authenticated/${bucketName}/`,
    ];
    const marker = markers.find(item => url.pathname.includes(item));
    if (marker) {
      return decodeURIComponent(url.pathname.split(marker)[1] || '');
    }
  } catch {
    // El valor ya puede ser un path de Storage.
  }

  return raw.replace(/^\/+/, '');
};

const getFileNameFromStorageRef = (value, bucketName) => {
  const path = getPrivateStoragePath(value, bucketName);
  return path.split('/').pop() || 'documento';
};

export const createPrivateSignedUrl = async (bucketName, value, expiresIn = 300) => {
  const path = getPrivateStoragePath(value, bucketName);
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data?.signedUrl || null;
};


export const VerificationDocumentCard = ({ documentRef, index, onRemove, layout = 'large' }) => {
  const [signedUrl, setSignedUrl] = useState('');
  const fileName = getFileNameFromStorageRef(documentRef, 'verification-documents');
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  const isPDF = fileExt === 'pdf';

  useEffect(() => {
    let active = true;
    createPrivateSignedUrl('verification-documents', documentRef)
      .then(url => { if (active) setSignedUrl(url || ''); })
      .catch(() => { if (active) setSignedUrl(''); });
    return () => { active = false; };
  }, [documentRef]);

  if (layout === 'row') {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
          {isPDF || !signedUrl ? (
            <FileText className="text-blue-600" size={24} />
          ) : (
            <img src={signedUrl} alt={`Documento ${index + 1}`} className="w-full h-full object-cover rounded-xl" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{isPDF ? 'Documento PDF' : 'Imagen'}</p>
          <p className="text-xs text-gray-500">Documento {index + 1} - {fileExt.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={signedUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!signedUrl}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${signedUrl ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-100 text-gray-500 pointer-events-none'}`}
          >
            <ExternalLink size={16} />
          </a>
          {onRemove && (
            <button aria-label="Eliminar"
              onClick={() => onRemove(documentRef)}
              className="w-9 h-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-blue-300 transition-all">
      {!isPDF && signedUrl ? (
        <div className="w-full h-48 bg-gray-100">
          <img src={signedUrl} alt={`Documento ${index + 1}`} className="w-full h-full object-contain" />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
          <FileText className="text-red-500" size={64} />
        </div>
      )}
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">{isPDF ? 'Documento PDF' : 'Imagen'}</p>
          <p className="text-xs text-gray-500">Documento #{index + 1} - {fileExt.toUpperCase()}</p>
        </div>
        <a
          href={signedUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!signedUrl}
          className={`h-10 px-4 rounded-lg font-medium transition-colors flex items-center gap-2 ${signedUrl ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 pointer-events-none'}`}
        >
          <ExternalLink size={16} />
          Abrir
        </a>
      </div>
    </div>
  );
};


/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} - Distancia en kilómetros
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

/**
 * Sistema de Moderación: Detecta contenido inapropiado en texto
 * @param {string} text - Texto a analizar
 * @returns {Object} - { isClean: boolean, reason: string|null, severity: 'low'|'medium'|'high' }
 */
const moderateContent = (text) => {
  if (!text || typeof text !== 'string') {
    return { isClean: true, reason: null, severity: null };
  }

  const lowerText = text.toLowerCase().trim();

  // Lista de palabras prohibidas (spam, insultos, contenido inapropiado)
  const bannedWords = [
    // Spam y publicidad
    'compra aqui', 'click aqui', 'gana dinero', 'oferta limitada', 'llama ya',
    'whatsapp', 'telefono', 'email', 'web:', 'www.', 'http', '.com', '.es',
    // Insultos y lenguaje ofensivo (versión suave para producción)
    'mierda', 'puto', 'puta', 'idiota', 'estafa', 'robo', 'ladron', 'timador'
  ];

  // Detectar palabras prohibidas
  for (const word of bannedWords) {
    if (lowerText.includes(word)) {
      return {
        isClean: false,
        reason: `Contenido prohibido detectado: "${word}"`,
        severity: word.includes('.com') || word.includes('http') ? 'high' : 'medium'
      };
    }
  }

  // Detectar spam (caracteres repetidos)
  const repeatedChars = /(.)\1{4,}/g; // Más de 4 caracteres iguales seguidos
  if (repeatedChars.test(text)) {
    return {
      isClean: false,
      reason: 'Spam detectado: caracteres repetidos excesivamente',
      severity: 'low'
    };
  }

  // Detectar mayúsculas excesivas (más del 60% en mayúsculas)
  const uppercaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (text.length > 20 && uppercaseRatio > 0.6) {
    return {
      isClean: false,
      reason: 'Spam detectado: uso excesivo de mayúsculas',
      severity: 'low'
    };
  }

  // Detectar números de teléfono (España)
  const phonePattern = /(\+34|0034|34)?[\s\-]?[6-9]\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}/g;
  if (phonePattern.test(text)) {
    return {
      isClean: false,
      reason: 'No se permite incluir números de teléfono',
      severity: 'high'
    };
  }

  // Detectar emails
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailPattern.test(text)) {
    return {
      isClean: false,
      reason: 'No se permite incluir direcciones de email',
      severity: 'high'
    };
  }

  // Todo OK
  return { isClean: true, reason: null, severity: null };
};

/**
 * Calcula si un negocio está abierto basándose en su horario y la hora actual
 * @param {Object} openingHours - Objeto con horarios del negocio
 * @returns {Object} - { isOpen: boolean, status: 'open'|'closed'|'closing_soon', message: string }
 */
const getBusinessStatus = (openingHours) => {
  if (!openingHours) {
    return { isOpen: false, status: 'unknown', message: 'Sin horario' };
  }

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutos desde medianoche

  const daySchedule = openingHours[currentDay];

  // Si no hay horario para hoy o está deshabilitado
  if (!daySchedule || !daySchedule.enabled) {
    return { isOpen: false, status: 'closed', message: 'Cerrado' };
  }

  // Función para convertir "HH:MM" a minutos desde medianoche
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Verificar horario de mañana
  const morningStart = timeToMinutes(daySchedule.morning?.start);
  const morningEnd = timeToMinutes(daySchedule.morning?.end);

  // Verificar horario de tarde
  const afternoonStart = timeToMinutes(daySchedule.afternoon?.start);
  const afternoonEnd = timeToMinutes(daySchedule.afternoon?.end);

  // Comprobar si está abierto en horario de mañana
  if (morningStart !== null && morningEnd !== null) {
    if (currentTime >= morningStart && currentTime < morningEnd) {
      // Verificar si cierra pronto (menos de 30 minutos)
      if (morningEnd - currentTime <= 30) {
        return { isOpen: true, status: 'closing_soon', message: 'Cierra pronto' };
      }
      return { isOpen: true, status: 'open', message: 'Abierto' };
    }
  }

  // Comprobar si está abierto en horario de tarde
  if (afternoonStart !== null && afternoonEnd !== null) {
    if (currentTime >= afternoonStart && currentTime < afternoonEnd) {
      // Verificar si cierra pronto (menos de 30 minutos)
      if (afternoonEnd - currentTime <= 30) {
        return { isOpen: true, status: 'closing_soon', message: 'Cierra pronto' };
      }
      return { isOpen: true, status: 'open', message: 'Abierto' };
    }
  }

  return { isOpen: false, status: 'closed', message: 'Cerrado' };
};

// ==============================================
// COMPONENTES REUTILIZABLES
// ==============================================

// Mapeo de iconos string a componentes Lucide
const iconMap = {
  Home, Map, Tag, Heart, User, Search, Bell, Clock, Plus, Star, MapPin,
  UtensilsCrossed, ShoppingBasket, Shirt, Wrench, HeartPulse, Armchair,
  Store, MoreHorizontal, Zap, ArrowLeft, Share2, Phone, MessageCircle,
  Globe, Hammer, Paintbrush, Key, Lightbulb, Droplet, ChevronRight,
  Navigation, Settings, Edit3, Shield, LogOut, Mic, Locate, Filter,
  Compass, Coffee, ShoppingBag, Building2, MessageSquare, PiggyBank,
  Calendar, Ticket, TrendingUp, Award, Lock, Truck, Menu, Info, ChevronUp,
  BadgeCheck, Mail, Eye, EyeOff, Check, KeyRound, RotateCcw, HelpCircle,
  Beer, Pizza, IceCream, Cake, Apple, Beef, Fish, Croissant, Leaf, Baby,
  Footprints, Watch, Gem, Scissors, Car, Pill, Smile, Activity, Sparkles,
  Dumbbell, Lamp, Refrigerator, Bed, Flower2, Tent, PenTool, BookOpen,
  Flower, Camera, PawPrint, Gamepad2, ShoppingCart, Smartphone, Copyright,
  RefreshCw, Send, Pause, Timer, Edit2, Trash2, Users, FileText, Briefcase,
  Archive, X, ArrowRight, UserSearch, ClipboardList, Upload, CheckCircle2, UserCheck,
  ExternalLink, PartyPopper, Image, FileUp, CircleDot, LayoutDashboard, CreditCard,
  BellRing, BellOff, Languages, History, Trash, AlertCircle, ChevronLeft,
  Volume2, VolumeX, Moon, Sun, Vibrate, TreePine, Snowflake, Wine,
  Sandwich, Utensils, Circle, Droplets, Hand, MousePointerClick,
  AlertTriangle, Cookie, Percent, Scale, SlidersHorizontal,
};

// Foto de perfil con respaldo: si no hay foto o no carga (p. ej. Google limita las peticiones),
// se muestran las iniciales en vez del icono de imagen rota.
export const UserAvatar = ({ url, name, className = '', fallbackClassName = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  if (url && !failed) {
    return <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className} />;
  }
  return <div className={fallbackClassName} aria-hidden="true">{getInitials(name || 'U')}</div>;
};

export const Icon = ({ name, className = "", size = 24 }) => {
  const IconComponent = iconMap[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} size={size} />;
};

// Componente de Estado Vacío con ilustración
const EmptyState = ({ icon, title, description, actionLabel, onAction, color = 'blue' }) => {
  const colors = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-400', ring: 'ring-blue-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-400', ring: 'ring-orange-100' },
    green: { bg: 'bg-green-50', icon: 'text-green-400', ring: 'ring-green-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-400', ring: 'ring-purple-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-400', ring: 'ring-red-100' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className={`w-24 h-24 ${c.bg} rounded-full flex items-center justify-center mb-6 ring-8 ${c.ring}`}>
        <Icon name={icon} size={40} className={c.icon} />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// Componente Toast para notificaciones
const Toast = ({ message, type = 'success', isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      // Los avisos largos (motivo de suspensión, errores con instrucciones) duran más
      const timer = setTimeout(() => {
        onClose();
      }, Math.min(9000, Math.max(3000, (message?.length || 0) * 55)));
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, message]);

  if (!isVisible) return null;

  const types = {
    success: { bg: 'bg-green-700', icon: 'CheckCircle2' },
    error: { bg: 'bg-red-600', icon: 'AlertCircle' },
    info: { bg: 'bg-blue-600', icon: 'Info' },
    warning: { bg: 'bg-orange-700', icon: 'AlertCircle' },
  };
  const t = types[type] || types.success;

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[calc(100%-32px)] animate-in slide-in-from-top fade-in duration-300"
    >
      <div className={`${t.bg} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3`}>
        <Icon name={t.icon} size={20} className="shrink-0" />
        <span className="text-sm font-medium flex-1">{message}</span>
        <button aria-label="Cerrar" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

// ==============================================
// FUNCIONES DE VALIDACIÓN Y FORMATEO
// ==============================================

// Validación de email
const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'El email es obligatorio' };
  }
  if (!REGEX_PATTERNS.email.test(email)) {
    return { isValid: false, error: 'Email no válido' };
  }
  return { isValid: true, error: null };
};

// Validación de teléfono español
const validatePhone = (phone) => {
  if (!phone || phone.trim() === '') {
    return { isValid: false, error: 'El teléfono es obligatorio' };
  }
  // Eliminar espacios, guiones y paréntesis
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  // Validar formato español
  if (!REGEX_PATTERNS.phoneSpanish.test(cleanPhone)) {
    return { isValid: false, error: 'Teléfono no válido (ej: 612345678)' };
  }
  return { isValid: true, error: null };
};

// Formatear teléfono español (añadir +34 si no lo tiene)
const formatPhone = (phone) => {
  if (!phone) return '';
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  if (cleanPhone.startsWith('+34')) return cleanPhone;
  if (cleanPhone.startsWith('0034')) return '+34' + cleanPhone.slice(4);
  if (cleanPhone.length === 9) return '+34' + cleanPhone;
  return cleanPhone;
};

// Validación de campo requerido
const validateRequired = (value, fieldName = 'Este campo') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: false, error: `${fieldName} es obligatorio` };
  }
  return { isValid: true, error: null };
};

// Validación de longitud mínima
const validateMinLength = (value, minLength, fieldName = 'Este campo') => {
  if (!value || value.length < minLength) {
    return { isValid: false, error: `${fieldName} debe tener al menos ${minLength} caracteres` };
  }
  return { isValid: true, error: null };
};

// Validación de longitud máxima
const validateMaxLength = (value, maxLength, fieldName = 'Este campo') => {
  if (value && value.length > maxLength) {
    return { isValid: false, error: `${fieldName} no puede superar los ${maxLength} caracteres` };
  }
  return { isValid: true, error: null };
};

// Validación de URL
const validateUrl = (url) => {
  if (!url || url.trim() === '') {
    return { isValid: true, error: null }; // URL es opcional
  }
  try {
    new URL(url);
    return { isValid: true, error: null };
  } catch {
    return { isValid: false, error: 'URL no válida (debe empezar con http:// o https://)' };
  }
};

// Verificar antigüedad de cuenta (para reseñas: mínimo 30 días)
const verifyAccountAge = (userCreatedAt, minDays = 30) => {
  if (!userCreatedAt) {
    return { isValid: false, error: 'No se pudo verificar la fecha de creación de la cuenta', daysOld: 0 };
  }

  const createdDate = new Date(userCreatedAt);
  const now = new Date();
  const diffTime = Math.abs(now - createdDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < minDays) {
    const remainingDays = minDays - diffDays;
    return {
      isValid: false,
      error: `Tu cuenta debe tener al menos ${minDays} días para publicar reseñas (faltan ${remainingDays} días)`,
      daysOld: diffDays
    };
  }

  return { isValid: true, error: null, daysOld: diffDays };
};

// Validación de código postal español
const validatePostalCode = (postalCode) => {
  if (!postalCode || postalCode.trim() === '') {
    return { isValid: false, error: 'El código postal es obligatorio' };
  }
  const postalCodeRegex = /^[0-5]\d{4}$/;
  if (!postalCodeRegex.test(postalCode)) {
    return { isValid: false, error: 'Código postal no válido (5 dígitos, ej: 08940)' };
  }
  return { isValid: true, error: null };
};

// Validación de NIF/CIF/NIE español
const validateNifCif = (nifCif) => {
  if (!nifCif || nifCif.trim() === '') {
    return { isValid: true, error: null }; // Es opcional
  }
  const cleanNif = nifCif.toUpperCase().replace(/[\s\-]/g, '');
  // Formatos válidos: NIF (8 dígitos + letra), CIF (letra + 7 dígitos + dígito/letra), NIE (X/Y/Z + 7 dígitos + letra)
  const nifRegex = /^(\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9]|[XYZ]\d{7}[A-Z])$/;
  if (!nifRegex.test(cleanNif)) {
    return { isValid: false, error: 'NIF/CIF/NIE no válido' };
  }
  return { isValid: true, error: null };
};

// Sanitizar texto (prevenir XSS básico)
const sanitizeText = (text) => {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Componente de Onboarding
const OnboardingScreen = ({ onComplete, onCompleteWithNotifications }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      icon: 'Store',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      title: '¡Bienvenido a Cornellà Local!',
      subtitle: 'Tu app del comercio de proximidad',
      description: 'Descubre todos los negocios de Cornellà de Llobregat en un solo lugar. Apoya al comercio local y encuentra todo lo que necesitas cerca de ti.',
      features: [
        { icon: 'MapPin', text: 'Negocios de tu barrio' },
        { icon: 'Heart', text: 'Apoya el comercio local' },
        { icon: 'Star', text: 'Opiniones reales' },
      ],
    },
    {
      id: 2,
      icon: 'Zap',
      iconBg: 'bg-gradient-to-br from-orange-500 to-red-500',
      title: 'Ofertas Flash Exclusivas',
      subtitle: 'Ahorra en tus compras diarias',
      description: 'Accede a descuentos especiales y ofertas por tiempo limitado de los comercios de tu zona. ¡No te pierdas ninguna oportunidad!',
      features: [
        { icon: 'Tag', text: 'Descuentos exclusivos' },
        { icon: 'Clock', text: 'Ofertas por tiempo limitado' },
        { icon: 'Ticket', text: 'Cupones digitales' },
      ],
    },
    {
      id: 3,
      icon: 'Wrench',
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      title: 'Solicita Presupuestos',
      subtitle: 'Profesionales verificados a tu alcance',
      description: 'Necesitas un fontanero, electricista o pintor? Envía tu solicitud y recibe presupuestos de profesionales verificados de Cornellà en menos de 24h.',
      features: [
        { icon: 'BadgeCheck', text: 'Profesionales verificados' },
        { icon: 'MessageSquare', text: 'Respuesta en 24h' },
        { icon: 'Shield', text: 'Garantía de calidad' },
      ],
    },
    {
      id: 4,
      icon: 'Briefcase',
      iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      title: 'Empleo Local',
      subtitle: 'Oportunidades cerca de casa',
      description: 'Encuentra ofertas de trabajo en negocios de tu barrio. Trabaja cerca de casa y contribuye a la economía local de Cornellà.',
      features: [
        { icon: 'Building2', text: 'Empresas locales' },
        { icon: 'Users', text: 'Ambiente familiar' },
        { icon: 'TrendingUp', text: 'Crecimiento profesional' },
      ],
    },
    {
      id: 5,
      icon: 'Bell',
      iconBg: 'bg-gradient-to-br from-primary to-blue-600',
      title: 'Mantente Informado',
      subtitle: 'Activa las notificaciones',
      description: 'Recibe alertas de nuevas ofertas flash, respuestas a tus presupuestos y novedades de tus negocios favoritos. ¡No te pierdas nada!',
      features: [
        { icon: 'Zap', text: 'Ofertas flash instantáneas' },
        { icon: 'MessageCircle', text: 'Respuestas a presupuestos' },
        { icon: 'Heart', text: 'Novedades de favoritos' },
      ],
      isLastSlide: true,
    },
  ];

  const currentSlideData = slides[currentSlide];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Último slide - activar notificaciones
      if (onCompleteWithNotifications) {
        onCompleteWithNotifications();
      } else {
        onComplete();
      }
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleSkipNotifications = () => {
    onComplete();
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-white">
      {/* Skip button */}
      {currentSlide < slides.length - 1 && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-10 text-gray-500 hover:text-gray-600 text-sm font-medium transition-colors"
        >
          Saltar
        </button>
      )}

      {/* Content */}
      <div className="flex flex-col min-h-screen px-6 pt-16 pb-8">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className={`w-28 h-28 ${currentSlideData.iconBg} rounded-3xl flex items-center justify-center shadow-2xl transform transition-all duration-500`}>
            <Icon name={currentSlideData.icon} size={56} className="text-white" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{currentSlideData.title}</h1>
          <p className="text-primary font-semibold">{currentSlideData.subtitle}</p>
        </div>

        {/* Description */}
        <p className="text-center text-gray-600 mb-8 leading-relaxed">
          {currentSlideData.description}
        </p>

        {/* Features */}
        <div className="space-y-4 mb-8">
          {currentSlideData.features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl transition-all"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Icon name={feature.icon} size={24} className="text-primary" />
              </div>
              <span className="text-slate-700 font-medium">{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleNext}
            className="w-full h-14 bg-primary text-white font-bold rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
          >
            {currentSlideData.isLastSlide ? (
              <>
                <Bell size={20} />
                Activar Notificaciones y Empezar
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight size={20} />
              </>
            )}
          </button>

          {currentSlideData.isLastSlide && (
            <button
              onClick={onComplete}
              className="w-full h-12 bg-gray-100 text-gray-600 font-medium rounded-2xl hover:bg-gray-200 transition-colors"
            >
              Empezar sin notificaciones
            </button>
          )}
        </div>

        {/* Cornellà branding */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Hecho con ❤️ para Cornellà de Llobregat
        </p>
      </div>
    </div>
  );
};

// Componente de Solicitud de Permisos de Notificación
const NotificationPermissionModal = ({ isOpen, onClose, onEnable, onSkip }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Bell size={40} className="text-white" />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
          Activa las notificaciones
        </h3>
        <p className="text-gray-500 text-center text-sm mb-6">
          Recibe alertas instantáneas de ofertas flash, respuestas a presupuestos y novedades de tus negocios favoritos.
        </p>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-orange-500" />
            </div>
            <span className="text-slate-700">Ofertas flash antes que nadie</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageSquare size={16} className="text-green-500" />
            </div>
            <span className="text-slate-700">Respuestas a tus presupuestos</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Heart size={16} className="text-red-500" />
            </div>
            <span className="text-slate-700">Novedades de favoritos</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onEnable}
            className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <BellRing size={18} />
            Activar notificaciones
          </button>
          <button
            onClick={onSkip}
            className="w-full h-10 text-gray-500 font-medium hover:text-gray-700 transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook para Pull to Refresh
const usePullToRefresh = (onRefresh, options = {}) => {
  const { threshold = 80, resistance = 2.5 } = options;
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = (currentY - startY) / resistance;
    if (diff > 0) {
      setPullDistance(Math.min(diff, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    setIsPulling(false);
  };

  return {
    pullDistance,
    isRefreshing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};

// Componente Pull to Refresh Indicator mejorado
const PullToRefreshIndicator = ({ pullDistance, isRefreshing, threshold = 80 }) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const isReady = progress >= 1;

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-50 flex flex-col items-center justify-center transition-all duration-200"
      style={{ top: Math.max(pullDistance - 50, 8) }}
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
          isRefreshing
            ? 'bg-primary shadow-lg shadow-primary/30'
            : isReady
              ? 'bg-primary shadow-lg shadow-primary/30'
              : 'bg-white shadow-lg border border-gray-100'
        }`}
      >
        {isRefreshing ? (
          <RefreshCw size={22} className="text-white animate-spin" />
        ) : (
          <RefreshCw
            size={22}
            className={`transition-all duration-200 ${isReady ? 'text-white' : 'text-primary'}`}
            style={{ transform: `rotate(${progress * 360}deg)` }}
          />
        )}
      </div>
      <span className={`text-xs font-medium mt-2 transition-all duration-200 ${
        isRefreshing ? 'text-primary' : isReady ? 'text-primary' : 'text-gray-500'
      }`}>
        {isRefreshing ? 'Actualizando...' : isReady ? 'Suelta para actualizar' : 'Tira hacia abajo'}
      </span>
    </div>
  );
};

// Componente de Valoración con Estrellas
const StarRating = ({ rating = 0, onRate, size = 24, readonly = false, showValue = true }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (value) => {
    if (!readonly && onRate) {
      onRate(value);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            disabled={readonly}
            className={`transition-all duration-150 ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          >
            <Star
              size={size}
              className={`transition-colors ${
                star <= displayRating
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      {showValue && rating > 0 && (
        <span className="text-sm font-semibold text-slate-700">{rating.toFixed(1)}</span>
      )}
    </div>
  );
};

// Modal para Valorar un Negocio
const RateBusinessModal = ({ isOpen, onClose, business, onSubmitRating }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (rating === 0) return;
    if (onSubmitRating) {
      onSubmitRating({
        businessId: business?.id,
        businessName: business?.name,
        rating,
        comment,
        date: new Date().toISOString(),
      });
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-white" size={36} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">¡Gracias por tu valoración!</h3>
          <p className="text-gray-500 mb-6">Tu opinión ayuda a otros usuarios y a los negocios locales.</p>
          <button
            onClick={onClose}
            className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Valorar negocio</h3>
          <button aria-label="Cerrar"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Business Info */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Store className="text-primary" size={24} />
          </div>
          <div>
            <p className="font-bold text-slate-900">{business?.name || 'Negocio'}</p>
            <p className="text-sm text-gray-500">{business?.category || 'Categoría'}</p>
          </div>
        </div>

        {/* Star Rating */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3 text-center">¿Cómo fue tu experiencia?</p>
          <div className="flex justify-center">
            <StarRating rating={rating} onRate={setRating} size={36} showValue={false} />
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            {rating === 0 && 'Toca las estrellas para valorar'}
            {rating === 1 && 'Muy malo'}
            {rating === 2 && 'Malo'}
            {rating === 3 && 'Normal'}
            {rating === 4 && 'Bueno'}
            {rating === 5 && 'Excelente'}
          </p>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Comentario (opcional)
          </label>
          <textarea aria-label="Comentario"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos tu experiencia..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          className={`w-full h-12 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            rating > 0
              ? 'bg-primary text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Star size={18} />
          Enviar valoración
        </button>
      </div>
    </div>
  );
};

// =====================================================
// MODAL DE REPORTAR NEGOCIO
// =====================================================
const ReportBusinessModal = ({ isOpen, onClose, business, user, onSubmitReport, showToast }) => {
  const [reportType, setReportType] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reportTypes = [
    { id: 'false_tags', label: 'Tags falsos o engañosos', icon: Tag, description: 'El negocio tiene etiquetas que no corresponden con la realidad' },
    { id: 'wrong_price', label: 'Precio incorrecto en oferta', icon: AlertCircle, description: 'La oferta publicada no se respeta en el local' },
    { id: 'bad_hours', label: 'Horarios incorrectos', icon: Clock, description: 'Los horarios mostrados no coinciden con los reales' },
    { id: 'fake_info', label: 'Información falsa', icon: ShieldAlert, description: 'Datos del negocio son incorrectos o engañosos' },
    { id: 'inappropriate', label: 'Contenido inapropiado', icon: AlertCircle, description: 'Fotos, descripciones u otro contenido inadecuado' },
    { id: 'other', label: 'Otro problema', icon: MoreHorizontal, description: 'Otro tipo de problema no listado' }
  ];

  const handleSubmit = async () => {
    if (!user) {
      setError('Debes iniciar sesión para reportar');
      return;
    }

    if (!reportType) {
      setError('Selecciona el tipo de problema');
      return;
    }

    if (!message.trim()) {
      setError('Describe el problema que encontraste');
      return;
    }

    if (message.trim().length < 10) {
      setError('Por favor escribe al menos 10 caracteres');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          business_id: business.id,
          report_type: reportType,
          message: message.trim(),
          status: 'pending'
        });

      if (insertError) throw insertError;


      // Llamar callback si existe
      if (onSubmitReport) {
        onSubmitReport();
      }

      // Resetear form
      setReportType('');
      setMessage('');
      onClose();

      // Mostrar confirmación
      showToast('Reporte enviado correctamente. ¡Gracias!', 'success');
    } catch (err) {
      setError('Error al enviar el reporte. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReportType('');
      setMessage('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fadeIn">
      <div
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Flag className="text-red-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Reportar problema</h3>
              <p className="text-xs text-gray-500">{business?.name}</p>
            </div>
          </div>
          <button aria-label="Cerrar"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm text-blue-800 font-medium">Tu reporte es anónimo para el negocio</p>
              <p className="text-xs text-blue-700 mt-1">
                Solo el equipo de moderación verá tu información. Revisaremos tu reporte en máximo 24 horas.
              </p>
            </div>
          </div>

          {/* Tipo de problema */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-900 mb-3">
              ¿Qué problema encontraste? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {reportTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  disabled={isSubmitting}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    reportType === type.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      reportType === type.id ? 'bg-primary/10' : 'bg-gray-100'
                    }`}>
                      <type.icon
                        size={20}
                        className={reportType === type.id ? 'text-primary' : 'text-gray-600'}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm mb-1">
                        {type.label}
                      </div>
                      <div className="text-xs text-gray-600">
                        {type.description}
                      </div>
                    </div>
                    {reportType === type.id && (
                      <CheckCircle2 className="text-primary shrink-0" size={20} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mensaje */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Describe el problema <span className="text-red-500">*</span>
            </label>
            <textarea aria-label="Describe el problema"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ejemplo: El negocio dice que tiene terraza pero no tiene. Es engañoso para los clientes..."
              className="w-full h-32 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none disabled:opacity-50 disabled:bg-gray-50"
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                💡 Sé específico para que podamos actuar rápidamente
              </p>
              <span className="text-xs text-gray-500">
                {message.length}/500
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600 shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reportType || !message.trim()}
            className="flex-1 h-12 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send size={18} />
                Enviar reporte
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de filtros avanzados
const AdvancedFiltersModal = ({
  isOpen,
  onClose,
  sortBy,
  setSortBy,
  minRating,
  setMinRating,
  priceRange,
  setPriceRange,
  onReset,
  showOnlyOpen,
  setShowOnlyOpen,
  sortByDistance,
  userLocation,
  getUserLocation,
  loadingLocation,
  setSortByDistance,
  setUserLocation,
}) => {
  if (!isOpen) return null;

  const sortOptions = [
    { id: 'relevance', label: 'Relevancia', icon: 'TrendingUp' },
    { id: 'rating', label: 'Mejor valorados', icon: 'Star' },
    { id: 'newest', label: 'Más recientes', icon: 'Clock' },
    { id: 'name', label: 'Alfabético', icon: 'SlidersHorizontal' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-slate-900">Filtros avanzados</h3>
          <button aria-label="Cerrar"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Ordenar por */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">Ordenar por</h4>
            <div className="grid grid-cols-2 gap-2">
              {sortOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    sortBy === option.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      name={option.icon}
                      size={18}
                      className={sortBy === option.id ? 'text-primary' : 'text-gray-500'}
                    />
                    {sortBy === option.id && (
                      <CheckCircle2 size={16} className="text-primary ml-auto" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    sortBy === option.id ? 'text-primary' : 'text-slate-700'
                  }`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Valoración mínima */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">Valoración mínima</h4>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => setMinRating(rating)}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    minRating === rating
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Star
                      size={20}
                      className={minRating === rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    />
                    <span className={`text-xs font-bold ${
                      minRating === rating ? 'text-primary' : 'text-gray-500'
                    }`}>
                      {rating === 0 ? 'Todo' : `${rating}+`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rango de precio (para ofertas) */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">
              Rango de precio: {priceRange[0]}€ - {priceRange[1] === 100 ? '100+€' : `${priceRange[1]}€`}
            </h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Mínimo</label>
                  <input aria-label="Mínimo"
                    type="range"
                    min="0"
                    max="100"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Máximo</label>
                  <input aria-label="Máximo"
                    type="range"
                    min="0"
                    max="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Disponibilidad */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">Disponibilidad</h4>
            <button
              onClick={() => setShowOnlyOpen(!showOnlyOpen)}
              className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                showOnlyOpen
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  showOnlyOpen ? 'bg-green-500' : 'bg-gray-100'
                }`}>
                  <Circle
                    size={12}
                    className={showOnlyOpen ? 'fill-white text-white animate-pulse' : 'fill-green-500 text-green-500'}
                  />
                </div>
                <div className="text-left">
                  <span className={`font-semibold block ${showOnlyOpen ? 'text-green-700' : 'text-slate-700'}`}>
                    Solo negocios abiertos
                  </span>
                  <span className="text-xs text-gray-500">Muestra solo los que están abiertos ahora</span>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all relative ${
                showOnlyOpen ? 'bg-green-500' : 'bg-gray-200'
              }`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  showOnlyOpen ? 'left-7' : 'left-1'
                }`} />
              </div>
            </button>
          </div>

          {/* Ordenar por distancia */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">Ubicación</h4>
            <button
              onClick={() => {
                if (sortByDistance && userLocation) {
                  setSortByDistance(false);
                  setUserLocation(null);
                } else {
                  getUserLocation();
                }
              }}
              disabled={loadingLocation}
              className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                sortByDistance && userLocation
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${loadingLocation ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  sortByDistance && userLocation ? 'bg-blue-500' : 'bg-gray-100'
                }`}>
                  {loadingLocation ? (
                    <RefreshCw size={18} className="animate-spin text-blue-500" />
                  ) : (
                    <MapPin size={18} className={sortByDistance && userLocation ? 'text-white' : 'text-gray-500'} />
                  )}
                </div>
                <div className="text-left">
                  <span className={`font-semibold block ${sortByDistance && userLocation ? 'text-blue-700' : 'text-slate-700'}`}>
                    {loadingLocation ? 'Obteniendo ubicación...' : sortByDistance && userLocation ? 'Ordenado por distancia' : 'Más cerca de ti'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {sortByDistance && userLocation ? 'Toca para desactivar' : 'Ordena negocios por proximidad'}
                  </span>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all relative ${
                sortByDistance && userLocation ? 'bg-blue-500' : 'bg-gray-200'
              }`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  sortByDistance && userLocation ? 'left-7' : 'left-1'
                }`} />
              </div>
            </button>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-5 flex gap-3">
          <button
            onClick={() => {
              onReset();
              setSortBy('relevance');
              setMinRating(0);
              setPriceRange([0, 100]);
              setShowOnlyOpen(false);
              setSortByDistance(false);
              setUserLocation(null);
            }}
            className="flex-1 h-12 bg-gray-100 text-slate-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================
// DISEÑO DE ESCRITORIO (≥1024px)
// Tres columnas: navegación a la izquierda, la app en el centro y
// información útil a la derecha. La columna central queda centrada
// para que las barras fijas de cada pantalla sigan alineadas.
// ==============================================

const DESKTOP_NAV = [
  { id: 'home', label: 'Inicio', icon: 'Home' },
  { id: 'offers', label: 'Ofertas y empleo', icon: 'Tag' },
  { id: 'budget-request', label: 'Pedir presupuesto', icon: 'ClipboardList' },
  { id: 'favorites', label: 'Favoritos', icon: 'Heart' },
  { id: 'notifications', label: 'Avisos', icon: 'Bell' },
  { id: 'profile', label: 'Mi perfil', icon: 'User' },
];

const DesktopSidebar = ({ user, currentPage, onNavigate, onAuth }) => (
  <aside aria-label="Menú lateral" className="hidden lg:flex justify-self-end w-60 sticky top-0 h-screen flex-col py-8 gap-6">
    <button onClick={() => onNavigate('home')} className="px-3 text-left" aria-label="Ir al inicio">
      <img src="/logo.png" alt="Cornellà Local" width="183" height="32" className="h-8 w-auto" />
    </button>

    <nav aria-label="Secciones" className="flex flex-col gap-1">
      {DESKTOP_NAV.map(item => {
        const active = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] transition-colors ${
              active ? 'bg-primary/10 text-primary-dark font-bold' : 'text-slate-700 hover:bg-white font-medium'
            }`}
          >
            <Icon name={item.icon} size={20} className={active ? 'text-primary-dark' : 'text-slate-600'} />
            {item.label}
          </button>
        );
      })}
      {user?.is_admin && (
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] transition-colors ${
            currentPage.startsWith('admin') ? 'bg-primary/10 text-primary-dark font-bold' : 'text-slate-700 hover:bg-white font-medium'
          }`}
        >
          <Icon name="Shield" size={20} className="text-slate-600" />
          Administración
        </button>
      )}
    </nav>

    {user ? (
      <button
        onClick={() => onNavigate('profile')}
        className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 text-left"
      >
        <UserAvatar
          url={user.avatar_url}
          name={user.full_name || user.email}
          className="w-10 h-10 rounded-full object-cover shrink-0"
          fallbackClassName="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary-dark font-bold flex items-center justify-center"
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{user.full_name || 'Mi cuenta'}</p>
          <p className="text-xs text-gray-600 truncate">{user.email}</p>
        </div>
      </button>
    ) : (
      <div className="p-4 rounded-2xl bg-white border border-gray-100 flex flex-col gap-3">
        <p className="text-sm font-bold text-slate-900">Únete gratis</p>
        <p className="text-xs text-gray-600 leading-relaxed">Guarda favoritos, consigue cupones y pide presupuestos a negocios del barrio.</p>
        <button onClick={() => onAuth('register')} className="h-10 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold">Crear cuenta</button>
        <button onClick={() => onAuth('login')} className="h-10 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-slate-900">Entrar</button>
      </div>
    )}

    <div className="mt-auto px-3 flex flex-col gap-3">
      <button
        onClick={() => (user ? onNavigate('business-data') : onAuth('register', 'profile'))}
        className="text-left text-sm font-semibold text-primary-dark hover:underline"
      >
        ¿Tienes un negocio? Date de alta gratis →
      </button>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
        <button onClick={() => onNavigate('legal-notice')} className="hover:text-primary-dark hover:underline">Aviso legal</button>
        <button onClick={() => onNavigate('privacy-policy')} className="hover:text-primary-dark hover:underline">Privacidad</button>
        <button onClick={() => onNavigate('cookies-policy')} className="hover:text-primary-dark hover:underline">Cookies</button>
        <button onClick={() => onNavigate('terms')} className="hover:text-primary-dark hover:underline">Términos</button>
        <button onClick={() => onNavigate('contact-support')} className="hover:text-primary-dark hover:underline">Contacto</button>
      </div>
    </div>
  </aside>
);

const DesktopAside = ({ user, onNavigate, onAuth }) => (
  <aside aria-label="Cómo funciona Cornellà Local" className="hidden lg:flex justify-self-start w-64 xl:w-72 sticky top-0 h-screen flex-col py-8 gap-4">
    <a href="/negocios" className="p-5 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white flex flex-col gap-2 hover:shadow-lg transition-shadow">
      <Store size={22} />
      <p className="font-bold leading-snug">Directorio de comercios de Cornellà</p>
      <p className="text-sm text-white/80 leading-relaxed">Todos los negocios del barrio, por categorías.</p>
    </a>

    <div className="p-5 rounded-2xl bg-white border border-gray-100 flex flex-col gap-3">
      <p className="font-bold text-slate-900">Cómo funciona</p>
      {[
        { icon: 'Search', text: 'Descubre comercios y servicios de tu barrio' },
        { icon: 'Ticket', text: 'Consigue cupones y ofertas exclusivas' },
        { icon: 'ClipboardList', text: 'Pide presupuestos gratis a profesionales' },
      ].map(step => (
        <div key={step.text} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon name={step.icon} size={16} className="text-primary" />
          </div>
          <p className="text-sm text-gray-600 leading-snug pt-1">{step.text}</p>
        </div>
      ))}
    </div>

    <div className="p-5 rounded-2xl bg-white border border-gray-100 flex flex-col gap-3">
      <p className="font-bold text-slate-900">Llévala en el móvil</p>
      <div className="flex items-center gap-3">
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=https%3A%2F%2Fwww.cornellalocal.es"
          alt="Código QR de www.cornellalocal.es"
          className="w-20 h-20 rounded-lg border border-gray-100"
          loading="lazy"
        />
        <p className="text-xs text-gray-600 leading-relaxed">Escanéalo y pulsa «Añadir a pantalla de inicio» para tenerla como una app.</p>
      </div>
    </div>

    <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col gap-2">
      <p className="font-bold text-slate-900">Para negocios</p>
      <p className="text-sm text-gray-600 leading-relaxed">Publica ofertas, recibe solicitudes de presupuesto y candidatos. Sin coste.</p>
      <button
        onClick={() => (user ? onNavigate('business-data') : onAuth('register', 'profile'))}
        className="self-start text-sm font-bold text-amber-700 hover:underline"
      >
        Dar de alta mi negocio →
      </button>
    </div>
  </aside>
);

// Navbar inferior reutilizable
export const Navbar = ({ currentPage, onNavigate }) => {
  const items = [
    { id: 'home', label: 'Inicio', icon: 'Home' },
    { id: 'budget-request', label: 'Presupuesto', icon: 'ClipboardList' },
    { id: 'offers', label: 'Ofertas', icon: 'Tag' },
    { id: 'favorites', label: 'Favoritos', icon: 'Heart' },
    { id: 'profile', label: 'Perfil', icon: 'User' },
  ];

  return (
    <nav aria-label="Navegación principal" className="lg:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 pb-6 pt-3 px-6">
      <div className="flex items-center justify-between">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={currentPage === item.id ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentPage === item.id
                ? 'text-primary'
                : 'text-gray-500 hover:text-gray-600'
            }`}
          >
            <Icon
              name={item.icon}
              size={24}
              className={currentPage === item.id ? 'fill-current' : ''}
            />
            <span className={`text-[10px] ${currentPage === item.id ? 'font-bold' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// Tarjeta de negocio reutilizable
const BusinessCard = ({ business, onClick, variant = 'default', isFavorite = false, onToggleFavorite }) => {
  const handleFavoriteClick = (e) => {
    e.stopPropagation(); // Evitar que se propague el click al card
    if (onToggleFavorite) {
      onToggleFavorite(business.id);
    }
  };

  if (variant === 'compact') {
    return (
      <article
        onClick={onClick}
        className="group relative flex w-full flex-row gap-4 rounded-2xl bg-white p-3 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer border border-gray-100"
      >
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {business.cover_photo || (business.images && business.images[0]) ? (
            <img
              src={business.cover_photo || business.images[0]}
              alt={business.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary/10 to-primary/20">
              <Store className="text-primary/50" size={28} />
              <span className="text-[10px] font-bold text-primary text-center px-1 leading-tight truncate w-full text-center">{business.name?.charAt(0).toUpperCase()}</span>
            </div>
          )}
          {business.isOpen !== undefined && (
            <div className={`absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm ${
              business.isOpen ? 'bg-white/90 text-slate-800' : 'bg-slate-800/90 text-white'
            }`}>
              {business.isOpen ? 'ABIERTO' : 'CERRADO'}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between py-1 pr-1">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h2 className="font-bold leading-tight text-slate-900 text-lg">{business.name}</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">{business.category}</p>
            </div>
            <button aria-label="Guardar en favoritos"
              onClick={handleFavoriteClick}
              className="group/heart relative p-2 active:scale-90 transition-transform -mr-1 -mt-1"
            >
              <Heart className={isFavorite ? "text-red-500 fill-red-500" : "text-gray-300 hover:text-red-400"} size={22} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1">
              <Star className="text-yellow-400 fill-yellow-400" size={16} />
              <span className="text-xs font-bold text-slate-700">{business.rating}</span>
              <span className="text-[10px] text-gray-500">({business.review_count || business.reviews || 0})</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <MapPin size={16} />
              <span className="text-xs font-medium">{business.distance}</span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-soft overflow-hidden border border-gray-100 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="relative aspect-video bg-gray-100">
        {business.cover_photo || (business.images && business.images[0]) ? (
          <img
            src={business.cover_photo || business.images[0]}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 to-primary/20">
            <Store className="text-primary/40" size={40} />
            <span className="text-sm font-bold text-primary/50">{business.name?.charAt(0).toUpperCase()}</span>
          </div>
        )}
        {(business.isNew || isRecentlyPublished(business)) && (
          <span className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
            Nuevo
          </span>
        )}
        <div className="absolute top-3 right-3">
          <button aria-label="Guardar en favoritos"
            onClick={handleFavoriteClick}
            className={`p-2 backdrop-blur-md rounded-full transition-colors ${
              isFavorite ? 'bg-white/90 text-red-500' : 'bg-white/20 text-white hover:bg-white/40'
            }`}
          >
            <Heart size={20} className={isFavorite ? 'fill-red-500' : ''} />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-bold">{business.name}</h3>
            <p className="text-sm text-gray-500">{business.category} • {business.address}</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
            <Star className="text-yellow-400 fill-yellow-400" size={18} />
            <span className="text-sm font-bold">{business.rating}</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{business.description}</p>
        <div className="mt-4 flex gap-2">
          {business.isOpen ? (
            <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-1 rounded">
              Abierto ahora
            </span>
          ) : business.closingSoon ? (
            <span className="text-[10px] uppercase font-bold text-orange-500 bg-orange-100 px-2 py-1 rounded">
              Cierra pronto
            </span>
          ) : null}
          <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
            A {business.distance}
          </span>
        </div>
      </div>
    </div>
  );
};

// Hook para countdown real
const useCountdown = (expiresAt) => {
  // Calcular ms restantes desde el timestamp real de expiración
  const getRemaining = () => Math.max(0, new Date(expiresAt) - new Date());

  const [timeLeft, setTimeLeft] = useState(getRemaining);

  useEffect(() => {
    const remaining = getRemaining();
    if (remaining <= 0) return;
    setTimeLeft(remaining);

    const timer = setInterval(() => {
      const r = getRemaining();
      setTimeLeft(r);
      if (r <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  // Formatear tiempo restante en HH:MM:SS
  const formatTime = (ms) => {
    if (ms <= 0) return '00:00:00';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return { timeLeft: formatTime(timeLeft), isExpired: timeLeft <= 0 };
};

// Tarjeta de oferta flash
const FlashOfferCard = ({ offer, onClick, onExpire }) => {
  const { timeLeft, isExpired } = useCountdown(offer.expiresAt);

  useEffect(() => {
    if (isExpired && onExpire) onExpire(offer.id);
  }, [isExpired]);

  const handleShareWhatsApp = (e) => {
    e.stopPropagation();
    const text = `¡Oferta Flash en Cornellà! ⚡\n\n*${offer.title}*\n💰 ${offer.discount} de descuento\n⏰ Termina en ${timeLeft}\n\n¡No te la pierdas en Cornellà Local!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={onClick}
      className={`snap-center shrink-0 w-64 bg-white rounded-2xl shadow-soft overflow-hidden group border border-gray-100 cursor-pointer hover:shadow-lg transition-shadow ${isExpired ? 'opacity-60' : ''}`}
    >
      <div className="relative h-36">
        <img
          src={offer.image}
          alt={offer.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className={`absolute top-2 left-2 ${isExpired ? 'bg-red-600' : 'bg-slate-900/80'} backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1`}>
          <Clock size={12} />
          <span>{timeLeft}</span>
        </div>
        <button aria-label="WhatsApp"
          onClick={handleShareWhatsApp}
          className="absolute top-2 right-2 w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center hover:bg-green-800 transition-colors shadow-md"
        >
          <MessageCircle size={14} />
        </button>
        <div className="absolute bottom-2 right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded-lg">
          {offer.discount}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate">{offer.title}</h3>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 line-through">{formatCurrency(offer.originalPrice || 0)}</span>
            <span className="text-base font-bold text-primary">
              {offer.discountType === 'free' || offer.discountedPrice === 0
                ? 'GRATIS'
                : formatCurrency(offer.discountedPrice || 0)}
            </span>
          </div>
          <button aria-label="Añadir"
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-100 p-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Tarjeta de categoría
const CategoryCard = ({ category, onNavigate }) => (
  <button
    onClick={() => onNavigate('category', { id: category.id })}
    className="flex flex-col items-center gap-2 group cursor-pointer"
  >
    <div className="w-16 h-16 rounded-full bg-slate-100 shadow-sm flex items-center justify-center text-slate-900 group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all duration-300 ring-1 ring-slate-200 group-hover:ring-primary">
      <Icon name={category.icon} size={28} />
    </div>
    <span className="text-xs font-semibold text-slate-900 group-hover:text-primary transition-colors">{category.name}</span>
  </button>
);

// ==============================================
// PÁGINAS
// ==============================================

// Página de Inicio
// Lista de barrios de Cornellà de Llobregat
export const barrios = [
  { id: 'centre-riera', name: 'Centre-Riera' },
  { id: 'almeda', name: 'Almeda' },
  { id: 'el-pedro', name: 'El Pedró' },
  { id: 'la-gavarra', name: 'La Gavarra' },
  { id: 'sant-ildefons', name: 'Sant Ildefons' },
  { id: 'fontsanta-fatjo', name: 'Fontsanta-Fatjó' },
];

// ==============================================
// MODO INVITADO
// Sin cuenta se pueden ver los listados (nombres de comercios y ofertas);
// los detalles completos y las acciones piden crear una cuenta gratis.
// ==============================================

const GUEST_PAGES = new Set([
  'home', 'offers', 'flash-offers', 'category', 'subcategory',
  'login', 'register', 'forgot-password', 'reset-password',
  'terms', 'terms-register', 'privacy-policy', 'legal-notice', 'cookies-policy', 'contact-support',
]);
const GUEST_TEASER_PAGES = new Set(['business', 'coupon', 'job-detail']);

// ¿La URL con la que se abrió la app pedía expresamente el login? (?nav=login o #login)
// Se lee al cargar el módulo, antes de que la app reescriba la URL.
const INITIAL_URL_WANTS_LOGIN = typeof window !== 'undefined' && (
  new URLSearchParams(window.location.search).get('nav') === 'login' || window.location.hash === '#login'
);

// Título de la pestaña (y H1 para lectores de pantalla en las pantallas que no lo tienen)
const DEFAULT_DOC_TITLE = typeof document !== 'undefined' ? document.title : 'Cornellà Local';
const PAGE_TITLES = {
  offers: 'Ofertas', 'flash-offers': 'Ofertas flash', category: 'Categorías', subcategory: 'Comercios',
  business: 'Comercio', coupon: 'Cupón', 'job-detail': 'Oferta de empleo', 'user-jobs': 'Empleo',
  favorites: 'Favoritos', profile: 'Mi perfil', notifications: 'Notificaciones', settings: 'Ajustes',
  'edit-profile': 'Editar perfil', 'user-reviews': 'Mis reseñas', 'budget-request': 'Pedir presupuesto',
  'direct-budget': 'Pedir presupuesto', 'my-budget-requests': 'Mis presupuestos',
  login: 'Iniciar sesión', register: 'Crear cuenta', 'forgot-password': 'Recuperar contraseña',
  'reset-password': 'Nueva contraseña', 'registration-success': 'Cuenta creada',
  terms: 'Términos y condiciones', 'terms-register': 'Términos y condiciones', 'privacy-policy': 'Política de privacidad',
  'legal-notice': 'Aviso legal', 'cookies-policy': 'Política de cookies', 'contact-support': 'Contacto y soporte',
  'owner-dashboard': 'Panel de mi negocio', 'business-stats': 'Estadísticas', 'business-offers': 'Mis ofertas',
  'create-offer': 'Crear oferta', 'business-jobs': 'Mis ofertas de empleo', 'create-job-offer': 'Publicar empleo',
  'business-candidates': 'Candidatos', 'incoming-budget-requests': 'Presupuestos recibidos',
  'business-budget': 'Presupuestos recibidos', 'business-data': 'Datos del negocio',
  'business-verification': 'Verificación del negocio', 'business-appeal': 'Apelación', 'edit-business': 'Editar negocio',
  'validate-code': 'Validar cupón', 'admin-dashboard': 'Administración', 'admin-all-businesses': 'Todos los negocios',
  'admin-approve-businesses': 'Aprobar negocios', 'admin-users': 'Usuarios', 'admin-support': 'Soporte',
  'business-analytics': 'Analítica', 'admin-reports': 'Denuncias', 'admin-services': 'Servicios web y vídeo',
  'admin-instagram': 'Instagram', 'admin-reviews': 'Reseñas',
};
// Pantallas cuyo componente ya pinta su propio <h1>
const PAGES_WITH_OWN_H1 = new Set([
  'favorites', 'profile', 'business', 'coupon', 'job-detail', 'category', 'subcategory', 'login', 'register',
  'forgot-password', 'reset-password', 'edit-profile', 'settings', 'direct-budget', 'registration-success',
  'admin-dashboard', 'admin-all-businesses', 'admin-approve-businesses', 'business-analytics', 'admin-reports',
  'admin-services', 'admin-instagram', 'admin-reviews',
  'business-candidates', 'business-data', 'business-verification', 'validate-code', 'business-stats',
]);
const AUTH_REDIRECT_KEY = 'post-login-redirect';

// Guarda adónde quería ir el invitado para llevarle allí tras iniciar sesión
// (sobrevive al viaje de ida y vuelta de Google OAuth y al email de confirmación)
const saveAuthRedirect = (page, params = {}) => {
  try {
    localStorage.setItem(AUTH_REDIRECT_KEY, JSON.stringify({ page, params, ts: Date.now() }));
  } catch (err) {
    console.error('No se pudo guardar la redirección tras login:', err);
  }
};

const takeAuthRedirect = () => {
  try {
    const raw = localStorage.getItem(AUTH_REDIRECT_KEY);
    if (!raw) return null;
    localStorage.removeItem(AUTH_REDIRECT_KEY);
    const redirect = JSON.parse(raw);
    if (!redirect?.page || Date.now() - (redirect.ts || 0) > 60 * 60 * 1000) return null;
    return redirect;
  } catch (err) {
    console.error('No se pudo leer la redirección tras login:', err);
    return null;
  }
};

// La web del negocio se pide en el alta pero no se muestra en la ficha pública.
// Poner a true si se ofrece como ventaja de un plan premium.
export const SHOW_BUSINESS_WEBSITE = false;

// Etiqueta "NUEVO": solo durante los primeros días desde que se aprobó (publicó) el negocio
export // Aviso del límite de ofertas: 1 cada 7 días por negocio, contando desde la última publicada
// (aunque se haya borrado). Si se conoce la fecha de la última, se dice cuándo se puede publicar.
const offerLimitMessage = (lastCreatedAt) => {
  if (lastCreatedAt) {
    const next = new Date(new Date(lastCreatedAt).getTime() + 7 * 864e5);
    const when = next.toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    return `Solo puedes publicar 1 oferta cada 7 días. Podrás publicar la siguiente el ${when}.`;
  }
  return 'Solo puedes publicar 1 oferta cada 7 días, contando desde la última que publicaste (aunque la hayas borrado).';
};

const NEW_BUSINESS_DAYS = 7;
export const isRecentlyPublished = (business, days = NEW_BUSINESS_DAYS) => {
  const since = business?.verified_at || business?.created_at;
  if (!since) return false;
  const t = new Date(since).getTime();
  return Number.isFinite(t) && Date.now() - t < days * 24 * 60 * 60 * 1000;
};

export const formatNeighborhood = (value) => {
  if (!value) return '';
  const match = barrios.find(b => b.id === value || b.name.toLowerCase() === String(value).toLowerCase());
  if (match) return match.name;
  return String(value).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const GUEST_GATE_COPY = {
  favorites: {
    icon: 'Heart',
    title: 'Guarda tus comercios favoritos',
    text: 'Crea tu cuenta gratis y te avisaremos cuando tus comercios favoritos publiquen ofertas o empleo.',
  },
  profile: {
    icon: 'User',
    title: 'Tu cuenta en Cornellà Local',
    text: 'Guarda cupones, pide presupuestos, apúntate a ofertas de empleo y deja reseñas. Si tienes un negocio, también puedes darlo de alta gratis.',
  },
  'budget-request': {
    icon: 'ClipboardList',
    title: 'Pide presupuesto a profesionales del barrio',
    text: 'Cuenta qué necesitas y recibe presupuestos de negocios verificados de Cornellà. Gratis y sin compromiso.',
  },
  notifications: {
    icon: 'Bell',
    title: 'Tus avisos',
    text: 'Con una cuenta recibirás avisos de ofertas de tus comercios favoritos y respuestas a tus presupuestos.',
  },
};
GUEST_GATE_COPY['direct-budget'] = GUEST_GATE_COPY['budget-request'];
GUEST_GATE_COPY['my-budget-requests'] = GUEST_GATE_COPY['budget-request'];

const GuestAuthButtons = ({ onAuth }) => (
  <div className="flex flex-col gap-3 w-full">
    <button
      onClick={() => onAuth('register')}
      className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
    >
      Crear cuenta gratis
    </button>
    <button
      onClick={() => onAuth('login')}
      className="w-full h-12 bg-white border border-gray-200 hover:bg-gray-50 text-slate-900 font-semibold rounded-xl transition-colors"
    >
      Ya tengo cuenta
    </button>
  </div>
);

// Pantalla para secciones que solo tienen sentido con cuenta (favoritos, perfil, presupuestos...)
const GuestGate = ({ page, onNavigate, onAuth }) => {
  const copy = GUEST_GATE_COPY[page] || {
    icon: 'Lock',
    title: 'Esta sección es para usuarios registrados',
    text: 'Crea tu cuenta gratis para usar todas las funciones de Cornellà Local.',
  };
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-gray-50 font-display flex flex-col pb-28">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-16 gap-5">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Icon name={copy.icon} size={36} className="text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{copy.title}</h1>
          <p className="text-gray-500 leading-relaxed">{copy.text}</p>
        </div>
        <GuestAuthButtons onAuth={(mode) => onAuth(mode, page, {})} />
        <button onClick={() => onNavigate('home')} className="text-sm font-medium text-primary hover:underline">
          Seguir explorando comercios
        </button>
      </div>
      <Navbar currentPage={page} onNavigate={onNavigate} />
    </div>
  );
};

// Vista previa de un negocio, oferta o empleo: se ve el nombre y lo básico;
// el resto (dirección, teléfono, horario, cupón, reseñas) pide cuenta
const GuestTeaser = ({ kind, id, params = {}, onNavigate, onAuth }) => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (item?.title) document.title = `${item.title} | Cornellà Local`;
  }, [item?.title]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        if (kind === 'business') {
          const { data } = await supabase
            .from('businesses')
            .select('id, name, subcategory, neighborhood, cover_photo, images, rating, review_count, description')
            .eq('id', id)
            .maybeSingle();
          if (active) setItem(data ? {
            title: data.name,
            subtitle: [data.subcategory, formatNeighborhood(data.neighborhood)].filter(Boolean).join(' · '),
            image: data.cover_photo || data.images?.[0] || null,
            rating: data.review_count > 0 ? Number(data.rating) : null,
            reviews: data.review_count || 0,
            description: data.description,
          } : null);
        } else {
          const table = kind === 'coupon' ? 'offers' : 'jobs';
          const { data } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
          let businessName = '';
          if (data?.business_id) {
            const { data: biz } = await supabase.from('businesses').select('name').eq('id', data.business_id).maybeSingle();
            businessName = biz?.name || '';
          }
          if (active) setItem(data ? {
            title: data.title,
            subtitle: businessName,
            image: kind === 'coupon' ? data.image || null : null,
            badge: kind === 'coupon' ? (data.discount_label || (data.discount_value ? `-${data.discount_value}%` : '')) : '',
            description: data.description,
          } : null);
        }
      } catch (err) {
        console.error('Error cargando vista previa para invitado:', err);
        if (active) setItem(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [kind, id]);

  const locked = {
    business: [
      { icon: 'MapPin', label: 'Dirección y cómo llegar' },
      { icon: 'Phone', label: 'Teléfono y WhatsApp' },
      { icon: 'Clock', label: 'Horario y cierres especiales' },
      { icon: 'Tag', label: 'Ofertas y cupones' },
      { icon: 'Star', label: 'Reseñas de vecinos' },
    ],
    coupon: [
      { icon: 'Ticket', label: 'Tu código de descuento' },
      { icon: 'Clock', label: 'Validez y condiciones' },
      { icon: 'MapPin', label: 'Dónde canjearlo' },
    ],
    'job-detail': [
      { icon: 'FileText', label: 'Descripción completa y requisitos' },
      { icon: 'Briefcase', label: 'Salario y horario' },
      { icon: 'Send', label: 'Enviar tu candidatura' },
    ],
  }[kind] || [];

  const lead = {
    business: 'Crea tu cuenta gratis para ver todos los datos de este comercio.',
    coupon: 'Crea tu cuenta gratis para conseguir el código y canjear la oferta.',
    'job-detail': 'Crea tu cuenta gratis para ver la oferta completa y apuntarte.',
  }[kind];

  const goBack = () => (params.returnTo ? onNavigate(params.returnTo, params.returnParams || {}) : onNavigate(kind === 'business' ? 'home' : 'offers'));

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-white font-display flex flex-col">
      <div className="relative w-full h-56 shrink-0 bg-gradient-to-br from-primary to-primary-dark">
        {item?.image && <img src={item.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <button
          onClick={goBack}
          aria-label="Volver"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow"
        >
          <ArrowLeft size={20} className="text-slate-900" />
        </button>
        {item?.badge && (
          <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-orange-700 text-white text-sm font-bold shadow">{item.badge}</span>
        )}
        <div className="absolute bottom-4 left-5 right-5 text-white">
          {loading ? (
            <div className="h-7 w-2/3 bg-white/40 rounded animate-pulse" />
          ) : (
            <>
              <h1 className="text-2xl font-bold leading-tight drop-shadow">{item?.title || 'No disponible'}</h1>
              {item?.subtitle && <p className="text-sm text-white/90 mt-1">{item.subtitle}</p>}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 px-5 py-6 flex flex-col gap-6">
        {!loading && !item && (
          <p className="text-gray-500">Este contenido ya no está disponible o no existe.</p>
        )}
        {item?.rating != null && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="font-semibold text-slate-900">{item.rating.toFixed(1)}</span>
            <span>({item.reviews} {item.reviews === 1 ? 'reseña' : 'reseñas'})</span>
          </div>
        )}
        {item?.description && (
          <p className="text-gray-600 leading-relaxed line-clamp-3">{item.description}</p>
        )}

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">
          {locked.map(row => (
            <div key={row.label} className="flex items-center gap-3 text-gray-500">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <Icon name={row.icon} size={18} className="text-primary" />
              </div>
              <span className="flex-1 text-sm font-medium text-slate-700">{row.label}</span>
              <Lock size={16} className="text-gray-500" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 items-center text-center">
          <p className="text-sm text-gray-600">{lead}</p>
          <GuestAuthButtons onAuth={(mode) => onAuth(mode, kind, { id, ...params })} />
        </div>
      </div>
    </div>
  );
};

// Franja superior para invitados en las pantallas públicas (en escritorio va en la barra lateral)
const GuestBanner = ({ onAuth }) => (
  <div className="lg:hidden mx-auto w-full max-w-md bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3">
    <p className="text-xs leading-snug text-white/80">Estás viendo Cornellà Local como invitado</p>
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={() => onAuth('login')} className="text-xs font-semibold text-white/90 hover:text-white px-2 py-1">Entrar</button>
      <button onClick={() => onAuth('register')} className="text-xs font-bold bg-white text-slate-900 rounded-full px-3 py-1.5 hover:bg-gray-100">Crear cuenta</button>
    </div>
  </div>
);


const HomePage = ({ onNavigate, userFavorites = [], toggleFavorite, isFavorite, userOffers = [], notifications = [], params = {}, showToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedBarrio, setSelectedBarrio] = useState(null);
  const [showBarrioFilter, setShowBarrioFilter] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);

  // Auto-seleccionar barrio si viene por parámetro
  useEffect(() => {
    if (params.filterNeighborhood) {
      setSelectedBarrio(params.filterNeighborhood);
      setShowSearchResults(true);
    }
  }, [params.filterNeighborhood]);

  // Auto-seleccionar tag si viene por parámetro
  useEffect(() => {
    if (params.filterTag) {
      setSelectedTag(params.filterTag);
      setSearchQuery(params.filterTag);
      setShowSearchResults(true);
    }
  }, [params.filterTag]);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('recentSearches parse error:', e);
      return [];
    }
  });
  const [isFocused, setIsFocused] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [neighborhoodCounts, setNeighborhoodCounts] = useState({});
  const [flashOffers, setFlashOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [newBusinesses, setNewBusinesses] = useState([]);
  const [loadingNewBusinesses, setLoadingNewBusinesses] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 🔍 Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance'); // relevance, rating, distance, name, newest
  const [minRating, setMinRating] = useState(0); // 0-5
  const [priceRange, setPriceRange] = useState([0, 100]); // For offers
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const searchDebounceRef = useRef(null);

  // Cargar negocios desde Supabase
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('is_verified', true)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(150);

        if (error) throw error;
        setBusinesses(data || []);
      } catch (error) {
        console.error('Error cargando negocios:', error);
      } finally {
        setLoadingBusinesses(false);
      }
    };

    fetchBusinesses();
  }, [refreshTrigger]);

  // Cargar conteos de negocios por barrio desde Supabase
  useEffect(() => {
    const fetchNeighborhoodCounts = async () => {
      const { data } = await supabase
        .from('businesses')
        .select('neighborhood')
        .eq('verification_status', 'approved')
        .eq('is_published', true)
        .limit(500);
      const counts = {};
      data?.forEach(b => {
        if (b.neighborhood) counts[b.neighborhood] = (counts[b.neighborhood] || 0) + 1;
      });
      setNeighborhoodCounts(counts);
    };
    fetchNeighborhoodCounts();
  }, []);

  // Cargar ofertas flash desde Supabase
  useEffect(() => {
    const fetchFlashOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            businesses!inner(id, name)
          `)
          .eq('is_flash', true)
          .eq('status', 'active')
          .eq('is_visible', true)
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: true })
          .limit(50);

        if (error) throw error;
        setFlashOffers(data || []);
      } catch (error) {
        console.error('Error cargando ofertas flash:', error);
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchFlashOffers();
  }, [refreshTrigger]);

  // Cargar negocios nuevos (últimos 6 aprobados) con contadores de favoritos
  useEffect(() => {
    const fetchNewBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('verification_status', 'approved')
          .eq('is_published', true)
          .order('verified_at', { ascending: false, nullsFirst: false })
          .limit(6);

        if (error) throw error;

        // Cargar contadores de favoritos para estos negocios
        if (data && data.length > 0) {
          const businessIds = data.map(b => b.id);
          const { data: favoritesData, error: favError } = await supabase
            .from('favorites')
            .select('business_id')
            .in('business_id', businessIds);

          if (favError) {
          } else {
            // Contar favoritos por negocio
            const favoriteCounts = {};
            favoritesData?.forEach(fav => {
              favoriteCounts[fav.business_id] = (favoriteCounts[fav.business_id] || 0) + 1;
            });

            // Agregar contador a cada negocio
            const businessesWithCounts = data.map(business => ({
              ...business,
              favoriteCount: favoriteCounts[business.id] || 0
            }));

            setNewBusinesses(businessesWithCounts);
            setLoadingNewBusinesses(false);
            return;
          }
        }

        setNewBusinesses(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingNewBusinesses(false);
      }
    };

    fetchNewBusinesses();
  }, [refreshTrigger]);

  const popularSearches = [
    { text: 'Restaurantes', icon: 'UtensilsCrossed' },
    { text: 'Peluquería', icon: 'Scissors' },
    { text: 'Ofertas', icon: 'Tag' },
    { text: 'Fontanero', icon: 'Droplet' },
    { text: 'Gimnasio', icon: 'Dumbbell' },
    { text: 'Café', icon: 'Coffee' },
  ];

  // Actualizar favoriteCount en listing cuando el usuario da/quita favorito
  const handleToggleFavoriteInList = (businessId) => {
    const isCurrentlyFav = isFavorite && isFavorite(businessId);
    setBusinesses(prev => prev.map(b =>
      b.id === businessId
        ? { ...b, favoriteCount: Math.max(0, (b.favoriteCount || 0) + (isCurrentlyFav ? -1 : 1)) }
        : b
    ));
    if (toggleFavorite) toggleFavorite(businessId);
  };

  // Pull to refresh — recarga datos reales de Supabase
  const handleRefresh = async () => {
    setLoadingBusinesses(true);
    setLoadingOffers(true);
    setLoadingNewBusinesses(true);
    setRefreshTrigger(prev => prev + 1);
  };
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh(handleRefresh);

  // Obtener ubicación del usuario
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización');
      showToast('Geolocalización no disponible', 'error');
      return;
    }

    setLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserLocation(location);
        setSortByDistance(true);
        setLoadingLocation(false);
        showToast('Ubicación obtenida correctamente', 'success');
      },
      (error) => {
        let errorMessage = 'No se pudo obtener tu ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado';
            break;
        }
        setLocationError(errorMessage);
        setLoadingLocation(false);
        showToast(errorMessage, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache de 5 minutos
      }
    );
  };

  // Calcular tiempo restante desde expires_at
  const calculateTimeLeft = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;

    if (diffMs <= 0) return '0m';

    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Transformar ofertas de Supabase al formato esperado (memoizado)
  const allFlashOffers = useMemo(() => flashOffers.map(offer => {
    const timeLeft = calculateTimeLeft(offer.expires_at);
    const now = new Date();
    const expires = new Date(offer.expires_at);
    const diffMinutes = Math.floor((expires - now) / 60000);

    return {
      id: offer.id,
      title: offer.title,
      image: offer.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EOferta%3C/text%3E%3C/svg%3E",
      discount: offer.discount_label ||
               (offer.discount_type === '2x1' ? '2x1' :
                offer.discount_type === 'free' ? 'GRATIS' :
                (offer.discount_value || '0') + '%'),
      discountType: offer.discount_type,
      expiresAt: offer.expires_at,
      timeLeft: timeLeft,
      timeMinutes: diffMinutes,
      originalPrice: offer.original_price || 0,
      discountedPrice: offer.discounted_price || 0,
      businessName: offer.businesses?.name || 'Negocio',
      description: offer.description,
    };
  }), [flashOffers]);

  // Filtrar negocios según la búsqueda y barrio
  const filteredBusinesses = searchQuery.trim() === '' && !selectedBarrio && !selectedCategory && minRating === 0 ? [] : businesses
    .filter(business => {
      // Filtro por barrio (compara ID y nombre por si están guardados de forma diferente en BD)
      if (selectedBarrio) {
        const barrioObj = barrios.find(b => b.id === selectedBarrio);
        if (business.neighborhood !== selectedBarrio && business.neighborhood !== barrioObj?.name) {
          return false;
        }
      }
      // Filtro por categoría
      if (selectedCategory && business.subcategory !== selectedCategory) {
        return false;
      }
      // Filtro por valoración mínima
      if (minRating > 0 && (business.rating || 0) < minRating) {
        return false;
      }
      // Filtro "Abiertos Ahora"
      if (showOnlyOpen) {
        const status = getBusinessStatus(business.opening_hours);
        if (!status.isOpen) {
          return false;
        }
      }
      // Filtro por búsqueda
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matches = (
          business.name.toLowerCase().includes(query) ||
          (business.subcategory && business.subcategory.toLowerCase().includes(query)) ||
          (business.description && business.description.toLowerCase().includes(query)) ||
          (business.address && business.address.toLowerCase().includes(query)) ||
          (business.tags && business.tags.some(tag => tag.toLowerCase().includes(query)))
        );
        return matches;
      }
      return true;
    })
    .sort((a, b) => {
      // Ordenamiento por distancia (si está activo y hay ubicación)
      if (sortByDistance && userLocation) {
        // Calcular distancia real para cada negocio
        const distA = (a.latitude && a.longitude)
          ? calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude)
          : 999; // Si no tiene coordenadas, ponerlo al final
        const distB = (b.latitude && b.longitude)
          ? calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
          : 999;
        return distA - distB;
      }

      // Otros ordenamientos
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'distance':
          return (a.distance || 999) - (b.distance || 999);
        default: // relevance
          return 0;
      }
    });

  if (searchQuery && searchQuery.includes('tag')) {
  }

  // Filtrar ofertas según la búsqueda y precio
  const filteredOffers = searchQuery.trim() === '' && priceRange[0] === 0 && priceRange[1] === 100 ? [] : allFlashOffers
    .filter(offer => {
      // Filtro por búsqueda
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          offer.title.toLowerCase().includes(query) ||
          (offer.businessName && offer.businessName.toLowerCase().includes(query))
        );
        if (!matchesSearch) return false;
      }

      // Filtro por rango de precio (basado en descuento)
      const offerPrice = offer.originalPrice || 50; // Default si no hay precio
      const discountedPrice = offer.price || offerPrice;
      if (discountedPrice < priceRange[0] || discountedPrice > priceRange[1]) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Ordenamiento
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'price_low':
          return (a.price || 0) - (b.price || 0);
        case 'price_high':
          return (b.price || 0) - (a.price || 0);
        default:
          return 0;
      }
    });

  // Filtrar categorías según la búsqueda (memoizado)
  const filteredCategories = useMemo(() => searchQuery.trim() === '' ? [] : categories.filter(category => {
    const query = searchQuery.toLowerCase();
    return (
      category.name.toLowerCase().includes(query) ||
      (category.description && category.description.toLowerCase().includes(query)) ||
      (category.subcategories && category.subcategories.some(sub => sub.name.toLowerCase().includes(query)))
    );
  }), [searchQuery]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSearchResults(value.trim() !== '' || selectedBarrio !== null || isFocused);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 250);
  };

  const saveRecentSearch = (term) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleSearchSubmit = (term) => {
    setInputValue(term);
    setSearchQuery(term);
    saveRecentSearch(term);
    setShowSearchResults(true);
    setIsFocused(false);
  };

  const clearSearch = () => {
    clearTimeout(searchDebounceRef.current);
    setInputValue('');
    setSearchQuery('');
    setSelectedBarrio(null);
    setShowSearchResults(false);
    setIsFocused(false);
  };

  const resetFilters = () => {
    setSortBy('relevance');
    setMinRating(0);
    setPriceRange([0, 100]);
    setSelectedCategory(null);
  };

  const clearAllFiltersAndSearch = () => {
    clearSearch();
    resetFilters();
  };

  const hasActiveFilters = sortBy !== 'relevance' || minRating > 0 || priceRange[0] > 0 || priceRange[1] < 100 || selectedCategory !== null;

  const selectBarrio = (barrioId) => {
    setSelectedBarrio(barrioId);
    setShowBarrioFilter(false);
    setShowSearchResults(true);
  };

  const clearBarrioFilter = () => {
    setSelectedBarrio(null);
    if (searchQuery.trim() === '') {
      setShowSearchResults(false);
    }
  };

  const hasResults = filteredBusinesses.length > 0 || filteredOffers.length > 0 || filteredCategories.length > 0;

  return (
  <div
    className="mx-auto min-h-screen w-full max-w-md relative pb-24 overflow-x-hidden shadow-2xl bg-gray-50"
    {...handlers}
  >
    {/* Pull to Refresh Indicator */}
    <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

    {/* Header */}
    <header className="sticky top-0 z-30 bg-gray-50/90 backdrop-blur-md border-b border-gray-100 transition-colors">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center">
          <img
            src="/logo.png"
            alt="Cornellà Local"
            width="206"
            height="36"
            className="h-9 w-auto object-contain"
          />
        </div>
        <button aria-label="Notificaciones"
          onClick={() => onNavigate('notifications')}
          className="relative p-2 text-slate-800 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Bell size={24} />
          {(notifications?.filter(n => !n.isRead).length || 0) > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-600 border-2 border-white text-[10px] font-bold text-white">
              {notifications?.filter(n => !n.isRead).length || 0}
            </span>
          )}
        </button>
      </div>
      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="text-gray-500 group-focus-within:text-primary transition-colors" size={20} />
          </div>
          <input
            className="block w-full p-3 pl-10 pr-20 text-sm text-gray-900 border-none rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary placeholder-gray-400 transition-all"
            placeholder="Buscar comercios, servicios, ofertas..."
            type="text"
            value={inputValue}
            onChange={handleSearchChange}
            onFocus={() => {
              setIsFocused(true);
              setShowSearchResults(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim()) {
                saveRecentSearch(inputValue.trim());
              }
            }}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
            {(searchQuery || selectedBarrio || hasActiveFilters) && (
              <button
                onClick={clearAllFiltersAndSearch}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-600 transition-colors"
                title="Limpiar todo"
              >
                <X size={18} />
              </button>
            )}
            <button
              onClick={() => setShowBarrioFilter(true)}
              className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors relative ${selectedBarrio ? 'text-primary bg-primary/10' : 'text-gray-500'}`}
              title="Filtrar por barrio"
            >
              <MapPin size={20} />
              {selectedBarrio && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setShowAdvancedFilters(true)}
              className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors relative ${hasActiveFilters ? 'text-primary bg-primary/10' : 'text-gray-500'}`}
              title="Filtros avanzados"
            >
              <SlidersHorizontal size={20} />
              {hasActiveFilters && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* Resultados de búsqueda */}
    {showSearchResults && (
      <div className="absolute top-[140px] left-0 right-0 z-20 bg-white mx-4 rounded-2xl shadow-xl border border-gray-100 max-h-[60vh] overflow-y-auto">
        {/* Filtros activos */}
        {(selectedBarrio || hasActiveFilters) && (
          <div className="p-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Filtros activos:</span>

              {selectedBarrio && (
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  <MapPin size={14} />
                  {barrios.find(b => b.id === selectedBarrio)?.name}
                  <button aria-label="Cerrar"
                    onClick={clearBarrioFilter}
                    className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {sortBy !== 'relevance' && (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                  <TrendingUp size={14} />
                  {sortBy === 'rating' && 'Mejor valorados'}
                  {sortBy === 'newest' && 'Más recientes'}
                  {sortBy === 'name' && 'Alfabético'}
                  {sortBy === 'distance' && 'Más cercanos'}
                </span>
              )}

              {minRating > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                  <Star size={14} className="fill-current" />
                  {minRating}+ estrellas
                </span>
              )}

              {(priceRange[0] > 0 || priceRange[1] < 100) && (
                <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                  <Tag size={14} />
                  {priceRange[0]}€ - {priceRange[1]}€
                </span>
              )}
            </div>
          </div>
        )}

        {/* Sugerencias cuando no hay búsqueda activa */}
        {searchQuery.trim() === '' && !selectedBarrio ? (
          <div className="p-4">
            {/* Búsquedas recientes */}
            {recentSearches.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <History size={14} />
                    Búsquedas recientes
                  </h4>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                  >
                    Borrar
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchSubmit(term)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <History size={16} className="text-gray-500" />
                      <span className="text-sm text-slate-700">{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Búsquedas populares */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp size={14} />
                Búsquedas populares
              </h4>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSubmit(item.text)}
                    className="flex items-center gap-2 bg-gray-50 hover:bg-primary/10 px-3 py-2 rounded-full transition-colors"
                  >
                    <Icon name={item.icon} size={16} className="text-primary" />
                    <span className="text-sm font-medium text-slate-700">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : !hasResults ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-500" size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Sin resultados</h3>
            <p className="text-sm text-gray-500">
              {selectedBarrio
                ? `No hay comercios en ${barrios.find(b => b.id === selectedBarrio)?.name}${searchQuery ? ` con "${searchQuery}"` : ''}`
                : `No encontramos "${searchQuery}"`
              }
            </p>
            <p className="text-xs text-gray-500 mt-2">Prueba con otros términos o barrios</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Categorías encontradas */}
            {filteredCategories.length > 0 && (
              <div className="p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categorías</h4>
                <div className="flex flex-wrap gap-2">
                  {filteredCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => {
                        clearSearch();
                        onNavigate('category', { id: category.id });
                      }}
                      className="flex items-center gap-2 bg-gray-50 hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Icon name={category.icon} size={18} className="text-primary" />
                      <span className="text-sm font-medium text-slate-700">{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ofertas encontradas */}
            {filteredOffers.length > 0 && (
              <div className="p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Ofertas</h4>
                <div className="space-y-2">
                  {filteredOffers.slice(0, 3).map(offer => (
                    <button
                      key={offer.id}
                      onClick={() => {
                        clearSearch();
                        onNavigate('coupon', { id: offer.id });
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        <img src={offer.image} alt={offer.title} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{offer.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-primary">{offer.discount}</span>
                          <span className="text-xs text-gray-500">• {offer.timeLeft}</span>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-300" size={20} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Negocios encontrados */}
            {filteredBusinesses.length > 0 && (
              <div className="p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Negocios ({filteredBusinesses.length})</h4>
                <div className="space-y-2">
                  {filteredBusinesses.map(business => (
                    <button
                      key={business.id}
                      onClick={() => {
                        clearSearch();
                        onNavigate('business', { id: business.id });
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {business.cover_photo || (business.images && business.images[0]) ? (
                          <img src={business.cover_photo || business.images[0]} alt={business.name} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-base">
                            {business.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{business.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{business.category}</span>
                          <span className="text-xs text-gray-300">•</span>
                          <div className="flex items-center gap-0.5">
                            <Star className="text-yellow-400 fill-yellow-400" size={12} />
                            <span className="text-xs font-medium text-slate-600">{business.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {business.isOpen && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">ABIERTO</span>
                        )}
                        <span className="text-xs text-gray-500">{business.distance}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )}

    <div className="flex flex-col gap-6 pt-4">
      {/* Indicadores de filtros activos */}
      {(showOnlyOpen || (sortByDistance && userLocation)) && (
        <div className="px-4 flex gap-2 flex-wrap">
          {showOnlyOpen && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              <Circle size={8} className="fill-green-500 animate-pulse" />
              Abiertos ahora
              <button aria-label="Cerrar" onClick={() => setShowOnlyOpen(false)} className="ml-1 hover:text-green-900">
                <X size={12} />
              </button>
            </div>
          )}
          {sortByDistance && userLocation && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              <Navigation size={12} className="fill-blue-500" />
              Por distancia
              <button aria-label="Cerrar" onClick={() => { setSortByDistance(false); setUserLocation(null); }} className="ml-1 hover:text-blue-900">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ofertas Flash */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Ofertas Flash</h2>
            <Zap className="animate-pulse text-yellow-500" size={20} />
          </div>
          {(loadingOffers || allFlashOffers.length > 0) && (
            <button
              onClick={() => onNavigate('flash-offers')}
              className="text-primary text-sm font-semibold hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              Ver todos
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        {loadingOffers && allFlashOffers.length === 0 ? (
          <div className="flex gap-4 px-4 pb-4 overflow-hidden" aria-hidden="true">
            {[0, 1].map(i => <div key={i} className="w-64 h-40 shrink-0 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : allFlashOffers.length === 0 ? (
          <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
              <Zap className="text-yellow-600" size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Ahora mismo no hay ofertas flash</p>
              <p className="text-xs text-gray-500 leading-snug">Duran solo unas horas. Guarda tus comercios en favoritos y te avisamos cuando publiquen una.</p>
            </div>
          </div>
        ) : (
        <div className="flex overflow-x-auto no-scrollbar gap-4 px-4 pb-4 snap-x snap-mandatory scroll-smooth">
          {allFlashOffers.slice(0, 5).map(offer => (
            <FlashOfferCard
              key={offer.id}
              offer={offer}
              onClick={() => onNavigate('coupon', { id: offer.id })}
              onExpire={(id) => setFlashOffers(prev => prev.filter(o => o.id !== id))}
            />
          ))}
        </div>
        )}
      </section>

      {/* Categorías */}
      <section className="px-4">
        <h2 className="text-xl font-bold tracking-tight mb-4">Categorías</h2>
        <div className="grid grid-cols-4 gap-y-6 gap-x-4">
          {categories.map(category => (
            <CategoryCard key={category.id} category={category} onNavigate={onNavigate} />
          ))}
        </div>
      </section>

      {/* Banner Eventos - Próximamente */}
      <section className="px-4 pb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-5 shadow-lg">
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative flex items-center gap-4">
            {/* Icono */}
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
              <Calendar className="text-white" size={32} />
            </div>

            {/* Contenido */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white text-lg font-bold">Eventos del Barrio</h3>
                <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Próximamente
                </span>
              </div>
              <p className="text-white/80 text-sm leading-snug">
                Fiestas, mercadillos, conciertos y actividades en Cornellà
              </p>
            </div>
          </div>

          {/* Iconos decorativos */}
          <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/20">
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <PartyPopper className="text-white" size={20} />
              </div>
              <span className="text-white/70 text-[10px] font-medium">Fiestas</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingBag className="text-white" size={20} />
              </div>
              <span className="text-white/70 text-[10px] font-medium">Mercadillos</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Mic className="text-white" size={20} />
              </div>
              <span className="text-white/70 text-[10px] font-medium">Conciertos</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="text-white" size={20} />
              </div>
              <span className="text-white/70 text-[10px] font-medium">Actividades</span>
            </div>
          </div>
        </div>
      </section>

      {/* Nuevos en el barrio */}
      {!loadingNewBusinesses && newBusinesses.length > 0 && (
        <section className="px-4 pb-4">
          <h2 className="text-xl font-bold tracking-tight mb-4">Nuevos en el barrio</h2>
          <div className="flex flex-col gap-4">
            {newBusinesses.map(business => (
              <div
                key={business.id}
                className="relative w-full bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group text-left"
              >
                {/* Image */}
                <div className="relative h-44 bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden">
                  {!(business.cover_photo || (business.images && business.images[0])) && (
                    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                      <Store className="text-white/40" size={64} strokeWidth={1.5} />
                    </div>
                  )}
                  {(business.cover_photo || (business.images && business.images[0])) && (
                    <img
                      src={business.cover_photo || business.images[0]}
                      alt={business.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  {/* Badge "NUEVO" (7 días desde la publicación) */}
                  {isRecentlyPublished(business) && (
                    <div className="absolute top-3 left-3 px-3 py-1.5 bg-green-700 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg">
                      <Sparkles size={14} />
                      NUEVO
                    </div>
                  )}

                  {/* Badge Estado (Abierto/Cerrado) */}
                  {(() => {
                    const status = getBusinessStatus(business.opening_hours);
                    const statusStyles = {
                      open: 'bg-green-700 text-white',
                      closed: 'bg-gray-600 text-white',
                      closing_soon: 'bg-orange-700 text-white',
                      unknown: 'bg-gray-600 text-white'
                    };
                    return (
                      <div className={`absolute bottom-3 left-3 px-3 py-1.5 ${statusStyles[status.status]} text-xs font-bold rounded-full shadow-lg backdrop-blur-sm`}>
                        {status.message}
                      </div>
                    );
                  })()}

                  {/* Favorite button */}
                  <button aria-label="Guardar en favoritos"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavoriteInList(business.id);
                    }}
                    aria-pressed={!!(isFavorite && isFavorite(business.id))}
                    className="absolute z-10 top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                  >
                    <Heart
                      size={20}
                      className={isFavorite && isFavorite(business.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}
                    />
                  </button>
                </div>
                {/* Content */}
                <div className="px-4 pt-3.5 pb-4 flex flex-col gap-2">
                  {/* Nombre + Badge Verificado — centrado */}
                  <div className="flex items-center justify-center gap-1.5">
                    <h3 className="font-bold text-slate-900 text-xl leading-tight text-center">
                      {/* Botón "estirado": toda la tarjeta es clicable sin anidar botones */}
                      <button
                        type="button"
                        onClick={() => onNavigate('business', { id: business.id })}
                        className="text-center focus:outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-primary"
                      >
                        {business.name}
                      </button>
                    </h3>
                    {business.is_verified && (
                      <BadgeCheck className="text-white fill-primary shrink-0" size={22} />
                    )}
                  </div>

                  {/* Fila 1: Categoría | Rating */}
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-sm font-medium text-primary">{business.subcategory || business.category}</p>
                    <span className="text-gray-300 text-sm">│</span>
                    {(business.review_count || business.reviews) ? (
                      <div className="flex items-center gap-1">
                        <Star className="text-yellow-500 fill-yellow-500" size={15} />
                        <span className="font-bold text-slate-900 text-sm">{Number(business.rating || 0).toFixed(1)}</span>
                        <span className="text-gray-500 text-xs">({business.review_count || business.reviews})</span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-gray-500">Sin reseñas aún</span>
                    )}
                  </div>

                  {/* Fila 2: Barrio | Favoritos */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                      <MapPin size={13} className="text-primary" />
                      <span className="text-xs text-gray-500">{formatNeighborhood(business.neighborhood) || business.address}</span>
                    </div>
                    <span className="text-gray-300 text-sm">│</span>
                    <div className="flex items-center gap-1">
                      <Heart className="text-red-400 fill-red-400" size={13} />
                      <span className="text-xs text-gray-500">{business.favoriteCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>

    {/* Navbar */}
    <Navbar currentPage="home" onNavigate={onNavigate} />

    {/* Modal Filtro por Barrio */}
    {showBarrioFilter && (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowBarrioFilter(false)} />
        <div className="relative bg-white rounded-t-3xl w-full max-w-md shadow-2xl animate-slide-up">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-slate-900">Filtrar por Barrio</h3>
            <button aria-label="Cerrar"
              onClick={() => setShowBarrioFilter(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Lista de barrios */}
          <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
            {/* Opción "Todos los barrios" */}
            <button
              onClick={() => {
                setSelectedBarrio(null);
                setShowBarrioFilter(false);
                if (searchQuery.trim() === '') {
                  setShowSearchResults(false);
                }
              }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors ${
                !selectedBarrio ? 'bg-primary/10 border-2 border-primary' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                !selectedBarrio ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <MapPin size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-semibold ${!selectedBarrio ? 'text-primary' : 'text-slate-700'}`}>
                  Todos los barrios
                </p>
                <p className="text-xs text-gray-500">Ver todo Cornellà</p>
              </div>
              {!selectedBarrio && <Check size={20} className="text-primary" />}
            </button>

            {/* Lista de barrios */}
            {barrios.map(barrio => (
              <button
                key={barrio.id}
                onClick={() => selectBarrio(barrio.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors ${
                  selectedBarrio === barrio.id ? 'bg-primary/10 border-2 border-primary' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedBarrio === barrio.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  <Building2 size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${selectedBarrio === barrio.id ? 'text-primary' : 'text-slate-700'}`}>
                    {barrio.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {neighborhoodCounts[barrio.id] || neighborhoodCounts[barrio.name] || 0} comercios
                  </p>
                </div>
                {selectedBarrio === barrio.id && <Check size={20} className="text-primary" />}
              </button>
            ))}
          </div>

          {/* Espacio inferior seguro */}
          <div className="h-8"></div>
        </div>
      </div>
    )}

    {/* Modal de filtros avanzados */}
    <AdvancedFiltersModal
      isOpen={showAdvancedFilters}
      onClose={() => setShowAdvancedFilters(false)}
      sortBy={sortBy}
      setSortBy={setSortBy}
      minRating={minRating}
      setMinRating={setMinRating}
      priceRange={priceRange}
      setPriceRange={setPriceRange}
      onReset={resetFilters}
      showOnlyOpen={showOnlyOpen}
      setShowOnlyOpen={setShowOnlyOpen}
      sortByDistance={sortByDistance}
      userLocation={userLocation}
      getUserLocation={getUserLocation}
      loadingLocation={loadingLocation}
      setSortByDistance={setSortByDistance}
      setUserLocation={setUserLocation}
    />
  </div>
  );
};

// Página de Solicitud de Presupuesto
const BudgetRequestScreen = ({ onNavigate, onSubmitRequest, showToast, user }) => {
  const [paso, setPaso] = useState(1);
  const [enviado, setEnviado] = useState(false);
  const [adminNotified, setAdminNotified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingBudgetPhoto, setUploadingBudgetPhoto] = useState(false);
  const [formData, setFormData] = useState({
    category: null,
    description: '',
    photos: [],
    urgency: null,
    address: '',
    phone: '',
  });

  const [categorias, setCategorias] = useState([
    { id: 'albanil', name: 'Albañil y reformas', icon: 'Hammer', businessCount: 0 },
    { id: 'carpintero', name: 'Carpintero', icon: 'TreePine', businessCount: 0 },
    { id: 'cerrajero', name: 'Cerrajero', icon: 'Key', businessCount: 0 },
    { id: 'climatizacion', name: 'Climatización y calefacción', icon: 'Snowflake', businessCount: 0 },
    { id: 'electricista', name: 'Electricista', icon: 'Zap', businessCount: 0 },
    { id: 'fontanero', name: 'Fontanero', icon: 'Droplet', businessCount: 0 },
    { id: 'jardineria', name: 'Jardinería', icon: 'Flower2', businessCount: 0 },
    { id: 'limpieza', name: 'Limpieza', icon: 'Sparkles', businessCount: 0 },
    { id: 'mudanzas', name: 'Mudanzas', icon: 'Truck', businessCount: 0 },
    { id: 'pintor', name: 'Pintor', icon: 'Paintbrush', businessCount: 0 },
    { id: 'reparacion', name: 'Reparación de móviles y PC', icon: 'Smartphone', businessCount: 0 },
  ]);

  // Cargar conteos reales desde Supabase
  useEffect(() => {
    const loadCounts = async () => {
      const { data } = await supabase
        .from('businesses')
        .select('subcategory')
        .eq('is_published', true)
        .eq('verification_status', 'approved')
        .limit(1000);

      if (!data) return;

      const counts = {};
      data.forEach(b => {
        if (b.subcategory) counts[b.subcategory] = (counts[b.subcategory] || 0) + 1;
      });

      setCategorias(prev => prev.map(cat => ({
        ...cat,
        businessCount: counts[cat.name] || 0,
      })));
    };
    loadCounts();
  }, []);

  const urgencias = [
    { id: 'urgent', label: 'Urgente', desc: 'Lo antes posible', icon: 'Zap', color: 'red' },
    { id: 'this-week', label: 'Esta semana', desc: 'En los próximos 7 días', icon: 'Calendar', color: 'amber' },
    { id: 'next-week', label: 'Próxima semana', desc: 'Sin prisa, cuando pueda', icon: 'Clock', color: 'green' },
  ];

  const categoriaSeleccionada = categorias.find(c => c.id === formData.category);

  const notifyAdmin = async () => {
    setLoading(true);
    try {
      await supabase.from('support_requests').insert({
        name: user?.full_name || 'Usuario',
        email: user?.email || 'sin-email@cornellalocal.es',
        subject: `[SIN EMPRESAS] Categoría: ${categoriaSeleccionada?.name || formData.category}`,
        message: `Un usuario ha solicitado presupuesto de '${categoriaSeleccionada?.name || formData.category}' pero no hay empresas en esa categoría. Por favor intenta encontrar proveedores para esta categoría en Cornelà.`,
        status: 'pending',
      });
      setAdminNotified(true);
    } catch (error) {
      console.error('Error enviando notificación admin:', error);
      showToast?.('Error al enviar la notificación', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canPaso1 = formData.category !== null;
  const canPaso2 = formData.description.trim() !== '' && formData.description.trim().length >= LIMITS.budgetRequest.descriptionMinLength;

  // Validaciones para Paso 3
  const phoneValidation = validatePhone(formData.phone);
  const addressValidation = validateRequired(formData.address, 'La dirección');
  const canPaso3 = formData.urgency !== null && addressValidation.isValid && phoneValidation.isValid;

  // Pantalla de éxito
  if ((enviado || adminNotified) && categoriaSeleccionada) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-green-500 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="text-green-500" size={48} />
        </div>
        <h2 className="text-white text-2xl font-bold mb-4">{adminNotified ? '¡Administrador avisado!' : '¡Solicitud Enviada!'}</h2>
        <p className="text-white/90 text-center mb-4">
          {adminNotified
            ? <>Él buscará empresas de <span className="font-bold">{categoriaSeleccionada.name}</span> en Cornellà y te contactará cuando haya disponibles</>
            : <>Tu solicitud de <span className="font-bold">{categoriaSeleccionada.name}</span> ha sido enviada a {categoriaSeleccionada.businessCount} empresa{categoriaSeleccionada.businessCount !== 1 ? 's' : ''}</>
          }
        </p>
        <p className="text-white/70 text-sm text-center mb-8">
          {adminNotified ? 'Mientras tanto puedes explorar otras categorías' : 'Las empresas podrán enviarte su presupuesto directamente'}
        </p>
        <button
          onClick={() => onNavigate('my-budget-requests')}
          className="w-full h-14 bg-white text-green-600 font-bold rounded-xl mb-3"
        >
          Ver Mis Presupuestos
        </button>
        <button
          onClick={() => onNavigate('home')}
          className="w-full h-12 bg-green-600 text-white font-medium rounded-xl border-2 border-white/30"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center px-4 py-4">
          <button aria-label="Volver"
            onClick={() => paso > 1 ? setPaso(paso - 1) : onNavigate('home')}
            className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-slate-900 text-lg font-bold flex-1 text-center pr-10">
            Solicitud de Presupuesto
          </h2>
        </div>

        {/* Progress */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step, idx) => (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    paso >= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {paso > step ? <Check size={16} /> : step}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${paso >= step ? 'text-primary' : 'text-gray-500'}`}>
                    {step === 1 ? 'SERVICIO' : step === 2 ? 'DETALLES' : 'CONTACTO'}
                  </span>
                </div>
                {idx < 2 && <div className={`w-16 h-0.5 mx-2 mb-4 ${paso > step ? 'bg-primary' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="px-4 py-6 pb-32">
        {/* Paso 1: Categoría */}
        {paso === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">¿Qué servicio necesitas?</h3>
            <div className="grid grid-cols-2 gap-3">
              {categorias.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                  className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    formData.category === cat.id ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
                  }`}
                >
                  {formData.category === cat.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="text-white" size={12} />
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                    formData.category === cat.id ? 'bg-primary/20' : 'bg-gray-100'
                  }`}>
                    <Icon name={cat.icon} size={20} className={formData.category === cat.id ? 'text-primary' : 'text-gray-500'} />
                  </div>
                  <span className="text-xs font-bold text-slate-900 text-center">{cat.name}</span>
                  <span className={"text-[10px] font-medium mt-1 " + (cat.businessCount === 0 ? "text-gray-500" : "text-primary")}>{cat.businessCount === 0 ? "Sin empresas" : `${cat.businessCount} empresa${cat.businessCount !== 1 ? "s" : ""}`}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paso 2: Descripción */}
        {paso === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Icon name={categoriaSeleccionada?.icon} size={24} className="text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{categoriaSeleccionada?.name}</h4>
                <p className="text-sm text-gray-500">{categoriaSeleccionada?.businessCount > 0 ? `${categoriaSeleccionada.businessCount} empresa${categoriaSeleccionada.businessCount !== 1 ? 's' : ''} disponibles` : 'Sin empresas aún'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Describe el trabajo que necesitas * <span className="text-xs text-gray-500 font-normal">(mínimo 20 caracteres)</span>
              </label>
              <textarea aria-label="Describe el trabajo que necesitas"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Necesito arreglar una fuga en el baño, debajo del lavabo. Gotea constantemente y se está mojando el suelo..."
                rows={5}
                className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-900 placeholder:text-gray-500 ${
                  formData.description && formData.description.trim().length < LIMITS.budgetRequest.descriptionMinLength
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-gray-200 focus:border-primary'
                }`}
              />
              <div className="mt-1 flex justify-between items-center">
                <span className={`text-xs ${
                  formData.description.trim().length >= LIMITS.budgetRequest.descriptionMinLength ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {formData.description.trim().length >= 20 ? '✓ Descripción válida' : `${formData.description.trim().length}/20 caracteres`}
                </span>
                <span className="text-xs text-gray-500">{formData.description.length}/500</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Fotos (opcional)
              </label>
              <div className="flex gap-3">
                {formData.photos.map((photo, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                    <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url("${photo}")` }} />
                    <button aria-label="Cerrar"
                      onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }))}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="text-white" size={12} />
                    </button>
                  </div>
                ))}
                {formData.photos.length < LIMITS.budgetRequest.maxPhotos && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-primary hover:text-primary transition-colors">
                    {uploadingBudgetPhoto ? <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /> : <Plus size={24} />}
                    <span className="text-[10px]">{uploadingBudgetPhoto ? '...' : 'Añadir'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || uploadingBudgetPhoto) return;
                      if (file.size > 5 * 1024 * 1024) { showToast?.('La imagen no puede superar 5MB', 'error'); return; }
                      setUploadingBudgetPhoto(true);
                      try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${user?.id || 'unknown'}/budget-requests/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                        const { error } = await supabase.storage.from('business-photos').upload(fileName, file, { cacheControl: '3600', upsert: false });
                        if (error) throw error;
                        const { data: { publicUrl } } = supabase.storage.from('business-photos').getPublicUrl(fileName);
                        setFormData(prev => ({ ...prev, photos: [...prev.photos, publicUrl] }));
                      } catch (error) { console.error('Error subiendo foto presupuesto:', error); showToast?.('Error al subir la foto', 'error'); }
                      finally { setUploadingBudgetPhoto(false); }
                    }} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Paso 3: Urgencia y Contacto */}
        {paso === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">¿Cuándo lo necesitas?</label>
              <div className="space-y-3">
                {urgencias.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setFormData(prev => ({ ...prev, urgency: u.id }))}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 ${
                      formData.urgency === u.id ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      u.color === 'red' ? 'bg-red-100' : u.color === 'amber' ? 'bg-amber-100' : 'bg-green-100'
                    }`}>
                      <Icon name={u.icon} size={20} className={
                        u.color === 'red' ? 'text-red-500' : u.color === 'amber' ? 'text-amber-500' : 'text-green-500'
                      } />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-bold text-slate-900">{u.label}</span>
                      <p className="text-sm text-gray-500">{u.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.urgency === u.id ? 'border-primary bg-primary' : 'border-gray-300'
                    }`}>
                      {formData.urgency === u.id && <Check className="text-white" size={12} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Dirección del servicio *</label>
              <input aria-label="Dirección del servicio"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="C/ Mayor 45, Cornellà de Llobregat"
                className={`w-full h-12 px-4 rounded-xl border bg-white text-slate-900 placeholder:text-gray-500 ${
                  formData.address && !addressValidation.isValid
                    ? 'border-red-300 focus:border-red-400'
                    : formData.address ? 'border-green-300 focus:border-green-400' : 'border-gray-200 focus:border-primary'
                }`}
              />
              {formData.address && !addressValidation.isValid && (
                <p className="mt-1 text-xs text-red-500">{addressValidation.error}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Teléfono de contacto * <span className="text-xs text-gray-500 font-normal">(ej: 612345678)</span>
              </label>
              <input aria-label="Teléfono de contacto"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="612 345 678"
                className={`w-full h-12 px-4 rounded-xl border bg-white text-slate-900 placeholder:text-gray-500 ${
                  formData.phone && !phoneValidation.isValid
                    ? 'border-red-300 focus:border-red-400'
                    : formData.phone && phoneValidation.isValid ? 'border-green-300 focus:border-green-400' : 'border-gray-200 focus:border-primary'
                }`}
              />
              {formData.phone && !phoneValidation.isValid && (
                <p className="mt-1 text-xs text-red-500">{phoneValidation.error}</p>
              )}
              {formData.phone && phoneValidation.isValid && (
                <p className="mt-1 text-xs text-green-600">✓ Teléfono válido</p>
              )}
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                🔒 Tu teléfono solo lo verá el negocio cuyo presupuesto aceptes. Los negocios que reciben la solicitud
                ven la descripción, las fotos y la dirección para poder darte precio.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Botón fijo */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4">
        {paso === 3 && categoriaSeleccionada && categoriaSeleccionada.businessCount === 0 ? (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-amber-800">No hay empresas en esta categoría</p>
              <p className="text-xs text-amber-600 mt-1">Podemos avisar al administrador para que busque proveedores</p>
            </div>
            <button
              onClick={notifyAdmin}
              disabled={loading || !canPaso3}
              className="w-full h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-amber-700 text-white disabled:opacity-60"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : null}
              {loading ? 'Enviando...' : 'Avisar al administrador'}
            </button>
            <button onClick={() => setPaso(1)} className="w-full h-10 text-sm text-gray-500 hover:text-gray-700">
              Elegir otra categoría
            </button>
          </div>
        ) : (
          <>
            {paso === 3 && categoriaSeleccionada && canPaso3 && (
              <p className="text-xs text-center text-gray-500 mb-3">
                Se enviará a <span className="font-bold text-primary">{categoriaSeleccionada.businessCount} empresa{categoriaSeleccionada.businessCount !== 1 ? 's' : ''}</span>
              </p>
            )}
            <button
              onClick={async () => {
                if (paso === 1 && canPaso1) {
                  setPaso(2);
                } else if (paso === 2 && canPaso2) {
                  setPaso(3);
                } else if (paso === 3 && canPaso3 && !enviado && !loading) {
                  try {
                    setLoading(true);
                    if (onSubmitRequest) {
                      await onSubmitRequest({
                        category: categoriaSeleccionada.id,
                        categoryName: categoriaSeleccionada.name,
                        categoryIcon: categoriaSeleccionada.icon,
                        description: formData.description,
                        photos: formData.photos,
                        urgency: formData.urgency,
                        address: formData.address,
                        phone: formData.phone,
                        businessCount: categoriaSeleccionada.businessCount,
                        createdAt: new Date().toISOString(),
                        status: 'pending',
                      });
                    }
                    setEnviado(true);
                  } catch (error) {
                    showToast?.('Error al enviar la solicitud. Inténtalo de nuevo.', 'error');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              disabled={
                (paso === 1 && !canPaso1) ||
                (paso === 2 && !canPaso2) ||
                (paso === 3 && !canPaso3) ||
                loading
              }
              className={`w-full h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 ${
                ((paso === 1 ? canPaso1 : paso === 2 ? canPaso2 : canPaso3) && !loading)
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {loading ? (
                <>Enviando...</>
              ) : paso === 3 ? (
                <>Enviar a {categoriaSeleccionada?.businessCount || 0} empresa{categoriaSeleccionada?.businessCount !== 1 ? 's' : ''} <Send size={18} /></>
              ) : (
                <>Siguiente <ArrowRight size={18} /></>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Pantalla de Presupuesto Directo (desde la página de un negocio)
const DirectBudgetScreen = ({ onNavigate, businessId, businessName, user, showToast, onSubmitRequest }) => {
  const [formData, setFormData] = useState({
    description: '',
    photos: [],
    urgency: 'this-week',
    address: '',
    phone: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingDPhoto, setUploadingDPhoto] = useState(false);
  const [businessInfo, setBusinessInfo] = useState(null); // { subcategory, categoryCount }

  useEffect(() => {
    const fetchInfo = async () => {
      const { data: biz } = await supabase
        .from('businesses')
        .select('subcategory, category_id')
        .eq('id', businessId)
        .single();
      if (!biz) return;
      const { count } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('subcategory', biz.subcategory)
        .eq('verification_status', 'approved')
        .eq('is_published', true);
      setBusinessInfo({ subcategory: biz.subcategory, categoryCount: count || 1 });
    };
    if (businessId) fetchInfo();
  }, [businessId]);

  const urgencyOptions = [
    { id: 'urgent', label: 'Urgente', description: 'Lo antes posible', icon: 'Zap', color: 'red' },
    { id: 'this-week', label: 'Esta semana', description: 'En los próximos 7 días', icon: 'Calendar', color: 'amber' },
    { id: 'next-week', label: 'Sin prisa', description: 'Cuando pueda', icon: 'Clock', color: 'green' },
  ];

  const handleAddPhoto = async (file) => {
    if (!file || uploadingDPhoto || formData.photos.length >= LIMITS.budgetRequest.maxPhotos) return;
    if (file.size > 5 * 1024 * 1024) { showToast?.('La imagen no puede superar 5MB', 'error'); return; }
    setUploadingDPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || 'unknown'}/budget-requests/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error } = await supabase.storage.from('business-photos').upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('business-photos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, photos: [...prev.photos, publicUrl] }));
    } catch (error) { console.error('Error subiendo foto documento:', error); showToast?.('Error al subir la foto', 'error'); }
    finally { setUploadingDPhoto(false); }
  };

  const canSubmit = formData.description.trim().length >= 10
    && formData.address.trim().length >= 5
    && formData.phone.trim().length >= 9;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      if (onSubmitRequest) {
        await onSubmitRequest({
          category: businessInfo?.subcategory || 'general',
          categoryName: businessInfo?.subcategory || businessName,
          categoryIcon: 'Store',
          description: formData.description,
          photos: formData.photos,
          urgency: formData.urgency,
          address: formData.address,
          phone: formData.phone,
          businessCount: businessInfo?.categoryCount || 1,
          createdAt: new Date().toISOString(),
          status: 'pending',
        });
      }
      setSubmitted(true);
    } catch (error) {
      console.error('Error enviando solicitud de soporte:', error);
      showToast?.('Error al enviar la solicitud', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gradient-to-b from-green-500 to-green-600">
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg">
            <CheckCircle2 className="text-green-500" size={48} />
          </div>
          <h1 className="text-white text-2xl font-bold mb-3">¡Solicitud Enviada!</h1>
          <p className="text-white/90 text-base mb-4">
            Tu solicitud ha sido enviada a{' '}
            <span className="font-bold">{businessInfo?.categoryCount || 1} empresa{businessInfo?.categoryCount !== 1 ? 's' : ''}</span>{' '}
            de {businessInfo?.subcategory || businessName}
          </p>
          <div className="bg-white/20 rounded-2xl p-4 mb-8">
            <div className="flex items-center gap-2 text-white">
              <Clock size={20} />
              <span className="font-medium">Cada empresa puede responderte con su precio</span>
            </div>
          </div>
          <p className="text-white/80 text-sm mb-8">
            Recibirás una notificación por cada presupuesto que llegue. Acepta el que más te convenga.
          </p>
          <button
            onClick={() => onNavigate('my-budget-requests')}
            className="w-full h-14 bg-white text-green-600 rounded-2xl font-bold text-base shadow-lg hover:bg-gray-50 active:scale-[0.98] transition-all mb-3"
          >
            Ver mis solicitudes
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="w-full h-14 bg-white/20 text-white rounded-2xl font-bold text-base hover:bg-white/30 active:scale-[0.98] transition-all"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center px-4 py-4">
          <button aria-label="Volver"
            onClick={() => onNavigate('business', { id: businessId })}
            className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
            Pedir Presupuesto
          </h2>
        </div>
      </header>

      <div className="px-4 py-6 pb-32 space-y-6">
        {/* Info banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Store className="text-primary" size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {businessInfo
                ? `${businessInfo.categoryCount} empresa${businessInfo.categoryCount !== 1 ? 's' : ''} de ${businessInfo.subcategory}`
                : businessName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Todas las empresas de esta categoría recibirán tu solicitud y podrán enviarte su precio
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">
            Describe qué necesitas <span className="text-red-500">*</span>
          </label>
          <textarea aria-label="Describe qué necesitas"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Ej: Necesito pintar el salón y dos habitaciones. Las paredes están en buen estado..."
            className="w-full h-32 p-4 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">Mínimo 10 caracteres ({formData.description.length})</p>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Fotos (opcional)</label>
          <div className="flex gap-3">
            {formData.photos.map((photo, index) => (
              <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button aria-label="Cerrar"
                  onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X className="text-white" size={12} />
                </button>
              </div>
            ))}
            {formData.photos.length < 3 && (
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                {uploadingDPhoto ? <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /> : <Camera className="text-gray-500" size={20} />}
                <span className="text-[10px] text-gray-500">{uploadingDPhoto ? '...' : 'Añadir'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAddPhoto(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">¿Cuándo lo necesitas?</label>
          <div className="space-y-2">
            {urgencyOptions.map(option => (
              <button
                key={option.id}
                onClick={() => setFormData(prev => ({ ...prev, urgency: option.id }))}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  formData.urgency === option.id ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  option.color === 'red' ? 'bg-red-100' : option.color === 'amber' ? 'bg-amber-100' : 'bg-green-100'
                }`}>
                  <Icon name={option.icon} size={20} className={
                    option.color === 'red' ? 'text-red-500' : option.color === 'amber' ? 'text-amber-500' : 'text-green-500'
                  } />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-slate-900">{option.label}</p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
                {formData.urgency === option.id && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="text-white" size={14} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">
            Dirección del servicio <span className="text-red-500">*</span>
          </label>
          <input aria-label="Dirección del servicio"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="C/ Mayor 45, Cornellà de Llobregat"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">
            Teléfono de contacto <span className="text-red-500">*</span>
          </label>
          <input aria-label="Teléfono de contacto"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="612 345 678"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:border-primary focus:outline-none"
          />
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">
            🔒 El negocio ve la descripción, las fotos y la dirección para darte precio. Tu teléfono solo lo verá
            si aceptas su presupuesto.
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 left-0 w-full max-w-md mx-auto bg-white border-t border-gray-100 p-4 pb-8 z-20" style={{ left: '50%', transform: 'translateX(-50%)' }}>
        {businessInfo && (
          <p className="text-xs text-center text-gray-500 mb-3">
            Se enviará a <span className="font-bold text-primary">{businessInfo.categoryCount} empresa{businessInfo.categoryCount !== 1 ? 's' : ''}</span>
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
            canSubmit && !loading ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-dark active:scale-[0.98]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
          {loading ? 'Enviando...' : `Enviar solicitud`}
        </button>
      </div>
    </div>
  );
};

// Página de Todas las Ofertas Flash
const FlashOffersScreen = ({ onNavigate, userOffers = [] }) => {
  const [flashOffers, setFlashOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [displayCount, setDisplayCount] = useState(10);

  // Cargar ofertas flash desde Supabase
  useEffect(() => {
    const fetchFlashOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            businesses!inner(id, name)
          `)
          .eq('is_flash', true)
          .eq('status', 'active')
          .eq('is_visible', true)
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: true })
          .limit(50);

        if (error) throw error;
        setFlashOffers(data || []);
      } catch (error) {
        console.error('Error cargando ofertas flash:', error);
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchFlashOffers();
  }, []);

  // Calcular tiempo restante desde expires_at
  const calculateTimeLeft = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;

    if (diffMs <= 0) return '0m';

    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Transformar ofertas de Supabase al formato esperado (memoizado)
  const allFlashOffers = useMemo(() => flashOffers.map(offer => {
    const timeLeft = calculateTimeLeft(offer.expires_at);
    const now = new Date();
    const expires = new Date(offer.expires_at);
    const diffMinutes = Math.floor((expires - now) / 60000);

    return {
      id: offer.id,
      title: offer.title,
      image: offer.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EOferta%3C/text%3E%3C/svg%3E",
      discount: offer.discount_label ||
               (offer.discount_type === '2x1' ? '2x1' :
                offer.discount_type === 'free' ? 'GRATIS' :
                (offer.discount_value || '0') + '%'),
      discountType: offer.discount_type,
      timeLeft: timeLeft,
      timeMinutes: diffMinutes,
      originalPrice: offer.original_price || 0,
      discountedPrice: offer.discounted_price || 0,
      businessName: offer.businesses?.name || 'Negocio',
      description: offer.description,
    };
  }), [flashOffers]);

  const getTimeColor = (minutes) => {
    if (minutes <= 60) return 'text-red-700 bg-red-50';
    if (minutes <= 180) return 'text-orange-800 bg-orange-50';
    return 'text-green-800 bg-green-50';
  };

  const getTimeIcon = (minutes) => {
    if (minutes <= 60) return 'text-red-500';
    if (minutes <= 180) return 'text-orange-500';
    return 'text-green-600';
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center px-4 py-4">
          <button aria-label="Volver"
            onClick={() => onNavigate('home')}
            className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 text-center pr-10">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-slate-900 text-lg font-bold">Ofertas Flash</h2>
              <Zap className="text-yellow-500" size={20} />
            </div>
            <p className="text-xs text-gray-500">{allFlashOffers.length} ofertas activas</p>
          </div>
        </div>
      </header>

      {/* Info Banner */}
      <div className="px-4 py-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <Timer className="text-yellow-600" size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Ordenadas por tiempo</p>
            <p className="text-xs text-gray-600">Las que expiran antes aparecen primero</p>
          </div>
        </div>
      </div>

      {/* Offers List */}
      <div className="px-4 py-4 pb-8 space-y-4">
        {allFlashOffers.length === 0 ? (
          <EmptyState
            icon="Zap"
            title="Sin ofertas flash"
            description="No hay ofertas flash activas en este momento. ¡Vuelve pronto!"
            actionLabel="Volver al inicio"
            onAction={() => onNavigate('home')}
            color="orange"
          />
        ) : (
          <>
          {allFlashOffers.slice(0, displayCount).map((offer, index) => (
            <div
              key={offer.id}
              onClick={() => onNavigate('coupon', { id: offer.id })}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex">
                {/* Image */}
                <div className="relative w-28 h-28 shrink-0">
                  <img
                    src={offer.image}
                    alt={offer.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {/* Position Badge */}
                  {index < 3 && (
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-red-600' : index === 1 ? 'bg-orange-700' : 'bg-yellow-700'
                    }`}>
                      {index + 1}
                    </div>
                  )}
                  {/* Discount Badge */}
                  <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-lg">
                    {offer.discount}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 mb-1">{offer.title}</h3>
                    <p className="text-xs text-gray-500">{offer.businessName}</p>
                  </div>

                  {/* Time & Price */}
                  <div className="flex items-center justify-between mt-2">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${getTimeColor(offer.timeMinutes)}`}>
                      <Clock size={12} className={getTimeIcon(offer.timeMinutes)} />
                      <span>Quedan {offer.timeLeft}</span>
                    </div>
                    <div className="text-right">
                      {offer.originalPrice > 0 && (
                        <span className="text-xs text-gray-500 line-through mr-1">{formatCurrency(offer.originalPrice)}</span>
                      )}
                      <span className="text-sm font-bold text-primary">
                        {offer.discountType === 'free' || offer.discountedPrice === 0
                          ? 'GRATIS'
                          : formatCurrency(offer.discountedPrice || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Urgency indicator for first 3 */}
              {index < 3 && (
                <div className={`px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                  index === 0 ? 'bg-red-50 text-red-700' :
                  index === 1 ? 'bg-orange-50 text-orange-800' :
                  'bg-yellow-50 text-yellow-800'
                }`}>
                  <Zap size={12} />
                  {index === 0 ? '¡Expira muy pronto!' : index === 1 ? 'Pocas horas restantes' : 'Aprovecha antes que acabe'}
                </div>
              )}
            </div>
          ))}
          {allFlashOffers.length > displayCount && (
            <button
              onClick={() => setDisplayCount(prev => prev + 10)}
              className="w-full py-3 text-primary font-semibold text-sm border border-primary/30 rounded-2xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronDown size={18} />
              Ver más ofertas ({allFlashOffers.length - displayCount} restantes)
            </button>
          )}
          </>
        )}
      </div>
    </div>
  );
};

// Tarjeta de oferta con botón de fuego
const OfferCard = ({ offer, isFired, onFire, onNavigate }) => (
  <div
    onClick={() => onNavigate('coupon', { id: offer.id })}
    className="group bg-white rounded-2xl shadow-soft overflow-hidden transform transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer border border-gray-100"
  >
    <div className="h-40 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url("${offer.image}")` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute top-3 left-3 bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
        {offer.discount}
      </div>
      <button aria-label="WhatsApp"
        onClick={(e) => { e.stopPropagation(); const url = `${window.location.origin}${window.location.pathname}?oferta=${offer.id}`; window.open(`https://wa.me/?text=${encodeURIComponent(`¡Oferta en Cornellà! 🛍️\n\n*${offer.title}*\n🏪 ${offer.business}\n💰 ${offer.discount}\n\n👉 ${url}`)}`, '_blank', 'noopener,noreferrer'); }}
        className="absolute top-3 right-3 w-9 h-9 bg-green-700 text-white rounded-full flex items-center justify-center hover:bg-green-800 transition-colors shadow-lg"
      >
        <MessageCircle size={16} />
      </button>
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-white/90 text-xs font-medium mb-1 flex items-center gap-1">
          <Icon name="Store" size={14} /> {offer.business}
        </p>
        <h4 className="text-white text-lg font-bold leading-tight">{offer.title}</h4>
      </div>
    </div>
    <div className="p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {/* Botón fuego */}
        <button
          onClick={(e) => onFire(e, offer.id)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
            isFired
              ? 'bg-orange-100 text-orange-500 scale-105'
              : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-400'
          }`}
        >
          🔥 <span>{offer.fireCount > 0 ? offer.fireCount : ''}</span>
        </button>
        {offer.expiresIn && (
          <span className="text-slate-500 text-xs">{offer.expiresIn}</span>
        )}
      </div>
      <button className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shadow-lg shadow-primary/20 shrink-0">
        Ver Cupón
      </button>
    </div>
  </div>
);

// Página de Ofertas
const OffersPage = ({ onNavigate, user = null, userOffers = [], initialTab = 'offers', activeJobs = [], loadingJobs = false, getJobDaysRemaining, isBusinessOwner = false, notifications = [] }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [firedIds, setFiredIds] = useState(new Set());
  const [jobsDisplayCount, setJobsDisplayCount] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = async () => { setRefreshTrigger(prev => prev + 1); };
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh(handleRefresh);

  // Cargar ofertas normales + fires del usuario
  useEffect(() => {
    const load = async () => {
      setLoadingOffers(true);
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*, businesses!inner(id, name)')
          .eq('is_flash', false)
          .eq('status', 'active')
          .eq('is_visible', true)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        const transformed = (data || []).map(offer => {
          const daysLeft = Math.ceil((new Date(offer.expires_at) - new Date()) / 86400000);
          return {
            id: offer.id,
            title: offer.title,
            business: offer.businesses?.name || 'Negocio',
            businessId: offer.businesses?.id,
            businessIcon: 'Store',
            image: offer.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='600' height='400' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EOferta%3C/text%3E%3C/svg%3E",
            discount: offer.discount_label ||
                      (offer.discount_type === '2x1' ? '2x1' :
                       offer.discount_type === 'free' ? 'GRATIS' :
                       (offer.discount_value ? `-${offer.discount_value}%` : 'Oferta')),
            expiresIn: `${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
            description: offer.description,
            fireCount: offer.fire_count || 0,
          };
        });

        setOffers(transformed);

        // Cargar qué ofertas ha dado fuego el usuario
        if (user?.id && transformed.length > 0) {
          const ids = transformed.map(o => o.id);
          const { data: fires } = await supabase
            .from('offer_fires')
            .select('offer_id')
            .eq('user_id', user.id)
            .in('offer_id', ids);
          setFiredIds(new Set((fires || []).map(f => f.offer_id)));
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingOffers(false);
      }
    };
    load();
  }, [user?.id, refreshTrigger]);

  // Toggle fuego con optimistic update
  const toggleFire = async (e, offerId) => {
    e.stopPropagation();
    if (!user?.id) { onNavigate('login'); return; }
    const wasFired = firedIds.has(offerId);
    // Optimistic
    setFiredIds(prev => { const s = new Set(prev); wasFired ? s.delete(offerId) : s.add(offerId); return s; });
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, fireCount: Math.max(0, o.fireCount + (wasFired ? -1 : 1)) } : o));
    // Server
    const { data, error } = await supabase.rpc('toggle_offer_fire', { p_offer_id: offerId });
    if (error) {
      // Revertir
      setFiredIds(prev => { const s = new Set(prev); wasFired ? s.add(offerId) : s.delete(offerId); return s; });
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, fireCount: Math.max(0, o.fireCount + (wasFired ? 1 : -1)) } : o));
    } else if (data?.fire_count !== undefined) {
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, fireCount: data.fire_count } : o));
    }
  };

  // Destacadas: top 3 con al menos 1 fuego, ordenadas por fuegos
  const destacadas = useMemo(() =>
    [...offers].filter(o => o.fireCount > 0).sort((a, b) => b.fireCount - a.fireCount).slice(0, 3),
    [offers]
  );
  const destacadasIds = useMemo(() => new Set(destacadas.map(o => o.id)), [destacadas]);
  const restOffers = useMemo(() => offers.filter(o => !destacadasIds.has(o.id)), [offers, destacadasIds]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-white font-body text-slate-900 flex flex-col" {...handlers}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Header */}
      <div className="z-30 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center px-4 py-4 justify-between">
          <div className="w-10"></div>
          <h2 className="text-slate-900 text-[18px] font-bold tracking-tight text-center">Ofertas y Empleo</h2>
          <button aria-label="Notificaciones"
            onClick={() => onNavigate('notifications')}
            className="relative text-slate-900 p-2 -mr-2 rounded-full hover:bg-slate-50 transition"
          >
            <Bell size={26} />
            {(notifications?.filter(n => !n.isRead).length || 0) > 0 && (
              <span className="absolute top-1 right-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-600 border-2 border-white text-[10px] font-bold text-white">
                {notifications?.filter(n => !n.isRead).length || 0}
              </span>
            )}
          </button>
        </div>
        {/* Tabs */}
        <div className="px-4 pb-4">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 h-11 relative">
            <button
              onClick={() => setActiveTab('offers')}
              className={`flex-1 rounded-lg flex items-center justify-center text-[13px] font-semibold transition-all duration-300 ${
                activeTab === 'offers' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              Ofertas y Cupones
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex-1 rounded-lg flex items-center justify-center text-[13px] font-semibold transition-all duration-300 ${
                activeTab === 'jobs' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              Bolsa de Trabajo
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24 no-scrollbar">
        {activeTab === 'offers' ? (
          <div className="w-full pb-6">
            {loadingOffers ? (
              <div className="px-4 pt-6 space-y-4"><OfferListSkeleton count={4} /></div>
            ) : offers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <Tag size={48} className="text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No hay ofertas disponibles</p>
                <p className="text-slate-500 text-sm mt-1">Vuelve más tarde para ver nuevas ofertas</p>
              </div>
            ) : (
              <>
                {/* Sección Destacadas */}
                {destacadas.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 pt-6 pb-3 flex items-center gap-2">
                      <span className="text-lg">🔥</span>
                      <h3 className="text-slate-900 text-lg font-bold">Destacadas</h3>
                      <span className="text-xs text-orange-500 font-semibold bg-orange-50 px-2 py-0.5 rounded-full">Top {destacadas.length}</span>
                    </div>
                    <div className="px-4 space-y-4">
                      {destacadas.map(offer => (
                        <OfferCard key={offer.id} offer={offer} isFired={firedIds.has(offer.id)} onFire={toggleFire} onNavigate={onNavigate} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Sección Todas las ofertas */}
                {restOffers.length > 0 && (
                  <div>
                    <div className="px-4 pt-5 pb-3">
                      <h3 className="text-slate-900 text-lg font-bold">
                        {destacadas.length > 0 ? 'Todas las ofertas' : 'Ofertas disponibles'}
                      </h3>
                    </div>
                    <div className="px-4 space-y-4">
                      {restOffers.map(offer => (
                        <OfferCard key={offer.id} offer={offer} isFired={firedIds.has(offer.id)} onFire={toggleFire} onNavigate={onNavigate} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="w-full">
            <div className="px-4 pt-6 pb-3 flex items-center justify-between">
              <h3 className="text-slate-900 text-lg font-bold">Empleo Local</h3>
              <button className="text-primary text-xs font-semibold bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition">Ver alertas</button>
            </div>
            <div className="px-4 space-y-4 pb-6">
              {loadingJobs ? (
                <JobListSkeleton count={3} />
              ) : activeJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Briefcase size={48} className="text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No hay empleos disponibles</p>
                  <p className="text-slate-500 text-sm mt-1">Vuelve más tarde para ver nuevas ofertas</p>
                </div>
              ) : activeJobs.slice(0, jobsDisplayCount).map(job => {
                const daysRemaining = getJobDaysRemaining ? getJobDaysRemaining(job) : 60;
                const isExpired = daysRemaining <= 0;
                const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

                return (
                  <button
                    key={job.id}
                    onClick={() => onNavigate('job-detail', { id: job.id })}
                    className={`w-full text-left bg-white rounded-2xl p-4 shadow-soft hover:shadow-md transition-shadow cursor-pointer border ${
                      job.hired ? 'border-green-200 bg-green-50/30' :
                      isExpired ? 'border-red-200 bg-red-50/30' :
                      isExpiringSoon ? 'border-amber-200' :
                      'border-slate-100/50'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`size-14 rounded-xl flex items-center justify-center shrink-0 border ${
                        job.iconBg === 'orange' ? 'bg-orange-50 border-orange-100 text-orange-500' :
                        job.iconBg === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-500' :
                        'bg-green-50 border-green-100 text-green-600'
                      }`}>
                        <Icon name={job.icon} size={28} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-slate-900 font-bold text-[16px]">{job.title}</h4>
                            <p className="text-slate-500 text-sm font-medium">{job.company}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {job.hired ? (
                              <span className="text-[10px] text-green-600 font-bold whitespace-nowrap bg-green-100 px-2 py-1 rounded-md flex items-center gap-1">
                                <Check size={12} /> Contratado
                              </span>
                            ) : isExpired ? (
                              <span className="text-[10px] text-red-600 font-bold whitespace-nowrap bg-red-100 px-2 py-1 rounded-md">
                                Expirado
                              </span>
                            ) : (
                              <span className={`text-[10px] font-semibold whitespace-nowrap px-2 py-1 rounded-md ${
                                isExpiringSoon ? 'text-amber-600 bg-amber-100' : 'text-slate-500 bg-slate-100'
                              }`}>
                                {daysRemaining} días restantes
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3 mb-3">
                          {job.salary && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
                              {job.salary}
                            </span>
                          )}
                          {job.type && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
                              {job.type}
                            </span>
                          )}
                          {job.urgent && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                              Urgente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-3 border-t border-slate-100 flex justify-end">
                      <span className="text-primary text-sm font-semibold flex items-center hover:text-primary transition-colors">
                        Ver Empleo <ChevronRight size={18} className="ml-1" />
                      </span>
                    </div>
                  </button>
                );
              })}
              {activeJobs.length > jobsDisplayCount && (
                <button
                  onClick={() => setJobsDisplayCount(prev => prev + 10)}
                  className="w-full py-3 text-primary font-semibold text-sm border border-primary/30 rounded-2xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronDown size={18} />
                  Ver más empleos ({activeJobs.length - jobsDisplayCount} restantes)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navbar */}
      <Navbar currentPage="offers" onNavigate={onNavigate} />
    </div>
  );
};

// Página de Favoritos
const FavoritesPage = ({ onNavigate, userFavorites = [], toggleFavorite }) => {
  // Cargar negocios favoritos desde Supabase
  const [favoriteBusinesses, setFavoriteBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      if (userFavorites.length === 0) {
        setFavoriteBusinesses([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error} = await supabase
          .from('businesses')
          .select('*')
          .in('id', userFavorites);

        if (error) throw error;
        setFavoriteBusinesses(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [userFavorites]);

  return (
  <div className="relative mx-auto flex h-screen w-full max-w-md flex-col overflow-hidden bg-gray-50 shadow-2xl">
    {/* Status bar placeholder */}
    <div className="h-12 w-full shrink-0 bg-gray-50/90 backdrop-blur-md sticky top-0 z-30 flex items-end px-6 pb-2"></div>

    {/* Header */}
    <header className="flex shrink-0 flex-col bg-gray-50/95 px-6 pb-4 pt-2 backdrop-blur-sm z-20">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mis Favoritos</h1>
      <p className="mt-1 text-sm font-medium text-slate-500">{favoriteBusinesses.length} lugares guardados</p>
    </header>

    {/* Content */}
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2 no-scrollbar">
      <div className="flex flex-col gap-4">
        {loading ? (
          <BusinessListSkeleton count={3} />
        ) : favoriteBusinesses.length > 0 ? (
          favoriteBusinesses.map(business => (
            <BusinessCard
              key={business.id}
              business={business}
              variant="compact"
              onClick={() => onNavigate('business', { id: business.id })}
              isFavorite={true}
              onToggleFavorite={toggleFavorite}
            />
          ))
        ) : (
          <EmptyState
            icon="Heart"
            title="Sin favoritos aún"
            description="Guarda tus comercios favoritos pulsando el corazón para acceder a ellos rápidamente"
            actionLabel="Explorar comercios"
            onAction={() => onNavigate('home')}
            color="red"
          />
        )}

      </div>
    </div>

    {/* Navbar */}
    <Navbar currentPage="favorites" onNavigate={onNavigate} />
  </div>
  );
};








// Página de Perfil
const ProfilePage = ({ onNavigate, businessStatus, businessData, validateBusiness, savedCoupons = [], user, userOffers = [], userJobOffers = [], incomingBudgetRequests = [], userJobApplications = [], onDeleteBusiness, showToast }) => {
  const [showDeleteBusinessModal, setShowDeleteBusinessModal] = useState(false);
  const [deleteBusinessText, setDeleteBusinessText] = useState('');
  const [deletingBusiness, setDeletingBusiness] = useState(false);

  const handleDeleteBusinessConfirm = async () => {
    if (deleteBusinessText !== 'ELIMINAR') {
      showToast('Escribe ELIMINAR para confirmar', 'warning');
      return;
    }
    setDeletingBusiness(true);
    await onDeleteBusiness();
    setDeletingBusiness(false);
    setShowDeleteBusinessModal(false);
    setDeleteBusinessText('');
  };
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e2e8f0'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%2394a3b8'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='20' fill='%2394a3b8'/%3E%3C/svg%3E");
  const fileInputRef = useState(null);

  const handleAvatarClick = () => {
    // Crear un input file temporal
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAvatarUrl(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
  <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50 text-slate-900 font-display antialiased flex flex-col">
    {/* Header */}
    <header className="sticky top-0 z-50 bg-gray-50/95 backdrop-blur-md border-b border-transparent">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="w-10"></div>
        <h1 className="text-lg font-bold text-slate-900">Mi Perfil</h1>
        <button aria-label="Ajustes"
          onClick={() => onNavigate('settings')}
          className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors text-slate-800"
        >
          <Settings size={24} />
        </button>
      </div>
    </header>

    <div className="flex-1 flex flex-col gap-6 pb-28">
      {/* Avatar y nombre */}
      <section className="flex flex-col items-center px-6 pt-4">
        <div
          className="relative mb-4 group cursor-pointer"
          onClick={handleAvatarClick}
        >
          <div className="h-32 w-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 group-hover:opacity-90 transition-opacity">
            <UserAvatar
              url={avatarUrl && !avatarUrl.startsWith('data:image/svg+xml') ? avatarUrl : null}
              name={user?.full_name || user?.email}
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full flex items-center justify-center bg-primary/10 text-primary-dark text-4xl font-bold"
            />
          </div>
          <div className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-1.5 shadow-md border-2 border-white flex items-center justify-center group-hover:bg-blue-700 transition-colors">
            <Camera size={16} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/40 rounded-full p-3">
              <Camera className="text-white" size={24} />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-2xl font-bold text-slate-900 leading-tight">{user?.full_name || user?.name || 'Usuario'}</h2>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 rounded-full mt-1">
            <span className="text-green-600" size={18}>🌱</span>
            <span className="text-sm font-semibold text-green-700">Vecino Local</span>
          </div>
          <p className="text-sm text-slate-500 mt-2">Miembro desde {user?.created_at ? formatDate(user.created_at, 'short') : 'hace poco'}</p>
        </div>
      </section>


      {/* Mis Cupones Guardados */}
      {savedCoupons && savedCoupons.length > 0 && (
        <section className="px-5 w-full max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-900 mb-4 px-1">Mis Cupones</h3>
          <div className="space-y-3">
            {savedCoupons.map(coupon => (
              <button
                key={coupon.id}
                onClick={() => onNavigate('coupon', { id: coupon.id })}
                className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${coupon.image}")` }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{coupon.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{coupon.business}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {coupon.code}
                    </span>
                    <span className="text-xs text-gray-500">
                      Válido hasta {coupon.validUntil}
                    </span>
                  </div>
                </div>
                <ChevronRight className="text-gray-500 shrink-0" size={20} />
              </button>
            ))}
          </div>
        </section>
      )}


      {/* Mi Actividad */}
      <section className="px-5 w-full max-w-md mx-auto">
        <h3 className="text-lg font-bold text-slate-900 mb-4 px-1">Mi Actividad</h3>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
          <button
            onClick={() => onNavigate('user-reviews')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600 group-hover:text-yellow-700 transition-colors">
                <Star size={20} />
              </div>
              <div>
                <span className="font-medium text-slate-700 block">Mis Reseñas</span>
                <span className="text-xs text-slate-500">Ver mis reseñas</span>
              </div>
            </div>
            <ChevronRight className="text-slate-500" size={20} />
          </button>
          <button
            onClick={() => onNavigate('user-jobs')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:text-blue-700 transition-colors">
                <Briefcase size={20} />
              </div>
              <div>
                <span className="font-medium text-slate-700 block">Mis Candidaturas</span>
                <span className="text-xs text-slate-500">{userJobApplications.length} activas</span>
              </div>
            </div>
            <ChevronRight className="text-slate-500" size={20} />
          </button>
          <button
            onClick={() => onNavigate('my-budget-requests')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-teal-100 p-2 rounded-lg text-teal-600 group-hover:text-teal-700 transition-colors">
                <ClipboardList size={20} />
              </div>
              <div>
                <span className="font-medium text-slate-700 block">Mis Presupuestos</span>
                <span className="text-xs text-slate-500">Solicitudes y respuestas</span>
              </div>
            </div>
            <ChevronRight className="text-slate-500" size={20} />
          </button>
        </div>
      </section>

      {/* Mi Negocio - Estado de validación */}
      <section className="px-5 w-full max-w-md mx-auto">
        <h3 className="text-lg font-bold text-slate-900 mb-4 px-1">Mi Negocio</h3>

        {/* Sin negocio registrado */}
        {!businessStatus && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-dashed border-slate-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                <Store size={32} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">¿Tienes un negocio?</h4>
              <p className="text-sm text-slate-500 mb-4">
                Regístralo en Cornellà Local y llega a más clientes de tu barrio
              </p>
              <button
                onClick={() => onNavigate('business-data')}
                className="w-full h-12 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Registrar mi negocio
              </button>
            </div>
          </div>
        )}

        {/* Alta empezada pero sin enviar: faltan pasos */}
        {businessStatus === 'draft' && (
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-primary-dark shrink-0">
                <Store size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-900 mb-1">Termina tu alta</h4>
                <p className="text-sm text-slate-600 mb-3">
                  Completa la información, el horario, las fotos y los documentos y envía la solicitud. Cuando la aprobemos, tu negocio se publicará tal cual.
                </p>
                <button
                  onClick={() => onNavigate('edit-business', { initialStep: 1 })}
                  className="w-full h-11 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
                >
                  Continuar el alta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Negocio pendiente de validación */}
        {businessStatus === 'pending' && (
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                <Clock size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-amber-800 mb-1">En revisión</h4>
                <p className="text-sm text-amber-700 mb-3">
                  Tu solicitud está siendo revisada. Recibirás una notificación en las próximas 24 horas.
                </p>
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span>Verificando documentación...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Negocio validado */}
        {businessStatus === 'validated' && (
          <div className="bg-green-50 rounded-2xl p-5 border border-green-200 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
                <BadgeCheck size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-lg font-bold text-green-800 flex items-center gap-2">
                    {businessData?.name || 'Mi Negocio'}
                    <BadgeCheck className="text-primary fill-primary" size={20} />
                  </h4>
                  <span className="bg-green-200 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">VERIFICADO</span>
                </div>
                <p className="text-sm text-green-700">
                  Tu negocio está activo en Cornellà Local
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Negocio rechazado */}
        {businessStatus === 'rejected' && (
          <div className="bg-red-50 rounded-2xl border border-red-200 overflow-hidden">
            <div className="bg-red-100 px-4 py-3 flex items-center gap-2">
              <XCircle size={18} className="text-red-600" />
              <span className="font-bold text-red-800 text-sm">
                Solicitud rechazada
                {(businessData?.rejection_count || 0) > 1 && (
                  <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {businessData.rejection_count}ª vez
                  </span>
                )}
              </span>
            </div>
            <div className="p-4">
              {businessData?.rejection_reason && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Motivo del rechazo:</p>
                  <p className="text-sm text-red-700 bg-red-100 rounded-lg px-3 py-2">
                    {businessData.rejection_reason}
                  </p>
                </div>
              )}
              <p className="text-sm text-red-600 mb-4">
                Puedes apelar adjuntando imágenes y una justificación. El administrador revisará tu apelación.
              </p>
              <button
                onClick={() => onNavigate('business-appeal')}
                className="w-full h-11 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <ArrowRight size={16} />
                Apelar rechazo
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Panel de Administración - Solo visible para admins */}
      {user?.is_admin && (
        <section className="px-5 w-full max-w-md mx-auto mb-6">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <ShieldAlert className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Panel de Administración</h3>
                <p className="text-white/80 text-sm">Gestiona la plataforma</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('admin-dashboard')}
              className="w-full h-12 bg-white text-red-600 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <UserCog size={20} />
              Acceder al Panel Admin
              <ChevronRight size={20} />
            </button>
          </div>
        </section>
      )}

      {/* Panel de Propietario - Solo visible si está validado */}
      {businessStatus === 'validated' && (
        <>
        <section className="px-5 w-full max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-900 mb-4 px-1">Panel de Propietario</h3>

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
            <button
              onClick={() => onNavigate('incoming-budget-requests')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg text-green-600 group-hover:text-green-700 transition-colors relative">
                  <ClipboardList size={20} />
                  {incomingBudgetRequests.filter(r => r.status === 'new').length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                      {incomingBudgetRequests.filter(r => r.status === 'new').length}
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-medium text-slate-700 block">Presupuestos Entrantes</span>
                  <span className="text-xs text-slate-500">
                    {incomingBudgetRequests.filter(r => r.status === 'new').length > 0
                      ? `${incomingBudgetRequests.filter(r => r.status === 'new').length} solicitud${incomingBudgetRequests.filter(r => r.status === 'new').length > 1 ? 'es' : ''} nueva${incomingBudgetRequests.filter(r => r.status === 'new').length > 1 ? 's' : ''}`
                      : 'Sin solicitudes nuevas'}
                  </span>
                </div>
              </div>
              <ChevronRight className="text-slate-500" size={20} />
            </button>
            <button
              onClick={() => onNavigate('business-offers')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-600 group-hover:text-purple-700 transition-colors">
                  <Tag size={20} />
                </div>
                <div>
                  <span className="font-medium text-slate-700 block">Gestionar Ofertas</span>
                  <span className="text-xs text-slate-500">{userOffers.filter(o => o.status === 'active').length} ofertas activas</span>
                </div>
              </div>
              <ChevronRight className="text-slate-500" size={20} />
            </button>
            <button
              onClick={() => onNavigate('business-jobs')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:text-blue-700 transition-colors">
                  <Briefcase size={20} />
                </div>
                <div>
                  <span className="font-medium text-slate-700 block">Ofertas de Empleo</span>
                  <span className="text-xs text-slate-500">{pluralize(userJobOffers.filter(j => j.status === 'active').length, 'empleo activo', 'empleos activos')}</span>
                </div>
              </div>
              <ChevronRight className="text-slate-500" size={20} />
            </button>
            <button
              onClick={() => onNavigate('business-stats')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600 group-hover:text-orange-700 transition-colors">
                  <LayoutDashboard size={20} />
                </div>
                <div>
                  <span className="font-medium text-slate-700 block">Estadísticas</span>
                  <span className="text-xs text-slate-500">Visualizaciones y clics</span>
                </div>
              </div>
              <ChevronRight className="text-slate-500" size={20} />
            </button>
            <button
              onClick={() => onNavigate('validate-code')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600 group-hover:text-amber-700 transition-colors">
                  <Ticket size={20} />
                </div>
                <div>
                  <span className="font-medium text-slate-700 block">Validar código</span>
                  <span className="text-xs text-slate-500">Canjear descuento de cliente</span>
                </div>
              </div>
              <ChevronRight className="text-slate-500" size={20} />
            </button>
            <button
              onClick={() => onNavigate('edit-business')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-cyan-100 p-2 rounded-lg text-cyan-600 group-hover:text-cyan-700 transition-colors">
                  <Edit3 size={20} />
                </div>
                <div>
                  <span className="font-medium text-slate-700 block">Editar Negocio</span>
                  <span className="text-xs text-slate-500">Modifica los datos de tu comercio</span>
                </div>
              </div>
              <ChevronRight className="text-slate-500" size={20} />
            </button>
          </div>

          {/* Zona de peligro */}
          <div className="mt-4 border border-red-200 rounded-2xl overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
              <span className="text-sm font-semibold text-red-700">Zona de peligro</span>
            </div>
            <div className="p-4 bg-white">
              <button
                onClick={() => setShowDeleteBusinessModal(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 hover:bg-red-50 transition-colors text-left"
              >
                <div className="bg-red-100 p-2 rounded-lg">
                  <Trash2 size={18} className="text-red-600" />
                </div>
                <div>
                  <span className="font-medium text-red-700 block text-sm">Eliminar negocio</span>
                  <span className="text-xs text-red-500">Acción permanente e irreversible</span>
                </div>
              </button>
            </div>
          </div>
        </section>

        {showDeleteBusinessModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-2.5 rounded-full">
                  <Trash2 size={22} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Eliminar negocio</h3>
                  <p className="text-xs text-slate-500">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-700">
                  Se eliminarán permanentemente <strong>todas las ofertas, empleos y datos</strong> de <strong>"{businessData?.name}"</strong>.
                </p>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Para confirmar, escribe <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">ELIMINAR</span>:
              </p>
              <input
                type="text"
                value={deleteBusinessText}
                onChange={(e) => setDeleteBusinessText(e.target.value)}
                placeholder="Escribe ELIMINAR"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteBusinessModal(false); setDeleteBusinessText(''); }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteBusinessConfirm}
                  disabled={deleteBusinessText !== 'ELIMINAR' || deletingBusiness}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                    deleteBusinessText === 'ELIMINAR' && !deletingBusiness
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {deletingBusiness ? 'Eliminando...' : 'Eliminar definitivamente'}
                </button>
              </div>
            </div>
          </div>
        )}
        </>
      )}

      {/* Opciones */}
      <section className="px-5 w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
          <button
            onClick={() => onNavigate('settings')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:text-primary transition-colors">
                <Settings size={20} />
              </div>
              <div>
                <span className="font-medium text-slate-700 block">Ajustes</span>
                <span className="text-xs text-slate-500">Perfil, notificaciones, privacidad</span>
              </div>
            </div>
            <ChevronRight className="text-slate-500" size={20} />
          </button>
          <button
            onClick={() => onNavigate('terms')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:text-primary transition-colors">
                <FileText size={20} />
              </div>
              <span className="font-medium text-slate-700">Términos y Condiciones</span>
            </div>
            <ChevronRight className="text-slate-500" size={20} />
          </button>
          <button
            onClick={() => onNavigate('login')}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg text-red-600">
                <LogOut size={20} />
              </div>
              <span className="font-medium text-red-600">Cerrar Sesión</span>
            </div>
          </button>
        </div>
      </section>
    </div>

    {/* Navbar */}
    <Navbar currentPage="profile" onNavigate={onNavigate} />
  </div>
  );
};

// Página de Detalle de Negocio
const BusinessDetailPage = ({ businessId, onNavigate, returnTo, returnParams, userFavorites = [], toggleFavorite, isFavorite, user, trackAnalyticsEvent, showToast }) => {
  const [business, setBusiness] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  useEffect(() => {
    if (business?.name) document.title = `${business.name} | Cornellà Local`;
  }, [business?.name]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [canReview, setCanReview] = useState({ can_review: false, reason: null });
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryActivePhoto, setGalleryActivePhoto] = useState(0);

  // Cargar negocio desde Supabase
  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single();

        if (error) throw error;


        setBusiness(data);
      } catch (error) {
        showToast('Error al cargar el negocio', 'error');
      } finally {
        setLoadingBusiness(false);
      }
    };

    fetchBusiness();
  }, [businessId]);

  // Track vista del negocio
  useEffect(() => {
    if (!businessId) return;
    if (trackAnalyticsEvent) trackAnalyticsEvent(businessId, 'view');
    // Incrementar view_count en businesses
    supabase.rpc('increment_business_views', { business_id: businessId }).then(({ error }) => {
    });
  }, [businessId]);

  // Cargar reseñas desde Supabase + Realtime (cualquier usuario ve cambios al instante)
  useEffect(() => {
    if (!businessId) return;

    const mapReview = (r) => ({
      ...r,
      user: r.user_id === user?.id ? 'Tú' : 'Usuario',
      avatar: r.user_id === user?.id ? 'Tú' : 'U',
      date: new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
    });

    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        setReviews((data || []).map(mapReview));
      } catch (error) {
        showToast('Error al cargar las reseñas', 'error');
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();

    // Realtime: nueva reseña, edición o borrado → actualizar sin recargar página
    const channel = supabase
      .channel(`reviews-business-${businessId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reviews',
        filter: `business_id=eq.${businessId}`,
      }, (payload) => {
        setReviews(prev => {
          // Evitar duplicado si la reseña la añadió el usuario actual (ya en estado)
          if (prev.find(r => r.id === payload.new.id)) return prev;
          return [mapReview(payload.new), ...prev];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'reviews',
        filter: `business_id=eq.${businessId}`,
      }, (payload) => {
        setReviews(prev => prev.map(r => r.id === payload.new.id ? mapReview(payload.new) : r));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'reviews',
        filter: `business_id=eq.${businessId}`,
      }, (payload) => {
        setReviews(prev => prev.filter(r => r.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessId]);

  // Validar si usuario puede reseñar
  useEffect(() => {
    const checkCanReview = async () => {
      if (!user?.id || !businessId) {
        setCanReview({ can_review: false, reason: 'Debes iniciar sesión' });
        return;
      }

      // Admin puede reseñar cualquier negocio sin restricciones
      if (user?.is_admin) {
        setCanReview({ can_review: true, reason: null });
        return;
      }

      // El propietario no puede reseñar su propio negocio
      if (business?.owner_id === user?.id) {
        setCanReview({ can_review: false, reason: 'No puedes reseñar tu propio negocio' });
        return;
      }

      try {
        const { data, error } = await supabase.rpc('can_user_review', {
          p_user_id: user.id,
          p_business_id: businessId
        });

        if (error) throw error;
        setCanReview(data || { can_review: false, reason: 'Error de validación' });
      } catch (error) {
        setCanReview({ can_review: false, reason: 'Error de validación' });
      }
    };

    checkCanReview();
  }, [user?.id, businessId]);

  // Cargar contador de favoritos desde Supabase + Realtime
  useEffect(() => {
    if (!businessId) return;

    const fetchFavoriteCount = async () => {
      setLoadingFavorites(true);
      try {
        const { count, error } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId);

        if (error) throw error;

        setFavoriteCount(count || 0);
      } catch (error) {
        setFavoriteCount(0);
      } finally {
        setLoadingFavorites(false);
      }
    };

    fetchFavoriteCount();

    const channel = supabase
      .channel(`favorites-business-${businessId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'favorites', filter: `business_id=eq.${businessId}` },
        () => { setFavoriteCount(prev => prev + 1); })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'favorites', filter: `business_id=eq.${businessId}` },
        () => { setFavoriteCount(prev => Math.max(0, prev - 1)); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessId]);

  // Handler para incrementar clics
  const handleClick = async (type) => {
    try {
      await supabase.rpc('increment_business_clicks', { business_id: businessId });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCallClick = () => {
    handleClick('phone');
    if (business?.phone) {
      const safePhone = String(business.phone).replace(/[^\d+]/g, '');
      if (safePhone) window.location.href = `tel:${safePhone}`;
    }
  };

  const handleWebClick = () => {
    handleClick('website');
    if (!business?.website) return;
    try {
      const raw = business.website.trim();
      const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
      window.open(parsed.href, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('URL del negocio inválida:', err);
    }
  };

  const handleMapClick = () => {
    handleClick('map');
    if (business?.address) {
      const address = encodeURIComponent(business.address + ', Cornellà de Llobregat');
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank', 'noopener,noreferrer');
    }
  };

  if (loadingBusiness) {
    return <BusinessDetailSkeleton />;
  }

  if (!business) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Store className="text-gray-500 mx-auto mb-4" size={60} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Negocio no encontrado</h2>
          <button
            onClick={() => onNavigate('home')}
            className="mt-4 px-6 py-3 bg-primary text-white rounded-xl font-semibold"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Categorías de servicios/oficios que pueden recibir presupuestos directos
  const isServiceBusiness = SERVICE_CATEGORIES.some(cat =>
    business.category?.toLowerCase().includes(cat.toLowerCase()) ||
    business.subcategory?.toLowerCase().includes(cat.toLowerCase())
  );

  // Temporal: negocios relacionados vacíos hasta conectar con Supabase
  const relatedBusinesses = [];

  // Temporal: mapa placeholder
  const mapData = {
    backgroundImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect width='400' height='200' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EMapa%3C/text%3E%3C/svg%3E"
  };

  // Función para formatear horarios desde Supabase opening_hours
  const formatOpeningHours = (openingHours) => {
    if (!openingHours) return null;

    const dayNames = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return days.map(day => {
      const daySchedule = openingHours[day];
      if (!daySchedule || !daySchedule.enabled) {
        return { day: dayNames[day], hours: 'Cerrado', closed: true };
      }

      const parts = [];
      if (daySchedule.morning && daySchedule.morning.start && daySchedule.morning.end) {
        parts.push(`${daySchedule.morning.start} - ${daySchedule.morning.end}`);
      }
      if (daySchedule.afternoon && daySchedule.afternoon.start && daySchedule.afternoon.end) {
        parts.push(`${daySchedule.afternoon.start} - ${daySchedule.afternoon.end}`);
      }

      return {
        day: dayNames[day],
        hours: parts.length > 0 ? parts.join(', ') : 'Cerrado',
        closed: parts.length === 0
      };
    });
  };

  const formattedSchedule = formatOpeningHours(business?.opening_hours);

  // Obtener próximos cierres especiales (dentro de los próximos 14 días)
  const getUpcomingClosures = (specialClosures) => {
    if (!specialClosures || !Array.isArray(specialClosures)) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fourteenDaysFromNow = new Date(today);
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

    return specialClosures
      .filter(closure => {
        const closureDate = new Date(closure.date);
        return closureDate >= today && closureDate <= fourteenDaysFromNow;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const upcomingClosures = getUpcomingClosures(business?.special_closures);
  const galleryPhotos = business ? [
    ...(business.cover_photo ? [business.cover_photo] : []),
    ...(business.images || [])
  ].filter(Boolean) : [];

  // Función para enviar nueva reseña
  const handleSubmitReview = async () => {
    // Validación 1: Usuario debe estar logueado
    if (!user?.id) {
      showToast(ERROR_MESSAGES.unauthorized, 'warning');
      return;
    }

    // Validación 2: Verificar si puede reseñar (30 días, email verificado, etc.)
    if (!canReview.can_review) {
      showToast(canReview.reason || 'No puedes reseñar este negocio', 'warning');
      return;
    }

    // Validación 3: Comentario requerido
    const commentValidation = validateRequired(newReviewText, 'El comentario');
    if (!commentValidation.isValid) {
      showToast(commentValidation.error, 'error');
      return;
    }

    // Validación 4: Longitud mínima del comentario
    const minLengthValidation = validateMinLength(newReviewText.trim(), LIMITS.review.minLength, 'El comentario');
    if (!minLengthValidation.isValid) {
      showToast(minLengthValidation.error, 'error');
      return;
    }

    // Validación 5: Longitud máxima del comentario
    const maxLengthValidation = validateMaxLength(newReviewText.trim(), LIMITS.review.maxLength, 'El comentario');
    if (!maxLengthValidation.isValid) {
      showToast(maxLengthValidation.error, 'error');
      return;
    }

    // Validación 6: Rating válido (1-5)
    if (!newReviewRating || newReviewRating < 1 || newReviewRating > 5) {
      showToast('La calificación debe estar entre 1 y 5 estrellas', 'error');
      return;
    }

    // Validación 7: Moderación automática de contenido
    const moderation = moderateContent(newReviewText.trim());
    if (!moderation.isClean) {
      showToast(`⚠️ ${moderation.reason}`, 'error');
      return;
    }

    try {
      // Sanitizar texto para prevenir XSS
      const sanitizedComment = sanitizeText(newReviewText.trim());

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          business_id: businessId,
          user_id: user.id,
          rating: newReviewRating,
          comment: sanitizedComment
        })
        .select('*')
        .single();

      if (error) throw error;


      // Añadir reseña a la lista (con campos mapeados para display)
      setReviews(prev => [{
        ...data,
        user: 'Tú',
        avatar: 'Tú',
        date: new Date(data.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
      }, ...prev]);

      // Recalcular rating real desde todas las reseñas y actualizar en Supabase
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('business_id', businessId);

      if (allReviews?.length > 0) {
        // La media y el contador los recalcula la base de datos (trigger update_business_rating);
        // aquí solo actualizamos la vista sin esperar a recargar
        const avgRating = (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1);

        // Actualizar estado local del negocio
        setBusiness(prev => prev ? { ...prev, rating: avgRating, review_count: allReviews.length } : prev);
      }

      // Limpiar formulario y cerrar modales
      setNewReviewText('');
      setNewReviewRating(5);
      setShowWriteReview(false);
      setShowRatingModal(false);

      // Actualizar estado de can_review
      setCanReview({ can_review: false, reason: 'Ya has reseñado este negocio', already_reviewed: true });

      showToast(SUCCESS_MESSAGES.created, 'success');
    } catch (error) {

      // Mensaje de error más detallado
      const errorMessage = error.message?.includes('unique')
        ? 'Ya has publicado una reseña en este negocio'
        : error.message?.includes('foreign key')
        ? 'Negocio no encontrado'
        : 'Error al publicar reseña. Inténtalo de nuevo.';

      showToast(errorMessage, 'error');
    }
  };

  // Ordenar reseñas por fecha (más recientes primero)
  const sortedReviews = [...reviews].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Función para publicar una reseña
  const handlePublishReview = () => {
    if (newReviewText.trim() === '') return;

    const newReview = {
      id: Date.now(),
      user: "Tú",
      avatar: "T",
      rating: newReviewRating,
      date: "Ahora",
      timestamp: Date.now(),
      comment: newReviewText.trim()
    };

    setReviews(prev => [newReview, ...prev]);
    setNewReviewText('');
    setNewReviewRating(5);
    setShowWriteReview(false);
  };

  // Función para manejar valoración rápida desde el modal
  const handleQuickRating = (ratingData) => {
    const newReview = {
      id: Date.now(),
      user: "Tú",
      avatar: "T",
      rating: ratingData.rating,
      date: "Ahora",
      timestamp: Date.now(),
      comment: ratingData.comment || ''
    };
    setReviews(prev => [newReview, ...prev]);
    setShowRatingModal(false);
  };

  // Función para compartir por WhatsApp
  const handleShareWhatsApp = () => {
    const profileUrl = `${window.location.origin}?negocio=${business?.id}`;
    const text = `¡Mira este comercio local en Cornellà! 🏪\n\n*${business?.name}*\n⭐ ${business?.rating} (${business?.review_count || business?.reviews || 0} reseñas)\n📍 ${business?.address}\n📂 ${business?.category}\n\n👉 Ver perfil: ${profileUrl}\n\nDescúbrelo en Cornellà Local`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      <div className="relative w-full flex flex-col min-h-screen overflow-x-hidden">
        {/* Hero Image */}
        <div className="relative w-full h-80 shrink-0">
          <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between p-4 pt-12 bg-gradient-to-b from-white/90 via-white/20 to-transparent pb-20">
            <button aria-label="Volver"
              onClick={() => returnTo ? onNavigate(returnTo, returnParams) : onNavigate('home')}
              className="flex items-center justify-center size-10 rounded-full bg-white/80 backdrop-blur-md text-gray-900 shadow-sm hover:bg-white transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center justify-center size-10 rounded-full bg-orange-700 text-white shadow-sm hover:bg-orange-800 transition-all"
                title="Reportar problema"
              >
                <Flag size={18} />
              </button>
              <button aria-label="WhatsApp"
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center size-10 rounded-full bg-green-700 text-white shadow-sm hover:bg-green-800 transition-all"
              >
                <MessageCircle size={20} />
              </button>
              <button aria-label="Guardar en favoritos"
                onClick={() => toggleFavorite && toggleFavorite(business.id)}
                className={`flex items-center justify-center size-10 rounded-full backdrop-blur-md shadow-sm transition-all ${
                  isFavorite && isFavorite(business.id)
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-white/80 text-gray-900 hover:bg-white'
                }`}
              >
                <Heart size={20} className={isFavorite && isFavorite(business.id) ? 'fill-current' : ''} />
              </button>
            </div>
          </div>
          <div
            className="w-full h-full bg-gray-200 bg-cover bg-center"
            style={{ backgroundImage: business.cover_photo || (business.images && business.images[0]) ? `url("${business.cover_photo || business.images[0]}")` : undefined }}
          >
            {!business.cover_photo && !(business.images && business.images[0]) && (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
                <Store className="text-white/40" size={80} />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative -mt-8 rounded-t-[32px] bg-gray-50 w-full px-5 pt-8 flex flex-col gap-8 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
          {/* Header info */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-gray-900 text-2xl font-bold tracking-tight">{business.name}</h1>
                {business.isVerified && <BadgeCheck className="text-primary fill-primary" size={24} />}
              </div>
              <p className="text-sm text-gray-500 font-medium">{business.address} • {business.category}</p>

              {/* Barrio clickeable */}
              {business.neighborhood && (
                <button
                  onClick={() => onNavigate('home', { filterNeighborhood: business.neighborhood })}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark transition-colors w-fit"
                >
                  <MapPin size={16} />
                  <span>{formatNeighborhood(business.neighborhood)}</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <button
                  onClick={() => setShowReviews(true)}
                  className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className="text-gray-900 font-bold">{business.rating}</span>
                  <Star className="text-yellow-500 fill-yellow-500" size={16} />
                  <span className="text-gray-500 text-xs">({business.review_count || business.reviews || 0})</span>
                </button>
                {/* Contador de favoritos/seguidores */}
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                  <Heart className="text-red-500 fill-red-500" size={16} />
                  <span className="text-gray-900 font-bold">{loadingFavorites ? '...' : favoriteCount}</span>
                  <span className="text-gray-500 text-xs">
                    {favoriteCount === 1 ? 'seguidor' : 'seguidores'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (!canReview.can_review) {
                      showToast(canReview.reason || 'No puedes reseñar este negocio', 'warning');
                      return;
                    }
                    setShowWriteReview(true);
                  }}
                  className="flex items-center gap-1.5 bg-amber-700 text-white px-3 py-1.5 rounded-full shadow-sm hover:bg-amber-800 transition-colors cursor-pointer"
                >
                  <Star size={14} className="fill-white" />
                  <span className="font-semibold text-xs">Valorar</span>
                </button>
              </div>

              {/* Etiquetas */}
              {business.tags && business.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {business.tags.map((tag, i) => (
                    <button
                      key={i}
                      onClick={() => onNavigate('home', { filterTag: tag })}
                      className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCallClick}
              className="flex-1 h-12 bg-primary rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              <Phone className="text-white" size={20} />
              <span className="text-white font-bold">Llamar</span>
            </button>
            {isServiceBusiness && (
              <button
                onClick={() => {
                  handleClick('budget');
                  onNavigate('direct-budget', { businessId: business.id, businessName: business.name });
                }}
                className="flex-1 h-12 bg-orange-500 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:bg-orange-600 active:scale-[0.98] transition-all"
              >
                <ClipboardList className="text-white" size={20} />
                <span className="text-white font-bold">Presupuesto</span>
              </button>
            )}
            {SHOW_BUSINESS_WEBSITE && business?.website && (
              <button aria-label="Sitio web"
                onClick={handleWebClick}
                className="size-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
              >
                <Globe className="text-primary" size={22} />
              </button>
            )}
          </div>

          {/* Services */}
          {business.services && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-900">Servicios</h2>
              <div className="flex gap-5 overflow-x-auto no-scrollbar -mx-5 px-5 py-2 snap-x">
                {business.services.map((service, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 shrink-0 w-16 snap-start">
                    <div className="size-16 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                      <Icon name={service.icon} size={28} className="text-gray-800" />
                    </div>
                    <span className="text-[11px] font-medium text-center text-gray-900 truncate w-full">{service.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-gray-900">Sobre nosotros</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{business.description}</p>
          </div>

          {/* Galería de fotos */}
          {(() => {
            const allPhotos = [
              ...(business.cover_photo ? [business.cover_photo] : []),
              ...(business.images || [])
            ].filter(Boolean);
            if (allPhotos.length === 0) return null;
            return (
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-bold text-gray-900">Fotos</h2>
                <div className="grid grid-cols-3 gap-1.5">
                  {allPhotos.slice(0, 5).map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => { setGalleryActivePhoto(i); setShowGallery(true); }}
                      className={`relative overflow-hidden rounded-xl bg-gray-100 ${i === 0 ? 'col-span-2 row-span-2 h-40' : 'h-[74px]'}`}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      {i === 4 && allPhotos.length > 5 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">+{allPhotos.length - 5}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {showGallery && (
                  <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center" onClick={() => setShowGallery(false)}>
                    <button aria-label="Cerrar"
                      className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                      onClick={() => setShowGallery(false)}
                    >
                      <X className="text-white" size={20} />
                    </button>
                    <div className="flex items-center justify-center w-full h-full px-4" onClick={e => e.stopPropagation()}>
                      <button aria-label="Volver"
                        className="absolute left-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                        onClick={() => setGalleryActivePhoto(p => (p - 1 + allPhotos.length) % allPhotos.length)}
                      >
                        <ChevronLeft className="text-white" size={20} />
                      </button>
                      <img src={allPhotos[galleryActivePhoto]} alt="" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
                      <button aria-label="Siguiente"
                        className="absolute right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                        onClick={() => setGalleryActivePhoto(p => (p + 1) % allPhotos.length)}
                      >
                        <ChevronRight className="text-white" size={20} />
                      </button>
                    </div>
                    <div className="absolute bottom-6 flex gap-2">
                      {allPhotos.map((_, i) => (
                        <button key={i} onClick={e => { e.stopPropagation(); setGalleryActivePhoto(i); }}
                          className={`w-2 h-2 rounded-full transition-all ${i === galleryActivePhoto ? 'bg-white w-4' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Schedule + Cierres Especiales */}
          {formattedSchedule && formattedSchedule.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-gray-900">Horario</h2>

              {/* Banner de cierre extraordinario — MUY VISIBLE */}
              {upcomingClosures && upcomingClosures.length > 0 && upcomingClosures.map((closure, index) => {
                const closureDate = new Date(closure.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysUntil = Math.ceil((closureDate - today) / (1000 * 60 * 60 * 24));
                const formattedDate = closureDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                const isToday = daysUntil === 0;
                const isTomorrow = daysUntil === 1;
                return (
                  <div key={index} className={`rounded-2xl overflow-hidden border-2 ${isToday ? 'border-red-400' : 'border-orange-400'}`}>
                    <div className={`px-4 py-2 flex items-center gap-2 ${isToday ? 'bg-red-500' : 'bg-orange-500'}`}>
                      <AlertCircle className="text-white shrink-0" size={16} />
                      <span className="text-white text-xs font-bold uppercase tracking-wide">
                        {isToday ? '⚠️ CERRADO HOY' : isTomorrow ? '⚠️ CERRADO MAÑANA' : `⚠️ CIERRE ESPECIAL en ${daysUntil} días`}
                      </span>
                    </div>
                    <div className={`px-4 py-3 flex items-center gap-3 ${isToday ? 'bg-red-50' : 'bg-orange-50'}`}>
                      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isToday ? 'bg-red-100' : 'bg-orange-100'}`}>
                        <span className="text-xl">🎉</span>
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isToday ? 'text-red-900' : 'text-orange-900'}`}>{closure.name}</p>
                        <p className={`text-xs capitalize ${isToday ? 'text-red-700' : 'text-orange-700'}`}>
                          {formattedDate}
                          {!closure.allDay && closure.until && ` · Hasta las ${closure.until}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <button
                  onClick={() => setScheduleOpen(!scheduleOpen)}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="text-primary" size={20} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold text-gray-900">Ver horario completo</span>
                      <span className="text-xs text-gray-500">Lunes a Domingo</span>
                    </div>
                  </div>
                  <ChevronDown className={`text-gray-500 transition-transform ${scheduleOpen ? 'rotate-180' : ''}`} size={20} />
                </button>
                {scheduleOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
                    {formattedSchedule.map((item, i) => (
                      <div key={i} className={`flex justify-between items-center ${item.closed ? 'text-gray-500' : 'text-gray-700'}`}>
                        <span className="font-medium text-sm">{item.day}</span>
                        <span className={`text-sm ${item.closed ? 'italic' : 'font-medium text-gray-900'}`}>{item.hours}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-gray-900">Ubicación</h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-soft border border-gray-100/50">
              {/* Google Maps embed (click-to-load si no hay consent de cookies de terceros) */}
              <div className="relative w-full h-48 overflow-hidden">
                <ConsentedMapEmbed
                  address={(business.fullAddress || business.address || '') + ', Cornellà de Llobregat'}
                />
              </div>
              {/* Dirección + botón navegar */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <MapPin className="text-primary shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-gray-600 leading-relaxed truncate">{business.fullAddress || business.address}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((business.fullAddress || business.address || '') + ', Cornellà de Llobregat')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Navigation size={14} />
                  Cómo llegar
                </a>
              </div>
            </div>
          </div>

          {/* Related businesses */}
          {relatedBusinesses && relatedBusinesses.length > 0 && (
            <div className="flex flex-col gap-4 pb-12">
              <h2 className="text-lg font-bold text-gray-900">Negocios relacionados</h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 py-2 snap-x">
                {relatedBusinesses.map(related => (
                  <button
                    key={related.id}
                    onClick={() => onNavigate('business', { id: related.id })}
                    className="flex flex-col gap-2 shrink-0 w-40 snap-start text-left"
                  >
                    <div className="h-28 w-40 rounded-2xl bg-gray-100 overflow-hidden relative shadow-sm group cursor-pointer border border-gray-100">
                      <div
                        className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                        style={{ backgroundImage: `url("${related.image}")` }}
                      />
                      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">
                        {related.rating} ★
                      </div>
                    </div>
                    <div className="flex flex-col px-1">
                      <span className="text-xs font-bold text-gray-800 truncate">{related.name}</span>
                      <span className="text-[10px] text-gray-500 truncate">{related.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Modal */}
      {showReviews && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up">
            {/* Modal Header */}
            <div className="shrink-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900">Reseñas</h3>
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                  <Star className="text-yellow-500 fill-yellow-500" size={14} />
                  <span className="text-sm font-bold text-yellow-700">{business.rating}</span>
                  <span className="text-xs text-yellow-600">({reviews.length})</span>
                </div>
              </div>
              <button aria-label="Cerrar"
                onClick={() => { setShowReviews(false); setShowWriteReview(false); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Reviews List - Scrollable (últimas 10) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {sortedReviews.slice(0, 10).map(review => (
                <div key={review.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${review.user === "Tú" ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"}`}>
                      {review.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{review.user}</span>
                        <span className="text-xs text-gray-500">{review.date}</span>
                      </div>
                      <div className="mb-2">
                        <StarRating rating={review.rating} readonly size={14} showValue={false} />
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
              {/* Cómo se controlan las reseñas (normativa de consumo: decir si se verifican y cómo) */}
              <p className="text-xs text-gray-500 leading-relaxed pt-1">
                Reseñas de vecinos con email verificado y al menos 30 días en la app (1 por negocio). No comprobamos que
                hayan comprado o contratado en el negocio. ¿Ves una reseña falsa? Escríbenos a cornellalocal@gmail.com.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Modal independiente para escribir reseña (abierto desde Valorar) */}
      {showWriteReview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl animate-slide-up">
            <div className="shrink-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-lg font-bold text-gray-900">Escribir reseña</h3>
              <button aria-label="Cerrar" onClick={() => { setShowWriteReview(false); setNewReviewText(''); setNewReviewRating(5); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Tu valoración:</span>
                <StarRating rating={newReviewRating} onRate={setNewReviewRating} size={28} showValue={false} />
              </div>
              <div className="text-center py-2 bg-amber-50 rounded-lg">
                <span className="text-sm font-medium text-amber-700">
                  {newReviewRating === 1 && '😞 Muy malo'}
                  {newReviewRating === 2 && '😕 Malo'}
                  {newReviewRating === 3 && '😐 Normal'}
                  {newReviewRating === 4 && '😊 Bueno'}
                  {newReviewRating === 5 && '🤩 Excelente'}
                </span>
              </div>
              <textarea
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="Escribe tu opinión (mínimo 10 caracteres)..."
                className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <div className="flex gap-3 pb-2">
                <button
                  onClick={() => { setShowWriteReview(false); setNewReviewText(''); setNewReviewRating(5); }}
                  className="flex-1 h-11 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={newReviewText.trim().length < 10}
                  className="flex-1 h-11 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Valoración Rápida */}
      <RateBusinessModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        business={business}
        onSubmitRating={handleQuickRating}
      />

      {/* Modal de Reportar Negocio */}
      <ReportBusinessModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        business={business}
        user={user}
        onSubmitReport={() => {}}
        showToast={showToast}
      />

      {/* Navbar */}
      <Navbar currentPage="home" onNavigate={onNavigate} />
    </div>

    {/* Lightbox de galería — fuera del overflow-x-hidden */}
    {showGallery && galleryPhotos.length > 0 && (
      <div
        className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
        onClick={() => setShowGallery(false)}
      >
        <button aria-label="Cerrar"
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
          onClick={() => setShowGallery(false)}
        >
          <X className="text-white" size={20} />
        </button>
        <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
          {galleryActivePhoto + 1} / {galleryPhotos.length}
        </span>
        <div className="flex items-center justify-center w-full h-full px-16" onClick={e => e.stopPropagation()}>
          <button aria-label="Volver"
            className="absolute left-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
            onClick={() => setGalleryActivePhoto(p => (p - 1 + galleryPhotos.length) % galleryPhotos.length)}
          >
            <ChevronLeft className="text-white" size={22} />
          </button>
          <img
            src={galleryPhotos[galleryActivePhoto]}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
          <button aria-label="Siguiente"
            className="absolute right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
            onClick={() => setGalleryActivePhoto(p => (p + 1) % galleryPhotos.length)}
          >
            <ChevronRight className="text-white" size={22} />
          </button>
        </div>
        <div className="absolute bottom-6 flex gap-2">
          {galleryPhotos.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setGalleryActivePhoto(i); }}
              className={`h-1.5 rounded-full transition-all ${i === galleryActivePhoto ? 'bg-white w-6' : 'bg-white/40 w-1.5'}`}
            />
          ))}
        </div>
      </div>
    )}
    </>
  );
};

// Página de Detalle de Cupón
const CouponDetailPage = ({ couponId, onNavigate, savedCoupons = [], toggleSaveCoupon, isCouponSaved, user, showToast }) => {
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redemptionCode, setRedemptionCode] = useState(null);
  const [redemptionStatus, setRedemptionStatus] = useState(null);
  const [redemptionLoading, setRedemptionLoading] = useState(false);

  // Cargar oferta desde Supabase
  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            businesses!inner(id, name, address, phone)
          `)
          .eq('id', couponId)
          .single();

        if (error) throw error;
        setOffer(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (couponId) {
      fetchOffer();
    }
  }, [couponId]);

  // Incrementar contador de vistas
  useEffect(() => {
    const incrementViews = async () => {
      if (!couponId) return;

      try {
        await supabase.rpc('increment_offer_views', { offer_id: couponId });
      } catch (error) {
        console.error('Error:', error);
      }
    };

    incrementViews();
  }, [couponId]);

  // Verificar si el usuario ya tiene un código para esta oferta
  useEffect(() => {
    const checkExistingCode = async () => {
      if (!user?.id || !couponId) return;
      try {
        const { data } = await supabase
          .from('offer_redemptions')
          .select('code, status')
          .eq('offer_id', couponId)
          .eq('user_id', user.id)
          .single();
        if (data) {
          if (!redemptionCode && data.status === 'pending' && offer?.max_uses) {
        // Código nuevo: el contador de cupones disponibles baja al momento
        setOffer(prev => prev ? { ...prev, claimed_count: (prev.claimed_count ?? prev.redemption_count ?? 0) + 1 } : prev);
      }
      setRedemptionCode(data.code);
          setRedemptionStatus(data.status);
        }
      } catch (_) {
        // Sin código todavía, es normal
      }
    };
    checkExistingCode();
  }, [couponId, user?.id]);

  if (loading) {
    return <OfferCardSkeleton />;
  }

  if (!offer) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md flex items-center justify-center bg-white">
        <div className="text-center px-6">
          <Tag className="mx-auto mb-4 text-gray-500" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oferta no encontrada</h2>
          <p className="text-gray-600 mb-6">Esta oferta no existe o ha expirado.</p>
          <button
            onClick={() => onNavigate('offers')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold"
          >
            Ver todas las ofertas
          </button>
        </div>
      </div>
    );
  }

  // Formatear fecha de expiración
  const expiresAt = new Date(offer.expires_at);
  const formattedExpiry = expiresAt.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Convertir oferta de Supabase al formato esperado por el template
  const coupon = {
    id: offer.id,
    title: offer.title,
    description: offer.description || 'Oferta exclusiva para ti.',
    business: offer.businesses?.name || 'Negocio',
    businessId: offer.businesses?.id || null,
    image: offer.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EOferta%3C/text%3E%3C/svg%3E",
    validUntil: formattedExpiry,
    type: offer.is_flash ? 'Oferta Flash' : 'Oferta',
    code: 'CORNELLA' + offer.id.substring(0, 8).toUpperCase(),
    qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${offer.id}`,
    discount: offer.discount_label ||
              (offer.discount_type === '2x1' ? '2x1' :
               offer.discount_type === 'free' ? 'GRATIS' :
               (offer.discount_value || '0') + '%'),
    originalPrice: offer.original_price,
    discountedPrice: offer.discounted_price,
    conditions: [
      'Válido una vez por persona',
      'No acumulable con otras ofertas',
      'Presentar cupón antes de pagar',
      'Sujeto a disponibilidad'
    ],
    location: {
      address: offer.businesses?.address || 'Cornellà de Llobregat',
      city: 'Barcelona, España',
      distance: '1.2 km'
    }
  };

  const isCurrentCouponSaved = isCouponSaved ? isCouponSaved(coupon.id) : false;

  // Placeholder para el mapa
  const mapData = {
    backgroundImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect width='400' height='200' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EMapa%3C/text%3E%3C/svg%3E"
  };

  const handleShareWhatsApp = () => {
    const ofertaUrl = `${window.location.origin}${window.location.pathname}?oferta=${coupon.id}`;
    const text = `¡Mira esta oferta en Cornellà! 🎉\n\n*${coupon.title}*\n🏪 ${coupon.business}\n⏰ Válido hasta ${coupon.validUntil}\n\n👉 Ver oferta: ${ofertaUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleGetCode = async () => {
    if (!user?.id) {
      onNavigate('login');
      return;
    }
    setRedemptionLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_or_create_redemption', {
        p_offer_id: offer.id,
        p_user_id: user.id,
        p_business_id: offer.businesses?.id,
      });
      if (error) throw error;
      if (data?.error === 'max_uses_reached') {
        // La oferta se agotó justo ahora (race condition) — actualizar UI
        showToast?.('Esta oferta ya está agotada', 'error');
        return;
      }
      if (data?.error) {
        showToast?.(data.error === 'offer_unavailable' ? 'Esta oferta ya no está disponible' : 'No se pudo obtener el código. Inténtalo de nuevo.', 'error');
        return;
      }
      setRedemptionCode(data.code);
      setRedemptionStatus(data.status);
    } catch (err) {
      showToast?.('No se pudo obtener el código. Inténtalo de nuevo.', 'error');
    } finally {
      setRedemptionLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-white font-display text-slate-900 antialiased">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24">
        {/* Hero */}
        <div className="relative w-full h-[280px] shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${coupon.image}")` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>
          <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex justify-between items-center z-10">
            <button aria-label="Volver"
              onClick={() => onNavigate('offers')}
              className="flex items-center justify-center size-10 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex gap-3">
              <button aria-label="WhatsApp"
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center size-10 rounded-full bg-green-700 text-white hover:bg-green-800 transition-colors shadow-lg"
              >
                <MessageCircle size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex flex-col -mt-8 rounded-t-3xl bg-white px-6 pt-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full"></div>

          {/* Business link */}
          <div className="flex items-center gap-2 mb-3">
            <div className="size-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              <Store className="text-gray-500" size={14} />
            </div>
            <button
              onClick={() => coupon.businessId && onNavigate('business', { id: coupon.businessId })}
              className={`flex items-center gap-1 text-sm font-semibold transition-colors ${coupon.businessId ? 'text-primary hover:text-primary-dark' : 'text-gray-600'}`}
            >
              {coupon.business}
              {coupon.businessId && <ChevronRight size={16} />}
            </button>
          </div>

          <h1 className="text-3xl font-extrabold leading-tight text-gray-900 mb-2 tracking-tight">
            {coupon.title}
          </h1>

          <div className="flex items-center gap-2 mb-8">
            <Clock className="text-primary" size={20} />
            <p className="text-primary font-medium text-sm">Válido hasta el {coupon.validUntil}</p>
            <span className="w-1 h-1 rounded-full bg-gray-300 mx-1"></span>
            <p className="text-gray-500 text-sm">{coupon.type}</p>
          </div>

          {/* Sección de código de redención */}
          {offer.max_uses && (offer.claimed_count ?? offer.redemption_count ?? 0) >= offer.max_uses && !redemptionCode ? (
            /* Oferta agotada */
            <div className="relative w-full bg-gray-100 rounded-2xl p-5 flex flex-col items-center gap-2 mb-6">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="text-red-500" size={24} />
              </div>
              <p className="font-bold text-gray-700">Oferta agotada</p>
              <p className="text-sm text-gray-500">Ya se han entregado los {offer.max_uses} cupones disponibles</p>
            </div>
          ) : redemptionStatus === 'validated' ? (
            /* Código ya canjeado */
            <div className="relative w-full bg-gray-100 rounded-2xl p-5 flex flex-col items-center gap-2 mb-6">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="text-green-600" size={24} />
              </div>
              <p className="font-bold text-gray-700">Descuento ya canjeado</p>
              <p className="text-sm text-gray-500 font-mono">{redemptionCode}</p>
            </div>
          ) : redemptionCode ? (
            /* Código obtenido, pendiente de canjear */
            <div className="relative w-full bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-6 shadow-lg flex flex-col items-center gap-3 mb-6 transition-transform active:scale-[0.98]">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
              <p className="text-xs font-bold text-white/80 uppercase tracking-widest">Muestra este código en el negocio</p>
              <p className="text-5xl font-mono font-black text-white tracking-widest">{redemptionCode}</p>
              <p className="text-xs text-white/60">Código único e intransferible · 1 uso</p>
            </div>
          ) : (
            /* Sin código todavía */
            <div className="relative w-full bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-6 shadow-lg flex flex-col items-center gap-4 mb-6">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
              <Ticket className="text-white/80" size={32} />
              <div className="text-center">
                <p className="text-white font-bold text-lg">¿Quieres usar este descuento?</p>
                <p className="text-white/70 text-sm mt-1">Genera tu código único y muéstralo en el negocio</p>
                {offer.max_uses ? (
                  <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                    Quedan {Math.max(0, offer.max_uses - (offer.claimed_count ?? offer.redemption_count ?? 0))} de {offer.max_uses} cupones
                  </p>
                ) : null}
              </div>
              <button
                onClick={handleGetCode}
                disabled={redemptionLoading}
                className="bg-white text-primary font-bold px-8 py-3 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-60 text-sm"
              >
                {redemptionLoading ? 'Generando...' : user?.id ? 'Obtener mi código' : 'Inicia sesión para canjear'}
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => toggleSaveCoupon && toggleSaveCoupon(coupon)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-semibold transition-colors text-sm ${
                isCurrentCouponSaved
                  ? 'bg-primary border-primary text-white'
                  : 'border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Heart className={isCurrentCouponSaved ? 'fill-current' : ''} size={18} />
              {isCurrentCouponSaved ? 'Guardado' : 'Guardar'}
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 transition-colors text-sm"
            >
              <MessageCircle size={18} />
              Compartir
            </button>
          </div>

          {/* Details */}
          <div className="space-y-4 pb-8">
            <h3 className="text-lg font-bold text-gray-900">Detalles y Condiciones</h3>
            <div className="prose prose-sm prose-gray">
              <p className="text-gray-600 leading-relaxed">{coupon.description}</p>
              <ul className="text-gray-500 text-sm list-disc pl-4 space-y-1 mt-4">
                {coupon.conditions.map((condition, i) => (
                  <li key={i}>{condition}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Location */}
          <div className="bg-gray-50 rounded-xl p-4 flex gap-4 items-center mb-6">
            <div className="size-16 rounded-lg bg-gray-300 overflow-hidden shrink-0">
              <div
                className="w-full h-full bg-cover bg-center opacity-80"
                style={{ backgroundImage: `url("${mapData.backgroundImage}")` }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">{coupon.location.address}</p>
              <p className="text-xs text-gray-500 truncate">{coupon.location.city}</p>
              <p className="text-xs text-primary font-semibold mt-1">A {coupon.location.distance} de ti</p>
            </div>
            <button aria-label="Cómo llegar" className="size-10 flex items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary/90 transition-colors">
              <Navigation size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <Navbar currentPage="offers" onNavigate={onNavigate} />
    </div>
  );
};

// Página de Detalle de Oferta de Empleo
const JobDetailPage = ({ jobId, onNavigate, showToast, onAddNotification, activeJob, markJobAsHired, renewJob, deleteJob, getJobDaysRemaining, isBusinessOwner = false, user, userBusinessId = null }) => {
  const [job, setJob] = useState(activeJob || null);
  const [loading, setLoading] = useState(!activeJob);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [cvUploaded, setCvUploaded] = useState(false);
  const [cvFileName, setCvFileName] = useState('');
  const [cvFile, setCvFile] = useState(null); // Archivo real para subir
  const [coverLetter, setCoverLetter] = useState('');

  // Cargar empleo desde Supabase si no viene de activeJob
  useEffect(() => {
    const fetchJob = async () => {
      if (activeJob) {
        setJob(activeJob);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            businesses!inner(
              id,
              name,
              address,
              phone
            )
          `)
          .eq('id', jobId)
          .single();

        if (error) throw error;

        // Transformar datos al formato esperado
        let icon = 'Briefcase';
        let iconBg = 'blue';
        if (data.type === 'Media Jornada') {
          icon = 'Clock';
          iconBg = 'orange';
        } else if (data.type === 'Temporal') {
          icon = 'Calendar';
          iconBg = 'orange';
        } else if (data.type === 'Prácticas') {
          icon = 'GraduationCap';
          iconBg = 'green';
        }

        let salary = 'A convenir';
        if (data.salary_min && data.salary_max) {
          salary = `${(data.salary_min / 1000).toFixed(0)}-${(data.salary_max / 1000).toFixed(0)}k €/año`;
        } else if (data.salary_note) {
          salary = data.salary_note;
        }

        const transformedJob = {
          id: data.id,
          title: data.title,
          company: data.businesses?.name || 'Empresa',
          icon,
          iconBg,
          salary,
          type: data.type,
          contract: data.contract,
          modality: data.modality,
          location: data.location,
          address: data.address,
          description: data.description,
          requirements: data.requirements || [],
          benefits: data.benefits || [],
          createdAt: data.created_at,
          businessId: data.business_id,
          businessPhone: data.businesses?.phone,
          postedAgo: getTimeAgo(data.created_at),
          hired: false,
          hiredDate: null
        };

        setJob(transformedJob);
      } catch (error) {
        showToast(ERROR_MESSAGES.generic, 'error');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) fetchJob();
  }, [jobId, activeJob]);

  // Incrementar contador de vistas
  useEffect(() => {
    const incrementViews = async () => {
      if (!jobId) return;

      try {
        await supabase.rpc('increment_job_views', { job_id: jobId });
      } catch (error) {
        console.error('Error:', error);
      }
    };

    incrementViews();
  }, [jobId]);

  // Función auxiliar para calcular tiempo transcurrido
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Hoy';
    if (diffInDays === 1) return '1 día';
    if (diffInDays < 7) return `${diffInDays} días`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas`;
    return `${Math.floor(diffInDays / 30)} meses`;
  };

  const daysRemaining = job && getJobDaysRemaining ? getJobDaysRemaining(job) : 60;
  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

  const handleApply = () => {
    setShowApplyModal(true);
  };

  const handleUploadCV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validar tamaño (máx 5MB)
        if (file.size > LIMITS.maxFileSize) {
          showToast('El archivo es demasiado grande (máx. 5MB)', 'error');
          return;
        }
        setCvUploaded(true);
        setCvFileName(file.name);
        setCvFile(file); // Guardar archivo para subir después
      }
    };
    input.click();
  };

  const handleSubmitApplication = async () => {
    if (!cvUploaded || !user?.id) {
      if (!user?.id) {
        showToast(ERROR_MESSAGES.unauthorized, 'warning');
      }
      return;
    }

    try {
      let cvUrl = null;

      // Subir CV a Supabase Storage si existe
      if (cvFile) {
        const fileExt = cvFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `cvs/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('job-applications')
          .upload(filePath, cvFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        cvUrl = filePath;
      }

      // Guardar candidatura en Supabase
      const { data, error } = await supabase
        .from('job_applications')
        .insert({
          job_id: job.id,
          user_id: user.id,
          full_name: user.full_name || user.email.split('@')[0],
          email: user.email,
          phone: user.phone || '',
          message: coverLetter.trim() || 'Sin mensaje de motivación',
          cv_url: cvUrl,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;


      // Cerrar modal y mostrar pantalla de éxito
      setShowApplyModal(false);
      setShowSuccessScreen(true);

      // Limpiar formulario
      setCoverLetter('');
      setCvUploaded(false);
      setCvFileName('');
      setCvFile(null);

      // Mostrar toast de confirmación
      showToast(`${SUCCESS_MESSAGES.sent} Tu candidatura ha sido enviada correctamente`, 'success');

      // Añadir notificación local (opcional)
      if (onAddNotification) {
        onAddNotification({
          type: 'job',
          title: '¡Candidatura enviada!',
          message: `Tu solicitud para "${job.title}" en ${job.company} ha sido enviada correctamente.`,
          icon: 'Briefcase',
          iconBg: 'bg-green-500',
          actionRoute: 'user-jobs',
        });
      }
    } catch (error) {
      showToast(formatSupabaseError(error), 'error');
    }
  };

  const handleShare = () => {
    const empleoUrl = `${window.location.origin}${window.location.pathname}?empleo=${job.id}`;
    const text = `¡Oferta de empleo en Cornellà! 💼\n\n*${job.title}*\n🏢 ${job.company}\n📍 ${job.location}\n💰 ${job.salary}\n\n👉 Ver oferta: ${empleoUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  // Datos del mapa (placeholder)
  const mapData = {
    backgroundImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect width='400' height='200' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3ECornell%C3%A0%3C/text%3E%3C/svg%3E"
  };

  // Mostrar loading si está cargando
  if (loading || !job) {
    return (
      <div className="bg-gray-50 font-display antialiased text-slate-900 min-h-screen">
        <div className="relative flex min-h-screen w-full max-w-md mx-auto flex-col overflow-x-hidden shadow-2xl bg-white">
          <header className="sticky top-0 z-30 flex items-center bg-white/95 backdrop-blur-md px-4 py-4 justify-between border-b border-gray-100">
            <button aria-label="Volver"
              onClick={() => onNavigate('offers')}
              className="text-slate-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
          </header>
          <div className="px-4 py-6">
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 font-display antialiased text-slate-900 min-h-screen">
      <div className="relative flex min-h-screen w-full max-w-md mx-auto flex-col overflow-x-hidden shadow-2xl bg-white">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center bg-white/95 backdrop-blur-md px-4 py-4 justify-between border-b border-gray-100">
          <button aria-label="Volver"
            onClick={() => onNavigate('offers')}
            className="text-slate-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1"></div>
          <button aria-label="Compartir"
            onClick={handleShare}
            className="text-slate-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <Share2 size={22} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 pb-32">
          {/* Título y empresa */}
          <div className="px-5 pt-6 pb-4">
            <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
              {job.title}
            </h1>
            <button className="text-primary font-semibold hover:underline text-base">
              {job.company}
            </button>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <MapPin size={16} className="text-gray-500" />
              <span>{job.location}</span>
              <span className="text-gray-300">•</span>
              <span>Hace {job.postedAgo}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                <Briefcase size={14} />
                Jornada {job.type}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                <MapPin size={14} />
                {job.modality}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                <FileText size={14} />
                {job.contract}
              </span>
            </div>
          </div>

          {/* Salario */}
          <div className="mx-5 mb-6 bg-blue-50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CreditCard className="text-white" size={18} />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Salario Bruto Anual</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(job.salaryMin || 0, false)} - {formatCurrency(job.salaryMax || 0, false)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{job.salaryNote}</p>
          </div>

          {/* Descripción */}
          <div className="px-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Descripción del puesto</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line text-[15px]">
              {job.description}
            </p>
          </div>

          {/* Requisitos */}
          <div className="px-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Requisitos</h2>
            <div className="space-y-3">
              {job.requirements?.map((req, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="text-green-600" size={14} />
                  </div>
                  <p className="text-gray-600 text-[15px] leading-relaxed">{req}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Beneficios */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="px-5 mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Beneficios</h2>
              <div className="space-y-3">
                {job.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon name={benefit.icon} className="text-primary" size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{benefit.title}</p>
                      <p className="text-sm text-gray-500">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ubicación */}
          <div className="px-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Ubicación</h2>
            <div className="bg-gray-100 rounded-2xl overflow-hidden">
              <div className="h-32 bg-gray-200 relative">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-80"
                  style={{ backgroundImage: `url("${mapData.backgroundImage}")` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-primary text-white p-2 rounded-full shadow-lg">
                    <MapPin size={24} />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white">
                <p className="text-sm text-gray-600 mb-2">{job.address}</p>
                <button className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
                  Ver en mapa
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fijo */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 pb-8 z-40">
          {/* Estado del empleo */}
          {(job.hired || isExpired) && (
            <div className={`mb-3 p-3 rounded-xl text-center text-sm font-medium ${
              job.hired ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {job.hired ? (
                <span className="flex items-center justify-center gap-2">
                  <Check size={16} /> Puesto cubierto - Contratado
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Clock size={16} /> Oferta expirada (60 días)
                </span>
              )}
            </div>
          )}

          {/* Días restantes si no está expirado ni contratado */}
          {!job.hired && !isExpired && (
            <div className={`mb-3 p-2 rounded-lg text-center text-xs font-medium ${
              isExpiringSoon ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'
            }`}>
              <Clock size={14} className="inline mr-1" />
              {daysRemaining} días restantes para esta oferta
            </div>
          )}

          {/* Botones SOLO para el propietario de ESTE empleo específico */}
          {isBusinessOwner && userBusinessId && job.business_id === userBusinessId && (
            <div className="flex gap-2 mb-3">
              {!job.hired && !isExpired && (
                <button
                  onClick={() => markJobAsHired && markJobAsHired(job.id)}
                  className="flex-1 h-12 rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck size={18} />
                  Contratado
                </button>
              )}
              {isExpired && !job.hired && (
                <button
                  onClick={() => renewJob && renewJob(job.id)}
                  className="flex-1 h-12 rounded-xl bg-primary text-white font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Renovar 60 días
                </button>
              )}
              <button aria-label="Eliminar"
                onClick={() => {
                  if (deleteJob) {
                    deleteJob(job.id);
                    onNavigate('offers', { tab: 'jobs' });
                  }
                }}
                className="h-12 px-4 rounded-xl bg-red-100 text-red-600 font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}

          {/* Botón de inscripción para candidatos (oculto si eres el propietario de este empleo) */}
          {!job.hired && !isExpired && !(isBusinessOwner && userBusinessId && job.business_id === userBusinessId) && (
            <button
              onClick={handleApply}
              className="w-full h-14 rounded-xl bg-primary text-white font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 shadow-lg shadow-primary/30"
            >
              <Upload size={20} />
              Inscribirme
              <span className="text-sm bg-white/20 px-3 py-1 rounded-lg">Subir CV</span>
            </button>
          )}

          {/* Mensaje si el empleo no está disponible */}
          {!isBusinessOwner && (job.hired || isExpired) && (
            <button
              onClick={() => onNavigate('offers', { tab: 'jobs' })}
              className="w-full h-14 rounded-xl bg-gray-200 text-gray-600 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Ver otros empleos
            </button>
          )}
        </div>

        {/* Pantalla de Éxito */}
        {showSuccessScreen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
            <div className="text-center px-8 max-w-sm">
              {/* Animación de éxito */}
              <div className="w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-200 animate-bounce">
                <CheckCircle2 className="text-white" size={56} />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                ¡Candidatura enviada!
              </h2>

              <p className="text-gray-500 mb-2">
                Tu solicitud para <span className="font-semibold text-slate-700">{job.title}</span> en <span className="font-semibold text-slate-700">{job.company}</span> ha sido enviada correctamente.
              </p>

              <p className="text-sm text-gray-500 mb-8">
                La empresa revisará tu perfil y se pondrá en contacto contigo si tu candidatura encaja con el puesto.
              </p>

              {/* Resumen */}
              <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tu candidatura incluye</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Currículum</p>
                      <p className="text-xs text-gray-500">{cvFileName}</p>
                    </div>
                  </div>
                  {coverLetter.trim() && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Edit3 className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Carta de presentación</p>
                        <p className="text-xs text-gray-500">{coverLetter.trim().split(/\s+/).length} palabras</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="space-y-3">
                <button
                  onClick={() => onNavigate('user-jobs')}
                  className="w-full h-14 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"
                >
                  Ver mis candidaturas
                </button>
                <button
                  onClick={() => onNavigate('offers')}
                  className="w-full h-12 bg-gray-100 text-slate-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Buscar más empleos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Inscripción */}
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowApplyModal(false)}>
            <div
              className="bg-white rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white pt-6 px-6 pb-4 border-b border-gray-100">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-bold text-slate-900">Inscribirse a la oferta</h3>
                <p className="text-gray-500 text-sm mt-1">{job.title} en {job.company}</p>
              </div>

              <div className="p-6 space-y-5">
                {/* 1. Subir CV */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    1. Adjunta tu Currículum <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={handleUploadCV}
                    className={`w-full border-2 border-dashed rounded-xl p-5 transition-all ${
                      cvUploaded
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    {cvUploaded ? (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                          <FileText className="text-green-600" size={24} />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-semibold text-green-700 truncate">{cvFileName}</p>
                          <p className="text-xs text-green-600">Toca para cambiar</p>
                        </div>
                        <Check className="text-green-500 shrink-0" size={24} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                          <Upload className="text-gray-500" size={24} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-slate-700">Subir CV</p>
                          <p className="text-xs text-gray-500">PDF, DOC o DOCX (máx. 5MB)</p>
                        </div>
                      </div>
                    )}
                  </button>
                </div>

                {/* 2. Carta de presentación */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    2. Carta de presentación <span className="text-gray-500 font-normal">(opcional)</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Escribe unas líneas presentándote y explicando por qué te interesa este puesto
                  </p>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Hola, me llamo... y me interesa esta oferta porque..."
                    rows={5}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">Preséntate brevemente a la empresa</p>
                    <p className={`text-xs ${coverLetter.length > 450 ? 'text-amber-500' : 'text-gray-500'}`}>
                      {coverLetter.length}/500
                    </p>
                  </div>
                </div>

                {/* Resumen */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Resumen de tu candidatura</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Currículum</span>
                      {cvUploaded ? (
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                          <Check size={14} /> Adjuntado
                        </span>
                      ) : (
                        <span className="text-sm text-red-500 font-medium">Pendiente</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Carta de presentación</span>
                      {coverLetter.trim() ? (
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                          <Check size={14} /> {coverLetter.trim().split(/\s+/).length} palabras
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">No incluida</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Información al enviar datos personales (RGPD art. 13) */}
                <p className="text-xs text-gray-500 leading-relaxed">
                  🔒 Tu nombre, email, teléfono, carta y CV solo los verá este negocio, que decide la selección.
                  El CV se borra solo 2 días después de que termine el proceso (te contraten, te descarten o se cierre
                  la oferta) y como máximo a los 90 días.{' '}
                  <button type="button" onClick={() => onNavigate('privacy-policy')} className="text-primary font-semibold underline">
                    Más información
                  </button>
                </p>
              </div>

              {/* Botones fijos */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setCoverLetter('');
                  }}
                  className="flex-1 h-12 rounded-xl border border-gray-200 text-slate-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitApplication}
                  disabled={!cvUploaded}
                  className={`flex-1 h-12 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                    cvUploaded
                      ? 'bg-primary text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                  Enviar candidatura
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Página de Detalle de Categoría
const CategoryDetailPage = ({ categoryId, onNavigate }) => {
  const category = categories.find(c => c.id === categoryId);
  const [subcategoryCounts, setSubcategoryCounts] = useState({});

  useEffect(() => {
    const loadCounts = async () => {
      if (!category) return;
      const subcategoryNames = category.subcategories?.map(s => s.name) || [];
      if (subcategoryNames.length === 0) return;
      const { data } = await supabase
        .from('businesses')
        .select('subcategory')
        .in('subcategory', subcategoryNames)
        .eq('verification_status', 'approved')
        .eq('is_published', true);
      if (!data) return;
      const counts = {};
      data.forEach(b => {
        if (b.subcategory) counts[b.subcategory] = (counts[b.subcategory] || 0) + 1;
      });
      setSubcategoryCounts(counts);
    };
    loadCounts();
  }, [categoryId]);

  if (!category) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-lg font-bold text-slate-900">Categoría no encontrada</h1>
        <p className="text-sm text-gray-500">Puede que el enlace haya cambiado. Explora todas las categorías desde el inicio.</p>
        <button onClick={() => onNavigate('home')} className="h-11 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold">
          Volver al inicio
        </button>
      </div>
    );
  }

  const colorClasses = {
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-200', hover: 'hover:bg-orange-50' },
    green: { bg: 'bg-green-100', text: 'text-green-600', ring: 'ring-green-200', hover: 'hover:bg-green-50' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', ring: 'ring-purple-200', hover: 'hover:bg-purple-50' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', ring: 'ring-blue-200', hover: 'hover:bg-blue-50' },
    red: { bg: 'bg-red-100', text: 'text-red-600', ring: 'ring-red-200', hover: 'hover:bg-red-50' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', ring: 'ring-amber-200', hover: 'hover:bg-amber-50' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600', ring: 'ring-teal-200', hover: 'hover:bg-teal-50' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200', hover: 'hover:bg-slate-50' },
  };

  const colors = colorClasses[category.color] || colorClasses.blue;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative pb-24 overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-4">
          <button aria-label="Volver"
            onClick={() => onNavigate('home')}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-700" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center ${colors.text}`}>
              <Icon name={category.icon} size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{category.name}</h1>
              <p className="text-sm text-gray-500">{category.subcategories?.length || 0} subcategorías</p>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Registro de Negocio */}
      <div className="px-4 pt-4">
        <button
          onClick={() => onNavigate('business-data')}
          className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-primary to-blue-600 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Store size={20} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-semibold text-sm">¿Eres dueño de un negocio?</p>
            <p className="text-white/80 text-xs">Regístralo y gestiona tu comercio</p>
          </div>
          <ChevronRight size={20} className="text-white/80" />
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-4">
        <p className="text-gray-600">{category.description}</p>
      </div>

      {/* Subcategories Grid */}
      <div className="px-4">
        <h2 className="text-lg font-bold mb-4 text-slate-900">Subcategorías</h2>
        <div className="grid gap-3">
          {category.subcategories?.map(sub => (
            <button
              key={sub.id}
              onClick={() => onNavigate('subcategory', { categoryId: category.id, subcategoryId: sub.id })}
              className={`flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-soft ${colors.hover} transition-all hover:shadow-md active:scale-[0.98]`}
            >
              <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text} ring-1 ${colors.ring}`}>
                <Icon name={sub.icon} size={28} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-slate-900">{sub.name}</h3>
                <p className="text-sm text-gray-500">{subcategoryCounts[sub.name] ?? sub.count} comercios</p>
              </div>
              <ChevronRight size={20} className="text-gray-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Navbar */}
      <Navbar currentPage="home" onNavigate={onNavigate} />
    </div>
  );
};

// Pantalla de Detalle de Subcategoría - Lista de negocios
const SubcategoryDetailPage = ({ categoryId, subcategoryId, onNavigate, userFavorites = [], toggleFavorite }) => {
  const category = categories.find(c => c.id === categoryId);
  const subcategory = category?.subcategories?.find(s => s.id === subcategoryId);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [businesses, setBusinesses] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);

  // Cargar negocios desde Supabase
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('category_id', categoryId)
          .eq('is_verified', true)
          .eq('is_published', true)
          .limit(150);

        if (error) throw error;

        // Filtrar por subcategoría si está definida

        const filtered = data?.filter(b => {
          if (!subcategory) return true;
          const match = b.subcategory && b.subcategory.toLowerCase().includes(subcategory.name.toLowerCase());
          return match;
        }) || [];

        setBusinesses(filtered);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingBusinesses(false);
      }
    };

    fetchBusinesses();
  }, [categoryId, subcategoryId]);

  // Función para verificar si un negocio está abierto según la hora actual
  const isBusinessOpenNow = (business) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes; // Tiempo en minutos desde medianoche

    // Horarios típicos simulados (en minutos desde medianoche)
    // Podemos usar el campo isOpen del negocio o simular basándonos en horarios típicos
    if (business.isOpen !== undefined) {
      return business.isOpen;
    }

    // Horarios típicos por tipo de negocio
    const schedules = {
      'Panadería': { open: 7 * 60, close: 20 * 60 }, // 7:00 - 20:00
      'Hostelería': { open: 8 * 60, close: 23 * 60 }, // 8:00 - 23:00
      'Café': { open: 7 * 60, close: 21 * 60 }, // 7:00 - 21:00
      'Artesanal': { open: 9 * 60, close: 19 * 60 }, // 9:00 - 19:00
      'Hogar': { open: 9 * 60, close: 20 * 60 }, // 9:00 - 20:00
      'Tienda local': { open: 9 * 60, close: 20 * 60 }, // 9:00 - 20:00
      'default': { open: 9 * 60, close: 20 * 60 }, // 9:00 - 20:00
    };

    const schedule = schedules[business.category] || schedules['default'];
    return currentTime >= schedule.open && currentTime <= schedule.close;
  };

  // Los negocios ya vienen filtrados de Supabase
  const baseBusinesses = businesses;

  // Aplicar filtros según el filtro activo
  const displayBusinesses = (() => {
    let filtered = [...baseBusinesses];

    switch (activeFilter) {
      case 'abierto':
        filtered = filtered.filter(b => isBusinessOpenNow(b));
        break;
      case 'valorados':
        filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        // 'todos' - no aplicar filtro
        break;
    }

    return filtered;
  })();

  const colorClasses = {
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600' },
  };

  const colors = colorClasses[category?.color] || colorClasses.blue;

  if (!subcategory) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-lg font-bold text-slate-900">Subcategoría no encontrada</h1>
        <p className="text-sm text-gray-500">Puede que el enlace haya cambiado. Explora todas las categorías desde el inicio.</p>
        <button onClick={() => onNavigate('home')} className="h-11 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative pb-24 overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-4">
          <button aria-label="Volver"
            onClick={() => onNavigate('category', { id: categoryId })}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-700" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center ${colors.text}`}>
              <Icon name={subcategory.icon} size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{subcategory.name}</h1>
              <p className="text-sm text-gray-500">{pluralize(displayBusinesses.length, 'comercio encontrado', 'comercios encontrados')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros rápidos */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveFilter('todos')}
          className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
            activeFilter === 'todos'
              ? 'bg-primary text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setActiveFilter('abierto')}
          className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeFilter === 'abierto'
              ? 'bg-green-700 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Clock size={14} />
          Abierto ahora
        </button>
        <button
          onClick={() => setActiveFilter('valorados')}
          className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeFilter === 'valorados'
              ? 'bg-amber-700 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Star size={14} />
          Mejor valorados
        </button>
      </div>

      {/* Lista de negocios */}
      <div className="px-4 py-2 space-y-4">
        {displayBusinesses.length === 0 && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="text-gray-500" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {activeFilter === 'abierto' ? 'No hay comercios abiertos ahora' : 'No hay resultados'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {activeFilter === 'abierto'
                ? 'Prueba en otro horario o quita el filtro'
                : 'Prueba con otro filtro'}
            </p>
            <button
              onClick={() => setActiveFilter('todos')}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-full"
            >
              Ver todos
            </button>
          </div>
        )}
        {displayBusinesses.map(business => {
          const isFavorite = userFavorites.includes(business.id);
          return (
            <div
              key={business.id}
              className="bg-white rounded-2xl shadow-soft overflow-hidden border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="relative h-40">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url("${business.cover_photo || (business.images && business.images[0]) || ''}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {isBusinessOpenNow(business) && (
                    <span className="px-2.5 py-1 bg-green-700 text-white text-xs font-bold rounded-full">
                      Abierto
                    </span>
                  )}
                  {(business.isNew || isRecentlyPublished(business)) && (
                    <span className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-full">
                      Nuevo
                    </span>
                  )}
                  {business.isVerified && (
                    <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <BadgeCheck size={12} /> Verificado
                    </span>
                  )}
                </div>

                {/* Favorito */}
                <button aria-label="Guardar en favoritos"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite && toggleFavorite(business.id);
                  }}
                  className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                >
                  <Heart
                    size={18}
                    className={isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600'}
                  />
                </button>

                {/* Info superpuesta */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white text-lg font-bold">{business.name}</h3>
                  <p className="text-white/80 text-sm">{business.address}</p>
                </div>
              </div>

              <div
                className="p-4 cursor-pointer"
                onClick={() => onNavigate('business', { id: business.id })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="text-yellow-500 fill-yellow-500" size={16} />
                      <span className="font-bold text-slate-900">{business.rating}</span>
                      <span className="text-gray-500 text-sm">({business.review_count || business.reviews || 0})</span>
                    </div>
                    {business.distance && (
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <MapPin size={14} />
                        {business.distance}
                      </div>
                    )}
                  </div>
                  <button className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                    Ver más
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estado vacío si no hay negocios */}
      {displayBusinesses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className={`w-20 h-20 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} mb-4`}>
            <Icon name={subcategory.icon} size={40} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Sin resultados</h3>
          <p className="text-gray-500 text-center text-sm">
            No hay comercios registrados en esta categoría todavía. ¡Sé el primero!
          </p>
          <button
            onClick={() => onNavigate('business-data')}
            className="mt-4 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Registrar mi negocio
          </button>
        </div>
      )}

      {/* Navbar */}
      <Navbar currentPage="home" onNavigate={onNavigate} />
    </div>
  );
};

// ==============================================
// PANTALLAS DE USUARIO ADICIONALES
// ==============================================

// Pantalla de Mis Reseñas
const UserReviewsScreen = ({ onNavigate, user, showToast }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editedReviews, setEditedReviews] = useState({});

  useEffect(() => {
    const loadReviews = async () => {
      if (!user?.id) { setLoading(false); return; }
      const { data } = await supabase
        .from('reviews')
        .select('*, businesses(name, cover_photo)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) {
        setReviews(data.map(r => ({
          id: r.id,
          businessName: r.businesses?.name || 'Negocio',
          businessImage: r.businesses?.cover_photo || null,
          date: new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
          rating: r.rating,
          text: r.comment,
        })));
      }
      setLoading(false);
    };
    loadReviews();
  }, [user?.id]);

  const renderStars = (rating, interactive = false, onSelect = null) => {
    return Array(5).fill(0).map((_, i) => (
      <button aria-label={`${i + 1} ${i === 0 ? 'estrella' : 'estrellas'}`}
        key={i}
        onClick={() => interactive && onSelect && onSelect(i + 1)}
        disabled={!interactive}
        className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
      >
        <Star
          size={interactive ? 24 : 18}
          className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      </button>
    ));
  };

  const handleDelete = async (reviewId) => {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId).eq('user_id', user?.id);
    if (error) { showToast?.('Error al eliminar la reseña', 'error'); return; }
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    setDeleteConfirm(null);
    showToast?.('Reseña eliminada', 'success');
  };

  const handleEdit = (review) => {
    if ((review.edit_count || 0) >= 1) {
      showToast?.('Solo puedes editar una reseña 1 vez', 'warning');
      return;
    }
    setEditingReview(review);
    setEditText(review.text || review.comment || '');
    setEditRating(review.rating);
  };

  const handleSaveEdit = async () => {
    if (!editingReview || !editText.trim()) return;
    const moderation = moderateContent(editText.trim());
    if (!moderation.isClean) { showToast?.(`⚠️ ${moderation.reason}`, 'error'); return; }
    const { error } = await supabase
      .from('reviews')
      .update({ comment: editText.trim(), rating: editRating, edit_count: 1 })
      .eq('id', editingReview.id)
      .eq('user_id', user?.id);
    if (error) { showToast?.('Error al guardar los cambios', 'error'); return; }
    setReviews(prev => prev.map(r =>
      r.id === editingReview.id
        ? { ...r, text: editText.trim(), comment: editText.trim(), rating: editRating, edit_count: 1 }
        : r
    ));
    setEditingReview(null);
    setEditText('');
    showToast?.('Reseña actualizada', 'success');
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center bg-white/95 backdrop-blur-md p-4 pb-2 border-b border-gray-100 justify-between">
        <button aria-label="Volver"
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          Mis Reseñas
        </h2>
      </header>

      {/* Summary Section */}
      <div className="px-4 py-6 bg-white">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">
            Tu impacto
          </div>
          <h3 className="text-slate-900 tracking-tight text-3xl font-bold leading-tight text-center">
            Has escrito <span className="text-primary">{reviews.length}</span> reseñas
          </h3>
          <p className="text-gray-500 text-sm text-center max-w-[280px]">
            Gracias por ayudar a mejorar los servicios de Cornellà con tus opiniones.
          </p>
        </div>
      </div>

      {/* Reviews List */}
      <div className="flex-1 px-4 py-2 space-y-4 pb-8">
        {reviews.length === 0 ? (
          <EmptyState
            icon="Star"
            title="Sin reseñas todavía"
            description="Comparte tu experiencia con los comercios locales y ayuda a otros vecinos"
            actionLabel="Explorar comercios"
            onAction={() => onNavigate('home')}
            color="orange"
          />
        ) : (
          reviews.map(review => (
            <article
              key={review.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-lg h-12 w-12 shrink-0 shadow-sm bg-cover bg-center bg-gray-100"
                    style={{
                      backgroundImage: review.businessImage
                        ? `url("${review.businessImage}")`
                        : 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)'
                    }}
                  />
                  <div className="flex flex-col">
                    <h4 className="text-slate-900 text-base font-bold leading-snug">{review.businessName}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs font-medium">{review.date}</span>
                      {review.editedAt && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{review.editedAt}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 -mr-2">
                  {(review.edit_count || 0) < 1 ? (
                    <button
                      onClick={() => handleEdit(review)}
                      className="p-2 text-gray-500 hover:text-primary transition-colors rounded-full hover:bg-primary/5"
                      title="Editar reseña (solo 1 vez)"
                    >
                      <Edit2 size={18} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-500 px-2">Editada</span>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(review)}
                    className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                    title="Eliminar reseña"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-3">
                {renderStars(review.rating)}
              </div>
              <p className="text-gray-600 text-sm font-normal leading-relaxed">
                {review.text}
              </p>
            </article>
          ))
        )}
      </div>

      {/* Modal de Editar */}
      {editingReview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Editar reseña</h3>
              <button aria-label="Cerrar"
                onClick={() => setEditingReview(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
              <div
                className="rounded-lg h-10 w-10 shrink-0 bg-cover bg-center bg-gray-200"
                style={{
                  backgroundImage: editingReview.businessImage
                    ? `url("${editingReview.businessImage}")`
                    : 'none'
                }}
              />
              <span className="font-medium text-slate-800">{editingReview.businessName}</span>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Puntuación</label>
              <div className="flex gap-1">
                {renderStars(editRating, true, setEditRating)}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tu opinión</label>
              <textarea aria-label="Tu opinión"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Escribe tu opinión..."
              />
            </div>

            <div className="bg-amber-50 rounded-xl p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-amber-700">Solo puedes editar cada reseña una vez.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingReview(null)}
                className="flex-1 h-12 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
                className="flex-1 h-12 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmar Eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-scaleIn">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">¿Eliminar reseña?</h3>
              <p className="text-sm text-gray-500">
                Se eliminará tu reseña de <span className="font-medium">{deleteConfirm.businessName}</span>. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-12 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 h-12 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Pantalla de Mis Candidaturas
const UserJobsScreen = ({ onNavigate, user, showToast }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInterviewDetails, setShowInterviewDetails] = useState(null);
  const [interviewResponses, setInterviewResponses] = useState({}); // { appId: 'accepted' | 'rejected' }
  const [showResponseConfirmation, setShowResponseConfirmation] = useState(null); // { type: 'accepted' | 'rejected', company: string }
  const [showProposeModal, setShowProposeModal] = useState(null); // Para proponer nueva fecha
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [proposedMessage, setProposedMessage] = useState('');

  // Cargar candidaturas del usuario desde Supabase
  useEffect(() => {
    const loadMyApplications = async () => {
      if (!user?.id) {
        setApplications([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('job_applications')
          .select(`
            *,
            jobs!inner(
              id,
              title,
              type,
              location,
              salary_min,
              salary_max,
              business_id,
              businesses!inner(
                id,
                name,
                logo_url
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transformar datos al formato esperado
        const transformed = (data || []).map(app => {
          const job = app.jobs;
          const business = job.businesses;

          // Calcular tiempo desde aplicación
          const timeAgo = formatRelativeTime(app.created_at);

          // Mapear estados de DB a estados de UI
          let uiStatus;
          if (app.status === 'pending') uiStatus = 'review';
          else if (app.status === 'reviewed') uiStatus = 'review';
          else if (app.status === 'shortlisted') uiStatus = 'interview';
          else if (app.status === 'hired') uiStatus = 'finished';
          else if (app.status === 'rejected') uiStatus = 'rejected';
          else uiStatus = 'review';

          return {
            id: app.id,
            company: business.name,
            companyLogo: business.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=4b71c3&color=fff`,
            position: job.title,
            location: job.location || 'Cornellà',
            salary: job.salary_min && job.salary_max
              ? `${formatCurrency(job.salary_min, false)} - ${formatCurrency(job.salary_max, false)}`
              : 'A convenir',
            appliedDate: timeAgo,
            status: uiStatus,
            jobType: job.type,
            interviewDate: app.interview_date ? new Date(app.interview_date).toLocaleString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            }) : null,
            interviewConfirmed: app.interview_confirmed || null,
            interviewLocation: app.interview_location || null,
            dbStatus: app.status
          };
        });

        setApplications(transformed);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMyApplications();
  }, [user?.id]);

  // Calcular estadísticas
  const stats = {
    active: applications.filter(a => a.status === 'review').length,
    interviews: applications.filter(a => a.status === 'interview').length,
    finished: applications.filter(a => a.status === 'finished').length
  };

  const handleInterviewResponse = (appId, response, company) => {
    setInterviewResponses(prev => ({ ...prev, [appId]: response }));
    setShowInterviewDetails(null);
    setShowResponseConfirmation({ type: response, company });
    // Cerrar confirmación después de 3 segundos
    setTimeout(() => setShowResponseConfirmation(null), TIMING.toastDuration);
  };

  // Aceptar entrevista
  const acceptInterview = async (applicationId) => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({
          interview_confirmed: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Actualizar estado local
      setApplications(prev => prev.map(app =>
        app.id === applicationId
          ? { ...app, interviewConfirmed: 'accepted' }
          : app
      ));
      showToast && showToast('Entrevista confirmada', 'success');
    } catch (error) {
      showToast && showToast('Error al confirmar la entrevista', 'error');
    }
  };

  // Proponer nueva fecha
  const proposeNewDate = async () => {
    if (!showProposeModal || !proposedDate || !proposedTime) return;

    const proposedDateTime = new Date(`${proposedDate}T${proposedTime}`);

    try {
      const { error } = await supabase
        .from('job_applications')
        .update({
          interview_confirmed: 'counter_proposed',
          candidate_proposed_date: proposedDateTime.toISOString(),
          candidate_proposed_message: proposedMessage.trim() || 'El candidato propone otra fecha',
          updated_at: new Date().toISOString()
        })
        .eq('id', showProposeModal.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Actualizar estado local
      setApplications(prev => prev.map(app =>
        app.id === showProposeModal.id
          ? { ...app, interviewConfirmed: 'counter_proposed' }
          : app
      ));

      // Cerrar modal y limpiar
      setShowProposeModal(null);
      setProposedDate('');
      setProposedTime('');
      setProposedMessage('');
      showToast && showToast('Propuesta enviada', 'success');
    } catch (error) {
      showToast && showToast('Error al enviar la propuesta', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'review':
        return (
          <span className="inline-flex shrink-0 items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/10">
            En revisión
          </span>
        );
      case 'interview':
        return (
          <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
            Entrevista
          </span>
        );
      case 'finished':
        return (
          <span className="inline-flex shrink-0 items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/10">
            Contratado
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex shrink-0 items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
            Descartado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-white">
      {/* Header */}
      <div className="flex items-center bg-white px-6 py-4 justify-between sticky top-0 z-20 border-b border-gray-100">
        <button aria-label="Volver"
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight flex-1 text-center pr-10">Mis Candidaturas</h2>
      </div>

      {/* Stats Summary */}
      <div className="flex w-full overflow-x-auto gap-3 px-6 py-6 pb-2">
        <div className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl p-4 border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" size={20} />
            <p className="text-gray-500 text-sm font-medium">Activas</p>
          </div>
          <p className="text-slate-900 text-2xl font-bold leading-tight">{stats.active}</p>
        </div>
        <div className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl p-4 border border-primary/20 bg-primary/5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserSearch className="text-primary" size={20} />
            <p className="text-primary text-sm font-medium">Entrevistas</p>
          </div>
          <p className="text-primary text-2xl font-bold leading-tight">{stats.interviews}</p>
        </div>
        <div className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl p-4 border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <Archive className="text-gray-500" size={20} />
            <p className="text-gray-500 text-sm font-medium">Finalizadas</p>
          </div>
          <p className="text-slate-900 text-2xl font-bold leading-tight">{stats.finished}</p>
        </div>
      </div>

      {/* Applications List */}
      <div className="flex-1 px-6 py-4 flex flex-col gap-5">
        {loading ? (
          <>
            <ApplicationSkeleton />
            <ApplicationSkeleton />
            <ApplicationSkeleton />
          </>
        ) : applications.length === 0 ? (
          <EmptyState
            icon="Briefcase"
            title="Sin candidaturas"
            description="Explora ofertas de empleo en Cornellà y encuentra tu próxima oportunidad laboral"
            actionLabel="Ver ofertas de empleo"
            onAction={() => onNavigate('offers', { tab: 'jobs' })}
            color="purple"
          />
        ) : (
          <>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recientes</h3>

            {applications.map(app => (
          <div
            key={app.id}
            className={`group relative flex flex-col rounded-xl border ${
              app.status === 'interview'
                ? 'border-primary/30 shadow-md ring-1 ring-primary/10'
                : 'border-gray-200 shadow-sm'
            } bg-white ${app.status === 'finished' ? 'opacity-80 hover:opacity-100' : ''} transition-all`}
          >
            <div className="flex items-start gap-4 p-4">
              <img
                src={app.companyLogo}
                alt={app.company}
                className={`rounded-lg size-12 shrink-0 border border-gray-100 object-cover ${
                  app.status === 'finished' ? 'grayscale' : ''
                }`}
                onError={(e) => {
                  // Si la imagen falla, usar color de fondo
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = `rounded-lg size-12 shrink-0 border border-gray-100 bg-primary/10 flex items-center justify-center text-primary font-bold ${app.status === 'finished' ? 'grayscale' : ''}`;
                  fallback.textContent = app.company[0].toUpperCase();
                  e.target.parentNode.insertBefore(fallback, e.target);
                }}
              />
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-slate-900 text-base font-bold leading-tight truncate pr-2">{app.position}</h4>
                  {getStatusBadge(app.status)}
                </div>
                <p className="text-gray-500 text-sm font-normal leading-normal mt-1 truncate">{app.company}</p>
                <p className="text-gray-500 text-xs mt-2">{app.appliedDate}</p>
              </div>
            </div>

            {/* Confirmación de entrevista */}
            {app.status === 'interview' && app.interviewDate && !app.interviewConfirmed && (
              <div className="px-4 pb-4 pt-2">
                <div className="my-3 h-px w-full bg-gray-100"></div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="text-purple-600" size={20} />
                    <span className="font-semibold text-purple-900">Entrevista programada</span>
                  </div>
                  <p className="text-sm text-purple-700 mb-4">
                    📅 {app.interviewDate}
                  </p>
                  <p className="text-xs text-purple-600 mb-4">
                    ¿Puedes asistir en esta fecha y hora?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptInterview(app.id)}
                      className="flex-1 h-10 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-sm"
                    >
                      ✓ Confirmar
                    </button>
                    <button
                      onClick={() => setShowProposeModal(app)}
                      className="flex-1 h-10 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 transition-colors text-sm"
                    >
                      ↻ Proponer otra
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Entrevista confirmada */}
            {app.status === 'interview' && app.interviewDate && app.interviewConfirmed === 'accepted' && (
              <div className="px-4 pb-4 pt-2">
                <div className="my-3 h-px w-full bg-gray-100"></div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="text-green-600" size={20} />
                    <span className="font-semibold text-green-900">Entrevista confirmada</span>
                  </div>
                  <p className="text-sm text-green-700">
                    📅 {app.interviewDate}
                  </p>
                </div>
              </div>
            )}

            {/* Propuesta enviada */}
            {app.status === 'interview' && app.interviewConfirmed === 'counter_proposed' && (
              <div className="px-4 pb-4 pt-2">
                <div className="my-3 h-px w-full bg-gray-100"></div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-amber-600" size={20} />
                    <span className="font-semibold text-amber-900">Propuesta enviada</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Has propuesto otra fecha. Esperando respuesta de la empresa.
                  </p>
                </div>
              </div>
            )}

            {/* Timeline for interview status - mantener por compatibilidad */}
            {app.status === 'interview' && app.timeline && (
              <div className="px-4 pb-5 pt-2">
                <div className="my-3 h-px w-full bg-gray-100"></div>
                <div className="flex flex-col gap-0 pl-1">
                  {app.timeline.map((step, idx) => (
                    <div key={idx} className={`relative flex gap-4 ${idx < app.timeline.length - 1 ? 'pb-6' : ''}`}>
                      {idx < app.timeline.length - 1 && (
                        <div className="absolute top-6 bottom-0 left-[11px] w-0.5 bg-gray-200" />
                      )}
                      <div className={`z-10 flex size-6 shrink-0 items-center justify-center rounded-full ${
                        step.completed
                          ? 'bg-green-500'
                          : step.current
                            ? 'bg-primary ring-4 ring-blue-100'
                            : 'bg-gray-200'
                      }`}>
                        {step.completed ? (
                          <Check className="text-white" size={14} />
                        ) : step.current ? (
                          <Users className="text-white" size={14} />
                        ) : (
                          <div className="size-2 rounded-full bg-gray-400" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <p className={`text-sm font-medium leading-none ${
                          step.current ? 'text-primary font-bold' : step.pending ? 'text-gray-500' : 'text-slate-900'
                        }`}>
                          {step.step}
                        </p>
                        {step.date && (
                          <p className="text-xs text-gray-500 mt-1">{step.date}</p>
                        )}
                        {step.current && (
                          <button
                            onClick={() => setShowInterviewDetails(app)}
                            className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                          >
                            Ver detalles
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

            {/* Promo */}
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center border border-blue-100 border-dashed">
              <div className="mb-3 rounded-full bg-white p-3 shadow-sm">
                <Briefcase className="text-primary" size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">¿Buscas algo más?</h3>
              <p className="mt-1 text-xs text-gray-500">Hay 15 ofertas nuevas que coinciden con tu perfil.</p>
              <button
                onClick={() => onNavigate('offers', { tab: 'jobs' })}
                className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"
              >
                Explorar empleos
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal detalles de entrevista */}
      {showInterviewDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden animate-scaleIn">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary to-blue-600 p-5 text-white">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl bg-white/20 bg-cover bg-center"
                  style={{ backgroundImage: `url("${showInterviewDetails.companyLogo}")` }}
                />
                <div>
                  <h3 className="font-bold text-lg">{showInterviewDetails.position}</h3>
                  <p className="text-white/80 text-sm">{showInterviewDetails.company}</p>
                </div>
              </div>
            </div>

            {/* Detalles */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-800">Entrevista programada</p>
                  <p className="text-xs text-green-600">
                    {showInterviewDetails.timeline?.find(s => s.current)?.date || 'Fecha por confirmar'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="text-gray-500" size={18} />
                  <span className="text-gray-600">Presencial en oficinas de {showInterviewDetails.company}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="text-gray-500" size={18} />
                  <span className="text-gray-600">Duración estimada: 30-45 minutos</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Users className="text-gray-500" size={18} />
                  <span className="text-gray-600">Entrevista con RRHH</span>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-xs text-amber-700">
                  <span className="font-bold">Consejo:</span> Llega 10 minutos antes y lleva tu CV impreso. ¡Mucha suerte!
                </p>
              </div>

              {/* Botones de respuesta a la entrevista */}
              {!interviewResponses[showInterviewDetails.id] && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-sm font-semibold text-blue-800 mb-3">¿Confirmas tu asistencia a la entrevista?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInterviewResponse(showInterviewDetails.id, 'rejected', showInterviewDetails.company)}
                      className="flex-1 h-10 bg-white text-red-600 font-medium rounded-xl border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      No puedo asistir
                    </button>
                    <button
                      onClick={() => handleInterviewResponse(showInterviewDetails.id, 'accepted', showInterviewDetails.company)}
                      className="flex-1 h-10 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      Confirmar asistencia
                    </button>
                  </div>
                </div>
              )}

              {/* Mensaje si ya respondió */}
              {interviewResponses[showInterviewDetails.id] && (
                <div className={`mt-4 p-4 rounded-xl border ${
                  interviewResponses[showInterviewDetails.id] === 'accepted'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {interviewResponses[showInterviewDetails.id] === 'accepted' ? (
                      <>
                        <CheckCircle2 className="text-green-600" size={20} />
                        <p className="text-sm font-medium text-green-800">Has confirmado tu asistencia</p>
                      </>
                    ) : (
                      <>
                        <X className="text-red-600" size={20} />
                        <p className="text-sm font-medium text-red-800">Has rechazado la entrevista</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="p-4 pt-0 flex gap-3">
              <button
                onClick={() => setShowInterviewDetails(null)}
                className="flex-1 h-11 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const text = `Tengo una entrevista programada para el puesto de ${showInterviewDetails.position} en ${showInterviewDetails.company}. ${showInterviewDetails.timeline?.find(s => s.current)?.date || ''}`;
                  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
                }}
                className="flex-1 h-11 bg-primary text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar size={16} />
                Añadir a calendario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de respuesta */}
      {showResponseConfirmation && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className={`bg-white w-full max-w-xs rounded-2xl p-6 text-center animate-scaleIn ${
            showResponseConfirmation.type === 'accepted' ? 'border-2 border-green-200' : 'border-2 border-red-200'
          }`}>
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              showResponseConfirmation.type === 'accepted' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {showResponseConfirmation.type === 'accepted' ? (
                <CheckCircle2 className="text-green-600" size={32} />
              ) : (
                <X className="text-red-600" size={32} />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {showResponseConfirmation.type === 'accepted' ? '¡Entrevista confirmada!' : 'Entrevista rechazada'}
            </h3>
            <p className="text-sm text-gray-600">
              {showResponseConfirmation.type === 'accepted'
                ? `Hemos notificado a ${showResponseConfirmation.company} que asistirás a la entrevista.`
                : `Hemos notificado a ${showResponseConfirmation.company} que no podrás asistir.`
              }
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Bell size={14} />
              <span>Notificación enviada a la empresa</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal para proponer nueva fecha */}
      {showProposeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowProposeModal(null)}>
          <div
            className="bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white pt-6 px-6 pb-4 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-slate-900">Proponer otra fecha</h3>
              <p className="text-gray-500 text-sm mt-1">
                {showProposeModal.position} en {showProposeModal.company}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Fecha actual programada */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase mb-2">Fecha actual</p>
                <p className="text-sm text-amber-900">{showProposeModal.interviewDate}</p>
              </div>

              {/* Nueva fecha propuesta */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Propón una nueva fecha <span className="text-red-500">*</span>
                </label>
                <input aria-label="Propón una nueva fecha"
                  type="date"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Hora propuesta <span className="text-red-500">*</span>
                </label>
                <input aria-label="Hora propuesta"
                  type="time"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              {/* Mensaje opcional */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Mensaje (opcional)
                </label>
                <textarea aria-label="Mensaje"
                  value={proposedMessage}
                  onChange={(e) => setProposedMessage(e.target.value)}
                  placeholder="Ej: Esa hora me viene mejor porque..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">{proposedMessage.length}/200</p>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowProposeModal(null);
                    setProposedDate('');
                    setProposedTime('');
                    setProposedMessage('');
                  }}
                  className="flex-1 h-12 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={proposeNewDate}
                  disabled={!proposedDate || !proposedTime}
                  className="flex-1 h-12 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Enviar propuesta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-20" />
    </div>
  );
};

// Pantalla de Mis Presupuestos (para usuarios)
const MyBudgetRequestsScreen = ({ onNavigate, userBudgetRequests = [], onAcceptQuote, onRateService, onAddNotification, showToast, initialSelectedRequestId }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showRatingReminder, setShowRatingReminder] = useState(null); // request object for reminder
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [acceptedRequests, setAcceptedRequests] = useState({}); // { requestId: acceptedQuoteId }
  // Estado para servicios: { requestId: { acceptedAt, postponedUntil, cancelled, rated } }
  const [serviceStatus, setServiceStatus] = useState({});

  // Calcular si ha pasado 1 semana desde la aceptación
  const shouldShowRatingReminder = (requestId) => {
    const status = serviceStatus[requestId];
    if (!status || status.cancelled || status.rated) return false;

    const acceptedAt = new Date(status.acceptedAt);
    const postponedUntil = status.postponedUntil ? new Date(status.postponedUntil) : null;
    const now = new Date();

    // Si está postponido, verificar si ya pasó el tiempo
    if (postponedUntil && now < postponedUntil) return false;

    // Mostrar recordatorio después de 7 días (para demo, usamos menos tiempo)
    const daysSinceAccepted = (now - acceptedAt) / (1000 * 60 * 60 * 24);
    return daysSinceAccepted >= 7; // En producción: 7 días
  };

  // Postponer recordatorio 1 semana más
  const handlePostponeRating = (requestId) => {
    const oneWeekLater = new Date();
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    setServiceStatus(prev => ({
      ...prev,
      [requestId]: { ...prev[requestId], postponedUntil: oneWeekLater.toISOString() }
    }));
    setShowRatingReminder(null);
  };

  // Marcar servicio como no realizado
  const handleCancelService = (requestId) => {
    setServiceStatus(prev => ({
      ...prev,
      [requestId]: { ...prev[requestId], cancelled: true }
    }));
    setShowRatingReminder(null);
  };

  // Marcar servicio como valorado
  const handleMarkRated = (requestId) => {
    setServiceStatus(prev => ({
      ...prev,
      [requestId]: { ...prev[requestId], rated: true }
    }));
  };

  // Calcular días restantes (máximo 3 días)
  const getDaysRemaining = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = (created.getTime() + 3 * 24 * 60 * 60 * 1000) - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getHoursRemaining = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = (created.getTime() + 3 * 24 * 60 * 60 * 1000) - now.getTime();
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    return Math.max(0, diffHours);
  };


  // Mapeo de iconos para las categorías de servicios
  const serviceCategoryIcons = {
    'albanil': 'Hammer',
    'carpintero': 'TreePine',
    'cerrajero': 'Key',
    'climatizacion': 'Snowflake',
    'electricista': 'Zap',
    'fontanero': 'Droplet',
    'jardineria': 'Flower2',
    'limpieza': 'Sparkles',
    'mudanzas': 'Truck',
    'pintor': 'Paintbrush',
    'reparacion': 'Smartphone',
    // Categorías antiguas para compatibilidad
    'plumbing': 'Droplet',
    'electrical': 'Lightbulb',
    'renovation': 'Hammer',
    'cleaning': 'Sparkles',
    'gardening': 'Flower2',
  };

  const serviceCategoryNames = {
    'albanil': 'Albañil y reformas',
    'carpintero': 'Carpintero',
    'cerrajero': 'Cerrajero',
    'climatizacion': 'Climatización y calefacción',
    'electricista': 'Electricista',
    'fontanero': 'Fontanero',
    'jardineria': 'Jardinería',
    'limpieza': 'Limpieza',
    'mudanzas': 'Mudanzas',
    'pintor': 'Pintor',
    'reparacion': 'Reparación de móviles y PC',
  };

  // Combinar y filtrar solicitudes (excluir las expiradas sin aceptar)
  const allRequestsRaw = [...userBudgetRequests.map(r => ({
    ...r,
    categoryName: r.categoryName || serviceCategoryNames[r.category] || 'Servicio',
    categoryIcon: r.categoryIcon || serviceCategoryIcons[r.category] || 'Wrench',
    urgencyLabel: r.urgency === 'urgent' ? 'Urgente' : r.urgency === 'this-week' ? 'Esta semana' : 'Próxima semana',
    status: (acceptedRequests[r.id] || r.status === 'accepted' || (r.responses || []).some(q => q.status === 'accepted'))
      ? 'accepted'
      : (r.responses && r.responses.length > 0) ? 'with-quotes' : 'pending',
    // Valoración y verificación reales del negocio (antes eran números aleatorios)
    quotes: (r.responses || []).map(resp => ({
      id: resp.id,
      businessId: resp.businessId,
      businessName: resp.businessName,
      price: resp.price,
      message: resp.message,
      phone: resp.phone,
      status: resp.status,
      rating: resp.rating,
      reviews: resp.reviews || 0,
      verified: !!resp.verified,
      respondedAt: resp.respondedAt,
    })),
    acceptedQuote: r.acceptedQuote || (r.responses || []).find(q => q.status === 'accepted') || null,
  }))];

  // Filtrar solicitudes expiradas (más de 3 días sin aceptar)
  const allRequests = allRequestsRaw.filter(r => {
    // Las aceptadas, completadas o valoradas siempre se muestran
    if (r.status === 'accepted' || r.status === 'completed' || r.status === 'rated') {
      return true;
    }
    // Las pendientes o con quotes se muestran solo si no han pasado 3 días
    const daysRemaining = getDaysRemaining(r.createdAt);
    return daysRemaining > 0;
  });

  // Restaurar la solicitud seleccionada si venimos de ver un perfil de empresa
  useEffect(() => {
    if (initialSelectedRequestId && !initialSelectionDone && allRequestsRaw.length > 0) {
      const request = allRequestsRaw.find(r => r.id === initialSelectedRequestId);
      if (request) {
        setSelectedRequest(request);
      }
      setInitialSelectionDone(true);
    }
  }, [initialSelectedRequestId, initialSelectionDone, allRequestsRaw]);

  const getStatusBadge = (status, quotesCount, createdAt) => {
    const daysRemaining = getDaysRemaining(createdAt);
    const hoursRemaining = getHoursRemaining(createdAt);

    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center gap-1">
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Esperando</span>
            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
              daysRemaining <= 1 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {daysRemaining > 1 ? `${daysRemaining}d` : hoursRemaining > 0 ? `${hoursRemaining}h` : 'Expira hoy'}
            </span>
          </div>
        );
      case 'with-quotes':
        return (
          <div className="flex items-center gap-1">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{quotesCount} presupuestos</span>
            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
              daysRemaining <= 1 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {daysRemaining > 1 ? `${daysRemaining}d` : hoursRemaining > 0 ? `${hoursRemaining}h` : 'Expira hoy'}
            </span>
          </div>
        );
      case 'accepted':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Aceptado</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">Completado</span>;
      case 'rated':
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">Valorado</span>;
      default:
        return null;
    }
  };

  const handleAcceptQuote = (requestId, quote, allQuotes) => {
    // Marcar como aceptado
    setAcceptedRequests(prev => ({ ...prev, [requestId]: quote.id }));

    // Guardar fecha de aceptación para el sistema de valoraciones
    setServiceStatus(prev => ({
      ...prev,
      [requestId]: {
        acceptedAt: new Date().toISOString(),
        acceptedQuote: quote,
        cancelled: false,
        rated: false,
        postponedUntil: null
      }
    }));

    // Obtener la solicitud actual
    const currentRequest = allRequests.find(r => r.id === requestId);

    // Notificación a la empresa aceptada
    if (onAddNotification) {
      onAddNotification({
        id: Date.now(),
        type: 'budget_accepted',
        title: '¡Tu presupuesto ha sido aceptado!',
        message: `El cliente ha aceptado tu presupuesto de ${quote.price}€ para "${currentRequest?.categoryName}". Ponte en contacto para coordinar el servicio.`,
        businessId: quote.businessId,
        businessName: quote.businessName,
        time: 'Ahora',
        is_read: false,
        icon: 'CheckCircle2',
        color: 'green',
      });

      // Notificaciones a las empresas no aceptadas
      allQuotes?.filter(q => q.id !== quote.id).forEach(rejectedQuote => {
        onAddNotification({
          id: Date.now() + rejectedQuote.id,
          type: 'budget_rejected',
          title: 'Presupuesto no seleccionado',
          message: `El cliente ha elegido otro profesional para "${currentRequest?.categoryName}". ¡Gracias por participar!`,
          businessId: rejectedQuote.businessId,
          businessName: rejectedQuote.businessName,
          time: 'Ahora',
          is_read: false,
          icon: 'X',
          color: 'gray',
        });
      });
    }

    // Callback
    if (onAcceptQuote) onAcceptQuote(requestId, quote);

    // Volver a la lista
    setSelectedRequest(null);

    // Mostrar confirmación con toast
    showToast(`¡Presupuesto aceptado! ${quote.businessName} ha sido notificada. Puedes contactarla por WhatsApp o teléfono.`, 'success');
  };

  const handleSubmitRating = () => {
    if (onRateService) {
      onRateService(selectedRequest.id, ratingValue, ratingComment);
    }
    setShowRatingModal(false);
    setSelectedRequest(null);
    setRatingValue(5);
    setRatingComment('');
  };

  const handleContactWhatsApp = (phone, businessName) => {
    const text = `Hola ${businessName}, te contacto por el presupuesto que me enviaste a través de Cornellà Local.`;
    window.open(`https://wa.me/34${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleCall = (phone) => {
    window.open(`tel:+34${phone}`, '_self');
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/95 backdrop-blur-sm p-4 z-20 sticky top-0 border-b border-gray-100">
        <button aria-label="Volver"
          onClick={() => selectedRequest ? setSelectedRequest(null) : onNavigate('profile')}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          {selectedRequest ? 'Presupuestos Recibidos' : 'Mis Presupuestos'}
        </h2>
      </div>

      {/* Lista de solicitudes */}
      {!selectedRequest && (
        <div className="p-4 pb-24 space-y-4">
          {allRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="text-gray-500" size={32} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Sin solicitudes</h3>
              <p className="text-sm text-gray-500 mb-4">Aún no has solicitado ningún presupuesto</p>
              <button
                onClick={() => onNavigate('budget-request')}
                className="px-6 py-3 bg-primary text-white font-bold rounded-xl"
              >
                Solicitar presupuesto
              </button>
            </div>
          ) : (
            allRequests.map(request => (
              <div
                key={request.id}
                onClick={() => (request.status === 'with-quotes' || request.status === 'completed' || request.status === 'accepted' || acceptedRequests[request.id]) ? setSelectedRequest(request) : null}
                className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm ${
                  (request.status === 'with-quotes' || request.status === 'completed' || request.status === 'accepted' || acceptedRequests[request.id]) ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    request.status === 'pending' ? 'bg-amber-100' :
                    request.status === 'with-quotes' ? 'bg-blue-100' :
                    request.status === 'accepted' ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    <Icon name={request.categoryIcon} size={24} className={
                      request.status === 'pending' ? 'text-amber-600' :
                      request.status === 'with-quotes' ? 'text-blue-600' :
                      request.status === 'accepted' ? 'text-green-600' : 'text-purple-600'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-bold text-slate-900">{request.categoryName}</h4>
                      {getStatusBadge(request.status, request.quotes?.length, request.createdAt)}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{request.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className={`flex items-center gap-1 ${
                        request.urgency === 'urgent' ? 'text-red-500' :
                        request.urgency === 'this-week' ? 'text-amber-500' : 'text-green-500'
                      }`}>
                        <Clock size={12} />
                        {request.urgencyLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {request.address?.split(',')[0]}
                      </span>
                    </div>
                  </div>
                  {(request.status === 'with-quotes' || request.status === 'completed' || request.status === 'accepted' || acceptedRequests[request.id]) && (
                    <ChevronRight className="text-gray-500 shrink-0" size={20} />
                  )}
                </div>

                {/* Accepted quote info */}
                {request.status === 'accepted' && request.acceptedQuote && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{request.acceptedQuote.businessName}</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(request.acceptedQuote.price, false)}</p>
                      </div>
                      <div className="flex gap-2">
                        {/* Botón valorar si needsRating y no está valorado ni cancelado */}
                        {request.needsRating && !serviceStatus[request.id]?.rated && !serviceStatus[request.id]?.cancelled && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowRatingReminder({
                                ...request,
                                acceptedQuote: request.acceptedQuote
                              });
                            }}
                            className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1 hover:bg-amber-200 transition-colors animate-pulse-soft"
                          >
                            <Star size={12} />
                            Valorar
                          </button>
                        )}
                        {serviceStatus[request.id]?.rated && (
                          <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                            <Check size={12} />
                            Valorado
                          </span>
                        )}
                        {serviceStatus[request.id]?.cancelled && (
                          <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                            No realizado
                          </span>
                        )}
                        <button aria-label="WhatsApp"
                          onClick={(e) => { e.stopPropagation(); handleContactWhatsApp(request.acceptedQuote.phone, request.acceptedQuote.businessName); }}
                          className="w-10 h-10 bg-green-700 text-white rounded-full flex items-center justify-center hover:bg-green-800"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button aria-label="Llamar"
                          onClick={(e) => { e.stopPropagation(); handleCall(request.acceptedQuote.phone); }}
                          className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-blue-700"
                        >
                          <Phone size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rating reminder for completed */}
                {request.status === 'completed' && request.needsRating && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); setShowRatingModal(true); }}
                      className="w-full py-2 bg-amber-100 text-amber-700 font-medium rounded-lg flex items-center justify-center gap-2"
                    >
                      <Star size={16} />
                      Valorar servicio
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Botón nueva solicitud */}
          {allRequests.length > 0 && (
            <button
              onClick={() => onNavigate('budget-request')}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-medium flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
            >
              <Plus size={20} />
              Nueva solicitud
            </button>
          )}
        </div>
      )}

      {/* Detalle de presupuestos recibidos */}
      {selectedRequest && !showRatingModal && (
        <div className="p-4 pb-24 space-y-4">
          {/* Aviso de tiempo restante */}
          {!acceptedRequests[selectedRequest.id] && selectedRequest.status !== 'accepted' && (
            <div className={`rounded-xl p-3 flex items-center gap-3 ${
              getDaysRemaining(selectedRequest.createdAt) <= 1
                ? 'bg-red-50 border border-red-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <Timer className={getDaysRemaining(selectedRequest.createdAt) <= 1 ? 'text-red-500' : 'text-amber-500'} size={20} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${getDaysRemaining(selectedRequest.createdAt) <= 1 ? 'text-red-700' : 'text-amber-700'}`}>
                  {getDaysRemaining(selectedRequest.createdAt) > 1
                    ? `Tienes ${getDaysRemaining(selectedRequest.createdAt)} días para elegir`
                    : getHoursRemaining(selectedRequest.createdAt) > 0
                      ? `Solo quedan ${getHoursRemaining(selectedRequest.createdAt)} horas`
                      : 'Esta solicitud expira hoy'
                  }
                </p>
                <p className="text-xs text-gray-500">Debes aceptar un presupuesto antes de que expire</p>
              </div>
            </div>
          )}

          {/* Request summary */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Icon name={selectedRequest.categoryIcon} size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">{selectedRequest.categoryName}</h4>
                <p className="text-xs text-gray-500">{selectedRequest.urgencyLabel}</p>
              </div>
              {(acceptedRequests[selectedRequest.id] || selectedRequest.acceptedQuote) && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Aceptado</span>
              )}
            </div>
            <p className="text-sm text-gray-600">{selectedRequest.description}</p>
          </div>

          {/* Presupuesto aceptado - Mostrar detalles completos */}
          {(() => {
            const acceptedQuote = selectedRequest.acceptedQuote ||
              (acceptedRequests[selectedRequest.id] && selectedRequest.quotes?.find(q => q.id === acceptedRequests[selectedRequest.id]));

            if (acceptedQuote) {
              return (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="text-green-600" size={24} />
                    <h3 className="font-bold text-green-800 text-lg">Presupuesto Aceptado</h3>
                  </div>

                  {/* Info de la empresa */}
                  <div className="bg-white rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-xl font-bold text-primary">
                        {getInitials(acceptedQuote.businessName || 'Empresa')}
                      </div>
                      <div className="flex-1">
                        <button
                          onClick={() => acceptedQuote.businessId && onNavigate('business', { id: acceptedQuote.businessId })}
                          className="font-bold text-lg text-slate-900 hover:text-primary transition-colors text-left"
                        >
                          {acceptedQuote.businessName}
                        </button>
                        {acceptedQuote.reviews > 0 && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Star className="text-yellow-500 fill-yellow-500" size={14} />
                            <span>{Number(acceptedQuote.rating || 0).toFixed(1)}</span>
                            <span>({acceptedQuote.reviews} {acceptedQuote.reviews === 1 ? 'reseña' : 'reseñas'})</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">{formatCurrency(acceptedQuote.price, false)}</p>
                      </div>
                    </div>

                    {/* Mensaje del profesional */}
                    {acceptedQuote.message && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-600 italic">"{acceptedQuote.message}"</p>
                      </div>
                    )}

                    {/* Datos de contacto */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-700">
                        <Phone size={18} className="text-green-600" />
                        <span className="font-medium">{acceptedQuote.phone}</span>
                      </div>
                      {selectedRequest.address && (
                        <div className="flex items-center gap-3 text-gray-700">
                          <MapPin size={18} className="text-green-600" />
                          <span>{selectedRequest.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de contacto */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleContactWhatsApp(acceptedQuote.phone, acceptedQuote.businessName)}
                      className="flex-1 h-12 bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-800 transition-colors"
                    >
                      <MessageCircle size={20} />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleCall(acceptedQuote.phone)}
                      className="flex-1 h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                      <Phone size={20} />
                      Llamar
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Quotes list - Solo mostrar si no hay presupuesto aceptado o hay más quotes */}
          {(!acceptedRequests[selectedRequest.id] && !selectedRequest.acceptedQuote) && (
            <>
              <h3 className="font-bold text-slate-900 px-1">
                {selectedRequest.quotes?.length || 0} presupuestos recibidos
              </h3>
            </>
          )}

          {(acceptedRequests[selectedRequest.id] || selectedRequest.acceptedQuote) && selectedRequest.quotes?.length > 1 && (
            <h3 className="font-bold text-slate-900 px-1">
              Otros presupuestos recibidos
            </h3>
          )}

          {(() => {
            // Filtrar quotes (excluir aceptado si existe)
            const acceptedQuoteId = acceptedRequests[selectedRequest.id] ||
                                    (selectedRequest.acceptedQuote && selectedRequest.acceptedQuote.id);
            const filteredQuotes = (selectedRequest.quotes || []).filter((quote) => {
              if (acceptedQuoteId) {
                return quote.id !== acceptedQuoteId;
              }
              return true;
            });

            // Calcular mejor precio (más barato)
            const cheapestQuote = filteredQuotes.length > 0
              ? filteredQuotes.reduce((min, q) => q.price < min.price ? q : min)
              : null;

            // Calcular mejor valorado con Bayesian Average
            // Formula: (C × 4.0 + rating × reviews) / (C + reviews)
            // C = 10 (confianza mínima)
            const calculateWeightedRating = (quote) => {
              const C = 10;
              const m = 4.0; // rating promedio global
              const R = quote.rating || 4.0;
              const v = quote.reviews || 0;
              return (C * m + R * v) / (C + v);
            };

            const bestRatedQuote = filteredQuotes.length > 0
              ? filteredQuotes.reduce((best, q) =>
                  calculateWeightedRating(q) > calculateWeightedRating(best) ? q : best
                )
              : null;

            // Ordenar: Top 2 primero, luego el resto por llegada
            const sortedQuotes = [...filteredQuotes].sort((a, b) => {
              const isACheapest = cheapestQuote && a.id === cheapestQuote.id;
              const isBCheapest = cheapestQuote && b.id === cheapestQuote.id;
              const isABestRated = bestRatedQuote && a.id === bestRatedQuote.id;
              const isBBestRated = bestRatedQuote && b.id === bestRatedQuote.id;

              // Más barato siempre primero
              if (isACheapest) return -1;
              if (isBCheapest) return 1;

              // Mejor valorado segundo
              if (isABestRated) return -1;
              if (isBBestRated) return 1;

              // Resto por índice original (orden de llegada)
              return 0;
            });

            return sortedQuotes.map((quote, index) => {
            const isAccepted = acceptedRequests[selectedRequest.id] === quote.id;
            const hasAcceptedAnother = acceptedRequests[selectedRequest.id] && acceptedRequests[selectedRequest.id] !== quote.id;

            return (
              <div key={quote.id} className={`bg-white rounded-2xl p-4 border shadow-sm ${
                isAccepted ? 'border-green-300 bg-green-50' :
                hasAcceptedAnother ? 'border-gray-200 opacity-50' : 'border-gray-100'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => quote.businessId && onNavigate('business', { id: quote.businessId, returnTo: 'my-budget-requests', returnParams: { selectedRequestId: selectedRequest.id } })}
                      className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {getInitials(quote.businessName)}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => quote.businessId && onNavigate('business', { id: quote.businessId, returnTo: 'my-budget-requests', returnParams: { selectedRequestId: selectedRequest.id } })}
                          className="font-bold text-slate-900 hover:text-primary transition-colors text-left"
                        >
                          {quote.businessName}
                        </button>
                        {quote.verified && <BadgeCheck className="text-primary fill-primary" size={16} />}
                        {isAccepted && <span className="px-2 py-0.5 bg-green-700 text-white text-[10px] font-bold rounded-full">ELEGIDO</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {quote.reviews > 0 ? (
                          <>
                            <Star className="text-yellow-500 fill-yellow-500" size={12} />
                            <span>{Number(quote.rating || 0).toFixed(1)}</span>
                            <span>({quote.reviews} {quote.reviews === 1 ? 'reseña' : 'reseñas'})</span>
                          </>
                        ) : (
                          <span>Sin reseñas todavía</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-2xl font-bold text-primary">{formatCurrency(quote.price, false)}</p>
                      {!acceptedRequests[selectedRequest.id] && cheapestQuote && quote.id === cheapestQuote.id && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                          💰 Mejor precio
                        </span>
                      )}
                      {!acceptedRequests[selectedRequest.id] && bestRatedQuote && quote.id === bestRatedQuote.id && quote.id !== cheapestQuote?.id && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full">
                          ⭐ Mejor valorado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-xl">{quote.message}</p>

                {/* Info extra cuando está aceptado */}
                {isAccepted && (
                  <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
                      <Check size={16} />
                      Información de contacto
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone size={14} className="text-green-600" />
                        <span className="font-medium">{quote.phone}</span>
                      </div>
                      {selectedRequest.address && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin size={14} className="text-green-600" />
                          <span>{selectedRequest.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-700">
                        <Tag size={14} className="text-green-600" />
                        <span>Presupuesto aceptado: <strong>{formatCurrency(quote.price, false)}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {isAccepted && (
                    <>
                      <button
                        onClick={() => handleContactWhatsApp(quote.phone, quote.businessName)}
                        className="flex-1 h-11 bg-green-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-green-800"
                      >
                        <MessageCircle size={18} />
                        WhatsApp
                      </button>
                      <button aria-label="Llamar"
                        onClick={() => handleCall(quote.phone)}
                        className="w-11 h-11 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center hover:bg-gray-200"
                      >
                        <Phone size={18} />
                      </button>
                    </>
                  )}
                  {!acceptedRequests[selectedRequest.id] ? (
                    <button
                      onClick={() => handleAcceptQuote(selectedRequest.id, quote, selectedRequest.quotes)}
                      className="flex-1 h-11 bg-primary text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700"
                    >
                      <Check size={18} />
                      Aceptar
                    </button>
                  ) : isAccepted ? (
                    <div className="flex-1 h-11 bg-green-100 text-green-700 font-medium rounded-xl flex items-center justify-center gap-2">
                      <Check size={18} />
                      Aceptado
                    </div>
                  ) : (
                    <div className="flex-1 h-11 bg-gray-200 text-gray-500 font-medium rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                      No elegido
                    </div>
                  )}
                </div>
              </div>
            );
          });
          })()}

          {selectedRequest.quotes?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="mx-auto mb-2 text-gray-500" size={32} />
              <p>Esperando presupuestos...</p>
            </div>
          )}
        </div>
      )}

      {/* Rating Reminder Modal - Después de 1 semana */}
      {showRatingReminder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden animate-scaleIn">
            {/* Header con imagen */}
            <div className="bg-gradient-to-br from-primary to-blue-600 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-1">¿Qué tal fue el servicio?</h3>
              <p className="text-white/80 text-sm">
                Ha pasado 1 semana desde que {showRatingReminder.acceptedQuote?.businessName || 'el profesional'} realizó el trabajo
              </p>
            </div>

            {/* Info del servicio */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Icon name={showRatingReminder.categoryIcon || 'Wrench'} size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{showRatingReminder.categoryName}</p>
                  <p className="text-sm text-gray-500">{serviceStatus[showRatingReminder.id]?.acceptedQuote?.price}€</p>
                </div>
              </div>
            </div>

            {/* Opciones */}
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  setShowRatingReminder(null);
                  setSelectedRequest(showRatingReminder);
                  setShowRatingModal(true);
                }}
                className="w-full h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"
              >
                <Star size={18} />
                Valorar ahora
              </button>

              <button
                onClick={() => handlePostponeRating(showRatingReminder.id)}
                className="w-full h-12 bg-amber-100 text-amber-700 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-amber-200 transition-colors"
              >
                <Clock size={18} />
                Recordarme en 1 semana
              </button>

              <button
                onClick={() => handleCancelService(showRatingReminder.id)}
                className="w-full h-12 bg-gray-100 text-gray-600 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
              >
                <X size={18} />
                No se hizo el trabajo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slideUp">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">¿Cómo fue el servicio?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Tu opinión ayuda a otros usuarios</p>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    size={36}
                    className={`transition-colors ${star <= ratingValue ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Cuéntanos tu experiencia (opcional)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowRatingModal(false); setSelectedRequest(null); }}
                className="flex-1 h-12 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleSubmitRating();
                  if (selectedRequest) handleMarkRated(selectedRequest.id);
                }}
                className="flex-1 h-12 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Enviar valoración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};











// =============================================
// HOOK: useCookieConsent — escucha cambios del banner
// =============================================
const useCookieConsent = () => {
  const [consent, setConsent] = useState(() => localStorage.getItem('cookie-consent'));
  useEffect(() => {
    const handler = () => setConsent(localStorage.getItem('cookie-consent'));
    window.addEventListener('cookie-consent-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('cookie-consent-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return consent;
};

// =============================================
// COMPONENTE: Google Maps embed con click-to-load
// =============================================
// Google Maps instala cookies propias (NID, etc.) en cuanto se carga el
// iframe. Para cumplir RGPD lo cargamos solo si el user ha aceptado todas
// las cookies. Si no, mostramos un placeholder con consentimiento explícito.
const ConsentedMapEmbed = ({ address }) => {
  const consent = useCookieConsent();
  const [overrideLoad, setOverrideLoad] = useState(false);
  const shouldLoad = consent === 'all' || overrideLoad;

  if (shouldLoad) {
    return (
      <iframe
        title="Mapa ubicación"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=16`}
      />
    );
  }

  return (
    <button
      onClick={() => setOverrideLoad(true)}
      className="w-full h-full bg-gray-100 hover:bg-gray-200 transition-colors flex flex-col items-center justify-center gap-2 p-4 text-center"
    >
      <Icon name="MapPin" size={32} className="text-primary" />
      <p className="text-sm font-semibold text-slate-700">Mostrar mapa</p>
      <p className="text-xs text-gray-500 leading-relaxed">
        Cargar el mapa instalará cookies propias de Google.
        <br />
        Toca para cargarlo solo esta vez.
      </p>
    </button>
  );
};

// =============================================
// BANNER DE COOKIES (RGPD/AEPD compliant)
// =============================================
// 3 opciones igualmente visibles: Rechazar / Configurar / Aceptar todas.
// Rechazar y Aceptar tienen el MISMO peso visual (exigencia AEPD 2023).
// =============================================
const CookieBanner = ({ onNavigate }) => {
  const readVisible = () => {
    try { return !localStorage.getItem('cookie-consent'); } catch { return true; }
  };
  const [visible, setVisible] = useState(readVisible);

  // Si el usuario borra su elección (Ajustes o Política de cookies), el aviso vuelve a salir
  useEffect(() => {
    const handler = () => setVisible(readVisible());
    window.addEventListener('cookie-consent-changed', handler);
    return () => window.removeEventListener('cookie-consent-changed', handler);
  }, []);

  if (!visible) return null;

  const setConsent = (value) => {
    try { localStorage.setItem('cookie-consent', value); } catch { /* sin almacenamiento */ }
    // Forzar re-render de toda la app para que componentes condicionales
    // (Analytics, Google Maps embed) reaccionen al consentimiento
    setVisible(false);
    window.dispatchEvent(new Event('cookie-consent-changed'));
  };

  return (
    <div role="region" aria-label="Aviso de cookies" className="fixed bottom-0 inset-x-0 z-[100] mx-auto max-w-md p-3">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icon name="Cookie" size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900 mb-1">Cookies y privacidad</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Usamos solo lo imprescindible para que la app funcione. Si aceptas todas,
              también activamos analítica anónima y los mapas de Google se cargan automáticamente.
              {' '}
              <button
                onClick={() => onNavigate('cookies-policy')}
                className="text-primary font-medium underline"
              >
                Más información
              </button>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setConsent('rejected')}
            className="h-10 bg-white border border-gray-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={() => setConsent('all')}
            className="h-10 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
};

// Pantalla de Contacto y Soporte
const ContactSupportScreen = ({ onNavigate, showToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const contactOptions = [
    { icon: 'Mail', label: 'Email', value: 'cornellalocal@gmail.com', action: 'mailto:cornellalocal@gmail.com' },
    { icon: 'Clock', label: 'Horario', value: 'Lun-Vie 9:00-18:00', action: null },
  ];

  const faqItems = [
    { q: '¿Cómo puedo registrar mi negocio?', a: 'Ve a tu perfil > "¿Tienes un negocio?" y sigue los pasos de verificación.' },
    { q: '¿Las ofertas tienen coste?', a: 'Publicar ofertas es gratuito para comercios verificados de Cornellà.' },
    { q: '¿Cómo solicito un presupuesto?', a: 'Desde el menú principal, selecciona "Solicitar presupuesto" y elige la categoría.' },
    { q: '¿Cómo elimino mi cuenta?', a: 'En Ajustes > "Borrar mi cuenta". Se borra al momento con todos tus datos. Antes puedes guardar una copia con "Descargar mis datos".' },
  ];

  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message) {
      if (showToast) showToast('Por favor completa todos los campos obligatorios', 'error');
      return;
    }
    setSending(true);
    const { error } = await supabase.from('support_requests').insert({
      name: formData.name.trim(),
      email: formData.email.trim(),
      subject: formData.subject.trim() || 'Sin asunto',
      message: formData.message.trim(),
    });
    setSending(false);
    if (error) {
      if (showToast) showToast('Error al enviar el mensaje. Inténtalo de nuevo.', 'error');
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-lg w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-white" size={44} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">¡Mensaje enviado!</h2>
          <p className="text-gray-500 mb-6">
            Hemos recibido tu consulta. Te responderemos en un plazo de 24-48 horas.
          </p>
          <button
            onClick={() => onNavigate('settings')}
            className="w-full h-14 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Volver a Ajustes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center bg-white px-4 py-4 border-b border-gray-100">
        <button aria-label="Volver"
          onClick={() => onNavigate('settings')}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-900 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          Contacto y Soporte
        </h2>
      </div>

      <div className="pb-8">
        {/* Contact Options */}
        <div className="p-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Phone size={18} className="text-primary" />
              Contacto directo
            </h3>
            <div className="space-y-3">
              {contactOptions.map((option, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Icon name={option.icon} size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">{option.label}</p>
                    {option.action ? (
                      <a href={option.action} className="text-sm font-semibold text-primary">
                        {option.value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">{option.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="p-4 pt-0">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <HelpCircle size={18} className="text-primary" />
              Preguntas frecuentes
            </h3>
            <div className="space-y-3">
              {faqItems.map((item, idx) => (
                <details key={idx} className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-2 text-sm font-medium text-slate-800 hover:text-primary transition-colors">
                    {item.q}
                    <ChevronDown size={16} className="text-gray-500 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="text-sm text-gray-500 pb-2 pl-0">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="p-4 pt-0">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              Envíanos un mensaje
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input aria-label="Nombre"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                <input aria-label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Asunto</label>
                <select aria-label="Asunto"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                >
                  <option value="">Selecciona un asunto</option>
                  <option value="general">Consulta general</option>
                  <option value="technical">Problema técnico</option>
                  <option value="business">Registro de negocio</option>
                  <option value="suggestion">Sugerencia</option>
                  <option value="complaint">Reclamación</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje *</label>
                <textarea aria-label="Mensaje"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="Describe tu consulta..."
                />
              </div>
              <button
                onClick={handleSubmit}
                className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Enviar mensaje
              </button>
              <p className="text-xs text-gray-500 leading-relaxed">
                Usaremos tu nombre y tu email solo para responderte. El mensaje se borra a los 12 meses.{' '}
                <button type="button" onClick={() => onNavigate('privacy-policy')} className="text-primary font-semibold underline">
                  Política de privacidad
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pantalla de Notificaciones
const NotificationsScreen = ({ onNavigate, dynamicNotifications = [], user, onUpdateNotifications, showToast }) => {
  // Solo usamos notificaciones dinámicas de Supabase (no mockData)
  const [notificationsState, setNotificationsState] = useState(dynamicNotifications);

  // Sincronizar cuando cambien las notificaciones del padre
  useEffect(() => {
    setNotificationsState(dynamicNotifications);
  }, [dynamicNotifications]);

  const unreadCount = notificationsState.filter(n => !n.isRead).length;

  // Al pulsar una notificación ya se ha "visto": se quita al momento de la lista y del contador
  // y se borra de la base de datos. Si el borrado falla, se vuelve a mostrar.
  const removeNotification = async (notification) => {
    const id = notification.id;
    const withoutIt = prev => prev.filter(n => n.id !== id);
    setNotificationsState(withoutIt);
    if (onUpdateNotifications) onUpdateNotifications(withoutIt);

    // Los avisos creados solo en pantalla (p. ej. "Presupuesto enviado") llevan isLocal y no están en la
    // base de datos. Los demás se borran de verdad (notifications.id es un número, no un UUID: antes se
    // comprobaba que fuera UUID y nunca se borraban, así que al volver a abrir la app reaparecían).
    if (!user?.id || notification.isLocal || id === undefined || id === null) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (error) {
      console.error('Error borrando la notificación:', error);
      const restore = prev => (prev.some(n => n.id === id) ? prev : [notification, ...prev]);
      setNotificationsState(restore);
      if (onUpdateNotifications) onUpdateNotifications(restore);
      if (showToast) showToast('No se pudo borrar la notificación', 'error');
    }
  };

  const deleteReadNotifications = async () => {
    // Backup para revertir si Supabase falla
    const beforeDelete = notificationsState;

    // Optimistic: eliminar leídas de state local y padre
    const withoutRead = beforeDelete.filter(n => !n.isRead);
    setNotificationsState(withoutRead);
    if (onUpdateNotifications) onUpdateNotifications(withoutRead);

    // Persistir en Supabase
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id)
          .eq('is_read', true);

        if (error) throw error;
      } catch (error) {
        console.error('Error borrando notificaciones leídas:', error);
        // Revertir UI para no engañar al usuario
        setNotificationsState(beforeDelete);
        if (onUpdateNotifications) onUpdateNotifications(beforeDelete);
        if (showToast) showToast('No se pudieron borrar las notificaciones', 'error');
      }
    }
  };

  const handleNotificationClick = (notification) => {
    removeNotification(notification);
    if (notification.actionRoute) {
      onNavigate(notification.actionRoute, notification.actionParams || {});
    }
  };

  const getTimeColor = (time) => {
    if (time.includes('min') || time.includes('hora')) return 'text-primary';
    return 'text-gray-500';
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center bg-white/95 backdrop-blur-md px-4 py-4 border-b border-gray-100 justify-between">
        <button aria-label="Volver"
          onClick={() => onNavigate('home')}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">
            Notificaciones
          </h2>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500">{unreadCount} sin leer</p>
          )}
        </div>
        <button
          onClick={deleteReadNotifications}
          className="text-red-500 text-sm font-medium hover:text-red-700 transition-colors px-2 disabled:opacity-0"
          disabled={notificationsState.filter(n => n.isRead).length === 0}
        >
          Borrar leídas
        </button>
      </header>

      {/* Notifications List */}
      <div className="flex-1 pb-8">
        {notificationsState.length === 0 ? (
          <EmptyState
            icon="Bell"
            title="Todo al día"
            description="No tienes notificaciones pendientes. Te avisaremos cuando haya novedades."
            color="blue"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Unread Section */}
            {unreadCount > 0 && (
              <>
                <div className="px-4 py-3 bg-gray-50">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nuevas</h3>
                </div>
                {notificationsState.filter(n => !n.isRead).map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full flex items-start gap-4 p-4 bg-blue-50/50 hover:bg-blue-50 transition-colors text-left relative"
                  >
                    {/* Unread indicator */}
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />

                    {/* Icon */}
                    <div className={`shrink-0 w-12 h-12 rounded-full ${notification.iconBg} flex items-center justify-center text-white shadow-sm`}>
                      <Icon name={notification.icon} size={22} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {notification.title}
                        </h4>
                        <span className={`text-xs font-medium shrink-0 ${getTimeColor(notification.time)}`}>
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="text-gray-500 shrink-0 mt-3" size={18} />
                  </button>
                ))}
              </>
            )}

            {/* Read Section */}
            {notificationsState.filter(n => n.isRead).length > 0 && (
              <>
                <div className="px-4 py-3 bg-gray-50">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Anteriores</h3>
                </div>
                {notificationsState.filter(n => n.isRead).map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full flex items-start gap-4 p-4 bg-white hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Icon */}
                    <div className={`shrink-0 w-12 h-12 rounded-full ${notification.iconBg} opacity-60 flex items-center justify-center text-white shadow-sm`}>
                      <Icon name={notification.icon} size={22} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-700 leading-tight">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500 shrink-0">
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="text-gray-300 shrink-0 mt-3" size={18} />
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};




// Pantalla de Registro Completado
const RegistrationSuccessScreen = ({ onNavigate }) => {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-center bg-white px-4 py-4 border-b border-gray-100">
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">
          Registro
        </h2>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 pt-8">
        {/* Success Card */}
        <div className="w-full bg-gradient-to-br from-teal-600 to-teal-700 rounded-3xl p-8 mb-8 flex flex-col items-center shadow-xl">
          <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Check className="text-orange-400" size={56} strokeWidth={3} />
          </div>
          <h1 className="text-white text-2xl font-bold text-center mb-3">
            ¡Solicitud Enviada!
          </h1>
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
            <CircleDot className="text-white" size={16} />
            <span className="text-white text-sm font-medium">En revisión</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-center text-base leading-relaxed mb-8 max-w-xs">
          Estamos revisando tus datos. En menos de 24h podrás empezar a gestionar tu perfil.
          Mientras tanto, puedes ver cómo funcionará tu panel.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => onNavigate('profile')}
          className="w-full h-14 rounded-xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/25 hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          Ir a mi perfil
        </button>

        {/* Secondary Link */}
        <button
          onClick={() => onNavigate('home')}
          className="mt-4 text-gray-500 text-sm font-medium hover:text-primary transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

// Servicios disponibles por subcategoría
const servicesBySubcategory = {
  // Ferreterías
  603: [
    { id: 'delivery', name: 'Envío a domicilio', icon: 'Truck' },
    { id: 'keys', name: 'Duplicado de llaves', icon: 'Key' },
    { id: 'paint', name: 'Mezcla de pinturas', icon: 'Paintbrush' },
    { id: 'tools', name: 'Alquiler herramientas', icon: 'Hammer' },
    { id: 'advice', name: 'Asesoramiento técnico', icon: 'HelpCircle' },
  ],
  // Restaurantes
  101: [
    { id: 'delivery', name: 'Envío a domicilio', icon: 'Truck' },
    { id: 'takeaway', name: 'Para llevar', icon: 'ShoppingBag' },
    { id: 'reservation', name: 'Reservas online', icon: 'Calendar' },
    { id: 'terrace', name: 'Terraza', icon: 'Armchair' },
    { id: 'wifi', name: 'WiFi gratis', icon: 'Globe' },
  ],
  // Peluquerías
  401: [
    { id: 'appointment', name: 'Cita previa', icon: 'Calendar' },
    { id: 'walkin', name: 'Sin cita', icon: 'Users' },
    { id: 'products', name: 'Venta de productos', icon: 'ShoppingBag' },
    { id: 'beard', name: 'Barbería', icon: 'Scissors' },
    { id: 'color', name: 'Coloración', icon: 'Paintbrush' },
  ],
  // Default services for other subcategories
  default: [
    { id: 'delivery', name: 'Envío a domicilio', icon: 'Truck' },
    { id: 'card', name: 'Pago con tarjeta', icon: 'CreditCard' },
    { id: 'parking', name: 'Parking cercano', icon: 'Car' },
    { id: 'wifi', name: 'WiFi gratis', icon: 'Globe' },
    { id: 'accessible', name: 'Accesible', icon: 'Users' },
  ],
};






// ==============================================
// PANTALLAS DE AUTENTICACIÓN
// ==============================================

// Pantalla de Login
const LoginScreen = ({ onNavigate, setUser }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) setError('Error al iniciar sesión con Google. Inténtalo de nuevo.');
  };

  const handleAppleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin }
    });
    if (error) setError('Error al iniciar sesión con Apple. Inténtalo de nuevo.');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Timeout de seguridad (60 segundos para móviles con conexión lenta)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 60000);
    });

    try {

      // Login con Supabase Auth con timeout
      const loginPromise = supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      const { data: authData, error: authError } = await Promise.race([loginPromise, timeoutPromise]);

      if (authError) {
        throw authError;
      }


      // Cargar perfil del usuario
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('Error al cargar perfil del usuario');
      }

      setUser(userData);
      onNavigate('home');
    } catch (error) {
      if (error.message === 'TIMEOUT') {
        setError('El servidor tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.');
      } else if (error.message === 'Invalid login credentials') {
        setError('Email o contraseña incorrectos');
      } else {
        setError('Error al iniciar sesión. Por favor, intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 font-display min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white rounded-xl shadow-soft p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <img
            src="/favicon.png"
            alt="CornellaLocal"
            className="w-20 h-20 rounded-2xl shadow-sm mb-2"
          />
          <h1 className="text-slate-900 tracking-tight text-[28px] font-bold leading-tight px-4 pb-1">
            Bienvenido a CornellaLocal
          </h1>
          <p className="text-gray-500 text-base font-normal leading-normal px-4">
            Tu comercio local, más cerca
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-5 w-full mt-2" onSubmit={handleLogin}>
          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-slate-900 text-sm font-semibold ml-1">Email</label>
            <input aria-label="Email"
              className="form-input flex w-full rounded-lg text-slate-900 border-0 bg-gray-100 focus:ring-2 focus:ring-primary/20 h-14 placeholder:text-gray-500 p-4 text-base font-normal transition-all"
              placeholder="ejemplo@correo.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-slate-900 text-sm font-semibold ml-1">Contraseña</label>
            <div className="flex w-full items-stretch rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
              <input aria-label="Contraseña"
                className="form-input flex w-full min-w-0 flex-1 resize-none border-0 bg-transparent text-slate-900 focus:outline-0 focus:ring-0 h-14 placeholder:text-gray-500 p-4 pr-2 text-base font-normal"
                placeholder="********"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button aria-label="Mostrar u ocultar contraseña"
                className="flex items-center justify-center px-4 text-gray-500 hover:text-primary transition-colors cursor-pointer bg-transparent border-none"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end -mt-1">
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="text-primary hover:text-blue-700 text-sm font-medium transition-colors"
            >
              Olvidé mi contraseña
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-primary hover:bg-blue-700 text-white font-bold h-14 rounded-lg shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 mt-2 flex items-center justify-center text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión... (puede tardar hasta 1 min)' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Social Login */}
        <div className="flex flex-col gap-6 pt-2">
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm font-medium">O continúa con</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>
          {/* Google - ancho completo y centrado */}
          <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 h-12 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-slate-900 font-semibold text-sm">Continuar con Google</span>
          </button>
          <p className="text-center text-xs text-gray-500 leading-relaxed">
            Si es tu primera vez, al continuar con Google confirmas que tienes 14 años o más y aceptas los{' '}
            <button type="button" onClick={() => onNavigate('terms')} className="text-primary font-semibold hover:underline">términos</button>.
            Tratamos tus datos según la{' '}
            <button type="button" onClick={() => onNavigate('privacy-policy')} className="text-primary font-semibold hover:underline">política de privacidad</button>.
          </p>
        </div>

        {/* Register link */}
        <div className="text-center pt-4 flex flex-col gap-3">
          <p className="text-gray-500 text-sm">
            ¿No tienes cuenta?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-primary font-semibold hover:underline"
            >
              Regístrate
            </button>
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="text-sm font-medium text-gray-500 hover:text-primary transition-colors"
          >
            Explorar comercios sin cuenta →
          </button>
        </div>

        {/* Footer legal — accesible sin login (LSSI-CE / RGPD) */}
        <div className="pt-6 pb-2 border-t border-gray-100 mt-4">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <button onClick={() => onNavigate('legal-notice')} className="hover:text-primary hover:underline">Aviso legal</button>
            <span>·</span>
            <button onClick={() => onNavigate('privacy-policy')} className="hover:text-primary hover:underline">Privacidad</button>
            <span>·</span>
            <button onClick={() => onNavigate('cookies-policy')} className="hover:text-primary hover:underline">Cookies</button>
            <span>·</span>
            <button onClick={() => onNavigate('terms')} className="hover:text-primary hover:underline">Términos</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pantalla de Registro
const RegisterScreen = ({ onNavigate }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleGoogleSignup = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) setError('No se pudo continuar con Google. Inténtalo de nuevo.');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError('Para crear la cuenta confirma que tienes 14 años o más y aceptas los términos');
      setLoading(false);
      return;
    }

    // Timeout de seguridad (60 segundos para móviles con conexión lenta)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 60000);
    });

    try {

      // Registrar usuario en Supabase Auth con timeout
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      const { data, error } = await Promise.race([signUpPromise, timeoutPromise]);

      if (error) {
        throw error;
      }


      // El perfil se crea automáticamente con el trigger handle_new_user
      // Solo mostrar éxito
      setSuccess(true);

      // Si el email no requiere confirmación, redirigir automáticamente
      if (data.session) {
        setTimeout(() => {
          onNavigate('home');
        }, 2000);
      }
    } catch (error) {

      if (error.message === 'TIMEOUT') {
        setError('El servidor tardó demasiado en responder. El usuario puede haberse creado correctamente. Intenta iniciar sesión.');
        // Mostrar success de todas formas
        setTimeout(() => {
          setSuccess(true);
        }, 2000);
      } else if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        setError('Este email ya está registrado. Intenta iniciar sesión.');
      } else if (error.message.includes('Password')) {
        setError('La contraseña debe tener al menos 8 caracteres');
      } else if (error.message.includes('Email')) {
        setError('Email inválido. Por favor verifica el formato.');
      } else {
        console.error('Error al crear cuenta:', error);
        setError('No se pudo crear la cuenta. Inténtalo de nuevo en unos minutos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white font-display text-slate-900 antialiased">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-sm">
        {/* Header */}
        <div className="flex items-center p-4 pb-2 justify-between">
          <button aria-label="Volver"
            onClick={() => onNavigate('login')}
            className="text-slate-900 flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Logo and Title */}
        <div className="flex flex-col items-center px-4 pb-6 pt-2">
          <img
            src="/favicon.png"
            alt="CornellaLocal"
            className="w-16 h-16 rounded-xl shadow-sm mb-4"
          />
          <h1 className="text-slate-900 tracking-tight text-[28px] font-bold leading-tight pb-2 text-center">Únete a CornellaLocal</h1>
          <p className="text-gray-500 text-base font-normal leading-normal text-center">Apoya al comercio local de Cornellà</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mx-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800 mb-1">¡Cuenta creada exitosamente!</p>
                <p className="text-sm text-green-700">
                  Ya puedes iniciar sesión con tu email y contraseña.
                </p>
                <button
                  onClick={() => onNavigate('login')}
                  className="mt-3 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                >
                  Ir al login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-4 px-4 pb-4" onSubmit={handleRegister}>
          {/* Name */}
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-slate-900 text-sm font-medium leading-normal pb-2">Nombre completo</p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="text-gray-500" size={20} />
              </div>
              <input
                className="form-input flex w-full rounded-lg text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border-none bg-gray-100 h-14 placeholder:text-gray-500 pl-12 pr-4 text-base font-normal transition-all"
                placeholder="Ej. Maria Garcia"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading || success}
              />
            </div>
          </label>

          {/* Email */}
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-slate-900 text-sm font-medium leading-normal pb-2">Email</p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="text-gray-500" size={20} />
              </div>
              <input
                className="form-input flex w-full rounded-lg text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border-none bg-gray-100 h-14 placeholder:text-gray-500 pl-12 pr-4 text-base font-normal transition-all"
                placeholder="ejemplo@correo.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || success}
              />
            </div>
          </label>

          {/* Password */}
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-slate-900 text-sm font-medium leading-normal pb-2">Contraseña</p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="text-gray-500" size={20} />
              </div>
              <input
                className="form-input flex w-full rounded-lg text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border-none bg-gray-100 h-14 placeholder:text-gray-500 pl-12 pr-12 text-base font-normal transition-all"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading || success}
              />
              <button aria-label="Mostrar u ocultar contraseña"
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || success}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          {/* Confirm Password */}
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-slate-900 text-sm font-medium leading-normal pb-2">Repetir contraseña</p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="text-gray-500" size={20} />
              </div>
              <input
                className="form-input flex w-full rounded-lg text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border-none bg-gray-100 h-14 placeholder:text-gray-500 pl-12 pr-12 text-base font-normal transition-all"
                placeholder="••••••••"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || success}
              />
              <button aria-label="Mostrar u ocultar contraseña"
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors"
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading || success}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          {/* Terms */}
          <label className="flex items-start gap-3 py-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 bg-white checked:border-primary checked:bg-primary transition-all"
              />
              <Check className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" size={16} />
            </div>
            <p className="text-gray-500 text-sm font-normal leading-snug">
              Tengo 14 años o más y acepto los{' '}
              <button
                type="button"
                onClick={() => onNavigate('terms-register')}
                className="text-primary font-medium hover:underline"
              >
                términos y condiciones
              </button>. He leído la{' '}
              <button
                type="button"
                onClick={() => onNavigate('privacy-policy')}
                className="text-primary font-medium hover:underline"
              >
                política de privacidad
              </button>.
            </p>
          </label>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full rounded-lg bg-primary hover:bg-blue-700 text-white h-12 text-base font-bold leading-normal transition-colors flex items-center justify-center shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || success}
            >
              {loading ? 'Creando cuenta...' : 'Registrarme'}
            </button>
          </div>
        </form>

        {/* Registro con Google: un toque, sin contraseña */}
        <div className="flex flex-col gap-4 pt-6">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm font-medium">O regístrate con</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-slate-900 font-semibold text-sm">Continuar con Google</span>
          </button>
          <p className="text-center text-xs text-gray-500 leading-relaxed">
            Al continuar con Google confirmas que tienes 14 años o más y aceptas los{' '}
            <button type="button" onClick={() => onNavigate('terms-register')} className="text-primary font-semibold hover:underline">
              términos y condiciones
            </button>. Tratamos tus datos según la{' '}
            <button type="button" onClick={() => onNavigate('privacy-policy')} className="text-primary font-semibold hover:underline">
              política de privacidad
            </button>.
          </p>
        </div>

        {/* Footer */}
        <div className="flex-1 flex flex-col justify-end pb-8 pt-4">
          <p className="text-center text-gray-500 text-sm">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-primary font-semibold hover:underline ml-1"
            >
              Inicia sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Pantalla de Recuperar Contraseña
const ForgotPasswordScreen = ({ onNavigate, showToast }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://www.cornellalocal.es/reset-password',
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      showToast('Error al enviar el email. Comprueba la dirección.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 font-display antialiased text-slate-900">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-gray-50 shadow-sm">
        <div className="flex items-center p-4 justify-between sticky top-0 z-10 bg-gray-50/90 backdrop-blur-md">
          <button aria-label="Volver"
            onClick={() => onNavigate('login')}
            className="text-slate-900 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="flex flex-col flex-1 px-6 pb-8 pt-4">
          <div className="w-full flex justify-center py-6">
            <div className="relative flex items-center justify-center size-40 rounded-full bg-primary/10">
              <div className="absolute inset-0 rounded-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
              {sent ? <CheckCircle className="text-green-500" size={64} /> : <RotateCcw className="text-primary" size={64} />}
            </div>
          </div>

          {sent ? (
            <>
              <h1 className="text-slate-900 tracking-tight text-[28px] font-bold leading-tight text-center pb-3 pt-4">
                ¡Email enviado!
              </h1>
              <p className="text-gray-500 text-base font-normal leading-relaxed text-center px-2 mb-8">
                Revisa tu bandeja de entrada en <span className="font-medium text-slate-700">{email}</span>. Si no lo ves, mira la carpeta de spam.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-primary text-white hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-md shadow-primary/20"
              >
                <span className="text-base font-bold leading-normal tracking-wide">Volver al inicio</span>
              </button>
            </>
          ) : (
            <>
              <h1 className="text-slate-900 tracking-tight text-[28px] font-bold leading-tight text-center pb-3 pt-4">
                ¿Has olvidado tu contraseña?
              </h1>
              <p className="text-gray-500 text-base font-normal leading-relaxed text-center px-2 mb-8">
                Introduce tu email y te enviaremos las instrucciones para restablecerla
              </p>

              <form className="flex flex-col gap-6 w-full" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <label className="text-slate-900 text-sm font-medium leading-normal ml-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <input aria-label="Correo electrónico"
                      className="form-input flex w-full rounded-xl text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 bg-white focus:border-primary h-14 placeholder:text-gray-500 px-4 text-base font-normal transition-all shadow-sm"
                      placeholder="tu@email.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <Mail size={20} />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-primary text-white hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-md shadow-primary/20 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="text-base font-bold leading-normal tracking-wide">Enviar instrucciones</span>
                  )}
                </button>
              </form>

              <div className="mt-auto pt-8 pb-4 text-center">
                <button
                  onClick={() => onNavigate('login')}
                  className="text-sm font-medium text-primary hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <ArrowLeft size={16} />
                  Volver al login
                </button>
              </div>
            </>
          )}
        </div>

        <div className="h-5 w-full bg-gray-50"></div>
      </div>
    </div>
  );
};
// Pantalla de Restablecer Contraseña (tras clic en email de recuperación)
const ResetPasswordScreen = ({ onNavigate, showToast }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Las contraseñas no coinciden', 'warning');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => onNavigate('login'), 2500);
    } catch (error) {
      showToast('Error al actualizar la contraseña. El enlace puede haber expirado.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 font-display antialiased text-slate-900">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-gray-50 shadow-sm">
        <div className="flex flex-col flex-1 px-6 pb-8 pt-16">
          <div className="w-full flex justify-center py-6">
            <div className="relative flex items-center justify-center size-40 rounded-full bg-primary/10">
              <div className="absolute inset-0 rounded-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
              {done ? <CheckCircle className="text-green-500" size={64} /> : <KeyRound className="text-primary" size={64} />}
            </div>
          </div>

          {done ? (
            <>
              <h1 className="text-slate-900 tracking-tight text-[28px] font-bold leading-tight text-center pb-3 pt-4">¡Contraseña actualizada!</h1>
              <p className="text-gray-500 text-base text-center px-2">Redirigiendo al inicio de sesión...</p>
            </>
          ) : (
            <>
              <h1 className="text-slate-900 tracking-tight text-[28px] font-bold leading-tight text-center pb-3 pt-4">Nueva contraseña</h1>
              <p className="text-gray-500 text-base font-normal leading-relaxed text-center px-2 mb-8">
                Elige una contraseña segura de al menos 6 caracteres
              </p>

              <form className="flex flex-col gap-5 w-full" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <label className="text-slate-900 text-sm font-medium leading-normal ml-1">Nueva contraseña</label>
                  <div className="relative">
                    <input aria-label="Nueva contraseña"
                      className="form-input flex w-full rounded-xl text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 bg-white focus:border-primary h-14 placeholder:text-gray-500 px-4 pr-12 text-base font-normal transition-all shadow-sm"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button aria-label="Mostrar u ocultar contraseña" type="button" onClick={() => setShowPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600">
                      {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-slate-900 text-sm font-medium leading-normal ml-1">Confirmar contraseña</label>
                  <div className="relative">
                    <input aria-label="Confirmar contraseña"
                      className="form-input flex w-full rounded-xl text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 bg-white focus:border-primary h-14 placeholder:text-gray-500 px-4 text-base font-normal transition-all shadow-sm"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-primary text-white hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-md shadow-primary/20 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="text-base font-bold leading-normal tracking-wide">Actualizar contraseña</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


// ==============================================
// PANTALLA DE EDITAR PERFIL
// ==============================================

// Pantalla de Editar Perfil
const EditProfileScreen = ({ onNavigate, user, setUser, showToast }) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('La imagen no puede superar 5MB', 'error'); return; }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { showToast('Solo se permiten imágenes JPG, PNG o WEBP', 'error'); return; }
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatars/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('business-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('business-photos').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setUser(prev => ({ ...prev, avatar_url: publicUrl }));
      showToast('Foto de perfil actualizada', 'success');
    } catch (err) {
      showToast('Error al subir la foto', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) { showToast('El nombre no puede estar vacío', 'error'); return; }
    setSaving(true);
    try {
      // Actualizar nombre y fecha en tabla profiles
      // La fecha de nacimiento ya no se pide (no se usaba para nada: minimización de datos)
      const updates = { full_name: fullName.trim() };
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (profileError) throw profileError;

      // Si cambió el email, actualizar en Supabase Auth (enviará email de confirmación)
      if (email.trim() !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) throw emailError;
        showToast('Se ha enviado un enlace de confirmación al nuevo correo', 'info');
      }

      // Actualizar estado global del usuario
      setUser(prev => ({ ...prev, full_name: fullName.trim() }));
      showToast('Perfil actualizado correctamente', 'success');
      onNavigate('settings');
    } catch (e) {
      console.error('Error guardando perfil:', e);
      showToast('Error al guardar el perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 text-slate-900 font-display antialiased min-h-screen flex flex-col max-w-md mx-auto shadow-2xl">
      <header className="sticky top-0 z-50 bg-gray-50/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button aria-label="Volver"
            onClick={() => onNavigate('settings')}
            className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors text-slate-800"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Editar perfil</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex-1 px-4 pt-6 pb-8 space-y-4">
        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <UserAvatar
                url={user?.avatar_url}
                name={user?.full_name || user?.email}
                className="w-full h-full object-cover"
                fallbackClassName="text-white text-3xl font-bold"
              />
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-dark transition-colors shadow-md">
              {uploadingAvatar ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Camera className="text-white" size={16} />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files?.[0])} disabled={uploadingAvatar} />
            </label>
          </div>
          <p className="text-xs text-gray-500">Toca la cámara para cambiar tu foto</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {/* Nombre */}
          <div className="p-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre completo</label>
            <input aria-label="Nombre completo"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* Email */}
          <div className="p-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Correo electrónico</label>
            <input aria-label="Correo electrónico"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1.5">Si cambias el correo recibirás un email de confirmación.</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 bg-primary text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
};

// ==============================================
// PANTALLA DE AJUSTES
// ==============================================

const SettingsScreen = ({ onNavigate, userSettings, updateSettings, onResetOnboarding, onShowNotificationModal, user, showToast, onRequestPushPermission, onDisablePush }) => {
  // Solo hay un ajuste real: las notificaciones push de este dispositivo
  const [settings, setSettings] = useState(userSettings || { pushEnabled: false });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [exportingData, setExportingData] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState('default');

  useEffect(() => {
    if (userSettings) {
      setSettings(userSettings);
    }
  }, [userSettings]);

  // Verificar permisos de notificaciones al montar (en effect, no durante render)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== pushPermissionStatus) {
        setPushPermissionStatus(Notification.permission);
      }
    }
  }, []);

  // Solicitar permisos de notificaciones push
  const requestPushPermission = async () => {
    if (onRequestPushPermission) {
      const success = await onRequestPushPermission();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPushPermissionStatus(Notification.permission);
      }
      if (success) {
        const newSettings = { ...settings, pushEnabled: true };
        setSettings(newSettings);
        if (updateSettings) updateSettings(newSettings);
      }
      return;
    }

    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPushPermissionStatus(permission);
    }
  };

  // Desactivar push: anula la suscripción de este dispositivo y la borra de la base de datos
  const handleDisablePush = async () => {
    if (!onDisablePush) return;
    const ok = await onDisablePush();
    if (ok) {
      const newSettings = { ...settings, pushEnabled: false };
      setSettings(newSettings);
      if (updateSettings) updateSettings(newSettings);
    }
  };

  // Descargar mis datos (derecho de acceso y portabilidad): archivo JSON con todo lo guardado
  const handleExportData = async () => {
    if (!user?.id || exportingData) return;
    setExportingData(true);
    try {
      const { data, error } = await supabase.rpc('export_my_data');
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cornella-local-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast?.('Listo: se ha descargado un archivo con todos tus datos', 'success');
    } catch (error) {
      console.error('Error exportando datos:', error);
      showToast?.('No se pudieron descargar tus datos. Escríbenos a cornellalocal@gmail.com y te los enviamos.', 'error');
    } finally {
      setExportingData(false);
    }
  };

  // Volver a elegir las cookies: se borra la elección y reaparece el aviso
  const handleResetCookies = () => {
    try { localStorage.removeItem('cookie-consent'); } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new Event('cookie-consent-changed'));
    showToast?.('Elige de nuevo en el aviso de cookies de abajo', 'info');
  };

  // Borrar la cuenta de verdad: datos, negocio y acceso (los archivos se borran esa noche)
  const handleDeleteAccount = async () => {
    if (deletingAccount || deleteConfirmText.trim().toUpperCase() !== 'BORRAR') return;
    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      if (data?.error === 'account_suspended') {
        showToast?.('Tu cuenta está suspendida. Para borrarla, escríbenos a cornellalocal@gmail.com.', 'error');
        return;
      }
      if (!data?.success) throw new Error(data?.error || 'delete_failed');
      try {
        ['recentSearches', 'post-login-redirect', 'push-asked', 'push-disabled'].forEach(k => localStorage.removeItem(k));
      } catch { /* sin almacenamiento */ }
      try {
        const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
        const subscription = await registration?.pushManager?.getSubscription();
        if (subscription) await subscription.unsubscribe();
      } catch { /* el navegador no tenía suscripción */ }
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setShowDeleteModal(false);
      showToast?.('Tu cuenta y tus datos se han borrado. Gracias por haber formado parte de Cornellà Local.', 'success');
      onNavigate('home');
    } catch (error) {
      console.error('Error borrando la cuenta:', error);
      showToast?.('No se pudo borrar la cuenta. Escríbenos a cornellalocal@gmail.com y lo hacemos nosotros.', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  // Toggle Switch Component
  const ToggleSwitch = ({ enabled, onToggle, disabled = false, label }) => (
    <button
      type="button"
      role="switch"
      aria-checked={!!enabled}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        enabled ? 'bg-primary' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="bg-gray-50 text-slate-900 font-display antialiased min-h-screen flex flex-col max-w-md mx-auto shadow-2xl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-50/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button aria-label="Volver"
            onClick={() => onNavigate('profile')}
            className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors text-slate-800"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Ajustes</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="flex-1 pb-8">
        {/* Sección: Notificaciones */}
        <section className="px-4 pt-6">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Notificaciones</h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
            {/* Push Notifications Principal */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.pushEnabled ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                    {settings.pushEnabled ? <BellRing size={20} /> : <BellOff size={20} />}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700 block">Notificaciones push</span>
                    <span className="text-xs text-slate-500">Avisos en este dispositivo aunque la app esté cerrada</span>
                  </div>
                </div>
                {pushPermissionStatus === 'granted' ? (
                  <ToggleSwitch label="Notificaciones push" enabled={settings.pushEnabled} onToggle={settings.pushEnabled ? handleDisablePush : requestPushPermission} />
                ) : (
                  <button
                    onClick={requestPushPermission}
                    className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Activar
                  </button>
                )}
              </div>
              {pushPermissionStatus === 'denied' && (
                <div className="mt-3 p-2 bg-amber-50 rounded-lg flex items-start gap-2">
                  <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-amber-700">
                    Las notificaciones están bloqueadas. Actívalas en la configuración del navegador.
                  </p>
                </div>
              )}
            </div>

            <p className="px-4 pb-4 -mt-1 !border-t-0 text-xs text-slate-500 leading-relaxed">
              Te avisamos de las ofertas y empleos de tus negocios favoritos, de las respuestas a tus
              presupuestos y candidaturas y, si tienes negocio, de sus novedades. Los avisos de la campana,
              dentro de la app, siguen llegando aunque desactives estas notificaciones.
            </p>
          </div>
        </section>

        {/* Sección: Privacidad y datos */}
        <section className="px-4 pt-6">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Privacidad y datos</h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
            <button
              type="button"
              onClick={handleExportData}
              disabled={exportingData}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                  <Download size={20} />
                </div>
                <div className="text-left">
                  <span className="font-medium text-slate-700 block">{exportingData ? 'Preparando tus datos…' : 'Descargar mis datos'}</span>
                  <span className="text-xs text-slate-500">Un archivo con todo lo que guardamos de ti</span>
                </div>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </button>
            <button
              type="button"
              onClick={handleResetCookies}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                  <Cookie size={20} />
                </div>
                <div className="text-left">
                  <span className="font-medium text-slate-700 block">Preferencias de cookies</span>
                  <span className="text-xs text-slate-500">Vuelve a elegir qué aceptas</span>
                </div>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </button>
          </div>
          <p className="px-1 pt-2 text-xs text-slate-500 leading-relaxed">
            Tu ubicación solo se usa en tu móvil para ordenar los negocios por cercanía y no se guarda.
          </p>
        </section>

        {/* Sección: Cuenta */}
        <section className="px-4 pt-6">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Cuenta</h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
            <button
              onClick={() => onNavigate('edit-profile')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                  <User size={20} />
                </div>
                <span className="font-medium text-slate-700">Editar perfil</span>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </button>
            <button
              onClick={() => onNavigate('terms')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                  <FileText size={20} />
                </div>
                <span className="font-medium text-slate-700">Términos y condiciones</span>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </button>
            <button
              onClick={() => onNavigate('privacy-policy')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                  <Shield size={20} />
                </div>
                <span className="font-medium text-slate-700">Política de privacidad</span>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </button>
            <button
              onClick={() => onNavigate('cookies-policy')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                  <Icon name="Cookie" size={20} />
                </div>
                <span className="font-medium text-slate-700">Política de cookies</span>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </button>
            <button
              onClick={() => onNavigate('legal-notice')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                  <Icon name="Scale" size={20} />
                </div>
                <span className="font-medium text-slate-700">Aviso legal</span>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </button>
            <button
              onClick={() => onNavigate('contact-support')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <HelpCircle size={20} />
                </div>
                <div className="text-left">
                  <span className="font-medium text-slate-700 block">Contacto y Soporte</span>
                  <span className="text-xs text-slate-500">FAQ, ayuda y formulario de contacto</span>
                </div>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </button>
            <button
              onClick={onResetOnboarding}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <RotateCcw size={20} />
                </div>
                <div className="text-left">
                  <span className="font-medium text-slate-700 block">Ver tutorial de bienvenida</span>
                  <span className="text-xs text-slate-500">Vuelve a ver cómo funciona la app</span>
                </div>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </button>
          </div>
        </section>

        {/* Sección: Zona de peligro */}
        <section className="px-4 pt-6 pb-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Zona de peligro</h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg text-red-600">
                  <Trash size={20} />
                </div>
                <div className="text-left">
                  <span className="font-medium text-red-600 block">Borrar mi cuenta</span>
                  <span className="text-xs text-slate-500">Borra tu cuenta y todos tus datos</span>
                </div>
              </div>
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                onNavigate('login');
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg text-red-600">
                  <LogOut size={20} />
                </div>
                <span className="font-medium text-red-600">Cerrar sesión</span>
              </div>
            </button>
          </div>
        </section>

        {/* Versión de la app */}
        <div className="text-center py-6">
          <p className="text-xs text-gray-500">Cornellà Local v1.0.0</p>
          <p className="text-[10px] text-gray-300 mt-1">Hecho con ❤️ en Cornellà</p>
        </div>
      </div>

      {/* Modal de confirmación de borrado */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { if (!deletingAccount) setShowDeleteModal(false); }}>
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">¿Borrar tu cuenta?</h3>
            <p className="text-sm text-gray-600 text-center mb-3 leading-relaxed">
              Se borrarán tu cuenta y todo lo tuyo: favoritos, reseñas, solicitudes de presupuesto, candidaturas,
              cupones y avisos. Si tienes un negocio, también se borrará su ficha con sus ofertas y empleos.
              <strong className="block mt-1 text-slate-800">No se puede deshacer.</strong>
            </p>
            <p className="text-xs text-gray-500 text-center mb-4">
              Si quieres guardar una copia, usa antes «Descargar mis datos».
            </p>
            <label htmlFor="delete-confirm" className="block text-xs font-semibold text-slate-700 mb-1 text-center">
              Escribe BORRAR para confirmar
            </label>
            <input
              id="delete-confirm"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full h-11 mb-5 px-3 rounded-xl border border-gray-200 text-center text-slate-900 tracking-widest focus:border-red-500 focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                disabled={deletingAccount}
                className="flex-1 h-12 bg-gray-100 text-slate-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText.trim().toUpperCase() !== 'BORRAR'}
                className="flex-1 h-12 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deletingAccount ? 'Borrando…' : 'Borrar mi cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==============================================
// ERROR BOUNDARY GLOBAL
// ==============================================

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // En producción aquí iría Sentry u otro tracker
    // console.error('ErrorBoundary capturó:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto min-h-screen w-full max-w-md flex flex-col items-center justify-center p-8 bg-gray-50">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center mb-2">Algo salió mal</h1>
          <p className="text-gray-500 text-sm text-center mb-8">
            Ha ocurrido un error inesperado. Por favor recarga la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Recargar aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==============================================
// APP PRINCIPAL CON ROUTER
// ==============================================

// VAPID Public Key para Web Push Notifications
const VAPID_PUBLIC_KEY = 'BA_vRY5jNz2ro0yPN_-GXmTemr-oH4VzVodixY6ukjYigsm_8GFKFrWggD3VqGwMSAfEjxnZuhNbr04HZAL6Mw8';

export default function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [pageParams, setPageParams] = useState({});
  const currentPageRef = useRef('login'); // Ref para acceder a currentPage desde closures de auth
  const userRef = useRef(null); // Ref para acceder a user desde handlers de eventos (sin stale closure)
  const pushSyncAttemptedRef = useRef(false);

  // Estado del usuario autenticado
  const [user, setUser] = useState(null);

  // Título de la pestaña según la pantalla (accesibilidad y SEO). La ficha de un comercio lo afina con su nombre.
  useEffect(() => {
    const t = PAGE_TITLES[currentPage];
    document.title = t ? `${t} | Cornellà Local` : DEFAULT_DOC_TITLE;
  }, [currentPage]);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Estado para Push Notifications
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');

  // Mantener ref sincronizada con currentPage (para usar en closures de auth sin dependencias)
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  // Persistir sesión con Supabase Auth
  useEffect(() => {

    // Timeout de seguridad (15s) — si onAuthStateChange no dispara, mostrar login
    const authTimeout = setTimeout(() => {
      setLoadingAuth(false);
      if (currentPageRef.current === 'login') setCurrentPage('home');
    }, 15000);

    // Helper: cargar o crear perfil a partir de una sesión
    // Estrategia: setear usuario inmediatamente con datos de la sesión,
    // luego sincronizar con profiles en segundo plano (sin bloquear)
    const loadOrCreateProfile = async (session) => {
      const displayName = session.user.user_metadata?.full_name
        || session.user.user_metadata?.name
        || session.user.email?.split('@')[0]
        || 'Usuario';
      const avatar = session.user.user_metadata?.avatar_url || null;

      // 1. Setear usuario inmediatamente con datos de la sesión (no esperar a DB)
      setUser({
        id: session.user.id,
        email: session.user.email,
        full_name: displayName,
        avatar_url: avatar,
      });

      // 2. Sincronizar con profiles en segundo plano (sin await — no bloquea el login)
      supabase.from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            // Comprobar si la cuenta está baneada
            if (data.is_banned === true) {
              supabase.auth.signOut();
              setUser(null);
              setCurrentPage('login');
              showToast(
                `Tu cuenta está suspendida${data.ban_reason ? `. Motivo: ${data.ban_reason}` : ''}. Si no estás de acuerdo, escríbenos a cornellalocal@gmail.com y lo revisaremos (también puedes acudir a los tribunales).`,
                'error'
              );
              return;
            }
            // Perfil existe: actualizar estado con los datos del perfil que usa la app
            const { id, full_name, avatar_url, is_admin, is_banned } = data;
            setUser(prev => ({ ...prev, id, full_name, avatar_url, is_admin, is_banned }));
          } else {
            // Perfil no existe: crearlo
            supabase.from('profiles').upsert({
              id: session.user.id,
              email: session.user.email,
              full_name: displayName,
              avatar_url: avatar,
            }, { onConflict: 'id' }).then(() => {
            }).catch(err => {
            });
          }
        })
        .catch(err => {
        });
    };

    // onAuthStateChange es la fuente principal de verdad
    // Con detectSessionInUrl: true, Supabase intercambia el código OAuth automáticamente
    // y dispara INITIAL_SESSION (sesión existente) o SIGNED_IN (login nuevo/OAuth)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        // Páginas de autenticación (sin usuario logueado)
        const authOnlyPages = ['login', 'register', 'forgot-password', 'reset-password'];
        // Siempre cancelar timeout y desbloquear carga (en finally para garantizarlo)
        try {
          if (session) {
            await loadOrCreateProfile(session);
            // Si venía de una pantalla que pedía cuenta (modo invitado), volver allí
            const redirect = takeAuthRedirect();
            if (redirect) {
              setCurrentPage(redirect.page);
              setPageParams(redirect.params || {});
              window.history.replaceState({ page: redirect.page, params: redirect.params || {} }, '', buildUrlFor(redirect.page, redirect.params || {}));
            } else if (authOnlyPages.includes(currentPageRef.current)) {
              // Solo navegar a home si estamos en una página de autenticación
              // Evita interrumpir al usuario si está navegando dentro de la app
              setCurrentPage('home');
            }
          } else if (event === 'INITIAL_SESSION') {
            // Sin sesión: se entra como invitado (listados visibles, detalles piden cuenta).
            // Se respeta el deep link (?negocio=, ?oferta=, ?empleo=) si lo hay.
            const wantsLogin = INITIAL_URL_WANTS_LOGIN;
            if (currentPageRef.current === 'login' && !wantsLogin) {
              setCurrentPage('home');
              window.history.replaceState({ page: 'home', params: {} }, '', window.location.pathname === '/' ? '/' : window.location.pathname);
            }
          }
          // Si SIGNED_IN sin sesión (no debería pasar), no hacer nada
        } catch (e) {
          // Fallback: usar datos mínimos de la sesión
          if (session) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
              avatar_url: session.user.user_metadata?.avatar_url || null,
            });
            if (authOnlyPages.includes(currentPageRef.current)) {
              setCurrentPage('home');
            }
          } else if (currentPageRef.current === 'login') {
            setCurrentPage('home');
          }
        } finally {
          clearTimeout(authTimeout);
          setLoadingAuth(false);
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(authTimeout);
        setLoadingAuth(false);
        setCurrentPage('reset-password');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentPage('home');
        setLoadingAuth(false);
      }
      // TOKEN_REFRESHED: ignorar
    });

    return () => {
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Verificar soporte de Push Notifications
  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    } else {
    }
  }, []);

  // Función para convertir VAPID key de base64 a Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Función para solicitar permisos y suscribirse a push notifications.
  // silent: re-sincronización automática al entrar (sin aviso de "activadas").
  const requestPushPermission = async ({ silent = false } = {}) => {
    if (!pushSupported) {
      showToast('Tu navegador no soporta notificaciones push', 'error');
      return false;
    }

    if (VAPID_PUBLIC_KEY === 'PLACEHOLDER_GENERATE_VAPID_KEYS') {
      showToast('Push notifications no configuradas', 'error');
      return false;
    }

    if (!user?.id) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        showToast('Necesitamos permisos para enviarte notificaciones', 'warning');
        return false;
      }


      // Esperar a que el Service Worker esté listo
      const registration = await navigator.serviceWorker.ready;

      // Verificar si ya existe una subscription
      let subscription = await registration.pushManager.getSubscription();

      // Re-sincronización automática: solo vuelve a registrar la suscripción que ya existe en este
      // navegador; nunca crea una nueva sin que el usuario lo pida
      if (!subscription && silent) return false;

      if (!subscription) {
        // Crear nueva subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      } else {
      }

      const { error } = await supabase.rpc('register_push_subscription', {
        p_subscription: subscription.toJSON(),
        p_user_agent: navigator.userAgent,
      });

      if (error) {
        console.error('Error registrando push subscription:', error);
        showToast('Error al activar notificaciones', 'error');
        return false;
      }

      // Si las había desactivado en Ajustes, al activarlas de nuevo se quita la marca
      try { localStorage.removeItem('push-disabled'); } catch { /* sin almacenamiento */ }
      if (!silent) showToast('¡Notificaciones activadas! 🔔', 'success');
      return true;

    } catch (error) {
      if (error.name === 'NotAllowedError') {
        showToast('Permisos de notificación bloqueados. Habilítalos en configuración del navegador.', 'warning');
      } else {
        showToast('Error al activar notificaciones', 'error');
      }
      return false;
    }
  };

  // Desactivar las notificaciones push en este dispositivo: se anula la suscripción del navegador
  // y se borra de la base de datos (retirar el permiso debe ser tan fácil como darlo).
  const disablePushNotifications = async () => {
    try { localStorage.setItem('push-disabled', '1'); } catch { /* sin almacenamiento */ }
    try {
      let endpoint = null;
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager?.getSubscription();
        endpoint = subscription?.endpoint || null;
        if (subscription) await subscription.unsubscribe();
      }
      if (user?.id && endpoint) {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('subscription->>endpoint', endpoint);
        if (error) throw error;
      }
      setUserSettings(prev => ({ ...prev, pushEnabled: false }));
      showToast('Notificaciones desactivadas en este dispositivo', 'info');
      return true;
    } catch (error) {
      console.error('Error desactivando notificaciones:', error);
      showToast('No se pudieron desactivar las notificaciones. Inténtalo de nuevo.', 'error');
      return false;
    }
  };

  // Escuchar mensajes del Service Worker (para navegación desde push)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const messageHandler = (event) => {
        if (event.data && event.data.type === 'NAVIGATE') {
          const url = event.data.url;
          if (!url) return;
          try {
            const parsed = new URL(url, window.location.origin);
            const params = new URLSearchParams(parsed.search);

            // Deep links canónicos de la app (?oferta, ?negocio, ?empleo)
            if (params.get('oferta')) {
              navigate('coupon', { id: params.get('oferta') });
              return;
            }
            if (params.get('negocio')) {
              navigate('business', { id: parseInt(params.get('negocio')) });
              return;
            }
            if (params.get('empleo')) {
              navigate('job-detail', { id: params.get('empleo') });
              return;
            }
            // Deep link genérico ?nav=PAGE para llevar a una pantalla concreta
            if (params.get('nav')) {
              navigate(params.get('nav'), {});
              return;
            }

            // Fallback: hash legacy (#/page) o pathname
            const hashPath = (parsed.hash || '').replace(/^#\/?/, '');
            const path = hashPath || parsed.pathname.replace(/^\/+/, '');
            if (path) navigate(path, event.data.metadata || {});
          } catch (e) {
            console.error('Error parsing notification URL:', e);
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', messageHandler);

      return () => {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      };
    }
  }, []);

  // Solicitar permisos de push después del login (solo primera vez)
  useEffect(() => {
    if (user && pushSupported && pushPermission === 'default') {
      const askedBefore = localStorage.getItem('push-asked');
      if (askedBefore) return;

      // Mostrar modal bonito después de 3 segundos
      const timer = setTimeout(() => {
        setShowNotificationModal(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [user?.id, pushPermission, pushSupported]);

  // Si el permiso ya estaba concedido pero no hay fila en BD, re-sincronizar.
  useEffect(() => {
    if (!user?.id || !pushSupported || pushPermission !== 'granted' || pushSyncAttemptedRef.current) return;
    // Si el usuario las desactivó en Ajustes, no se vuelven a activar solas
    try { if (localStorage.getItem('push-disabled')) return; } catch { /* sin almacenamiento */ }

    pushSyncAttemptedRef.current = true;
    requestPushPermission({ silent: true }).then((success) => {
      if (success) {
        setUserSettings(prev => ({ ...prev, pushEnabled: true }));
      }
    });
  }, [user?.id, pushPermission, pushSupported]);

  // El interruptor de Ajustes refleja ESTE dispositivo: permiso concedido + suscripción del navegador
  useEffect(() => {
    const syncPushEnabledFromDevice = async () => {
      if (!user?.id || !('serviceWorker' in navigator) || typeof Notification === 'undefined') {
        setUserSettings(prev => ({ ...prev, pushEnabled: false }));
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager?.getSubscription();
        setUserSettings(prev => ({
          ...prev,
          pushEnabled: Notification.permission === 'granted' && !!subscription,
        }));
      } catch {
        setUserSettings(prev => ({ ...prev, pushEnabled: false }));
      }
    };

    syncPushEnabledFromDevice();
  }, [user?.id, pushPermission]);

  // Cargar negocio del propietario cuando cambie el usuario
  useEffect(() => {
    const loadUserBusiness = async () => {
      if (!user?.id) {
        setBusinessData(null);
        setBusinessStatus(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          setBusinessData(null);
          setBusinessStatus(null);
          return;
        }

        // Si no hay negocios
        if (!data || data.length === 0) {
          setBusinessData(null);
          setBusinessStatus(null);
          return;
        }

        // Si hay múltiples negocios, tomar el más reciente
        const business = Array.isArray(data) ? data[0] : data;

        if (data.length > 1) {
        } else {
        }

        setBusinessData(business);

        // Mapear verification_status de Supabase a businessStatus del UI
        if (business.verification_status === 'approved') {
          setBusinessStatus('validated');
        } else if (business.verification_status === 'pending') {
          setBusinessStatus('pending');
        } else if (business.verification_status === 'draft') {
          setBusinessStatus('draft');
        } else if (business.verification_status === 'rejected') {
          setBusinessStatus('rejected');
        }
      } catch (error) {
        setBusinessData(null);
        setBusinessStatus(null);
      }
    };

    loadUserBusiness();
  }, [user?.id]);

  // Cargar favoritos del usuario desde Supabase
  useEffect(() => {
    const loadUserFavorites = async () => {
      if (!user?.id) {
        setUserFavorites([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('business_id')
          .eq('user_id', user.id);

        if (error) throw error;

        const favoriteIds = (data || []).map(f => f.business_id);
        setUserFavorites(favoriteIds);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    loadUserFavorites();
  }, [user?.id]);

  // Helper: Mapear tipo de notificación a ruta y parámetros
  const getNotificationRoute = (notif) => {
    const data = notif.data || {};

    switch (notif.type) {
      // Presupuestos
      case 'budget_quote_received':
        return {
          route: 'my-budget-requests',
          params: { selectedRequestId: data.budget_request_id }
        };
      case 'budget_quote_accepted':
        return {
          route: 'incoming-budget-requests',
          params: {}
        };

      // Ofertas y empleos de negocios favoritos
      case 'new_offer':
        // Si tenemos offer_id vamos directos al detalle; fallback al perfil del negocio
        return data.offer_id
          ? { route: 'coupon', params: { id: data.offer_id } }
          : { route: 'business', params: { id: data.business_id } };
      case 'new_job':
        return {
          route: 'job-detail',
          params: { id: data.job_id }
        };

      // Candidaturas (propietario)
      case 'new_application':
        return {
          route: 'business-candidates',
          params: {}
        };

      // Candidaturas (usuario)
      case 'application_reviewed':
      case 'interview_scheduled':
      case 'application_rejected':
      case 'application_hired':
        return {
          route: 'user-jobs',
          params: {}
        };

      // Verificación de negocio
      case 'business_approved':
        return {
          route: 'owner-dashboard',
          params: {}
        };
      case 'new_budget_request':
        return {
          route: 'incoming-budget-requests',
          params: {}
        };
      case 'business_submitted':
        return {
          route: 'profile',
          params: {}
        };
      case 'business_pending_review':
        return {
          route: 'admin-approve-businesses',
          params: {}
        };
      case 'business_rejected':
        return {
          route: 'business-appeal',
          params: { businessId: data.business_id }
        };

      // Reportes (usuario)
      case 'report_resolved':
        return {
          route: 'business',
          params: { id: data.business_id }
        };

      // Reportes (admin)
      case 'new_report':
        return {
          route: 'admin-reports',
          params: { reportId: data.report_id }
        };

      // Panel de administración ampliado (supabase/panel-admin-servicios.sql)
      case 'service_request':
        return { route: 'admin-services', params: {} };
      case 'system_job_failed':
        return { route: 'admin-dashboard', params: {} };
      case 'review_removed':
        return { route: 'user-reviews', params: {} };

      default:
        return {
          route: 'home',
          params: {}
        };
    }
  };

  // Helper: Formatear tiempo de notificación
  // Cargar notificaciones del usuario desde Supabase
  useEffect(() => {
    const loadUserNotifications = async () => {
      if (!user?.id) {
        setDynamicNotifications([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50); // Últimas 50 notificaciones

        if (error) throw error;

        // Transformar a formato de UI
        const transformed = (data || []).map(notif => {
          const { route, params } = getNotificationRoute(notif);

          // Determinar color de fondo del icono según el tipo
          const getIconBg = (type) => {
            const iconBgMap = {
              'new_offer': 'bg-orange-500',
              'new_job': 'bg-blue-500',
              'new_application': 'bg-purple-500',
              'budget_quote_received': 'bg-teal-500',
              'budget_quote_accepted': 'bg-green-500',
              'application_reviewed': 'bg-yellow-500',
              'interview_scheduled': 'bg-indigo-500',
              'application_rejected': 'bg-red-500',
              'application_hired': 'bg-green-600',
              'report_resolved': 'bg-green-500',
              'new_report': 'bg-orange-600',
              'business_approved': 'bg-green-700',
              'business_rejected': 'bg-red-600',
              'business_submitted': 'bg-amber-600',
              'business_pending_review': 'bg-blue-600',
              'new_budget_request': 'bg-teal-700',
              'service_request': 'bg-amber-700',
              'system_job_failed': 'bg-red-600',
              'review_removed': 'bg-red-600',
            };
            return iconBgMap[type] || 'bg-gray-500';
          };

          return {
            id: notif.id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            icon: notif.icon,
            iconBg: getIconBg(notif.type),
            time: formatRelativeTime(notif.created_at),
            isRead: notif.is_read,
            actionRoute: route,
            actionParams: params,
          };
        });

        setDynamicNotifications(transformed);
      } catch (error) {
        console.error('Error cargando notificaciones:', error);
      }
    };

    loadUserNotifications();
  }, [user?.id]);

  // Suscripción en tiempo real para notificaciones nuevas
  useEffect(() => {
    if (!user?.id) return;


    const notificationChannel = supabase
      .channel('user-notifications-' + user.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {

          const { route, params } = getNotificationRoute(payload.new);

          // Determinar color de fondo del icono según el tipo
          const getIconBg = (type) => {
            const iconBgMap = {
              'new_offer': 'bg-orange-500',
              'new_job': 'bg-blue-500',
              'new_application': 'bg-purple-500',
              'budget_quote_received': 'bg-teal-500',
              'budget_quote_accepted': 'bg-green-500',
              'application_reviewed': 'bg-yellow-500',
              'interview_scheduled': 'bg-indigo-500',
              'application_rejected': 'bg-red-500',
              'application_hired': 'bg-green-600',
              'report_resolved': 'bg-green-500',
              'new_report': 'bg-orange-600',
              'business_approved': 'bg-green-700',
              'business_rejected': 'bg-red-600',
              'business_submitted': 'bg-amber-600',
              'business_pending_review': 'bg-blue-600',
              'new_budget_request': 'bg-teal-700',
              'service_request': 'bg-amber-700',
              'system_job_failed': 'bg-red-600',
              'review_removed': 'bg-red-600',
            };
            return iconBgMap[type] || 'bg-gray-500';
          };

          const newNotif = {
            id: payload.new.id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            icon: payload.new.icon,
            iconBg: getIconBg(payload.new.type),
            time: 'Ahora',
            isRead: false,
            actionRoute: route,
            actionParams: params,
          };

          // Añadir al principio de la lista
          setDynamicNotifications(prev => [newNotif, ...prev]);

          // Mostrar toast al usuario
          showToast(payload.new.title, 'info');
        }
      )
      .subscribe((status) => {
      });

    // Cleanup: desuscribirse cuando el usuario cambie o el componente se desmonte
    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [user?.id]);

  // Estado del onboarding - usar localStorage para persistir
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    return localStorage.getItem('hasSeenOnboarding') === 'true';
  });

  // Modal de permisos de notificación
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Estado de favoritos - se cargará desde Supabase
  const [userFavorites, setUserFavorites] = useState([]);

  // Estado del negocio del usuario
  // Estados posibles: null (sin negocio), 'pending' (en revisión), 'validated' (validado), 'rejected' (rechazado)
  const [businessStatus, setBusinessStatus] = useState(null);
  const [businessData, setBusinessData] = useState(null);

  // Datos temporales durante el registro de negocio
  const [tempBusinessData, setTempBusinessData] = useState({});

  // Notificaciones dinámicas
  const [dynamicNotifications, setDynamicNotifications] = useState([]);

  // Ofertas creadas por el usuario
  const [userOffers, setUserOffers] = useState([]);

  // Solicitudes de presupuesto entrantes (para propietarios)
  const [incomingBudgetRequests, setIncomingBudgetRequests] = useState([]);

  // Candidaturas recibidas (para propietarios)
  const [jobApplications, setJobApplications] = useState([]);

  // Candidaturas del usuario (como candidato)
  const [userJobApplications, setUserJobApplications] = useState([]);

  // Solicitudes de presupuesto del usuario
  const [userBudgetRequests, setUserBudgetRequests] = useState([]);

  // Cupones guardados por el usuario
  const [savedCoupons, setSavedCoupons] = useState([]);

  // Estado de empleos activos - se cargará desde Supabase
  const [activeJobs, setActiveJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Cargar empleos desde Supabase
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            businesses!inner(
              id,
              name,
              address,
              phone
            )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        // Transformar datos al formato esperado por el UI
        const transformedJobs = (data || []).map(job => {
          // Determinar icono según tipo de trabajo
          let icon = 'Briefcase';
          let iconBg = 'blue';

          if (job.type === 'Media Jornada') {
            icon = 'Clock';
            iconBg = 'orange';
          } else if (job.type === 'Temporal') {
            icon = 'Calendar';
            iconBg = 'orange';
          } else if (job.type === 'Prácticas') {
            icon = 'GraduationCap';
            iconBg = 'green';
          }

          // Formatear salario
          let salary = 'A convenir';
          if (job.salary_min && job.salary_max) {
            salary = `${(job.salary_min / 1000).toFixed(0)}-${(job.salary_max / 1000).toFixed(0)}k €/año`;
          } else if (job.salary_note) {
            salary = job.salary_note;
          }

          return {
            id: job.id,
            title: job.title,
            company: job.businesses?.name || 'Empresa',
            icon,
            iconBg,
            salary,
            type: job.type,
            contract: job.contract,
            modality: job.modality,
            location: job.location,
            address: job.address,
            description: job.description,
            requirements: job.requirements || [],
            benefits: job.benefits || [],
            createdAt: job.created_at,
            businessId: job.business_id,
            businessPhone: job.businesses?.phone,
            // Estados adicionales del UI
            hired: false,
            hiredDate: null
          };
        });

        setActiveJobs(transformedJobs);
      } catch (error) {
        showToast(ERROR_MESSAGES.generic, 'error');
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobs();
  }, []);

  // Función para calcular días restantes de un empleo (60 días máximo)
  const getJobDaysRemaining = (job) => {
    const now = new Date();
    const created = new Date(job.createdAt);
    const daysPassed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return Math.max(0, 60 - daysPassed);
  };

  // Marcar empleo como contratado (se borrará en 15 días)
  const markJobAsHired = (jobId) => {
    setActiveJobs(prev => prev.map(job =>
      job.id === jobId
        ? { ...job, hired: true, hiredDate: new Date() }
        : job
    ));
    showToast('¡Enhorabuena! Empleo marcado como contratado', 'success');
  };

  // Renovar empleo (reiniciar contador de 60 días)
  const renewJob = (jobId) => {
    setActiveJobs(prev => prev.map(job =>
      job.id === jobId
        ? { ...job, createdAt: new Date(), hired: false, hiredDate: null }
        : job
    ));
    showToast('Empleo renovado por 60 días más', 'success');
  };

  // Eliminar empleo
  const deleteJob = (jobId) => {
    setActiveJobs(prev => prev.filter(job => job.id !== jobId));
    showToast(SUCCESS_MESSAGES.deleted, 'success');
  };

  // Filtrar empleos activos (no expirados y no contratados hace más de 15 días)
  const getVisibleJobs = () => {
    const now = new Date();
    return activeJobs.filter(job => {
      const daysRemaining = getJobDaysRemaining(job);

      // Si está contratado, verificar si han pasado 15 días
      if (job.hired && job.hiredDate) {
        const daysSinceHired = Math.floor((now - new Date(job.hiredDate)) / (1000 * 60 * 60 * 24));
        if (daysSinceHired >= 15) return false;
      }

      // Mostrar aunque esté expirado (para que pueda renovar)
      return true;
    });
  };

  // Cargar empleos creados por el propietario
  useEffect(() => {
    const loadOwnerJobs = async () => {
      if (!businessData?.id) {
        setUserJobOffers([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('business_id', businessData.id)
          .order('created_at', { ascending: false });

        if (error) throw error;


        // Contar candidaturas y obtener contratados por empleo
        const jobIds = (data || []).map(job => job.id);
        let applicationCounts = {};
        let hiredCandidates = {};

        if (jobIds.length > 0) {
          const { data: applicationsData } = await supabase
            .from('job_applications')
            .select('job_id, full_name, status')
            .in('job_id', jobIds);

          // Crear mapa de conteo y de contratados
          applicationsData?.forEach(app => {
            applicationCounts[app.job_id] = (applicationCounts[app.job_id] || 0) + 1;

            // Guardar el nombre del contratado
            if (app.status === 'hired') {
              hiredCandidates[app.job_id] = app.full_name;
            }
          });
        }

        // Transformar al formato esperado por el UI
        const transformedJobs = (data || []).map(job => {
          // Calcular tiempo transcurrido
          const getTimeAgo = (dateString) => {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Ahora';
            if (diffMins < 60) return `Hace ${diffMins} min`;
            if (diffHours < 24) return `Hace ${diffHours}h`;
            if (diffDays === 1) return 'Ayer';
            return `Hace ${diffDays} días`;
          };

          return {
            id: job.id,
            title: job.title,
            type: job.type,
            salary: job.salary_min && job.salary_max
              ? `${(job.salary_min / 1000).toFixed(0)}-${(job.salary_max / 1000).toFixed(0)}k €/año`
              : job.salary_note || 'A convenir',
            location: job.location || businessData.address,
            description: job.description,
            requirements: job.requirements || [],
            benefits: job.benefits || [],
            createdAt: job.created_at,
            status: job.status,
            applications: applicationCounts[job.id] || 0, // Conteo real desde Supabase
            postedAgo: getTimeAgo(job.created_at),
            hiredCandidateName: hiredCandidates[job.id] || null, // Nombre del contratado
          };
        });

        setUserJobOffers(transformedJobs);
      } catch (error) {
        console.error('Error cargando empleos del propietario:', error);
      }
    };

    loadOwnerJobs();
  }, [businessData?.id]);

  // Cargar ofertas creadas por el propietario
  useEffect(() => {
    const loadOwnerOffers = async () => {
      if (!businessData?.id) {
        setUserOffers([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('business_id', businessData.id)
          .order('created_at', { ascending: false });

        if (error) throw error;


        // Transformar al formato esperado por el UI
        const transformedOffers = (data || []).map(offer => {
          // Calcular tiempo restante
          const now = new Date();
          const endsAt = new Date(offer.expires_at);
          const diffMs = endsAt - now;
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          let timeLeft = 'Expirada';
          if (diffMs > 0) {
            if (diffHours < 24) {
              timeLeft = `menos de ${diffHours}h`;
            } else {
              timeLeft = `${diffDays} días`;
            }
          }

          // Formatear descuento
          let discount = '';
          if (offer.discount_type === 'percentage') {
            discount = `-${offer.discount_value}%`;
          } else if (offer.discount_type === '2x1') {
            discount = '2x1';
          } else if (offer.discount_type === 'free') {
            discount = 'GRATIS';
          } else if (offer.discount_type === 'fixed_amount') {
            discount = `-${offer.discount_value}€`;
          } else {
            discount = offer.discount_label || 'Oferta';
          }

          return {
            id: offer.id,
            title: offer.title,
            description: offer.description,
            discount,
            image: offer.image || null,
            originalPrice: offer.original_price,
            discountedPrice: offer.discounted_price,
            discountType: offer.discount_type,
            isFlash: offer.is_flash,
            code: offer.code,
            conditions: offer.conditions,
            timeLeft,
            expiresSoon: diffHours < 8 && diffHours > 0,
            createdAt: offer.created_at,
            status: offer.status,
            isVisible: offer.is_visible,
            redemptions: offer.redemption_count || 0,
            claimed: offer.claimed_count ?? offer.redemption_count ?? 0,
            maxUses: offer.max_uses || null,
          };
        });

        setUserOffers(transformedOffers);
      } catch (error) {
        console.error('Error cargando ofertas del propietario:', error);
      }
    };

    loadOwnerOffers();
  }, [businessData?.id]);

  // Cargar candidaturas recibidas para los empleos del negocio
  useEffect(() => {
    const loadJobApplications = async () => {
      if (!businessData?.id) {
        setJobApplications([]);
        return;
      }

      try {
        // Obtener IDs de empleos del negocio
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('id')
          .eq('business_id', businessData.id);

        if (jobsError) throw jobsError;

        const jobIds = (jobsData || []).map(j => j.id);

        if (jobIds.length === 0) {
          setJobApplications([]);
          return;
        }

        // Obtener candidaturas de esos empleos
        const { data, error } = await supabase
          .from('job_applications')
          .select('*')
          .in('job_id', jobIds)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setJobApplications(data || []);
      } catch (error) {
        console.error('Error cargando candidaturas:', error);
      }
    };

    loadJobApplications();

    // Suscripción real-time para nuevas candidaturas
    let subscription;
    if (businessData?.id) {
      subscription = supabase
        .channel('job-applications-' + businessData.id)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'job_applications'
          },
          (payload) => {
            // Recargar candidaturas para actualizar contador
            loadJobApplications();
          }
        )
        .subscribe();
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [businessData?.id]);

  // Cargar solicitudes de presupuesto para TODAS las categorías de TODOS los negocios del usuario
  useEffect(() => {
    const loadBudgetRequests = async () => {
      if (!user?.id) {
        setIncomingBudgetRequests([]);
        return;
      }

      try {
        // 1. Primero cargar TODOS los negocios del usuario
        const { data: userBusinesses, error: businessesError } = await supabase
          .from('businesses')
          .select('id, subcategory')
          .eq('owner_id', user.id)
          .eq('is_verified', true);

        if (businessesError) throw businessesError;

        if (!userBusinesses || userBusinesses.length === 0) {
          setIncomingBudgetRequests([]);
          return;
        }

        // 2. Obtener todas las subcategorías de los negocios del usuario
        const subcategoryNames = [...new Set(userBusinesses.map(b => b.subcategory).filter(Boolean))];
        const businessIds = userBusinesses.map(b => b.id);

        // También incluir los IDs de categoría en minúsculas (compatibilidad con presupuestos legacy)
        // Mapa de nombre → id: { 'Fontanero': 'fontanero', 'Electricista': 'electricista', ... }
        // (los nombres deben coincidir EXACTAMENTE con las subcategorías de src/data/mockData.js)
        const serviceNameToLegacy = {
          'Albañil y reformas': ['albanil'], 'Carpintero': ['carpintero'], 'Cerrajero': ['cerrajero'],
          'Climatización y calefacción': ['climatizacion', 'Climatización'],
          'Electricista': ['electricista'], 'Fontanero': ['fontanero'],
          'Jardinería': ['jardineria'], 'Limpieza': ['limpieza'], 'Mudanzas': ['mudanzas'],
          'Pintor': ['pintor'], 'Reparación de móviles y PC': ['reparacion', 'Reparación móviles/PC'],
        };
        const legacyIds = subcategoryNames.flatMap(n => serviceNameToLegacy[n] || []);
        const allCategoryVariants = [...new Set([...subcategoryNames, ...legacyIds])];

        // 3. Cargar presupuestos de TODAS esas categorías (nombres + IDs legacy)
        // El teléfono del cliente NO se descarga aquí: solo se pide (RPC) cuando
        // el cliente ha aceptado el presupuesto de uno de mis negocios
        const { data, error } = await supabase
          .from('budget_requests')
          .select(`
            id, user_id, category, description, photos, urgency, address, status, created_at, updated_at,
            budget_quotes(id, price, description, business_id, status)
          `)
          .in('category', allCategoryVariants)
          .in('status', ['pending', 'quoted', 'accepted'])
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        // Las aceptadas solo interesan si el elegido es uno de mis negocios
        const visibleRequests = (data || []).filter(request => {
          if (request.status !== 'accepted') return true;
          return (request.budget_quotes || []).some(q => businessIds.includes(q.business_id) && q.status === 'accepted');
        });

        // Teléfono del cliente solo para presupuestos aceptados conmigo
        const contactPhones = {};
        await Promise.all(visibleRequests
          .filter(r => r.status === 'accepted')
          .map(async r => {
            const { data: phone, error: phoneError } = await supabase.rpc('get_budget_request_contact', { p_request_id: r.id });
            if (phoneError) console.error('Error cargando contacto del presupuesto:', phoneError);
            contactPhones[r.id] = phone || '';
          }));


        // 4. Transformar al formato esperado
        const transformedRequests = visibleRequests.map(request => {
          // Buscar si ALGUNO de mis negocios ya respondió
          const myQuote = request.budget_quotes?.find(
            q => businessIds.includes(q.business_id)
          );
          const acceptedWithMe = request.status === 'accepted' && myQuote?.status === 'accepted';

          return {
            id: request.id,
            customerName: 'Usuario',
            customerAvatar: 'U',
            category: request.category,
            categoryName: request.category,
            description: request.description,
            urgency: request.urgency || 'medium',
            urgencyLabel: request.urgency === 'urgent' ? 'Urgente' :
                         request.urgency === 'this-week' ? 'Esta semana' : 'Próxima semana',
            address: request.address || 'Cornellà de Llobregat',
            phone: contactPhones[request.id] || '',
            photos: request.photos || [],
            createdAt: request.created_at,
            status: acceptedWithMe ? 'accepted' : myQuote ? 'replied' : 'new',
            myQuote: myQuote ? { price: myQuote.price, message: myQuote.description } : null,
          };
        });

        setIncomingBudgetRequests(transformedRequests);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    loadBudgetRequests();
  }, [user?.id]);

  // Cargar candidaturas del usuario (como candidato)
  useEffect(() => {
    const loadUserApplications = async () => {
      if (!user?.id) {
        setUserJobApplications([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('job_applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        setUserJobApplications(data || []);
      } catch (error) {
        console.error('Error cargando candidaturas del usuario:', error);
      }
    };

    loadUserApplications();
  }, [user?.id]);

  // Cargar presupuestos del usuario
  useEffect(() => {
    const loadUserBudgetRequests = async () => {
      if (!user?.id) {
        setUserBudgetRequests([]);
        return;
      }

      try {
        // 1. Cargar solicitudes + cotizaciones (sin JOIN anidado a businesses)
        const { data: requests, error } = await supabase
          .from('budget_requests')
          .select('id, user_id, category, description, photos, urgency, address, status, created_at, updated_at, budget_quotes(id, price, description, business_id, status)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        // 2. Recoger todos los business_ids de las cotizaciones
        const businessIds = [...new Set(
          (requests || []).flatMap(r => (r.budget_quotes || []).map(q => q.business_id)).filter(Boolean)
        )];

        // 3. Cargar nombres de negocios en una sola query separada
        let businessNames = {};
        let businessInfo = {};
        if (businessIds.length > 0) {
          const { data: businesses } = await supabase
            .from('businesses')
            .select('id, name, phone, rating, review_count, is_verified')
            .in('id', businessIds);
          (businesses || []).forEach(b => { businessNames[b.id] = b.name; businessInfo[b.id] = b; });
        }

        // 4. Transformar al formato esperado por MyBudgetRequestsScreen
        const transformed = (requests || []).map(request => ({
          id: request.id,
          category: request.category,
          description: request.description,
          urgency: request.urgency,
          address: request.address,
          photos: request.photos || [],
          status: request.status,
          createdAt: request.created_at,
          responses: (request.budget_quotes || []).map(quote => ({
            id: quote.id,
            businessId: quote.business_id,
            businessName: businessNames[quote.business_id] || 'Negocio',
            price: quote.price,
            message: quote.description,
            status: quote.status,
            phone: businessInfo[quote.business_id]?.phone || '',
            rating: businessInfo[quote.business_id]?.rating != null ? Number(businessInfo[quote.business_id].rating) : null,
            reviews: businessInfo[quote.business_id]?.review_count || 0,
            verified: !!businessInfo[quote.business_id]?.is_verified,
          })),
        }));

        setUserBudgetRequests(transformed);
      } catch (error) {
        console.error('Error cargando solicitudes de presupuesto:', error);
      }
    };

    loadUserBudgetRequests();
  }, [user?.id]);

  // Toast notifications
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ isVisible: true, message, type });
  };
  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Animación de transición entre páginas
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);

  useEffect(() => {
    // Escuchar evento de instalación PWA
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostrar banner solo si no se ha instalado y no se ha rechazado antes
      const dismissed = localStorage.getItem('pwaInstallDismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detectar si ya está instalado
    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      showToast(SUCCESS_MESSAGES.saved, 'success');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Detectar parámetro de URL para abrir perfil de negocio, oferta, empleo o pantalla directa
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    // También /negocio/<nombre>-<id> (fichas para Google) por si se abre dentro de la app
    const negocioPath = window.location.pathname.match(/^\/negocio\/(?:[^/]*-)?(\d+)\/?$/);
    const negocioId = urlParams.get('negocio') || (negocioPath ? negocioPath[1] : null);
    const ofertaId = urlParams.get('oferta');
    const empleoId = urlParams.get('empleo');
    const navTo = urlParams.get('nav');
    // El ref se actualiza ya: si la sesión se restaura antes del siguiente render, el aviso de
    // INITIAL_SESSION vería todavía 'login' y mandaría a Inicio (los enlaces de los avisos push
    // con ?nav=... acababan en Inicio al abrir la app en frío).
    const deepLinkPage = negocioId ? 'business' : ofertaId ? 'coupon' : empleoId ? 'job-detail' : navTo;
    if (deepLinkPage) currentPageRef.current = deepLinkPage;

    if (negocioId) {
      const params = { id: parseInt(negocioId) };
      setCurrentPage('business');
      setPageParams(params);
      // Mantenemos la URL ?negocio=ID en la barra para que sea compartible
      window.history.replaceState({ page: 'business', params }, '', `?negocio=${negocioId}`);
    } else if (ofertaId) {
      const params = { id: ofertaId };
      setCurrentPage('coupon');
      setPageParams(params);
      window.history.replaceState({ page: 'coupon', params }, '', `?oferta=${ofertaId}`);
    } else if (empleoId) {
      const params = { id: empleoId };
      setCurrentPage('job-detail');
      setPageParams(params);
      window.history.replaceState({ page: 'job-detail', params }, '', `?empleo=${empleoId}`);
    } else if (navTo) {
      setCurrentPage(navTo);
      setPageParams({});
      window.history.replaceState({ page: navTo, params: {} }, '', `#${navTo}`);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwaInstallDismissed', 'true');
  };

  // Guardar/quitar cupón
  const toggleSaveCoupon = (coupon) => {
    setSavedCoupons(prev => {
      const exists = prev.find(c => c.id === coupon.id);
      if (exists) {
        showToast('Cupón eliminado de guardados', 'info');
        return prev.filter(c => c.id !== coupon.id);
      } else {
        showToast(SUCCESS_MESSAGES.saved, 'success');
        return [...prev, { ...coupon, savedAt: new Date().toISOString() }];
      }
    });
  };

  // Verificar si un cupón está guardado
  const isCouponSaved = (couponId) => savedCoupons.some(c => c.id === couponId);

  // Ofertas de empleo creadas por el propietario
  const [userJobOffers, setUserJobOffers] = useState([]);

  // Crear oferta de empleo
  const createJobOffer = async (jobData) => {
    if (!businessData?.id) {
      showToast('Error: No se encontró el negocio', 'error');
      return;
    }
    if (businessData?.verification_status !== 'approved') {
      showToast('Tu negocio debe estar aprobado para publicar empleos', 'warning');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          business_id: businessData.id,
          title: jobData.title,
          description: jobData.description,
          salary_min: jobData.salaryMin || null,
          salary_max: jobData.salaryMax || null,
          salary_note: jobData.salaryNote || null,
          type: jobData.type,
          contract: jobData.contract,
          modality: jobData.modality,
          location: jobData.location || businessData.address,
          address: jobData.address || businessData.address,
          requirements: jobData.requirements || [],
          benefits: jobData.benefits || [],
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;


      // Agregar al estado local con formato UI
      const newJob = {
        id: data.id,
        title: data.title,
        type: data.type,
        salary: data.salary_min && data.salary_max
          ? `${(data.salary_min / 1000).toFixed(0)}-${(data.salary_max / 1000).toFixed(0)}k €/año`
          : data.salary_note || 'A convenir',
        location: data.location,
        description: data.description,
        requirements: data.requirements || [],
        benefits: data.benefits || [],
        createdAt: data.created_at,
        status: 'active',
        applications: 0,
        postedAgo: 'Ahora',
      };

      setUserJobOffers(prev => [newJob, ...prev]);

      addNotification({
        type: 'job',
        title: '¡Oferta de empleo publicada!',
        message: `Tu oferta "${jobData.title}" ya está visible para los candidatos`,
        icon: 'Briefcase',
        iconBg: 'bg-green-500',
        actionRoute: 'business-jobs',
      });

      showToast(SUCCESS_MESSAGES.created, 'success');
      return data;
    } catch (error) {
      showToast('Error al publicar el empleo', 'error');
      throw error;
    }
  };

  // Eliminar oferta de empleo
  const deleteJobOffer = async (jobId) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)
        .eq('business_id', businessData?.id); // Seguridad: solo puede borrar sus propios empleos

      if (error) throw error;

      setUserJobOffers(prev => prev.filter(j => j.id !== jobId));
      showToast(SUCCESS_MESSAGES.deleted, 'success');
    } catch (error) {
      showToast('Error al eliminar el empleo', 'error');
    }
  };

  // Configuración del usuario
  const [userSettings, setUserSettings] = useState({ pushEnabled: false });

  // Actualizar configuración
  const updateSettings = (newSettings) => {
    setUserSettings(newSettings);
  };

  // Agregar notificación
  const addNotification = (notification) => {
    const newNotification = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: 'Ahora',
      isRead: false,
      ...notification,
      isLocal: true, // solo existe en pantalla: no hay que borrarla de la base de datos
    };
    setDynamicNotifications(prev => [newNotification, ...prev]);
  };

  // Track analytics events (no bloqueante)
  const trackAnalyticsEvent = async (businessId, eventType, metadata = {}) => {
    if (!businessId) return;

    try {
      await supabase.from('business_analytics').insert({
        business_id: businessId,
        user_id: user?.id || null,
        event_type: eventType,
        metadata: metadata
      });
    } catch (error) {
      // No mostrar error al usuario, tracking es no crítico
    }
  };

  // Construye la URL a mostrar para una página dada. Para detalles
  // compartibles usamos query params canónicos (?oferta, ?negocio, ?empleo)
  // que coinciden con los deep links que la app ya sabe abrir.
  const buildUrlFor = (page, params = {}) => {
    if (page === 'coupon' && params.id) return `?oferta=${params.id}`;
    if (page === 'business' && params.id) return `?negocio=${params.id}`;
    if (page === 'job-detail' && params.id) return `?empleo=${params.id}`;
    return `#${page}`;
  };

  const navigate = (page, params = {}, addToHistory = true) => {
    // Activar animación de salida
    setIsPageTransitioning(true);

    // Esperar a que termine la animación de salida, luego cambiar página
    setTimeout(() => {
      setCurrentPage(page);
      setPageParams(params);
      scrollToTop();

      // Añadir al historial del navegador para que funcione el botón atrás
      if (addToHistory) {
        window.history.pushState({ page, params }, '', buildUrlFor(page, params));
      }

      // Desactivar transición para mostrar la nueva página
      setIsPageTransitioning(false);
    }, 150);
  };

  // Mantener userRef sincronizado para usarlo en handlers de eventos sin stale closures
  useEffect(() => { userRef.current = user; }, [user?.id]);

  // Manejar botón atrás del navegador/móvil
  useEffect(() => {
    const AUTH_PAGES = ['login', 'register', 'forgot-password', 'reset-password'];
    const MAIN_TABS = ['home', 'map', 'offers', 'favorites', 'profile'];

    const handlePopState = (event) => {
      if (event.state && event.state.page) {
        const targetPage = event.state.page;

        // Si hay usuario logueado y la página target es de auth → bloquear
        if (AUTH_PAGES.includes(targetPage) && userRef.current) {
          window.history.pushState({ page: 'home', params: {} }, '', '#home');
          return;
        }

        // Si la página target es un tab principal y hay usuario → no navegar (ya estamos en raíz)
        if (MAIN_TABS.includes(targetPage) && userRef.current) {
          window.history.replaceState({ page: targetPage, params: {} }, '', `#${targetPage}`);
          return;
        }

        // Navegar a la página anterior sin añadir al historial
        navigate(targetPage, event.state.params || {}, false);
      }
      // Si no hay estado (file pickers nativos en iOS/Android), ignorar
    };

    // Añadir estado inicial al historial sólo si aún no hay state
    // (el deep link useEffect ya pudo dejar un state válido con su URL canónica)
    if (!window.history.state || !window.history.state.page) {
      window.history.replaceState({ page: currentPage, params: pageParams }, '', `#${currentPage}`);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Función para registrar un negocio (pasa a estado pendiente)
  const registerBusiness = async (data = tempBusinessData) => {
    if (!user?.id) {
      showToast('Debes iniciar sesión primero', 'error');
      throw new Error('Usuario no autenticado');
    }


    try {
      // Preparar datos para insertar
      const businessToInsert = {
        owner_id: user.id,
        name: data?.name || 'Mi Negocio',
        // cif: campo no existe en la tabla (se elimina)
        category_id: data?.category ? parseInt(data.category) : null,
        subcategory: data?.subcategory || '',
        address: data?.address || '',
        neighborhood: data?.barrio || '',
        description: '',
        phone: '',
        // verification_status lo fija la base de datos: 'draft' (borrador) hasta que se envía la solicitud
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };


      // Crear negocio en Supabase
      const { data: newBusiness, error } = await supabase
        .from('businesses')
        .insert(businessToInsert)
        .select()
        .single();

      if (error) {
        throw error;
      }


      setBusinessStatus(newBusiness?.verification_status === 'draft' ? 'draft' : 'pending');
      setBusinessData(newBusiness);
      showToast('¡Empezamos! Completa los 4 pasos y envía la solicitud', 'success');

      return newBusiness;
    } catch (error) {
      console.error('Error al registrar negocio:', error);
      showToast('No se pudo registrar el negocio. Inténtalo de nuevo.', 'error');
      throw error; // Re-lanzar para que BusinessVerificationScreen lo maneje
    }
  };

  // Función para validar el negocio (para demo/testing)
  const validateBusiness = () => {
    setBusinessStatus('validated');
    // Marcar el negocio como verificado
    setBusinessData(prev => ({ ...prev, isVerified: true }));
    addNotification({
      type: 'business',
      title: '¡Tu negocio ha sido verificado!',
      message: 'Enhorabuena, ya puedes gestionar tu negocio desde el Panel de Propietario',
      icon: 'BadgeCheck',
      iconBg: 'bg-green-500',
      actionRoute: 'profile',
    });
  };

  // Función para rechazar el negocio (para demo/testing)
  const rejectBusiness = () => {
    setBusinessStatus('rejected');
    addNotification({
      type: 'business',
      title: 'Solicitud de negocio rechazada',
      message: 'No pudimos verificar tu documentación. Por favor, revisa los datos e inténtalo de nuevo.',
      icon: 'X',
      iconBg: 'bg-red-500',
      actionRoute: 'profile',
    });
  };

  // Función para actualizar datos del negocio
  const updateBusiness = (data) => {
    setBusinessData(prev => ({ ...prev, ...data }));
    const statusMap = { approved: 'validated', pending: 'pending', rejected: 'rejected', draft: 'draft' };
    if (data?.verification_status && statusMap[data.verification_status]) {
      setBusinessStatus(statusMap[data.verification_status]);
    }
  };

  // Función para eliminar el negocio permanentemente
  const deleteBusiness = async () => {
    if (!businessData?.id) return;
    try {
      // Borrar datos relacionados (ignorar errores individuales para continuar con el negocio)
      await supabase.from('offers').delete().eq('business_id', businessData.id);
      await supabase.from('jobs').delete().eq('business_id', businessData.id);
      await supabase.from('reviews').delete().eq('business_id', businessData.id);
      await supabase.from('favorites').delete().eq('business_id', businessData.id);
      await supabase.from('notifications').delete().eq('data->business_id', businessData.id);
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessData.id)
        .eq('owner_id', user?.id);
      if (error) throw error;
      // Limpiar todo el estado relacionado al negocio
      setBusinessData(null);
      setBusinessStatus(null);
      setUserOffers([]);
      setUserJobOffers([]);
      showToast('Negocio eliminado permanentemente', 'info');
      navigate('profile');
    } catch (error) {
      showToast('Error al eliminar el negocio', 'error');
    }
  };

  // Función para crear una nueva oferta
  const createOffer = async (offerData) => {
    if (!businessData?.id) {
      showToast('Error: No se encontró el negocio', 'error');
      return;
    }
    if (businessData?.verification_status !== 'approved') {
      showToast('Tu negocio debe estar aprobado para crear ofertas', 'warning');
      return;
    }

    // Límite de 1 oferta cada 7 días. Lo garantiza la base de datos (offer_publish_block_reason y el
    // trigger offers_enforce_rules); aquí solo se avisa antes, con la fecha si se conoce.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentOffers } = await supabase
      .from('offers')
      .select('created_at')
      .eq('business_id', businessData.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    const { data: blockReason, error: blockError } = await supabase
      .rpc('offer_publish_block_reason', { p_business_id: businessData.id });
    if (blockError) console.error('offer_publish_block_reason:', blockError);
    if (recentOffers?.length > 0 || blockReason === 'offer_weekly_limit') {
      showToast(offerLimitMessage(recentOffers?.[0]?.created_at), 'warning');
      return;
    }
    if (blockReason === 'offer_business_not_approved') {
      showToast('Tu negocio debe estar aprobado para crear ofertas', 'warning');
      return;
    }

    try {
      // Calcular fecha de expiración
      const startsAt = new Date();
      const expiresAt = new Date();
      if (offerData.isFlash) {
        expiresAt.setHours(expiresAt.getHours() + 8); // Flash = 8 horas
      } else {
        expiresAt.setDate(expiresAt.getDate() + 5); // Normal = 5 días
      }

      const { data, error } = await supabase
        .from('offers')
        .insert({
          business_id: businessData.id,
          title: offerData.title,
          description: offerData.description,
          discount_type: offerData.discountType,
          // Solo guardar valor numérico si es porcentaje
          discount_value: offerData.discountType === 'percentage' ? (offerData.discount || null) : null,
          discount_label: offerData.discountLabel ||
                         (offerData.discountType === '2x1' ? '2x1' :
                          offerData.discountType === 'free' ? 'GRATIS' : null),
          original_price: offerData.originalPrice || null,
          discounted_price: offerData.discountedPrice || null,
          image: offerData.image || null,
          is_flash: offerData.isFlash || false,
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active',
          is_visible: true,
          max_uses: offerData.isLimited ? offerData.limitedUnits : null,
        })
        .select()
        .single();

      if (error) throw error;


      // Agregar al estado local con formato UI
      const newOffer = {
        id: data.id,
        title: data.title,
        description: data.description,
        discount: offerData.discountType === 'percentage'
          ? `-${offerData.discount}%`
          : offerData.discountType === '2x1'
          ? '2x1'
          : offerData.discountType === 'free'
          ? 'GRATIS'
          : data.discount_label || 'Oferta',
        originalPrice: data.original_price,
        discountedPrice: data.discounted_price,
        discountType: data.discount_type,
        isFlash: data.is_flash,
        code: data.code,
        conditions: data.conditions,
        timeLeft: offerData.isFlash ? 'menos de 8h' : '5 días',
        expiresSoon: offerData.isFlash,
        createdAt: data.created_at,
        status: 'active',
        isVisible: true,
        redemptions: 0,
      };

      setUserOffers(prev => [newOffer, ...prev]);

      // Notificar al propietario
      addNotification({
        type: 'offer',
        title: offerData.isFlash ? '¡Oferta Flash publicada!' : '¡Oferta publicada!',
        message: `Tu oferta "${offerData.title}" ya está visible para los usuarios`,
        icon: offerData.isFlash ? 'Zap' : 'Tag',
        iconBg: offerData.isFlash ? 'bg-amber-500' : 'bg-primary',
        actionRoute: 'business-offers',
      });

      showToast(SUCCESS_MESSAGES.created, 'success');
      return data;
    } catch (error) {
      console.error('Error creando oferta:', error);
      const reason = String(error?.message || '');
      if (reason.includes('offer_weekly_limit')) showToast(offerLimitMessage(), 'warning');
      else if (reason.includes('offer_business_not_approved')) showToast('Tu negocio debe estar aprobado para crear ofertas', 'warning');
      else showToast('Error al publicar la oferta', 'error');
      throw error;
    }
  };

  // Pausar o reactivar oferta
  const toggleOfferVisibility = async (offerId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const newVisibility = newStatus === 'active';

      const { error } = await supabase
        .from('offers')
        .update({
          status: newStatus,
          is_visible: newVisibility
        })
        .eq('id', offerId)
        .eq('business_id', businessData?.id);

      if (error) throw error;

      setUserOffers(prev => prev.map(offer =>
        offer.id === offerId
          ? { ...offer, status: newStatus, isVisible: newVisibility }
          : offer
      ));

      showToast(newVisibility ? 'Oferta reactivada' : 'Oferta pausada', 'success');
    } catch (error) {
      showToast('Error al cambiar estado de la oferta', 'error');
    }
  };

  // Responder a solicitud de presupuesto
  const respondToBudgetRequest = async (requestId, quoteData) => {
    if (!businessData?.id) {
      showToast('Error: No se encontró el negocio', 'error');
      return;
    }

    try {
      // 1. Insertar la cotización
      const { data, error } = await supabase
        .from('budget_quotes')
        .insert({
          budget_request_id: requestId,
          business_id: businessData.id,
          price: parseFloat(quoteData.price),
          description: quoteData.message,
          estimated_duration: quoteData.estimatedTime || null,
        })
        .select()
        .single();

      if (error) throw error;


      // 3. El estado de la solicitud lo gestiona el cliente; el negocio solo
      //    añade su cotización (antes aquí había un UPDATE que RLS bloqueaba en silencio)


      // 5. Actualizar estado local
      setIncomingBudgetRequests(prev => prev.map(req =>
        req.id === requestId
          ? { ...req, status: 'replied', myQuote: { price: data.price, message: data.description } }
          : req
      ));

      showToast(SUCCESS_MESSAGES.sent, 'success');

      // 6. Notificación local para el propietario
      addNotification({
        type: 'budget',
        title: 'Presupuesto enviado',
        message: `Tu presupuesto de ${quoteData.price}€ ha sido enviado al cliente`,
        icon: 'CheckCircle2',
        iconBg: 'bg-green-500',
        actionRoute: 'incoming-budget-requests',
      });

      return data;
    } catch (error) {
      showToast('Error al enviar el presupuesto', 'error');
      throw error;
    }
  };

  // Aceptar un presupuesto y notificar al negocio
  const acceptBudgetQuote = async (requestId, quote) => {
    if (!user?.id) {
      showToast(ERROR_MESSAGES.unauthorized, 'warning');
      return;
    }

    try {
      // 1. Contar cuántos quotes hay en este request (sin JOIN anidado: viola regla del proyecto)
      const { data: allQuotes, error: quotesError } = await supabase
        .from('budget_quotes')
        .select('id')
        .eq('budget_request_id', requestId);

      if (quotesError) console.error('Error cargando quotes:', quotesError);

      const rejectedCount = ((allQuotes || []).filter(q => q.id !== quote.id)).length;

      // 2. Marcar el budget_request como aceptado
      const { error: updateError } = await supabase
        .from('budget_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // 3. Datos del negocio aceptado (query separada — sin JOIN anidado)
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('name, owner_id')
        .eq('id', quote.businessId)
        .single();

      if (businessError) console.error('Error cargando negocio:', businessError);

      // 4. Notificar a los demás negocios
      const { error: notifyError } = await supabase.rpc('notify_budget_quote_result', {
        p_budget_request_id: requestId,
        p_accepted_quote_id: quote.id,
      });

      if (notifyError) throw notifyError;

      const message = rejectedCount > 0
        ? `¡Presupuesto de ${business?.name || 'negocio'} aceptado! ${rejectedCount} negocio${rejectedCount > 1 ? 's' : ''} notificado${rejectedCount > 1 ? 's' : ''}.`
        : `¡Presupuesto de ${business?.name || 'negocio'} aceptado!`;
      showToast(message, 'success');
    } catch (error) {
      console.error('Error aceptando presupuesto:', error);
      showToast('Error al aceptar el presupuesto', 'error');
    }
  };

  // Función para toggle de favoritos con persistencia en Supabase
  const toggleFavorite = async (businessId) => {
    if (!user?.id) {
      showToast('Crea tu cuenta gratis para guardar favoritos', 'info');
      handleGuestAuth('register', currentPage, pageParams);
      return;
    }

    const isFav = userFavorites.includes(businessId);

    // Optimistic update
    setUserFavorites(prev =>
      isFav ? prev.filter(id => id !== businessId) : [...prev, businessId]
    );

    try {
      if (isFav) {
        // Eliminar de Supabase
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('business_id', businessId);

        if (error) throw error;
        showToast('Eliminado de favoritos', 'info');
      } else {
        // Añadir a Supabase
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, business_id: businessId });

        if (error) throw error;
        showToast('¡Añadido a favoritos!', 'success');
      }
    } catch (error) {
      // Revert optimistic update on error
      setUserFavorites(prev =>
        isFav ? [...prev, businessId] : prev.filter(id => id !== businessId)
      );
      showToast('Error al actualizar favoritos', 'error');
    }
  };

  // Verificar si un negocio es favorito
  const isFavorite = (businessId) => userFavorites.includes(businessId);

  // Función para enviar solicitud de presupuesto
  const submitBudgetRequest = async (requestData) => {
    try {

      // Guardar en Supabase
      // Usar el nombre de categoría (no el ID) para que coincida con businesses.subcategory en la RLS
      const categoryToStore = requestData.categoryName || requestData.category;

      const { data, error } = await supabase
        .from('budget_requests')
        .insert({
          user_id: user?.id,
          category: categoryToStore,
          description: requestData.description,
          photos: requestData.photos || [],
          urgency: requestData.urgency,
          address: requestData.address,
          phone: requestData.phone,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;


      // Actualizar state local
      const newRequest = {
        id: data.id,
        ...requestData,
        responses: [],
      };
      setUserBudgetRequests(prev => [newRequest, ...prev]);

      // Notificar al usuario que su solicitud fue enviada
      addNotification({
        type: 'budget',
        title: 'Solicitud de presupuesto enviada',
        message: `Tu solicitud de ${requestData.categoryName?.toLowerCase() || 'servicio'} ha sido enviada a ${requestData.businessCount} empresas`,
        icon: 'ClipboardList',
        iconBg: 'bg-primary',
        actionRoute: 'my-budget-requests',
      });

      return data;
    } catch (error) {
      showToast('No se pudo enviar la solicitud. Inténtalo de nuevo.', 'error');
      throw error;
    }

  };

  // Invitado: lleva a login/registro y recuerda adónde quería ir
  function handleGuestAuth(mode, page, params = {}) {
    if (page && !['login', 'register', 'forgot-password', 'reset-password'].includes(page)) {
      saveAuthRedirect(page, params);
    }
    navigate(mode === 'register' ? 'register' : 'login');
  }

  // Los invitados en pantallas restringidas ven GuestGate/GuestTeaser, que ya tienen su <h1>
  const pageHasOwnH1 = (!user && !GUEST_PAGES.has(currentPage)) || PAGES_WITH_OWN_H1.has(currentPage);
  const pageHeading = currentPage === 'home'
    ? 'Cornellà Local: comercios, ofertas y servicios de Cornellà de Llobregat'
    : (PAGE_TITLES[currentPage] || 'Cornellà Local');

  const renderPage = () => {
    if (!user) {
      if (GUEST_TEASER_PAGES.has(currentPage)) {
        return <GuestTeaser kind={currentPage} id={pageParams.id} params={pageParams} onNavigate={navigate} onAuth={handleGuestAuth} />;
      }
      if (!GUEST_PAGES.has(currentPage)) {
        return <GuestGate page={currentPage} onNavigate={navigate} onAuth={handleGuestAuth} />;
      }
    }
    switch (currentPage) {
      case 'home':
        return <HomePage showToast={showToast} onNavigate={navigate} userFavorites={userFavorites} toggleFavorite={toggleFavorite} isFavorite={isFavorite} userOffers={userOffers} notifications={dynamicNotifications} params={pageParams} />;
      case 'budget-request':
        return <BudgetRequestScreen onNavigate={navigate} onSubmitRequest={submitBudgetRequest} showToast={showToast} onAddNotification={addNotification} user={user} />;
      case 'direct-budget':
        return <DirectBudgetScreen onNavigate={navigate} businessId={pageParams.businessId} businessName={pageParams.businessName} user={user} showToast={showToast} onSubmitRequest={submitBudgetRequest} />;
      case 'flash-offers':
        return <FlashOffersScreen onNavigate={navigate} userOffers={userOffers} />;
      case 'offers':
        return <OffersPage onNavigate={navigate} user={user} userOffers={userOffers} initialTab={pageParams.tab || 'offers'} activeJobs={getVisibleJobs()} loadingJobs={loadingJobs} getJobDaysRemaining={getJobDaysRemaining} isBusinessOwner={businessStatus === 'validated'} notifications={dynamicNotifications} />;
      case 'favorites':
        return <FavoritesPage onNavigate={navigate} userFavorites={userFavorites} toggleFavorite={toggleFavorite} />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} businessStatus={businessStatus} businessData={businessData} validateBusiness={validateBusiness} savedCoupons={savedCoupons} user={user} userOffers={userOffers} userJobOffers={userJobOffers} incomingBudgetRequests={incomingBudgetRequests} userJobApplications={userJobApplications} onDeleteBusiness={deleteBusiness} showToast={showToast} />;
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={navigate} user={user} />;
      case 'admin-all-businesses':
        return <AdminAllBusinessesScreen onNavigate={navigate} showToast={showToast} />;
      case 'admin-approve-businesses':
        return <BusinessApprovalScreen onNavigate={navigate} user={user} showToast={showToast} />;
      case 'admin-users':
        return <AdminUsersScreen onNavigate={navigate} showToast={showToast} />;
      case 'admin-support':
        return <AdminSupportScreen onNavigate={navigate} />;
      case 'business-analytics':
        return <BusinessAnalyticsScreen onNavigate={navigate} user={user} businessData={businessData} />;
      case 'admin-reports':
        return <ReportsScreen onNavigate={navigate} user={user} showToast={showToast} />;
      case 'admin-services':
        return <AdminServicesScreen onNavigate={navigate} showToast={showToast} />;
      case 'admin-instagram':
        return <AdminInstagramScreen onNavigate={navigate} showToast={showToast} />;
      case 'admin-reviews':
        return <AdminReviewsScreen onNavigate={navigate} showToast={showToast} />;
      case 'business':
        return <BusinessDetailPage businessId={pageParams.id} onNavigate={navigate} returnTo={pageParams.returnTo} returnParams={pageParams.returnParams} userFavorites={userFavorites} toggleFavorite={toggleFavorite} isFavorite={isFavorite} user={user} trackAnalyticsEvent={trackAnalyticsEvent} showToast={showToast} />;
      case 'coupon':
        return <CouponDetailPage couponId={pageParams.id} onNavigate={navigate} savedCoupons={savedCoupons} toggleSaveCoupon={toggleSaveCoupon} isCouponSaved={isCouponSaved} user={user} showToast={showToast} />;
      case 'category':
        return <CategoryDetailPage categoryId={pageParams.id} onNavigate={navigate} />;
      case 'subcategory':
        return <SubcategoryDetailPage categoryId={pageParams.categoryId} subcategoryId={pageParams.subcategoryId} onNavigate={navigate} userFavorites={userFavorites} toggleFavorite={toggleFavorite} />;
      case 'login':
        return <LoginScreen onNavigate={navigate} setUser={setUser} />;
      case 'register':
        return <RegisterScreen onNavigate={navigate} />;
      case 'forgot-password':
        return <ForgotPasswordScreen onNavigate={navigate} showToast={showToast} />;
      case 'reset-password':
        return <ResetPasswordScreen onNavigate={navigate} showToast={showToast} />;
      case 'owner-welcome':
        navigate('business-data');
        return null;
      case 'user-reviews':
        return <UserReviewsScreen onNavigate={navigate} user={user} showToast={showToast} />;
      case 'edit-profile':
        return <EditProfileScreen onNavigate={navigate} user={user} setUser={setUser} showToast={showToast} />;
      case 'user-jobs':
        return <UserJobsScreen onNavigate={navigate} user={user} showToast={showToast} />;
      case 'job-detail':
        return <JobDetailPage
          jobId={pageParams.id}
          onNavigate={navigate}
          showToast={showToast}
          onAddNotification={addNotification}
          activeJob={activeJobs.find(j => j.id === pageParams.id)}
          markJobAsHired={markJobAsHired}
          renewJob={renewJob}
          deleteJob={deleteJob}
          getJobDaysRemaining={getJobDaysRemaining}
          isBusinessOwner={businessStatus === 'validated'}
          userBusinessId={businessData?.id}
          user={user}
        />;
      case 'my-budget-requests':
        return <MyBudgetRequestsScreen onNavigate={navigate} userBudgetRequests={userBudgetRequests} onAddNotification={addNotification} onAcceptQuote={acceptBudgetQuote} showToast={showToast} initialSelectedRequestId={pageParams.selectedRequestId} />;
      case 'incoming-budget-requests':
      case 'business-budget':
        return <IncomingBudgetRequestsScreen onNavigate={navigate} businessData={businessData} showToast={showToast} onAddNotification={addNotification} requests={incomingBudgetRequests} onSendQuote={respondToBudgetRequest} />;
      case 'business-offers':
        return <BusinessOffersScreen onNavigate={navigate} userOffers={userOffers} toggleVisibility={toggleOfferVisibility} showToast={showToast} />;
      case 'business-jobs':
        return <BusinessJobsScreen onNavigate={navigate} userJobOffers={userJobOffers} deleteJobOffer={deleteJobOffer} jobApplications={jobApplications} />;
      case 'business-candidates':
        return <BusinessCandidatesScreen onNavigate={navigate} user={user} businessData={businessData} showToast={showToast} />;
      case 'create-job-offer':
        return <CreateJobOfferScreen onNavigate={navigate} businessData={businessData} onCreateJobOffer={createJobOffer} />;
      case 'terms':
        return <TermsScreen onNavigate={navigate} fromRegister={false} />;
      case 'terms-register':
        return <TermsScreen onNavigate={navigate} fromRegister={true} />;
      case 'notifications':
        return <NotificationsScreen onNavigate={navigate} dynamicNotifications={dynamicNotifications} user={user} onUpdateNotifications={setDynamicNotifications} showToast={showToast} />;
      case 'business-data':
        return <BusinessDataScreen onNavigate={navigate} onSaveBusinessData={setTempBusinessData} onRegisterBusiness={registerBusiness} user={user} businessData={businessData} showToast={showToast} />;
      case 'business-verification':
        return <BusinessVerificationScreen onNavigate={navigate} onRegisterBusiness={registerBusiness} user={user} />;
      case 'registration-success':
        return <RegistrationSuccessScreen onNavigate={navigate} />;
      case 'business-appeal':
        return <BusinessAppealScreen onNavigate={navigate} businessData={businessData} user={user} showToast={showToast} />;
      case 'edit-business':
        return <EditBusinessScreen onNavigate={navigate} businessData={businessData} onUpdateBusiness={updateBusiness} user={user} showToast={showToast} initialStep={pageParams.initialStep} />;
      case 'validate-code':
        return <ValidateCodeScreen onNavigate={navigate} user={user} showToast={showToast} />;
      case 'owner-dashboard':
        return (
          <BusinessOwnerDashboard
            onNavigate={navigate}
            businessData={businessData}
            userJobOffers={userJobOffers}
            userOffers={userOffers}
            incomingBudgetRequests={incomingBudgetRequests}
            jobApplications={jobApplications}
            onDeleteBusiness={deleteBusiness}
            showToast={showToast}
          />
        );
      case 'business-stats':
        return <BusinessStatsScreen
          onNavigate={navigate}
          businessData={businessData}
          userOffers={userOffers}
          userJobOffers={userJobOffers}
          jobApplications={jobApplications}
          incomingBudgetRequests={incomingBudgetRequests}
        />;
      case 'create-offer':
        return <CreateOfferScreen onNavigate={navigate} businessData={businessData} onCreateOffer={createOffer} user={user} showToast={showToast} />;
      case 'settings':
        return <SettingsScreen
          onNavigate={navigate}
          userSettings={userSettings}
          updateSettings={updateSettings}
          onResetOnboarding={() => {
            localStorage.removeItem('hasSeenOnboarding');
            setHasSeenOnboarding(false);
          }}
          onShowNotificationModal={() => setShowNotificationModal(true)}
          user={user}
          showToast={showToast}
          onRequestPushPermission={requestPushPermission}
          onDisablePush={disablePushNotifications}
        />;
      case 'privacy-policy':
        return <PrivacyPolicyScreen onNavigate={navigate} />;
      case 'legal-notice':
        return <LegalNoticeScreen onNavigate={navigate} />;
      case 'cookies-policy':
        return <CookiesPolicyScreen onNavigate={navigate} showToast={showToast} />;
      case 'contact-support':
        return <ContactSupportScreen onNavigate={navigate} showToast={showToast} />;
      default:
        return <HomePage showToast={showToast} onNavigate={navigate} notifications={dynamicNotifications} params={pageParams} />;
    }
  };

  // Completar onboarding
  const completeOnboarding = async (enableNotifications = false) => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setHasSeenOnboarding(true);

    if (enableNotifications) {
      const success = await requestPushPermission();
      if (!success) return;

      localStorage.setItem('push-asked', 'true');

      // Activar notificaciones
      setUserSettings(prev => ({
        ...prev,
        pushEnabled: true,
        offerNotifications: true,
        messageNotifications: true,
        reminderNotifications: true,
      }));

      // Mostrar notificación de bienvenida
      addNotification({
        type: 'welcome',
        title: '¡Bienvenido a Cornellà Local!',
        message: 'Gracias por activar las notificaciones. Te avisaremos de ofertas y novedades.',
        icon: 'PartyPopper',
        iconBg: 'bg-primary',
      });

      showToast('¡Notificaciones activadas!', 'success');
    }
  };

  // Activar notificaciones desde el modal
  const handleEnableNotifications = async () => {
    setShowNotificationModal(false);
    localStorage.setItem('push-asked', 'true');

    // Solicitar permiso real de push notifications (Web Push API)
    const success = await requestPushPermission();

    if (success) {
      setUserSettings(prev => ({
        ...prev,
        pushEnabled: true,
        offerNotifications: true,
        messageNotifications: true,
        reminderNotifications: true,
      }));
    }
  };

  // Mostrar loading mientras se verifica la autenticación
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <img
            src="/favicon.png"
            alt="CornellaLocal"
            className="w-20 h-20 rounded-2xl shadow-sm mb-4 mx-auto animate-pulse"
          />
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no ha visto el onboarding, mostrarlo (solo para usuarios autenticados)
  if (!hasSeenOnboarding && user) {
    return (
      <OnboardingScreen
        onComplete={() => completeOnboarding(false)}
        onCompleteWithNotifications={() => completeOnboarding(true)}
      />
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gray-100 lg:bg-[#eef2f8]">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Modal de permisos de notificación */}
      <NotificationPermissionModal
        isOpen={showNotificationModal}
        onClose={() => { setShowNotificationModal(false); localStorage.setItem('push-asked', 'true'); }}
        onEnable={handleEnableNotifications}
        onSkip={() => { setShowNotificationModal(false); localStorage.setItem('push-asked', 'true'); }}
      />

      {/* Banner de instalación PWA */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/favicon.png" alt="CornellaLocal" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-sm">Instalar CornellaLocal</h4>
                <p className="text-xs text-gray-500 mt-0.5">Añade la app a tu pantalla de inicio para acceso rápido</p>
              </div>
              <button aria-label="Cerrar"
                onClick={dismissInstallBanner}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={dismissInstallBanner}
                className="flex-1 h-10 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                Ahora no
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-1 h-10 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Instalar
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => document.getElementById('contenido')?.focus()}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-white focus:text-primary-dark focus:font-bold focus:shadow-lg"
      >
        Saltar al contenido
      </button>

      {/* Escritorio: navegación | app | información. En móvil solo la columna central */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_28rem_minmax(0,1fr)] lg:gap-8">
        <DesktopSidebar user={user} currentPage={currentPage} onNavigate={navigate} onAuth={(mode, page) => handleGuestAuth(mode, page || currentPage, page ? {} : pageParams)} />

        {/* Contenido de la página con animación */}
        <main
          id="contenido"
          tabIndex={-1}
          className={`min-w-0 lg:min-h-screen lg:bg-white lg:shadow-[0_0_40px_rgba(15,23,42,0.08)] transition-opacity duration-150 ease-out focus:outline-none ${
            isPageTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {!pageHasOwnH1 && <h1 className="sr-only">{pageHeading}</h1>}
          {!user && GUEST_PAGES.has(currentPage) && !['login', 'register', 'forgot-password', 'reset-password'].includes(currentPage) && (
            <GuestBanner onAuth={(mode) => handleGuestAuth(mode, currentPage, pageParams)} />
          )}
          <Suspense fallback={<PageLoadingFallback />}>
            {renderPage()}
          </Suspense>
        </main>

        <DesktopAside user={user} onNavigate={navigate} onAuth={(mode, page) => handleGuestAuth(mode, page || currentPage, page ? {} : pageParams)} />
      </div>
      <CookieBanner onNavigate={navigate} />
    </div>
    </ErrorBoundary>
  );
}
