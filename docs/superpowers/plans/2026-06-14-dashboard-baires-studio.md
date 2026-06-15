# Dashboard Baires Studio (Sitio 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "Sitio 2" dashboard — a React SPA where the Pajaro Loco owner sees today's/upcoming/past turnos and monthly metrics, and can cancel/reschedule turnos.

**Architecture:** React + Vite + TypeScript SPA. Reads `turnos`/`servicios`/`empleados`/`clientes` directly from Supabase (anon key, read-only). Cancel/reschedule actions call the existing n8n webhooks (`/pajaro-loco-cancelar-turno`, `/pajaro-loco-modificar-turno`). Simple password gate via env var + sessionStorage.

**Tech Stack:** React 18, Vite 5, TypeScript, Tailwind CSS, react-router-dom 6, @supabase/supabase-js, recharts, date-fns, Vitest.

Reference spec: `docs/superpowers/specs/2026-06-14-dashboard-baires-studio-design.md`

---

## Task 1: Scaffold the Vite + React + TypeScript project

**Files:**
- Create: `dashboard/` (via `npm create vite`)

- [ ] **Step 1: Scaffold the project**

Run from `D:\Claude Workspace`:

```bash
cd "D:/Claude Workspace" && npm create vite@latest dashboard -- --template react-ts
```

Expected: creates `dashboard/` with `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/App.css`, `.gitignore`.

- [ ] **Step 2: Install dependencies**

```bash
cd "D:/Claude Workspace/dashboard" && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Verify the dev server runs**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Expected output includes a line like `Local: http://localhost:5173/`. Stop the process (Ctrl+C) once confirmed — don't leave it running.

- [ ] **Step 4: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Scaffold dashboard with Vite + React + TypeScript"
```

---

## Task 2: Add Tailwind CSS

**Files:**
- Create: `dashboard/tailwind.config.cjs`
- Create: `dashboard/postcss.config.cjs`
- Modify: `dashboard/src/index.css`
- Modify: `dashboard/src/App.tsx`
- Delete: `dashboard/src/App.css`

- [ ] **Step 1: Install Tailwind**

```bash
cd "D:/Claude Workspace/dashboard" && npm install -D tailwindcss postcss autoprefixer
```

- [ ] **Step 2: Create `dashboard/tailwind.config.cjs`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 3: Create `dashboard/postcss.config.cjs`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Replace `dashboard/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Delete `dashboard/src/App.css`**

```bash
cd "D:/Claude Workspace/dashboard" && rm src/App.css
```

- [ ] **Step 6: Replace `dashboard/src/App.tsx` with a Tailwind smoke test**

```tsx
function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <h1 className="text-3xl font-bold text-orange-600">Tailwind funcionando 🐶</h1>
    </div>
  );
}

export default App;
```

- [ ] **Step 7: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/` — expect centered orange bold text on a light gray background. Stop the dev server once confirmed.

- [ ] **Step 8: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Add Tailwind CSS to dashboard"
```

---

## Task 3: Env config and shared types

**Files:**
- Create: `dashboard/.env.example`
- Modify: `dashboard/.gitignore`
- Create: `dashboard/src/vite-env.d.ts` (overwrite existing)
- Create: `dashboard/src/types.ts`

- [ ] **Step 1: Create `dashboard/.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_N8N_BASE_URL=https://bairesstudio.app.n8n.cloud/webhook
VITE_CLIENTE_SLUG=pajaro-loco
VITE_DASHBOARD_PASSWORD=
```

- [ ] **Step 2: Add `.env` to `dashboard/.gitignore`**

Append to the existing file:

```
.env
```

- [ ] **Step 3: Replace `dashboard/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_N8N_BASE_URL: string;
  readonly VITE_CLIENTE_SLUG: string;
  readonly VITE_DASHBOARD_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 4: Create `dashboard/src/types.ts`**

```ts
export interface Cliente {
  id: string;
  slug: string;
  nombre: string;
  mail_dueno: string;
}

export interface Turno {
  id: string;
  cliente_id: string;
  empleado_id: string;
  servicio_id: string;
  fecha: string; // 'YYYY-MM-DD'
  hora: string; // 'HH:MM'
  inicio_minutos: number;
  fin_minutos: number;
  duracion_minutos: number;
  estado: 'confirmado' | 'cancelado';
  precio_servicio: number;
  email: string;
  nombre_cliente: string;
  mascota_nombre: string;
  mascota_raza: string;
  mascota_tamano: string;
  calendar_event_id: string | null;
}

export interface Servicio {
  id: string;
  cliente_id: string;
  nombre: string;
}

export interface Empleado {
  id: string;
  cliente_id: string;
  nombre: string;
}

export interface TurnoConNombres extends Turno {
  servicio_nombre: string;
  empleado_nombre: string;
}

export interface WebhookResponse {
  ok: boolean;
  message: string;
}
```

- [ ] **Step 5: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Add env config and shared types for dashboard"
```

---

## Task 4: Supabase client and cliente_id resolution

**Files:**
- Create: `dashboard/src/lib/supabase.ts`

- [ ] **Step 1: Install the Supabase client**

```bash
cd "D:/Claude Workspace/dashboard" && npm install @supabase/supabase-js
```

- [ ] **Step 2: Create `dashboard/src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

let clienteIdPromise: Promise<string> | null = null;

export function getClienteId(): Promise<string> {
  if (!clienteIdPromise) {
    clienteIdPromise = supabase
      .from('clientes')
      .select('id')
      .eq('slug', import.meta.env.VITE_CLIENTE_SLUG)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          throw new Error('No se pudo identificar el negocio. Verificá la configuración.');
        }
        return data.id as string;
      });
  }
  return clienteIdPromise;
}
```

- [ ] **Step 3: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Add Supabase client and cliente_id resolution"
```

---

## Task 5: Date utilities (with tests)

**Files:**
- Create: `dashboard/src/lib/date.ts`
- Test: `dashboard/src/lib/date.test.ts`

- [ ] **Step 1: Install date-fns and Vitest**

```bash
cd "D:/Claude Workspace/dashboard" && npm install date-fns && npm install -D vitest
```

- [ ] **Step 2: Add a `test` field to `dashboard/vite.config.ts`**

Replace the file's contents with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Add a `test` script to `dashboard/package.json`**

In the `"scripts"` section, add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Write the failing test — create `dashboard/src/lib/date.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isHoyFecha, isFuturo, isPasado, agruparPorFecha, formatFecha } from './date';

describe('date utils', () => {
  const hoy = new Date('2026-06-14T12:00:00');

  it('isHoyFecha identifica la fecha de hoy', () => {
    expect(isHoyFecha('2026-06-14', hoy)).toBe(true);
    expect(isHoyFecha('2026-06-15', hoy)).toBe(false);
  });

  it('isFuturo identifica fechas posteriores a hoy', () => {
    expect(isFuturo('2026-06-15', hoy)).toBe(true);
    expect(isFuturo('2026-06-14', hoy)).toBe(false);
    expect(isFuturo('2026-06-13', hoy)).toBe(false);
  });

  it('isPasado identifica fechas anteriores a hoy', () => {
    expect(isPasado('2026-06-13', hoy)).toBe(true);
    expect(isPasado('2026-06-14', hoy)).toBe(false);
    expect(isPasado('2026-06-15', hoy)).toBe(false);
  });

  it('agruparPorFecha agrupa manteniendo el orden de entrada', () => {
    const turnos = [
      { fecha: '2026-06-14', id: 'a' },
      { fecha: '2026-06-15', id: 'b' },
      { fecha: '2026-06-14', id: 'c' },
    ];

    const grupos = agruparPorFecha(turnos);

    expect(Array.from(grupos.keys())).toEqual(['2026-06-14', '2026-06-15']);
    expect(grupos.get('2026-06-14')).toHaveLength(2);
  });

  it('formatFecha devuelve la fecha en español', () => {
    expect(formatFecha('2026-06-14')).toContain('junio');
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

```bash
cd "D:/Claude Workspace/dashboard" && npm run test
```

Expected: FAIL — `./date` module not found.

- [ ] **Step 6: Implement `dashboard/src/lib/date.ts`**

```ts
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatFecha(fecha: string): string {
  return format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es });
}

export function isHoyFecha(fecha: string, hoy: Date = new Date()): boolean {
  return startOfDay(parseISO(fecha)).getTime() === startOfDay(hoy).getTime();
}

export function isFuturo(fecha: string, hoy: Date = new Date()): boolean {
  return isAfter(startOfDay(parseISO(fecha)), startOfDay(hoy));
}

export function isPasado(fecha: string, hoy: Date = new Date()): boolean {
  return isBefore(startOfDay(parseISO(fecha)), startOfDay(hoy));
}

export function agruparPorFecha<T extends { fecha: string }>(turnos: T[]): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const turno of turnos) {
    const lista = grupos.get(turno.fecha) ?? [];
    lista.push(turno);
    grupos.set(turno.fecha, lista);
  }
  return grupos;
}
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
cd "D:/Claude Workspace/dashboard" && npm run test
```

Expected: PASS — 5 tests passing.

- [ ] **Step 8: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Add date utilities with tests"
```

---

## Task 6: Metrics utilities (with tests)

**Files:**
- Create: `dashboard/src/lib/metrics.ts`
- Test: `dashboard/src/lib/metrics.test.ts`

- [ ] **Step 1: Write the failing test — create `dashboard/src/lib/metrics.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { calcularMetricas } from './metrics';
import type { TurnoConNombres } from '../types';

function turno(overrides: Partial<TurnoConNombres>): TurnoConNombres {
  return {
    id: '1',
    cliente_id: 'c1',
    empleado_id: 'e1',
    servicio_id: 's1',
    fecha: '2026-06-01',
    hora: '10:00',
    inicio_minutos: 600,
    fin_minutos: 660,
    duracion_minutos: 60,
    estado: 'confirmado',
    precio_servicio: 1000,
    email: 'a@a.com',
    nombre_cliente: 'Juan',
    mascota_nombre: 'Firulais',
    mascota_raza: 'Labrador',
    mascota_tamano: 'grande',
    calendar_event_id: null,
    servicio_nombre: 'Baño',
    empleado_nombre: 'Ana',
    ...overrides,
  };
}

describe('calcularMetricas', () => {
  it('ignora turnos cancelados', () => {
    const turnos = [turno({ id: '1' }), turno({ id: '2', estado: 'cancelado' })];

    const metricas = calcularMetricas(turnos);

    expect(metricas.cantidadTurnos).toBe(1);
    expect(metricas.totalFacturado).toBe(1000);
  });

  it('agrupa por servicio y empleado con cantidad y total, ordenado por total desc', () => {
    const turnos = [
      turno({ id: '1', servicio_nombre: 'Baño', empleado_nombre: 'Ana', precio_servicio: 1000 }),
      turno({ id: '2', servicio_nombre: 'Baño', empleado_nombre: 'Beto', precio_servicio: 1000 }),
      turno({ id: '3', servicio_nombre: 'Corte', empleado_nombre: 'Ana', precio_servicio: 1500 }),
    ];

    const metricas = calcularMetricas(turnos);

    expect(metricas.totalFacturado).toBe(3500);
    expect(metricas.porServicio).toEqual([
      { nombre: 'Baño', cantidad: 2, total: 2000 },
      { nombre: 'Corte', cantidad: 1, total: 1500 },
    ]);
    expect(metricas.porEmpleado).toEqual([
      { nombre: 'Ana', cantidad: 2, total: 2500 },
      { nombre: 'Beto', cantidad: 1, total: 1000 },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd "D:/Claude Workspace/dashboard" && npm run test
```

Expected: FAIL — `./metrics` module not found.

- [ ] **Step 3: Implement `dashboard/src/lib/metrics.ts`**

```ts
import type { TurnoConNombres } from '../types';

export interface MetricaItem {
  nombre: string;
  cantidad: number;
  total: number;
}

export interface Metricas {
  totalFacturado: number;
  cantidadTurnos: number;
  porServicio: MetricaItem[];
  porEmpleado: MetricaItem[];
}

function agruparPor(
  turnos: TurnoConNombres[],
  campo: 'servicio_nombre' | 'empleado_nombre',
): MetricaItem[] {
  const grupos = new Map<string, MetricaItem>();
  for (const turno of turnos) {
    const nombre = turno[campo];
    const actual = grupos.get(nombre) ?? { nombre, cantidad: 0, total: 0 };
    actual.cantidad += 1;
    actual.total += turno.precio_servicio;
    grupos.set(nombre, actual);
  }
  return Array.from(grupos.values()).sort((a, b) => b.total - a.total);
}

export function calcularMetricas(turnos: TurnoConNombres[]): Metricas {
  const confirmados = turnos.filter((t) => t.estado === 'confirmado');
  return {
    totalFacturado: confirmados.reduce((sum, t) => sum + t.precio_servicio, 0),
    cantidadTurnos: confirmados.length,
    porServicio: agruparPor(confirmados, 'servicio_nombre'),
    porEmpleado: agruparPor(confirmados, 'empleado_nombre'),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd "D:/Claude Workspace/dashboard" && npm run test
```

Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Add metrics calculation with tests"
```

---

## Task 7: Webhook helpers (with tests)

**Files:**
- Create: `dashboard/src/lib/webhooks.ts`
- Test: `dashboard/src/lib/webhooks.test.ts`

- [ ] **Step 1: Write the failing test — create `dashboard/src/lib/webhooks.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cancelarTurno, modificarTurno } from './webhooks';

describe('webhooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('cancelarTurno devuelve ok:true cuando el webhook responde 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ ok: true, message: 'Turno cancelado con éxito.' }),
      }),
    );

    const result = await cancelarTurno('turno-123');

    expect(result).toEqual({ ok: true, message: 'Turno cancelado con éxito.' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/pajaro-loco-cancelar-turno'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ turno_id: 'turno-123' }),
      }),
    );
  });

  it('modificarTurno devuelve ok:false con el mensaje del backend cuando el horario está ocupado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ ok: false, message: 'Ese horario ya está ocupado, elegí otro.' }),
      }),
    );

    const result = await modificarTurno('turno-123', '2026-07-01', '10:00');

    expect(result).toEqual({ ok: false, message: 'Ese horario ya está ocupado, elegí otro.' });
  });

  it('devuelve un mensaje genérico si falla la conexión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const result = await cancelarTurno('turno-123');

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/conectar/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd "D:/Claude Workspace/dashboard" && npm run test
```

Expected: FAIL — `./webhooks` module not found.

- [ ] **Step 3: Implement `dashboard/src/lib/webhooks.ts`**

```ts
import type { WebhookResponse } from '../types';

const BASE_URL = import.meta.env.VITE_N8N_BASE_URL ?? '';

async function postWebhook(path: string, body: unknown): Promise<WebhookResponse> {
  try {
    const res = await fetch(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data as WebhookResponse;
  } catch {
    return { ok: false, message: 'No se pudo conectar con el servidor. Intentá de nuevo.' };
  }
}

export function cancelarTurno(turnoId: string): Promise<WebhookResponse> {
  return postWebhook('pajaro-loco-cancelar-turno', { turno_id: turnoId });
}

export function modificarTurno(turnoId: string, fecha: string, hora: string): Promise<WebhookResponse> {
  return postWebhook('pajaro-loco-modificar-turno', { turno_id: turnoId, fecha, hora });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd "D:/Claude Workspace/dashboard" && npm run test
```

Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Add n8n webhook helpers with tests"
```

---

## Task 8: Auth hook and Login page

**Files:**
- Create: `dashboard/src/hooks/useAuth.ts`
- Create: `dashboard/src/components/Login.tsx`

- [ ] **Step 1: Create `dashboard/src/hooks/useAuth.ts`**

```ts
import { useState } from 'react';

const SESSION_KEY = 'baires_dashboard_auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true',
  );

  function login(password: string): boolean {
    if (password === import.meta.env.VITE_DASHBOARD_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  }

  return { isAuthenticated, login, logout };
}
```

- [ ] **Step 2: Create `dashboard/src/components/Login.tsx`**

```tsx
import { useState, type FormEvent } from 'react';

interface LoginProps {
  onLogin: (password: string) => boolean;
}

export function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = onLogin(password);
    if (!ok) {
      setError(true);
      setPassword('');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-slate-800">Pajaro Loco</h1>
        <p className="mb-6 text-sm text-slate-500">Panel del negocio</p>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          autoFocus
        />
        {error && <p className="mb-2 text-sm text-red-600">Contraseña incorrecta.</p>}
        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Wire into `dashboard/src/App.tsx` temporarily to verify**

Replace the file's contents with:

```tsx
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Login';

function App() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <h1 className="text-3xl font-bold text-green-600">Logueado ✅</h1>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Verify in browser**

Set `VITE_DASHBOARD_PASSWORD=test1234` in `dashboard/.env` (create it by copying `.env.example` if it doesn't exist yet).

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Open `http://localhost:5173/` — expect the login form. Enter a wrong password → see "Contraseña incorrecta." Enter `test1234` → see "Logueado ✅". Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Add password-gated login"
```

---

## Task 9: Routing, layout, sidebar, and toasts

**Files:**
- Create: `dashboard/src/components/Sidebar.tsx`
- Create: `dashboard/src/components/Layout.tsx`
- Create: `dashboard/src/components/ToastContext.tsx`
- Create: `dashboard/src/pages/Hoy.tsx` (placeholder)
- Create: `dashboard/src/pages/Proximos.tsx` (placeholder)
- Create: `dashboard/src/pages/Historial.tsx` (placeholder)
- Create: `dashboard/src/pages/Metricas.tsx` (placeholder)
- Modify: `dashboard/src/App.tsx`

- [ ] **Step 1: Install react-router-dom**

```bash
cd "D:/Claude Workspace/dashboard" && npm install react-router-dom
```

- [ ] **Step 2: Create placeholder pages**

`dashboard/src/pages/Hoy.tsx`:

```tsx
export function Hoy() {
  return <h1 className="text-2xl font-bold text-slate-800">Turnos de hoy</h1>;
}
```

`dashboard/src/pages/Proximos.tsx`:

```tsx
export function Proximos() {
  return <h1 className="text-2xl font-bold text-slate-800">Próximos turnos</h1>;
}
```

`dashboard/src/pages/Historial.tsx`:

```tsx
export function Historial() {
  return <h1 className="text-2xl font-bold text-slate-800">Historial</h1>;
}
```

`dashboard/src/pages/Metricas.tsx`:

```tsx
export function Metricas() {
  return <h1 className="text-2xl font-bold text-slate-800">Métricas del mes</h1>;
}
```

- [ ] **Step 3: Create `dashboard/src/components/ToastContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

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
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
```

- [ ] **Step 4: Create `dashboard/src/components/Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/hoy', label: 'Hoy', icon: '📅' },
  { to: '/proximos', label: 'Próximos', icon: '🗓️' },
  { to: '/historial', label: 'Historial', icon: '🕓' },
  { to: '/metricas', label: 'Métricas', icon: '📊' },
];

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  return (
    <aside className="flex h-screen w-56 flex-col justify-between border-r border-slate-200 bg-white p-4">
      <div>
        <h1 className="mb-6 px-2 text-xl font-bold text-slate-800">🐶 Pajaro Loco</h1>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-orange-100 text-orange-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {link.icon} {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <button
        onClick={onLogout}
        className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100"
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
```

- [ ] **Step 5: Create `dashboard/src/components/Layout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  onLogout: () => void;
}

export function Layout({ onLogout }: LayoutProps) {
  return (
    <div className="flex">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Replace `dashboard/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ToastContext';
import { Hoy } from './pages/Hoy';
import { Proximos } from './pages/Proximos';
import { Historial } from './pages/Historial';
import { Metricas } from './pages/Metricas';

export default function App() {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout onLogout={logout} />}>
            <Route index element={<Navigate to="/hoy" replace />} />
            <Route path="hoy" element={<Hoy />} />
            <Route path="proximos" element={<Proximos />} />
            <Route path="historial" element={<Historial />} />
            <Route path="metricas" element={<Metricas />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
```

- [ ] **Step 7: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Log in, then confirm: sidebar with 4 links, default redirect to "Hoy", clicking each link shows the corresponding placeholder heading and highlights the active link, "Cerrar sesión" returns to the login screen. Stop the dev server once confirmed.

- [ ] **Step 8: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Add routing, layout, sidebar and toast system"
```

---

## Task 10: useTurnos data hook

**Files:**
- Create: `dashboard/src/hooks/useTurnos.ts`

- [ ] **Step 1: Create `dashboard/src/hooks/useTurnos.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase, getClienteId } from '../lib/supabase';
import type { TurnoConNombres } from '../types';

interface UseTurnosResult {
  turnos: TurnoConNombres[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTurnos(): UseTurnosResult {
  const [turnos, setTurnos] = useState<TurnoConNombres[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const clienteId = await getClienteId();

        const [turnosRes, serviciosRes, empleadosRes] = await Promise.all([
          supabase.from('turnos').select('*').eq('cliente_id', clienteId),
          supabase.from('servicios').select('*').eq('cliente_id', clienteId),
          supabase.from('empleados').select('*').eq('cliente_id', clienteId),
        ]);

        if (turnosRes.error) throw turnosRes.error;
        if (serviciosRes.error) throw serviciosRes.error;
        if (empleadosRes.error) throw empleadosRes.error;

        const servicioPorId = new Map(serviciosRes.data.map((s) => [s.id, s.nombre]));
        const empleadoPorId = new Map(empleadosRes.data.map((e) => [e.id, e.nombre]));

        const turnosConNombres: TurnoConNombres[] = turnosRes.data.map((t) => ({
          ...t,
          servicio_nombre: servicioPorId.get(t.servicio_id) ?? 'Sin especificar',
          empleado_nombre: empleadoPorId.get(t.empleado_id) ?? 'Sin especificar',
        }));

        if (!cancelled) {
          setTurnos(turnosConNombres);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar los turnos.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [version]);

  return { turnos, loading, error, refetch };
}
```

- [ ] **Step 2: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Add useTurnos data hook"
```

---

## Task 11: Shared display components

**Files:**
- Create: `dashboard/src/components/TurnoCard.tsx`
- Create: `dashboard/src/components/EmptyState.tsx`
- Create: `dashboard/src/components/ErrorState.tsx`

- [ ] **Step 1: Create `dashboard/src/components/EmptyState.tsx`**

```tsx
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">
      <span className="mb-2 text-4xl">🐾</span>
      <p>{message}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `dashboard/src/components/ErrorState.tsx`**

```tsx
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-16 text-center text-red-600">
      <p className="mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        Reintentar
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `dashboard/src/components/TurnoCard.tsx`**

```tsx
import type { TurnoConNombres } from '../types';

interface TurnoCardProps {
  turno: TurnoConNombres;
  showActions?: boolean;
  onCancelar?: (turno: TurnoConNombres) => void;
  onReprogramar?: (turno: TurnoConNombres) => void;
}

const badgeEstado: Record<TurnoConNombres['estado'], string> = {
  confirmado: 'bg-green-100 text-green-700',
  cancelado: 'bg-slate-200 text-slate-500',
};

export function TurnoCard({ turno, showActions = false, onCancelar, onReprogramar }: TurnoCardProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-orange-100 text-orange-700">
          <span className="text-sm font-bold">{turno.hora}</span>
        </div>
        <div>
          <p className="font-semibold text-slate-800">
            {turno.mascota_nombre}{' '}
            <span className="text-sm font-normal text-slate-400">
              ({turno.mascota_raza}, talle {turno.mascota_tamano})
            </span>
          </p>
          <p className="text-sm text-slate-500">
            {turno.nombre_cliente} · {turno.servicio_nombre} · {turno.empleado_nombre}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeEstado[turno.estado]}`}>
          {turno.estado === 'confirmado' ? 'Confirmado' : 'Cancelado'}
        </span>
        {showActions && (
          <>
            <button
              onClick={() => onReprogramar?.(turno)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reprogramar
            </button>
            <button
              onClick={() => onCancelar?.(turno)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Add TurnoCard, EmptyState and ErrorState components"
```

---

## Task 12: "Hoy" page

**Files:**
- Modify: `dashboard/src/pages/Hoy.tsx`

- [ ] **Step 1: Replace `dashboard/src/pages/Hoy.tsx`**

```tsx
import { useTurnos } from '../hooks/useTurnos';
import { TurnoCard } from '../components/TurnoCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { isHoyFecha } from '../lib/date';

export function Hoy() {
  const { turnos, loading, error, refetch } = useTurnos();

  if (loading) return <p className="text-slate-400">Cargando turnos...</p>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const turnosHoy = turnos
    .filter((t) => t.estado === 'confirmado' && isHoyFecha(t.fecha))
    .sort((a, b) => a.inicio_minutos - b.inicio_minutos);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Turnos de hoy</h1>
      {turnosHoy.length === 0 ? (
        <EmptyState message="No hay turnos para hoy." />
      ) : (
        <div className="flex flex-col gap-3">
          {turnosHoy.map((turno) => (
            <TurnoCard key={turno.id} turno={turno} showActions />
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: `showActions` is enabled here but the Cancelar/Reprogramar buttons won't do anything yet — that's wired up in Task 14.

- [ ] **Step 2: Verify in browser**

Fill in `dashboard/.env` with real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from the Supabase project dashboard → Project Settings → API).

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Log in, go to "Hoy". If there's a turno for today in Supabase, it should appear as a card. If not, the empty state should show. Stop the dev server once confirmed.

- [ ] **Step 3: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Implement Hoy page"
```

---

## Task 13: "Próximos" and "Historial" pages

**Files:**
- Modify: `dashboard/src/pages/Proximos.tsx`
- Modify: `dashboard/src/pages/Historial.tsx`

- [ ] **Step 1: Replace `dashboard/src/pages/Proximos.tsx`**

```tsx
import { useTurnos } from '../hooks/useTurnos';
import { TurnoCard } from '../components/TurnoCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { isFuturo, agruparPorFecha, formatFecha } from '../lib/date';

export function Proximos() {
  const { turnos, loading, error, refetch } = useTurnos();

  if (loading) return <p className="text-slate-400">Cargando turnos...</p>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const futuros = turnos
    .filter((t) => t.estado === 'confirmado' && isFuturo(t.fecha))
    .sort((a, b) =>
      a.fecha === b.fecha ? a.inicio_minutos - b.inicio_minutos : a.fecha.localeCompare(b.fecha),
    );

  const grupos = agruparPorFecha(futuros);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Próximos turnos</h1>
      {grupos.size === 0 ? (
        <EmptyState message="No hay turnos próximos." />
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(grupos.entries()).map(([fecha, items]) => (
            <div key={fecha}>
              <h2 className="mb-3 text-sm font-semibold uppercase text-slate-400">{formatFecha(fecha)}</h2>
              <div className="flex flex-col gap-3">
                {items.map((turno) => (
                  <TurnoCard key={turno.id} turno={turno} showActions />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `dashboard/src/pages/Historial.tsx`**

```tsx
import { useTurnos } from '../hooks/useTurnos';
import { TurnoCard } from '../components/TurnoCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { isPasado, agruparPorFecha, formatFecha } from '../lib/date';

export function Historial() {
  const { turnos, loading, error, refetch } = useTurnos();

  if (loading) return <p className="text-slate-400">Cargando turnos...</p>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const pasados = turnos
    .filter((t) => isPasado(t.fecha))
    .sort((a, b) =>
      a.fecha === b.fecha ? a.inicio_minutos - b.inicio_minutos : b.fecha.localeCompare(a.fecha),
    );

  const grupos = agruparPorFecha(pasados);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Historial</h1>
      {grupos.size === 0 ? (
        <EmptyState message="Todavía no hay turnos pasados." />
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(grupos.entries()).map(([fecha, items]) => (
            <div key={fecha}>
              <h2 className="mb-3 text-sm font-semibold uppercase text-slate-400">{formatFecha(fecha)}</h2>
              <div className="flex flex-col gap-3">
                {items.map((turno) => (
                  <TurnoCard key={turno.id} turno={turno} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Check "Próximos" shows future confirmed turnos grouped by date, and "Historial" shows past turnos (any estado) grouped by date with no action buttons. Stop the dev server once confirmed.

- [ ] **Step 4: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Implement Proximos and Historial pages"
```

---

## Task 14: Cancelar/Reprogramar modals and wiring

**Files:**
- Create: `dashboard/src/components/CancelarModal.tsx`
- Create: `dashboard/src/components/ReprogramarModal.tsx`
- Modify: `dashboard/src/pages/Hoy.tsx`
- Modify: `dashboard/src/pages/Proximos.tsx`

- [ ] **Step 1: Create `dashboard/src/components/CancelarModal.tsx`**

```tsx
import { useState } from 'react';
import type { TurnoConNombres } from '../types';
import { cancelarTurno } from '../lib/webhooks';

interface CancelarModalProps {
  turno: TurnoConNombres;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelarModal({ turno, onClose, onSuccess }: CancelarModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await cancelarTurno(turno.id);
    setLoading(false);
    if (res.ok) {
      onSuccess();
    } else {
      setError(res.message);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-bold text-slate-800">Cancelar turno</h2>
        <p className="mb-4 text-sm text-slate-600">
          ¿Seguro que querés cancelar el turno de <b>{turno.mascota_nombre}</b> el <b>{turno.fecha}</b> a las{' '}
          <b>{turno.hora}</b>? Se le va a avisar al cliente por mail.
        </p>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Volver
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Cancelando...' : 'Sí, cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `dashboard/src/components/ReprogramarModal.tsx`**

```tsx
import { useState } from 'react';
import type { TurnoConNombres } from '../types';
import { modificarTurno } from '../lib/webhooks';

interface ReprogramarModalProps {
  turno: TurnoConNombres;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReprogramarModal({ turno, onClose, onSuccess }: ReprogramarModalProps) {
  const [fecha, setFecha] = useState(turno.fecha);
  const [hora, setHora] = useState(turno.hora);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await modificarTurno(turno.id, fecha, hora);
    setLoading(false);
    if (res.ok) {
      onSuccess();
    } else {
      setError(res.message);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-bold text-slate-800">Reprogramar turno</h2>
        <p className="mb-4 text-sm text-slate-600">
          Turno de <b>{turno.mascota_nombre}</b> ({turno.nombre_cliente})
        </p>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="fecha">
          Nueva fecha
        </label>
        <input
          id="fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="hora">
          Nueva hora
        </label>
        <input
          id="hora"
          type="time"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Volver
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Reprogramar'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire modals into `dashboard/src/pages/Hoy.tsx`**

Replace the file's contents with:

```tsx
import { useState } from 'react';
import { useTurnos } from '../hooks/useTurnos';
import { useToast } from '../components/ToastContext';
import { TurnoCard } from '../components/TurnoCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { CancelarModal } from '../components/CancelarModal';
import { ReprogramarModal } from '../components/ReprogramarModal';
import { isHoyFecha } from '../lib/date';
import type { TurnoConNombres } from '../types';

export function Hoy() {
  const { turnos, loading, error, refetch } = useTurnos();
  const { showToast } = useToast();
  const [cancelando, setCancelando] = useState<TurnoConNombres | null>(null);
  const [reprogramando, setReprogramando] = useState<TurnoConNombres | null>(null);

  if (loading) return <p className="text-slate-400">Cargando turnos...</p>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const turnosHoy = turnos
    .filter((t) => t.estado === 'confirmado' && isHoyFecha(t.fecha))
    .sort((a, b) => a.inicio_minutos - b.inicio_minutos);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Turnos de hoy</h1>
      {turnosHoy.length === 0 ? (
        <EmptyState message="No hay turnos para hoy." />
      ) : (
        <div className="flex flex-col gap-3">
          {turnosHoy.map((turno) => (
            <TurnoCard
              key={turno.id}
              turno={turno}
              showActions
              onCancelar={setCancelando}
              onReprogramar={setReprogramando}
            />
          ))}
        </div>
      )}
      {cancelando && (
        <CancelarModal
          turno={cancelando}
          onClose={() => setCancelando(null)}
          onSuccess={() => {
            setCancelando(null);
            refetch();
            showToast('Turno cancelado correctamente.');
          }}
        />
      )}
      {reprogramando && (
        <ReprogramarModal
          turno={reprogramando}
          onClose={() => setReprogramando(null)}
          onSuccess={() => {
            setReprogramando(null);
            refetch();
            showToast('Turno reprogramado correctamente.');
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire modals into `dashboard/src/pages/Proximos.tsx`**

Replace the file's contents with:

```tsx
import { useState } from 'react';
import { useTurnos } from '../hooks/useTurnos';
import { useToast } from '../components/ToastContext';
import { TurnoCard } from '../components/TurnoCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { CancelarModal } from '../components/CancelarModal';
import { ReprogramarModal } from '../components/ReprogramarModal';
import { isFuturo, agruparPorFecha, formatFecha } from '../lib/date';
import type { TurnoConNombres } from '../types';

export function Proximos() {
  const { turnos, loading, error, refetch } = useTurnos();
  const { showToast } = useToast();
  const [cancelando, setCancelando] = useState<TurnoConNombres | null>(null);
  const [reprogramando, setReprogramando] = useState<TurnoConNombres | null>(null);

  if (loading) return <p className="text-slate-400">Cargando turnos...</p>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const futuros = turnos
    .filter((t) => t.estado === 'confirmado' && isFuturo(t.fecha))
    .sort((a, b) =>
      a.fecha === b.fecha ? a.inicio_minutos - b.inicio_minutos : a.fecha.localeCompare(b.fecha),
    );

  const grupos = agruparPorFecha(futuros);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Próximos turnos</h1>
      {grupos.size === 0 ? (
        <EmptyState message="No hay turnos próximos." />
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(grupos.entries()).map(([fecha, items]) => (
            <div key={fecha}>
              <h2 className="mb-3 text-sm font-semibold uppercase text-slate-400">{formatFecha(fecha)}</h2>
              <div className="flex flex-col gap-3">
                {items.map((turno) => (
                  <TurnoCard
                    key={turno.id}
                    turno={turno}
                    showActions
                    onCancelar={setCancelando}
                    onReprogramar={setReprogramando}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {cancelando && (
        <CancelarModal
          turno={cancelando}
          onClose={() => setCancelando(null)}
          onSuccess={() => {
            setCancelando(null);
            refetch();
            showToast('Turno cancelado correctamente.');
          }}
        />
      )}
      {reprogramando && (
        <ReprogramarModal
          turno={reprogramando}
          onClose={() => setReprogramando(null)}
          onSuccess={() => {
            setReprogramando(null);
            refetch();
            showToast('Turno reprogramado correctamente.');
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser with a real test turno**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

In Supabase, create a test turno for today with a real (test) email. In the dashboard:
- Click "Reprogramar" → change the time to a free slot → confirm → expect success toast, turno updates, and confirmation email arrives.
- Click "Reprogramar" → change to a slot that overlaps an existing confirmed turno for the same empleado/day → expect the modal to show "Ese horario ya está ocupado, elegí otro." without closing.
- Click "Cancelar" → confirm → expect success toast, turno disappears from "Hoy", cancellation email arrives, and the Calendar event is removed.

Stop the dev server once confirmed.

- [ ] **Step 6: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Wire cancel/reschedule modals into Hoy and Proximos"
```

---

## Task 15: "Métricas" page with charts

**Files:**
- Modify: `dashboard/src/pages/Metricas.tsx`

- [ ] **Step 1: Install recharts**

```bash
cd "D:/Claude Workspace/dashboard" && npm install recharts
```

- [ ] **Step 2: Replace `dashboard/src/pages/Metricas.tsx`**

```tsx
import { useTurnos } from '../hooks/useTurnos';
import { ErrorState } from '../components/ErrorState';
import { calcularMetricas } from '../lib/metrics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function Metricas() {
  const { turnos, loading, error, refetch } = useTurnos();

  if (loading) return <p className="text-slate-400">Cargando métricas...</p>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();

  const turnosDelMes = turnos.filter((t) => {
    const fecha = new Date(`${t.fecha}T00:00:00`);
    return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
  });

  const metricas = calcularMetricas(turnosDelMes);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Métricas del mes</h1>
      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-400">Turnos confirmados</p>
          <p className="text-3xl font-bold text-slate-800">{metricas.cantidadTurnos}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-400">Facturación estimada</p>
          <p className="text-3xl font-bold text-slate-800">
            ${metricas.totalFacturado.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Por servicio</h2>
          {metricas.porServicio.length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos este mes.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metricas.porServicio}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Por empleado</h2>
          {metricas.porEmpleado.length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos este mes.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metricas.porEmpleado}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Go to "Métricas" — expect totals and two bar charts (or "Sin datos este mes." if there are no confirmed turnos this month). Stop the dev server once confirmed.

- [ ] **Step 4: Commit**

```bash
cd "D:/Claude Workspace" && git add dashboard && git commit -m "Implement Metricas page with charts"
```

---

## Task 16: Final configuration and end-to-end pass

**Files:**
- Modify: `dashboard/.env` (not committed)

- [ ] **Step 1: Confirm `dashboard/.env` has real values**

```
VITE_SUPABASE_URL=<from Supabase Project Settings → API>
VITE_SUPABASE_ANON_KEY=<from Supabase Project Settings → API>
VITE_N8N_BASE_URL=https://bairesstudio.app.n8n.cloud/webhook
VITE_CLIENTE_SLUG=pajaro-loco
VITE_DASHBOARD_PASSWORD=<choose a password for the owner>
```

- [ ] **Step 2: Run the full test suite**

```bash
cd "D:/Claude Workspace/dashboard" && npm run test
```

Expected: PASS — all date/metrics/webhook tests passing.

- [ ] **Step 3: Full manual walkthrough**

```bash
cd "D:/Claude Workspace/dashboard" && npm run dev
```

Walk through every item in the spec's Testing section:
- Login with correct/incorrect password.
- "Hoy", "Próximos", "Historial", "Métricas" all load real data from Supabase.
- Cancel a test turno → disappears from Hoy/Próximos, cancellation email arrives, Calendar event removed.
- Reprogram a test turno to a free slot → moves correctly, confirmation email arrives.
- Reprogram a test turno to an occupied slot → shows the "ocupado" error without breaking the UI.
- Empty states render correctly when there's nothing to show.

Stop the dev server once confirmed.

- [ ] **Step 4: Commit any final fixes**

```bash
cd "D:/Claude Workspace" && git add dashboard && git status
```

If there are changes from fixes made during the walkthrough, commit them with a descriptive message.

---

## Self-Review Notes

- **Spec coverage**: Architecture (Task 4, 7, 10), Stack (Tasks 1-2, 5-7, 15), Modelo de datos (Task 3, 10), Vistas (Tasks 12-13, 15), Flujos de acción (Task 14), Autenticación (Task 8), Manejo de errores (Tasks 11-13), Testing (Tasks 5-7, 16), Configuración (Tasks 3, 16) — all covered.
- **Type consistency**: `TurnoConNombres` defined in Task 3, used consistently in Tasks 6, 10, 11, 14. `WebhookResponse` defined in Task 3, used in Task 7 and consumed via `cancelarTurno`/`modificarTurno` in Task 14. Hook return shapes (`useTurnos`, `useAuth`, `useToast`) match their usages in pages/components.
- **Out of scope items** (multi-tenant auth, editing servicios/empleados, manual turno creation, realtime) are not included in any task, consistent with the spec.
