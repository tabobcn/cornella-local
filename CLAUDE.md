# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CornellaLocal** es una aplicación web mobile-first para el comercio local de Cornellà de Llobregat, España. Conecta a los residentes con negocios locales, ofreciendo ofertas flash, solicitudes de presupuesto, ofertas de empleo y descubrimiento de comercios.

---

## ESTADO DEL PROYECTO

### Completado
- [x] Frontend React completo con todas las pantallas
- [x] Diseño mobile-first con Tailwind CSS
- [x] PWA configurada (manifest, service worker, iconos)
- [x] Pantallas de login/registro actualizadas con branding CornellaLocal
- [x] Supabase configurado (`src/lib/supabase.js`)
- [x] Schema de base de datos creado (`supabase/schema.sql`)
- [x] Categorías iniciales preparadas (`supabase/seed.sql`)
- [x] Eliminado "Soy propietario de negocio" del login (se registra desde perfil)

### Pendiente - PRÓXIMOS PASOS

#### PASO 1: Ejecutar schema.sql en Supabase
1. Abre: https://supabase.com/dashboard/project/zwhlcgckhocdkdxilldo
2. Menú izquierdo → **SQL Editor**
3. Click **New Query**
4. Abre `supabase/schema.sql` de tu proyecto
5. Copia TODO el contenido y pégalo
6. Click **Run** (espera "Success")

#### PASO 2: Ejecutar seed.sql
1. Click **New Query** otra vez
2. Abre `supabase/seed.sql`
3. Copia todo y pégalo
4. Click **Run**

#### PASO 3: Activar Email en Authentication
1. Menú izquierdo → **Authentication**
2. Click **Providers**
3. Busca **Email** y click
4. Asegúrate que está **Enabled**
5. Activa **Confirm email** (validación de correo)
6. Click **Save**

#### PASO 4: Conectar dominio (cuando lo tengas)
- Dominio previsto: **CornellaLocal.es**
- Configurar en Vercel + Supabase

#### PASO 5: Conectar autenticación real en la app
- Reemplazar login/registro simulado por Supabase Auth
- Implementar validación de email
- Implementar regla de 30 días para reseñas

#### PASO 6: Conectar datos reales
- Reemplazar mockData por consultas a Supabase
- Sistema de presupuestos con notificaciones por email
- Panel de propietarios funcional

---

## Reglas de Negocio Importantes

| Regla | Descripción |
|-------|-------------|
| **Reseñas** | Usuario debe tener 30+ días registrado Y email verificado |
| **Negocios** | Se registran desde el perfil del usuario, no desde login |
| **Presupuestos** | Al crear uno, notifica por email a negocios de esa categoría |

---

## Development Commands

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Build for production (outputs to /dist)
npm run preview  # Preview production build
```

## Tech Stack

- **Frontend**: React 18 + Vite 5
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS 3 with custom design tokens
- **Icons**: Lucide React
- **State**: React useState/useEffect (no external state management)
- **Deploy**: Vercel (previsto)

## Architecture

### Single-File Structure (Important)
The entire application lives in `src/App.jsx` (~500KB+). This is intentional for this demo project but triggers a Babel warning about file size. The warning is informational and doesn't affect functionality.

### Key Patterns

**Icon System**: Uses a string-to-component mapping via `iconMap` object. Components receive icon names as strings and render via the `Icon` component:
```jsx
<Icon name="Star" size={20} className="text-primary" />
```

**Navigation**: Custom `navigate(screen, params)` function manages all routing. Screen names are strings like `'home'`, `'business'`, `'profile'`.

**Mock Data**: Actualmente los datos vienen de `src/data/mockData.js`. Será reemplazado por Supabase cuando se complete la integración.

### Main Sections in App.jsx

1. **Reusable Components** (~line 30-600): Icon, Toast, EmptyState, StarRating, PullToRefreshIndicator, Navbar, etc.
2. **Page Components** (~line 600-10000): HomePage, BusinessDetailPage, ProfilePage, SettingsScreen, etc.
3. **Main App Component** (~line 10000+): State management, navigation logic, render logic.

## Tailwind Configuration

Custom colors defined in `tailwind.config.js`:
- `primary`: #567ac7 (main blue)
- `primary-dark`: #405b94
- Dark mode colors exist but aren't fully implemented

## Important Notes

- App is designed mobile-first (max-width: 448px container)
- Spanish language throughout the UI
- Uses localStorage for: recent searches, onboarding state, user settings
- Pull-to-refresh implemented via custom `usePullToRefresh` hook
