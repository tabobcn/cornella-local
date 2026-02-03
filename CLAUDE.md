# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CornellaLocal** es una aplicación web mobile-first para el comercio local de Cornellà de Llobregat, España. Conecta a los residentes con negocios locales, ofreciendo ofertas flash, solicitudes de presupuesto, ofertas de empleo y descubrimiento de comercios.

---

## ESTADO DEL PROYECTO (Actualizado: 2026-02-03)

### ✅ Completado

#### Frontend y Configuración Base
- [x] Frontend React completo con todas las pantallas
- [x] Diseño mobile-first con Tailwind CSS
- [x] PWA configurada (manifest, service worker, iconos)
- [x] Pantallas de login/registro actualizadas con branding CornellaLocal
- [x] Eliminado "Soy propietario de negocio" del login (se registra desde perfil)

#### Base de Datos y Autenticación
- [x] Supabase configurado (`src/lib/supabase.js`)
- [x] Schema de base de datos completo (`supabase/schema.sql`)
- [x] Categorías iniciales (`supabase/seed.sql`)
- [x] Email Auth activado y funcionando
- [x] Login con Supabase Auth
- [x] Registro con Supabase Auth
- [x] Persistencia de sesión
- [x] Logout funcional
- [x] Datos de usuario reales en perfil

#### Datos Reales Conectados (Tasks #5-8)
- [x] **Task #5**: Negocios conectados con Supabase
  - 13 negocios de ejemplo creados
  - Carga desde base de datos real

- [x] **Task #6**: Ofertas conectadas con Supabase
  - 5 ofertas flash + 7 ofertas normales
  - Contador en tiempo real
  - Códigos QR funcionales

- [x] **Task #7**: Presupuestos conectados con Supabase
  - Sistema completo de solicitudes (`budget_requests`)
  - Tabla de cotizaciones (`budget_quotes`)
  - Guardado persistente

- [x] **Task #8**: Empleos conectados con Supabase
  - 8 ofertas de trabajo de ejemplo
  - Filtros y detalles funcionales
  - Carga desde base de datos

#### Panel de Propietarios (Tasks #9-13) - ✅ COMPLETADO Y CORREGIDO
- [x] **Task #9**: Cargar negocio del propietario automáticamente
  - useEffect que carga businessData desde Supabase
  - Mapeo de verification_status a businessStatus

- [x] **Task #10**: Gestión de empleos con Supabase
  - Cargar empleos del propietario (useEffect)
  - createJobOffer() ahora hace INSERT en Supabase
  - deleteJobOffer() ahora hace DELETE en Supabase

- [x] **Task #11**: Gestión de ofertas con Supabase
  - Cargar ofertas del propietario (useEffect)
  - createOffer() ahora hace INSERT en Supabase
  - toggleOfferVisibility() para pausar/reactivar

- [x] **Task #12**: Presupuestos entrantes con Supabase
  - Cargar solicitudes de la categoría del negocio
  - respondToBudgetRequest() para enviar cotizaciones
  - Estado se actualiza a "replied"

- [x] **Task #13**: BusinessOwnerDashboard
  - Nuevo componente completo
  - Resumen con estadísticas (empleos, ofertas, presupuestos)
  - Accesos rápidos a todas las funciones
  - Botón destacado en ProfilePage

#### Sistema de Favoritos y Notificaciones (2026-02-03) - ✅ COMPLETADO
- [x] **Favoritos persistentes con Supabase**
  - toggleFavorite() guarda/elimina en tabla `favorites`
  - Favoritos se cargan automáticamente al login
  - Optimistic updates con rollback en caso de error
  - FavoritesPage carga negocios dinámicamente desde Supabase

- [x] **Notificaciones automáticas con triggers PostgreSQL**
  - Trigger `notify_favorited_users_new_offer()` para ofertas
  - Trigger `notify_favorited_users_new_job()` para empleos
  - Se ejecutan automáticamente al crear ofertas/empleos
  - Notifican a todos los usuarios que favoritearon el negocio
  - Script completo: `supabase/setup-notifications-complete.sql`

- [x] **Notificaciones en tiempo real con Supabase Realtime**
  - Suscripción a tabla `notifications` con filtro por `user_id`
  - Notificaciones aparecen instantáneamente sin refrescar
  - Toast automático cuando llega nueva notificación
  - Desuscripción automática al logout

- [x] **Badge de notificaciones no leídas**
  - Contador en icono de Bell (HomePage, OffersPage)
  - Badge rojo con número de notificaciones sin leer
  - Se actualiza en tiempo real
  - markAsRead() persiste en Supabase

#### Sistema de Candidaturas a Empleos (2026-02-03) - ✅ COMPLETADO
- [x] **Tabla job_applications en Supabase**
  - Schema completo con campos: user_id, job_id, full_name, email, phone, message, status
  - 5 estados: pending, reviewed, shortlisted, rejected, hired
  - Políticas RLS: usuarios ven sus candidaturas, propietarios ven candidaturas de sus empleos
  - 5 índices optimizados para queries rápidas
  - Script: `supabase/setup-job-applications-complete.sql`

- [x] **Formulario de aplicación funcional**
  - JobDetailPage: botón "Aplicar" con modal de formulario
  - Campos: CV (simulado), mensaje de motivación
  - `handleSubmitApplication()` guarda en Supabase
  - Validación de usuario logueado
  - Toast de confirmación

- [x] **Panel de candidatos para propietarios**
  - BusinessCandidatesScreen carga candidaturas desde Supabase
  - JOIN con tabla jobs para obtener solo candidaturas del negocio
  - Filtros por estado: Todos, Nuevos, En revisión, Entrevista
  - `updateStatus()` persiste cambios de estado en Supabase
  - Loading spinner mientras carga

- [x] **Notificación automática al recibir candidatura**
  - Trigger `notify_business_new_application()` en base de datos
  - Se ejecuta automáticamente al INSERT en job_applications
  - Crea notificación tipo 'new_application' para propietario
  - Incluye datos del candidato y job_id en metadata

- [x] **Dashboard actualizado con contador**
  - BusinessOwnerDashboard muestra candidaturas pendientes
  - useEffect carga `jobApplications` desde Supabase
  - Contador en tiempo real
  - Enlace directo al panel de candidatos

### ✅ BUGS CORREGIDOS - 2026-02-03

**Sesión 1: Correcciones iniciales (2026-02-02)**:

1. ✅ **CRÍTICO**: `offers.business_id` tenía tipo UUID en lugar de INTEGER
   - Schema corregido en `schema-offers-FIXED.sql`
   - Script de migración en `fix-owner-panel-v2.sql`

2. ✅ **Sincronización**: `is_verified` no estaba sincronizado con `verification_status`
   - Trigger automático creado para mantener sincronización
   - UPDATE inicial para corregir datos existentes

3. ✅ **RLS Policies**: Faltaba política para que propietarios vean todas sus ofertas
   - Policy "Propietarios ven todas sus ofertas" añadida
   - Ahora pueden ver ofertas pausadas/invisibles

**Sesión 2: Correcciones de login y datos (2026-02-03)**:

4. ✅ **CRÍTICO**: Login con timeout - Faltaban políticas RLS en `profiles`
   - Añadidas 6 políticas RLS para SELECT, UPDATE, INSERT
   - Script: `supabase/fix-profiles-rls.sql`
   - Login ahora funciona sin timeout

5. ✅ **LocalStorage corrupto**: Sesiones antiguas causaban timeouts
   - Limpieza manual de localStorage resolvió el problema
   - Documentado el proceso de limpieza

6. ✅ **Query de presupuestos fallaba**: JOIN con `profiles` no existía
   - Eliminado JOIN problemático `profiles:user_id(...)`
   - Uso directo de campos de `budget_requests`
   - Error 400 eliminado

7. ✅ **Números del panel incorrectos**: Datos hardcodeados en ProfilePage
   - ProfilePage ahora recibe props reales: `userOffers, userJobOffers, incomingBudgetRequests`
   - Números calculados dinámicamente desde Supabase
   - Presupuestos, ofertas y empleos muestran contadores correctos

8. ✅ **createOffer() fallaba al insertar**: Intentaba insertar columnas inexistentes
   - Eliminados campos `code` y `conditions` que no existen en schema
   - INSERT ahora funciona correctamente

9. ✅ **NotificationsScreen crash**: Variable `notifications` no definida
   - Eliminada referencia a mockData estático
   - Componente usa solo `dynamicNotifications` de Supabase
   - Añadido useEffect para sincronizar con prop

**Archivos creados/modificados**:
- `supabase/fix-owner-panel-v2.sql` - Script corregido (elimina policies primero)
- `supabase/fix-profiles-rls.sql` - Políticas RLS para profiles
- `supabase/schema-offers-FIXED.sql` - Schema corregido de offers
- `supabase/README-FIX.md` - Guía paso a paso
- `supabase/setup-notifications-complete.sql` - ⭐ Triggers para notificaciones automáticas
- `supabase/setup-job-applications-complete.sql` - ⭐ **NUEVO**: Sistema completo de candidaturas
- `src/App.jsx` - Correcciones en ProfilePage, createOffer(), NotificationsScreen, favoritos, notificaciones, JobDetailPage, BusinessCandidatesScreen, BusinessOwnerDashboard

---

## 🔜 Pendientes Futuros

### Inmediato
- [x] **Ejecutar script de corrección** `fix-owner-panel-v2.sql` en Supabase ✅
- [x] **Ejecutar script de corrección** `fix-profiles-rls.sql` en Supabase ✅
- [x] Aprobar negocios de prueba con `verification_status = 'approved'` ✅
- [x] Testing completo del flujo de propietario ✅
- [x] Corregir números del panel (ahora usan datos reales) ✅
- [x] **Ejecutar script** `setup-job-applications-complete.sql` en Supabase ✅ COMPLETADO (2026-02-03)

### Corto plazo
- [x] **Sistema de favoritos con Supabase** ✅ COMPLETADO
- [x] **Notificaciones automáticas al crear ofertas/empleos** ✅ COMPLETADO
- [x] **Sistema de notificaciones en tiempo real** ✅ COMPLETADO
- [x] **Sistema completo de candidaturas a empleos** ✅ COMPLETADO
  - Formulario de aplicación funcional
  - Panel de propietarios para ver candidatos
  - Notificación automática al recibir candidatura
  - Estados actualizables (pending → reviewed → shortlisted → hired/rejected)
- [ ] Notificaciones por email para presupuestos
- [ ] Estadísticas reales (no mockData) - Actualmente usa datos de ejemplo
- [ ] Contador de vistas/clics en negocios
- [ ] Mejorar sistema de búsqueda con filtros avanzados
- [ ] Sistema de reseñas totalmente funcional (verificación de 30 días)

### Medio plazo
- [ ] Conectar dominio: **CornellaLocal.es**
- [ ] Deploy a Vercel
- [ ] Configurar dominio en Supabase
- [ ] Notificaciones push para nuevos presupuestos
- [ ] Sistema de mensajería entre usuarios y negocios
- [ ] Panel de administración para aprobar negocios

---

## Reglas de Negocio Importantes

| Regla | Descripción |
|-------|-------------|
| **Reseñas** | Usuario debe tener 30+ días registrado Y email verificado |
| **Negocios** | Se registran desde el perfil del usuario, no desde login |
| **Propietarios** | Solo pueden gestionar su negocio si verification_status = 'approved' |
| **Presupuestos** | Propietarios ven solicitudes de su categoría (subcategory match) |

---

## 🛠️ Cómo Aplicar las Correcciones del Panel de Propietarios

### Paso 1: Ejecutar el script de corrección en Supabase

1. Abre **Supabase Dashboard** → Tu proyecto → **SQL Editor**
2. Abre el archivo `supabase/fix-owner-panel.sql`
3. Copia y pega todo el contenido en el SQL Editor
4. Haz clic en **Run** (o Ctrl+Enter)
5. Verifica que no haya errores

Este script corrige:
- ✅ Tipo de `offers.business_id` (uuid → integer)
- ✅ Sincroniza `is_verified` con `verification_status`
- ✅ Añade políticas RLS para propietarios

### Paso 2: Aprobar un negocio de prueba

```sql
-- Ver tus negocios
SELECT id, name, verification_status, is_verified
FROM public.businesses
WHERE owner_id = auth.uid();

-- Aprobar tu negocio (para testing)
UPDATE public.businesses
SET verification_status = 'approved'
WHERE owner_id = auth.uid();
```

### Paso 3: Probar el panel

1. Recarga la aplicación (F5)
2. Ve a **Perfil** → **Panel de Propietario**
3. Verifica que se carguen todos los datos
4. Intenta crear una oferta o empleo de prueba

**Para más detalles**, consulta: `supabase/README-FIX.md`

---

## Archivos Clave del Proyecto

### Código Principal
- **`src/App.jsx`** (~13,000 líneas): Toda la aplicación
  - Líneas 30-600: Componentes reutilizables
  - Líneas 600-10,000: Pantallas/páginas
  - Líneas 10,000+: Componente App principal con state
  - Líneas 10,528+: BusinessOwnerDashboard (nuevo)

### Base de Datos
- **`supabase/schema.sql`**: Schema principal
- **`supabase/schema-jobs.sql`**: Tabla de empleos
- **`supabase/schema-offers.sql`**: Tabla de ofertas (⚠️ tiene bug)
- **`supabase/schema-offers-FIXED.sql`**: Tabla de ofertas CORREGIDA ✅
- **`supabase/schema-budget-requests.sql`**: Solicitudes de presupuesto
- **`supabase/schema-budget-quotes.sql`**: Cotizaciones de propietarios

### Scripts de Corrección y Features
- **`supabase/fix-owner-panel-v2.sql`**: Script para corregir bugs del panel (v2 mejorado)
- **`supabase/fix-profiles-rls.sql`**: Políticas RLS para tabla profiles
- **`supabase/setup-notifications-complete.sql`**: ⭐ Sistema de notificaciones automáticas
  - 2 triggers (ofertas y empleos)
  - 1 política RLS para inserts
  - 4 índices para optimización
- **`supabase/setup-job-applications-complete.sql`**: ⭐ Sistema de candidaturas a empleos
  - Tabla job_applications con 5 estados
  - 4 políticas RLS (usuarios + propietarios)
  - 2 triggers (notificaciones + updated_at)
  - 5 índices optimizados
  - Queries de verificación incluidas
- **`supabase/README-FIX.md`**: Guía completa de corrección paso a paso

### Datos de Ejemplo
- **`supabase/seed-sample-businesses.sql`**: 12 negocios de ejemplo
- **`supabase/seed-jobs.sql`**: 8 empleos de ejemplo
- **`supabase/seed-offers.sql`**: 12 ofertas de ejemplo

### Setup Completo (ejecutar estos)
- **`supabase/setup-jobs-complete.sql`**: Tabla + datos de empleos
- **`supabase/setup-offers-complete.sql`**: Tabla + datos de ofertas
- **`supabase/setup-budgets-complete.sql`**: Tablas de presupuestos

---

## Development Commands

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Build for production (outputs to /dist)
npm run preview  # Preview production build
```

---

## Tech Stack

- **Frontend**: React 18 + Vite 5
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS 3 with custom design tokens
- **Icons**: Lucide React
- **State**: React useState/useEffect (no external state management)
- **Deploy**: Vercel (previsto)

---

## Architecture

### Single-File Structure
The entire application lives in `src/App.jsx` (~13,000 líneas). This is intentional for this demo project.

### Key Patterns

**Supabase Integration**: Datos se cargan con useEffect y async/await
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

**Icon System**: String-to-component mapping via `iconMap`
```jsx
<Icon name="Star" size={20} className="text-primary" />
```

**Navigation**: Custom `navigate(screen, params)` function
```javascript
navigate('owner-dashboard')
navigate('job-detail', { id: jobId })
```

### Main Sections in App.jsx

1. **Reusable Components** (~line 30-600): Icon, Toast, EmptyState, etc.
2. **Page Components** (~line 600-10,500): HomePage, ProfilePage, BusinessOwnerDashboard, etc.
3. **Main App Component** (~line 10,500+): State, navigation, render

---

## Tailwind Configuration

Custom colors in `tailwind.config.js`:
- `primary`: #567ac7 (main blue)
- `primary-dark`: #405b94

---

## Important Notes

- App is mobile-first (max-width: 448px container)
- Spanish language throughout the UI
- Uses localStorage for: recent searches, onboarding, settings
- Pull-to-refresh implemented via custom hook
- **Todos los datos persisten en Supabase** (no se pierden al recargar)

---

## Últimos Cambios

### Sesión 3: Correcciones Finales y Panel Funcional (2026-02-03)

**Tarea**: Corregir login, políticas RLS, y números del panel

**Problemas solucionados**:
1. ✅ Login con timeout → Añadidas políticas RLS a `profiles` (`fix-profiles-rls.sql`)
2. ✅ LocalStorage corrupto → Limpieza manual resolvió timeouts
3. ✅ Query de presupuestos fallaba → Eliminado JOIN problemático con `profiles`
4. ✅ Números del panel incorrectos → ProfilePage ahora usa datos reales de Supabase

**Cambios en código**:
- `src/App.jsx` líneas ~12500: Eliminado JOIN `profiles:user_id` en query de presupuestos
- `src/App.jsx` líneas ~2654: ProfilePage recibe props `userOffers, userJobOffers, incomingBudgetRequests`
- `src/App.jsx` líneas ~2920-2960: Números dinámicos en panel (no hardcodeados)
- `src/App.jsx` línea ~13159: Pasar props reales al renderizar ProfilePage

**Archivos creados**:
- `supabase/fix-profiles-rls.sql` - Políticas RLS para tabla profiles
- `supabase/fix-owner-panel-v2.sql` - Versión corregida (elimina policies antes de alterar columna)

**Estado**: ✅ **TODO FUNCIONANDO** - Login, panel, y contadores correctos

---

### Sesión 2: Debug y Corrección del Panel (2026-02-02)

**Tarea**: Debuggear errores del panel de propietarios

**Problemas identificados**:
1. ❌ `offers.business_id` tipo UUID en lugar de INTEGER
2. ❌ `is_verified` no sincronizado con `verification_status`
3. ❌ Falta RLS policy para que propietarios vean todas sus ofertas

**Archivos creados**:
- `supabase/fix-owner-panel.sql` - Script de corrección completo
- `supabase/schema-offers-FIXED.sql` - Schema corregido
- `supabase/README-FIX.md` - Guía paso a paso
- `CLAUDE.md` actualizado con estado actual

**Estado**: ✅ Scripts de corrección listos, pendiente ejecutar en Supabase

---

### Sesión 1: Implementación del Panel (2026-02-02)

**Commit**: `c951e25 - Implementar panel de propietarios funcional con Supabase`

**Cambios principales**:
- 15 archivos modificados/creados
- +3,987 líneas añadidas
- Panel de propietarios completo (5 fases)
- Todas las funciones CRUD conectadas a Supabase
- BusinessOwnerDashboard nuevo con estadísticas en tiempo real

**Estado**: ⚠️ Implementado pero con bugs identificados

---

## Usuarios de Prueba

### Usuario 1: carlos@test.com (ACTIVO)
- **Email**: carlos@test.com
- **Password**: (configurado en Supabase Auth)
- **Rol**: Usuario normal + Propietario de negocio
- **Negocio**: Café del Barrio (id: 14)
- **Estado**: verification_status = 'approved' ✅
- **Datos en panel**:
  - 1 empleo activo
  - 1 oferta activa
  - 0 presupuestos entrantes

### Usuario 2: test@cornella.local
- **Email**: test@cornella.local
- **Password**: (configurado en Supabase Auth)
- **Rol**: Usuario normal + Propietario (múltiples negocios)
- **Negocios**: 8 negocios asociados
- **Estado**: verification_status = 'approved' ✅
