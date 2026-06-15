# Dashboard Baires Studio — Visual Polish (Sitio 2)

**Status:** Approved
**Date:** 2026-06-15

## Goal

Light visual/UX polish pass on the existing dashboard (`dashboard/`) — no structural or business-logic changes, no login (explicitly out of scope for now). Direction: **profesional/neutro**, with an eye toward future multi-tenant re-theming (each client could eventually get their own color palette).

## Current state

- Vite + React 19 + TypeScript + Tailwind v4 (`@import "tailwindcss"`, no `@theme` customization yet).
- Pages: Hoy, Próximos, Historial, Métricas — already reasonably clean (violet accent, gray neutrals, `rounded-xl`/`shadow-sm` cards).
- Sidebar uses emoji as nav icons (📅🗓️🕓📊).
- Loading states are plain text ("Cargando turnos…", "Cargando métricas…").
- `CancelarModal`/`ReprogramarModal` and toasts (`ToastContext`) appear/disappear with no animation.
- Currently runs on mock data (`src/data/mockData.ts`) — out of scope for this pass, not touched.

## Section 1 — Color tokens + icon system (foundation)

- Add a `@theme` block to `dashboard/src/index.css` defining semantic tokens mapped to the current palette (no visual change yet, just centralizing):
  - `--color-primary` / `--color-primary-soft` (currently violet-600/700 and violet-50/100)
  - `--color-surface` (white), `--color-border` (gray-200), `--color-text` (gray-900), `--color-text-muted` (gray-500)
  - `--color-success` (emerald-600/100), `--color-danger` (red-600/100)
- Install `lucide-react`. Replace the Sidebar's emoji nav icons with Lucide equivalents (e.g. `Calendar`, `CalendarRange`, `History`, `BarChart3`), keeping the same labels/active-state behavior.
- Components updated to reference the new tokens (e.g. `bg-violet-700` → `bg-primary`) where it doesn't require a broader rewrite — goal is centralization, not a full repaint.

## Section 2 — Micro-interactions and loading skeletons

- `TurnoCard`: subtle hover elevation (shadow increase) via Tailwind transition utilities.
- Buttons (`TurnoCard` actions, modal buttons): smoother `transition` and visible `focus-visible` ring for accessibility.
- New `Skeleton` component(s) (Tailwind `animate-pulse`) replacing the plain "Cargando…" text:
  - Hoy / Próximos / Historial: skeleton turno-card shapes while `loading`.
  - Métricas: skeleton stat cards + chart placeholders while `loading`.
- Subtle CSS fade-in for page content on mount (no new dependency).

## Section 3 — Modal/toast animations + Métricas stat cards

- Install `framer-motion` in `dashboard/` (used elsewhere in the repo but not yet a dashboard dependency).
- `CancelarModal` / `ReprogramarModal`: backdrop fade-in, modal scale/slide-in on open, animated exit via `AnimatePresence` (currently abrupt show/hide).
- Toasts (`ToastContext`): slide-in from the right + fade on enter, fade/slide-out on dismiss.
- Métricas page: regenerate the two top stat cards ("Facturación total", "Turnos confirmados") via the **magic** (21st.dev) MCP for a more "premium" look — icon (lucide) + improved visual hierarchy — styled with the Section 1 tokens so they match the rest of the UI.

## Testing

Purely visual/UX — no changes to `date.ts`/`metrics.ts`/`webhooks.ts`/`useTurnos` logic. Verification is manual:
- `npm run dev`, walk through all 4 pages (Hoy, Próximos, Historial, Métricas).
- Confirm Cancelar/Reprogramar modals still open, validate, and close correctly (with new animations).
- Confirm toasts still appear/dismiss correctly.
- Confirm loading skeletons render correctly (can simulate by slowing down `useTurnos`/mock data briefly during dev).

## Out of scope

- Login/password gate (explicitly deferred).
- Wiring `useTurnos` to real Supabase (separate task).
- Deployment (Railway/Hostinger) setup.
- Multi-tenant theming implementation itself (this pass only lays the token groundwork).
