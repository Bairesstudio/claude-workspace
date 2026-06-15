# Dashboard Visual Polish (Sitio 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a "profesional/neutro" visual polish pass to the existing dashboard (`dashboard/`) — centralized color tokens, real icons, hover/focus micro-interactions, loading skeletons, animated modals/toasts, and refreshed metric stat cards.

**Architecture:** Pure presentational changes to existing components/pages. No changes to `date.ts`, `metrics.ts`, `webhooks.ts`, `useTurnos`, or routing. Tailwind v4 `@theme` tokens centralize the color palette; `lucide-react` replaces emoji icons; `framer-motion` adds enter/exit animations to toasts and modals.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, `lucide-react`, `framer-motion`.

Reference spec: `docs/superpowers/specs/2026-06-15-dashboard-visual-polish-design.md`

**Baseline note:** The existing dashboard scaffold was just committed as `f6f754d`. All tasks below build on top of that commit.

---

## Task 1: Color tokens foundation (index.css, Sidebar, TurnoCard)

**Files:**
- Modify: `dashboard/src/index.css`
- Modify: `dashboard/src/components/Sidebar.tsx`
- Modify: `dashboard/src/components/TurnoCard.tsx`

- [ ] **Step 1: Add semantic color tokens to `dashboard/src/index.css`**

Replace the file's contents with:

```css
@import "tailwindcss";

@theme {
  --color-primary: #7c3aed;
  --color-primary-dark: #6d28d9;
  --color-primary-light: #f3e8ff;

  --color-success: #059669;
  --color-success-dark: #047857;
  --color-success-light: #d1fae5;

  --color-danger: #dc2626;
  --color-danger-dark: #b91c1c;
  --color-danger-light: #fee2e2;

  --color-accent: #0ea5e9;
}

body {
  margin: 0;
  font-family: system-ui, 'Segoe UI', Roboto, sans-serif;
}
```

These map 1:1 to the violet/emerald/red/sky shades already used in the dashboard (violet-600/700/50/100, emerald-600/700/100, red-600/700/100, sky-500), so this step alone causes **no visual change** — just makes the values reference-able as `bg-primary`, `text-primary-dark`, etc.

- [ ] **Step 2: Update `dashboard/src/components/Sidebar.tsx` active-link colors**

In the `NavLink` className function, change:

```tsx
                  ? 'bg-violet-100 text-violet-700'
```

to:

```tsx
                  ? 'bg-primary-light text-primary-dark'
```

- [ ] **Step 3: Update `dashboard/src/components/TurnoCard.tsx` to use tokens**

Replace the file's contents with:

```tsx
import type { TurnoConNombres } from '../types';

interface TurnoCardProps {
  turno: TurnoConNombres;
  onCancelar?: (turno: TurnoConNombres) => void;
  onReprogramar?: (turno: TurnoConNombres) => void;
  showEstado?: boolean;
}

const formatoPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function TurnoCard({ turno, onCancelar, onReprogramar, showEstado }: TurnoCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg bg-primary-light text-primary-dark">
          <span className="text-sm font-semibold">{turno.hora}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {turno.mascota_nombre}
            <span className="text-gray-400"> · {turno.mascota_raza} ({turno.mascota_tamano})</span>
          </p>
          <p className="text-sm text-gray-500">{turno.nombre_cliente}</p>
          <p className="text-sm text-gray-500">
            {turno.servicio_nombre} · {turno.empleado_nombre} ·{' '}
            {formatoPrecio.format(turno.precio_servicio)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showEstado && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              turno.estado === 'confirmado'
                ? 'bg-success-light text-success-dark'
                : 'bg-danger-light text-danger-dark'
            }`}
          >
            {turno.estado === 'confirmado' ? 'Confirmado' : 'Cancelado'}
          </span>
        )}
        {onReprogramar && (
          <button
            onClick={() => onReprogramar(turno)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Reprogramar
          </button>
        )}
        {onCancelar && (
          <button
            onClick={() => onCancelar(turno)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/`. The "Hoy" page should look **identical** to before (same violet time badge, same colors). Check "Historial" too — the "Confirmado"/"Cancelado" badges should look the same (emerald/red). Stop the dev server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard/src/index.css dashboard/src/components/Sidebar.tsx dashboard/src/components/TurnoCard.tsx && git commit -m "Add semantic color tokens and apply to Sidebar/TurnoCard"
```

---

## Task 2: Apply color tokens to modals, toasts, and Métricas charts

**Files:**
- Modify: `dashboard/src/components/ReprogramarModal.tsx`
- Modify: `dashboard/src/components/CancelarModal.tsx`
- Modify: `dashboard/src/components/ToastContext.tsx`
- Modify: `dashboard/src/pages/Metricas.tsx`

- [ ] **Step 1: Update `dashboard/src/components/ReprogramarModal.tsx`**

In the two `<input>` elements, change:

```tsx
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
```

to:

```tsx
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
```

(applies to both the "Fecha" and "Hora" inputs)

In the "Guardar cambios" button, change:

```tsx
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
```

to:

```tsx
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
```

- [ ] **Step 2: Update `dashboard/src/components/CancelarModal.tsx`**

In the "Cancelar turno" button, change:

```tsx
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
```

to:

```tsx
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger-dark disabled:opacity-50"
```

- [ ] **Step 3: Update `dashboard/src/components/ToastContext.tsx`**

Change:

```tsx
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
```

to:

```tsx
              toast.type === 'success'
                ? 'bg-success text-white'
                : 'bg-danger text-white'
```

- [ ] **Step 4: Update chart colors in `dashboard/src/pages/Metricas.tsx`**

Change:

```tsx
                <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
```

to:

```tsx
                <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
```

(in the "Por servicio" chart), and change:

```tsx
                <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
```

to:

```tsx
                <Bar dataKey="total" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
```

(in the "Por empleado" chart).

- [ ] **Step 5: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/`:
- Go to "Hoy" or "Próximos", click "Reprogramar" on a turno — date/time inputs should show a violet focus ring, "Guardar cambios" button should be violet.
- Click "Cancelar" on a turno — "Cancelar turno" button should be red.
- Confirm either action — a toast should appear (green for success).
- Go to "Métricas" — both bar charts should render with violet and sky-blue bars (not black/transparent — confirms `var(--color-*)` resolves correctly in SVG `fill`).

Stop the dev server (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard/src/components/ReprogramarModal.tsx dashboard/src/components/CancelarModal.tsx dashboard/src/components/ToastContext.tsx dashboard/src/pages/Metricas.tsx && git commit -m "Apply color tokens to modals, toasts, and Metricas charts"
```

---

## Task 3: Replace Sidebar emoji icons with lucide-react

**Files:**
- Modify: `dashboard/src/components/Sidebar.tsx`

- [ ] **Step 1: Install lucide-react**

```bash
cd "D:/Claude Workspace/dashboard" && npm install lucide-react
```

- [ ] **Step 2: Replace `dashboard/src/components/Sidebar.tsx`**

Replace the file's contents with:

```tsx
import { NavLink } from 'react-router-dom';
import { Calendar, CalendarRange, History, BarChart3 } from 'lucide-react';

const links = [
  { to: '/', label: 'Hoy', icon: Calendar },
  { to: '/proximos', label: 'Próximos', icon: CalendarRange },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/metricas', label: 'Métricas', icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-200 bg-white">
      <div className="px-6 py-6">
        <p className="text-lg font-semibold text-gray-900">Pajaro Loco</p>
        <p className="text-sm text-gray-500">Panel de turnos</p>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-light text-primary-dark'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/` — the sidebar should show outline icons (calendar, calendar-range, history, bar-chart) instead of emoji, with the active link highlighted in violet. Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard/package.json dashboard/package-lock.json dashboard/src/components/Sidebar.tsx && git commit -m "Replace Sidebar emoji icons with lucide-react"
```

---

## Task 4: Loading skeletons for Hoy, Próximos, Historial

**Files:**
- Create: `dashboard/src/components/Skeleton.tsx`
- Modify: `dashboard/src/pages/Hoy.tsx`
- Modify: `dashboard/src/pages/Proximos.tsx`
- Modify: `dashboard/src/pages/Historial.tsx`

- [ ] **Step 1: Create `dashboard/src/components/Skeleton.tsx`**

```tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />;
}

export function TurnoCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-16" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}
```

- [ ] **Step 2: Update `dashboard/src/pages/Hoy.tsx`**

Replace the file's contents with:

```tsx
import { useState } from 'react';
import { useTurnos } from '../hooks/useTurnos';
import { isHoyFecha } from '../lib/date';
import { TurnoCard } from '../components/TurnoCard';
import { TurnoCardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { CancelarModal } from '../components/CancelarModal';
import { ReprogramarModal } from '../components/ReprogramarModal';
import type { TurnoConNombres } from '../types';

export function Hoy() {
  const { turnos, loading, error, refetch } = useTurnos();
  const [cancelando, setCancelando] = useState<TurnoConNombres | null>(null);
  const [reprogramando, setReprogramando] = useState<TurnoConNombres | null>(null);

  const turnosHoy = turnos
    .filter((t) => isHoyFecha(t.fecha) && t.estado === 'confirmado')
    .sort((a, b) => a.hora.localeCompare(b.hora));

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Hoy</h1>
      <p className="mt-1 text-sm text-gray-500">Turnos confirmados para hoy.</p>

      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <>
            <TurnoCardSkeleton />
            <TurnoCardSkeleton />
            <TurnoCardSkeleton />
          </>
        ) : turnosHoy.length === 0 ? (
          <EmptyState message="No hay turnos para hoy." />
        ) : (
          turnosHoy.map((turno) => (
            <TurnoCard
              key={turno.id}
              turno={turno}
              onCancelar={setCancelando}
              onReprogramar={setReprogramando}
            />
          ))
        )}
      </div>

      {cancelando && (
        <CancelarModal
          turno={cancelando}
          onClose={() => setCancelando(null)}
          onSuccess={refetch}
        />
      )}
      {reprogramando && (
        <ReprogramarModal
          turno={reprogramando}
          onClose={() => setReprogramando(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `dashboard/src/pages/Proximos.tsx`**

Replace the file's contents with:

```tsx
import { useState } from 'react';
import { useTurnos } from '../hooks/useTurnos';
import { isFuturo, agruparPorFecha, formatFecha } from '../lib/date';
import { TurnoCard } from '../components/TurnoCard';
import { TurnoCardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { CancelarModal } from '../components/CancelarModal';
import { ReprogramarModal } from '../components/ReprogramarModal';
import type { TurnoConNombres } from '../types';

export function Proximos() {
  const { turnos, loading, error, refetch } = useTurnos();
  const [cancelando, setCancelando] = useState<TurnoConNombres | null>(null);
  const [reprogramando, setReprogramando] = useState<TurnoConNombres | null>(null);

  const proximos = turnos.filter((t) => isFuturo(t.fecha) && t.estado === 'confirmado');
  const grupos = agruparPorFecha(proximos);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Próximos</h1>
      <p className="mt-1 text-sm text-gray-500">Turnos confirmados para los próximos días.</p>

      <div className="mt-6 flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            <TurnoCardSkeleton />
            <TurnoCardSkeleton />
            <TurnoCardSkeleton />
          </div>
        ) : grupos.length === 0 ? (
          <EmptyState message="No hay turnos próximos." />
        ) : (
          grupos.map(({ fecha, turnos }) => (
            <div key={fecha}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-gray-500">
                {formatFecha(fecha)}
              </h2>
              <div className="flex flex-col gap-3">
                {turnos.map((turno) => (
                  <TurnoCard
                    key={turno.id}
                    turno={turno}
                    onCancelar={setCancelando}
                    onReprogramar={setReprogramando}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {cancelando && (
        <CancelarModal
          turno={cancelando}
          onClose={() => setCancelando(null)}
          onSuccess={refetch}
        />
      )}
      {reprogramando && (
        <ReprogramarModal
          turno={reprogramando}
          onClose={() => setReprogramando(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update `dashboard/src/pages/Historial.tsx`**

Replace the file's contents with:

```tsx
import { useTurnos } from '../hooks/useTurnos';
import { isPasado, agruparPorFecha, formatFecha } from '../lib/date';
import { TurnoCard } from '../components/TurnoCard';
import { TurnoCardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export function Historial() {
  const { turnos, loading, error } = useTurnos();

  const pasados = turnos.filter((t) => isPasado(t.fecha));
  const grupos = agruparPorFecha(pasados).reverse();

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Historial</h1>
      <p className="mt-1 text-sm text-gray-500">Turnos pasados, confirmados o cancelados.</p>

      <div className="mt-6 flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            <TurnoCardSkeleton />
            <TurnoCardSkeleton />
            <TurnoCardSkeleton />
          </div>
        ) : grupos.length === 0 ? (
          <EmptyState message="Todavía no hay turnos en el historial." />
        ) : (
          grupos.map(({ fecha, turnos }) => (
            <div key={fecha}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-gray-500">
                {formatFecha(fecha)}
              </h2>
              <div className="flex flex-col gap-3">
                {turnos.map((turno) => (
                  <TurnoCard key={turno.id} turno={turno} showEstado />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify skeletons render, then verify normal state**

Temporarily force the loading state to see the skeletons. In `dashboard/src/hooks/useTurnos.ts`, change:

```ts
  const [loading] = useState(false);
```

to:

```ts
  const [loading] = useState(true);
```

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/` and check "Hoy", "Próximos", "Historial" — each should show 3 pulsing gray skeleton cards.

Now revert `useTurnos.ts` back to `const [loading] = useState(false);`, save, and confirm the pages show real mock turnos again (and "Historial"/"Próximos" show empty states or grouped cards as before). Stop the dev server (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard/src/components/Skeleton.tsx dashboard/src/pages/Hoy.tsx dashboard/src/pages/Proximos.tsx dashboard/src/pages/Historial.tsx && git commit -m "Add loading skeletons to Hoy, Proximos, and Historial"
```

---

## Task 5: Hover/focus micro-interactions on TurnoCard

**Files:**
- Modify: `dashboard/src/components/TurnoCard.tsx`

- [ ] **Step 1: Add hover elevation and focus rings**

In `dashboard/src/components/TurnoCard.tsx`, change the root `<div>` className from:

```tsx
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
```

to:

```tsx
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
```

Change the "Reprogramar" button className from:

```tsx
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
```

to:

```tsx
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
```

Change the "Cancelar" button className from:

```tsx
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
```

to:

```tsx
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
```

- [ ] **Step 2: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/`, go to "Hoy" — hovering over a turno card should lift its shadow slightly. Tab through the page with the keyboard — "Reprogramar"/"Cancelar" buttons should show a visible focus ring. Stop the dev server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard/src/components/TurnoCard.tsx && git commit -m "Add hover elevation and focus rings to TurnoCard"
```

---

## Task 6: Animated toasts with framer-motion

**Files:**
- Modify: `dashboard/src/components/ToastContext.tsx`

- [ ] **Step 1: Install framer-motion**

```bash
cd "D:/Claude Workspace/dashboard" && npm install framer-motion
```

- [ ] **Step 2: Replace `dashboard/src/components/ToastContext.tsx`**

Replace the file's contents with:

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2 }}
              className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
                toast.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

- [ ] **Step 3: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/`, go to "Hoy", click "Cancelar" on a turno, confirm — a green toast should slide in from the right and fade out after ~3.5s. Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard/package.json dashboard/package-lock.json dashboard/src/components/ToastContext.tsx && git commit -m "Animate toasts with framer-motion"
```

---

## Task 7: Animated Cancelar/Reprogramar modals

**Files:**
- Modify: `dashboard/src/components/CancelarModal.tsx`
- Modify: `dashboard/src/components/ReprogramarModal.tsx`

- [ ] **Step 1: Replace `dashboard/src/components/CancelarModal.tsx`**

Replace the file's contents with:

```tsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TurnoConNombres } from '../types';
import { cancelarTurno } from '../lib/webhooks';
import { useToast } from './ToastContext';

interface CancelarModalProps {
  turno: TurnoConNombres;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelarModal({ turno, onClose, onSuccess }: CancelarModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await cancelarTurno(turno.id);
    setLoading(false);
    if (res.ok) {
      showToast('Turno cancelado correctamente.');
      onSuccess();
      setVisible(false);
    } else {
      setError(res.message || 'No se pudo cancelar el turno.');
    }
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.15 }}
          >
            <h2 className="text-lg font-semibold text-gray-900">Cancelar turno</h2>
            <p className="mt-2 text-sm text-gray-600">
              ¿Confirmás cancelar el turno de <strong>{turno.mascota_nombre}</strong> (
              {turno.nombre_cliente}) del {turno.fecha} a las {turno.hora}?
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setVisible(false)}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger-dark disabled:opacity-50"
              >
                {loading ? 'Cancelando…' : 'Cancelar turno'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

Note: clicking "Volver" or successfully confirming now sets `visible` to `false`, which triggers the exit animation; `AnimatePresence`'s `onExitComplete` then calls the parent's `onClose` once the animation finishes (so the parent unmounts the component only after it has visually disappeared).

- [ ] **Step 2: Replace `dashboard/src/components/ReprogramarModal.tsx`**

Replace the file's contents with:

```tsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TurnoConNombres } from '../types';
import { modificarTurno } from '../lib/webhooks';
import { useToast } from './ToastContext';

interface ReprogramarModalProps {
  turno: TurnoConNombres;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReprogramarModal({ turno, onClose, onSuccess }: ReprogramarModalProps) {
  const { showToast } = useToast();
  const [fecha, setFecha] = useState(turno.fecha);
  const [hora, setHora] = useState(turno.hora);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await modificarTurno(turno.id, fecha, hora);
    setLoading(false);
    if (res.ok) {
      showToast('Turno reprogramado correctamente.');
      onSuccess();
      setVisible(false);
    } else {
      setError(res.message || 'No se pudo reprogramar el turno.');
    }
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.15 }}
          >
            <h2 className="text-lg font-semibold text-gray-900">Reprogramar turno</h2>
            <p className="mt-2 text-sm text-gray-600">
              {turno.mascota_nombre} ({turno.nombre_cliente}) · {turno.servicio_nombre}
            </p>
            <div className="mt-4 flex gap-3">
              <label className="flex-1 text-sm text-gray-700">
                Fecha
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex-1 text-sm text-gray-700">
                Hora
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setVisible(false)}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {loading ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/`, go to "Hoy":
- Click "Reprogramar" — modal should fade/scale in. Click "Volver" — modal should fade/scale out smoothly before disappearing.
- Click "Reprogramar" again, change the time, click "Guardar cambios" — modal should animate out and a toast should appear.
- Click "Cancelar" on a turno — modal fades/scales in; "Volver" animates it out; confirming animates it out and shows a toast.

Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard/src/components/CancelarModal.tsx dashboard/src/components/ReprogramarModal.tsx && git commit -m "Animate Cancelar/Reprogramar modals with framer-motion"
```

---

## Task 8: Refresh Métricas stat cards and add loading skeletons

**Files:**
- Create: `dashboard/src/components/StatCard.tsx`
- Modify: `dashboard/src/pages/Metricas.tsx`

- [ ] **Step 1: Create `dashboard/src/components/StatCard.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
        <Icon size={22} aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `dashboard/src/pages/Metricas.tsx`**

Replace the file's contents with:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, CalendarCheck } from 'lucide-react';
import { useTurnos } from '../hooks/useTurnos';
import { calcularMetricas } from '../lib/metrics';
import { StatCard } from '../components/StatCard';
import { Skeleton } from '../components/Skeleton';

const formatoPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function Metricas() {
  const { turnos, loading, error } = useTurnos();

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const ahora = new Date();
  const turnosDelMes = turnos.filter((t) => {
    const fecha = new Date(t.fecha);
    return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
  });

  const metricas = calcularMetricas(turnosDelMes);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Métricas</h1>
      <p className="mt-1 text-sm text-gray-500">Resumen del mes en curso.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {loading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard
              label="Facturación total"
              value={formatoPrecio.format(metricas.totalFacturado)}
              icon={Wallet}
            />
            <StatCard
              label="Turnos confirmados"
              value={String(metricas.cantidadTurnos)}
              icon={CalendarCheck}
            />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          <>
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700">Por servicio</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricas.porServicio}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatoPrecio.format(value)} />
                    <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700">Por empleado</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricas.porEmpleado}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatoPrecio.format(value)} />
                    <Bar dataKey="total" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/metricas` — should show two stat cards with icons (wallet for "Facturación total", calendar-check for "Turnos confirmados") plus the two bar charts. Hovering a stat card should lift its shadow slightly. Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard/src/components/StatCard.tsx dashboard/src/pages/Metricas.tsx && git commit -m "Refresh Metricas stat cards with icons and add loading skeletons"
```

---

## Task 9: Page fade-in transition on navigation

**Files:**
- Modify: `dashboard/src/index.css`
- Modify: `dashboard/src/components/Layout.tsx`

- [ ] **Step 1: Add fade-in keyframes to `dashboard/src/index.css`**

Add the following at the end of the file (after the `body { ... }` block):

```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
```

- [ ] **Step 2: Update `dashboard/src/components/Layout.tsx`**

Replace the file's contents with:

```tsx
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div key={location.pathname} className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
```

The `key={location.pathname}` forces React to remount the wrapper `div` on every route change, which re-triggers the CSS animation each time a page is opened.

- [ ] **Step 3: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/` and click between "Hoy", "Próximos", "Historial", "Métricas" in the sidebar — each page's content should subtly fade and slide up (~4px) into place on load. Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard/src/index.css dashboard/src/components/Layout.tsx && git commit -m "Add subtle fade-in transition to page content on navigation"
```

---

## Task 10: Final build check and full walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Type-check and build**

```bash
cd "D:/Claude Workspace/dashboard" && npm run build
```

Expected: builds successfully with no TypeScript errors (confirms `lucide-react`/`framer-motion` types resolve correctly and no unused imports were left behind).

- [ ] **Step 2: Full manual walkthrough**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Walk through all 4 pages:
- **Hoy**: cards show violet time badges, hover elevation works, "Reprogramar"/"Cancelar" open animated modals, confirming shows an animated toast.
- **Próximos**: same card/modal/toast behavior, grouped by date.
- **Historial**: cards show "Confirmado"/"Cancelado" badges in green/red tokens, no action buttons.
- **Métricas**: stat cards with icons, both charts render in violet/sky-blue.
- Sidebar: lucide icons, active link highlighted in violet/`primary-light`.
- Navigating between pages produces a subtle fade-in.

Stop the dev server (Ctrl+C).

- [ ] **Step 3: Commit any final fixes**

```bash
cd "D:/Claude Workspace" && git status
```

If the walkthrough surfaced any small issues, fix them and commit with a descriptive message.

---

## Self-Review Notes

- **Spec coverage**: Section 1 (tokens → Tasks 1-2, icons → Task 3), Section 2 (hover/focus → Task 5, skeletons → Tasks 4 & 8, page fade-in → Task 9), Section 3 (toast/modal animations → Tasks 6-7, Métricas stat cards → Task 8) — all covered.
- **Type consistency**: `StatCard` props (`label`, `value`, `icon: LucideIcon`) match its usage in `Metricas.tsx`. `TurnoCardSkeleton`/`Skeleton` exported from `Skeleton.tsx` and imported consistently in Tasks 4 and 8.
- **No business logic touched**: `date.ts`, `metrics.ts`, `webhooks.ts`, `useTurnos.ts`, `supabase.ts`, routing in `App.tsx` are untouched (except the temporary, reverted `loading` flip in Task 4's verification step).
- **Out of scope** (per spec): login, real Supabase wiring, deployment — none included.
