// CornellaLocal - Plataforma de comercio local
import { useState, useEffect, useRef, useMemo, useCallback, Component } from 'react';
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
  ShieldAlert, UserCog, BarChart3, XCircle
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

// ==============================================
// FUNCIONES HELPER
// ==============================================

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
  Sandwich, Utensils, Circle, Droplets, Hand, MousePointerClick
};

const Icon = ({ name, className = "", size = 24 }) => {
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
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const types = {
    success: { bg: 'bg-green-500', icon: 'CheckCircle2' },
    error: { bg: 'bg-red-500', icon: 'AlertCircle' },
    info: { bg: 'bg-blue-500', icon: 'Info' },
    warning: { bg: 'bg-orange-500', icon: 'AlertCircle' },
  };
  const t = types[type] || types.success;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[calc(100%-32px)] animate-in slide-in-from-top fade-in duration-300">
      <div className={`${t.bg} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3`}>
        <Icon name={t.icon} size={20} className="shrink-0" />
        <span className="text-sm font-medium flex-1">{message}</span>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
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
          className="absolute top-6 right-6 z-10 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
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
        <p className="text-center text-xs text-gray-400 mt-6">
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
        isRefreshing ? 'text-primary' : isReady ? 'text-primary' : 'text-gray-400'
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
          <button
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
          <button
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
          <textarea
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
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
          <button
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
            <textarea
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
              <span className="text-xs text-gray-400">
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
          <button
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
                      className={sortBy === option.id ? 'text-primary' : 'text-gray-400'}
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
                  <input
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
                  <input
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

// Navbar inferior reutilizable
const Navbar = ({ currentPage, onNavigate }) => {
  const items = [
    { id: 'home', label: 'Inicio', icon: 'Home' },
    { id: 'budget-request', label: 'Presupuesto', icon: 'ClipboardList' },
    { id: 'offers', label: 'Ofertas', icon: 'Tag' },
    { id: 'favorites', label: 'Favoritos', icon: 'Heart' },
    { id: 'profile', label: 'Perfil', icon: 'User' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 pb-6 pt-3 px-6">
      <div className="flex items-center justify-between">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentPage === item.id
                ? 'text-primary'
                : 'text-gray-400 hover:text-gray-600'
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
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl">
          <img
            src={business.cover_photo || (business.images && business.images[0]) || ''}
            alt={business.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
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
            <button
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
              <span className="text-[10px] text-gray-400">({business.review_count || business.reviews || 0})</span>
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
      <div className="relative aspect-video">
        <img
          src={business.cover_photo || (business.images && business.images[0]) || ''}
          alt={business.name}
          className="w-full h-full object-cover"
        />
        {business.isNew && (
          <span className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
            Nuevo
          </span>
        )}
        <div className="absolute top-3 right-3">
          <button
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
    window.open(url, '_blank');
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
        <div className={`absolute top-2 left-2 ${isExpired ? 'bg-red-500' : 'bg-slate-900/80'} backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1`}>
          <Clock size={12} />
          <span>{timeLeft}</span>
        </div>
        <button
          onClick={handleShareWhatsApp}
          className="absolute top-2 right-2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-md"
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
            <span className="text-[10px] text-gray-400 line-through">{formatCurrency(offer.originalPrice || 0)}</span>
            <span className="text-base font-bold text-primary">
              {offer.discountType === 'free' || offer.discountedPrice === 0
                ? 'GRATIS'
                : formatCurrency(offer.discountedPrice || 0)}
            </span>
          </div>
          <button
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
const barrios = [
  { id: 'centre-riera', name: 'Centre-Riera' },
  { id: 'almeda', name: 'Almeda' },
  { id: 'el-pedro', name: 'El Pedró' },
  { id: 'la-gavarra', name: 'La Gavarra' },
  { id: 'sant-ildefons', name: 'Sant Ildefons' },
  { id: 'fontsanta-fatjo', name: 'Fontsanta-Fatjó' },
];

const HomePage = ({ onNavigate, userFavorites = [], toggleFavorite, isFavorite, userOffers = [], notifications = [], params = {} }) => {
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
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
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
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBusinesses(data || []);
      } catch (error) {
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
        .eq('is_published', true);
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
          .order('expires_at', { ascending: true });

        if (error) throw error;
        setFlashOffers(data || []);
      } catch (error) {
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
      discount: offer.discount_label || offer.discount_value + '%',
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
            className="h-9 object-contain"
          />
        </div>
        <button
          onClick={() => onNavigate('notifications')}
          className="relative p-2 text-slate-800 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Bell size={24} />
          {(notifications?.filter(n => !n.isRead).length || 0) > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 border-2 border-white text-[10px] font-bold text-white">
              {notifications?.filter(n => !n.isRead).length || 0}
            </span>
          )}
        </button>
      </div>
      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
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
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                title="Limpiar todo"
              >
                <X size={18} />
              </button>
            )}
            <button
              onClick={() => setShowBarrioFilter(true)}
              className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors relative ${selectedBarrio ? 'text-primary bg-primary/10' : 'text-gray-400'}`}
              title="Filtrar por barrio"
            >
              <MapPin size={20} />
              {selectedBarrio && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setShowAdvancedFilters(true)}
              className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors relative ${hasActiveFilters ? 'text-primary bg-primary/10' : 'text-gray-400'}`}
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
                  <button
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
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <History size={14} />
                    Búsquedas recientes
                  </h4>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
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
                      <History size={16} className="text-gray-400" />
                      <span className="text-sm text-slate-700">{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Búsquedas populares */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
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
              <Search className="text-gray-400" size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Sin resultados</h3>
            <p className="text-sm text-gray-500">
              {selectedBarrio
                ? `No hay comercios en ${barrios.find(b => b.id === selectedBarrio)?.name}${searchQuery ? ` con "${searchQuery}"` : ''}`
                : `No encontramos "${searchQuery}"`
              }
            </p>
            <p className="text-xs text-gray-400 mt-2">Prueba con otros términos o barrios</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Categorías encontradas */}
            {filteredCategories.length > 0 && (
              <div className="p-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categorías</h4>
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
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ofertas</h4>
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
                          <span className="text-xs text-gray-400">• {offer.timeLeft}</span>
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
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Negocios ({filteredBusinesses.length})</h4>
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
                        <img src={business.cover_photo || (business.images && business.images[0]) || ''} alt={business.name} loading="lazy" className="w-full h-full object-cover" />
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
                        <span className="text-xs text-gray-400">{business.distance}</span>
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

    <main className="flex flex-col gap-6 pt-4">
      {/* Indicadores de filtros activos */}
      {(showOnlyOpen || (sortByDistance && userLocation)) && (
        <div className="px-4 flex gap-2 flex-wrap">
          {showOnlyOpen && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              <Circle size={8} className="fill-green-500 animate-pulse" />
              Abiertos ahora
              <button onClick={() => setShowOnlyOpen(false)} className="ml-1 hover:text-green-900">
                <X size={12} />
              </button>
            </div>
          )}
          {sortByDistance && userLocation && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              <Navigation size={12} className="fill-blue-500" />
              Por distancia
              <button onClick={() => { setSortByDistance(false); setUserLocation(null); }} className="ml-1 hover:text-blue-900">
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
          <button
            onClick={() => onNavigate('flash-offers')}
            className="text-primary text-sm font-semibold hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            Ver todos
            <ChevronRight size={16} />
          </button>
        </div>
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
              <button
                key={business.id}
                onClick={() => onNavigate('business', { id: business.id })}
                className="w-full bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group text-left"
              >
                {/* Image */}
                <div className="relative h-44 bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden">
                  {(business.cover_photo || (business.images && business.images[0])) && (
                    <img
                      src={business.cover_photo || business.images[0]}
                      alt={business.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  {/* Badge "NUEVO" */}
                  <div className="absolute top-3 left-3 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg">
                    <Sparkles size={14} />
                    NUEVO
                  </div>

                  {/* Badge Estado (Abierto/Cerrado) */}
                  {(() => {
                    const status = getBusinessStatus(business.opening_hours);
                    const statusStyles = {
                      open: 'bg-green-500 text-white',
                      closed: 'bg-gray-600 text-white',
                      closing_soon: 'bg-orange-500 text-white',
                      unknown: 'bg-gray-400 text-white'
                    };
                    return (
                      <div className={`absolute bottom-3 left-3 px-3 py-1.5 ${statusStyles[status.status]} text-xs font-bold rounded-full shadow-lg backdrop-blur-sm`}>
                        {status.message}
                      </div>
                    );
                  })()}

                  {/* Favorite button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite && toggleFavorite(business.id);
                    }}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
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
                    <h3 className="font-bold text-slate-900 text-xl leading-tight text-center">{business.name}</h3>
                    {business.is_verified && (
                      <BadgeCheck className="text-white fill-primary shrink-0" size={22} />
                    )}
                  </div>

                  {/* Fila 1: Categoría | Rating */}
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-sm font-medium text-primary/80">{business.subcategory || business.category}</p>
                    <span className="text-gray-300 text-sm">│</span>
                    <div className="flex items-center gap-1">
                      <Star className="text-yellow-500 fill-yellow-500" size={15} />
                      <span className="font-bold text-slate-900 text-sm">{business.rating || '—'}</span>
                      <span className="text-gray-400 text-xs">({business.review_count || business.reviews || 0})</span>
                    </div>
                  </div>

                  {/* Fila 2: Barrio | Favoritos */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                      <MapPin size={13} className="text-primary" />
                      <span className="text-xs text-gray-500">{business.neighborhood || business.address}</span>
                    </div>
                    <span className="text-gray-300 text-sm">│</span>
                    <div className="flex items-center gap-1">
                      <Heart className="text-red-400 fill-red-400" size={13} />
                      <span className="text-xs text-gray-500">{business.favoriteCount || 0}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>

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
            <button
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
    { id: 'climatizacion', name: 'Climatización', icon: 'Snowflake', businessCount: 0 },
    { id: 'electricista', name: 'Electricista', icon: 'Zap', businessCount: 0 },
    { id: 'fontanero', name: 'Fontanero', icon: 'Droplet', businessCount: 0 },
    { id: 'jardineria', name: 'Jardinería', icon: 'Flower2', businessCount: 0 },
    { id: 'limpieza', name: 'Limpieza', icon: 'Sparkles', businessCount: 0 },
    { id: 'mudanzas', name: 'Mudanzas', icon: 'Truck', businessCount: 0 },
    { id: 'pintor', name: 'Pintor', icon: 'Paintbrush', businessCount: 0 },
    { id: 'reparacion', name: 'Reparación móviles/PC', icon: 'Smartphone', businessCount: 0 },
  ]);

  // Cargar conteos reales desde Supabase
  useEffect(() => {
    const loadCounts = async () => {
      const { data } = await supabase
        .from('businesses')
        .select('subcategory')
        .eq('is_published', true)
        .eq('verification_status', 'approved');

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
    } catch {
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
          <button
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
                  <span className={`text-[10px] mt-1 font-medium ${paso >= step ? 'text-primary' : 'text-gray-400'}`}>
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
                  <span className={"text-[10px] font-medium mt-1 " + (cat.businessCount === 0 ? "text-gray-400" : "text-primary")}>{cat.businessCount === 0 ? "Sin empresas" : `${cat.businessCount} empresa${cat.businessCount !== 1 ? "s" : ""}`}</span>
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
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Necesito arreglar una fuga en el baño, debajo del lavabo. Gotea constantemente y se está mojando el suelo..."
                rows={5}
                className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-900 placeholder:text-gray-400 ${
                  formData.description && formData.description.trim().length < LIMITS.budgetRequest.descriptionMinLength
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-gray-200 focus:border-primary'
                }`}
              />
              <div className="mt-1 flex justify-between items-center">
                <span className={`text-xs ${
                  formData.description.trim().length >= LIMITS.budgetRequest.descriptionMinLength ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {formData.description.trim().length >= 20 ? '✓ Descripción válida' : `${formData.description.trim().length}/20 caracteres`}
                </span>
                <span className="text-xs text-gray-400">{formData.description.length}/500</span>
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
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }))}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="text-white" size={12} />
                    </button>
                  </div>
                ))}
                {formData.photos.length < LIMITS.budgetRequest.maxPhotos && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-primary hover:text-primary transition-colors">
                    {uploadingBudgetPhoto ? <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /> : <Plus size={24} />}
                    <span className="text-[10px]">{uploadingBudgetPhoto ? '...' : 'Añadir'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || uploadingBudgetPhoto) return;
                      if (file.size > 5 * 1024 * 1024) { showToast?.('La imagen no puede superar 5MB', 'error'); return; }
                      setUploadingBudgetPhoto(true);
                      try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `budget-requests/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                        const { error } = await supabase.storage.from('business-photos').upload(fileName, file, { cacheControl: '3600', upsert: false });
                        if (error) throw error;
                        const { data: { publicUrl } } = supabase.storage.from('business-photos').getPublicUrl(fileName);
                        setFormData(prev => ({ ...prev, photos: [...prev.photos, publicUrl] }));
                      } catch { showToast?.('Error al subir la foto', 'error'); }
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
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="C/ Mayor 45, Cornellà de Llobregat"
                className={`w-full h-12 px-4 rounded-xl border bg-white text-slate-900 placeholder:text-gray-400 ${
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
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="612 345 678"
                className={`w-full h-12 px-4 rounded-xl border bg-white text-slate-900 placeholder:text-gray-400 ${
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
              className="w-full h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-amber-500 text-white disabled:opacity-60"
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
                  : 'bg-gray-200 text-gray-400'
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
      const fileName = `budget-requests/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error } = await supabase.storage.from('business-photos').upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('business-photos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, photos: [...prev.photos, publicUrl] }));
    } catch { showToast?.('Error al subir la foto', 'error'); }
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
    } catch {
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
          <button
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
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Ej: Necesito pintar el salón y dos habitaciones. Las paredes están en buen estado..."
            className="w-full h-32 p-4 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <p className="text-xs text-gray-400 mt-1">Mínimo 10 caracteres ({formData.description.length})</p>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Fotos (opcional)</label>
          <div className="flex gap-3">
            {formData.photos.map((photo, index) => (
              <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X className="text-white" size={12} />
                </button>
              </div>
            ))}
            {formData.photos.length < 3 && (
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                {uploadingDPhoto ? <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /> : <Camera className="text-gray-400" size={20} />}
                <span className="text-[10px] text-gray-400">{uploadingDPhoto ? '...' : 'Añadir'}</span>
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
          <input
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
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="612 345 678"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:border-primary focus:outline-none"
          />
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
            canSubmit && !loading ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-dark active:scale-[0.98]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
          .order('expires_at', { ascending: true });

        if (error) throw error;
        setFlashOffers(data || []);
      } catch (error) {
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
      discount: offer.discount_label || offer.discount_value + '%',
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
    if (minutes <= 60) return 'text-red-500 bg-red-50';
    if (minutes <= 180) return 'text-orange-500 bg-orange-50';
    return 'text-green-600 bg-green-50';
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
          <button
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
      <main className="px-4 py-4 pb-8 space-y-4">
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
                      index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}>
                      {index + 1}
                    </div>
                  )}
                  {/* Discount Badge */}
                  <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
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
                        <span className="text-xs text-gray-400 line-through mr-1">{formatCurrency(offer.originalPrice)}</span>
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
                  index === 0 ? 'bg-red-50 text-red-600' :
                  index === 1 ? 'bg-orange-50 text-orange-600' :
                  'bg-yellow-50 text-yellow-600'
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
      </main>
    </div>
  );
};

// Página de Ofertas
const OffersPage = ({ onNavigate, userOffers = [], initialTab = 'offers', activeJobs = [], loadingJobs = false, getJobDaysRemaining, isBusinessOwner = false, notifications = [] }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [jobsDisplayCount, setJobsDisplayCount] = useState(10);

  // Cargar ofertas normales (no flash) desde Supabase
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            businesses!inner(id, name)
          `)
          .eq('is_flash', false)
          .eq('status', 'active')
          .eq('is_visible', true)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transformar al formato esperado
        const transformedOffers = data.map(offer => {
          const expiresAt = new Date(offer.expires_at);
          const now = new Date();
          const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

          return {
            id: offer.id,
            title: offer.title,
            business: offer.businesses?.name || 'Negocio',
            businessIcon: 'Store',
            image: offer.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='600' height='400' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EOferta%3C/text%3E%3C/svg%3E",
            discount: offer.discount_label || `-${offer.discount_value}%`,
            expiresIn: `${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
            featured: true,
            description: offer.description,
          };
        });

        setOffers(transformedOffers);
      } catch (error) {
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, []);

  const allOffers = offers;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-white font-body text-slate-900 flex flex-col">
      {/* Header */}
      <div className="z-30 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center px-4 py-4 justify-between">
          <div className="w-10"></div>
          <h2 className="text-slate-900 text-[18px] font-bold tracking-tight text-center">Ofertas y Empleo</h2>
          <button
            onClick={() => onNavigate('notifications')}
            className="relative text-slate-900 p-2 -mr-2 rounded-full hover:bg-slate-50 transition"
          >
            <Bell size={26} />
            {(notifications?.filter(n => !n.isRead).length || 0) > 0 && (
              <span className="absolute top-1 right-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 border-2 border-white text-[10px] font-bold text-white">
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
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 no-scrollbar">
        {activeTab === 'offers' ? (
          <div className="w-full">
            <div className="px-4 pt-6 pb-3">
              <h3 className="text-slate-900 text-lg font-bold">Destacados esta semana</h3>
            </div>
            <div className="px-4 space-y-4 pb-6">
              {/* Todas las ofertas con mismo diseño */}
              {loadingOffers ? (
                <OfferListSkeleton count={4} />
              ) : (
                allOffers.map(offer => (
                  <div
                    key={offer.id}
                    onClick={() => onNavigate('coupon', { id: offer.id })}
                    className="group bg-white rounded-2xl shadow-soft overflow-hidden transform transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer border border-gray-100"
                  >
                    <div className="h-40 relative overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url("${offer.image}")` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                      <div className="absolute top-3 left-3 bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                        {offer.discount}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const ofertaUrl = `${window.location.origin}${window.location.pathname}?oferta=${offer.id}`;
                          const text = `¡Oferta en Cornellà! 🛍️\n\n*${offer.title}*\n🏪 ${offer.business}\n💰 ${offer.discount}\n\n👉 Ver oferta: ${ofertaUrl}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="absolute top-3 right-3 w-9 h-9 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg"
                      >
                        <MessageCircle size={16} />
                      </button>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white/90 text-xs font-medium mb-1 flex items-center gap-1">
                          <Icon name={offer.businessIcon || 'Store'} size={14} /> {offer.business}
                        </p>
                        <h4 className="text-white text-lg font-bold leading-tight">{offer.title}</h4>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        {offer.expiresIn && (
                          <span className="text-slate-500 text-xs font-medium">Expira en {offer.expiresIn}</span>
                        )}
                        {offer.savings && <span className="text-primary font-bold text-sm">Ahorras {offer.savings}</span>}
                        {offer.availableToday && <span className="text-slate-900 font-bold text-sm">Disponible hoy</span>}
                        {offer.validToday && <span className="text-green-600 font-bold text-sm">Válido hoy</span>}
                      </div>
                      <button className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shadow-lg shadow-primary/20">
                        Ver Cupón
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
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
                  <p className="text-slate-400 text-sm mt-1">Vuelve más tarde para ver nuevas ofertas</p>
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
                      <span className="text-primary text-sm font-semibold flex items-center hover:text-primary/80 transition-colors">
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
      </main>

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
    <main className="flex-1 overflow-y-auto px-4 pb-24 pt-2 no-scrollbar">
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
    </main>

    {/* Navbar */}
    <Navbar currentPage="favorites" onNavigate={onNavigate} />
  </div>
  );
};

// =====================================================
// PANEL DE ADMINISTRACIÓN
// =====================================================

// AdminUsersScreen - Lista de usuarios registrados
const AdminUsersScreen = ({ onNavigate }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at, is_admin')
        .order('created_at', { ascending: false });
      setUsers(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => onNavigate('admin')} className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 text-center pr-10">
            <h2 className="text-slate-900 text-lg font-bold">Usuarios</h2>
            {!loading && <p className="text-xs text-gray-400">{users.length} registrados</p>}
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-slate-900 placeholder:text-gray-400 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </header>
      <div className="p-4 space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-10">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Sin resultados</div>
        ) : filtered.map(u => (
          <div key={u.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {(u.full_name || u.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{u.full_name || 'Sin nombre'}</p>
              <p className="text-xs text-gray-400 truncate">{u.email}</p>
              <p className="text-xs text-gray-300">{new Date(u.created_at).toLocaleDateString('es-ES')}</p>
            </div>
            {u.is_admin && (
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full shrink-0">Admin</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// AdminSupportScreen - Mensajes de soporte recibidos
const AdminSupportScreen = ({ onNavigate }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('support_requests')
        .select('*')
        .order('created_at', { ascending: false });
      setMessages(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const markResolved = async (id) => {
    await supabase.from('support_requests').update({ status: 'resolved' }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'resolved' } : m));
  };

  const isNoBusinessMsg = (m) => m.subject?.startsWith('[SIN EMPRESAS]');

  const filtered = messages.filter(m => {
    if (filter === 'pending') return m.status !== 'resolved' && !isNoBusinessMsg(m);
    if (filter === 'no-business') return isNoBusinessMsg(m) && m.status !== 'resolved';
    if (filter === 'resolved') return m.status === 'resolved';
    return true;
  });

  const pendingCount = messages.filter(m => m.status !== 'resolved' && !isNoBusinessMsg(m)).length;
  const noBusinessCount = messages.filter(m => isNoBusinessMsg(m) && m.status !== 'resolved').length;

  const tabs = [
    { id: 'pending', label: 'Soporte', count: pendingCount },
    { id: 'no-business', label: 'Sin empresas', count: noBusinessCount },
    { id: 'resolved', label: 'Resueltos', count: messages.filter(m => m.status === 'resolved').length },
    { id: 'all', label: 'Todos', count: messages.length },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => onNavigate('admin')} className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 text-center pr-10">
            <h2 className="text-slate-900 text-lg font-bold">Soporte</h2>
            {!loading && (pendingCount + noBusinessCount) > 0 && (
              <p className="text-xs text-amber-600 font-medium">{pendingCount + noBusinessCount} sin resolver</p>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === tab.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 rounded-full ${
                  filter === tab.id ? 'bg-white/25 text-white' :
                  tab.id === 'no-business' ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 py-10">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10">No hay mensajes en este filtro</div>
        ) : filtered.map(m => {
          const isNoBiz = isNoBusinessMsg(m);
          return (
            <div key={m.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
              m.status === 'resolved' ? 'border-green-400 opacity-60' : isNoBiz ? 'border-orange-400' : 'border-blue-400'
            }`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm">{m.name}</p>
                    {isNoBiz && <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">SIN EMPRESAS</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  m.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {m.status === 'resolved' ? 'Resuelto' : 'Pendiente'}
                </span>
              </div>
              {isNoBiz
                ? <p className="text-xs font-semibold text-orange-600 mb-1">{m.subject?.replace('[SIN EMPRESAS] ', '')}</p>
                : m.subject && <p className="text-xs font-semibold text-primary mb-1">{m.subject}</p>
              }
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{m.message}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">{new Date(m.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                {m.status !== 'resolved' && (
                  <button onClick={() => markResolved(m.id)} className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors">
                    Marcar resuelto
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// AdminDashboard - Panel principal de administración
const AdminDashboard = ({ onNavigate, user }) => {
  const [stats, setStats] = useState({
    pendingBusinesses: 0,
    pendingReports: 0,
    pendingSupport: 0,
    totalUsers: 0,
    totalBusinesses: 0,
    activeOffers: 0,
    activeJobs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Negocios pendientes
        const { count: pendingBiz } = await supabase
          .from('businesses')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', 'pending');

        // Reportes pendientes
        const { count: pendingRep } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Total usuarios
        const { count: totalUsr } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Total negocios
        const { count: totalBiz } = await supabase
          .from('businesses')
          .select('*', { count: 'exact', head: true });

        // Ofertas activas
        const { count: activeOff } = await supabase
          .from('offers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Empleos activos
        const { count: activeJb } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Soporte pendiente
        const { count: pendingSupp } = await supabase
          .from('support_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        setStats({
          pendingBusinesses: pendingBiz || 0,
          pendingReports: pendingRep || 0,
          pendingSupport: pendingSupp || 0,
          totalUsers: totalUsr || 0,
          totalBusinesses: totalBiz || 0,
          activeOffers: activeOff || 0,
          activeJobs: activeJb || 0,
        });
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const quickActions = [
    {
      id: 'approve-businesses',
      title: 'Aprobar Negocios',
      description: `${stats.pendingBusinesses} pendientes`,
      icon: Store,
      color: 'blue',
      badge: stats.pendingBusinesses,
      route: 'admin-approve-businesses'
    },
    {
      id: 'reports',
      title: 'Ver Reportes',
      description: `${stats.pendingReports} sin revisar`,
      icon: Flag,
      color: 'red',
      badge: stats.pendingReports,
      route: 'admin-reports'
    },
    {
      id: 'users',
      title: 'Usuarios',
      description: `${stats.totalUsers} registrados`,
      icon: Users,
      color: 'green',
      route: 'admin-users'
    },
    {
      id: 'support',
      title: 'Soporte',
      description: stats.pendingSupport > 0 ? `${stats.pendingSupport} sin resolver` : 'Sin mensajes nuevos',
      icon: MessageCircle,
      color: 'purple',
      badge: stats.pendingSupport,
      route: 'admin-support'
    },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-primary to-blue-700 px-4 py-6 pb-8">
        <button
          onClick={() => onNavigate('profile')}
          className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Volver al perfil</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
            <ShieldAlert className="text-white" size={28} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Panel de Admin</h1>
            <p className="text-white/80 text-sm">{user?.email}</p>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 -mt-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{stats.totalBusinesses}</div>
            <div className="text-xs text-gray-500 mt-1">Negocios</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
            <div className="text-xs text-gray-500 mt-1">Usuarios</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{stats.activeOffers}</div>
            <div className="text-xs text-gray-500 mt-1">Ofertas activas</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{stats.activeJobs}</div>
            <div className="text-xs text-gray-500 mt-1">Empleos activos</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-24">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Acciones Rápidas</h2>
        <div className="space-y-3">
          {quickActions.map(action => {
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-600',
              red: 'bg-red-100 text-red-600',
              green: 'bg-green-100 text-green-600',
              purple: 'bg-purple-100 text-purple-600'
            };

            return (
              <button
                key={action.id}
                onClick={() => onNavigate(action.route)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-xl ${colorClasses[action.color]} flex items-center justify-center shrink-0 relative`}>
                  <action.icon size={24} />
                  {action.badge > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {action.badge > 99 ? '99+' : action.badge}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-slate-900">{action.title}</div>
                  <div className="text-sm text-gray-500">{action.description}</div>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Navbar */}
      <Navbar currentPage="profile" onNavigate={onNavigate} />
    </div>
  );
};

// BusinessApprovalScreen - Aprobar/rechazar negocios
const BusinessApprovalScreen = ({ onNavigate, user, showToast }) => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBusinesses();
  }, [filter]);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('verification_status', 'pending').is('appeal_message', null);
      } else if (filter === 'appeals') {
        query = query.eq('verification_status', 'pending').not('appeal_message', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      setBusinesses(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const openApproveModal = (business) => {
    setSelectedBusiness(business);
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!selectedBusiness) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({
          verification_status: 'approved',
          is_verified: true,
          is_published: true,
          verified_at: new Date().toISOString(),
          verified_by: user.id
        })
        .eq('id', selectedBusiness.id)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Sin permisos. Ejecuta el script SQL de políticas RLS para admin.');

      await supabase.from('notifications').insert({
        user_id: selectedBusiness.owner_id,
        type: 'business_approved',
        title: '¡Tu negocio ya está en Cornellà Local! 🎉',
        message: `"${selectedBusiness.name}" ha sido verificado y ya aparece en la app. Accede a tu panel para añadir ofertas y empleos.`,
        data: { business_id: selectedBusiness.id },
        is_read: false,
      });

      showToast(`✅ ${selectedBusiness.name} aprobado`, 'success');
      setShowApproveModal(false);
      setSelectedBusiness(null);
      loadBusinesses();
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBusiness) return;

    setActionLoading(true);
    try {
      const newRejectionCount = (selectedBusiness.rejection_count || 0) + 1;

      // Update core fields
      const { data, error } = await supabase
        .from('businesses')
        .update({
          verification_status: 'rejected',
          verification_notes: rejectReason || 'Rechazado por el administrador',
        })
        .eq('id', selectedBusiness.id)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Sin permisos. Ejecuta el script SQL de políticas RLS para admin.');

      // Update new fields (may fail if schema cache not updated yet)
      await supabase.from('businesses').update({
        rejection_reason: rejectReason || 'No cumple los requisitos.',
        rejection_count: newRejectionCount,
      }).eq('id', selectedBusiness.id).then(() => {}).catch(() => {});

      // Notificar al propietario del rechazo
      await supabase.from('notifications').insert({
        user_id: selectedBusiness.owner_id,
        type: 'business_rejected',
        title: `Solicitud de negocio rechazada${newRejectionCount > 1 ? ` (vez ${newRejectionCount})` : ''}`,
        message: `"${selectedBusiness.name}": ${rejectReason || 'No cumple los requisitos.'}. Puedes apelar con más información.`,
        data: { business_id: selectedBusiness.id, rejection_reason: rejectReason, rejection_count: newRejectionCount },
        is_read: false,
        created_at: new Date().toISOString(),
      });

      showToast(`${selectedBusiness.name} rechazado. El propietario ha sido notificado`, 'info');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedBusiness(null);
      loadBusinesses();
    } catch (error) {
      showToast('Error al rechazar el negocio', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openDocumentsModal = (business) => {
    setSelectedBusiness(business);
    setShowDocumentsModal(true);
  };

  const openRejectModal = (business) => {
    setSelectedBusiness(business);
    setShowRejectModal(true);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-4">
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className="mb-3 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Panel Admin</span>
        </button>
        <h1 className="text-xl font-bold text-slate-900">Aprobar Negocios</h1>
      </header>

      {/* Filters */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilter('appeals')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            filter === 'appeals'
              ? 'bg-amber-500 text-white'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          <RefreshCw size={13} />
          Apelaciones
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="animate-spin mx-auto mb-3 text-primary" size={32} />
            <p className="text-gray-500">Cargando negocios...</p>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-12">
            <Store className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No hay negocios {filter === 'pending' ? 'pendientes' : ''}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {businesses.map(business => {
              const hasDocuments = business.verification_documents && business.verification_documents.length > 0;
              const isAppeal = business.rejection_count > 0 && business.appeal_message;
              const wasRejected = business.rejection_count > 0;

              return (
                <div key={business.id} className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all ${
                  isAppeal ? 'border-amber-300 bg-amber-50/30' :
                  wasRejected && business.verification_status === 'rejected' ? 'border-red-200 bg-red-50/20' :
                  'border-transparent hover:border-primary/20'
                }`}>
                  <div className="flex gap-3 mb-3">
                    <div className="w-16 h-16 rounded-lg bg-gray-200 shrink-0 overflow-hidden">
                      {business.cover_photo && (
                        <img src={business.cover_photo} alt={business.name} loading="lazy" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 truncate">{business.name}</h3>
                        {hasDocuments && (
                          <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            <FileText size={12} />
                            <span className="text-[10px] font-bold">{business.verification_documents.length}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{business.address}</p>
                      <p className="text-xs text-gray-500">{business.subcategory}</p>
                    </div>
                  </div>

                  {business.tags && business.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {business.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                      {business.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{business.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      isAppeal ? 'bg-amber-100 text-amber-800' :
                      business.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      business.verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {isAppeal ? '🔄 Apelación enviada' :
                       business.verification_status === 'pending' ? '⏳ Pendiente' :
                       business.verification_status === 'approved' ? '✅ Aprobado' :
                       '❌ Rechazado'}
                    </div>

                    {wasRejected && (
                      <div className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        ↩ Rechazado {business.rejection_count}x
                      </div>
                    )}

                    {hasDocuments && (
                      <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                        🏅 Verificación Oficial
                      </div>
                    )}
                  </div>

                  {/* Documents Button */}
                  {hasDocuments && (
                    <button
                      onClick={() => openDocumentsModal(business)}
                      className="w-full mb-3 py-2 px-3 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText size={16} />
                      Ver {business.verification_documents.length} documento(s) de verificación
                    </button>
                  )}

                  {/* Action Buttons */}
                  {business.verification_status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openApproveModal(business)}
                        disabled={actionLoading}
                        className="flex-1 h-10 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {actionLoading ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={16} />
                            Aprobar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => openRejectModal(business)}
                        disabled={actionLoading}
                        className="flex-1 h-10 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <X size={16} />
                        Rechazar
                      </button>
                    </div>
                  )}

                  {/* Historial de rechazos y apelación */}
                  {(business.rejection_count > 0 || business.appeal_message) && (
                    <div className="mt-3 space-y-2">
                      {business.rejection_reason && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                          <div className="flex items-center gap-1.5 mb-1">
                            <XCircle size={13} className="text-red-600" />
                            <p className="text-xs font-semibold text-red-900">
                              Último rechazo {business.rejection_count > 1 ? `(${business.rejection_count}ª vez)` : ''}:
                            </p>
                          </div>
                          <p className="text-xs text-red-700">{business.rejection_reason}</p>
                        </div>
                      )}
                      {business.appeal_message && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare size={13} className="text-amber-700" />
                            <p className="text-xs font-semibold text-amber-900">Apelación del propietario:</p>
                          </div>
                          <p className="text-xs text-amber-800">{business.appeal_message}</p>
                          {business.appeal_images?.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {business.appeal_images.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-amber-200" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Confirmar Aprobación */}
      {showApproveModal && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-2.5 rounded-full">
                <Check size={22} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Aprobar negocio</h3>
                <p className="text-xs text-slate-500">{selectedBusiness.name}</p>
              </div>
            </div>
            <div className={`rounded-xl p-3 mb-5 ${selectedBusiness.verification_documents?.length > 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-sm ${selectedBusiness.verification_documents?.length > 0 ? 'text-green-700' : 'text-amber-700'}`}>
                {selectedBusiness.verification_documents?.length > 0
                  ? '✅ Este negocio recibirá el badge de Verificación Oficial'
                  : '⚠️ Se aprobará sin verificación oficial (sin documentos)'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowApproveModal(false); setSelectedBusiness(null); }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                {actionLoading ? 'Aprobando...' : 'Aprobar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver Documentos */}
      {showDocumentsModal && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <FileText className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedBusiness.name}</h3>
                  <p className="text-xs text-white/80">Documentos de verificación</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedBusiness(null);
                }}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="text-white" size={18} />
              </button>
            </div>

            {/* Documents List */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              {selectedBusiness.verification_documents && selectedBusiness.verification_documents.length > 0 ? (
                <div className="space-y-4">
                  {selectedBusiness.verification_documents.map((docUrl, index) => {
                    const fileName = docUrl.split('/').pop() || `Documento ${index + 1}`;
                    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                    const isPDF = fileExt === 'pdf';

                    return (
                      <div key={index} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-blue-300 transition-all">
                        {/* Preview */}
                        {!isPDF ? (
                          <div className="w-full h-48 bg-gray-100">
                            <img
                              src={docUrl}
                              alt={`Documento ${index + 1}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                            <FileText className="text-red-500" size={64} />
                          </div>
                        )}

                        {/* Info and Actions */}
                        <div className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">
                              {isPDF ? 'Documento PDF' : 'Imagen'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Documento #{index + 1} • {fileExt.toUpperCase()}
                            </p>
                          </div>
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-10 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
                          >
                            <ExternalLink size={16} />
                            Abrir
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto mb-3 text-gray-300" size={48} />
                  <p className="text-gray-500">No hay documentos subidos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rechazar Negocio */}
      {showRejectModal && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle size={22} />
                Rechazar Negocio
              </h3>
              <p className="text-sm text-white/80 mt-1">{selectedBusiness.name}</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                ¿Por qué motivo rechazas este negocio? El propietario recibirá esta nota.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ejemplo: Los documentos no son legibles, falta CIF, información incompleta..."
                className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 resize-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all text-sm"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedBusiness(null);
                  }}
                  disabled={actionLoading}
                  className="flex-1 h-11 px-4 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="flex-1 h-11 px-4 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Rechazando...
                    </>
                  ) : (
                    <>
                      <X size={16} />
                      Rechazar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <Navbar currentPage="profile" onNavigate={onNavigate} />
    </div>
  );
};

// BusinessAnalyticsScreen - Estadísticas avanzadas para propietarios
const BusinessAnalyticsScreen = ({ onNavigate, user, businessData }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(7); // 7, 30 días

  useEffect(() => {
    if (businessData?.id) {
      loadAnalytics();
    }
  }, [businessData, selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Stats generales
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_business_stats', {
          p_business_id: businessData.id,
          p_days: selectedPeriod
        });

      if (statsError) throw statsError;
      setStats(statsData?.[0] || {});

      // 2. Stats diarias
      const { data: dailyData, error: dailyError } = await supabase
        .rpc('get_daily_stats', {
          p_business_id: businessData.id,
          p_days: selectedPeriod
        });

      if (dailyError) throw dailyError;
      setDailyStats(dailyData || []);

      // 3. Distribución por hora
      const { data: hourlyData, error: hourlyError } = await supabase
        .rpc('get_hourly_distribution', {
          p_business_id: businessData.id,
          p_days: selectedPeriod
        });

      if (hourlyError) throw hourlyError;
      setHourlyStats(hourlyData || []);

    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Calcular max para normalizar gráficos
  const maxDailyViews = Math.max(...dailyStats.map(d => parseInt(d.views || 0)), 1);
  const maxHourlyViews = Math.max(...hourlyStats.map(h => parseInt(h.view_count || 0)), 1);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6 shadow-lg">
        <button
          onClick={() => onNavigate('owner-dashboard')}
          className="mb-3 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Panel</span>
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <BarChart3 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Estadísticas</h1>
            <p className="text-sm text-white/80">{businessData?.name}</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setSelectedPeriod(7)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              selectedPeriod === 7
                ? 'bg-white text-indigo-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            7 días
          </button>
          <button
            onClick={() => setSelectedPeriod(30)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              selectedPeriod === 30
                ? 'bg-white text-indigo-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            30 días
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 pb-24 space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="animate-spin mx-auto mb-3 text-indigo-600" size={32} />
            <p className="text-gray-500">Cargando estadísticas...</p>
          </div>
        ) : (
          <>
            {/* Métricas Principales */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="text-indigo-600" size={20} />
                Resumen General
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Vistas */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Eye className="text-white/80" size={20} />
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="text-white" size={14} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {parseInt(stats?.total_views || 0).toLocaleString('es-ES')}
                  </p>
                  <p className="text-xs text-white/80">Vistas totales</p>
                  <p className="text-[10px] text-white/60 mt-1">
                    ~{parseFloat(stats?.avg_daily_views || 0).toFixed(1)}/día
                  </p>
                </div>

                {/* Clics */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <MousePointerClick className="text-white/80" size={20} />
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <ArrowRight className="text-white" size={14} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {parseInt(stats?.total_clicks || 0).toLocaleString('es-ES')}
                  </p>
                  <p className="text-xs text-white/80">Clics en contacto</p>
                  <p className="text-[10px] text-white/60 mt-1">
                    {stats?.total_views > 0
                      ? `${((stats.total_clicks / stats.total_views) * 100).toFixed(1)}% tasa de clic`
                      : 'Sin datos'}
                  </p>
                </div>

                {/* Favoritos */}
                <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Heart className="text-white/80 fill-white/80" size={20} />
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <Star className="text-white fill-white" size={14} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {parseInt(stats?.total_favorites || 0).toLocaleString('es-ES')}
                  </p>
                  <p className="text-xs text-white/80">Nuevos favoritos</p>
                  <p className="text-[10px] text-white/60 mt-1">
                    {stats?.total_views > 0
                      ? `${((stats.total_favorites / stats.total_views) * 100).toFixed(1)}% conversión`
                      : 'Sin datos'}
                  </p>
                </div>

                {/* Visitantes únicos */}
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="text-white/80" size={20} />
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <UserCheck className="text-white" size={14} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {parseInt(stats?.unique_visitors || 0).toLocaleString('es-ES')}
                  </p>
                  <p className="text-xs text-white/80">Visitantes únicos</p>
                  <p className="text-[10px] text-white/60 mt-1">
                    {stats?.unique_visitors > 0 && stats?.total_views > 0
                      ? `${(stats.total_views / stats.unique_visitors).toFixed(1)} vistas/usuario`
                      : 'Sin datos'}
                  </p>
                </div>
              </div>
            </section>

            {/* Gráfico de Vistas Diarias */}
            {dailyStats.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="text-indigo-600" size={20} />
                  Tendencia Diaria
                </h2>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="space-y-3">
                    {dailyStats.slice(0, 7).reverse().map((day, index) => {
                      const views = parseInt(day.views || 0);
                      const percentage = (views / maxDailyViews) * 100;
                      const date = new Date(day.date);
                      const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                      const dayNum = date.getDate();

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-700 w-12">
                              {dayName.charAt(0).toUpperCase() + dayName.slice(1)} {dayNum}
                            </span>
                            <span className="font-bold text-indigo-600">{views}</span>
                          </div>
                          <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Horarios Pico */}
            {hourlyStats.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="text-indigo-600" size={20} />
                  Horarios Más Visitados
                </h2>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-end justify-between gap-1 h-40">
                    {Array.from({ length: 24 }, (_, i) => {
                      const hourData = hourlyStats.find(h => h.hour === i);
                      const count = parseInt(hourData?.view_count || 0);
                      const percentage = maxHourlyViews > 0 ? (count / maxHourlyViews) * 100 : 0;
                      const isPeak = count > 0 && percentage > 60;

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="relative w-full h-full flex items-end">
                            <div
                              className={`w-full rounded-t transition-all duration-300 ${
                                isPeak
                                  ? 'bg-gradient-to-t from-amber-500 to-orange-500'
                                  : 'bg-gradient-to-t from-indigo-400 to-indigo-500'
                              }`}
                              style={{ height: `${Math.max(percentage, count > 0 ? 10 : 0)}%` }}
                            >
                              {count > 0 && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-700">
                                  {count}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={`text-[9px] font-medium ${
                            isPeak ? 'text-amber-600' : 'text-gray-400'
                          }`}>
                            {i}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-gradient-to-t from-amber-500 to-orange-500" />
                      <span className="text-gray-600">Horarios pico</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-gradient-to-t from-indigo-400 to-indigo-500" />
                      <span className="text-gray-600">Normal</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Tips */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
              <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                <Lightbulb className="text-amber-500" size={18} />
                Consejos para mejorar
              </h3>
              <ul className="space-y-2 text-xs text-indigo-800">
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                  <span>Publica ofertas en horarios pico para mayor visibilidad</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                  <span>Actualiza tus fotos regularmente para atraer más clientes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                  <span>Responde rápido a presupuestos para aumentar conversión</span>
                </li>
              </ul>
            </section>

            {/* Empty State */}
            {!stats?.total_views && (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto mb-3 text-gray-300" size={64} />
                <p className="text-gray-500 mb-2 font-medium">Aún no hay datos suficientes</p>
                <p className="text-sm text-gray-400">
                  Las estadísticas aparecerán cuando los usuarios visiten tu negocio
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navbar */}
      <Navbar currentPage="profile" onNavigate={onNavigate} />
    </div>
  );
};

// ReportsScreen - Gestionar reportes/quejas
const ReportsScreen = ({ onNavigate, user, showToast }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_user_id_fkey(full_name, email),
          businesses(name, address)
        `)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;
      if (error) throw error;

      setReports(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      showToast('Reporte marcado como resuelto', 'success');
      loadReports();
    } catch (error) {
      showToast('Error al resolver el reporte', 'error');
    }
  };

  const handleDismiss = async (reportId) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'dismissed',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      showToast('Reporte desestimado', 'success');
      loadReports();
    } catch (error) {
      showToast('Error al desestimar el reporte', 'error');
    }
  };

  const reportTypeLabels = {
    false_tags: 'Tags falsos',
    wrong_price: 'Precio incorrecto',
    bad_hours: 'Horarios incorrectos',
    fake_info: 'Información falsa',
    inappropriate: 'Contenido inapropiado',
    other: 'Otro'
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-4">
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className="mb-3 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Panel Admin</span>
        </button>
        <h1 className="text-xl font-bold text-slate-900">Reportes de Usuarios</h1>
      </header>

      {/* Filters */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'pending' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Todos
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="animate-spin mx-auto mb-3 text-primary" size={32} />
            <p className="text-gray-500">Cargando reportes...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No hay reportes {filter === 'pending' ? 'pendientes' : ''}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="bg-white rounded-xl p-4 shadow-sm">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Flag className="text-red-600" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onNavigate('business', { id: report.business_id })}
                      className="font-bold text-primary text-sm hover:underline text-left"
                    >
                      {report.businesses?.name} →
                    </button>
                    <p className="text-xs text-gray-500">{report.businesses?.address}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {report.status === 'pending' ? 'Pendiente' :
                     report.status === 'resolved' ? 'Resuelto' :
                     'Desestimado'}
                  </div>
                </div>

                {/* Type */}
                <div className="mb-2">
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                    {reportTypeLabels[report.report_type] || report.report_type}
                  </span>
                </div>

                {/* Message */}
                <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg">
                  "{report.message}"
                </p>

                {/* Reporter */}
                <p className="text-xs text-gray-500 mb-3">
                  Reportado por: {report.profiles?.full_name || report.profiles?.email || 'Usuario'}
                </p>

                {/* Actions */}
                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve(report.id)}
                      className="flex-1 h-9 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                    >
                      ✅ Resolver
                    </button>
                    <button
                      onClick={() => handleDismiss(report.id)}
                      className="flex-1 h-9 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
                    >
                      Desestimar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navbar */}
      <Navbar currentPage="profile" onNavigate={onNavigate} />
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
        <button
          onClick={() => onNavigate('settings')}
          className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors text-slate-800"
        >
          <Settings size={24} />
        </button>
      </div>
    </header>

    <main className="flex-1 flex flex-col gap-6 pb-28">
      {/* Avatar y nombre */}
      <section className="flex flex-col items-center px-6 pt-4">
        <div
          className="relative mb-4 group cursor-pointer"
          onClick={handleAvatarClick}
        >
          <div
            className="h-32 w-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-cover bg-center group-hover:opacity-90 transition-opacity"
            style={{ backgroundImage: `url("${avatarUrl}")` }}
          />
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
                    <span className="text-xs text-gray-400">
                      Válido hasta {coupon.validUntil}
                    </span>
                  </div>
                </div>
                <ChevronRight className="text-gray-400 shrink-0" size={20} />
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
            <ChevronRight className="text-slate-400" size={20} />
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
            <ChevronRight className="text-slate-400" size={20} />
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
            <ChevronRight className="text-slate-400" size={20} />
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
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
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
              <ChevronRight className="text-slate-400" size={20} />
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
              <ChevronRight className="text-slate-400" size={20} />
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
              <ChevronRight className="text-slate-400" size={20} />
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
              <ChevronRight className="text-slate-400" size={20} />
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
              <ChevronRight className="text-slate-400" size={20} />
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
              <ChevronRight className="text-slate-400" size={20} />
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
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
            <ChevronRight className="text-slate-400" size={20} />
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
            <ChevronRight className="text-slate-400" size={20} />
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
    </main>

    {/* Navbar */}
    <Navbar currentPage="profile" onNavigate={onNavigate} />
  </div>
  );
};

// Página de Detalle de Negocio
const BusinessDetailPage = ({ businessId, onNavigate, returnTo, returnParams, userFavorites = [], toggleFavorite, isFavorite, user, trackAnalyticsEvent, showToast }) => {
  const [business, setBusiness] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
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

  // Cargar reseñas desde Supabase
  useEffect(() => {
    const fetchReviews = async () => {
      if (!businessId) return;

      setLoadingReviews(true);
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setReviews((data || []).map(r => ({
          ...r,
          user: r.user_id === user?.id ? 'Tú' : 'Usuario',
          avatar: r.user_id === user?.id ? 'Tú' : 'U',
          date: new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        })));
      } catch (error) {
        showToast('Error al cargar las reseñas', 'error');
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
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
      if (business?.owner_id === user.id) {
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
  }, [user, businessId]);

  // Cargar contador de favoritos desde Supabase
  useEffect(() => {
    const fetchFavoriteCount = async () => {
      if (!businessId) return;

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
  }, [businessId, userFavorites]); // Se recarga cuando cambian los favoritos del usuario

  // Handler para incrementar clics
  const handleClick = async (type) => {
    try {
      await supabase.rpc('increment_business_clicks', { business_id: businessId });
    } catch (error) {
    }
  };

  const handleCallClick = () => {
    handleClick('phone');
    if (business?.phone) {
      window.location.href = `tel:${business.phone}`;
    }
  };

  const handleWebClick = () => {
    handleClick('website');
    if (business?.website) {
      const url = business.website.startsWith('http') ? business.website : `https://${business.website}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleMapClick = () => {
    handleClick('map');
    if (business?.address) {
      const address = encodeURIComponent(business.address + ', Cornellà de Llobregat');
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
    }
  };

  if (loadingBusiness) {
    return <BusinessDetailSkeleton />;
  }

  if (!business) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Store className="text-gray-400 mx-auto mb-4" size={60} />
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
        const avgRating = (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1);
        await supabase
          .from('businesses')
          .update({ rating: avgRating, review_count: allReviews.length })
          .eq('id', businessId);

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
    const profileUrl = `${window.location.origin}?negocio=${business.id}`;
    const text = `¡Mira este comercio local en Cornellà! 🏪\n\n*${business.name}*\n⭐ ${business.rating} (${business.review_count || business.reviews || 0} reseñas)\n📍 ${business.address}\n📂 ${business.category}\n\n👉 Ver perfil: ${profileUrl}\n\nDescúbrelo en Cornellà Local`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <>
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      <div className="relative w-full flex flex-col min-h-screen overflow-x-hidden">
        {/* Hero Image */}
        <div className="relative w-full h-80 shrink-0">
          <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between p-4 pt-12 bg-gradient-to-b from-white/90 via-white/20 to-transparent pb-20">
            <button
              onClick={() => returnTo ? onNavigate(returnTo, returnParams) : onNavigate('home')}
              className="flex items-center justify-center size-10 rounded-full bg-white/80 backdrop-blur-md text-gray-900 shadow-sm hover:bg-white transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center justify-center size-10 rounded-full bg-orange-500 text-white shadow-sm hover:bg-orange-600 transition-all"
                title="Reportar problema"
              >
                <Flag size={18} />
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center size-10 rounded-full bg-green-500 text-white shadow-sm hover:bg-green-600 transition-all"
              >
                <MessageCircle size={20} />
              </button>
              <button
                onClick={() => toggleFavorite && toggleFavorite(business.id)}
                className={`flex items-center justify-center size-10 rounded-full backdrop-blur-md shadow-sm transition-all ${
                  isFavorite && isFavorite(business.id)
                    ? 'bg-red-500 text-white hover:bg-red-600'
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
                  <span>{business.neighborhood}</span>
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
                  <span className="text-gray-400 text-xs">({business.review_count || business.reviews || 0})</span>
                </button>
                {/* Contador de favoritos/seguidores */}
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                  <Heart className="text-red-500 fill-red-500" size={16} />
                  <span className="text-gray-900 font-bold">{loadingFavorites ? '...' : favoriteCount}</span>
                  <span className="text-gray-400 text-xs">
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
                  className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1.5 rounded-full shadow-sm hover:bg-amber-600 transition-colors cursor-pointer"
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
            {business?.website && (
              <button
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
                    <button
                      className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                      onClick={() => setShowGallery(false)}
                    >
                      <X className="text-white" size={20} />
                    </button>
                    <div className="flex items-center justify-center w-full h-full px-4" onClick={e => e.stopPropagation()}>
                      <button
                        className="absolute left-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                        onClick={() => setGalleryActivePhoto(p => (p - 1 + allPhotos.length) % allPhotos.length)}
                      >
                        <ChevronLeft className="text-white" size={20} />
                      </button>
                      <img src={allPhotos[galleryActivePhoto]} alt="" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
                      <button
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
                  <ChevronDown className={`text-gray-400 transition-transform ${scheduleOpen ? 'rotate-180' : ''}`} size={20} />
                </button>
                {scheduleOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
                    {formattedSchedule.map((item, i) => (
                      <div key={i} className={`flex justify-between items-center ${item.closed ? 'text-gray-400' : 'text-gray-700'}`}>
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
              {/* Google Maps embed */}
              <div className="relative w-full h-48 overflow-hidden">
                <iframe
                  title="Mapa ubicación"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent((business.fullAddress || business.address || '') + ', Cornellà de Llobregat')}&output=embed&z=16`}
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
              <button
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
                        <span className="text-xs text-gray-400">{review.date}</span>
                      </div>
                      <div className="mb-2">
                        <StarRating rating={review.rating} readonly size={14} showValue={false} />
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
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
              <button onClick={() => { setShowWriteReview(false); setNewReviewText(''); setNewReviewRating(5); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
        <button
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
          onClick={() => setShowGallery(false)}
        >
          <X className="text-white" size={20} />
        </button>
        <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
          {galleryActivePhoto + 1} / {galleryPhotos.length}
        </span>
        <div className="flex items-center justify-center w-full h-full px-16" onClick={e => e.stopPropagation()}>
          <button
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
          <button
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
const CouponDetailPage = ({ couponId, onNavigate, savedCoupons = [], toggleSaveCoupon, isCouponSaved, user }) => {
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
          <Tag className="mx-auto mb-4 text-gray-400" size={48} />
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
    image: offer.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EOferta%3C/text%3E%3C/svg%3E",
    validUntil: formattedExpiry,
    type: offer.is_flash ? 'Oferta Flash' : 'Oferta',
    code: 'CORNELLA' + offer.id.substring(0, 8).toUpperCase(),
    qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${offer.id}`,
    discount: offer.discount_label || offer.discount_value + '%',
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
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
      setRedemptionCode(data.code);
      setRedemptionStatus(data.status);
    } catch (err) {
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
            <button
              onClick={() => onNavigate('offers')}
              className="flex items-center justify-center size-10 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center size-10 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg"
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
            <button className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-primary transition-colors">
              {coupon.business}
              <ChevronRight size={16} />
            </button>
          </div>

          <h1 className="text-3xl font-extrabold leading-tight text-gray-900 mb-2 tracking-tight">
            {coupon.title}
          </h1>

          <div className="flex items-center gap-2 mb-8">
            <Clock className="text-primary" size={20} />
            <p className="text-primary font-medium text-sm">Válido hasta el {coupon.validUntil}</p>
            <span className="w-1 h-1 rounded-full bg-gray-300 mx-1"></span>
            <p className="text-gray-400 text-sm">{coupon.type}</p>
          </div>

          {/* Sección de código de redención */}
          {offer.max_uses && offer.redemption_count >= offer.max_uses && !redemptionCode ? (
            /* Oferta agotada */
            <div className="relative w-full bg-gray-100 rounded-2xl p-5 flex flex-col items-center gap-2 mb-6">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="text-red-500" size={24} />
              </div>
              <p className="font-bold text-gray-700">Oferta agotada</p>
              <p className="text-sm text-gray-500">Se han canjeado los {offer.max_uses} usos disponibles</p>
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
              <p className="text-sm text-gray-400 font-mono">{redemptionCode}</p>
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
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors text-sm"
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
            <button className="size-10 flex items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary/90 transition-colors">
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

        // Obtener URL pública
        const { data: { publicUrl } } = supabase
          .storage
          .from('job-applications')
          .getPublicUrl(filePath);

        cvUrl = publicUrl;
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
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
            <button
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
          <button
            onClick={() => onNavigate('offers')}
            className="text-slate-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1"></div>
          <button
            onClick={handleShare}
            className="text-slate-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <Share2 size={22} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 pb-32">
          {/* Título y empresa */}
          <div className="px-5 pt-6 pb-4">
            <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
              {job.title}
            </h1>
            <button className="text-primary font-semibold hover:underline text-base">
              {job.company}
            </button>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <MapPin size={16} className="text-gray-400" />
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
        </main>

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
                  className="flex-1 h-12 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
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
              <button
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

              <p className="text-sm text-gray-400 mb-8">
                La empresa revisará tu perfil y se pondrá en contacto contigo si tu candidatura encaja con el puesto.
              </p>

              {/* Resumen */}
              <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tu candidatura incluye</p>
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
                          <Upload className="text-gray-400" size={24} />
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
                    2. Carta de presentación <span className="text-gray-400 font-normal">(opcional)</span>
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
                    <p className="text-xs text-gray-400">Preséntate brevemente a la empresa</p>
                    <p className={`text-xs ${coverLetter.length > 450 ? 'text-amber-500' : 'text-gray-400'}`}>
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
                        <span className="text-sm text-gray-400">No incluida</span>
                      )}
                    </div>
                  </div>
                </div>
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
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
      <div className="mx-auto min-h-screen w-full max-w-md bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Categoría no encontrada</p>
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
          <button
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
              <ChevronRight size={20} className="text-gray-400" />
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
          .eq('is_published', true);

        if (error) throw error;

        // Filtrar por subcategoría si está definida

        const filtered = data?.filter(b => {
          if (!subcategory) return true;
          const match = b.subcategory && b.subcategory.toLowerCase().includes(subcategory.name.toLowerCase());
          return match;
        }) || [];

        setBusinesses(filtered);
      } catch (error) {
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
      <div className="mx-auto min-h-screen w-full max-w-md bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Subcategoría no encontrada</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative pb-24 overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
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
              ? 'bg-green-500 text-white'
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
              ? 'bg-amber-500 text-white'
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
              <Store className="text-gray-400" size={32} />
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
                    <span className="px-2.5 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                      Abierto
                    </span>
                  )}
                  {business.isNew && (
                    <span className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-full">
                      Nuevo
                    </span>
                  )}
                  {business.isVerified && (
                    <span className="px-2.5 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <BadgeCheck size={12} /> Verificado
                    </span>
                  )}
                </div>

                {/* Favorito */}
                <button
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
                      <span className="text-gray-400 text-sm">({business.review_count || business.reviews || 0})</span>
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
const UserReviewsScreen = ({ onNavigate, user }) => {
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
        .order('created_at', { ascending: false });
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
  }, [user]);

  const renderStars = (rating, interactive = false, onSelect = null) => {
    return Array(5).fill(0).map((_, i) => (
      <button
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
        <button
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
      <main className="flex-1 px-4 py-2 space-y-4 pb-8">
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
                      className="p-2 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-primary/5"
                      title="Editar reseña (solo 1 vez)"
                    >
                      <Edit2 size={18} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-400 px-2">Editada</span>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(review)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
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
      </main>

      {/* Modal de Editar */}
      {editingReview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Editar reseña</h3>
              <button
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
              <textarea
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
                className="flex-1 h-12 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
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
            companyLogo: business.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=567ac7&color=fff`,
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
      } finally {
        setLoading(false);
      }
    };

    loadMyApplications();
  }, [user]);

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
        <button
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
            <Archive className="text-gray-400" size={20} />
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
                <p className="text-gray-400 text-xs mt-2">{app.appliedDate}</p>
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
                      className="flex-1 h-10 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors text-sm"
                    >
                      ✓ Confirmar
                    </button>
                    <button
                      onClick={() => setShowProposeModal(app)}
                      className="flex-1 h-10 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors text-sm"
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
                          step.current ? 'text-primary font-bold' : step.pending ? 'text-gray-400' : 'text-slate-900'
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
                  <MapPin className="text-gray-400" size={18} />
                  <span className="text-gray-600">Presencial en oficinas de {showInterviewDetails.company}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="text-gray-400" size={18} />
                  <span className="text-gray-600">Duración estimada: 30-45 minutos</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Users className="text-gray-400" size={18} />
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
                      className="flex-1 h-10 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
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
                  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}`, '_blank');
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
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
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
                <input
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
                <input
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
                <textarea
                  value={proposedMessage}
                  onChange={(e) => setProposedMessage(e.target.value)}
                  placeholder="Ej: Esa hora me viene mejor porque..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">{proposedMessage.length}/200</p>
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

  // Mock data para demo - solicitudes con presupuestos recibidos
  const mockRequests = [
    {
      id: 1,
      category: 'plumbing',
      categoryName: 'Fontanería',
      categoryIcon: 'Droplet',
      description: 'Fuga de agua en el baño principal, parece que viene de debajo del lavabo.',
      urgency: 'urgent',
      urgencyLabel: 'Urgente',
      status: 'with-quotes', // pending, with-quotes, accepted, completed, rated, expired
      createdAt: '2026-01-21T10:00:00', // Hace 2 días
      photos: ['https://picsum.photos/200/200?random=1'],
      address: 'C/ Mayor 45, Cornellà',
      quotes: [
        { id: 1, businessId: 1, businessName: 'Fontanería Martínez', price: 85, message: 'Puedo ir mañana por la tarde. Incluye mano de obra y materiales básicos.', phone: '612345678', rating: 4.8, reviews: 32, verified: true, respondedAt: '2026-01-21T14:00:00' },
        { id: 2, businessId: 2, businessName: 'Servicios García', price: 95, message: 'Disponible hoy mismo si es urgente. Presupuesto sin compromiso.', phone: '623456789', rating: 4.5, reviews: 18, verified: true, respondedAt: '2026-01-21T15:30:00' },
        { id: 3, businessId: 3, businessName: 'Fontaneros Express', price: 75, message: 'Precio económico. Puedo ir el viernes.', phone: '634567890', rating: 4.2, reviews: 8, verified: false, respondedAt: '2026-01-21T16:00:00' },
      ],
    },
    {
      id: 2,
      category: 'electrical',
      categoryName: 'Electricidad',
      categoryIcon: 'Lightbulb',
      description: 'Instalar 3 enchufes nuevos en el salón.',
      urgency: 'this-week',
      urgencyLabel: 'Esta semana',
      status: 'accepted',
      createdAt: '2026-01-10T09:00:00',
      acceptedQuote: { businessId: 4, businessName: 'Electricidad López', price: 120, phone: '645678901' },
      acceptedAt: '2026-01-10T18:00:00', // Hace más de 1 semana - necesita valoración
      needsRating: true,
      photos: [],
      address: 'C/ Industria 12, Cornellà',
      quotes: [],
    },
    {
      id: 3,
      category: 'cleaning',
      categoryName: 'Limpieza',
      categoryIcon: 'Sparkles',
      description: 'Limpieza profunda de piso de 80m2 después de obras.',
      urgency: 'next-week',
      urgencyLabel: 'Próxima semana',
      status: 'completed',
      createdAt: '2026-01-18T11:00:00',
      acceptedQuote: { businessId: 5, businessName: 'Limpiezas Rosa', price: 150, phone: '656789012' },
      completedAt: '2026-01-20T16:00:00',
      needsRating: true,
      photos: [],
      address: 'Av. Barcelona 88, Cornellà',
      quotes: [],
    },
    {
      id: 4,
      category: 'renovation',
      categoryName: 'Reformas',
      categoryIcon: 'Hammer',
      description: 'Cambiar suelo del baño (5m2).',
      urgency: 'next-week',
      urgencyLabel: 'Próxima semana',
      status: 'pending',
      createdAt: '2026-01-22T08:00:00', // Hace 1 día
      photos: ['https://picsum.photos/200/200?random=2', 'https://picsum.photos/200/200?random=3'],
      address: 'C/ Riera 23, Cornellà',
      quotes: [],
    },
  ];

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
    'climatizacion': 'Climatización',
    'electricista': 'Electricista',
    'fontanero': 'Fontanero',
    'jardineria': 'Jardinería',
    'limpieza': 'Limpieza',
    'mudanzas': 'Mudanzas',
    'pintor': 'Pintor',
    'reparacion': 'Reparación móviles/PC',
  };

  // Combinar y filtrar solicitudes (excluir las expiradas sin aceptar)
  const allRequestsRaw = [...userBudgetRequests.map(r => ({
    ...r,
    categoryName: r.categoryName || serviceCategoryNames[r.category] || 'Servicio',
    categoryIcon: r.categoryIcon || serviceCategoryIcons[r.category] || 'Wrench',
    urgencyLabel: r.urgency === 'urgent' ? 'Urgente' : r.urgency === 'this-week' ? 'Esta semana' : 'Próxima semana',
    status: acceptedRequests[r.id] ? 'accepted' : (r.responses && r.responses.length > 0) ? 'with-quotes' : 'pending',
    quotes: (r.responses || []).map(resp => ({
      id: resp.id,
      businessId: resp.businessId,
      businessName: resp.businessName,
      price: resp.price,
      message: resp.message,
      phone: resp.phone,
      rating: parseFloat((4.0 + Math.random() * 0.9).toFixed(1)), // Rating con 1 decimal
      reviews: Math.floor(5 + Math.random() * 30),
      verified: Math.random() > 0.3, // 70% verificados
      respondedAt: resp.respondedAt,
    })),
  })), ...mockRequests];

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
    window.open(`https://wa.me/34${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCall = (phone) => {
    window.open(`tel:+34${phone}`, '_self');
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/95 backdrop-blur-sm p-4 z-20 sticky top-0 border-b border-gray-100">
        <button
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
                <ClipboardList className="text-gray-400" size={32} />
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
                    <ChevronRight className="text-gray-400 shrink-0" size={20} />
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
                        <button
                          onClick={(e) => { e.stopPropagation(); handleContactWhatsApp(request.acceptedQuote.phone, request.acceptedQuote.businessName); }}
                          className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button
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
                        {acceptedQuote.rating && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Star className="text-yellow-500 fill-yellow-500" size={14} />
                            <span>{typeof acceptedQuote.rating === 'number' ? acceptedQuote.rating.toFixed(1) : acceptedQuote.rating}</span>
                            {acceptedQuote.reviews && <span>({acceptedQuote.reviews} reseñas)</span>}
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
                      className="flex-1 h-12 bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
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
                        {isAccepted && <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">ELEGIDO</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Star className="text-yellow-500 fill-yellow-500" size={12} />
                        <span>{typeof quote.rating === 'number' ? quote.rating.toFixed(1) : quote.rating}</span>
                        <span>({quote.reviews} reseñas)</span>
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
                        className="flex-1 h-11 bg-green-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-green-600"
                      >
                        <MessageCircle size={18} />
                        WhatsApp
                      </button>
                      <button
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
              <Clock className="mx-auto mb-2 text-gray-400" size={32} />
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
                <button
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none mb-4"
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

// Pantalla de Presupuestos Entrantes (para negocios)
const IncomingBudgetRequestsScreen = ({ onNavigate, businessData, showToast, onAddNotification, requests = [], onSendQuote }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [replyPrice, setReplyPrice] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, new, replied, accepted
  const [ignoredRequests, setIgnoredRequests] = useState([]);
  const [showIgnoreConfirm, setShowIgnoreConfirm] = useState(false);

  // Calcular hace cuánto tiempo llegó
  const getTimeAgo = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
  };

  // Usar solicitudes del prop
  const incomingRequests = requests;

  const handleSendQuote = async () => {

    if (!replyPrice || !replyMessage.trim()) {
      return;
    }

    try {
      if (onSendQuote) {
        await onSendQuote(selectedRequest.id, {
          price: replyPrice,
          message: replyMessage,
        });
      } else {
      }

      // Mostrar toast de éxito
      if (showToast) {
        showToast(`¡Presupuesto de ${replyPrice}€ enviado a ${selectedRequest.customerName}!`, 'success');
      }

      setSelectedRequest(null);
      setReplyPrice('');
      setReplyMessage('');
    } catch (error) {
      if (showToast) {
        showToast(formatSupabaseError(error), 'error');
      }
    }
  };

  const handleContactWhatsApp = (phone, customerName) => {
    const text = `Hola ${customerName}, soy de ${businessData?.name || 'tu negocio local'}. Te contacto por tu solicitud de presupuesto en Cornellà Local.`;
    window.open(`https://wa.me/34${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>Nuevo</span>;
      case 'replied':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Respondido</span>;
      case 'accepted':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Aceptado</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">No seleccionado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/95 backdrop-blur-sm p-4 z-20 sticky top-0 border-b border-gray-100">
        <button
          onClick={() => selectedRequest ? setSelectedRequest(null) : onNavigate('profile')}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          {selectedRequest ? 'Detalle de Solicitud' : 'Presupuestos Entrantes'}
        </h2>
      </div>

      {/* Lista de solicitudes */}
      {!selectedRequest && (
        <div className="p-4 pb-24 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`rounded-xl p-3 text-center border transition-all ${
                activeFilter === 'all'
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <p className={`text-xl font-bold ${activeFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>
                {incomingRequests.filter(r => !ignoredRequests.includes(r.id)).length}
              </p>
              <p className={`text-[10px] ${activeFilter === 'all' ? 'text-white/80' : 'text-gray-500'}`}>Todas</p>
            </button>
            <button
              onClick={() => setActiveFilter('new')}
              className={`rounded-xl p-3 text-center border transition-all ${
                activeFilter === 'new'
                  ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <p className={`text-xl font-bold ${activeFilter === 'new' ? 'text-white' : 'text-red-500'}`}>
                {incomingRequests.filter(r => r.status === 'new' && !ignoredRequests.includes(r.id)).length}
              </p>
              <p className={`text-[10px] ${activeFilter === 'new' ? 'text-white/80' : 'text-gray-500'}`}>Nuevas</p>
            </button>
            <button
              onClick={() => setActiveFilter('replied')}
              className={`rounded-xl p-3 text-center border transition-all ${
                activeFilter === 'replied'
                  ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <p className={`text-xl font-bold ${activeFilter === 'replied' ? 'text-white' : 'text-blue-500'}`}>
                {incomingRequests.filter(r => r.status === 'replied').length}
              </p>
              <p className={`text-[10px] ${activeFilter === 'replied' ? 'text-white/80' : 'text-gray-500'}`}>Enviadas</p>
            </button>
            <button
              onClick={() => setActiveFilter('accepted')}
              className={`rounded-xl p-3 text-center border transition-all ${
                activeFilter === 'accepted'
                  ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <p className={`text-xl font-bold ${activeFilter === 'accepted' ? 'text-white' : 'text-green-500'}`}>
                {incomingRequests.filter(r => r.status === 'accepted').length}
              </p>
              <p className={`text-[10px] ${activeFilter === 'accepted' ? 'text-white/80' : 'text-gray-500'}`}>Ganadas</p>
            </button>
          </div>

          {/* Filtered list */}
          {incomingRequests
            .filter(r => !ignoredRequests.includes(r.id))
            .filter(r => activeFilter === 'all' || r.status === activeFilter)
            .length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="text-gray-400" size={32} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Sin solicitudes</h3>
              <p className="text-sm text-gray-500">No hay solicitudes en esta categoría</p>
            </div>
          ) : (
            incomingRequests
              .filter(r => !ignoredRequests.includes(r.id))
              .filter(r => activeFilter === 'all' || r.status === activeFilter)
              .map(request => (
            <div
              key={request.id}
              onClick={() => setSelectedRequest(request)}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                  {request.customerAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-bold text-slate-900">{request.customerName}</h4>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{request.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className={`flex items-center gap-1 ${
                      request.urgency === 'urgent' ? 'text-red-500 font-medium' :
                      request.urgency === 'this-week' ? 'text-amber-500' : 'text-green-500'
                    }`}>
                      {request.urgency === 'urgent' && <Zap size={12} />}
                      {request.urgencyLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {request.address.split(',')[0]}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-400">{getTimeAgo(request.createdAt)}</span>
                  </div>
                </div>
                <ChevronRight className="text-gray-400 shrink-0" size={20} />
              </div>

              {request.status === 'replied' && request.myQuote && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Tu presupuesto:</span>
                  <span className="font-bold text-primary">{request.myQuote.price}€</span>
                </div>
              )}

              {request.status === 'accepted' && (
                <div className="mt-3 pt-3 border-t border-green-100 flex items-center gap-2 text-green-600">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">¡Te han elegido! - {request.myQuote?.price}€</span>
                </div>
              )}
            </div>
          ))
          )}
        </div>
      )}

      {/* Detalle de solicitud */}
      {selectedRequest && (
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Customer info */}
          <div className="bg-white p-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                {selectedRequest.customerAvatar}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-lg">{selectedRequest.customerName}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin size={14} />
                  {selectedRequest.address}
                </div>
              </div>
              {getStatusBadge(selectedRequest.status)}
            </div>
          </div>

          {/* Request details */}
          <div className="p-4 space-y-4">
            {/* Urgency */}
            <div className={`flex items-center gap-3 p-3 rounded-xl ${
              selectedRequest.urgency === 'urgent' ? 'bg-red-50' :
              selectedRequest.urgency === 'this-week' ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedRequest.urgency === 'urgent' ? 'bg-red-100' :
                selectedRequest.urgency === 'this-week' ? 'bg-amber-100' : 'bg-green-100'
              }`}>
                <Icon name={selectedRequest.urgency === 'urgent' ? 'Zap' : 'Clock'} size={20} className={
                  selectedRequest.urgency === 'urgent' ? 'text-red-600' :
                  selectedRequest.urgency === 'this-week' ? 'text-amber-600' : 'text-green-600'
                } />
              </div>
              <div>
                <p className={`font-bold ${
                  selectedRequest.urgency === 'urgent' ? 'text-red-700' :
                  selectedRequest.urgency === 'this-week' ? 'text-amber-700' : 'text-green-700'
                }`}>{selectedRequest.urgencyLabel}</p>
                <p className="text-xs text-gray-500">
                  {selectedRequest.urgency === 'urgent' ? 'El cliente necesita atención inmediata' :
                   selectedRequest.urgency === 'this-week' ? 'Flexible dentro de esta semana' : 'Sin prisa, próxima semana'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h4 className="font-bold text-slate-900 mb-2">Descripción del trabajo</h4>
              <p className="text-gray-600">{selectedRequest.description}</p>
            </div>

            {/* Photos */}
            {selectedRequest.photos?.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Fotos adjuntas</h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedRequest.photos.map((photo, i) => (
                    <div key={i} className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url("${photo}")` }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleContactWhatsApp(selectedRequest.phone, selectedRequest.customerName)}
                className="flex-1 h-12 bg-green-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-green-600"
              >
                <MessageCircle size={20} />
                WhatsApp
              </button>
              <button
                onClick={() => window.open(`tel:+34${selectedRequest.phone}`, '_self')}
                className="flex-1 h-12 bg-primary text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700"
              >
                <Phone size={20} />
                Llamar
              </button>
            </div>

            {/* Reply form - only for new requests */}
            {selectedRequest.status === 'new' && (
              <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-4">
                <h4 className="font-bold text-slate-900">Enviar presupuesto</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Precio (€)</label>
                  <input
                    type="number"
                    value={replyPrice}
                    onChange={(e) => setReplyPrice(e.target.value)}
                    placeholder="85"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 text-lg font-bold placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje</label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Describe qué incluye tu presupuesto, disponibilidad, etc."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <button
                  onClick={handleSendQuote}
                  disabled={!replyPrice || !replyMessage.trim()}
                  className={`w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    replyPrice && replyMessage.trim()
                      ? 'bg-primary text-white hover:bg-blue-700 shadow-lg shadow-primary/20'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                  Enviar Presupuesto
                </button>

                <button
                  onClick={() => setShowIgnoreConfirm(true)}
                  className="w-full h-10 rounded-xl text-gray-500 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                  No me interesa esta solicitud
                </button>
              </div>
            )}

            {/* Already replied */}
            {selectedRequest.status === 'replied' && selectedRequest.myQuote && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="text-blue-600" size={20} />
                  <h4 className="font-bold text-blue-800">Presupuesto enviado</h4>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-700">Tu precio:</span>
                  <span className="text-xl font-bold text-blue-800">{selectedRequest.myQuote.price}€</span>
                </div>
                <p className="text-sm text-blue-600">{selectedRequest.myQuote.message}</p>
              </div>
            )}

            {/* Accepted */}
            {selectedRequest.status === 'accepted' && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="text-green-600" size={24} />
                  <h4 className="font-bold text-green-800">¡Te han seleccionado!</h4>
                </div>
                <p className="text-sm text-green-700">El cliente ha aceptado tu presupuesto de {selectedRequest.myQuote?.price}€. Contacta con él para coordinar el servicio.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmar ignorar */}
      {showIgnoreConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-scaleIn">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="text-red-500" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">¿Ignorar esta solicitud?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Esta solicitud no volverá a aparecer en tu lista. El cliente no será notificado.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowIgnoreConfirm(false)}
                className="flex-1 h-12 rounded-xl font-medium bg-gray-100 text-slate-700 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIgnoredRequests(prev => [...prev, selectedRequest.id]);
                  setShowIgnoreConfirm(false);
                  setSelectedRequest(null);
                }}
                className="flex-1 h-12 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Pantalla de Responder Presupuesto (para dueños de negocio)
const BusinessBudgetReplyScreen = ({ onNavigate }) => {
  const request = budgetRequests[0];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-white">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/95 backdrop-blur-sm p-4 pb-2 z-20 sticky top-0 border-b border-gray-100">
        <button
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          Detalle de Solicitud
        </h2>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Customer Profile */}
        <div className="px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="relative">
                <div
                  className="rounded-full h-14 w-14 shadow-sm border border-gray-100 bg-cover bg-center"
                  style={{ backgroundImage: `url("${request.customerAvatar}")` }}
                />
                {request.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    <BadgeCheck className="text-primary" size={18} />
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-slate-900 text-lg font-bold leading-tight">{request.customerName}</h3>
                <p className="text-gray-500 text-sm font-medium leading-normal mt-0.5">{request.requestDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
              <Star className="text-yellow-500 fill-yellow-500" size={18} />
              <p className="text-slate-900 text-sm font-bold">{request.customerRating}</p>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-gray-100 mb-6" />

        {/* Request Details */}
        <div className="px-4 space-y-6">
          {/* Message */}
          <div>
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 px-1">Mensaje del cliente</h3>
            <div className="bg-gray-100 rounded-2xl rounded-tl-none p-5 text-slate-900 text-base leading-relaxed">
              <p>{request.message}</p>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                Adjuntos ({request.attachments.length})
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x">
              {request.attachments.map((img, idx) => (
                <div
                  key={idx}
                  className="shrink-0 snap-center h-32 w-32 rounded-xl bg-cover bg-center shadow-sm border border-gray-200"
                  style={{ backgroundImage: `url("${img}")` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Response Form */}
        <div className="mt-4 px-4 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-6">
            <ClipboardList className="text-primary" size={24} />
            <h3 className="text-slate-900 text-xl font-bold">Tu Propuesta</h3>
          </div>
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Presupuesto estimado</label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="text-gray-400 text-2xl font-medium">€</span>
                </div>
                <input
                  className="block w-full rounded-xl border-gray-200 bg-white py-4 pl-10 pr-12 text-3xl font-bold text-gray-900 placeholder:text-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  placeholder="0.00"
                  type="number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción de la propuesta</label>
              <textarea
                className="block w-full rounded-xl border-gray-200 bg-white py-3 px-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm resize-none leading-relaxed"
                placeholder="Hola Maria, he visto las fotos y puedo pasarme mañana por la tarde para arreglarlo. El precio incluye piezas y mano de obra..."
                rows={5}
              />
            </div>
          </form>
        </div>
      </div>

      {/* Sticky Button */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-t border-gray-100 px-4 py-4 pb-8">
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-white shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] hover:bg-blue-700">
          <span className="text-base font-bold tracking-wide">Enviar Propuesta</span>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

// Pantalla de Gestión de Ofertas (para dueños de negocio)
const BusinessOffersScreen = ({ onNavigate, userOffers = [], toggleVisibility: toggleVisibilityProp }) => {
  const [filter, setFilter] = useState('all');
  const [offersState, setOffersState] = useState(userOffers);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [offerToToggle, setOfferToToggle] = useState(null);

  // Actualizar estado cuando cambien userOffers
  useEffect(() => {
    setOffersState(userOffers);
  }, [userOffers]);

  const filteredOffers = offersState.filter(offer => {
    if (filter === 'all') return true;
    if (filter === 'active') return offer.status === 'active';
    if (filter === 'paused') return offer.status === 'paused';
    return true;
  });

  const handleToggleVisibility = (id) => {
    const offer = offersState.find(o => o.id === id);
    if (offer && offer.status === 'active') {
      // Si está activa, mostrar confirmación antes de pausar
      setOfferToToggle(offer);
      setShowDeactivateConfirm(true);
    } else {
      // Si está pausada, reactivar directamente
      toggleVisibility(id);
    }
  };

  const confirmToggle = () => {
    if (offerToToggle) {
      toggleVisibility(offerToToggle.id);
      setShowDeactivateConfirm(false);
      setOfferToToggle(null);
    }
  };

  const toggleVisibility = (id) => {
    const offer = offersState.find(o => o.id === id);
    if (offer && toggleVisibilityProp) {
      toggleVisibilityProp(id, offer.status);
    }
    // Actualizar estado local inmediatamente para feedback
    setOffersState(prev => prev.map(offer =>
      offer.id === id
        ? { ...offer, isVisible: !offer.isVisible, status: offer.status === 'active' ? 'paused' : 'active' }
        : offer
    ));
  };

  const handleDeleteOffer = (offer) => {
    setOfferToDelete(offer);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (offerToDelete) {
      try {
        const { error } = await supabase
          .from('offers')
          .delete()
          .eq('id', offerToDelete.id);

        if (error) throw error;

        setOffersState(prev => prev.filter(o => o.id !== offerToDelete.id));
        showToast(SUCCESS_MESSAGES.deleted, 'success');
      } catch (error) {
        showToast(formatSupabaseError(error), 'error');
      } finally {
        setShowDeleteConfirm(false);
        setOfferToDelete(null);
      }
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-white/90 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-100">
        <button
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">Gestión de Ofertas</h2>
        <button
          onClick={() => onNavigate('create-offer')}
          className="flex size-12 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-3 px-4 py-3 overflow-x-auto bg-gray-50">
        {['all', 'active', 'paused'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-transform active:scale-95 ${
              filter === f
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-gray-200 text-slate-900 shadow-sm'
            }`}
          >
            <p className="text-sm font-medium leading-normal">
              {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Pausadas'}
            </p>
          </button>
        ))}
      </div>

      {/* Offers List */}
      <div className="flex flex-col gap-4 p-4 pb-24">
        {filteredOffers.map(offer => (
          <div
            key={offer.id}
            className={`flex flex-col rounded-xl bg-white p-4 shadow-sm border border-gray-100 ${
              offer.status === 'paused' ? 'opacity-90' : ''
            }`}
          >
            {/* Top Section */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${
                    offer.status === 'active'
                      ? 'bg-green-50 text-green-700 ring-green-600/20'
                      : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                  }`}>
                    {offer.status === 'active' ? 'ACTIVA' : 'PAUSADA'}
                  </span>
                  {offer.expiresSoon && (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                      Expira pronto
                    </span>
                  )}
                </div>
                <h3 className="text-slate-900 text-lg font-bold leading-tight">{offer.title}</h3>
                <p className="text-primary text-base font-bold leading-normal mt-0.5">{offer.discount}</p>
                <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${
                  offer.expiresSoon ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {offer.timeLeft ? (
                    <>
                      <Timer size={16} />
                      <span>Termina en {offer.timeLeft}</span>
                    </>
                  ) : (
                    <>
                      <Pause size={16} />
                      <span>Pausada manualmente</span>
                    </>
                  )}
                </div>
              </div>
              <div
                className={`w-24 h-24 shrink-0 bg-cover bg-center rounded-lg shadow-inner bg-gray-100 ${
                  offer.status === 'paused' ? 'grayscale-[50%]' : ''
                }`}
                style={{ backgroundImage: `url("${offer.image}")` }}
              />
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gray-100 mb-3" />

            {/* Stats de redención */}
            <div className="flex items-center gap-1.5 text-sm mb-3">
              <Ticket size={14} className="text-amber-500" />
              <span className="text-gray-600">
                <span className="font-bold text-gray-900">{offer.redemptions}</span>
                {offer.maxUses ? <span className="text-gray-400">/{offer.maxUses}</span> : ''} canjeados
              </span>
              {offer.maxUses && offer.redemptions >= offer.maxUses && (
                <span className="ml-1 text-xs font-bold text-red-500">· AGOTADA</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={offer.isVisible}
                  onChange={() => handleToggleVisibility(offer.id)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                <span className={`ms-2 text-sm font-medium ${offer.isVisible ? 'text-gray-900' : 'text-gray-500'}`}>
                  {offer.isVisible ? 'Visible' : 'Pausada'}
                </span>
              </label>
              <button
                onClick={() => handleDeleteOffer(offer)}
                className="flex items-center justify-center h-9 px-4 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium gap-1.5"
              >
                <Trash2 size={16} />
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de confirmación de eliminación */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setOfferToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={`la oferta "${offerToDelete?.title || 'esta oferta'}"`}
      />

      {/* Modal de confirmación de pausar */}
      <DeactivateConfirmModal
        isOpen={showDeactivateConfirm}
        onClose={() => {
          setShowDeactivateConfirm(false);
          setOfferToToggle(null);
        }}
        onConfirm={confirmToggle}
        itemName={offerToToggle?.title || 'esta oferta'}
        action="pausar"
      />
    </div>
  );
};

// Pantalla de Gestión de Ofertas de Empleo
const BusinessJobsScreen = ({ onNavigate, userJobOffers = [], deleteJobOffer, jobApplications = [] }) => {
  const [filter, setFilter] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);

  const filteredJobs = userJobOffers.filter(job => {
    if (filter === 'all') return true;
    if (filter === 'active') return job.status === 'active';
    if (filter === 'paused') return job.status === 'paused';
    return true;
  });

  const handleDelete = (job) => {
    setJobToDelete(job);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (jobToDelete) {
      await deleteJobOffer(jobToDelete.id);
      setShowDeleteConfirm(false);
      setJobToDelete(null);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-white/90 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-100">
        <button
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">Ofertas de Empleo</h2>
        <button
          onClick={() => onNavigate('create-job-offer')}
          className="flex size-12 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus size={24} />
        </button>
      </header>

      {/* Candidates Banner */}
      <button
        onClick={() => onNavigate('business-candidates')}
        className="mx-4 mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-4 shadow-lg shadow-purple-500/20 flex items-center justify-between hover:shadow-xl transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Users className="text-white" size={24} />
          </div>
          <div className="text-left">
            <h3 className="text-white font-bold">Candidaturas recibidas</h3>
            <p className="text-white/80 text-sm">{jobApplications.filter(c => c.status === 'pending').length} nuevas por revisar</p>
          </div>
        </div>
        <ChevronRight className="text-white/80 group-hover:translate-x-1 transition-transform" size={24} />
      </button>

      {/* Filter Chips */}
      <div className="flex gap-3 px-4 py-3 overflow-x-auto bg-gray-50">
        {['all', 'active', 'paused'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-transform active:scale-95 ${
              filter === f
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-gray-200 text-slate-900 shadow-sm'
            }`}
          >
            <p className="text-sm font-medium leading-normal">
              {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Pausadas'}
            </p>
          </button>
        ))}
      </div>

      {/* Jobs List */}
      <div className="flex flex-col gap-4 p-4 pb-24">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Briefcase className="text-gray-400" size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No hay ofertas de empleo</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Crea tu primera oferta de empleo para encontrar al candidato ideal
            </p>
            <button
              onClick={() => onNavigate('create-job-offer')}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Crear oferta
            </button>
          </div>
        ) : (
          filteredJobs.map(job => (
            <div
              key={job.id}
              className={`flex flex-col rounded-xl bg-white p-4 shadow-sm border border-gray-100 ${
                job.status === 'paused' ? 'opacity-90' : ''
              }`}
            >
              {/* Top Section */}
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${
                      job.status === 'closed'
                        ? 'bg-gray-50 text-gray-700 ring-gray-600/20'
                        : job.status === 'active'
                          ? 'bg-green-50 text-green-700 ring-green-600/20'
                          : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                    }`}>
                      {job.status === 'closed'
                        ? `CUBIERTA${job.hiredCandidateName ? ` - ${job.hiredCandidateName}` : ''}`
                        : job.status === 'active' ? 'ACTIVA' : 'PAUSADA'}
                    </span>
                    {job.applications > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('business-candidates');
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <Users size={12} />
                        {job.applications} candidatos
                      </button>
                    )}
                  </div>
                  <h3 className="text-slate-900 text-lg font-bold leading-tight">{job.title}</h3>
                  <p className="text-primary text-base font-bold leading-normal mt-0.5">
                    {formatCurrency(job.salaryMin || 0, false)} - {formatCurrency(job.salaryMax || 0, false)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <MapPin size={14} />
                    <span>{job.location}</span>
                    <span className="text-gray-300">•</span>
                    <span>{job.contract}</span>
                  </div>
                </div>
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                  job.status === 'paused' ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-primary/10 border-primary/20 text-primary'
                }`}>
                  <Briefcase size={28} />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-gray-100 mb-3" />

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={14} />
                  <span>Publicada {job.postedAgo}</span>
                </div>
                <button
                  onClick={() => handleDelete(job)}
                  className="flex items-center justify-center h-9 px-4 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium gap-1.5"
                >
                  <Trash2 size={16} />
                  Borrar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmación */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setJobToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={`la oferta "${jobToDelete?.title || 'esta oferta'}"`}
      />
    </div>
  );
};

// Pantalla de Candidaturas Recibidas (para empresas)
const BusinessCandidatesScreen = ({ onNavigate, user, businessData, showToast }) => {
  const [filter, setFilter] = useState('all');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');

  // Cargar candidaturas desde Supabase
  useEffect(() => {
    const loadCandidates = async () => {
      if (!user?.id || !businessData?.id) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      try {
        // Obtener todos los empleos del negocio
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('id')
          .eq('business_id', businessData.id);

        if (jobsError) throw jobsError;

        const jobIds = (jobsData || []).map(j => j.id);

        if (jobIds.length === 0) {
          setCandidates([]);
          setLoading(false);
          return;
        }

        // Obtener candidaturas de esos empleos
        const { data, error } = await supabase
          .from('job_applications')
          .select(`
            *,
            jobs!inner(
              id,
              title,
              type
            )
          `)
          .in('job_id', jobIds)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transformar al formato esperado por el componente
        const transformedCandidates = (data || []).map(app => {
          return {
            id: app.id,
            jobId: app.job_id, // ID del empleo
            jobTitle: app.jobs.title,
            userId: app.user_id, // ID del candidato
            appliedDate: formatDate(app.created_at, 'short'),
            appliedAgo: formatRelativeTime(app.created_at),
            message: app.message || 'Sin mensaje',
            // Mapear estados de DB a estados de UI
            status: app.status === 'pending' ? 'new' :
                    app.status === 'reviewed' ? 'reviewing' :
                    app.status === 'shortlisted' ? 'interview' :
                    app.status === 'hired' ? 'hired' :
                    app.status === 'rejected' ? 'rejected' : 'new',
            interviewDate: app.interview_date ? new Date(app.interview_date).toLocaleString('es-ES', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            }) : null,
            interviewConfirmed: app.interview_confirmed || null,
            ownerNotes: app.owner_notes || '',
            dbId: app.id, // ID real de la DB para updates
            dbStatus: app.status, // Estado real de la DB
            // Sub-objeto candidate con info del candidato
            candidate: {
              name: app.full_name,
              email: app.email,
              phone: app.phone || 'No proporcionado',
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(app.full_name)}&background=567ac7&color=fff&size=128`,
              experience: app.phone || app.email, // Mostrar contacto como "experiencia"
              cv: app.cv_url || null
            }
          };
        });

        setCandidates(transformedCandidates);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadCandidates();
  }, [user, businessData]);

  // Contar por estado
  const counts = {
    all: candidates.length,
    new: candidates.filter(c => c.status === 'new').length,
    reviewing: candidates.filter(c => c.status === 'reviewing').length,
    interview: candidates.filter(c => c.status === 'interview').length,
    hired: candidates.filter(c => c.status === 'hired').length,
  };

  // Filtrar
  const filtered = filter === 'all'
    ? candidates.filter(c => c.status !== 'rejected')
    : candidates.filter(c => c.status === filter);

  // Configuración de estados
  const statusStyles = {
    new: { label: 'Nuevo', bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },
    reviewing: { label: 'En revisión', bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700' },
    interview: { label: 'Entrevista', bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
    hired: { label: 'Contratado', bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700' },
    rejected: { label: 'Descartado', bg: 'bg-gray-400', light: 'bg-gray-100', text: 'text-gray-600' },
  };

  const updateStatus = async (id, newStatus) => {
    // Mapear estado de UI a estado de DB
    const dbStatusMap = {
      'new': 'pending',
      'reviewing': 'reviewed',
      'interview': 'shortlisted',
      'hired': 'hired',
      'rejected': 'rejected'
    };

    const dbStatus = dbStatusMap[newStatus] || 'pending';
    const hiredCandidate = candidates.find(c => c.id === id);

    // Optimistic update
    if (newStatus === 'hired' && hiredCandidate) {
      // Primero, actualizar solo el contratado
      setCandidates(prev => prev.map(c =>
        c.id === id ? { ...c, status: newStatus, dbStatus } : c
      ));

      // Después de 1.5 segundos, rechazar a los demás (transición suave)
      const otherCandidatesCount = candidates.filter(c => c.jobId === hiredCandidate.jobId && c.id !== id).length;

      setTimeout(() => {
        setCandidates(prev => prev.map(c =>
          c.jobId === hiredCandidate.jobId && c.id !== id
            ? { ...c, status: 'rejected', dbStatus: 'rejected' }
            : c
        ));
      }, 1500);

      // Toast informativo con número de rechazados
      if (otherCandidatesCount > 0) {
        showToast(`¡${hiredCandidate.candidate.name} contratado! ${otherCandidatesCount} candidato${otherCandidatesCount > 1 ? 's' : ''} rechazado${otherCandidatesCount > 1 ? 's' : ''} automáticamente.`, 'success');
      } else {
        showToast(`¡${hiredCandidate.candidate.name} contratado!`, 'success');
      }
    } else {
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, dbStatus } : c));
    }

    if (selectedCandidate?.id === id) {
      setSelectedCandidate(prev => prev ? { ...prev, status: newStatus, dbStatus } : null);
    }

    try {
      // Persistir en Supabase
      const { error } = await supabase
        .from('job_applications')
        .update({ status: dbStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Si contratamos a alguien, rechazar a los demás y enviar notificaciones
      if (newStatus === 'hired' && hiredCandidate) {
        // Obtener todos los demás candidatos del mismo empleo
        const otherCandidates = candidates.filter(c => c.jobId === hiredCandidate.jobId && c.id !== id);

        // Rechazar a los demás en la base de datos
        if (otherCandidates.length > 0) {
          const otherIds = otherCandidates.map(c => c.id);
          const { error: rejectError } = await supabase
            .from('job_applications')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .in('id', otherIds);

          if (rejectError) {
          } else {
          }

          // Crear notificaciones para los rechazados
          const rejectNotifications = otherCandidates.map(c => ({
            user_id: c.userId,
            type: 'application_rejected',
            title: 'Candidatura no seleccionada',
            message: `Gracias por tu interés en ${hiredCandidate.jobTitle}. Lamentablemente, hemos seleccionado a otro candidato. ¡Te deseamos mucho éxito en tu búsqueda!`,
            data: { job_id: hiredCandidate.jobId, job_title: hiredCandidate.jobTitle },
            is_read: false,
            created_at: new Date().toISOString()
          }));

          await supabase.from('notifications').insert(rejectNotifications);
        }

        // Crear notificación para el contratado
        await supabase.from('notifications').insert({
          user_id: hiredCandidate.userId,
          type: 'application_accepted',
          title: '¡Felicidades! Has sido seleccionado',
          message: `¡Enhorabuena! Has sido seleccionado para el puesto de ${hiredCandidate.jobTitle}. La empresa se pondrá en contacto contigo pronto.`,
          data: { job_id: hiredCandidate.jobId, job_title: hiredCandidate.jobTitle },
          is_read: false,
          created_at: new Date().toISOString()
        });


        // Cerrar automáticamente la oferta de empleo
        const { error: jobCloseError } = await supabase
          .from('jobs')
          .update({ status: 'closed', updated_at: new Date().toISOString() })
          .eq('id', hiredCandidate.jobId);

        if (jobCloseError) {
        } else {
        }
      }

      // Si rechazamos manualmente a alguien, enviar notificación
      if (newStatus === 'rejected' && hiredCandidate) {
        await supabase.from('notifications').insert({
          user_id: hiredCandidate.userId,
          type: 'application_rejected',
          title: 'Candidatura no seleccionada',
          message: `Gracias por tu interés en ${hiredCandidate.jobTitle}. Lamentablemente, hemos decidido no continuar con tu candidatura. ¡Te deseamos mucho éxito!`,
          data: { job_id: hiredCandidate.jobId, job_title: hiredCandidate.jobTitle },
          is_read: false,
          created_at: new Date().toISOString()
        });
        showToast('Candidato rechazado. Se ha enviado notificación.', 'success');
      }
    } catch (error) {
      showToast(formatSupabaseError(error), 'error');
      // Revertir optimistic update en caso de error
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: candidates.find(cc => cc.id === id)?.status || 'new' } : c));
    }
  };

  const scheduleInterview = async () => {
    if (!interviewDate || !interviewTime || !selectedCandidate) return;

    const dateTime = `${interviewDate} ${interviewTime}`;
    const interviewDateTime = new Date(`${interviewDate}T${interviewTime}`);

    // Optimistic update
    setCandidates(prev => prev.map(c =>
      c.id === selectedCandidate.id
        ? { ...c, status: 'interview', interviewDate: dateTime, interviewConfirmed: null }
        : c
    ));
    setSelectedCandidate(prev => prev ? { ...prev, status: 'interview', interviewDate: dateTime, interviewConfirmed: null } : null);

    try {
      // Guardar en Supabase
      const { error } = await supabase
        .from('job_applications')
        .update({
          status: 'shortlisted',
          interview_date: interviewDateTime.toISOString(),
          interview_location: 'Por confirmar',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCandidate.id);

      if (error) throw error;


      // Enviar notificación al candidato
      await supabase.from('notifications').insert({
        user_id: selectedCandidate.userId,
        type: 'interview_scheduled',
        title: '¡Entrevista programada!',
        message: `Has sido preseleccionado para ${selectedCandidate.jobTitle}. Fecha: ${interviewDateTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. ¡Mucha suerte!`,
        data: { job_id: selectedCandidate.jobId, job_title: selectedCandidate.jobTitle, interview_date: interviewDateTime.toISOString() },
        is_read: false,
        created_at: new Date().toISOString()
      });

      showToast(`Entrevista programada. ${selectedCandidate.candidate.name} ha sido notificado.`, 'success');
    } catch (error) {
      showToast('Error al programar entrevista', 'error');
      // Revertir optimistic update si falla
      setCandidates(prev => prev.map(c =>
        c.id === selectedCandidate.id
          ? { ...c, status: selectedCandidate.dbStatus, interviewDate: null }
          : c
      ));
    }

    setShowScheduleModal(false);
    setInterviewDate('');
    setInterviewTime('');
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative shadow-2xl bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="flex items-center px-4 py-4">
          <button
            onClick={() => onNavigate('business-jobs')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={22} className="text-slate-800" />
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-slate-900">Candidaturas</h1>
          <div className="w-10" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 px-4 pb-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{counts.new}</p>
            <p className="text-[10px] font-medium text-blue-600 uppercase">Nuevos</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{counts.reviewing}</p>
            <p className="text-[10px] font-medium text-amber-600 uppercase">Revisión</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{counts.interview}</p>
            <p className="text-[10px] font-medium text-purple-600 uppercase">Entrevista</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{counts.hired}</p>
            <p className="text-[10px] font-medium text-green-600 uppercase">Contratados</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'new', label: 'Nuevos' },
            { id: 'interview', label: 'Entrevistas' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                filter === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Lista de candidatos */}
      <div className="p-4 pb-24">
        {loading ? (
          <>
            <ApplicationSkeleton />
            <ApplicationSkeleton />
            <ApplicationSkeleton />
            <ApplicationSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No hay candidaturas{filter !== 'all' ? ` en "${filter}"` : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const style = statusStyles[c.status];
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCandidate(c)}
                  className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                    c.status === 'new' ? 'border-blue-200 shadow-sm' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={c.candidate.avatar}
                        alt={c.candidate.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {c.status === 'new' && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{c.candidate.name}</h3>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${style.light} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{c.candidate.experience}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c.jobTitle}</span>
                        {c.candidate.cv && (
                          <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FileText size={10} />
                            CV
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{c.appliedAgo}</span>
                      </div>
                    </div>

                    <ChevronRight size={18} className="text-gray-300 shrink-0" />
                  </div>

                  {/* Info entrevista */}
                  {c.status === 'interview' && c.interviewDate && (
                    <div className="mt-3 flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
                      <Calendar size={14} className="text-purple-600" />
                      <span className="text-xs font-medium text-purple-700">{c.interviewDate}</span>
                      {c.interviewConfirmed === true && <CheckCircle2 size={14} className="text-green-500 ml-auto" />}
                      {c.interviewConfirmed === null && <Clock size={14} className="text-amber-500 ml-auto" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal detalle candidato */}
      {selectedCandidate && !showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slideUp">
            {/* Header con foto */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 px-6 pt-6 pb-16">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center"
              >
                <X size={18} className="text-white" />
              </button>
              <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${statusStyles[selectedCandidate.status].bg} text-white mb-3`}>
                {statusStyles[selectedCandidate.status].label}
              </span>
              <h2 className="text-xl font-bold text-white">{selectedCandidate.candidate.name}</h2>
              <p className="text-white/70 text-sm">{selectedCandidate.candidate.experience}</p>
            </div>

            {/* Avatar flotante */}
            <div className="relative px-6 -mt-10 mb-4">
              <img
                src={selectedCandidate.candidate.avatar}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg"
              />
            </div>

            {/* Contenido */}
            <div className="px-6 pb-6">
              {/* Posición */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-4">
                <p className="text-xs text-primary font-medium mb-1">Se postuló para</p>
                <p className="font-semibold text-slate-900">{selectedCandidate.jobTitle}</p>
                <p className="text-xs text-gray-500 mt-1">Aplicado {selectedCandidate.appliedAgo}</p>
              </div>

              {/* Currículum - Sección destacada */}
              {selectedCandidate.candidate.cv && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Currículum Vitae</p>
                  <a
                    href={selectedCandidate.candidate.cv}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-100 rounded-xl hover:border-red-200 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText size={24} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">CV_{selectedCandidate.candidate.name.replace(/\s+/g, '_')}.pdf</p>
                      <p className="text-xs text-gray-500">Toca para ver o descargar</p>
                    </div>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:bg-red-500 transition-colors">
                      <ArrowRight size={18} className="text-red-500 group-hover:text-white transition-colors" />
                    </div>
                  </a>
                </div>
              )}

              {/* Carta de presentación */}
              {selectedCandidate.message && selectedCandidate.message !== 'Sin mensaje' && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Carta de presentación</p>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{selectedCandidate.message}</p>
                </div>
              )}

              {/* Info entrevista si existe */}
              {selectedCandidate.status === 'interview' && selectedCandidate.interviewDate && (
                <div className={`mb-6 border rounded-xl p-4 ${
                  selectedCandidate.interviewConfirmed === 'accepted' ? 'bg-green-50 border-green-200' :
                  selectedCandidate.interviewConfirmed === 'counter_proposed' ? 'bg-amber-50 border-amber-200' :
                  'bg-purple-50 border-purple-100'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className={
                      selectedCandidate.interviewConfirmed === 'accepted' ? 'text-green-600' :
                      selectedCandidate.interviewConfirmed === 'counter_proposed' ? 'text-amber-600' :
                      'text-purple-600'
                    } />
                    <span className={`font-semibold ${
                      selectedCandidate.interviewConfirmed === 'accepted' ? 'text-green-900' :
                      selectedCandidate.interviewConfirmed === 'counter_proposed' ? 'text-amber-900' :
                      'text-purple-900'
                    }`}>
                      {selectedCandidate.interviewConfirmed === 'accepted' ? '✓ Entrevista confirmada' :
                       selectedCandidate.interviewConfirmed === 'counter_proposed' ? '↻ Nueva fecha propuesta' :
                       'Entrevista programada'}
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${
                    selectedCandidate.interviewConfirmed === 'accepted' ? 'text-green-700' :
                    selectedCandidate.interviewConfirmed === 'counter_proposed' ? 'text-amber-700' :
                    'text-purple-700'
                  }`}>
                    📅 {selectedCandidate.interviewDate}
                  </p>
                  <div className="mt-2">
                    {selectedCandidate.interviewConfirmed === 'accepted' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        El candidato confirmó su asistencia
                      </span>
                    )}
                    {selectedCandidate.interviewConfirmed === 'counter_proposed' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                        El candidato propuso otra fecha
                      </span>
                    )}
                    {!selectedCandidate.interviewConfirmed && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                        Esperando confirmación del candidato
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Acciones */}
              {selectedCandidate.status !== 'hired' && selectedCandidate.status !== 'rejected' && (
                <div className="space-y-2">
                  {selectedCandidate.status === 'new' && (
                    <button
                      onClick={() => updateStatus(selectedCandidate.id, 'reviewing')}
                      className="w-full h-12 bg-amber-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                    >
                      <Eye size={18} />
                      Marcar en revisión
                    </button>
                  )}

                  {(selectedCandidate.status === 'new' || selectedCandidate.status === 'reviewing') && (
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="w-full h-12 bg-purple-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-purple-600 transition-colors"
                    >
                      <Calendar size={18} />
                      Programar entrevista
                    </button>
                  )}

                  {selectedCandidate.status === 'interview' && (
                    <button
                      onClick={() => updateStatus(selectedCandidate.id, 'hired')}
                      className="w-full h-12 bg-green-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle2 size={18} />
                      Contratar
                    </button>
                  )}

                  <button
                    onClick={() => {
                      updateStatus(selectedCandidate.id, 'rejected');
                      setSelectedCandidate(null);
                    }}
                    className="w-full h-12 bg-gray-100 text-gray-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                  >
                    <X size={18} />
                    Descartar
                  </button>
                </div>
              )}

              {selectedCandidate.status === 'hired' && (
                <div className="text-center bg-green-50 rounded-xl p-6">
                  <CheckCircle2 size={40} className="mx-auto text-green-500 mb-2" />
                  <p className="font-bold text-green-800">Contratado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal programar entrevista */}
      {showScheduleModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Programar entrevista</h3>
              <p className="text-sm text-gray-500 mb-6">Con {selectedCandidate.candidate.name}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
                  <input
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-gray-50">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setInterviewDate('');
                  setInterviewTime('');
                }}
                className="flex-1 h-11 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={scheduleInterview}
                disabled={!interviewDate || !interviewTime}
                className="flex-1 h-11 bg-primary text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Pantalla para Crear Oferta de Empleo
const CreateJobOfferScreen = ({ onNavigate, businessData, onCreateJobOffer }) => {
  const [formData, setFormData] = useState({
    title: '',
    location: 'Cornellà de Llobregat',
    address: '',
    contract: 'Indefinido',
    modality: 'Presencial',
    type: 'Completa',
    salaryMin: '',
    salaryMax: '',
    salaryNote: '',
    description: '',
    requirements: ['', '', '', ''],
    benefits: [
      { icon: 'Percent', title: '', description: '' },
      { icon: 'BookOpen', title: '', description: '' }
    ]
  });

  const [step, setStep] = useState(1);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRequirementChange = (index, value) => {
    const newReqs = [...formData.requirements];
    newReqs[index] = value;
    setFormData(prev => ({ ...prev, requirements: newReqs }));
  };

  const handleBenefitChange = (index, field, value) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = { ...newBenefits[index], [field]: value };
    setFormData(prev => ({ ...prev, benefits: newBenefits }));
  };

  const addRequirement = () => {
    setFormData(prev => ({ ...prev, requirements: [...prev.requirements, ''] }));
  };

  const handleSubmit = () => {
    const jobData = {
      ...formData,
      salaryMin: parseInt(formData.salaryMin) || 0,
      salaryMax: parseInt(formData.salaryMax) || 0,
      requirements: formData.requirements.filter(r => r.trim() !== ''),
      benefits: formData.benefits.filter(b => b.title.trim() !== ''),
      company: businessData?.name || 'Mi Negocio',
      icon: 'Briefcase',
      iconBg: 'blue',
      salary: `${formData.salaryMin}€ - ${formData.salaryMax}€`,
      fullAddress: formData.address ? `${formData.address}, ${formData.location}` : formData.location,
    };
    onCreateJobOffer(jobData);
    onNavigate('business-jobs');
  };

  const isStep1Valid = formData.title && formData.address && formData.contract;
  const isStep2Valid = formData.salaryMin && formData.salaryMax && formData.description;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-white/90 backdrop-blur-md p-4 justify-between border-b border-gray-100">
        <button
          onClick={() => step === 1 ? onNavigate('business-jobs') : setStep(1)}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-slate-900 text-lg font-bold">Nueva Oferta de Empleo</h2>
          <p className="text-xs text-gray-500">Paso {step} de 2</p>
        </div>
        <div className="w-10"></div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${step * 50}%` }}
        />
      </div>

      <main className="flex-1 pb-32">
        {step === 1 ? (
          /* Paso 1: Información básica */
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Título del puesto *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Ej: Dependiente de Comercio"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Ubicación
              </label>
              <div className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-100 text-slate-900 flex items-center">
                <MapPin size={18} className="text-gray-400 mr-2" />
                <span>Cornellà de Llobregat</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Dirección del trabajo *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Ej: Carrer Major 25, Local 3"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Tipo de contrato *
                </label>
                <select
                  value={formData.contract}
                  onChange={(e) => handleChange('contract', e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  <option value="Indefinido">Indefinido</option>
                  <option value="Temporal">Temporal</option>
                  <option value="Prácticas">Prácticas</option>
                  <option value="Autónomo">Autónomo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Modalidad
                </label>
                <select
                  value={formData.modality}
                  onChange={(e) => handleChange('modality', e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Remoto">Remoto</option>
                  <option value="Híbrido">Híbrido</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Jornada laboral
              </label>
              <div className="flex gap-3">
                {['Completa', 'Media', 'Por horas'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleChange('type', type)}
                    className={`flex-1 h-11 rounded-xl font-medium transition-colors ${
                      formData.type === type
                        ? 'bg-primary text-white'
                        : 'bg-white border border-gray-200 text-slate-700 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Paso 2: Salario, descripción y requisitos */
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Salario bruto anual (€) *
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) => handleChange('salaryMin', e.target.value)}
                  placeholder="Mínimo"
                  className="flex-1 h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={formData.salaryMax}
                  onChange={(e) => handleChange('salaryMax', e.target.value)}
                  placeholder="Máximo"
                  className="flex-1 h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <input
                type="text"
                value={formData.salaryNote}
                onChange={(e) => handleChange('salaryNote', e.target.value)}
                placeholder="Nota (ej: Según experiencia)"
                className="w-full h-10 px-4 mt-2 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Descripción del puesto *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe las funciones, el ambiente de trabajo, etc."
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Requisitos
              </label>
              <div className="space-y-2">
                {formData.requirements.map((req, index) => (
                  <input
                    key={index}
                    type="text"
                    value={req}
                    onChange={(e) => handleRequirementChange(index, e.target.value)}
                    placeholder={`Requisito ${index + 1}`}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                ))}
              </div>
              <button
                onClick={addRequirement}
                className="mt-2 text-primary text-sm font-medium flex items-center gap-1 hover:underline"
              >
                <Plus size={16} />
                Añadir requisito
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Beneficios (opcional)
              </label>
              <div className="space-y-3">
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="bg-white rounded-xl p-3 border border-gray-200 space-y-2">
                    <input
                      type="text"
                      value={benefit.title}
                      onChange={(e) => handleBenefitChange(index, 'title', e.target.value)}
                      placeholder="Título del beneficio"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                    <input
                      type="text"
                      value={benefit.description}
                      onChange={(e) => handleBenefitChange(index, 'description', e.target.value)}
                      placeholder="Descripción"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 pb-8 z-40">
        {step === 1 ? (
          <button
            onClick={() => setStep(2)}
            disabled={!isStep1Valid}
            className={`w-full h-14 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
              isStep1Valid
                ? 'bg-primary text-white hover:bg-blue-700 shadow-lg shadow-primary/30'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Siguiente
            <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!isStep2Valid}
            className={`w-full h-14 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
              isStep2Valid
                ? 'bg-primary text-white hover:bg-blue-700 shadow-lg shadow-primary/30'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Briefcase size={20} />
            Publicar oferta de empleo
          </button>
        )}
      </div>
    </div>
  );
};

// Pantalla de Términos y Condiciones
const TermsScreen = ({ onNavigate, fromRegister = false }) => {
  const [expandedSection, setExpandedSection] = useState(1);

  const handleAccept = () => {
    if (fromRegister) {
      onNavigate('register');
    } else {
      onNavigate('settings');
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-blue-50 px-5 py-4 border-b border-primary/10 backdrop-blur-md">
        <div className="w-10" />
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">
          Términos y Condiciones
        </h2>
        <button
          onClick={() => fromRegister ? onNavigate('register') : onNavigate('settings')}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-900 hover:bg-black/5 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        {/* Intro */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider text-center mb-4">
            Última actualización: {termsAndConditions.lastUpdate}
          </p>
          <h3 className="text-slate-900 text-2xl font-bold leading-tight mb-3">
            Bienvenido a Cornellà Local
          </h3>
          <p className="text-gray-700 text-base font-normal leading-relaxed">
            Gracias por confiar en nosotros. Le rogamos que lea atentamente los siguientes términos antes de utilizar nuestros servicios para garantizar una experiencia segura y transparente. Su privacidad y seguridad son nuestra prioridad.
          </p>
        </div>

        {/* Accordions */}
        <div className="flex flex-col px-4 py-4 gap-4">
          {termsAndConditions.sections.map(section => (
            <details
              key={section.id}
              className="group rounded-xl border border-gray-100 bg-white overflow-hidden transition-all duration-300 open:shadow-md"
              open={expandedSection === section.id}
              onClick={(e) => {
                e.preventDefault();
                setExpandedSection(expandedSection === section.id ? null : section.id);
              }}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 select-none hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    <Icon name={section.icon} size={20} />
                  </div>
                  <p className="text-slate-900 text-base font-semibold leading-normal">{section.title}</p>
                </div>
                <ChevronDown className={`text-gray-500 transition-transform duration-300 ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`} size={20} />
              </summary>
              {expandedSection === section.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-11">
                    <p className="text-gray-500 text-sm font-normal leading-relaxed">
                      {section.content}
                    </p>
                    {section.bullets && (
                      <ul className="mt-3 space-y-2">
                        {section.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </details>
          ))}

          <p className="text-xs text-center text-gray-400 px-8 pt-4 pb-2">
            Al continuar, confirma que ha leído y acepta nuestros términos de servicio y política de privacidad.
          </p>
        </div>
      </main>

      {/* Footer CTA */}
      <div className="fixed bottom-0 w-full max-w-md z-30 bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-8 pt-4 px-6 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <button
          onClick={handleAccept}
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 text-white shadow-lg shadow-primary/25"
        >
          <span className="text-base font-bold leading-normal tracking-wide mr-2">Aceptar y continuar</span>
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

// Pantalla de Política de Privacidad
const PrivacyPolicyScreen = ({ onNavigate }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const privacySections = [
    {
      id: 1,
      icon: 'FileText',
      title: 'Información que recopilamos',
      content: 'Recopilamos información que usted nos proporciona directamente, como nombre, correo electrónico, teléfono y dirección cuando crea una cuenta o solicita un presupuesto.',
      bullets: [
        'Datos de registro: nombre, email, teléfono',
        'Datos de ubicación para mostrar negocios cercanos',
        'Historial de búsquedas y preferencias',
        'Comunicaciones con empresas locales'
      ]
    },
    {
      id: 2,
      icon: 'Shield',
      title: 'Cómo protegemos sus datos',
      content: 'Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra acceso no autorizado, alteración o destrucción.',
      bullets: [
        'Encriptación SSL/TLS en todas las comunicaciones',
        'Almacenamiento seguro en servidores europeos',
        'Acceso restringido solo a personal autorizado',
        'Auditorías de seguridad periódicas'
      ]
    },
    {
      id: 3,
      icon: 'Users',
      title: 'Compartir información',
      content: 'Solo compartimos su información con los comercios locales cuando usted solicita un presupuesto o contacta con ellos. Nunca vendemos sus datos a terceros.',
      bullets: [
        'Comercios locales solo cuando usted lo solicita',
        'Proveedores de servicios esenciales (hosting, email)',
        'Autoridades cuando sea legalmente requerido',
        'Nunca vendemos datos a terceros'
      ]
    },
    {
      id: 4,
      icon: 'Settings',
      title: 'Sus derechos',
      content: 'Conforme al RGPD, tiene derecho a acceder, rectificar, eliminar y portar sus datos personales. También puede oponerse al tratamiento o solicitar su limitación.',
      bullets: [
        'Derecho de acceso a sus datos',
        'Derecho de rectificación',
        'Derecho de supresión ("derecho al olvido")',
        'Derecho a la portabilidad de datos'
      ]
    },
    {
      id: 5,
      icon: 'Cookie',
      title: 'Cookies y tecnologías similares',
      content: 'Utilizamos cookies esenciales para el funcionamiento de la aplicación y cookies analíticas para mejorar nuestros servicios.',
      bullets: [
        'Cookies esenciales para la sesión',
        'Cookies de preferencias de usuario',
        'Cookies analíticas (anonimizadas)',
        'Puede gestionar las cookies desde Ajustes'
      ]
    },
    {
      id: 6,
      icon: 'Mail',
      title: 'Contacto',
      content: 'Si tiene preguntas sobre nuestra política de privacidad o desea ejercer sus derechos, puede contactarnos en cualquier momento.',
      bullets: [
        'Email: privacidad@cornellalocal.com',
        'Teléfono: 93 XXX XX XX',
        'Dirección: Cornellà de Llobregat, Barcelona'
      ]
    },
    {
      id: 7,
      icon: 'Trash2',
      title: 'Documentos de verificación de negocios',
      content: 'Los documentos aportados para verificar un negocio (DNI, licencias, certificados) son utilizados exclusivamente para el proceso de verificación.',
      bullets: [
        'Los documentos se eliminan una vez completado el proceso de verificación',
        'No se conservan copias de documentos de identidad tras la aprobación o rechazo',
        'Solo el equipo de administración accede a estos documentos durante la revisión',
        'En caso de apelación, los documentos se eliminan al resolverse'
      ]
    },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-hidden shadow-2xl bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-blue-50 px-5 py-4 border-b border-primary/10 backdrop-blur-md">
        <button
          onClick={() => onNavigate('settings')}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-900 hover:bg-black/5 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">
          Política de Privacidad
        </h2>
        <div className="w-10" />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-8">
        {/* Intro */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider text-center mb-4">
            Última actualización: Enero 2026
          </p>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Shield className="text-primary" size={32} />
            </div>
          </div>
          <h3 className="text-slate-900 text-xl font-bold leading-tight mb-3 text-center">
            Tu privacidad es importante
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed text-center">
            En Cornellà Local nos comprometemos a proteger tu información personal y ser transparentes sobre cómo la utilizamos.
          </p>
        </div>

        {/* Accordions */}
        <div className="flex flex-col px-4 py-4 gap-3">
          {privacySections.map(section => (
            <details
              key={section.id}
              className="group rounded-xl border border-gray-100 bg-white overflow-hidden transition-all duration-300 open:shadow-md"
              open={expandedSection === section.id}
              onClick={(e) => {
                e.preventDefault();
                setExpandedSection(expandedSection === section.id ? null : section.id);
              }}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 select-none hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                    <Icon name={section.icon} size={20} />
                  </div>
                  <p className="text-slate-900 text-sm font-semibold leading-normal">{section.title}</p>
                </div>
                <ChevronDown className={`text-gray-400 transition-transform duration-300 ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`} size={20} />
              </summary>
              {expandedSection === section.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-13">
                    <p className="text-gray-500 text-sm leading-relaxed mb-3">
                      {section.content}
                    </p>
                    {section.bullets && (
                      <ul className="space-y-2">
                        {section.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </details>
          ))}
        </div>
      </main>
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
    { icon: 'Mail', label: 'Email', value: 'soporte@cornellalocal.es', action: 'mailto:soporte@cornellalocal.es' },
    { icon: 'Clock', label: 'Horario', value: 'Lun-Vie 9:00-18:00', action: null },
  ];

  const faqItems = [
    { q: '¿Cómo puedo registrar mi negocio?', a: 'Ve a tu perfil > "¿Tienes un negocio?" y sigue los pasos de verificación.' },
    { q: '¿Las ofertas tienen coste?', a: 'Publicar ofertas es gratuito para comercios verificados de Cornellà.' },
    { q: '¿Cómo solicito un presupuesto?', a: 'Desde el menú principal, selecciona "Solicitar presupuesto" y elige la categoría.' },
    { q: '¿Cómo elimino mi cuenta?', a: 'Contacta con soporte y procesaremos tu solicitud en 48h.' },
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
        <button
          onClick={() => onNavigate('settings')}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-900 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          Contacto y Soporte
        </h2>
      </div>

      <main className="pb-8">
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
                    <p className="text-xs text-gray-400">{option.label}</p>
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
                    <ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform" />
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
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Asunto</label>
                <select
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
                <textarea
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Pantalla de Notificaciones
const NotificationsScreen = ({ onNavigate, dynamicNotifications = [], user, onUpdateNotifications }) => {
  // Solo usamos notificaciones dinámicas de Supabase (no mockData)
  const [notificationsState, setNotificationsState] = useState(dynamicNotifications);

  // Sincronizar cuando cambien las notificaciones del padre
  useEffect(() => {
    setNotificationsState(dynamicNotifications);
  }, [dynamicNotifications]);

  const unreadCount = notificationsState.filter(n => !n.isRead).length;

  const markAsRead = async (id) => {
    // Optimistic update local + parent (para actualizar badge)
    const updater = prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n);
    setNotificationsState(updater);
    if (onUpdateNotifications) onUpdateNotifications(updater);

    // Persistir en Supabase
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (error) {
        // Revert on error
        const revert = prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n);
        setNotificationsState(revert);
        if (onUpdateNotifications) onUpdateNotifications(revert);
      }
    }
  };

  const deleteReadNotifications = async () => {
    // Eliminar leídas de state local y padre
    const withoutRead = prev => prev.filter(n => !n.isRead);
    setNotificationsState(withoutRead);
    if (onUpdateNotifications) onUpdateNotifications(withoutRead);

    // Eliminar de Supabase
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id)
          .eq('is_read', true);

        if (error) throw error;
      } catch (error) {
      }
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.actionRoute) {
      onNavigate(notification.actionRoute, notification.actionParams || {});
    }
  };

  const getTimeColor = (time) => {
    if (time.includes('min') || time.includes('hora')) return 'text-primary';
    return 'text-gray-400';
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center bg-white/95 backdrop-blur-md px-4 py-4 border-b border-gray-100 justify-between">
        <button
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
      <main className="flex-1 pb-8">
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
                    <ChevronRight className="text-gray-400 shrink-0 mt-3" size={18} />
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
                        <span className="text-xs text-gray-400 shrink-0">
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
      </main>
    </div>
  );
};

// ==============================================
// FLUJO DE REGISTRO DE NEGOCIO
// ==============================================

// Pantalla de Datos del Comercio (Paso 1)
const BusinessDataScreen = ({ onNavigate, onSaveBusinessData, user, businessData, showToast }) => {
  const [formData, setFormData] = useState({
    businessName: '',
    cif: '',
    category: '',
    subcategory: '',
    address: '',
    barrio: '',
  });

  // Detectar si el usuario ya tiene un negocio registrado
  useEffect(() => {
    if (businessData?.id) {
      showToast('Ya tienes un negocio registrado. Te redirigimos para editarlo.', 'info');
      setTimeout(() => {
        onNavigate('edit-business');
      }, 2000);
    }
  }, [businessData, onNavigate, showToast]);

  // Todas las categorías, renombrando "Más" a "Otros"
  const availableCategories = categories.map(cat =>
    cat.id === 8 ? { ...cat, name: 'Otros' } : cat
  );

  // Obtener subcategorías de la categoría seleccionada
  const selectedCategory = categories.find(cat => cat.id === parseInt(formData.category));
  const availableSubcategories = selectedCategory?.subcategories || [];

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Si cambia la categoría, resetear subcategoría
      if (field === 'category') {
        newData.subcategory = '';
      }
      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validar que el barrio esté seleccionado
    if (!formData.barrio) {
      return;
    }
    // Guardar los datos del negocio temporalmente
    if (onSaveBusinessData) {
      onSaveBusinessData({
        name: formData.businessName,
        cif: formData.cif,
        category: formData.category,
        subcategory: formData.subcategory,
        address: formData.address,
        barrio: formData.barrio,
      });
    }
    onNavigate('business-verification');
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center bg-white px-4 py-4 border-b border-gray-100">
        <button
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          Datos del Comercio
        </h2>
      </header>

      {/* Progress */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-primary text-sm font-bold">PASO 1 DE 3</span>
          <span className="text-gray-400 text-sm">33%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '33%' }} />
        </div>
      </div>

      {/* Form */}
      <form className="flex-1 px-4 py-6" onSubmit={handleSubmit}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Información básica</h1>
          <p className="text-gray-500 text-sm">
            Introduce la información básica para registrar tu negocio en Cornellà Local.
          </p>
        </div>

        <div className="space-y-5">
          {/* Nombre del Negocio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nombre del Negocio
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Ej. Cafetería Central"
              className="w-full h-14 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* CIF/NIF */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              CIF/NIF
            </label>
            <input
              type="text"
              value={formData.cif}
              onChange={(e) => handleChange('cif', e.target.value)}
              placeholder="EJ. B-12345678"
              className="w-full h-14 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categoría
            </label>
            <div className="relative">
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full h-14 px-4 pr-10 rounded-xl border border-gray-200 bg-white text-slate-900 appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Selecciona una categoría</option>
                {availableCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>

          {/* Subcategoría - Solo visible cuando hay categoría seleccionada */}
          {formData.category && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subcategoría
              </label>
              <div className="relative">
                <select
                  value={formData.subcategory}
                  onChange={(e) => handleChange('subcategory', e.target.value)}
                  className="w-full h-14 px-4 pr-10 rounded-xl border border-gray-200 bg-white text-slate-900 appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Selecciona una subcategoría</option>
                  {availableSubcategories.map(sub => (
                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>
          )}

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dirección Física
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Carrer de Cornellà, 12"
                className="w-full h-14 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
              >
                <MapPin size={20} />
              </button>
            </div>
          </div>

          {/* Barrio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Barrio <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.barrio}
                onChange={(e) => handleChange('barrio', e.target.value)}
                required
                className={`w-full h-14 px-4 pr-10 rounded-xl border bg-white text-slate-900 appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                  !formData.barrio ? 'border-gray-200' : 'border-primary'
                }`}
              >
                <option value="">Selecciona tu barrio</option>
                {barrios.map(barrio => (
                  <option key={barrio.id} value={barrio.id}>{barrio.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Selecciona el barrio donde se encuentra tu negocio
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 pb-20">
          <button
            type="submit"
            className="w-full h-14 rounded-xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/25 hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Siguiente
          </button>
        </div>
      </form>

      {/* Navbar */}
      <Navbar currentPage="home" onNavigate={onNavigate} />
    </div>
  );
};

// Pantalla de Verificación de Negocio (Paso 2)
const BusinessVerificationScreen = ({ onNavigate, onRegisterBusiness, user }) => {
  const [licenseFile, setLicenseFile] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const validateForm = () => {
    const newErrors = {};
    if (!licenseFile) {
      newErrors.license = 'Debes subir la Licencia de Actividad o Recibo de Suministros';
    }
    if (!idFile) {
      newErrors.id = 'Debes subir tu Documento de Identidad';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadFile = async (file, businessId, label) => {
    const fileExt = file.name.split('.').pop();
    // Carpeta = user.id (UUID) para cumplir la política RLS del bucket
    const fileName = `${user.id}/${businessId}-${label}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setUploadProgress('Creando negocio...');

    let newBusiness = null;
    try {
      // 1. Crear el negocio en Supabase
      if (onRegisterBusiness) {
        newBusiness = await onRegisterBusiness();
      }
    } catch (error) {
      setIsSubmitting(false);
      setUploadProgress('');
      setErrors({ general: `Error al crear el negocio: ${error.message || 'Inténtalo de nuevo'}` });
      return;
    }

    const businessId = newBusiness?.id;

    try {
      const documents = [];

      // 2. Subir licencia
      if (licenseFile && businessId) {
        setUploadProgress('Subiendo licencia...');
        const licenseUrl = await uploadFile(licenseFile, businessId, 'licencia');
        documents.push(licenseUrl);
      }

      // 3. Subir DNI
      if (idFile && businessId) {
        setUploadProgress('Subiendo documento de identidad...');
        const idUrl = await uploadFile(idFile, businessId, 'dni');
        documents.push(idUrl);
      }

      // 4. Guardar URLs en el negocio
      if (documents.length > 0 && businessId) {
        setUploadProgress('Guardando documentos...');
        await supabase
          .from('businesses')
          .update({ verification_documents: documents })
          .eq('id', businessId);
      }

      onNavigate('registration-success');
    } catch (error) {
      // El negocio YA está creado, solo fallaron los documentos
      // Navegar igualmente para no perder el registro
      onNavigate('registration-success');
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center bg-white px-4 py-4 border-b border-gray-100">
        <button
          onClick={() => onNavigate('business-data')}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          Registro
        </h2>
      </header>

      {/* Progress */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-primary text-sm font-bold">PASO 2 DE 3</span>
          <span className="text-gray-400 text-sm">66%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '66%' }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 pb-32">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Verificación de Negocio</h1>
        <p className="text-gray-500 text-sm mb-6">
          Para garantizar la seguridad de Cornellà Local, necesitamos verificar la dirección de tu negocio.
          Sube tu Licencia de Actividad o un Recibo de Suministros (Luz/Agua) reciente.
        </p>

        {/* Aviso importante */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <Info size={16} />
          </div>
          <div>
            <h4 className="text-amber-800 text-sm font-bold">Documentación obligatoria</h4>
            <p className="text-amber-700 text-xs mt-1">
              Ambos documentos son necesarios para verificar tu negocio. Tu solicitud será revisada en un plazo máximo de 24 horas.
            </p>
          </div>
        </div>

        {/* License Upload */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1">
            Licencia de Actividad o Recibo de Suministros
            <span className="text-red-500">*</span>
          </h3>
          <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            errors.license
              ? 'border-red-300 bg-red-50 hover:bg-red-100'
              : licenseFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-primary/50'
          }`}>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                setLicenseFile(e.target.files[0]);
                setErrors(prev => ({ ...prev, license: null }));
              }}
            />
            {licenseFile ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 size={24} />
                <span className="text-sm font-medium">{licenseFile.name}</span>
              </div>
            ) : (
              <>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  errors.license ? 'bg-red-100 text-red-500' : 'bg-primary/10 text-primary'
                }`}>
                  <Upload size={24} />
                </div>
                <p className={`text-sm font-medium ${errors.license ? 'text-red-500' : 'text-primary'}`}>
                  Haz clic para subir <span className={errors.license ? 'text-red-400' : 'text-gray-500'}>o arrastra</span>
                </p>
                <p className="text-gray-400 text-xs mt-1">PDF, PNG, JPG (Max. 10MB)</p>
              </>
            )}
          </label>
          {errors.license && (
            <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
              <X size={12} /> {errors.license}
            </p>
          )}
        </div>

        {/* ID Upload */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1">
            Documento de Identidad (DNI/NIE)
            <span className="text-red-500">*</span>
          </h3>
          <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            errors.id
              ? 'border-red-300 bg-red-50 hover:bg-red-100'
              : idFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-primary/50'
          }`}>
            <input
              type="file"
              className="hidden"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => {
                setIdFile(e.target.files[0]);
                setErrors(prev => ({ ...prev, id: null }));
              }}
            />
            {idFile ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 size={24} />
                <span className="text-sm font-medium">{idFile.name}</span>
              </div>
            ) : (
              <>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  errors.id ? 'bg-red-100 text-red-500' : 'bg-primary/10 text-primary'
                }`}>
                  <Camera size={24} />
                </div>
                <p className={`text-sm font-medium ${errors.id ? 'text-red-500' : 'text-slate-700'}`}>
                  Subir foto del documento
                </p>
                <p className="text-gray-400 text-xs mt-1">Asegúrate que los datos sean legibles</p>
              </>
            )}
          </label>
          {errors.id && (
            <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
              <X size={12} /> {errors.id}
            </p>
          )}
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 bg-primary/5 rounded-xl p-4">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Lock size={16} />
          </div>
          <div>
            <h4 className="text-primary text-sm font-bold">Datos Protegidos</h4>
            <p className="text-gray-500 text-xs mt-1">
              Tu información se encripta de forma segura y solo se utiliza para fines de verificación.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 bg-white/90 backdrop-blur-md border-t border-gray-100 px-4 py-4 pb-8">
        {errors.general && (
          <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium flex items-center gap-2">
            <AlertCircle size={18} />
            {errors.general}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full h-14 rounded-xl text-white font-bold text-base shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
            isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              {uploadProgress || 'Enviando...'}
            </>
          ) : (
            <>
              Finalizar y Enviar
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Pantalla de Apelación de Negocio Rechazado
const BusinessAppealScreen = ({ onNavigate, businessData, user, showToast }) => {
  const [appealMessage, setAppealMessage] = useState('');
  const [appealImages, setAppealImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const rejectionReason = businessData?.rejection_reason || 'No se especificó un motivo.';
  const rejectionCount = businessData?.rejection_count || 1;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (appealImages.length + files.length > 2) {
      showToast('Máximo 2 imágenes permitidas', 'warning');
      return;
    }
    const newImages = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setAppealImages(prev => [...prev, ...newImages].slice(0, 2));
  };

  const removeImage = (index) => {
    setAppealImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!appealMessage.trim()) {
      showToast('Escribe un mensaje explicando tu apelación', 'warning');
      return;
    }
    if (!businessData?.id) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const img of appealImages) {
        if (img.file) {
          const fileExt = img.file.name.split('.').pop();
          const fileName = `${businessData.id}/appeal-${Date.now()}-${Math.random().toString(36).substr(2,5)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('verification-documents')
            .upload(fileName, img.file, { cacheControl: '3600', upsert: false });
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from('verification-documents').getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
        }
      }

      const { error } = await supabase
        .from('businesses')
        .update({
          verification_status: 'pending',
          appeal_message: appealMessage,
          appeal_images: uploadedUrls,
        })
        .eq('id', businessData.id)
        .eq('owner_id', user?.id);

      if (error) throw error;

      showToast('Apelación enviada. El administrador la revisará pronto', 'success');
      setTimeout(() => onNavigate('profile'), 1500);
    } catch (error) {
      showToast('Error al enviar la apelación', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-white px-4 py-4 border-b border-gray-100">
        <button onClick={() => onNavigate('profile')} className="text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">Apelar rechazo</h2>
      </header>

      <div className="px-4 py-6 space-y-5">
        {/* Motivo del rechazo */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={18} className="text-red-600" />
            <span className="font-semibold text-red-700 text-sm">
              Motivo del rechazo{rejectionCount > 1 ? ` (rechazo nº ${rejectionCount})` : ''}
            </span>
          </div>
          <p className="text-red-700 text-sm leading-relaxed">{rejectionReason}</p>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-blue-700 text-sm leading-relaxed">
            Explica por qué tu negocio cumple los requisitos. Puedes adjuntar hasta <strong>2 imágenes opcionales</strong> para apoyar tu solicitud.
          </p>
        </div>

        {/* Mensaje de apelación */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Tu justificación <span className="text-red-500">*</span>
          </label>
          <textarea
            value={appealMessage}
            onChange={(e) => setAppealMessage(e.target.value)}
            placeholder="Explica tu situación y por qué debería aprobarse tu negocio..."
            rows={5}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{appealMessage.length}/500</p>
        </div>

        {/* Imágenes opcionales */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Imágenes de apoyo <span className="text-slate-400 font-normal">(opcional, máx. 2)</span>
          </label>

          <div className="flex gap-3">
            {appealImages.map((img, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {appealImages.length < 2 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-blue-50 transition-colors"
              >
                <Camera size={20} className="text-slate-400" />
                <span className="text-xs text-slate-400">Añadir</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

        {/* Botón enviar */}
        <button
          onClick={handleSubmit}
          disabled={!appealMessage.trim() || uploading}
          className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
            appealMessage.trim() && !uploading
              ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:bg-blue-700 active:scale-[0.98]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {uploading ? 'Enviando apelación...' : 'Enviar apelación'}
        </button>
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

// Pantalla de Editar Datos del Negocio (Completa con pestañas)
const EditBusinessScreen = ({ onNavigate, businessData, onUpdateBusiness, user, showToast }) => {
  const [activeTab, setActiveTab] = useState('store'); // 'store', 'schedule', 'gallery'
  const [currentStep, setCurrentStep] = useState(1); // 1=store, 2=schedule, 3=gallery, 4=documents
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const [verificationDocuments, setVerificationDocuments] = useState(businessData?.verification_documents || []);
  const fileInputRef = useRef(null);

  // Estado para modal de cierre especial
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [newClosureDate, setNewClosureDate] = useState('');
  const [newClosureName, setNewClosureName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Barrios de Cornellà de Llobregat (mismos que el filtro)
  const neighborhoods = [
    'Centre-Riera',
    'Almeda',
    'El Pedró',
    'La Gavarra',
    'Sant Ildefons',
    'Fontsanta-Fatjó'
  ];

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: businessData?.name || '',
    description: businessData?.description || '',
    phone: businessData?.phone || '',
    website: businessData?.website || '',
    address: businessData?.address || '',
    neighborhood: businessData?.neighborhood || '',
    category: businessData?.category_id || businessData?.category || '',
    subcategory: businessData?.subcategory || '',
    tags: businessData?.tags || [],
    coverPhoto: businessData?.cover_photo || null,
    photos: businessData?.images || businessData?.photos || [],
    schedule: businessData?.opening_hours || businessData?.schedule || {
      monday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      tuesday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      wednesday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      thursday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      friday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
      saturday: { enabled: true, morning: { start: '10:00', end: '14:00' }, afternoon: { start: '', end: '' } },
      sunday: { enabled: false, morning: { start: '', end: '' }, afternoon: { start: '', end: '' } },
    },
    specialClosures: businessData?.special_closures || businessData?.specialClosures || [],
  });

  // Sincronizar formData cuando businessData cambia
  useEffect(() => {
    if (businessData) {
      setFormData({
        name: businessData.name || '',
        description: businessData.description || '',
        phone: businessData.phone || '',
        website: businessData.website || '',
        address: businessData.address || '',
        neighborhood: businessData.neighborhood || '',
        category: businessData.category_id || '',
        subcategory: businessData.subcategory || '',
        tags: businessData.tags || [],
        coverPhoto: businessData.cover_photo || null,
        photos: businessData.images || businessData.photos || [],
        schedule: businessData.opening_hours || {
          monday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
          tuesday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
          wednesday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
          thursday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
          friday: { enabled: true, morning: { start: '09:00', end: '13:30' }, afternoon: { start: '16:30', end: '20:00' } },
          saturday: { enabled: true, morning: { start: '10:00', end: '14:00' }, afternoon: { start: '', end: '' } },
          sunday: { enabled: false, morning: { start: '', end: '' }, afternoon: { start: '', end: '' } },
        },
        specialClosures: businessData.special_closures || [],
      });
    }
  }, [businessData]);

  const availableCategories = categories.map(cat =>
    cat.id === 8 ? { ...cat, name: 'Otros' } : cat
  );

  const selectedCategory = categories.find(cat => cat.id === parseInt(formData.category));
  const availableSubcategories = selectedCategory?.subcategories || [];

  // Cargar tags específicos según subcategoría seleccionada
  const availableTags = formData.subcategory && hasTagsForSubcategory(formData.subcategory)
    ? getTagsBySubcategory(formData.subcategory)
    : (formData.category ? getTagsForCategory(selectedCategory?.slug) : []);

  // Debug: mostrar qué subcategoría y cuántos tags se cargan
  if (formData.subcategory) {
  }

  const dayNames = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
    thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'category') {
        newData.subcategory = '';
        newData.tags = [];
      }
      // Limpiar tags al cambiar subcategoría
      if (field === 'subcategory') {
        newData.tags = [];
      }
      return newData;
    });
    setSaved(false);
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
    setSaved(false);
  };

  const updateSchedule = (day, period, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [period]: period === 'enabled' ? value : {
            ...prev.schedule[day][period],
            [field]: value
          }
        }
      }
    }));
    setSaved(false);
  };

  const openClosureModal = () => {
    setNewClosureDate('');
    setNewClosureName('');
    setSelectedMonth(new Date());
    setShowClosureModal(true);
  };

  const addSpecialClosure = () => {
    if (!newClosureDate || !newClosureName.trim()) return;

    const newClosure = {
      id: Date.now(),
      date: newClosureDate,
      name: newClosureName.trim(),
      allDay: true,
    };
    setFormData(prev => ({
      ...prev,
      specialClosures: [...prev.specialClosures, newClosure]
    }));
    setShowClosureModal(false);
    setNewClosureDate('');
    setNewClosureName('');
  };

  // Helpers para el calendario
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Lunes = 0

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const formatDateForInput = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isDateSelected = (day) => {
    if (!day || !newClosureDate) return false;
    const dateStr = formatDateForInput(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
    return dateStr === newClosureDate;
  };

  const isPastDate = (day) => {
    if (!day) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
    return checkDate < today;
  };

  const removeSpecialClosure = (id) => {
    setFormData(prev => ({
      ...prev,
      specialClosures: prev.specialClosures.filter(c => c.id !== id)
    }));
  };

  const uploadPhotoToStorage = async (file, type, index = null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('La imagen no puede superar 5MB', 'error'); return; }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { showToast('Solo se permiten imágenes JPG, PNG o WEBP', 'error'); return; }
    setUploadingPhoto(type === 'cover' ? 'cover' : index);
    try {
      const fileExt = file.name.split('.').pop();
      const ownerId = businessData?.owner_id || user?.id || 'unknown';
      const fileName = `${ownerId}/${type}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('business-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('business-photos').getPublicUrl(fileName);
      if (type === 'cover') {
        handleChange('coverPhoto', publicUrl);
      } else {
        setFormData(prev => {
          const newPhotos = [...prev.photos];
          if (index !== null && index < newPhotos.length) {
            newPhotos[index] = publicUrl;
          } else {
            newPhotos.push(publicUrl);
          }
          return { ...prev, photos: newPhotos };
        });
      }
      showToast('Foto subida correctamente', 'success');
    } catch (err) {
      showToast(`Error al subir: ${err.message || 'sin permisos'}`, 'error');
    } finally {
      setUploadingPhoto(null);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  // Subir documento de verificación a Supabase Storage
  const handleUploadDocument = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Solo se permiten archivos PDF, JPG o PNG', 'error');
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('El archivo no puede superar los 5MB', 'error');
      return;
    }

    setUploadingDocument(true);

    try {
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      // Actualizar array de documentos en la BD
      const newDocuments = [...verificationDocuments, publicUrl];

      const { error: updateError } = await supabase
        .from('businesses')
        .update({ verification_documents: newDocuments })
        .eq('id', businessData.id)
        .eq('owner_id', user.id);

      if (updateError) throw updateError;

      setVerificationDocuments(newDocuments);
      showToast('Documento subido correctamente', 'success');
    } catch (error) {
      showToast('Error al subir el documento', 'error');
    } finally {
      setUploadingDocument(false);
    }
  };

  // Eliminar documento de verificación
  const handleRemoveDocument = async (documentUrl) => {
    try {
      const newDocuments = verificationDocuments.filter(doc => doc !== documentUrl);

      const { error } = await supabase
        .from('businesses')
        .update({ verification_documents: newDocuments })
        .eq('id', businessData.id)
        .eq('owner_id', user.id);

      if (error) throw error;

      // Eliminar de Storage (opcional, puedes dejarlo para historial)
      // const fileName = documentUrl.split('/').pop();
      // await supabase.storage.from('verification-documents').remove([`${user.id}/${fileName}`]);

      setVerificationDocuments(newDocuments);
      showToast('Documento eliminado', 'info');
    } catch (error) {
      showToast('Error al eliminar documento', 'error');
    }
  };

  const handleSave = async () => {
    if (!businessData?.id) return;

    setIsSaving(true);
    setError('');

    try {
      // Debug: ver qué tags se están guardando

      const dataToUpdate = {
        name: formData.name,
        description: formData.description,
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        neighborhood: formData.neighborhood,
        category_id: parseInt(formData.category),
        subcategory: formData.subcategory,
        tags: formData.tags,
        opening_hours: formData.schedule,
        special_closures: formData.specialClosures,
        cover_photo: formData.coverPhoto || null,
        images: formData.photos || [],
        updated_at: new Date().toISOString(),
      };


      const { data: updatedData, error: updateError } = await supabase
        .from('businesses')
        .update(dataToUpdate)
        .eq('id', businessData.id)
        .eq('owner_id', user?.id)
        .select()
        .single();


      if (updateError) throw updateError;

      if (onUpdateBusiness) {
        onUpdateBusiness({
          ...formData,
          opening_hours: formData.schedule,
          cover_photo: formData.coverPhoto || null,
          images: formData.photos || [],
          category_id: parseInt(formData.category),
          special_closures: formData.specialClosures || [],
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), TIMING.refreshCooldown);
    } catch (err) {
      setError('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  // Validar Paso 1: Información básica + tags
  const validateStep1 = () => {
    if (!formData.name || !formData.category || !formData.subcategory || !formData.neighborhood || !formData.description || !formData.phone || !formData.address) {
      setError('Por favor completa todos los campos obligatorios (*) antes de continuar');
      return false;
    }
    if (formData.tags.length === 0) {
      setError('Selecciona al menos 1 etiqueta para tu negocio');
      return false;
    }
    return true;
  };

  // Validar Paso 2: Horarios (al menos 1 día habilitado)
  const validateStep2 = () => {
    const hasAtLeastOneDay = Object.values(formData.schedule).some(day => day.enabled);
    if (!hasAtLeastOneDay) {
      setError('Debes tener al menos 1 día de la semana habilitado');
      return false;
    }
    return true;
  };

  // Validar Paso 3: Fotos (al menos 1 foto)
  const validateStep3 = () => {
    const totalPhotos = formData.photos.length + (formData.coverPhoto ? 1 : 0);
    if (totalPhotos === 0) {
      setError('Debes subir al menos 1 foto antes de publicar');
      return false;
    }
    return true;
  };

  // Manejar botón "Siguiente"
  const handleNext = async () => {
    setError('');

    if (currentStep === 1) {
      if (!validateStep1()) return;
      // Guardar cambios antes de continuar
      await handleSave();
      setCurrentStep(2);
      setActiveTab('schedule');
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      await handleSave();
      setCurrentStep(3);
      setActiveTab('gallery');
    } else if (currentStep === 3) {
      // Paso 3 → Paso 4 (Fotos → Documentos)
      await handleSave();
      setCurrentStep(4);
      setActiveTab('documents');
    }
  };

  const handlePublish = async () => {
    if (!businessData?.id) return;

    // Si estamos en el paso 4
    if (currentStep === 4) {
      const isApproved = businessData?.verification_status === 'approved';

      // Si NO está aprobado, no puede publicar
      if (!isApproved) {
        showToast('Tu negocio está pendiente de revisión por el administrador', 'warning');
        return;
      }

      // Está aprobado → publicar negocio (is_published = true) y guardar docs opcionales
      setIsPublishing(true);
      try {
        const { error } = await supabase
          .from('businesses')
          .update({
            is_published: true,
            verification_documents: verificationDocuments,
            updated_at: new Date().toISOString(),
          })
          .eq('id', businessData.id)
          .eq('owner_id', user?.id);
        if (error) throw error;
        setPublishSuccess(true);
        showToast('🎉 ¡Negocio publicado! Ya aparece en Cornellà Local', 'success');
        setTimeout(() => {
          setPublishSuccess(false);
          onNavigate('owner-dashboard');
        }, 2500);
      } catch (err) {
        setError('Error al publicar el negocio');
      } finally {
        setIsPublishing(false);
      }
      return;
    }

    // Validar paso 3 antes de publicar
    if (!validateStep3()) return;

    // Validar que todos los pasos anteriores estén completos
    if (!validateStep1() || !validateStep2()) {
      setError('Por favor completa todos los pasos anteriores');
      return;
    }

    setIsPublishing(true);
    setError('');

    try {
      // Si el negocio ya está aprobado, no cambiar el status
      const isAlreadyApproved = businessData?.verification_status === 'approved';

      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          name: formData.name,
          description: formData.description,
          phone: formData.phone,
          website: formData.website,
          address: formData.address,
          neighborhood: formData.neighborhood,
          category_id: parseInt(formData.category),
          subcategory: formData.subcategory,
          tags: formData.tags,
          opening_hours: formData.schedule,
          special_closures: formData.specialClosures,
          ...(isAlreadyApproved ? {} : { verification_status: 'pending' }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessData.id)
        .eq('owner_id', user?.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (onUpdateBusiness) {
        onUpdateBusiness({...formData, verification_status: 'pending'});
      }

      setPublishSuccess(true);
      setTimeout(() => {
        setPublishSuccess(false);
        onNavigate('profile');
      }, 2000);
    } catch (err) {
      setError('Error al publicar el negocio');
    } finally {
      setIsPublishing(false);
    }
  };

  const tabs = [
    { id: 'store', label: 'Tienda', icon: Store },
    { id: 'schedule', label: 'Horarios', icon: Clock },
    { id: 'gallery', label: 'Galería', icon: Image },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center px-4 py-4">
          <button
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep(prev => prev - 1);
                setActiveTab(currentStep === 3 ? 'schedule' : 'store');
              } else {
                onNavigate('profile');
              }
            }}
            className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center">
            Editar Perfil
          </h2>
          <div className="w-10"></div> {/* Spacer para centrar título */}
        </div>

        {/* Indicador de Pasos */}
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="flex items-center justify-between max-w-xs mx-auto">
            {/* Paso 1 */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep > 1 ? 'bg-green-500 text-white' :
                currentStep === 1 ? 'bg-primary text-white ring-4 ring-primary/20' :
                'bg-gray-200 text-gray-400'
              }`}>
                {currentStep > 1 ? <CheckCircle2 size={20} /> : '1'}
              </div>
              <span className={`text-xs font-medium ${currentStep === 1 ? 'text-primary' : 'text-gray-400'}`}>
                Información
              </span>
            </div>

            {/* Línea separadora 1-2 */}
            <div className={`h-0.5 flex-1 mx-2 -mt-6 ${currentStep > 1 ? 'bg-green-500' : 'bg-gray-200'}`} />

            {/* Paso 2 */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep > 2 ? 'bg-green-500 text-white' :
                currentStep === 2 ? 'bg-primary text-white ring-4 ring-primary/20' :
                'bg-gray-200 text-gray-400'
              }`}>
                {currentStep > 2 ? <CheckCircle2 size={20} /> : '2'}
              </div>
              <span className={`text-xs font-medium ${currentStep === 2 ? 'text-primary' : 'text-gray-400'}`}>
                Horarios
              </span>
            </div>

            {/* Línea separadora 2-3 */}
            <div className={`h-0.5 flex-1 mx-2 -mt-6 ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-200'}`} />

            {/* Paso 3 */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep === 3 ? 'bg-primary text-white ring-4 ring-primary/20' :
                currentStep > 3 ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {currentStep > 3 ? <Check size={18} /> : '3'}
              </div>
              <span className={`text-xs font-medium ${currentStep === 3 ? 'text-primary' : currentStep > 3 ? 'text-green-600' : 'text-gray-400'}`}>
                Fotos
              </span>
            </div>

            {/* Línea separadora 3-4 */}
            <div className={`h-0.5 flex-1 mx-2 -mt-6 ${currentStep > 3 ? 'bg-green-500' : 'bg-gray-200'}`} />

            {/* Paso 4 */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep === 4 ? 'bg-primary text-white ring-4 ring-primary/20' :
                'bg-gray-200 text-gray-400'
              }`}>
                4
              </div>
              <span className={`text-xs font-medium ${currentStep === 4 ? 'text-primary' : 'text-gray-400'}`}>
                Verificación
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {saved && (
        <div className="mx-4 mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
          <CheckCircle2 className="text-green-600" size={20} />
          <span className="text-green-700 text-sm font-medium">Cambios guardados correctamente</span>
        </div>
      )}

      {/* Tab Content */}
      <div className="pb-8">
        {/* PASO 1: INFORMACIÓN BÁSICA */}
        {currentStep === 1 && (
          <div className="px-4 py-6 space-y-6">
            {/* Cover Photo */}
            <div>
              <div className="relative w-full h-48 bg-gray-200 rounded-2xl overflow-hidden">
                {formData.coverPhoto ? (
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${formData.coverPhoto}")` }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <Store className="text-white/50" size={64} />
                  </div>
                )}
                <label className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-black/80 transition-colors cursor-pointer">
                  {uploadingPhoto === 'cover' ? <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" /> : <Camera size={14} />}
                  {uploadingPhoto === 'cover' ? 'Subiendo...' : 'Editar portada'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhotoToStorage(e.target.files?.[0], 'cover')} />
                </label>
              </div>
            </div>

            {/* Información Básica */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4">Información Básica</h3>
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Nombre del comercio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Nombre de tu negocio"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    required
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Selecciona una categoría</option>
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Subcategoría */}
                {formData.category && availableSubcategories.length > 0 && (
                  <div className="animate-slide-up">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Subcategoría <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.subcategory}
                      onChange={(e) => handleChange('subcategory', e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Selecciona una subcategoría</option>
                      {availableSubcategories.map(sub => (
                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Descripción <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Ejemplo: Cafetería acogedora con café artesanal, repostería casera y desayunos completos. WiFi gratis y terraza. Especialidad en capuchinos y tartas caseras."
                    rows={4}
                    maxLength={500}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{formData.description.length}/500 caracteres</p>
                  <p className="text-xs text-gray-500 mt-1.5 italic">
                    💡 Incluye: qué ofreces, especialidades, servicios destacados (delivery, terraza, WiFi, etc.)
                  </p>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Teléfono</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="934 123 456"
                      className="w-full h-12 px-4 pl-11 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                </div>

                {/* Web */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Sitio web</label>
                  <div className="relative">
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                      placeholder="https://www.minegocio.com"
                      className="w-full h-12 px-4 pl-11 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-primary" />
                Ubicación
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Dirección completa <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Carrer de Mossèn Jacint Verdaguer, 12"
                      className="w-full h-12 px-4 pl-11 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      required
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                </div>

                {/* Barrio */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Barrio <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.neighborhood}
                    onChange={(e) => handleChange('neighborhood', e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Selecciona un barrio</option>
                    {neighborhoods.map(barrio => (
                      <option key={barrio} value={barrio}>{barrio}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Etiquetas */}
            {formData.category && (
              <div className="animate-slide-up pb-32">
                <h3 className="text-sm font-bold text-slate-900 mb-2">Etiquetas de tu negocio</h3>
                <p className="text-xs text-gray-500 mb-4">Selecciona las características que mejor describen tu negocio</p>

                {!formData.subcategory ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-blue-700 font-medium">
                      ⬆️ Primero selecciona una <strong>subcategoría</strong> arriba para ver los tags disponibles
                    </p>
                  </div>
                ) : availableTags.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-600">
                      No hay tags específicos para esta subcategoría
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                          formData.tags.includes(tag)
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PASO 2: HORARIOS */}
        {currentStep === 2 && (
          <div className="px-4 py-6 space-y-6">
            {/* Horario semanal */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4">Horario semanal</h3>
              <div className="space-y-3">
                {Object.entries(dayNames).map(([day, label]) => (
                  <div key={day} className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-slate-900 text-sm">{label}</span>
                      <button
                        onClick={() => updateSchedule(day, 'enabled', null, !formData.schedule[day]?.enabled)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          formData.schedule[day]?.enabled ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          formData.schedule[day]?.enabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    {formData.schedule[day]?.enabled && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-16">Mañana:</span>
                          <input
                            type="time"
                            value={formData.schedule[day]?.morning?.start || ''}
                            onChange={(e) => updateSchedule(day, 'morning', 'start', e.target.value)}
                            className="flex-1 h-9 px-2 rounded-lg border border-gray-200 text-xs"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            value={formData.schedule[day]?.morning?.end || ''}
                            onChange={(e) => updateSchedule(day, 'morning', 'end', e.target.value)}
                            className="flex-1 h-9 px-2 rounded-lg border border-gray-200 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-16">Tarde:</span>
                          <input
                            type="time"
                            value={formData.schedule[day]?.afternoon?.start || ''}
                            onChange={(e) => updateSchedule(day, 'afternoon', 'start', e.target.value)}
                            className="flex-1 h-9 px-2 rounded-lg border border-gray-200 text-xs"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            value={formData.schedule[day]?.afternoon?.end || ''}
                            onChange={(e) => updateSchedule(day, 'afternoon', 'end', e.target.value)}
                            className="flex-1 h-9 px-2 rounded-lg border border-gray-200 text-xs"
                          />
                        </div>
                      </div>
                    )}
                    {!formData.schedule[day]?.enabled && (
                      <p className="text-xs text-red-500 font-medium">Cerrado</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cierres especiales */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Próximos Cierres Especiales</h3>
                <button
                  onClick={openClosureModal}
                  className="text-primary text-sm font-medium flex items-center gap-1 hover:text-blue-700"
                >
                  <Plus size={16} />
                  Añadir
                </button>
              </div>
              <div className="space-y-3">
                {formData.specialClosures.map(closure => (
                  <div key={closure.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-14 bg-red-50 rounded-xl flex flex-col items-center justify-center text-red-600">
                      <span className="text-[10px] font-bold uppercase">
                        {new Date(closure.date).toLocaleDateString('es', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold">
                        {new Date(closure.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={closure.name}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            specialClosures: prev.specialClosures.map(c =>
                              c.id === closure.id ? { ...c, name: e.target.value } : c
                            )
                          }));
                        }}
                        placeholder="Nombre del cierre"
                        className="text-sm font-medium text-slate-900 bg-transparent border-none p-0 focus:outline-none w-full"
                      />
                      <p className="text-xs text-gray-500">
                        {closure.allDay ? 'Todo el día' : `Cierre a mediodía`}
                      </p>
                    </div>
                    <button
                      onClick={() => removeSpecialClosure(closure.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {formData.specialClosures.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">
                    No hay cierres especiales programados
                  </p>
                )}
              </div>
            </div>

            {/* Espacio extra para scroll */}
            <div className="h-20"></div>
          </div>
        )}

        {/* PASO 3: FOTOS */}
        {currentStep === 3 && (
          <div className="px-4 py-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Tu Perfil Visual</h3>
              <p className="text-sm text-gray-500 mb-4">
                Las fotos de alta calidad atraen a más clientes en Cornellà Local. Sube al menos 10 fotos.
              </p>

              {/* Progress */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    {formData.photos.length + (formData.coverPhoto ? 1 : 0)}/6 completado
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {Math.round(((formData.photos.length + (formData.coverPhoto ? 1 : 0)) / 6) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${((formData.photos.length + (formData.coverPhoto ? 1 : 0)) / 6) * 100}%` }}
                  />
                </div>
                {formData.photos.length < 5 && (
                  <p className="text-xs text-amber-600 mt-2">
                    ¡Casi listo! Sube {5 - formData.photos.length} fotos más.
                  </p>
                )}
              </div>

              {/* Photo Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Cover Photo (Large) */}
                <div className="col-span-2 row-span-2">
                  <div className="relative w-full h-full min-h-[200px] bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300">
                    {formData.coverPhoto ? (
                      <>
                        <div
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url("${formData.coverPhoto}")` }}
                        />
                        <button
                          onClick={() => handleChange('coverPhoto', null)}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          {uploadingPhoto === 'cover' ? <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /> : <Plus className="text-primary" size={24} />}
                        </div>
                        <span className="text-sm font-medium text-gray-600">{uploadingPhoto === 'cover' ? 'Subiendo...' : 'Añadir Foto'}</span>
                        <span className="text-xs text-gray-400">Portada</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhotoToStorage(e.target.files?.[0], 'cover')} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Additional Photos */}
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="aspect-square">
                    <div className="relative w-full h-full bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300">
                      {formData.photos[index] ? (
                        <>
                          <div
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url("${formData.photos[index]}")` }}
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <label className="w-full h-full flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer">
                          {uploadingPhoto === index ? <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /> : <Plus className="text-gray-400" size={20} />}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhotoToStorage(e.target.files?.[0], 'gallery', index)} />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div className="mt-6 bg-blue-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-blue-800 mb-2">Consejos para buenas fotos</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Usa luz natural siempre que sea posible</li>
                  <li>• Muestra el interior y exterior del local</li>
                  <li>• Fotografía tus productos o servicios destacados</li>
                  <li>• Mantén las imágenes actualizadas</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PASO 4: PUBLICAR O DOCUMENTOS */}
        {currentStep === 4 && (
          <div className="px-4 py-6 space-y-6">
            {/* Si ya está aprobado → pantalla de publicación */}
            {businessData?.verification_status === 'approved' ? (
              <div className="flex flex-col items-center text-center py-6">
                {businessData?.is_published ? (
                  <>
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-5">
                      <CheckCircle2 className="text-blue-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Negocio publicado</h3>
                    <p className="text-slate-500 text-sm mb-8 max-w-xs leading-relaxed">
                      Tu negocio ya está visible en Cornellà Local. Pulsa "Guardar cambios" para aplicar cualquier modificación.
                    </p>
                    <div className="w-full">
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left">
                        <p className="text-sm font-semibold text-blue-800 mb-2">Cambios que se guardarán:</p>
                        <ul className="text-xs text-blue-700 space-y-1.5">
                          <li className="flex items-center gap-2"><Check size={14} className="text-blue-600 shrink-0" /> Información general (nombre, descripción, teléfono)</li>
                          <li className="flex items-center gap-2"><Check size={14} className="text-blue-600 shrink-0" /> Horarios de apertura</li>
                          <li className="flex items-center gap-2"><Check size={14} className="text-blue-600 shrink-0" /> Fotos de la galería</li>
                          <li className="flex items-center gap-2"><Check size={14} className="text-blue-600 shrink-0" /> Dirección y barrio</li>
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-5">
                      <CheckCircle2 className="text-green-500" size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Negocio aprobado!</h3>
                    <p className="text-slate-500 text-sm mb-8 max-w-xs leading-relaxed">
                      Tu negocio ha sido verificado por el administrador. Pulsa el botón para publicarlo y que aparezca en Cornellà Local.
                    </p>
                    <div className="w-full space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-left">
                        <p className="text-sm font-semibold text-green-800 mb-2">Al publicar tu negocio:</p>
                        <ul className="text-xs text-green-700 space-y-1.5">
                          <li className="flex items-center gap-2"><Check size={14} className="text-green-600 shrink-0" /> Aparecerás en "Nuevos en el barrio"</li>
                          <li className="flex items-center gap-2"><Check size={14} className="text-green-600 shrink-0" /> Podrás crear ofertas y empleos</li>
                          <li className="flex items-center gap-2"><Check size={14} className="text-green-600 shrink-0" /> Los usuarios podrán encontrarte y favoritearte</li>
                          <li className="flex items-center gap-2"><Check size={14} className="text-green-600 shrink-0" /> Recibirás solicitudes de presupuesto</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Verificación Oficial</h3>
              <p className="text-sm text-gray-500 mb-6">
                Sube documentos que verifiquen tu negocio (CIF, licencia comercial, etc.) para obtener el badge de verificación oficial.
              </p>

              {/* Status Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 mb-6 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <BadgeCheck className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-blue-900 mb-1">
                      ¿Por qué verificar tu negocio?
                    </h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>✓ Badge azul de verificación oficial</li>
                      <li>✓ Mayor confianza de los clientes</li>
                      <li>✓ Aparece destacado en búsquedas</li>
                      <li>✓ Acceso a funciones premium</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    {verificationDocuments.length}/3 documentos subidos
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {Math.round((verificationDocuments.length / 3) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(verificationDocuments.length / 3) * 100}%` }}
                  />
                </div>
                {verificationDocuments.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Sube al menos 1 documento para iniciar la verificación
                  </p>
                )}
                {verificationDocuments.length > 0 && verificationDocuments.length < 3 && (
                  <p className="text-xs text-green-600 mt-2">
                    ¡Excelente! Puedes subir {3 - verificationDocuments.length} documento(s) más
                  </p>
                )}
                {verificationDocuments.length >= 3 && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    ¡Perfecto! Documentación completa
                  </p>
                )}
              </div>

              {/* Upload Button */}
              <div className="mb-6">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadDocument}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingDocument || verificationDocuments.length >= 3}
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingDocument ? (
                    <>
                      <RefreshCw className="text-primary animate-spin" size={32} />
                      <span className="text-sm font-medium text-gray-600">Subiendo documento...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                        <Upload className="text-blue-600" size={24} />
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-slate-900 block">Subir documento</span>
                        <span className="text-xs text-gray-500">PDF, JPG o PNG (máx. 5MB)</span>
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Uploaded Documents List */}
              {verificationDocuments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Documentos subidos</h4>
                  {verificationDocuments.map((docUrl, index) => {
                    const fileName = docUrl.split('/').pop() || `Documento ${index + 1}`;
                    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                    const isPDF = fileExt === 'pdf';

                    return (
                      <div key={index} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                        {/* Document Icon/Preview */}
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          {isPDF ? (
                            <FileText className="text-blue-600" size={24} />
                          ) : (
                            <img
                              src={docUrl}
                              alt={`Documento ${index + 1}`}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          )}
                        </div>

                        {/* Document Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {isPDF ? 'Documento PDF' : 'Imagen'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Documento {index + 1} • {fileExt.toUpperCase()}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <button
                            onClick={() => handleRemoveDocument(docUrl)}
                            className="w-9 h-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Info Card */}
              <div className="mt-6 bg-amber-50 rounded-xl p-4 border border-amber-100">
                <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                  <Info size={16} />
                  Documentos aceptados
                </h4>
                <ul className="text-xs text-amber-800 space-y-1">
                  <li>• <strong>CIF/NIF</strong> del titular del negocio</li>
                  <li>• <strong>Licencia de actividad</strong> o apertura</li>
                  <li>• <strong>Alta en IAE</strong> (Impuesto de Actividades Económicas)</li>
                  <li>• Cualquier <strong>documento oficial</strong> que demuestre la actividad</li>
                </ul>
                <p className="text-xs text-amber-700 mt-3 pt-3 border-t border-amber-200">
                  <strong>Nota:</strong> Los documentos serán revisados por nuestro equipo en 24-48h.
                  Toda la información se maneja de forma confidencial.
                </p>
              </div>
              {/* Espacio extra para scroll */}
              <div className="h-20"></div>
            </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Save Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-4 pb-8">
        {error && (
          <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {publishSuccess && (
          <div className="mb-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 size={16} />
            ¡Negocio enviado para revisión! Te notificaremos cuando sea aprobado.
          </div>
        )}
        {businessData?.verification_status === 'pending' && (
          <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
            <Clock size={16} />
            Tu negocio está en revisión. Puedes seguir editando los datos.
          </div>
        )}
        {businessData?.is_verified && (
          <div className="mb-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium flex items-center gap-2">
            <BadgeCheck size={16} />
            ¡Tu negocio está verificado y visible en Cornellà Local!
          </div>
        )}
        <div className="flex gap-2">
          {/* Botón Volver (solo en pasos 2, 3 y 4) */}
          {currentStep > 1 && (
            <button
              onClick={() => {
                setCurrentStep(prev => prev - 1);
                // Actualizar activeTab según el paso
                if (currentStep === 3) setActiveTab('schedule');
                else if (currentStep === 4) setActiveTab('gallery');
                else setActiveTab('store');
                setError('');
              }}
              disabled={isSaving}
              className="h-12 px-6 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
              Volver
            </button>
          )}

          {/* Botones según el paso actual */}
          {currentStep < 4 ? (
            // Pasos 1, 2 y 3: Botón "Siguiente"
            <button
              onClick={handleNext}
              disabled={isSaving}
              className={`flex-1 h-12 rounded-xl text-white font-bold text-sm shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          ) : (
            // Paso 4: según estado del negocio
            businessData?.verification_status === 'approved' ? (
              businessData?.is_published ? (
                // Ya publicado → Guardar cambios
                <button
                  onClick={async () => {
                    await handleSave();
                    showToast('¡Cambios guardados correctamente!', 'success');
                    setTimeout(() => onNavigate('owner-dashboard'), 800);
                  }}
                  disabled={isSaving}
                  className={`flex-1 h-12 rounded-xl text-white font-bold text-sm shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                    isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-700 shadow-primary/25'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Guardar cambios
                    </>
                  )}
                </button>
              ) : (
                // Aprobado pero no publicado → Publicar
                <button
                  onClick={handlePublish}
                  disabled={isSaving || isPublishing}
                  className={`flex-1 h-12 rounded-xl text-white font-bold text-sm shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                    isPublishing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 shadow-green-500/25'
                  }`}
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Zap size={18} className="fill-white" />
                      Publicar negocio
                    </>
                  )}
                </button>
              )
            ) : (
              <div className="flex-1 h-12 rounded-xl bg-amber-100 text-amber-700 font-medium text-sm flex items-center justify-center gap-2">
                <Clock size={16} />
                Pendiente de aprobación
              </div>
            )
          )}
        </div>
      </div>

      {/* Modal de Cierre Especial */}
      {showClosureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowClosureModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-slate-900">Añadir Cierre Especial</h3>
              <button
                onClick={() => setShowClosureModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Calendario */}
            <div className="p-4">
              {/* Navegación del mes */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <span className="text-sm font-bold text-slate-900 capitalize">
                  {selectedMonth.toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(selectedMonth).map((day, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (day && !isPastDate(day)) {
                        setNewClosureDate(formatDateForInput(selectedMonth.getFullYear(), selectedMonth.getMonth(), day));
                      }
                    }}
                    disabled={!day || isPastDate(day)}
                    className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${
                      !day
                        ? 'invisible'
                        : isPastDate(day)
                        ? 'text-gray-300 cursor-not-allowed'
                        : isDateSelected(day)
                        ? 'bg-primary text-white font-bold'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Fecha seleccionada */}
              {newClosureDate && (
                <div className="mt-4 p-3 bg-primary/10 rounded-xl text-center">
                  <p className="text-sm text-primary font-medium">
                    Fecha seleccionada: {new Date(newClosureDate).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}

              {/* Nombre del cierre */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre del cierre
                </label>
                <input
                  type="text"
                  value={newClosureName}
                  onChange={(e) => setNewClosureName(e.target.value)}
                  placeholder="Ej: Festivo local, Vacaciones..."
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>

            {/* Footer del modal */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowClosureModal(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-slate-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addSpecialClosure}
                disabled={!newClosureDate || !newClosureName.trim()}
                className={`flex-1 h-11 rounded-xl font-bold transition-colors ${
                  newClosureDate && newClosureName.trim()
                    ? 'bg-primary text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Pantalla de Crear Nueva Oferta
const CreateOfferScreen = ({ onNavigate, businessData, onCreateOffer }) => {
  const [formData, setFormData] = useState({
    title: '',
    discountType: 'percentage', // 'percentage', '2x1', 'free'
    discountPercent: '',
    originalPrice: '',
    productPrice: '', // Para 2x1
    description: '',
    isFlash: false,
    isLimited: false,
    limitedUnits: 50,
    image: null,
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadingOfferImage, setUploadingOfferImage] = useState(false);

  const uploadOfferImage = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) return;
    setUploadingOfferImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `offers/${businessData?.id || 'unknown'}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('business-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('business-photos').getPublicUrl(fileName);
      handleChange('image', publicUrl);
    } catch (err) {
      // silent fail - image is optional
    } finally {
      setUploadingOfferImage(false);
    }
  };

  // Calcular precio con descuento
  const calculateDiscountedPrice = () => {
    if (formData.discountType === 'percentage' && formData.originalPrice && formData.discountPercent) {
      const original = parseFloat(formData.originalPrice);
      const discount = parseFloat(formData.discountPercent);
      return (original - (original * discount / 100)).toFixed(2);
    }
    if (formData.discountType === '2x1' && formData.productPrice) {
      return parseFloat(formData.productPrice).toFixed(2);
    }
    if (formData.discountType === 'free') {
      return '0.00';
    }
    return null;
  };

  // Calcular fechas automáticamente
  const now = new Date();
  const endDate = formData.isFlash
    ? new Date(now.getTime() + 8 * 60 * 60 * 1000)
    : new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeRemaining = () => {
    return formData.isFlash ? '8 horas' : '3 días';
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getDiscountDisplay = () => {
    switch (formData.discountType) {
      case 'percentage':
        return `-${formData.discountPercent || '0'}%`;
      case '2x1':
        return '2x1';
      case 'free':
        return 'GRATIS';
      default:
        return '';
    }
  };

  const handlePublish = () => {
    if (!formData.title) return;
    if (formData.discountType === 'percentage' && (!formData.discountPercent || !formData.originalPrice)) return;
    if (formData.discountType === '2x1' && !formData.productPrice) return;

    setIsPublishing(true);
    setTimeout(() => {
      const discountedPrice = calculateDiscountedPrice();
      const newOffer = {
        id: Date.now(),
        title: formData.title,
        discountType: formData.discountType,
        discount: formData.discountType === 'percentage' ? formData.discountPercent : formData.discountType,
        originalPrice: formData.discountType === 'percentage' ? parseFloat(formData.originalPrice) :
                       formData.discountType === '2x1' ? parseFloat(formData.productPrice) * 2 : 0,
        discountedPrice: parseFloat(discountedPrice) || 0,
        productPrice: formData.productPrice ? parseFloat(formData.productPrice) : null,
        description: formData.description,
        isFlash: formData.isFlash,
        isLimited: formData.isLimited,
        limitedUnits: formData.isLimited ? formData.limitedUnits : null,
        usedUnits: 0,
        image: formData.image,
        businessName: businessData?.name || 'Mi Negocio',
        createdAt: now.toISOString(),
        endsAt: endDate.toISOString(),
        status: 'active',
        timeLeft: formData.isFlash ? '8h' : '3 días',
      };

      if (onCreateOffer) {
        onCreateOffer(newOffer);
      }
      setIsPublishing(false);
      onNavigate('business-offers');
    }, 1000);
  };

  const isFormValid = () => {
    if (!formData.title.trim()) return false;
    if (formData.discountType === 'percentage') {
      return formData.discountPercent && formData.originalPrice;
    }
    if (formData.discountType === '2x1') {
      return formData.productPrice;
    }
    return true; // 'free' no necesita campos adicionales
  };

  const discountedPrice = calculateDiscountedPrice();

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center bg-white px-4 py-4 border-b border-gray-100">
        <button
          onClick={() => onNavigate('business-offers')}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          Crear {formData.isFlash ? 'Oferta Flash' : 'Oferta'}
        </h2>
      </header>

      {/* Content */}
      <div className="px-4 py-6 pb-40 space-y-6">
        {/* Título de la Oferta */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Título de la Oferta <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ej: Menú del día, Corte de pelo..."
              maxLength={50}
              className="w-full h-14 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        {/* Tipo de Descuento */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tipo de Descuento <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleChange('discountType', 'percentage')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                formData.discountType === 'percentage'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                formData.discountType === 'percentage' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <span className="text-lg font-bold">%</span>
              </div>
              <span className={`text-xs font-semibold ${formData.discountType === 'percentage' ? 'text-primary' : 'text-gray-600'}`}>
                Porcentaje
              </span>
            </button>

            <button
              onClick={() => handleChange('discountType', '2x1')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                formData.discountType === '2x1'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                formData.discountType === '2x1' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <span className="text-sm font-bold">2x1</span>
              </div>
              <span className={`text-xs font-semibold ${formData.discountType === '2x1' ? 'text-primary' : 'text-gray-600'}`}>
                2x1
              </span>
            </button>

            <button
              onClick={() => handleChange('discountType', 'free')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                formData.discountType === 'free'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                formData.discountType === 'free' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <PartyPopper size={20} />
              </div>
              <span className={`text-xs font-semibold ${formData.discountType === 'free' ? 'text-primary' : 'text-gray-600'}`}>
                Gratis
              </span>
            </button>
          </div>
        </div>

        {/* Campos según tipo de descuento */}
        {formData.discountType === 'percentage' && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descuento (%) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.discountPercent}
                  onChange={(e) => handleChange('discountPercent', e.target.value)}
                  placeholder="20"
                  min="1"
                  max="100"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Precio Original (€) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e) => handleChange('originalPrice', e.target.value)}
                  placeholder="100"
                  min="0.01"
                  step="0.01"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
              </div>
            </div>
            {discountedPrice && (
              <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Precio con descuento:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 line-through">{formData.originalPrice}€</span>
                  <span className="text-xl font-bold text-green-600">{discountedPrice}€</span>
                </div>
              </div>
            )}
          </div>
        )}

        {formData.discountType === '2x1' && (
          <div className="space-y-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Precio de 1 producto (€) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.productPrice}
                  onChange={(e) => handleChange('productPrice', e.target.value)}
                  placeholder="5"
                  min="0.01"
                  step="0.01"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
              </div>
            </div>
            {formData.productPrice && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm text-gray-600 mb-2">El cliente verá:</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 line-through">{(parseFloat(formData.productPrice) * 2).toFixed(2)}€</span>
                  <span className="text-lg font-bold text-purple-600">2 por {formData.productPrice}€</span>
                </div>
              </div>
            )}
          </div>
        )}

        {formData.discountType === 'free' && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <PartyPopper className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Producto/Servicio Gratis</p>
                <p className="text-xs text-green-600">El cliente no pagará nada por esta oferta</p>
              </div>
            </div>
          </div>
        )}

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Descripción (opcional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe brevemente tu oferta..."
            rows={3}
            maxLength={150}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{formData.description.length}/150</p>
        </div>

        {/* Imagen */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Imagen (opcional)
          </label>
          <div className="relative">
            {formData.image ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden">
                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url("${formData.image}")` }} />
                <button
                  onClick={() => handleChange('image', null)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                {uploadingOfferImage ? <div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /> : <Image className="text-gray-400" size={24} />}
                <span className="text-sm text-gray-500">{uploadingOfferImage ? 'Subiendo...' : 'Subir imagen'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadOfferImage(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>

        {/* Toggle Oferta Flash */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Zap className="text-white" size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">Oferta Flash</h4>
                <p className="text-xs text-amber-700">Aparece en inicio • Solo 8 horas</p>
              </div>
            </div>
            <button
              onClick={() => handleChange('isFlash', !formData.isFlash)}
              className={`w-14 h-7 rounded-full transition-colors ${formData.isFlash ? 'bg-amber-500' : 'bg-gray-300'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${formData.isFlash ? 'translate-x-7' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Toggle Unidades Limitadas */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Unidades Limitadas</h4>
              <p className="text-xs text-gray-500">Solo los primeros {formData.limitedUnits} clientes</p>
            </div>
            <button
              onClick={() => handleChange('isLimited', !formData.isLimited)}
              className={`w-14 h-7 rounded-full transition-colors ${formData.isLimited ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${formData.isLimited ? 'translate-x-7' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {formData.isLimited && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="text-xs text-gray-500 mb-2 block">Número de unidades</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleChange('limitedUnits', Math.max(10, formData.limitedUnits - 10))}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                >
                  <span className="text-lg font-bold text-gray-600">-</span>
                </button>
                <input
                  type="number"
                  value={formData.limitedUnits}
                  onChange={(e) => handleChange('limitedUnits', Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 h-10 text-center rounded-lg border border-gray-200 font-bold text-slate-900"
                />
                <button
                  onClick={() => handleChange('limitedUnits', formData.limitedUnits + 10)}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                >
                  <span className="text-lg font-bold text-gray-600">+</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Vista Previa */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700">VISTA PREVIA</h3>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              En vivo
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {formData.image ? (
                  <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url("${formData.image}")` }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="text-gray-400" size={24} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900 truncate">{businessData?.name || 'Mi Negocio'}</span>
                </div>
                <p className="text-xs text-gray-600 truncate mb-2">{formData.title || 'Título de la oferta...'}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {formData.isFlash && (
                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap size={10} />
                      FLASH
                    </span>
                  )}
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <Clock size={12} />
                    {formData.isFlash ? '8h' : '3 días'}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`text-xl font-black ${
                  formData.discountType === 'free' ? 'text-green-600' :
                  formData.discountType === '2x1' ? 'text-purple-600' : 'text-primary'
                }`}>
                  {getDiscountDisplay()}
                </span>
                {discountedPrice && formData.discountType === 'percentage' && (
                  <div className="mt-1">
                    <span className="text-[10px] text-gray-400 line-through mr-1">{formData.originalPrice}€</span>
                    <span className="text-sm font-bold text-green-600">{discountedPrice}€</span>
                  </div>
                )}
                {formData.discountType === '2x1' && formData.productPrice && (
                  <p className="text-[10px] text-purple-600 mt-1">2 por {formData.productPrice}€</p>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            Así verán tu oferta {formData.isFlash ? 'en el inicio' : 'en la sección de ofertas'}
          </p>
        </div>
      </div>

      {/* Publish Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 bg-gradient-to-t from-white via-white to-white/80 px-4 pt-4 pb-8">
        <button
          onClick={handlePublish}
          disabled={!isFormValid() || isPublishing}
          className={`w-full h-14 rounded-2xl text-white font-bold text-base shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
            isFormValid() && !isPublishing
              ? 'bg-gradient-to-r from-teal-500 to-emerald-600 shadow-teal-500/30 hover:from-teal-600 hover:to-emerald-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isPublishing ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              <Zap size={20} />
              Publicar Ahora
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// =============================================
// =============================================
// VALIDATE CODE SCREEN - Propietario valida código de cliente
// =============================================
const ValidateCodeScreen = ({ onNavigate, user, showToast }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleValidate = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc('validate_redemption_code', {
        p_code: trimmed,
        p_owner_id: user.id,
      });
      if (error) throw error;
      setResult(data);
      if (data.success) {
        setCode('');
        showToast('¡Código validado! Descuento aplicado.', 'success');
      }
    } catch (err) {
      setResult({ success: false, error: 'Error al validar el código. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-gray-50 font-display">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => onNavigate('owner-dashboard')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Validar código</h1>
          <p className="text-xs text-gray-500">Canjea el descuento de un cliente</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Instrucciones */}
        <div className="bg-primary/10 rounded-2xl p-4 flex gap-3">
          <Ticket className="text-primary shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-primary font-medium leading-relaxed">
            El cliente te muestra un código en su móvil (ej. <span className="font-mono font-bold">CL-A7X3</span>). Introdúcelo aquí para validar el descuento y que quede registrado.
          </p>
        </div>

        {/* Input del código */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">Código del cliente</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleValidate()}
            placeholder="CL-XXXX"
            maxLength={7}
            className="w-full text-center text-3xl font-mono font-bold tracking-widest border-2 border-gray-200 rounded-2xl py-5 px-4 focus:border-primary focus:outline-none transition-colors uppercase bg-white"
          />
          <button
            onClick={handleValidate}
            disabled={loading || !code.trim()}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? 'Validando...' : 'Validar descuento'}
          </button>
        </div>

        {/* Resultado */}
        {result && (
          result.success ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center space-y-2">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="text-green-600" size={28} />
              </div>
              <p className="font-bold text-green-800 text-lg">¡Código válido!</p>
              <p className="text-green-700 font-semibold">{result.offer_title}</p>
              <p className="text-green-600 text-sm">Descuento: <span className="font-bold">{result.discount}</span></p>
              <p className="text-green-500 text-sm">Cliente: {result.user_name}</p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-2">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="text-red-500" size={28} />
              </div>
              <p className="font-bold text-red-700">Código no válido</p>
              <p className="text-red-500 text-sm">{result.error}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

// =============================================
// BUSINESS OWNER DASHBOARD - Panel principal del propietario
// =============================================
const BusinessOwnerDashboard = ({
  onNavigate,
  businessData,
  userJobOffers,
  userOffers,
  incomingBudgetRequests,
  jobApplications = [],
  onDeleteBusiness,
  showToast,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      showToast('Escribe ELIMINAR para confirmar', 'warning');
      return;
    }
    setDeleting(true);
    await onDeleteBusiness();
    setDeleting(false);
    setShowDeleteModal(false);
  };
  // Calcular estadísticas rápidas
  const activeJobs = userJobOffers.filter(j => j.status === 'active').length;
  const totalApplications = jobApplications.filter(app => app.status === 'pending').length; // Candidaturas pendientes
  const activeOffers = userOffers.filter(o => o.status === 'active').length;
  const newBudgetRequests = incomingBudgetRequests.filter(r => r.status === 'new').length;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-white/90 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-100">
        <button
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">
          Panel de Propietario
        </h2>
        <button
          onClick={() => onNavigate('edit-business')}
          className="flex size-12 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-primary hover:bg-primary/10 transition-colors"
        >
          <Settings size={24} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Información del negocio */}
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            {businessData?.logo_url ? (
              <img
                src={businessData.logo_url}
                alt={businessData.name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-white/30"
              />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <Store size={32} className="text-white" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">{businessData?.name || 'Mi Negocio'}</h3>
                {businessData?.is_verified && (
                  <BadgeCheck className="text-white fill-white" size={20} />
                )}
              </div>
              <p className="text-sm text-white/80">{businessData?.subcategory || 'Comercio local'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="text-2xl font-bold mb-1">{activeJobs}</div>
              <div className="text-xs text-white/80">Empleos activos</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="text-2xl font-bold mb-1">{activeOffers}</div>
              <div className="text-xs text-white/80">Ofertas activas</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="text-2xl font-bold mb-1">{newBudgetRequests}</div>
              <div className="text-xs text-white/80">Presupuestos</div>
            </div>
          </div>

          {/* Analytics: vistas y clics */}
          {(businessData?.view_count > 0 || businessData?.click_count > 0) && (
            <div className="flex items-center justify-around gap-3 mt-3 pt-3 border-t border-white/20">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-white/70" />
                <div className="text-left">
                  <div className="text-lg font-bold">{businessData?.view_count || 0}</div>
                  <div className="text-[10px] text-white/70">vistas</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MousePointerClick size={16} className="text-white/70" />
                <div className="text-left">
                  <div className="text-lg font-bold">{businessData?.click_count || 0}</div>
                  <div className="text-[10px] text-white/70">clics</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Acciones rápidas */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3 px-1">Acciones Rápidas</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('create-job-offer')}
              className="bg-white rounded-xl p-4 flex flex-col items-center gap-3 hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Briefcase className="text-blue-600" size={24} />
              </div>
              <span className="text-sm font-semibold text-slate-800">Crear Empleo</span>
            </button>

            <button
              onClick={() => onNavigate('create-offer')}
              className="bg-white rounded-xl p-4 flex flex-col items-center gap-3 hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Tag className="text-purple-600" size={24} />
              </div>
              <span className="text-sm font-semibold text-slate-800">Crear Oferta</span>
            </button>
          </div>
        </div>

        {/* Gestión */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3 px-1">Gestión</h4>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
            <button
              onClick={() => onNavigate('incoming-budget-requests')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg text-green-600 group-hover:text-green-700 transition-colors relative">
                  <ClipboardList size={20} />
                  {newBudgetRequests > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                      {newBudgetRequests}
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-medium text-slate-700 block">Presupuestos Entrantes</span>
                  <span className="text-xs text-slate-500">
                    {newBudgetRequests > 0 ? `${newBudgetRequests} nueva${newBudgetRequests > 1 ? 's' : ''}` : 'Sin solicitudes nuevas'}
                  </span>
                </div>
              </div>
              <ChevronRight className="text-slate-400" size={20} />
            </button>

            <button
              onClick={() => onNavigate('business-jobs')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:text-blue-700 transition-colors relative">
                  <Briefcase size={20} />
                  {totalApplications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                      {totalApplications}
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-medium text-slate-700 block">Ofertas de Empleo</span>
                  <span className="text-xs text-slate-500">
                    {activeJobs} activa{activeJobs !== 1 ? 's' : ''}, {totalApplications} candidatura{totalApplications !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <ChevronRight className="text-slate-400" size={20} />
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
                  <span className="text-xs text-slate-500">{activeOffers} oferta{activeOffers !== 1 ? 's' : ''} activa{activeOffers !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <ChevronRight className="text-slate-400" size={20} />
            </button>

            <button
              onClick={() => onNavigate('edit-business')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:text-slate-700 transition-colors">
                  <Edit3 size={20} />
                </div>
                <div>
                  <span className="font-medium text-slate-700 block">Editar Negocio</span>
                  <span className="text-xs text-slate-500">Información y configuración</span>
                </div>
              </div>
              <ChevronRight className="text-slate-400" size={20} />
            </button>

            <button
              onClick={() => onNavigate('business-analytics')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-2 rounded-lg text-indigo-600 group-hover:text-indigo-700 transition-colors">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <span className="font-medium text-slate-700 block">Estadísticas</span>
                  <span className="text-xs text-slate-500">Ver rendimiento</span>
                </div>
              </div>
              <ChevronRight className="text-slate-400" size={20} />
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
              <ChevronRight className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Zona de peligro */}
        <div className="mx-4 mb-6">
          <div className="border border-red-200 rounded-2xl overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
              <span className="text-sm font-semibold text-red-700">Zona de peligro</span>
            </div>
            <div className="p-4">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-white hover:bg-red-50 transition-colors text-left"
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
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
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
                Se eliminarán permanentemente <strong>todas las ofertas, empleos y datos</strong> asociados a <strong>"{businessData?.name}"</strong>.
              </p>
            </div>

            <p className="text-sm text-slate-600 mb-3">
              Para confirmar, escribe <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">ELIMINAR</span> en el campo:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Escribe ELIMINAR"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 mb-4"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmText !== 'ELIMINAR' || deleting}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  deleteConfirmText === 'ELIMINAR' && !deleting
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Pantalla de Estadísticas del Negocio
const BusinessStatsScreen = ({
  onNavigate,
  businessData,
  userOffers = [],
  userJobOffers = [],
  jobApplications = [],
  incomingBudgetRequests = []
}) => {
  // 📊 Calcular estadísticas REALES desde Supabase
  const totalOffers = userOffers.length;
  const activeOffers = userOffers.filter(o => o.status === 'active' && o.isVisible).length;
  const totalJobs = userJobOffers.length;
  const activeJobs = userJobOffers.filter(j => j.status === 'active').length;
  const totalApplications = jobApplications.length;
  const pendingApplications = jobApplications.filter(a => a.status === 'pending').length;
  const totalBudgetRequests = incomingBudgetRequests.length;
  const newBudgetRequests = incomingBudgetRequests.filter(r => r.status === 'new').length;

  // 📈 Analytics: vistas y clics
  const businessViews = businessData?.view_count || 0;
  const businessClicks = businessData?.click_count || 0;

  // Sumar vistas de todas las ofertas
  const totalOfferViews = userOffers.reduce((sum, offer) => sum + (offer.view_count || 0), 0);

  // Sumar vistas de todos los empleos
  const totalJobViews = userJobOffers.reduce((sum, job) => sum + (job.view_count || 0), 0);

  // Total de vistas combinadas
  const totalViews = businessViews + totalOfferViews + totalJobViews;

  // Simular favoritos estimados (no tenemos tracking aún)
  const estimatedFavorites = Math.max(totalOffers + totalJobs, 1) * 2;

  const stats = {
    applications: { total: totalApplications, pending: pendingApplications },
    offers: { total: totalOffers, active: activeOffers },
    jobs: { total: totalJobs, active: activeJobs },
    budgets: { total: totalBudgetRequests, new: newBudgetRequests },
    favorites: { total: estimatedFavorites },
    analytics: {
      businessViews,
      businessClicks,
      offerViews: totalOfferViews,
      jobViews: totalJobViews,
      totalViews,
    },
  };

  // Datos semanales de candidaturas (simulados basados en total)
  const avgPerDay = totalApplications > 0 ? Math.max(1, Math.floor(totalApplications / 7)) : 0;
  const weeklyData = [
    { day: 'L', count: avgPerDay + Math.floor(Math.random() * 2) },
    { day: 'M', count: avgPerDay + Math.floor(Math.random() * 2) },
    { day: 'X', count: avgPerDay + Math.floor(Math.random() * 2) },
    { day: 'J', count: avgPerDay + Math.floor(Math.random() * 2) },
    { day: 'V', count: Math.max(avgPerDay, Math.floor(avgPerDay * 1.2)) },
    { day: 'S', count: Math.floor(avgPerDay * 0.5) },
    { day: 'D', count: Math.floor(avgPerDay * 0.3) },
  ];

  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center bg-white px-4 py-4 border-b border-gray-100">
        <button
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          Estadísticas
        </h2>
      </header>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Resumen general */}
        <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-5 text-white">
          <h3 className="text-blue-100 text-sm font-medium mb-1">Actividad Total</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{stats.applications.total}</span>
            <span className="text-blue-200 text-sm mb-1">candidaturas recibidas</span>
          </div>
          {stats.applications.pending > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-400/20 text-green-100">
                <Users size={14} />
                {stats.applications.pending} pendientes
              </div>
            </div>
          )}
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                <Tag size={20} />
              </div>
              <span className={`text-xs font-bold ${stats.offers.active > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {stats.offers.active}/{stats.offers.total}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.offers.total}</p>
            <p className="text-xs text-gray-500">Ofertas publicadas</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Briefcase size={20} />
              </div>
              <span className={`text-xs font-bold ${stats.jobs.active > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {stats.jobs.active}/{stats.jobs.total}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.jobs.total}</p>
            <p className="text-xs text-gray-500">Empleos publicados</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                <FileText size={20} />
              </div>
              <span className={`text-xs font-bold ${stats.budgets.new > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {stats.budgets.new} nuevos
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.budgets.total}</p>
            <p className="text-xs text-gray-500">Presupuestos</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <Heart size={20} />
              </div>
              <span className="text-xs font-bold text-gray-400">~estimado</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.favorites.total}</p>
            <p className="text-xs text-gray-500">En favoritos</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Eye size={20} />
              </div>
              <span className="text-xs font-bold text-green-600">
                +{stats.analytics.totalViews}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.analytics.businessViews}</p>
            <p className="text-xs text-gray-500">Vistas al negocio</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600">
                <MousePointerClick size={20} />
              </div>
              <span className="text-xs font-bold text-cyan-600">
                total
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.analytics.businessClicks}</p>
            <p className="text-xs text-gray-500">Clics (tel/web/mapa)</p>
          </div>

        </div>

        {/* Desglose de vistas */}
        {stats.analytics.totalViews > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Eye size={18} className="text-primary" />
              Desglose de Vistas
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Store size={16} className="text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">Página del negocio</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{stats.analytics.businessViews}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Tag size={16} className="text-orange-600" />
                  </div>
                  <span className="text-sm text-gray-700">Tus ofertas</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{stats.analytics.offerViews}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Briefcase size={16} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">Tus empleos</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{stats.analytics.jobViews}</span>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Total combinado</span>
                <span className="text-xl font-bold text-primary">{stats.analytics.totalViews}</span>
              </div>
            </div>

            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-800">
                <span className="font-bold">💡 Consejo:</span> Las vistas indican cuántas veces los usuarios han visitado tu negocio, ofertas y empleos. ¡Más vistas = más oportunidades!
              </p>
            </div>
          </div>
        )}

        {/* Gráfico semanal - Candidaturas */}
        {stats.applications.total > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Candidaturas esta semana</h3>
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyData.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col justify-end h-full">
                    <div
                      className="w-full bg-primary rounded-t transition-all"
                      style={{ height: `${Math.max((day.count / maxCount) * 100, 5)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded" />
                <span className="text-xs text-gray-500">Candidaturas recibidas</span>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              *Distribución estimada basada en datos totales
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
              <Lightbulb size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-800 mb-1">Consejo</h4>
              <p className="text-xs text-amber-700">
                Publica ofertas flash los viernes y sábados para maximizar las visitas. ¡Son los días con más tráfico!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
            <input
              className="form-input flex w-full rounded-lg text-slate-900 border-0 bg-gray-100 focus:ring-2 focus:ring-primary/20 h-14 placeholder:text-gray-400 p-4 text-base font-normal transition-all"
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
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none border-0 bg-transparent text-slate-900 focus:outline-0 focus:ring-0 h-14 placeholder:text-gray-400 p-4 pr-2 text-base font-normal"
                placeholder="********"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
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
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">O continúa con</span>
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
        </div>

        {/* Register link */}
        <div className="text-center pt-4">
          <p className="text-gray-500 text-sm">
            ¿No tienes cuenta?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-primary font-semibold hover:underline"
            >
              Regístrate
            </button>
          </p>
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
      setError('Debes aceptar los términos y condiciones');
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
        setError(`Error al crear la cuenta: ${error.message}`);
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
          <button
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
              <button
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
              <button
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
            <p className="text-gray-500 text-sm font-normal leading-tight">
              Acepto los{' '}
              <button
                type="button"
                onClick={() => onNavigate('terms-register')}
                className="text-primary font-medium hover:underline"
              >
                términos y condiciones
              </button>{' '}
              y la política de privacidad.
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
          <button
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
                    <input
                      className="form-input flex w-full rounded-xl text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 bg-white focus:border-primary h-14 placeholder:text-gray-400 px-4 text-base font-normal transition-all shadow-sm"
                      placeholder="tu@email.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
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
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2 mx-auto"
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
                    <input
                      className="form-input flex w-full rounded-xl text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 bg-white focus:border-primary h-14 placeholder:text-gray-400 px-4 pr-12 text-base font-normal transition-all shadow-sm"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-slate-900 text-sm font-medium leading-normal ml-1">Confirmar contraseña</label>
                  <div className="relative">
                    <input
                      className="form-input flex w-full rounded-xl text-slate-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 bg-white focus:border-primary h-14 placeholder:text-gray-400 px-4 text-base font-normal transition-all shadow-sm"
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

// Pantalla de Bienvenida para Propietarios
const OwnerWelcomeScreen = ({ onNavigate }) => (
  <div className="bg-white font-display text-slate-900 overflow-x-hidden antialiased">
    <div className="relative flex h-screen w-full flex-col justify-between">
      {/* Status bar placeholder */}
      <div className="h-10 w-full shrink-0"></div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Hero Image */}
        <div className="px-4 py-2 shrink-0">
          <div
            className="w-full aspect-[4/3] bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden rounded-2xl bg-gray-100 shadow-sm"
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDPV8advjKx2CN0Bxn58fgZtHNDFnRxUWy1g3oBiP3IZHBaKQ4NKj_uETI0YTgkP5S69p_Yn7TYXAtBZ3RMDe87WcfIfljXtBI7i3yS8RDjIWG7Df2emLsDKFFS1YRMycYX4GrGbMbR4Qp3EmKDeh5itBCIZuj3b4kUEE1rm0ez-HUj3LvJnEcrtiQwpGQB8jOarobmPMNEA6AU09oKKjgxM7CrAXA1RKZ_fXmGYLLn33yAB4eCcZRLaTuY8DEgPQT4gqiI95_2WhFs")' }}
          >
            <div className="w-full h-full bg-gradient-to-t from-black/10 to-transparent"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center px-6 mt-6">
          <h1 className="text-slate-900 tracking-tight text-[32px] font-bold leading-[1.1] text-center mb-4">
            Impulsa tu negocio<br/>en Cornellà
          </h1>
          <p className="text-slate-500 text-base font-normal leading-relaxed text-center max-w-xs mx-auto">
            Llega a más vecinos, publica ofertas flash y gestiona presupuestos desde un solo lugar.
          </p>
        </div>

        {/* Page Indicators */}
        <div className="flex w-full flex-row items-center justify-center gap-2 mt-8 mb-4">
          <div className="h-2 w-8 rounded-full bg-primary transition-all duration-300"></div>
          <div className="h-2 w-2 rounded-full bg-slate-200"></div>
          <div className="h-2 w-2 rounded-full bg-slate-200"></div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="w-full px-6 pb-8 pt-4 bg-white">
        <button
          onClick={() => onNavigate('business-data')}
          className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-primary text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-500/20 mb-4"
        >
          <span className="text-[17px] font-semibold leading-normal tracking-wide">Comenzar Registro</span>
        </button>

        <button
          onClick={() => onNavigate('login')}
          className="w-full flex items-center justify-center text-primary text-[15px] font-medium hover:opacity-80 transition-opacity py-2"
        >
          ¿Ya tienes cuenta? <span className="font-bold ml-1">Iniciar sesión</span>
        </button>

        <div className="h-2"></div>
      </div>
    </div>
  </div>
);

// ==============================================
// PANTALLA DE EDITAR PERFIL
// ==============================================

// Pantalla de Editar Perfil
const EditProfileScreen = ({ onNavigate, user, setUser, showToast }) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [birthDate, setBirthDate] = useState(user?.birth_date || '');
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
      const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;
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
      const updates = { full_name: fullName.trim(), birth_date: birthDate || null };
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
      setUser(prev => ({ ...prev, full_name: fullName.trim(), birth_date: birthDate || null }));
      showToast('Perfil actualizado correctamente', 'success');
      onNavigate('settings');
    } catch (e) {
      showToast(e.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 text-slate-900 font-display antialiased min-h-screen flex flex-col max-w-md mx-auto shadow-2xl">
      <header className="sticky top-0 z-50 bg-gray-50/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => onNavigate('settings')}
            className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors text-slate-800"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Editar perfil</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 px-4 pt-6 pb-8 space-y-4">
        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-bold">{(user?.full_name || user?.email || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-dark transition-colors shadow-md">
              {uploadingAvatar ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Camera className="text-white" size={16} />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files?.[0])} disabled={uploadingAvatar} />
            </label>
          </div>
          <p className="text-xs text-gray-400">Toca la cámara para cambiar tu foto</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {/* Nombre */}
          <div className="p-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre completo</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* Email */}
          <div className="p-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1.5">Si cambias el correo recibirás un email de confirmación.</p>
          </div>

          {/* Fecha de nacimiento */}
          <div className="p-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fecha de nacimiento</label>
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 bg-primary text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </main>
    </div>
  );
};

// ==============================================
// PANTALLA DE AJUSTES
// ==============================================

const SettingsScreen = ({ onNavigate, userSettings, updateSettings, onResetOnboarding, onShowNotificationModal, user, showToast, onRequestPushPermission }) => {
  // Estados locales para los toggles
  const [settings, setSettings] = useState(userSettings || {
    // Notificaciones
    pushEnabled: true,
    offerNotifications: true,
    messageNotifications: true,
    reminderNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    // Privacidad
    shareLocation: true,
    searchHistory: true,
    personalizedAds: false,
    profileVisible: true,
    // Idioma
    language: 'es',
    // Tema
    darkMode: false,
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState('default');

  // Verificar permisos de notificaciones al montar
  if (typeof window !== 'undefined' && 'Notification' in window && pushPermissionStatus === 'default') {
    // Solo actualizar si es diferente al estado actual
    if (Notification.permission !== pushPermissionStatus) {
      setPushPermissionStatus(Notification.permission);
    }
  }

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    if (updateSettings) updateSettings(newSettings);
  };

  // Solicitar permisos de notificaciones push
  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPushPermissionStatus(permission);
      if (permission === 'granted') {
        handleToggle('pushEnabled');
        // Mostrar notificación de prueba
        new Notification('¡Notificaciones activadas! 🔔', {
          body: 'Recibirás alertas de ofertas y mensajes importantes.',
          icon: '/favicon.ico',
        });
      }
    }
  };


  // Toggle Switch Component
  const ToggleSwitch = ({ enabled, onToggle, disabled = false }) => (
    <button
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
          <button
            onClick={() => onNavigate('profile')}
            className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors text-slate-800"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Ajustes</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 pb-8">
        {/* Sección: Notificaciones */}
        <section className="px-4 pt-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Notificaciones</h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
            {/* Push Notifications Principal */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.pushEnabled ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                    {settings.pushEnabled ? <BellRing size={20} /> : <BellOff size={20} />}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700 block">Notificaciones Push</span>
                    <span className="text-xs text-slate-500">Recibir alertas aunque la app esté cerrada</span>
                  </div>
                </div>
                {pushPermissionStatus === 'granted' ? (
                  <ToggleSwitch enabled={settings.pushEnabled} onToggle={() => handleToggle('pushEnabled')} />
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

            {/* Sub-opciones de notificaciones */}
            {settings.pushEnabled && pushPermissionStatus === 'granted' && (
              <>
                <div className="p-4 pl-14">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-700 block text-sm">Ofertas y descuentos</span>
                      <span className="text-xs text-slate-500">Nuevas ofertas de tus favoritos</span>
                    </div>
                    <ToggleSwitch enabled={settings.offerNotifications} onToggle={() => handleToggle('offerNotifications')} />
                  </div>
                </div>
                <div className="p-4 pl-14">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-700 block text-sm">Mensajes</span>
                      <span className="text-xs text-slate-500">Respuestas a presupuestos</span>
                    </div>
                    <ToggleSwitch enabled={settings.messageNotifications} onToggle={() => handleToggle('messageNotifications')} />
                  </div>
                </div>
                <div className="p-4 pl-14">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-700 block text-sm">Recordatorios</span>
                      <span className="text-xs text-slate-500">Cupones por caducar, citas</span>
                    </div>
                    <ToggleSwitch enabled={settings.reminderNotifications} onToggle={() => handleToggle('reminderNotifications')} />
                  </div>
                </div>
              </>
            )}


            {/* Sonido y vibración */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                  </div>
                  <span className="font-medium text-slate-700">Sonido</span>
                </div>
                <ToggleSwitch enabled={settings.soundEnabled} onToggle={() => handleToggle('soundEnabled')} />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.vibrationEnabled ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Vibrate size={20} />
                  </div>
                  <span className="font-medium text-slate-700">Vibración</span>
                </div>
                <ToggleSwitch enabled={settings.vibrationEnabled} onToggle={() => handleToggle('vibrationEnabled')} />
              </div>
            </div>
          </div>
        </section>

        {/* Sección: Privacidad */}
        <section className="px-4 pt-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Privacidad</h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.shareLocation ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <span className="font-medium text-slate-700 block">Compartir ubicación</span>
                    <span className="text-xs text-slate-500">Mostrar negocios cercanos</span>
                  </div>
                </div>
                <ToggleSwitch enabled={settings.shareLocation} onToggle={() => handleToggle('shareLocation')} />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.searchHistory ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                    <History size={20} />
                  </div>
                  <div>
                    <span className="font-medium text-slate-700 block">Historial de búsqueda</span>
                    <span className="text-xs text-slate-500">Guardar búsquedas recientes</span>
                  </div>
                </div>
                <ToggleSwitch enabled={settings.searchHistory} onToggle={() => handleToggle('searchHistory')} />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.profileVisible ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Eye size={20} />
                  </div>
                  <div>
                    <span className="font-medium text-slate-700 block">Perfil visible</span>
                    <span className="text-xs text-slate-500">Otros usuarios pueden ver tu perfil</span>
                  </div>
                </div>
                <ToggleSwitch enabled={settings.profileVisible} onToggle={() => handleToggle('profileVisible')} />
              </div>
            </div>
          </div>
        </section>

        {/* Sección: Cuenta */}
        <section className="px-4 pt-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Cuenta</h2>
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
              <ChevronRight className="text-gray-400" size={20} />
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
              <ChevronRight className="text-gray-400" size={20} />
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
              <ChevronRight className="text-gray-400" size={20} />
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
              <ChevronRight className="text-gray-400" size={20} />
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
              <ChevronRight className="text-gray-400" size={20} />
            </button>
          </div>
        </section>

        {/* Sección: Zona de peligro */}
        <section className="px-4 pt-6 pb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Zona de peligro</h2>
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
                  <span className="font-medium text-red-600 block">Borrar mis datos</span>
                  <span className="text-xs text-slate-500">Eliminar cuenta y todos los datos</span>
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
          <p className="text-xs text-gray-400">Cornellà Local v1.0.0</p>
          <p className="text-[10px] text-gray-300 mt-1">Hecho con ❤️ en Cornellà</p>
        </div>
      </main>

      {/* Modal de confirmación de borrado */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteModal(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">¿Eliminar tu cuenta?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Esta acción no se puede deshacer. Se eliminarán todos tus datos, favoritos, reseñas y medallas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-12 bg-gray-100 text-slate-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  onNavigate('login');
                }}
                className="flex-1 h-12 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
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

  // Estado del usuario autenticado
  const [user, setUser] = useState(null);
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
      setCurrentPage('login');
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
        .select('id, full_name, avatar_url, is_admin, birth_date')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            // Perfil existe: actualizar estado con datos completos del perfil
            setUser(prev => ({ ...prev, ...data }));
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
            // Solo navegar a home si estamos en una página de autenticación
            // Evita interrumpir al usuario si está navegando dentro de la app
            if (authOnlyPages.includes(currentPageRef.current)) {
              setCurrentPage('home');
            }
          } else if (event === 'INITIAL_SESSION') {
            // INITIAL_SESSION sin sesión = no hay usuario logueado
            setCurrentPage('login');
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
          } else {
            setCurrentPage('login');
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
        setCurrentPage('login');
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

  // Función para solicitar permisos y suscribirse a push notifications
  const requestPushPermission = async () => {
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

      if (!subscription) {
        // Crear nueva subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      } else {
      }

      // Guardar subscription en Supabase (delete+insert para evitar problemas con onConflict en índices de expresión)
      const endpoint = subscription.toJSON().endpoint;
      await supabase.from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .filter('subscription->>endpoint', 'eq', endpoint);

      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          subscription: subscription.toJSON(),
          user_agent: navigator.userAgent,
        });

      if (error) {
        showToast('Error al activar notificaciones', 'error');
        return false;
      }

      showToast('¡Notificaciones activadas! 🔔', 'success');
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

  // Escuchar mensajes del Service Worker (para navegación desde push)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const messageHandler = (event) => {
        if (event.data && event.data.type === 'NAVIGATE') {
          // Navegar a la URL especificada
          const url = event.data.url;
          if (url) {
            // Parsear la URL y extraer la ruta
            const path = url.replace(/^.*#\//, '');
            if (path) {
              // Usar tu función de navegación
              navigate(path, event.data.data || {});
            }
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
  }, [user, pushPermission, pushSupported]);

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
      }
    };

    loadUserFavorites();
  }, [user]);

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
        return {
          route: 'business',
          params: { id: data.business_id }
        };
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
          route: 'edit-business',
          params: { businessId: data.business_id }
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
      }
    };

    loadUserNotifications();
  }, [user]);

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
      notificationChannel.unsubscribe();
    };
  }, [user]);

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
          .order('created_at', { ascending: false });

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
      }
    };

    loadOwnerJobs();
  }, [businessData]);

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
            maxUses: offer.max_uses || null,
          };
        });

        setUserOffers(transformedOffers);
      } catch (error) {
      }
    };

    loadOwnerOffers();
  }, [businessData]);

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
        subscription.unsubscribe();
      }
    };
  }, [businessData]);

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
        const serviceNameToId = {
          'Albañil y reformas': 'albanil', 'Carpintero': 'carpintero', 'Cerrajero': 'cerrajero',
          'Climatización': 'climatizacion', 'Electricista': 'electricista', 'Fontanero': 'fontanero',
          'Jardinería': 'jardineria', 'Limpieza': 'limpieza', 'Mudanzas': 'mudanzas',
          'Pintor': 'pintor', 'Reparación móviles/PC': 'reparacion',
        };
        const legacyIds = subcategoryNames.map(n => serviceNameToId[n]).filter(Boolean);
        const allCategoryVariants = [...new Set([...subcategoryNames, ...legacyIds])];

        // 3. Cargar presupuestos de TODAS esas categorías (nombres + IDs legacy)
        const { data, error } = await supabase
          .from('budget_requests')
          .select(`
            *,
            budget_quotes(id, price, description, business_id)
          `)
          .in('category', allCategoryVariants)
          .in('status', ['pending', 'quoted'])
          .order('created_at', { ascending: false });

        if (error) throw error;


        // 4. Transformar al formato esperado
        const transformedRequests = (data || []).map(request => {
          // Buscar si ALGUNO de mis negocios ya respondió
          const myQuote = request.budget_quotes?.find(
            q => businessIds.includes(q.business_id)
          );

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
            phone: request.phone,
            photos: request.photos || [],
            createdAt: request.created_at,
            status: myQuote ? 'replied' : 'new',
            myQuote: myQuote ? { price: myQuote.price, message: myQuote.description } : null,
          };
        });

        setIncomingBudgetRequests(transformedRequests);
      } catch (error) {
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
          .order('created_at', { ascending: false });

        if (error) throw error;

        setUserJobApplications(data || []);
      } catch (error) {
      }
    };

    loadUserApplications();
  }, [user]);

  // Cargar presupuestos del usuario
  useEffect(() => {
    const loadUserBudgetRequests = async () => {
      if (!user?.id) {
        setUserBudgetRequests([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('budget_requests')
          .select(`
            *,
            budget_quotes(id, price, description, business_id, businesses(id, name))
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;


        // Transformar al formato esperado por MyBudgetRequestsScreen
        const transformed = (data || []).map(request => ({
          id: request.id,
          category: request.category,
          description: request.description,
          urgency: request.urgency,
          address: request.address,
          phone: request.phone,
          photos: request.photos || [],
          status: request.status,
          createdAt: request.created_at,
          // Transformar las cotizaciones recibidas
          responses: (request.budget_quotes || []).map(quote => ({
            id: quote.id,
            businessId: quote.business_id,
            businessName: quote.businesses?.name || 'Negocio',
            price: quote.price,
            message: quote.description,
          })),
        }));

        setUserBudgetRequests(transformed);
      } catch (error) {
      }
    };

    loadUserBudgetRequests();
  }, [user]);

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

  // Detectar parámetro de URL para abrir perfil de negocio, oferta o empleo directamente
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const negocioId = urlParams.get('negocio');
    const ofertaId = urlParams.get('oferta');
    const empleoId = urlParams.get('empleo');

    if (negocioId) {
      setCurrentPage('business');
      setPageParams({ id: parseInt(negocioId) });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (ofertaId) {
      setCurrentPage('coupon-detail');
      setPageParams({ id: parseInt(ofertaId) });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (empleoId) {
      setCurrentPage('job-detail');
      setPageParams({ id: parseInt(empleoId) });
      window.history.replaceState({}, '', window.location.pathname);
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

      // Notificar a usuarios que favoritearon el negocio
      try {
        const { data: favoritesData, error: favError } = await supabase
          .from('favorites')
          .select('user_id')
          .eq('business_id', businessData.id);

        if (!favError && favoritesData && favoritesData.length > 0) {
          const notifications = favoritesData.map(fav => ({
            user_id: fav.user_id,
            type: 'new_job',
            title: `Nueva oferta de empleo en ${businessData.name}`,
            message: `${businessData.name} ha publicado una nueva oferta: ${jobData.title}. ¡Aplica ahora!`,
            data: { business_id: businessData.id, job_id: data.id, job_title: jobData.title },
            is_read: false,
            created_at: new Date().toISOString()
          }));

          await supabase.from('notifications').insert(notifications);
        }
      } catch (notifError) {
        // No bloqueamos el flujo si falla la notificación
      }

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
  const [userSettings, setUserSettings] = useState({
    pushEnabled: true,
    offerNotifications: true,
    messageNotifications: true,
    reminderNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    shareLocation: true,
    searchHistory: true,
    personalizedAds: false,
    profileVisible: true,
    language: 'es',
    darkMode: false,
  });

  // Actualizar configuración
  const updateSettings = (newSettings) => {
    setUserSettings(newSettings);
  };

  // Agregar notificación
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      time: 'Ahora',
      isRead: false,
      ...notification
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
        window.history.pushState({ page, params }, '', `#${page}`);
      }

      // Desactivar transición para mostrar la nueva página
      setIsPageTransitioning(false);
    }, 150);
  };

  // Manejar botón atrás del navegador/móvil
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.page) {
        // Navegar a la página anterior sin añadir al historial
        navigate(event.state.page, event.state.params || {}, false);
      }
      // Si no hay estado (file pickers nativos en iOS/Android pueden disparar popstate sin estado), ignorar
    };

    // Añadir estado inicial al historial
    window.history.replaceState({ page: currentPage, params: pageParams }, '', `#${currentPage}`);

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Función para registrar un negocio (pasa a estado pendiente)
  const registerBusiness = async () => {
    if (!user?.id) {
      showToast('Debes iniciar sesión primero', 'error');
      throw new Error('Usuario no autenticado');
    }


    try {
      // Preparar datos para insertar
      const businessToInsert = {
        owner_id: user.id,
        name: tempBusinessData.name || 'Mi Negocio',
        // cif: campo no existe en la tabla (se elimina)
        category_id: tempBusinessData.category ? parseInt(tempBusinessData.category) : null,
        subcategory: tempBusinessData.subcategory || '',
        address: tempBusinessData.address || '',
        neighborhood: tempBusinessData.barrio || '',
        description: '',
        phone: '',
        verification_status: 'pending',
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


      setBusinessStatus('pending');
      setBusinessData(newBusiness);
      showToast('¡Negocio registrado! Ahora completa tu perfil', 'success');

      return newBusiness;
    } catch (error) {
      showToast('Error: ' + (error.message || 'No se pudo registrar el negocio'), 'error');
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

    // Verificar límite de 1 oferta cada 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentOffers } = await supabase
      .from('offers')
      .select('id')
      .eq('business_id', businessData.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(1);
    if (recentOffers?.length > 0) {
      showToast('Solo puedes crear 1 oferta cada 7 días', 'warning');
      return;
    }

    try {
      // Calcular fecha de expiración
      const startsAt = new Date();
      const expiresAt = new Date();
      if (offerData.isFlash) {
        expiresAt.setHours(expiresAt.getHours() + 8); // Flash = 8 horas
      } else {
        expiresAt.setDate(expiresAt.getDate() + 3); // Normal = 3 días
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
          discount_label: offerData.discountLabel || null,
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
        timeLeft: offerData.isFlash ? 'menos de 8h' : '3 días',
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
      showToast('Error al publicar la oferta', 'error');
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
      // 1. Obtener el user_id del budget_request
      const { data: budgetRequest, error: fetchError } = await supabase
        .from('budget_requests')
        .select('user_id')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Insertar la cotización
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


      // 3. Actualizar estado del budget_request a 'quoted'
      const { error: updateError } = await supabase
        .from('budget_requests')
        .update({ status: 'quoted' })
        .eq('id', requestId);


      // 4. Crear notificación para el USUARIO que solicitó el presupuesto
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: budgetRequest.user_id,
          type: 'budget_quote_received',
          title: 'Nuevo presupuesto recibido',
          message: `${businessData.name} te ha enviado un presupuesto de ${quoteData.price}€`,
          is_read: false,
          data: {
            budget_request_id: requestId,
            business_id: businessData.id,
            business_name: businessData.name,
            price: parseFloat(quoteData.price),
          },
        });


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

      // 1. Obtener TODOS los budget_quotes para este request
      const { data: allQuotes, error: quotesError } = await supabase
        .from('budget_quotes')
        .select('id, business_id, price, businesses(name, owner_id)')
        .eq('budget_request_id', requestId);

      if (quotesError) {
      }

      // 2. Identificar quotes rechazados (todos menos el aceptado)
      const rejectedQuotes = (allQuotes || []).filter(q => q.id !== quote.id);

      // 3. Actualizar el estado del budget_request a 'accepted'
      const { error: updateError } = await supabase
        .from('budget_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // 4. Obtener información del negocio aceptado
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('name, owner_id')
        .eq('id', quote.businessId)
        .single();

      if (businessError) {
      }

      // 5. Crear notificación para el propietario del negocio ACEPTADO
      if (business?.owner_id) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: business.owner_id,
            type: 'budget_quote_accepted',
            title: '¡Presupuesto aceptado!',
            message: `Un cliente ha aceptado tu presupuesto de ${quote.price}€`,
            is_read: false,
            data: {
              budget_request_id: requestId,
              business_id: quote.businessId,
              price: quote.price,
            },
          });

      }

      // 6. Notificar a los negocios NO seleccionados
      if (rejectedQuotes.length > 0) {
        const rejectedNotifications = rejectedQuotes.map(rejectedQuote => ({
          user_id: rejectedQuote.businesses?.owner_id,
          type: 'budget_quote_rejected',
          title: 'Presupuesto no seleccionado',
          message: `El cliente ha elegido otro profesional. ¡Gracias por participar!`,
          is_read: false,
          data: {
            budget_request_id: requestId,
            business_id: rejectedQuote.business_id,
            price: rejectedQuote.price,
          },
        })).filter(n => n.user_id); // Solo notificar si tiene owner_id

        if (rejectedNotifications.length > 0) {
          const { error: rejectedNotifError } = await supabase
            .from('notifications')
            .insert(rejectedNotifications);

          if (rejectedNotifError) {
          } else {
          }
        }
      }

      const rejectedCount = rejectedQuotes.length;
      const message = rejectedCount > 0
        ? `¡Presupuesto de ${business?.name || 'negocio'} aceptado! ${rejectedCount} negocio${rejectedCount > 1 ? 's' : ''} notificado${rejectedCount > 1 ? 's' : ''}.`
        : `¡Presupuesto de ${business?.name || 'negocio'} aceptado!`;
      showToast(message, 'success');
    } catch (error) {
      showToast('Error al aceptar el presupuesto', 'error');
    }
  };

  // Función para toggle de favoritos con persistencia en Supabase
  const toggleFavorite = async (businessId) => {
    if (!user?.id) {
      showToast(ERROR_MESSAGES.unauthorized, 'warning');
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
        .select()
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
      // Mostrar error concreto para facilitar el diagnóstico
      const msg = error?.message || 'Error desconocido';
      showToast(`Error al enviar: ${msg}`, 'error');
      throw error;
    }

  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={navigate} userFavorites={userFavorites} toggleFavorite={toggleFavorite} isFavorite={isFavorite} userOffers={userOffers} notifications={dynamicNotifications} params={pageParams} />;
      case 'budget-request':
        return <BudgetRequestScreen onNavigate={navigate} onSubmitRequest={submitBudgetRequest} showToast={showToast} onAddNotification={addNotification} user={user} />;
      case 'direct-budget':
        return <DirectBudgetScreen onNavigate={navigate} businessId={pageParams.businessId} businessName={pageParams.businessName} user={user} showToast={showToast} onSubmitRequest={submitBudgetRequest} />;
      case 'flash-offers':
        return <FlashOffersScreen onNavigate={navigate} userOffers={userOffers} />;
      case 'offers':
        return <OffersPage onNavigate={navigate} userOffers={userOffers} initialTab={pageParams.tab || 'offers'} activeJobs={getVisibleJobs()} loadingJobs={loadingJobs} getJobDaysRemaining={getJobDaysRemaining} isBusinessOwner={businessStatus === 'validated'} notifications={dynamicNotifications} />;
      case 'favorites':
        return <FavoritesPage onNavigate={navigate} userFavorites={userFavorites} toggleFavorite={toggleFavorite} />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} businessStatus={businessStatus} businessData={businessData} validateBusiness={validateBusiness} savedCoupons={savedCoupons} user={user} userOffers={userOffers} userJobOffers={userJobOffers} incomingBudgetRequests={incomingBudgetRequests} userJobApplications={userJobApplications} onDeleteBusiness={deleteBusiness} showToast={showToast} />;
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={navigate} user={user} />;
      case 'admin-approve-businesses':
        return <BusinessApprovalScreen onNavigate={navigate} user={user} showToast={showToast} />;
      case 'admin-users':
        return <AdminUsersScreen onNavigate={navigate} />;
      case 'admin-support':
        return <AdminSupportScreen onNavigate={navigate} />;
      case 'business-analytics':
        return <BusinessAnalyticsScreen onNavigate={navigate} user={user} businessData={businessData} />;
      case 'admin-reports':
        return <ReportsScreen onNavigate={navigate} user={user} showToast={showToast} />;
      case 'business':
        return <BusinessDetailPage businessId={pageParams.id} onNavigate={navigate} returnTo={pageParams.returnTo} returnParams={pageParams.returnParams} userFavorites={userFavorites} toggleFavorite={toggleFavorite} isFavorite={isFavorite} user={user} trackAnalyticsEvent={trackAnalyticsEvent} showToast={showToast} />;
      case 'coupon':
        return <CouponDetailPage couponId={pageParams.id} onNavigate={navigate} savedCoupons={savedCoupons} toggleSaveCoupon={toggleSaveCoupon} isCouponSaved={isCouponSaved} user={user} />;
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
        return <UserReviewsScreen onNavigate={navigate} user={user} />;
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
        return <IncomingBudgetRequestsScreen onNavigate={navigate} businessData={businessData} showToast={showToast} onAddNotification={addNotification} requests={incomingBudgetRequests} onSendQuote={respondToBudgetRequest} />;
      case 'business-budget':
        return <BusinessBudgetReplyScreen onNavigate={navigate} />;
      case 'business-offers':
        return <BusinessOffersScreen onNavigate={navigate} userOffers={userOffers} toggleVisibility={toggleOfferVisibility} />;
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
        return <NotificationsScreen onNavigate={navigate} dynamicNotifications={dynamicNotifications} user={user} onUpdateNotifications={setDynamicNotifications} />;
      case 'business-data':
        return <BusinessDataScreen onNavigate={navigate} onSaveBusinessData={setTempBusinessData} user={user} businessData={businessData} showToast={showToast} />;
      case 'business-verification':
        return <BusinessVerificationScreen onNavigate={navigate} onRegisterBusiness={registerBusiness} user={user} />;
      case 'registration-success':
        return <RegistrationSuccessScreen onNavigate={navigate} />;
      case 'business-appeal':
        return <BusinessAppealScreen onNavigate={navigate} businessData={businessData} user={user} showToast={showToast} />;
      case 'edit-business':
        return <EditBusinessScreen onNavigate={navigate} businessData={businessData} onUpdateBusiness={updateBusiness} user={user} showToast={showToast} />;
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
        return <CreateOfferScreen onNavigate={navigate} businessData={businessData} onCreateOffer={createOffer} />;
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
        />;
      case 'privacy-policy':
        return <PrivacyPolicyScreen onNavigate={navigate} />;
      case 'contact-support':
        return <ContactSupportScreen onNavigate={navigate} showToast={showToast} />;
      default:
        return <HomePage onNavigate={navigate} notifications={dynamicNotifications} params={pageParams} />;
    }
  };

  // Completar onboarding
  const completeOnboarding = (enableNotifications = false) => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setHasSeenOnboarding(true);

    if (enableNotifications) {
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
    <div className="min-h-screen bg-gray-100">
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
              <button
                onClick={dismissInstallBanner}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              >
                <X size={18} className="text-gray-400" />
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

      {/* Contenido de la página con animación */}
      <div
        className={`transition-opacity duration-150 ease-out ${
          isPageTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {renderPage()}
      </div>
    </div>
    </ErrorBoundary>
  );
}
