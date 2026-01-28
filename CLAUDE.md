# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cornellà Local is a React-based mobile-first web application for local commerce in Cornellà de Llobregat, Spain. It connects residents with local businesses, offering features like flash offers, budget requests for services, job listings, and business discovery.

## Development Commands

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Build for production (outputs to /dist)
npm run preview  # Preview production build
```

## Tech Stack

- **Frontend**: React 18 + Vite 5
- **Styling**: Tailwind CSS 3 with custom design tokens
- **Icons**: Lucide React
- **State**: React useState/useEffect (no external state management)

## Architecture

### Single-File Structure (Important)
The entire application lives in `src/App.jsx` (~500KB+). This is intentional for this demo project but triggers a Babel warning about file size. The warning is informational and doesn't affect functionality.

### Key Patterns

**Icon System**: Uses a string-to-component mapping via `iconMap` object. Components receive icon names as strings and render via the `Icon` component:
```jsx
<Icon name="Star" size={20} className="text-primary" />
```

**Navigation**: Custom `navigate(screen, params)` function manages all routing. Screen names are strings like `'home'`, `'business'`, `'profile'`.

**Mock Data**: All data comes from `src/data/mockData.js`. No backend - this is a frontend prototype.

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
