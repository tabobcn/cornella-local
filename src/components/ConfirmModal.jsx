// ==============================================
// MODAL DE CONFIRMACIÓN
// ==============================================
// Para acciones destructivas (borrar, cancelar, etc.)

import React from 'react';
import { AlertCircle, Trash2, X, CheckCircle2 } from 'lucide-react';

/**
 * Modal de confirmación genérico
 * @param {boolean} isOpen - Si el modal está abierto
 * @param {function} onClose - Función para cerrar el modal
 * @param {function} onConfirm - Función a ejecutar al confirmar
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje descriptivo
 * @param {string} confirmText - Texto del botón de confirmar (default: "Confirmar")
 * @param {string} cancelText - Texto del botón de cancelar (default: "Cancelar")
 * @param {string} type - Tipo: 'danger' | 'warning' | 'info' | 'success'
 * @param {boolean} loading - Si está procesando
 */
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  const types = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      borderColor: 'border-red-100',
    },
    warning: {
      icon: AlertCircle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      borderColor: 'border-amber-100',
    },
    info: {
      icon: AlertCircle,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      borderColor: 'border-blue-100',
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      buttonBg: 'bg-green-600 hover:bg-green-700',
      borderColor: 'border-green-100',
    },
  };

  const config = types[type] || types.danger;
  const Icon = config.icon;

  const handleConfirm = async () => {
    if (loading) return;
    await onConfirm();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto animate-in zoom-in-95 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className={`w-14 h-14 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon className={config.iconColor} size={28} />
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 h-12 ${config.buttonBg} text-white font-semibold rounded-xl active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Procesando...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Modal de confirmación para borrar
 * Shortcut con valores por defecto para eliminar
 */
export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemName = 'este elemento',
  loading = false,
}) => {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="¿Eliminar?"
      message={`¿Estás seguro de que quieres eliminar ${itemName}? Esta acción no se puede deshacer.`}
      confirmText="Sí, eliminar"
      cancelText="Cancelar"
      type="danger"
      loading={loading}
    />
  );
};

/**
 * Modal de confirmación para cancelar
 * Shortcut para cancelar acciones
 */
export const CancelConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  message = '¿Estás seguro de que quieres cancelar? Se perderán los cambios no guardados.',
  loading = false,
}) => {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="¿Cancelar?"
      message={message}
      confirmText="Sí, cancelar"
      cancelText="Seguir editando"
      type="warning"
      loading={loading}
    />
  );
};

/**
 * Modal de confirmación para desactivar
 * Shortcut para pausar/desactivar
 */
export const DeactivateConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemName = 'este elemento',
  loading = false,
}) => {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="¿Desactivar?"
      message={`¿Quieres desactivar ${itemName}? Podrás reactivarlo más tarde.`}
      confirmText="Sí, desactivar"
      cancelText="Cancelar"
      type="warning"
      loading={loading}
    />
  );
};

export default ConfirmModal;
