// Generado al dividir App.jsx: pantallas "owner" (se cargan bajo demanda con React.lazy)
import { AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, BarChart3, Briefcase, Calendar, Camera, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock, Edit3, Eye, FileText, Globe, Heart, Image, Info, Lock, MapPin, MessageCircle, MousePointerClick, PartyPopper, Pause, Phone, PiggyBank, Plus, RefreshCw, Search, Send, Settings, Star, Store, Tag, Ticket, Timer, Trash2, TrendingUp, Upload, Users, X, XCircle, Zap } from 'lucide-react';
import { ApplicationSkeleton } from '../components/LoadingSkeletons';
import { DeactivateConfirmModal, DeleteConfirmModal } from '../components/ConfirmModal';
import { SUCCESS_MESSAGES, TIMING } from '../constants';
import { categories } from '../data/mockData';
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/formatters';
import { formatSupabaseError } from '../utils/helpers';
import { getTagsBySubcategory, hasTagsForSubcategory } from '../data/businessTagsByCategory';
import { getTagsForCategory } from '../data/businessTags';
import { supabase } from '../lib/supabase';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Icon,
  Navbar,
  VerificationDocumentCard,
  barrios,
  createPrivateSignedUrl,
  getPrivateStoragePath,
} from '../App.jsx';

const PrivateStorageLink = ({ bucketName, fileRef, children, className }) => {
  const [signedUrl, setSignedUrl] = useState('');

  useEffect(() => {
    let active = true;
    createPrivateSignedUrl(bucketName, fileRef)
      .then(url => { if (active) setSignedUrl(url || ''); })
      .catch(() => { if (active) setSignedUrl(''); });
    return () => { active = false; };
  }, [bucketName, fileRef]);

  return (
    <a
      href={signedUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!signedUrl}
      className={`${className || ''} ${signedUrl ? '' : 'pointer-events-none opacity-60'}`}
    >
      {children}
    </a>
  );
};

// Pantalla de Presupuestos Entrantes (para negocios)
export const IncomingBudgetRequestsScreen = ({ onNavigate, businessData, showToast, onAddNotification, requests = [], onSendQuote }) => {
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
    const text = `Hola, soy de ${businessData?.name || 'tu negocio local'}, te contacto por tu presupuesto en Cornellà Local.`;
    window.open(`https://wa.me/34${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
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
        <button aria-label="Volver"
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
                  ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/20'
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
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
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
                  ? 'bg-green-700 text-white border-green-500 shadow-lg shadow-green-500/20'
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
                <ClipboardList className="text-gray-500" size={32} />
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
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">{getTimeAgo(request.createdAt)}</span>
                  </div>
                </div>
                <ChevronRight className="text-gray-500 shrink-0" size={20} />
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

            {/* Contact buttons - solo visibles cuando el cliente ha aceptado este presupuesto */}
            {selectedRequest.status === 'accepted' ? (
              <div className="flex gap-3">
                <button
                  onClick={() => handleContactWhatsApp(selectedRequest.phone, selectedRequest.customerName)}
                  className="flex-1 h-12 bg-green-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-green-800"
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
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <Lock size={16} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">El teléfono del cliente se mostrará cuando acepte tu presupuesto.</p>
              </div>
            )}

            {/* Reply form - only for new requests */}
            {selectedRequest.status === 'new' && (
              <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-4">
                <h4 className="font-bold text-slate-900">Enviar presupuesto</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Precio (€)</label>
                  <input aria-label="Precio (€)"
                    type="number"
                    value={replyPrice}
                    onChange={(e) => setReplyPrice(e.target.value)}
                    placeholder="85"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 text-lg font-bold placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje</label>
                  <textarea aria-label="Mensaje"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Describe qué incluye tu presupuesto, disponibilidad, etc."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <button
                  onClick={handleSendQuote}
                  disabled={!replyPrice || !replyMessage.trim()}
                  className={`w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    replyPrice && replyMessage.trim()
                      ? 'bg-primary text-white hover:bg-blue-700 shadow-lg shadow-primary/20'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
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
                className="flex-1 h-12 rounded-xl font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
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

// Pantalla de Gestión de Ofertas (para dueños de negocio)
export const BusinessOffersScreen = ({ onNavigate, userOffers = [], toggleVisibility: toggleVisibilityProp, showToast }) => {
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
        <button aria-label="Volver"
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">Gestión de Ofertas</h2>
        <button aria-label="Crear oferta"
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
                {offer.maxUses ? <span className="text-gray-500">/{offer.maxUses}</span> : ''} canjeados
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
export const BusinessJobsScreen = ({ onNavigate, userJobOffers = [], deleteJobOffer, jobApplications = [] }) => {
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
        <button aria-label="Volver"
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">Ofertas de Empleo</h2>
        <button aria-label="Crear oferta de empleo"
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
              <Briefcase className="text-gray-500" size={40} />
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
                  job.status === 'paused' ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-primary/10 border-primary/20 text-primary'
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
export const BusinessCandidatesScreen = ({ onNavigate, user, businessData, showToast }) => {
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
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(app.full_name)}&background=4b71c3&color=fff&size=128`,
              experience: app.phone || app.email, // Mostrar contacto como "experiencia"
              cv: app.cv_url || null
            }
          };
        });

        setCandidates(transformedCandidates);
      } catch (error) {
        console.error('Error cargando candidatos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCandidates();
  }, [user?.id, businessData?.id]);

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

        }

        // Cerrar automáticamente la oferta de empleo
        const { error: jobCloseError } = await supabase
          .from('jobs')
          .update({ status: 'closed', updated_at: new Date().toISOString() })
          .eq('id', hiredCandidate.jobId);

        if (jobCloseError) {
        } else {
        }
      }

      // Si rechazamos manualmente a alguien, el trigger de BD envía la notificación
      if (newStatus === 'rejected' && hiredCandidate) {
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
          <button aria-label="Volver"
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
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{c.jobTitle}</span>
                        {c.candidate.cv && (
                          <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FileText size={10} />
                            CV
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">{c.appliedAgo}</span>
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
              <button aria-label="Cerrar"
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
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Currículum Vitae</p>
                  <PrivateStorageLink
                    bucketName="job-applications"
                    fileRef={selectedCandidate.candidate.cv}
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
                  </PrivateStorageLink>
                </div>
              )}

              {/* Carta de presentación */}
              {selectedCandidate.message && selectedCandidate.message !== 'Sin mensaje' && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Carta de presentación</p>
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
                      className="w-full h-12 bg-amber-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-800 transition-colors"
                    >
                      <Eye size={18} />
                      Marcar en revisión
                    </button>
                  )}

                  {(selectedCandidate.status === 'new' || selectedCandidate.status === 'reviewing') && (
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="w-full h-12 bg-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
                    >
                      <Calendar size={18} />
                      Programar entrevista
                    </button>
                  )}

                  {selectedCandidate.status === 'interview' && (
                    <button
                      onClick={() => updateStatus(selectedCandidate.id, 'hired')}
                      className="w-full h-12 bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-green-800 transition-colors"
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
                  <input aria-label="Fecha"
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
                  <input aria-label="Hora"
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
export const CreateJobOfferScreen = ({ onNavigate, businessData, onCreateJobOffer }) => {
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
        <button aria-label="Volver"
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

      <div className="flex-1 pb-32">
        {step === 1 ? (
          /* Paso 1: Información básica */
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Título del puesto *
              </label>
              <input aria-label="Título del puesto"
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
                <MapPin size={18} className="text-gray-500 mr-2" />
                <span>Cornellà de Llobregat</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Dirección del trabajo *
              </label>
              <input aria-label="Dirección del trabajo"
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
                <select aria-label="Tipo de contrato"
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
                <select aria-label="Modalidad"
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
                <input aria-label="Salario bruto anual (€)"
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) => handleChange('salaryMin', e.target.value)}
                  placeholder="Mínimo"
                  className="flex-1 h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <span className="text-gray-500">-</span>
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
              <textarea aria-label="Descripción del puesto"
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
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 pb-8 z-40">
        {step === 1 ? (
          <button
            onClick={() => setStep(2)}
            disabled={!isStep1Valid}
            className={`w-full h-14 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
              isStep1Valid
                ? 'bg-primary text-white hover:bg-blue-700 shadow-lg shadow-primary/30'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
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
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
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

// ==============================================
// FLUJO DE REGISTRO DE NEGOCIO
// ==============================================

// Pantalla de Datos del Comercio (Paso 1)
export const BusinessDataScreen = ({ onNavigate, onSaveBusinessData, user, businessData, showToast }) => {
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
      const timeoutId = setTimeout(() => {
        onNavigate('edit-business');
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [businessData?.id]);

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
        <button aria-label="Volver"
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
          <span className="text-gray-500 text-sm">33%</span>
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
            <input aria-label="Nombre del Negocio"
              type="text"
              value={formData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Ej. Cafetería Central"
              className="w-full h-14 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* CIF/NIF */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              CIF/NIF
            </label>
            <input aria-label="CIF/NIF"
              type="text"
              value={formData.cif}
              onChange={(e) => handleChange('cif', e.target.value)}
              placeholder="EJ. B-12345678"
              className="w-full h-14 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categoría
            </label>
            <div className="relative">
              <select aria-label="Categoría"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full h-14 px-4 pr-10 rounded-xl border border-gray-200 bg-white text-slate-900 appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Selecciona una categoría</option>
                {availableCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
            </div>
          </div>

          {/* Subcategoría - Solo visible cuando hay categoría seleccionada */}
          {formData.category && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subcategoría
              </label>
              <div className="relative">
                <select aria-label="Subcategoría"
                  value={formData.subcategory}
                  onChange={(e) => handleChange('subcategory', e.target.value)}
                  className="w-full h-14 px-4 pr-10 rounded-xl border border-gray-200 bg-white text-slate-900 appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Selecciona una subcategoría</option>
                  {availableSubcategories.map(sub => (
                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
              </div>
            </div>
          )}

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dirección Física
            </label>
            <div className="relative">
              <input aria-label="Dirección Física"
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Carrer de Cornellà, 12"
                className="w-full h-14 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button aria-label="Usar mi ubicación"
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
              <select aria-label="Barrio"
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
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
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
export const BusinessVerificationScreen = ({ onNavigate, onRegisterBusiness, user }) => {
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

    return fileName;
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
      setErrors({ general: error.message?.includes('duplicate') ? 'Ya existe un negocio con estos datos.' : 'Error al crear el negocio. Inténtalo de nuevo.' });
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

      // 3. Subir documento acreditativo del negocio
      if (idFile && businessId) {
        setUploadProgress('Subiendo documento acreditativo...');
        const idUrl = await uploadFile(idFile, businessId, 'acreditacion');
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
        <button aria-label="Volver"
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
          <span className="text-gray-500 text-sm">66%</span>
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
                <p className="text-gray-500 text-xs mt-1">PDF, PNG, JPG (Max. 10MB)</p>
              </>
            )}
          </label>
          {errors.license && (
            <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
              <X size={12} /> {errors.license}
            </p>
          )}
        </div>

        {/* Documento acreditativo del negocio */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1">
            Documento acreditativo del negocio
            <span className="text-red-500">*</span>
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Sube uno de estos a nombre del negocio: alta de autónomo, recibo de luz/agua/alquiler del local,
            factura reciente o cualquier documento oficial que acredite tu vínculo con el negocio.
          </p>
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
              accept=".pdf,.png,.jpg,.jpeg"
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
                  Subir documento
                </p>
                <p className="text-gray-500 text-xs mt-1">PDF o imagen — datos legibles</p>
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
            isSubmitting ? 'bg-gray-600 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'
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
export const BusinessAppealScreen = ({ onNavigate, businessData, user, showToast }) => {
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
          const fileName = `${user.id}/appeal-${businessData.id}-${Date.now()}-${Math.random().toString(36).substr(2,5)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('verification-documents')
            .upload(fileName, img.file, { cacheControl: '3600', upsert: false });
          if (uploadError) throw uploadError;
          uploadedUrls.push(fileName);
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
        <button aria-label="Volver" onClick={() => onNavigate('profile')} className="text-slate-600 hover:text-slate-900 transition-colors">
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
          <textarea aria-label="Tu justificación"
            value={appealMessage}
            onChange={(e) => setAppealMessage(e.target.value)}
            placeholder="Explica tu situación y por qué debería aprobarse tu negocio..."
            rows={5}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
          />
          <p className="text-xs text-slate-500 mt-1 text-right">{appealMessage.length}/500</p>
        </div>

        {/* Imágenes opcionales */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Imágenes de apoyo <span className="text-slate-500 font-normal">(opcional, máx. 2)</span>
          </label>

          <div className="flex gap-3">
            {appealImages.map((img, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <button aria-label="Cerrar"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
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
                <Camera size={20} className="text-slate-500" />
                <span className="text-xs text-slate-500">Añadir</span>
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
              : 'bg-slate-100 text-slate-500 cursor-not-allowed'
          }`}
        >
          {uploading ? 'Enviando apelación...' : 'Enviar apelación'}
        </button>
      </div>
    </div>
  );
};

// Pantalla de Editar Datos del Negocio (Completa con pestañas)
export const EditBusinessScreen = ({ onNavigate, businessData, onUpdateBusiness, user, showToast, initialStep }) => {
  const [activeTab, setActiveTab] = useState('store'); // 'store', 'schedule', 'gallery'
  const [currentStep, setCurrentStep] = useState(initialStep || 1); // 1=store, 2=schedule, 3=gallery, 4=documents
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
  }, [businessData?.id]);

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
      console.error('Error subiendo foto del negocio:', err);
      showToast('Error al subir la foto. Comprueba tu conexión e inténtalo de nuevo.', 'error');
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

      // Actualizar array de documentos en la BD
      const newDocuments = [...verificationDocuments, fileName];

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

      const storagePath = getPrivateStoragePath(documentUrl, 'verification-documents');
      if (storagePath) {
        await supabase.storage.from('verification-documents').remove([storagePath]);
      }

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
          <button aria-label="Volver"
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
                currentStep > 1 ? 'bg-green-700 text-white' :
                currentStep === 1 ? 'bg-primary text-white ring-4 ring-primary/20' :
                'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > 1 ? <CheckCircle2 size={20} /> : '1'}
              </div>
              <span className={`text-xs font-medium ${currentStep === 1 ? 'text-primary' : 'text-gray-500'}`}>
                Información
              </span>
            </div>

            {/* Línea separadora 1-2 */}
            <div className={`h-0.5 flex-1 mx-2 -mt-6 ${currentStep > 1 ? 'bg-green-500' : 'bg-gray-200'}`} />

            {/* Paso 2 */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep > 2 ? 'bg-green-700 text-white' :
                currentStep === 2 ? 'bg-primary text-white ring-4 ring-primary/20' :
                'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > 2 ? <CheckCircle2 size={20} /> : '2'}
              </div>
              <span className={`text-xs font-medium ${currentStep === 2 ? 'text-primary' : 'text-gray-500'}`}>
                Horarios
              </span>
            </div>

            {/* Línea separadora 2-3 */}
            <div className={`h-0.5 flex-1 mx-2 -mt-6 ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-200'}`} />

            {/* Paso 3 */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep === 3 ? 'bg-primary text-white ring-4 ring-primary/20' :
                currentStep > 3 ? 'bg-green-700 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > 3 ? <Check size={18} /> : '3'}
              </div>
              <span className={`text-xs font-medium ${currentStep === 3 ? 'text-primary' : currentStep > 3 ? 'text-green-600' : 'text-gray-500'}`}>
                Fotos
              </span>
            </div>

            {/* Línea separadora 3-4 */}
            <div className={`h-0.5 flex-1 mx-2 -mt-6 ${currentStep > 3 ? 'bg-green-500' : 'bg-gray-200'}`} />

            {/* Paso 4 */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                currentStep === 4 ? 'bg-primary text-white ring-4 ring-primary/20' :
                'bg-gray-200 text-gray-500'
              }`}>
                4
              </div>
              <span className={`text-xs font-medium ${currentStep === 4 ? 'text-primary' : 'text-gray-500'}`}>
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
                  <input aria-label="Nombre del comercio"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Nombre de tu negocio"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    required
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select aria-label="Categoría"
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
                    <select aria-label="Subcategoría"
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
                  <textarea aria-label="Descripción"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Ejemplo: Cafetería acogedora con café artesanal, repostería casera y desayunos completos. WiFi gratis y terraza. Especialidad en capuchinos y tartas caseras."
                    rows={4}
                    maxLength={500}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">{formData.description.length}/500 caracteres</p>
                  <p className="text-xs text-gray-500 mt-1.5 italic">
                    💡 Incluye: qué ofreces, especialidades, servicios destacados (delivery, terraza, WiFi, etc.)
                  </p>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Teléfono</label>
                  <div className="relative">
                    <input aria-label="Teléfono"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="934 123 456"
                      className="w-full h-12 px-4 pl-11 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  </div>
                </div>

                {/* Web */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Sitio web</label>
                  <div className="relative">
                    <input aria-label="Sitio web"
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                      placeholder="https://www.minegocio.com"
                      className="w-full h-12 px-4 pl-11 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
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
                    <input aria-label="Dirección completa"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Carrer de Mossèn Jacint Verdaguer, 12"
                      className="w-full h-12 px-4 pl-11 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      required
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  </div>
                </div>

                {/* Barrio */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Barrio <span className="text-red-500">*</span>
                  </label>
                  <select aria-label="Barrio"
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
                          <span className="text-gray-500">-</span>
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
                          <span className="text-gray-500">-</span>
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
                    <button aria-label="Eliminar"
                      onClick={() => removeSpecialClosure(closure.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {formData.specialClosures.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">
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
                        <button aria-label="Cerrar"
                          onClick={() => handleChange('coverPhoto', null)}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
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
                        <span className="text-xs text-gray-500">Portada</span>
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
                          <button aria-label="Cerrar"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <label className="w-full h-full flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer">
                          {uploadingPhoto === index ? <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /> : <Plus className="text-gray-500" size={20} />}
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
                  {verificationDocuments.map((docUrl, index) => (
                    <VerificationDocumentCard
                      key={`${docUrl}-${index}`}
                      documentRef={docUrl}
                      index={index}
                      onRemove={handleRemoveDocument}
                      layout="row"
                    />
                  ))}
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
                isSaving ? 'bg-gray-600 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'
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
                    isSaving ? 'bg-gray-600 cursor-not-allowed' : 'bg-primary hover:bg-blue-700 shadow-primary/25'
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
                    isPublishing ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800 shadow-green-500/25'
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
              <button aria-label="Cerrar"
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
                <button aria-label="Volver"
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <span className="text-sm font-bold text-slate-900 capitalize">
                  {selectedMonth.toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                </span>
                <button aria-label="Siguiente"
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
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
                <input aria-label="Nombre del cierre"
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
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
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
export const CreateOfferScreen = ({ onNavigate, businessData, onCreateOffer, user, showToast }) => {
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
    if (file.size > 5 * 1024 * 1024) {
      showToast?.('La imagen no puede superar 5MB', 'error');
      return;
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast?.('Solo se permiten JPG, PNG o WebP', 'error');
      return;
    }
    if (!user?.id) {
      showToast?.('Debes iniciar sesión para subir imágenes', 'error');
      return;
    }
    setUploadingOfferImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/offers/${businessData?.id || 'unknown'}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('business-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('business-photos').getPublicUrl(fileName);
      handleChange('image', publicUrl);
      showToast?.('Imagen subida correctamente', 'success');
    } catch (err) {
      console.error('Error subiendo imagen de oferta:', err);
      showToast?.('Error al subir la imagen. Intenta de nuevo.', 'error');
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
    : new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

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
    return formData.isFlash ? '8 horas' : '5 días';
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
        timeLeft: formData.isFlash ? '8h' : '5 días',
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
    if (!formData.image) return false;
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
        <button aria-label="Volver"
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
            <input aria-label="Título de la Oferta"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ej: Menú del día, Corte de pelo..."
              maxLength={50}
              className="w-full h-14 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
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
                <input aria-label="Descuento (%)"
                  type="number"
                  value={formData.discountPercent}
                  onChange={(e) => handleChange('discountPercent', e.target.value)}
                  placeholder="20"
                  min="1"
                  max="100"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Precio Original (€) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input aria-label="Precio Original (€)"
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e) => handleChange('originalPrice', e.target.value)}
                  placeholder="100"
                  min="0.01"
                  step="0.01"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
              </div>
            </div>
            {discountedPrice && (
              <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Precio con descuento:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 line-through">{formData.originalPrice}€</span>
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
                <input aria-label="Precio de 1 producto (€)"
                  type="number"
                  value={formData.productPrice}
                  onChange={(e) => handleChange('productPrice', e.target.value)}
                  placeholder="5"
                  min="0.01"
                  step="0.01"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
              </div>
            </div>
            {formData.productPrice && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm text-gray-600 mb-2">El cliente verá:</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 line-through">{(parseFloat(formData.productPrice) * 2).toFixed(2)}€</span>
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
          <textarea aria-label="Descripción"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe brevemente tu oferta..."
            rows={3}
            maxLength={150}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-1 text-right">{formData.description.length}/150</p>
        </div>

        {/* Imagen */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Imagen <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            {formData.image ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden">
                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url("${formData.image}")` }} />
                <button aria-label="Cerrar"
                  onClick={() => handleChange('image', null)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                {uploadingOfferImage ? <div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /> : <Image className="text-gray-500" size={24} />}
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
                <input aria-label="Número de unidades"
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
                    <Store className="text-gray-500" size={24} />
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
                    {formData.isFlash ? '8h' : '5 días'}
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
                    <span className="text-[10px] text-gray-500 line-through mr-1">{formData.originalPrice}€</span>
                    <span className="text-sm font-bold text-green-600">{discountedPrice}€</span>
                  </div>
                )}
                {formData.discountType === '2x1' && formData.productPrice && (
                  <p className="text-[10px] text-purple-600 mt-1">2 por {formData.productPrice}€</p>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center mt-3">
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
export const ValidateCodeScreen = ({ onNavigate, user, showToast }) => {
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
        <button aria-label="Volver"
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
          <input aria-label="Código del cliente"
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
export const BusinessOwnerDashboard = ({
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
        <button aria-label="Volver"
          onClick={() => onNavigate('profile')}
          className="text-slate-800 flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight text-center">
          Panel de Propietario
        </h2>
        <button aria-label="Ajustes"
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
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
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
              <ChevronRight className="text-slate-500" size={20} />
            </button>

            <button
              onClick={() => onNavigate('business-jobs')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:text-blue-700 transition-colors relative">
                  <Briefcase size={20} />
                  {totalApplications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
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
                  <span className="text-xs text-slate-500">{activeOffers} oferta{activeOffers !== 1 ? 's' : ''} activa{activeOffers !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <ChevronRight className="text-slate-500" size={20} />
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
              <ChevronRight className="text-slate-500" size={20} />
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
                    : 'bg-slate-100 text-slate-500 cursor-not-allowed'
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
export const BusinessStatsScreen = ({
  onNavigate,
  businessData,
  userOffers = [],
  userJobOffers = [],
  jobApplications = [],
  incomingBudgetRequests = []
}) => {
  const [realFavorites, setRealFavorites] = useState(null);
  const [period, setPeriod] = useState(30); // días: 7, 30, 0 (todo)

  useEffect(() => {
    if (!businessData?.id) return;
    supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessData.id)
      .then(({ count }) => setRealFavorites(count || 0));
  }, [businessData?.id]);

  // Filtrado por período
  const cutoff = useMemo(() => {
    if (period === 0) return new Date(0);
    const d = new Date();
    d.setDate(d.getDate() - period);
    return d;
  }, [period]);

  const filteredApplications = useMemo(() =>
    jobApplications.filter(a => new Date(a.created_at) >= cutoff),
    [jobApplications, cutoff]
  );
  const filteredBudgets = useMemo(() =>
    incomingBudgetRequests.filter(b => new Date(b.createdAt) >= cutoff),
    [incomingBudgetRequests, cutoff]
  );

  // Totales
  const totalOffers = userOffers.length;
  const activeOffers = userOffers.filter(o => o.status === 'active' && o.isVisible).length;
  const totalJobs = userJobOffers.length;
  const activeJobs = userJobOffers.filter(j => j.status === 'active').length;
  const totalRedemptions = userOffers.reduce((sum, o) => sum + (o.redemptions || 0), 0);
  const businessViews = businessData?.view_count || 0;
  const businessClicks = businessData?.click_count || 0;
  const totalOfferViews = userOffers.reduce((sum, o) => sum + (o.view_count || 0), 0);
  const totalJobViews = userJobOffers.reduce((sum, j) => sum + (j.view_count || 0), 0);
  const totalViews = businessViews + totalOfferViews + totalJobViews;

  // Filtrados por período
  const periodApplications = filteredApplications.length;
  const pendingApplications = filteredApplications.filter(a => a.status === 'pending').length;
  const periodBudgets = filteredBudgets.length;
  const newBudgets = filteredBudgets.filter(r => r.status === 'new').length;
  const repliedBudgets = filteredBudgets.filter(r => r.myQuote).length;
  const budgetResponseRate = periodBudgets > 0 ? Math.round((repliedBudgets / periodBudgets) * 100) : 0;

  // Candidaturas por empleo (para tabla de rendimiento)
  const appsByJob = useMemo(() => {
    const map = {};
    jobApplications.forEach(a => { map[a.job_id] = (map[a.job_id] || 0) + 1; });
    return map;
  }, [jobApplications]);

  // Gráfico últimos 7 días (candidaturas reales por día)
  const weeklyData = useMemo(() => {
    const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      const count = jobApplications.filter(app => {
        const appDate = new Date(app.created_at);
        return appDate >= d && appDate < nextDay;
      }).length;
      return { day: dayLabels[d.getDay()], count };
    });
  }, [jobApplications]);
  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

  // Embudo: vistas negocio → clics → candidaturas+presupuestos+canjes
  const funnelConversions = totalViews > 0 ? Math.round((businessClicks / businessViews) * 100) || 0 : 0;
  const funnelActions = periodApplications + periodBudgets + totalRedemptions;
  const funnelActionRate = businessClicks > 0 ? Math.round((funnelActions / businessClicks) * 100) || 0 : 0;

  const periodLabel = period === 7 ? 'últimos 7 días' : period === 30 ? 'últimos 30 días' : 'histórico';

  return (
    <div className="mx-auto min-h-screen w-full max-w-md relative overflow-x-hidden shadow-2xl bg-gray-50 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-primary to-blue-600 px-4 pt-12 pb-5 shadow-lg">
        <button
          onClick={() => onNavigate('owner-dashboard')}
          className="mb-3 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Panel</span>
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
            <BarChart3 className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Estadísticas</h1>
            <p className="text-sm text-white/80">{businessData?.name}</p>
          </div>
        </div>
        {/* Selector de período */}
        <div className="flex gap-2">
          {[{ v: 7, l: '7 días' }, { v: 30, l: '30 días' }, { v: 0, l: 'Todo' }].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setPeriod(v)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                period === v ? 'bg-white text-primary shadow' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-6 space-y-5">

        {/* KPIs principales — filtrados por período */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Users size={20} />, color: 'bg-primary/10 text-primary', value: periodApplications, label: 'Candidaturas', sub: pendingApplications > 0 ? `${pendingApplications} pendientes` : null, subColor: 'text-amber-600' },
            { icon: <FileText size={20} />, color: 'bg-purple-100 text-purple-600', value: periodBudgets, label: 'Presupuestos', sub: newBudgets > 0 ? `${newBudgets} nuevos` : null, subColor: 'text-green-600' },
            { icon: <Eye size={20} />, color: 'bg-green-100 text-green-600', value: businessViews, label: 'Vistas negocio', sub: `${totalViews} total`, subColor: 'text-gray-500' },
            { icon: <MousePointerClick size={20} />, color: 'bg-cyan-100 text-cyan-600', value: businessClicks, label: 'Clics', sub: `tel · web · mapa`, subColor: 'text-gray-500' },
            { icon: <Heart size={20} />, color: 'bg-red-100 text-red-500', value: realFavorites === null ? '…' : realFavorites, label: 'En favoritos', sub: null },
            { icon: <Ticket size={20} />, color: 'bg-amber-100 text-amber-600', value: totalRedemptions, label: 'Canjes validados', sub: null },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${item.color}`}>
                {item.icon}
              </div>
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
              {item.sub && <p className={`text-[11px] font-medium mt-0.5 ${item.subColor}`}>{item.sub}</p>}
            </div>
          ))}
        </div>

        {/* Embudo de conversión */}
        {totalViews > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp size={17} className="text-primary" />
              Embudo de conversión
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Vistas al negocio', value: businessViews, pct: 100, color: 'bg-primary' },
                { label: 'Clics (tel/web/mapa)', value: businessClicks, pct: businessViews > 0 ? Math.min(100, Math.round((businessClicks / businessViews) * 100)) : 0, color: 'bg-cyan-400' },
                { label: `Acciones (${periodLabel})`, value: funnelActions, pct: businessClicks > 0 ? Math.min(100, Math.round((funnelActions / businessClicks) * 100)) : 0, color: 'bg-green-400' },
              ].map((row, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{row.label}</span>
                    <span className="text-xs font-bold text-slate-900">{row.value} <span className="text-gray-500 font-normal">({row.pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${row.color} h-2 rounded-full transition-all`} style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-3">Acciones = candidaturas + presupuestos + canjes</p>
          </div>
        )}

        {/* Desglose vistas */}
        {totalViews > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Eye size={17} className="text-primary" />
              Desglose de vistas
            </h3>
            {[
              { icon: <Store size={15} className="text-green-600" />, bg: 'bg-green-100', label: 'Página del negocio', value: businessViews },
              { icon: <Tag size={15} className="text-orange-600" />, bg: 'bg-orange-100', label: 'Tus ofertas', value: totalOfferViews },
              { icon: <Briefcase size={15} className="text-blue-600" />, bg: 'bg-blue-100', label: 'Tus empleos', value: totalJobViews },
            ].map((row, i) => (
              <div key={i} className={`flex items-center justify-between ${i < 2 ? 'mb-3' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 ${row.bg} rounded-lg flex items-center justify-center`}>{row.icon}</div>
                  <span className="text-sm text-gray-700">{row.label}</span>
                </div>
                <span className="font-bold text-slate-900">{row.value}</span>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Total</span>
              <span className="text-lg font-bold text-primary">{totalViews}</span>
            </div>
          </div>
        )}

        {/* Gráfico candidaturas últimos 7 días */}
        {jobApplications.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Candidaturas últimos 7 días</h3>
            <div className="flex items-end justify-between gap-1.5 h-28">
              {weeklyData.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  {day.count > 0 && (
                    <span className="text-[10px] font-bold text-primary">{day.count}</span>
                  )}
                  <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                    <div
                      className="w-full bg-primary rounded-t transition-all"
                      style={{ height: `${Math.max((day.count / maxCount) * 100, day.count > 0 ? 8 : 4)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{day.day}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rendimiento de ofertas */}
        {userOffers.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Tag size={17} className="text-orange-500" />
              Rendimiento de ofertas
            </h3>
            <div className="space-y-3">
              {[...userOffers].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).map(offer => (
                <div key={offer.id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${offer.status === 'active' && offer.isVisible ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{offer.title}</p>
                    {offer.maxUses && (
                      <div className="mt-1 w-full bg-gray-100 rounded-full h-1">
                        <div className="bg-amber-400 h-1 rounded-full" style={{ width: `${Math.min((offer.redemptions / offer.maxUses) * 100, 100)}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Eye size={12} /> {offer.view_count || 0}</span>
                    <span className="flex items-center gap-1"><Ticket size={12} /> {offer.redemptions || 0}{offer.maxUses ? `/${offer.maxUses}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rendimiento de empleos */}
        {userJobOffers.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase size={17} className="text-blue-500" />
              Rendimiento de empleos
            </h3>
            <div className="space-y-3">
              {[...userJobOffers].sort((a, b) => (appsByJob[b.id] || 0) - (appsByJob[a.id] || 0)).map(job => (
                <div key={job.id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${job.status === 'active' ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <p className="text-sm font-medium text-slate-800 flex-1 truncate">{job.title}</p>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Eye size={12} /> {job.view_count || 0}</span>
                    <span className="flex items-center gap-1 text-primary font-medium"><Users size={12} /> {appsByJob[job.id] || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasa de respuesta a presupuestos */}
        {periodBudgets > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <PiggyBank size={17} className="text-purple-500" />
              Presupuestos ({periodLabel})
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#a855f7" strokeWidth="3"
                    strokeDasharray={`${budgetResponseRate} ${100 - budgetResponseRate}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900">{budgetResponseRate}%</span>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Recibidos</span>
                  <span className="font-bold text-slate-900">{periodBudgets}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Respondidos</span>
                  <span className="font-bold text-purple-600">{repliedBudgets}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sin responder</span>
                  <span className="font-bold text-gray-500">{periodBudgets - repliedBudgets}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Pantalla de Bienvenida para Propietarios
export const OwnerWelcomeScreen = ({ onNavigate }) => (
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

