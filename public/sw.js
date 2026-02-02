// Service Worker para Cornellà Local PWA
const CACHE_NAME = 'cornella-local-v3';
const STATIC_CACHE = 'cornella-static-v3';
const DYNAMIC_CACHE = 'cornella-dynamic-v3';

// Recursos estáticos para cachear al instalar
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/offline.html'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.log('[SW] Error cacheando:', err);
      })
  );
  // Activar inmediatamente
  self.skipWaiting();
});

// Activación - limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tomar control inmediatamente
  self.clients.claim();
});

// Estrategia de fetch mejorada
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar peticiones HTTP/HTTPS
  if (!request.url.startsWith('http')) return;

  // NO cachear peticiones a Supabase
  if (url.hostname.includes('supabase.co')) return;

  // NO cachear peticiones POST, PUT, DELETE, PATCH
  if (request.method !== 'GET') return;

  // Para recursos estáticos (JS, CSS, fuentes): Cache first
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Para imágenes: Cache first con fallback
  if (isImage(request)) {
    event.respondWith(cacheFirstWithFallback(request));
    return;
  }

  // Para navegación (HTML): Network first con fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Para API/datos: Network first, guardar en cache
  event.respondWith(networkFirst(request));
});

// Helpers para identificar tipos de recursos
function isStaticAsset(request) {
  const url = request.url;
  return url.endsWith('.js') ||
         url.endsWith('.css') ||
         url.endsWith('.woff') ||
         url.endsWith('.woff2');
}

function isImage(request) {
  const url = request.url;
  return url.endsWith('.png') ||
         url.endsWith('.jpg') ||
         url.endsWith('.jpeg') ||
         url.endsWith('.gif') ||
         url.endsWith('.svg') ||
         url.endsWith('.webp');
}

// Estrategia Cache First
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Cache First con fallback para imágenes
async function cacheFirstWithFallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Devolver imagen placeholder si falla
    return caches.match('/logo.png');
  }
}

// Network First
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Solo cachear peticiones GET exitosas
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Network First con página offline
async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Mostrar página offline
    return caches.match('/offline.html') || caches.match('/');
  }
}

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nueva notificación de Cornellà Local',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      },
      actions: [
        { action: 'open', title: 'Ver' },
        { action: 'close', title: 'Cerrar' }
      ]
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'Cornellà Local', options)
    );
  }
});

// Manejar clic en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});

// Sincronización en background (para cuando vuelva la conexión)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Aquí se podrían sincronizar datos pendientes
      console.log('[SW] Sincronizando datos...')
    );
  }
});
