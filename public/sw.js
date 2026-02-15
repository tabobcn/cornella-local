// Service Worker para Cornellà Local PWA
const CACHE_NAME = 'cornella-local-v5';
const STATIC_CACHE = 'cornella-static-v5';
const DYNAMIC_CACHE = 'cornella-dynamic-v5';

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
  console.log('[SW] Push recibido, data:', event.data ? 'con datos' : 'sin datos');

  // Valores por defecto (se usan si el payload no llega o no se puede parsear)
  let title = 'CornellaLocal';
  let options = {
    body: 'Tienes novedades — toca para ver',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'cornella-notification',
    requireInteraction: false,
    data: { url: '/', type: 'general' },
    actions: [
      { action: 'open', title: 'Ver' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  try {
    if (event.data) {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.message || data.body || options.body;
      options.icon = data.icon || options.icon;
      options.tag = data.tag || options.tag;
      options.requireInteraction = data.requireInteraction || false;
      options.data = { url: data.url || '/', type: data.type || 'general', metadata: data.metadata || {} };

      if (data.type === 'new_application') {
        options.vibrate = [300, 100, 300, 100, 300];
        options.requireInteraction = true;
      }
      if (data.type === 'hired') {
        options.vibrate = [400, 200, 400];
        options.requireInteraction = true;
      }
    }
  } catch (e) {
    console.log('[SW] No se pudo parsear el payload push, usando valores por defecto');
  }

  // Siempre mostrar la notificación, aunque el payload falle
  event.waitUntil(self.registration.showNotification(title, options));
});

// Manejar clic en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event.action, event.notification.data);

  event.notification.close();

  // Si el usuario cerró la notificación, no hacer nada
  if (event.action === 'close') return;

  // URL a la que navegar
  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Si ya hay una ventana abierta de la app, enfocarla y navegar
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('[SW] Enfocando cliente existente');
          return client.focus().then(client => {
            // Navegar a la URL específica usando postMessage
            client.postMessage({
              type: 'NAVIGATE',
              url: event.notification.data.url,
              notificationType: event.notification.data.type,
              metadata: event.notification.data.metadata
            });
            return client;
          });
        }
      }

      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        console.log('[SW] Abriendo nueva ventana:', urlToOpen);
        return clients.openWindow(urlToOpen);
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
