// ==============================================
// LOADING SKELETONS
// ==============================================
// Placeholders animados mientras se cargan datos

import React from 'react';

/**
 * Skeleton genérico con animación shimmer
 */
export const Skeleton = ({ width = '100%', height = '20px', className = '', rounded = 'rounded' }) => (
  <div
    className={`bg-gray-200 animate-pulse ${rounded} ${className}`}
    style={{ width, height }}
  />
);

/**
 * Skeleton para tarjeta de negocio
 */
export const BusinessCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 animate-pulse">
    <div className="flex items-start gap-3">
      {/* Imagen */}
      <div className="w-16 h-16 bg-gray-200 rounded-xl shrink-0" />

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        {/* Título */}
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />

        {/* Categoría */}
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />

        {/* Rating y distancia */}
        <div className="flex items-center gap-3">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12" />
        </div>
      </div>

      {/* Corazón */}
      <div className="w-6 h-6 bg-gray-200 rounded-full shrink-0" />
    </div>
  </div>
);

/**
 * Skeleton para tarjeta de oferta
 */
export const OfferCardSkeleton = () => (
  <div className="relative bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
    {/* Badge */}
    <div className="absolute top-3 right-3 w-16 h-6 bg-gray-200 rounded-full" />

    {/* Título */}
    <div className="h-6 bg-gray-200 rounded w-2/3 mb-3" />

    {/* Descripción */}
    <div className="space-y-2 mb-3">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-gray-200 rounded-full" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-20" />
    </div>
  </div>
);

/**
 * Skeleton para tarjeta de empleo
 */
export const JobCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 animate-pulse">
    {/* Header */}
    <div className="flex items-start gap-3 mb-3">
      <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
      <div className="flex-1">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>

    {/* Tags */}
    <div className="flex gap-2 mb-3">
      <div className="h-6 bg-gray-200 rounded-full w-20" />
      <div className="h-6 bg-gray-200 rounded-full w-24" />
      <div className="h-6 bg-gray-200 rounded-full w-16" />
    </div>

    {/* Descripción */}
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-4/5" />
    </div>
  </div>
);

/**
 * Skeleton para lista de negocios
 */
export const BusinessListSkeleton = ({ count = 5 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <BusinessCardSkeleton key={i} />
    ))}
  </>
);

/**
 * Skeleton para lista de ofertas
 */
export const OfferListSkeleton = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <OfferCardSkeleton key={i} />
    ))}
  </div>
);

/**
 * Skeleton para lista de empleos
 */
export const JobListSkeleton = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <JobCardSkeleton key={i} />
    ))}
  </>
);

/**
 * Skeleton para detalle de negocio
 */
export const BusinessDetailSkeleton = () => (
  <div className="mx-auto min-h-screen w-full max-w-md bg-gray-50 animate-pulse">
    {/* Header Image */}
    <div className="h-64 bg-gray-300" />

    {/* Content */}
    <div className="px-4 py-6 space-y-6">
      {/* Título y rating */}
      <div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded w-20" />
          <div className="h-6 bg-gray-200 rounded w-24" />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="h-20 bg-gray-200 rounded-xl" />
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>

      {/* Info adicional */}
      <div className="space-y-3">
        <div className="h-12 bg-gray-200 rounded-xl" />
        <div className="h-12 bg-gray-200 rounded-xl" />
        <div className="h-12 bg-gray-200 rounded-xl" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton para reseña
 */
export const ReviewSkeleton = () => (
  <div className="bg-white rounded-xl p-4 mb-3 animate-pulse">
    <div className="flex items-start gap-3 mb-3">
      <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
    </div>
  </div>
);

/**
 * Skeleton para candidatura
 */
export const ApplicationSkeleton = () => (
  <div className="bg-white rounded-xl p-4 mb-3 border border-gray-100 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
        <div>
          <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
      </div>
      <div className="h-6 bg-gray-200 rounded-full w-20" />
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-4/5" />
    </div>
  </div>
);

/**
 * Skeleton para notificación
 */
export const NotificationSkeleton = () => (
  <div className="flex items-start gap-3 p-4 bg-white rounded-xl mb-2 animate-pulse">
    <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
    <div className="flex-1">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-1" />
      <div className="h-3 bg-gray-200 rounded w-20" />
    </div>
  </div>
);

/**
 * Skeleton para estadística (dashboard)
 */
export const StatCardSkeleton = () => (
  <div className="bg-white rounded-xl p-4 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 bg-gray-200 rounded-lg" />
      <div className="h-5 bg-gray-200 rounded w-16" />
    </div>
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-1" />
    <div className="h-3 bg-gray-200 rounded w-1/2" />
  </div>
);

/**
 * Skeleton para grid de categorías
 */
export const CategoryGridSkeleton = ({ count = 8 }) => (
  <div className="grid grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="w-full aspect-square bg-gray-200 rounded-2xl mb-2" />
        <div className="h-3 bg-gray-200 rounded mx-auto w-3/4" />
      </div>
    ))}
  </div>
);

/**
 * Skeleton para texto genérico
 */
export const TextSkeleton = ({ lines = 3 }) => (
  <div className="space-y-2 animate-pulse">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-4 bg-gray-200 rounded"
        style={{ width: i === lines - 1 ? '75%' : '100%' }}
      />
    ))}
  </div>
);

export default {
  Skeleton,
  BusinessCardSkeleton,
  OfferCardSkeleton,
  JobCardSkeleton,
  BusinessListSkeleton,
  OfferListSkeleton,
  JobListSkeleton,
  BusinessDetailSkeleton,
  ReviewSkeleton,
  ApplicationSkeleton,
  NotificationSkeleton,
  StatCardSkeleton,
  CategoryGridSkeleton,
  TextSkeleton,
};
