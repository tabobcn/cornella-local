# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CornellaLocal** is a mobile-first web application for local commerce in Cornella de Llobregat, Spain. It connects residents with local businesses, offering flash deals, budget requests, job listings, and business discovery. The entire UI is in Spanish.

- **Live URL**: https://cornellalocal.es (deployed on Vercel)
- **Support email**: soporte@cornellalocal.es

---

## Development Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (output: /dist), uses Terser minification
npm run preview  # Preview production build
```

**Environment variables** (required in `.env`):
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3 + Vite 5.4 |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) |
| Styling | Tailwind CSS 3.4 with custom theme |
| Icons | Lucide React |
| State | React useState/useEffect (no external state libraries) |
| Auth | Supabase Auth v2 with PKCE flow + Google OAuth |
| Push | Web Push with VAPID (RFC 8291, native Deno crypto) |
| Deploy | Vercel (custom domain cornellalocal.es) |
| PWA | Service Worker v5 with offline support, manifest.json |

---

## Architecture

### Single-File Application

The entire application lives in **`src/App.jsx`** (~19,627 lines). This is intentional. All components, screens, hooks, and the main App function are in this one file.

### App.jsx Section Map

| Lines | Content |
|-------|---------|
| 1-52 | Imports (React, Supabase, Lucide icons, components) |
| 53-240 | Utility functions (`calculateDistance`, `moderateContent`, `getBusinessStatus`, Icon component map) |
| 242-311 | Reusable UI components (`Icon`, `EmptyState`, `Toast`) |
| 312-448 | Validation functions (`validateEmail`, `validatePhone`, `sanitizeText`, etc.) |
| 449-841 | Shared components (`OnboardingScreen`, `NotificationPermissionModal`, `PullToRefresh`, `StarRating`) |
| 842-1192 | Modals (`RateBusinessModal`, `ReportBusinessModal`) |
| 1193-1449 | `AdvancedFiltersModal` |
| 1450-1716 | Navigation & cards (`Navbar`, `BusinessCard`, `FlashOfferCard`, `CategoryCard`) |
| 1729-2791 | `HomePage` (main screen with search, categories, offers, businesses) |
| 2792-3382 | Budget screens (`BudgetRequestScreen`, `DirectBudgetScreen`) |
| 3383-3851 | Offers/Jobs screens (`FlashOffersScreen`, `OffersPage`) |
| 3852-3930 | `FavoritesPage` |
| 3931-5226 | Admin screens (`AdminDashboard`, `BusinessApprovalScreen`, `BusinessAnalyticsScreen`, `ReportsScreen`) |
| 5227-5759 | `ProfilePage` |
| 5760-6716 | `BusinessDetailPage` (gallery, reviews, map, hours, closures) |
| 6717-6986 | `CouponDetailPage` |
| 6987-7687 | `JobDetailPage` |
| 7688-8112 | Category screens (`CategoryDetailPage`, `SubcategoryDetailPage`) |
| 8113-9096 | User screens (`UserReviewsScreen`, `UserJobsScreen`) |
| 9097-10039 | `MyBudgetRequestsScreen` |
| 10040-10592 | Owner budget screens (`IncomingBudgetRequestsScreen`, `BusinessBudgetReplyScreen`) |
| 10593-11009 | Owner management (`BusinessOffersScreen`, `BusinessJobsScreen`) |
| 11010-11700 | `BusinessCandidatesScreen` |
| 11701-12014 | `CreateJobOfferScreen` |
| 12015-12484 | Legal & support (`TermsScreen`, `PrivacyPolicyScreen`, `ContactSupportScreen`) |
| 12485-12681 | `NotificationsScreen` |
| 12682-13452 | Business registration flow (`BusinessDataScreen`, `BusinessVerificationScreen`, `BusinessAppealScreen`, `RegistrationSuccessScreen`) |
| 13453-15039 | `EditBusinessScreen` (4-step edit: info, category, hours, photos+docs) |
| 15040-15550 | `CreateOfferScreen` |
| 15551-16153 | Owner dashboard (`BusinessOwnerDashboard`, `BusinessStatsScreen`) |
| 16154-16806 | Auth screens (`LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen`, `OwnerWelcomeScreen`) |
| 16807-16921 | `EditProfileScreen` |
| 16922-17313 | `SettingsScreen` |
| 17314-19627 | **Main `App()` function** — all state, useEffects, navigation logic, push notifications, render switch |

### File Structure

```
cornella-local/
├── src/
│   ├── App.jsx                          # Main application (~19,627 lines)
│   ├── main.jsx                         # React root mount
│   ├── index.css                        # Tailwind directives + global styles
│   ├── lib/supabase.js                  # Supabase client init (PKCE flow)
│   ├── constants.js                     # LIMITS, TIMING, ERROR_MESSAGES, REGEX, etc.
│   ├── utils/
│   │   ├── formatters.js               # formatDate, formatCurrency, pluralize, getInitials...
│   │   └── helpers.js                  # debounce, copyToClipboard, formatSupabaseError, retryAsync...
│   ├── components/
│   │   ├── LoadingSkeletons.jsx        # 13 skeleton components for loading states
│   │   └── ConfirmModal.jsx            # DeleteConfirmModal, DeactivateConfirmModal, CancelConfirmModal
│   └── data/
│       ├── mockData.js                 # Categories, neighborhoods, fallback data (reviews loaded from Supabase)
│       ├── businessTags.js             # Tags by business category (flat)
│       └── businessTagsByCategory.js   # Tags organized by subcategory (detailed)
├── public/
│   ├── sw.js                           # Service Worker v5 (cache strategies, push listener)
│   ├── manifest.json                   # PWA manifest
│   ├── offline.html                    # Offline fallback page
│   ├── structured-data.json            # SEO structured data
│   ├── logo.png / favicon.png          # App assets
│   └── icons/                          # PWA icons
├── supabase/
│   ├── functions/
│   │   ├── send-push/index.ts          # Push notifications (RFC 8291, VAPID, native Deno crypto)
│   │   └── send-email/index.ts         # Email notifications via Resend API
│   ├── schema.sql                      # Main database schema
│   ├── seed.sql / seed-*.sql           # Seed data scripts
│   ├── setup-*.sql                     # Feature setup scripts (notifications, jobs, reviews, etc.)
│   ├── fix-*.sql                       # Migration fixes
│   └── *.md                            # Setup guides (push, email, etc.)
├── scripts/
│   ├── seed-businesses.js              # Seeding script for businesses
│   └── run-migration.js                # Migration runner
├── legal/
│   ├── politica-privacidad.md          # Privacy policy (Spanish)
│   └── terminos-condiciones.md         # Terms and conditions (Spanish)
├── *.html                              # Static HTML prototypes (legacy, not used in React app)
├── index.html                          # Vite entry point (splash screen, SW registration, SEO)
├── tailwind.config.js                  # Tailwind theme customization
├── vite.config.js                      # Vite config (port 3000, Terser)
└── package.json                        # Dependencies
```

---

## Key Patterns

### Auth Flow (Supabase v2 + PKCE)

```javascript
// onAuthStateChange with INITIAL_SESSION is the source of truth
// With detectSessionInUrl: true, Supabase exchanges the OAuth code automatically
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
    // Set user immediately from session.user (DON'T wait for profiles query)
    setUser({ id, email, full_name, avatar_url }); // from session.user.user_metadata
    setCurrentPage('home');
    // Sync with profiles table in background (no await)
  }
});
```

### Navigation (custom, no router library)

```javascript
navigate('owner-dashboard')
navigate('job-detail', { id: jobId })
navigate('business-detail', { id: businessId, returnTo: 'favorites' })
```

Navigation is handled via `currentPage` state + a `navigate()` function that accepts a page name and optional params.

### Supabase Queries

```javascript
// Standard data fetching pattern
useEffect(() => {
  const fetchData = async () => {
    const { data, error } = await supabase.from('table').select('*');
    if (error) console.error(error);
    setData(data);
  };
  fetchData();
}, [dependency]);
```

### Optimistic Updates (favorites, notifications, statuses)

```javascript
setState(prev => newState);               // 1. Update UI instantly
await supabase.from('table').update(...); // 2. Persist to DB
setState(prev => originalState);          // 3. Rollback on error
```

### Icon System (Lucide React wrapper)

```jsx
<Icon name="Star" size={20} className="text-primary" />
```

Uses an `iconMap` object mapping string names to Lucide components.

---

## Tailwind Configuration

Custom theme in `tailwind.config.js`:

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | #567ac7 | Main brand blue |
| `primary-dark` | #405b94 | Dark variant |
| `background-light` | #f6f7f8 | Light bg |
| `background-dark` | #14171e | Dark bg |
| `surface-light` | #ffffff | Card bg |
| `surface-dark` | #1a2235 | Dark card bg |

Custom fonts: `Inter` (body) and `Plus Jakarta Sans` (display).

Custom shadows: `soft`, `card`, `glow`.

---

## Business Rules

| Rule | Description |
|------|-------------|
| **Reviews** | User must have 30+ days since registration AND verified email. Max 1 review per business, max 2 reviews per week, editable only once (`edit_count`) |
| **Businesses** | Registered from user profile screen, not from login |
| **Owners** | Can only manage their business if `verification_status = 'approved'` |
| **Publishing** | Approved business must be manually published by owner (`is_published = true`) |
| **Budgets** | Owners see requests matching their subcategory. Accepting one auto-rejects the rest with notifications |
| **Hiring** | Hiring one candidate auto-rejects the rest with 1.5s delay and notifications |
| **OAuth** | Profile created from `session.user.user_metadata` (never wait for profiles query) |
| **Content moderation** | `moderateContent()` filters profanity, spam, phone numbers, emails, excessive caps |

---

## Critical Conventions (MUST Follow)

### Do

- Use `showToast()` for all user feedback (never `alert()`)
- Use `select('*')` for Supabase queries and load related data separately
- Render lightboxes and modals OUTSIDE `overflow-x-hidden` containers (use Fragment `<>`)
- Map snake_case (DB) to camelCase (React) when handling data
- Use Supabase Realtime for live notification updates
- Keep all screens and components inside `src/App.jsx`
- Use `<Icon name="..." />` wrapper for all icons

### Don't

- Never JOIN `profiles:user_id(...)` in Supabase queries — causes PGRST200 error
- Never wait for profiles query before navigating after OAuth — use `session.user.user_metadata`
- Never use `alert()` or `confirm()` — use `showToast()` or custom modals
- Never hardcode category/subcategory counts — load dynamically from Supabase
- Never use external state management libraries — use React hooks only

---

## Supabase Database

### Key Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (linked to auth.users) |
| `businesses` | Business listings with `verification_status`, `is_published`, `cover_photo`, `images`, `opening_hours`, `special_closures` |
| `offers` | Flash offers (%, 2x1, free) with `view_count`, `click_count` |
| `jobs` | Job listings with 60-day duration, `view_count` |
| `favorites` | User-business favorite relationships |
| `reviews` | Business reviews with `edit_count` |
| `budget_requests` | Budget request submissions |
| `budget_quotes` | Business responses to budget requests |
| `job_applications` | Job applications with status tracking |
| `notifications` | In-app notification system |
| `push_subscriptions` | Web Push subscription endpoints |
| `reports` | User reports/complaints |
| `verification_documents` | Business verification documents |
| `business_appeals` | Appeals for rejected businesses |

### Key RPCs

- `increment_business_views` / `increment_business_clicks`
- `increment_offer_views` / `increment_job_views`
- `can_user_review` — checks account age, email verification, review limits

### Key Triggers

- `trigger_push_favorite_new_offer` — notifies users who favorited a business when it creates an offer
- `trigger_push_new_budget_request` — notifies businesses of new budget requests
- `trigger_push_budget_response` — notifies users of budget quote responses
- `trigger_push_new_job_application` — notifies businesses of new job applications
- `trigger_push_application_status_change` — notifies candidates of status changes

---

## Edge Functions

### `send-push` (supabase/functions/send-push/index.ts)
- RFC 8291 Web Push encryption using native Deno Web Crypto (no npm:web-push)
- VAPID JWT with ES256 signing
- Deploy: `npx supabase functions deploy send-push --no-verify-jwt`

### `send-email` (supabase/functions/send-email/index.ts)
- Email notifications via Resend API
- Templates for: budget requests, budget responses, job applications, application status changes, new offers for favorites
- Deploy: `supabase functions deploy send-email`

### Edge Function Secrets (configured in Supabase)

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `RESEND_API_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## SQL Scripts Reference

### Core Setup (run in Supabase SQL Editor)

| Script | Purpose |
|--------|---------|
| `schema.sql` | Main database schema |
| `setup-notifications-complete.sql` | In-app notification triggers |
| `setup-job-applications-complete.sql` | Job application system |
| `setup-push-notifications.sql` | Push notifications table + triggers |
| `setup-reviews-complete.sql` | Reviews system |
| `setup-reviews-controls.sql` | Review limits (edit_count, weekly max) |
| `setup-budgets-complete.sql` | Budget request/quote system |
| `setup-offers-complete.sql` | Offers system |
| `setup-jobs-complete.sql` | Jobs system |

### Migrations & Fixes

| Script | Purpose |
|--------|---------|
| `fix-profiles-rls.sql` | RLS policies for profiles (run if login timeout) |
| `add-view-counters.sql` | view_count/click_count columns + RPCs |
| `add-birth-date.sql` | birth_date column in profiles |
| `cleanup-test-data.sql` | Remove test data |

---

## PWA Configuration

- **Service Worker** (`public/sw.js`): Cache-first for static assets, network-first for API calls, offline fallback page
- **Manifest** (`public/manifest.json`): Standalone display, portrait orientation, shortcuts for Offers and Budget Request
- **Splash screen**: Gradient splash in `index.html` while React loads
- **Push notifications**: Auto-requested 3 seconds after first login (if not previously asked)
- Push only works on HTTPS (production via Vercel)

---

## SEO

- Open Graph and Twitter Card meta tags in `index.html`
- Geo tags for Cornella de Llobregat (41.3558, 2.0741)
- Schema.org structured data (WebApplication)
- Canonical URL: https://cornellalocal.es/

---

## Test Users

| Email | Role | Details |
|-------|------|---------|
| `carlos@test.com` | Business owner | Owns "Cafe del Barrio" (id: 14), approved + published |
| `test@cornella.local` | Business owner | Owns 8 businesses, approved |

---

## Feature Status

### Implemented

- Full auth flow (email/password + Google OAuth)
- Business listing, search, filters (neighborhood, subcategory, tags)
- Business detail pages (hours, gallery with lightbox, reviews, Google Maps embed, special closures)
- Business registration (4-step flow) + verification + appeal system
- Owner dashboard (stats, offers management, jobs management, candidates, budgets)
- Flash offers system (create, pause, reactivate, delete)
- Job listings (60-day duration, renew, hire, applications)
- Budget request/quote system with auto-reject on acceptance
- Favorites with optimistic updates
- In-app notifications with Realtime subscriptions
- Web Push notifications (VAPID/RFC 8291)
- Review system with content moderation and rate limits
- Admin panel (approvals, analytics, reports)
- Settings screen (profile edit, contact/support, terms, privacy)
- Pull-to-refresh
- PWA with offline support

### Pending

- [ ] Email notifications for budgets and job applications (Edge Function `send-email` exists but triggers not fully wired)
- [ ] Advanced search filters (price, distance, rating)
- [ ] Chat/messaging system between users and businesses
- [ ] Advanced statistics with charts in owner dashboard
- [ ] Offer redemption counter (needs new table)
- [ ] Advanced admin screens (user management, global stats)
