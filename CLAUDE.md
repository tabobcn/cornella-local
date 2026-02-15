# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CornellaLocal** es una aplicación web mobile-first para el comercio local de Cornellà de Llobregat, España. Conecta a los residentes con negocios locales, ofreciendo ofertas flash, solicitudes de presupuesto, ofertas de empleo y descubrimiento de comercios.

---

## ESTADO DEL PROYECTO (Actualizado: 2026-02-15)

### ✅ TODO LO IMPLEMENTADO

#### Base y Autenticación
- [x] Frontend React completo — diseño mobile-first, Tailwind CSS, PWA
- [x] Supabase Auth: login email/password, registro, sesión persistente, logout
- [x] **Login con Google OAuth** — `signInWithOAuth`, perfil creado automáticamente desde user_metadata
- [x] Auth flow con `onAuthStateChange` + `INITIAL_SESSION` + `SIGNED_IN`
- [x] Datos de usuario reales en perfil (full_name, email, avatar_url)

#### Negocios
- [x] Listado de negocios desde Supabase con categorías, tags, barrio
- [x] Búsqueda, filtros por barrio y subcategoría
- [x] Tags scrolleables y carga aleatoria (sin duplicados)
- [x] Prevención de negocios duplicados en registro
- [x] BusinessDetailPage completa: horario, galería, reseñas, mapa, cierres especiales
- [x] **Galería con lightbox** — grid de fotos, navegación, puntos indicadores fuera del overflow container
- [x] **cover_photo e images** — usados en todas las vistas
- [x] **Cierres especiales** — banner rojo/naranja (hoy/mañana/próximos 14 días)
- [x] "Nuevos en el barrio" con foto de portada
- [x] **Contadores de vistas/clics** — RPC `increment_business_views` / `increment_business_clicks`
- [x] **Contadores de vistas de ofertas y empleos** — RPC `increment_offer_views` / `increment_job_views`

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
- [x] Gestión completa de empleos (crear, eliminar, renovar)
- [x] Presupuestos entrantes con respuesta y cotización
- [x] Panel de candidatos (filtros, cambio de estado, contratar + auto-rechazar resto con delay 1.5s)
- [x] BusinessStatsScreen — estadísticas detalladas del negocio

#### Sistema de Presupuestos
- [x] Usuarios crean solicitudes de presupuesto (categoría/descripción)
- [x] Negocios responden con cotización (precio, mensaje)
- [x] **acceptBudgetQuote()** — acepta uno y auto-rechaza los demás con notificación
- [x] "Mis Presupuestos" carga desde Supabase con cotizaciones
- [x] Presupuesto aceptado no aparece duplicado

#### Sistema de Favoritos
- [x] toggleFavorite() persiste en tabla `favorites` (Supabase)
- [x] Favoritos se cargan al login y persisten al refrescar
- [x] Optimistic updates con rollback en error
- [x] FavoritesPage carga negocios dinámicamente desde Supabase

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
- [x] Service Worker: listener para navegar al click en notificación
- [x] Edge Function `send-push` desplegada (usa `npm:web-push` con firma VAPID)
- [x] Auto-request a los 3 segundos del primer login (solo si no se ha preguntado antes)
- [x] **Triggers push en BD**: `trigger_push_favorite_new_offer`, `trigger_push_new_budget_request`, `trigger_push_budget_response`, `trigger_push_new_job_application`, `trigger_push_application_status_change`
- [x] **Columnas view_count/click_count**: en `businesses`, `jobs`, `offers` (+ `last_viewed_at`)

#### Sistema de Candidaturas
- [x] Formulario de aplicación en JobDetailPage
- [x] Panel BusinessCandidatesScreen con filtros y gestión de estados
- [x] Contratar → auto-rechaza resto con notificación y delay suave

#### Sistema de Reseñas
- [x] Verificación de 30 días de antigüedad + email verificado (RPC `can_user_review`)
- [x] Reseñas cargadas con `select('*')` (sin JOIN problemático)

#### Panel de Administración
- [x] AdminDashboard con estadísticas globales
- [x] BusinessApprovalScreen — aprobar/rechazar con motivo + ver documentos + ver apelación
- [x] ReportsScreen para gestionar reportes
- [x] BusinessAnalyticsScreen — analítica de negocios
- [x] Solo visible para usuarios con `is_admin = true`

#### Contadores de Categorías
- [x] BudgetRequestScreen muestra conteo real de negocios por subcategoría (desde Supabase)

---

## 🔜 Pendientes

### Secrets en Supabase → Edge Functions → Secrets (ya configurados)
- `VAPID_PUBLIC_KEY` = `BA_vRY5jNz2ro0yPN_-GXmTemr-oH4VzVodixY6ukjYigsm_8GFKFrWggD3VqGwMSAfEjxnZuhNbr04HZAL6Mw8`
- `VAPID_PRIVATE_KEY` = `***REDACTED-VAPID-PRIVATE-KEY***`
- `VAPID_SUBJECT` = `mailto:noreply@cornellalocal.es`

### TODOs menores en código (no críticos)
- `redemptions: 0` — contador de redenciones de ofertas (requiere tabla nueva en BD)
- Pantallas admin futuras: usuarios admin, stats globales avanzadas

### Nota Push Notifications
Push solo funciona en HTTPS. Ya deployado en Vercel = funciona en producción.

### Mejoras futuras
- [ ] **Notificaciones por email** — para presupuestos y candidaturas (Supabase Edge Functions)
- [ ] **Búsqueda mejorada** — filtros avanzados (precio, distancia, valoración)
- [ ] **Dominio propio** — CornellaLocal.es + configurar en Supabase/Vercel
- [ ] **Sistema de mensajería** — chat entre usuarios y negocios
- [ ] **Estadísticas avanzadas** — gráficas en dashboard del propietario

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

---

## Archivos Clave del Proyecto

### Código Principal
- **`src/App.jsx`** (~19,500 líneas): Toda la aplicación
  - ~30-600: Componentes reutilizables (Icon, Toast, EmptyState, skeletons...)
  - ~600-5,700: Pantallas de usuario (Home, Businesses, Offers, Jobs, Budgets...)
  - ~5,700-10,500: BusinessDetailPage, ReseñasSection, AdminScreens...
  - ~10,500-14,000: EditBusinessScreen (registro/edición en 4 pasos)
  - ~14,000-19,500: App principal (state, useEffects, navigation, render)

### Utilidades
- `src/constants.js` — LIMITS, TIMING, ERROR_MESSAGES, SUCCESS_MESSAGES, REGEX_PATTERNS
- `src/utils/formatters.js` — formatDate, formatCurrency, pluralize, getInitials
- `src/utils/helpers.js` — debounce, copyToClipboard, formatSupabaseError
- `src/components/LoadingSkeletons.jsx` — 13 skeletons específicos
- `src/components/ConfirmModal.jsx` — DeleteConfirmModal, DeactivateConfirmModal, CancelConfirmModal

### Scripts SQL Importantes
- `supabase/setup-notifications-complete.sql` — ⭐ Triggers notificaciones (ejecutar en Supabase)
- `supabase/setup-job-applications-complete.sql` — ⭐ Sistema candidaturas (ejecutar en Supabase)
- `supabase/fix-profiles-rls.sql` — Políticas RLS para profiles (ejecutar si hay timeout en login)
- `supabase/setup-push-notifications.sql` — Push notifications tabla + triggers (✅ ejecutado)
- `supabase/add-view-counters.sql` — view_count/click_count columns + RPC (✅ ejecutado)
- `supabase/add-missing-business-columns.sql` — cover_photo, special_closures
- `supabase/setup-admin-system-complete.sql` — Panel de administración
- `supabase/setup-verification-documents.sql` — Documentos de verificación
- `supabase/add-business-appeal.sql` — Sistema de apelación
- `supabase/add-is-published.sql` — Campo is_published en businesses

### Edge Functions
- `supabase/functions/send-push/index.ts` — Envía push notifications usando npm:web-push + VAPID

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
- **Deploy**: Vercel (activo en cornella-local.vercel.app)

---

## Architecture

### Single-File Structure
Toda la aplicación está en `src/App.jsx` (~19,500 líneas). Intencional para este proyecto.

### Key Patterns

**Auth Flow** (Supabase v2 + PKCE):
```javascript
// onAuthStateChange con INITIAL_SESSION es la fuente principal de verdad
// Con detectSessionInUrl: true, Supabase intercambia el código OAuth automáticamente
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
    // Setear usuario inmediatamente desde session.user (no esperar profiles query)
    setUser({ id, email, full_name, avatar_url }); // desde session.user.user_metadata
    setCurrentPage('home');
    // Sincronizar con tabla profiles en segundo plano (sin await)
  }
});
```

**Supabase Integration**:
```javascript
useEffect(() => {
  const fetchData = async () => {
    const { data, error } = await supabase.from('table').select('*');
    if (error) console.error(error);
    setData(data);
  };
  fetchData();
}, [dependency]);
```

**Optimistic Updates** (favoritos, notificaciones, estados):
```javascript
setState(prev => newState);           // 1. Actualizar UI
await supabase.from('table').update(...); // 2. Persistir
setState(prev => originalState);     // 3. Revertir si error
```

**Navigation**:
```javascript
navigate('owner-dashboard')
navigate('job-detail', { id: jobId })
```

**Icon System**:
```jsx
<Icon name="Star" size={20} className="text-primary" />
```

---

## Tailwind Configuration

Custom colors en `tailwind.config.js`:
- `primary`: #567ac7 (azul principal)
- `primary-dark`: #405b94

---

## Important Notes

- App mobile-first (max-width: 448px)
- Todo en español en la UI
- localStorage solo para: búsquedas recientes, onboarding, push-asked, settings
- Pull-to-refresh implementado
- **Todos los datos críticos persisten en Supabase**
- Lightbox y modales deben renderizarse FUERA de contenedores `overflow-x-hidden` (usar Fragment `<>`)
- Campos en BD son snake_case, en React son camelCase — mapear correctamente
- NUNCA usar `alert()` → siempre `showToast()`
- NUNCA JOIN `profiles:user_id(...)` en Supabase queries → da PGRST200. Usar `select('*')` y cargar separado
- Para OAuth, NO esperar query a profiles para navegar — usar `session.user.user_metadata` directamente

---

## Usuarios de Prueba

### carlos@test.com
- Propietario del **Café del Barrio** (id: 14)
- `verification_status = 'approved'`, `is_published = true`

### test@cornella.local
- Propietario de múltiples negocios (8 negocios asociados)
- `verification_status = 'approved'`
