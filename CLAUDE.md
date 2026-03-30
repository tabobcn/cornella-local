# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CornellaLocal** es una aplicación web mobile-first para el comercio local de Cornellà de Llobregat, España. Conecta a los residentes con negocios locales, ofreciendo ofertas flash, solicitudes de presupuesto, ofertas de empleo y descubrimiento de comercios.

---

## ESTADO DEL PROYECTO (Actualizado: 2026-03-31)

### ✅ TODO LO IMPLEMENTADO

#### Base y Autenticación
- [x] Frontend React completo — diseño mobile-first, Tailwind CSS, PWA
- [x] Supabase Auth: login email/password, registro, sesión persistente, logout
- [x] **Login con Google OAuth** — `signInWithOAuth`, perfil creado automáticamente desde user_metadata
- [x] Auth flow con `onAuthStateChange` + `INITIAL_SESSION` + `SIGNED_IN`
- [x] Datos de usuario reales en perfil (full_name, email, avatar_url)
- [x] **EditProfileScreen** — editar nombre, email (con confirmación), fecha de nacimiento (`birth_date`)
- [x] **Botón atrás no cierra sesión** — en pantallas principales (home/mapa/ofertas/favoritos/perfil) el back del móvil no navega a login; `userRef` evita stale closures en el handler de `popstate`

#### Negocios
- [x] Listado de negocios desde Supabase con categorías, tags, barrio
- [x] Búsqueda, filtros por barrio y subcategoría
- [x] Tags scrolleables y carga aleatoria (sin duplicados)
- [x] Prevención de negocios duplicados en registro
- [x] BusinessDetailPage completa: horario, galería, reseñas, mapa, cierres especiales
- [x] **Google Maps iframe** — mapa real embebido + botón "Cómo llegar" (Google Maps directions)
- [x] **BusinessCard mejorada** — nombre centrado + layout izquierda/derecha con divisor `│` (categoría│rating, barrio│favoritos)
- [x] **Galería con lightbox** — grid de fotos, navegación, puntos indicadores fuera del overflow container
- [x] **cover_photo e images** — usados en todas las vistas
- [x] **Cierres especiales** — banner rojo/naranja (hoy/mañana/próximos 14 días)
- [x] "Nuevos en el barrio" con foto de portada
- [x] **Contadores de vistas/clics** — RPC `increment_business_views` / `increment_business_clicks`
- [x] **Contadores de vistas de ofertas y empleos** — RPC `increment_offer_views` / `increment_job_views`
- [x] **Botón web** — oculto si no hay URL; abre la web del negocio en nueva pestaña con `https://` automático
- [x] **Pantalla owner-welcome eliminada** — redirige directo a `business-data`; botón atrás vuelve a `profile`

#### Flujo de Registro y Publicación de Negocios
- [x] Registro de negocio en 4 pasos: info → categoría → horario → fotos+documentos
- [x] Subida de fotos (cover + galería) a Supabase Storage
- [x] Subida de documentos de verificación
- [x] **Sistema de apelación** — negocios rechazados pueden enviar mensaje + imágenes
- [x] **is_published flow completo** — step 4 muestra UI diferente si publicado/aprobado/pendiente
- [x] "Guardar cambios" para negocios ya publicados (no muestra "Publicar" de nuevo)
- [x] Campos guardados correctamente: `cover_photo`, `images`, `opening_hours`, `special_closures`

#### Panel de Propietarios
- [x] BusinessOwnerDashboard con estadísticas reales (empleos, ofertas, candidaturas, presupuestos)
- [x] Gestión completa de ofertas (crear %, 2x1, gratis; pausar; reactivar; eliminar)
- [x] **Límite 1 oferta cada 7 días** — validado en `createOffer()` antes de insertar
- [x] **Duración oferta normal = 5 días** (era 3 días) — actualizado en cálculo, texto y vista previa
- [x] **Foto obligatoria al crear oferta** — `isFormValid()` exige imagen; label muestra asterisco rojo
- [x] Gestión completa de empleos (crear, eliminar, renovar)
- [x] Presupuestos entrantes con respuesta y cotización
- [x] Panel de candidatos (filtros, cambio de estado, contratar + auto-rechazar resto con delay 1.5s)
- [x] **BusinessStatsScreen avanzada** — selector de período (7/30/90 días), embudo de conversión, gráfica semanal real, tabla de rendimiento de ofertas y empleos, tasa de respuesta en presupuestos con círculo visual
- [x] **ValidateCodeScreen** — propietario valida código del cliente (`CL-XXXX`), confirma descuento o muestra error

#### Sistema de Presupuestos
- [x] Usuarios crean solicitudes de presupuesto (categoría/descripción)
- [x] Negocios responden con cotización (precio, mensaje)
- [x] **acceptBudgetQuote()** — acepta uno y auto-rechaza los demás con notificación
- [x] "Mis Presupuestos" carga desde Supabase con cotizaciones
- [x] Presupuesto aceptado no aparece duplicado
- [x] **Privacidad del teléfono** — número del cliente oculto para el negocio hasta que el usuario acepte su presupuesto; candado amarillo con mensaje explicativo
- [x] **Mensaje WhatsApp del negocio** — "Hola, soy de [nombre negocio], te contacto por tu presupuesto en Cornellà Local" (sin nombre del cliente)

#### Sistema de Favoritos
- [x] toggleFavorite() persiste en tabla `favorites` (Supabase)
- [x] Favoritos se cargan al login y persisten al refrescar
- [x] Optimistic updates con rollback en error
- [x] FavoritesPage carga negocios dinámicamente desde Supabase
- [x] **Contador favoriteCount actualiza al instante** — al dar/quitar favorito en el listado, el corazón y el número se actualizan inmediatamente via `handleToggleFavoriteInList`
- [x] **BusinessDetailPage realtime** — suscripción a `postgres_changes` en tabla `favorites` para contar seguidores en tiempo real

#### Sistema de Notificaciones In-App
- [x] Triggers PostgreSQL auto-notifican al crear oferta/empleo a usuarios que favoritearon
- [x] Trigger notifica al propietario cuando recibe nueva candidatura
- [x] Notificación al usuario cuando recibe presupuesto (`budget_quote_received`)
- [x] Notificación al negocio cuando cliente acepta presupuesto (`budget_quote_accepted`)
- [x] Notificación al negocio cuando cliente rechaza (elige otro) (`budget_quote_rejected`)
- [x] **Realtime**: nuevas notificaciones aparecen sin refrescar + toast automático
- [x] Badge de no leídas en icono Bell — actualización en tiempo real
- [x] **Notificaciones clickeables** — navegan a la pantalla correcta según tipo
- [x] `markAsRead` actualiza badge del padre inmediatamente
- [x] **"Borrar leídas"** — elimina de Supabase y estado

#### Push Notifications (Web Push / VAPID)
- [x] `requestPushPermission()` — solicita permisos y guarda suscripción en `push_subscriptions`
- [x] VAPID_PUBLIC_KEY configurada con clave real
- [x] NotificationPermissionModal — modal bonito (no confirm nativo)
- [x] Service Worker: listener para navegar al click en notificación; vibración diferenciada por tipo
- [x] **Edge Function `send-push`** — cifrado RFC 8291 nativo Deno (sin npm:web-push), VAPID JWT ES256
- [x] Fix cifrado: CEK/nonce HKDF info sin byte `[1]` extra (bug resuelto, push llega con texto real)
- [x] Auto-request a los 3 segundos del primer login (solo si no se ha preguntado antes)
- [x] **7 triggers push activos en BD**:
  - `trigger_push_favorite_new_offer` — nueva oferta de negocio favorito
  - `trigger_push_favorite_new_job` — nuevo empleo de negocio favorito ✨
  - `trigger_push_new_budget_request` — nueva solicitud de presupuesto al negocio
  - `trigger_push_budget_response` — negocio responde presupuesto al usuario (fix: era `NEW.request_id`) ✨
  - `trigger_push_budget_result` — presupuesto aceptado/rechazado → push al negocio ✨
  - `trigger_push_new_job_application` — candidatura nueva al propietario
  - `trigger_push_application_status_change` — cambio de estado de candidatura al candidato
- [x] **Columnas view_count/click_count**: en `businesses`, `jobs`, `offers` (+ `last_viewed_at`)

#### Sistema de Ofertas con Fuegos 🔥
- [x] **Botón 🔥 en cada oferta** — toggle optimista con rollback, persiste en tabla `offer_fires`
- [x] **Sección "Destacadas"** — top 3 ofertas con más fuegos (≥1) aparecen arriba destacadas
- [x] **Resto de ofertas** — ordenadas por fecha de creación debajo de destacadas
- [x] **RPC `toggle_offer_fire`** — función atómica en BD que incrementa/decrementa `fire_count`
- [x] **Pull-to-refresh en OffersPage** — tirar hacia abajo recarga ofertas desde Supabase sin ir al inicio

#### Sistema de Candidaturas
- [x] Formulario de aplicación en JobDetailPage
- [x] Panel BusinessCandidatesScreen con filtros y gestión de estados
- [x] Contratar → auto-rechaza resto con notificación y delay suave

#### Sistema de Reseñas
- [x] Verificación de 30 días de antigüedad + email verificado (RPC `can_user_review`)
- [x] Reseñas cargadas con `select('*')` (sin JOIN problemático)
- [x] **1 reseña por negocio** — validado en RPC
- [x] **Máx 2 reseñas por semana** — validado en RPC
- [x] **Editable solo 1 vez** — columna `edit_count` en BD, persiste en Supabase
- [x] **Eliminar reseña** persiste en Supabase
- [x] **Filtro de contenido** — `moderateContent()`: insultos, spam, teléfonos, emails, mayúsculas
- [x] **Rating persiste en Supabase** — tras publicar reseña recalcula media + review_count y actualiza tabla `businesses`
- [x] **review_count en todas las vistas** — BusinessCard, DetailPage header, SubcategoryDetailPage, WhatsApp share
- [x] **Admin sin restricciones en reseñas** — bypass en frontend (`user.is_admin`) y en RPC `can_user_review`
- [x] **Propietario no puede reseñar su negocio** — validado en frontend (`owner_id`) y en RPC

#### Panel de Administración
- [x] AdminDashboard con estadísticas globales
- [x] BusinessApprovalScreen — aprobar/rechazar con motivo + ver documentos + ver apelación
- [x] ReportsScreen para gestionar reportes
- [x] BusinessAnalyticsScreen — analítica de negocios
- [x] **AdminUsersScreen** — lista de usuarios con fecha, badge Admin, acciones banear/desbanear/eliminar
- [x] **AdminAllBusinessesScreen** — lista completa de negocios con filtros (todos/aprobados/pendientes/rechazados), búsqueda y botón eliminar; accesible desde el contador de negocios en el dashboard
- [x] **AdminSupportScreen** — bandeja de mensajes de soporte (pendiente/resuelto)
- [x] **Formulario de contacto funcional** — guarda en tabla `support_requests` (Supabase), visible en panel admin
- [x] Solo visible para usuarios con `is_admin = true`
- [x] **Sistema de ban** — admin puede banear usuarios; si el usuario baneado intenta acceder → signOut automático + toast de error

#### Sistema de Redención de Ofertas
- [x] **Código único por usuario+oferta** — formato `CL-XXXX`, generado en BD con RPC `get_or_create_redemption`
- [x] **Límite de usos real** — RPC comprueba `max_uses` antes de generar código; muestra "Oferta agotada" si lleno
- [x] **CouponDetailPage rediseñada** — boarding pass azul con código en grande (reemplaza QR falso)
- [x] **3 estados visuales**: sin código / código activo / ya canjeado (tick verde)
- [x] **ValidateCodeScreen** — propietario escribe el código del cliente, valida via RPC `validate_redemption_code`
- [x] **redemption_count real** — columna en tabla `offers`, se incrementa al validar, mostrado en dashboard propietario

#### Contadores y Deep Links
- [x] BudgetRequestScreen muestra conteo real de negocios por subcategoría (desde Supabase)
- [x] **CategoryDetailPage** carga counts de subcategorías dinámicamente desde Supabase
- [x] **Contador de barrios** — `neighborhoodCounts` query directa a Supabase
- [x] **Filtro de barrios** — compara `neighborhood` contra ID y nombre del barrio
- [x] **Countdown HH:MM:SS** — hook `useCountdown` en ofertas flash (actualización cada segundo)
- [x] **Deep links** — `?negocio=ID`, `?oferta=ID`, `?empleo=ID` abren directamente la pantalla correcta
- [x] **Share de negocios** — URL con deep link `?negocio=ID`

#### UX / Navegación
- [x] Pull-to-refresh en HomePage (recarga datos reales de Supabase)
- [x] Pull-to-refresh en OffersPage (recarga ofertas sin ir al inicio)
- [x] **Botón atrás en tabs principales** — no navega a login si usuario logueado; no sale de la app
- [x] **SettingsScreen limpia** — sin modo oscuro, sin selector de idioma, sin anuncios personalizados
- [x] Términos y condiciones + Política de privacidad — back button navega a `settings`

---

## 🔜 Pendientes / Ideas Futuras

### Mejoras confirmadas para próximas sesiones
- [ ] **Notificaciones por email** — para presupuestos y candidaturas (Supabase Edge Functions + Resend/SendGrid)
- [ ] **Sistema de mensajería** — chat entre usuarios y negocios
- [ ] **Búsqueda mejorada** — filtros avanzados (precio, distancia, valoración mínima)
- [ ] **Estadísticas admin globales** — gráficas en panel de administración

### Ideas debatidas (no implementar sin confirmación)
- [ ] Notificaciones por email automáticas (triggers PostgreSQL → Edge Function → proveedor email)

### Secrets en Supabase → Edge Functions → Secrets (ya configurados)
- `VAPID_PUBLIC_KEY` = `BA_vRY5jNz2ro0yPN_-GXmTemr-oH4VzVodixY6ukjYigsm_8GFKFrWggD3VqGwMSAfEjxnZuhNbr04HZAL6Mw8`
- `VAPID_PRIVATE_KEY` = `***REDACTED-VAPID-PRIVATE-KEY***`
- `VAPID_SUBJECT` = `mailto:noreply@cornellalocal.es`

### Nota Push Notifications
Push solo funciona en HTTPS. Producción: https://www.cornellalocal.es (Vercel).

---

## Reglas de Negocio Importantes

| Regla | Descripción |
|-------|-------------|
| **Reseñas** | Usuario debe tener 30+ días registrado Y email verificado |
| **Negocios** | Se registran desde el perfil del usuario, no desde login |
| **Propietarios** | Solo pueden gestionar su negocio si `verification_status = 'approved'` |
| **Publicación** | Negocio aprobado → propietario debe publicar manualmente (is_published = true) |
| **Presupuestos** | Propietarios ven solicitudes de su categoría (subcategory match) |
| **Candidaturas** | Al contratar uno → resto se auto-rechaza automáticamente |
| **Presupuestos** | Al aceptar uno → resto se notifica como "no seleccionado" |
| **OAuth** | Perfil creado desde `session.user.user_metadata` (no espera query profiles) |
| **Ofertas** | Duración normal = 5 días; flash = 8 horas; límite 1 oferta cada 7 días |
| **Teléfono presupuesto** | Oculto para ambas partes hasta que el usuario acepte una cotización |
| **Fotos en oferta** | Obligatorio subir imagen para poder publicar |
| **Ban de usuarios** | Admin banea desde AdminUsersScreen → `is_banned=true` en profiles → próximo login hace signOut automático |

---

## Archivos Clave del Proyecto

### Código Principal
- **`src/App.jsx`** (~20,400 líneas): Toda la aplicación
  - ~30-600: Componentes reutilizables (Icon, Toast, EmptyState, skeletons, PullToRefreshIndicator...)
  - ~600-3,800: Pantallas de usuario (Home, Businesses, Offers, Jobs, Budgets...)
  - ~3,800-6,200: OffersPage (con fuegos 🔥), CouponDetailPage, BusinessDetailPage inicio
  - ~6,200-10,500: BusinessDetailPage, ReseñasSection, IncomingBudgetRequestsScreen...
  - ~10,500-14,000: AdminScreens, EditBusinessScreen (registro/edición en 4 pasos)
  - ~14,000-16,200: CreateOfferScreen, ValidateCodeScreen
  - ~16,200-20,400: App principal (state, useEffects, navigation, render)

### Utilidades
- `src/constants.js` — LIMITS, TIMING, ERROR_MESSAGES, SUCCESS_MESSAGES, REGEX_PATTERNS
- `src/utils/formatters.js` — formatDate, formatCurrency, pluralize, getInitials
- `src/utils/helpers.js` — debounce, copyToClipboard, formatSupabaseError
- `src/components/LoadingSkeletons.jsx` — 13 skeletons específicos
- `src/components/ConfirmModal.jsx` — DeleteConfirmModal, DeactivateConfirmModal, CancelConfirmModal

### Scripts SQL — Estado de Ejecución
```
✅ EJECUTADOS (no volver a ejecutar):
  setup-push-notifications.sql         — Tabla push_subscriptions + 5 triggers originales
  setup-push-missing-triggers.sql      — Fix budget_response + 2 nuevos triggers (job, budget result)
  fix-budget-quote-trigger.sql         — Fix notify_budget_response email (NEW.budget_request_id)
  fix-budget-trigger.sql               — Fix push_notify_new_budget_request (NEW.category)
  setup-offer-fires.sql                — Tabla offer_fires + RPC toggle_offer_fire + fire_count en offers
  fix-redemption-max-uses.sql          — RPC get_or_create_redemption con validación max_uses
  setup-offer-redemptions.sql          — Tabla offer_redemptions + RPCs
  setup-notifications-complete.sql     — Triggers in-app para favoritos
  setup-job-applications-complete.sql  — Sistema candidaturas
  setup-reviews-controls.sql           — edit_count en reviews + RPC can_user_review
  setup-admin-system-complete.sql      — Panel de administración
  setup-verification-documents.sql     — Documentos de verificación
  setup-support-requests.sql           — Tabla support_requests
  add-view-counters.sql                — view_count/click_count + RPCs
  add-birth-date.sql                   — Campo birth_date en profiles
  fix-profiles-rls.sql                 — Políticas RLS para profiles
  add-is-banned.sql                    — Columna is_banned en profiles + índice

⚠️ EJECUTAR SI HAY PROBLEMAS:
  fix-profiles-rls.sql                 — Si hay timeout en login (políticas SELECT/UPDATE en profiles)
```

### Edge Functions
- `supabase/functions/send-push/index.ts` — Envía push notifications con cifrado RFC 8291 nativo Deno

### Service Worker
- `public/sw.js` — Cache, push listener, notificationclick handler
  - Vibración fuerte: `budget_accepted`, `new_application`, `hired`
  - Vibración media: `budget_response`, `new_offer_favorite`, `new_job_favorite`
  - requireInteraction: `budget_accepted`, `new_application`, `hired`, `budget_response`

---

## Development Commands

```bash
npm run dev      # Start dev server en http://localhost:3000
npm run build    # Build para producción (salida en /dist)
npm run preview  # Preview del build de producción
```

---

## Tech Stack

- **Frontend**: React 18 + Vite 5
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **Styling**: Tailwind CSS 3 con colores custom
- **Icons**: Lucide React
- **State**: React useState/useEffect (sin librerías externas)
- **Deploy**: Vercel — https://www.cornellalocal.es (dominio propio activo)

---

## Architecture

### Single-File Structure
Toda la aplicación está en `src/App.jsx` (~20,400 líneas). Intencional para este proyecto.

### Key Patterns

**Auth Flow** (Supabase v2 + PKCE):
```javascript
// onAuthStateChange con INITIAL_SESSION es la fuente principal de verdad
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
    setUser({ id, email, full_name, avatar_url }); // desde session.user.user_metadata
    setCurrentPage('home');
    // Sincronizar con tabla profiles en segundo plano (sin await)
  }
});
```

**Back Button (móvil/PWA)**:
```javascript
// userRef evita stale closures — se sincroniza con useEffect([user])
const userRef = useRef(null);
useEffect(() => { userRef.current = user; }, [user]);

// En handlePopState: bloquear navegación a auth si hay usuario logueado
const AUTH_PAGES = ['login', 'register', 'forgot-password', 'reset-password'];
if (AUTH_PAGES.includes(targetPage) && userRef.current) {
  window.history.pushState({ page: 'home', params: {} }, '', '#home');
  return;
}
```

**Pull to Refresh**:
```javascript
const { pullDistance, isRefreshing, handlers } = usePullToRefresh(handleRefresh);
// En el div raíz: {...handlers}
// Encima del header: <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
```

**Optimistic Updates** (favoritos, fuegos, notificaciones):
```javascript
setState(prev => newState);              // 1. Actualizar UI
await supabase.from('table').update(...); // 2. Persistir
setState(prev => originalState);        // 3. Revertir si error
```

**Supabase Queries — Reglas Críticas**:
```javascript
// ❌ NUNCA — causa PGRST200
.select('*, profiles:user_id(full_name)')

// ✅ SIEMPRE — dos queries separadas
const { data } = await supabase.from('budget_requests').select('*');
const userIds = data.map(r => r.user_id);
const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
```

**Navigation**:
```javascript
navigate('owner-dashboard')
navigate('job-detail', { id: jobId })
```

---

## Tailwind Configuration

Custom colors en `tailwind.config.js`:
- `primary`: #567ac7 (azul principal)
- `primary-dark`: #405b94

---

## Important Notes

- **Eficiencia de tokens**: No vuelvas a leer archivos ya leídos en esta sesión a menos que se pida explícitamente. Minimiza llamadas a herramientas y trabaja con lo que ya tienes en contexto.
- App mobile-first (max-width: 448px)
- Todo en español en la UI
- localStorage solo para: búsquedas recientes, onboarding, push-asked, settings
- **Todos los datos críticos persisten en Supabase**
- Lightbox y modales deben renderizarse FUERA de contenedores `overflow-x-hidden` (usar Fragment `<>`)
- Campos en BD son snake_case, en React son camelCase — mapear correctamente
- NUNCA usar `alert()` → siempre `showToast()`
- NUNCA JOIN `profiles:user_id(...)` en Supabase queries → da PGRST200. Usar `select('*')` y cargar separado
- NUNCA seleccionar columnas que no existen en la tabla → da 400 Bad Request (ej. `subcategory` no existe en `businesses`)
- En tabla `businesses` el propietario se identifica con `owner_id` (NO `user_id`)
- `showToast` debe pasarse como prop explícitamente a cada componente que lo necesite (no es global)
- Para OAuth, NO esperar query a profiles para navegar — usar `session.user.user_metadata` directamente
- `businesses.id` es **INTEGER**; `offers.id`, `budget_requests.id`, `budget_quotes.id` son **UUID**
- `budget_quotes` tiene columna `budget_request_id` (NO `request_id`) — error frecuente en triggers
- `handleToggleFavoriteInList` en `HomePage` actualiza `businesses` state local + llama prop `toggleFavorite`

---

## Usuarios de Prueba

### carlos@test.com
- Propietario del **Café del Barrio** (id: 14)
- `verification_status = 'approved'`, `is_published = true`

### test@cornella.local
- Propietario de múltiples negocios (8 negocios asociados)
- `verification_status = 'approved'`
