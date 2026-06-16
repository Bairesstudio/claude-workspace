# Clonador de Workflows n8n — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón "Activar en n8n" en el panel admin que clona automáticamente los 5 workflows de Pajaro Loco para cada cliente nuevo, parametrizados con sus datos.

**Architecture:** Una Supabase Edge Function (`clonar-workflows`) recibe el `cliente_id`, llama a la n8n REST API para clonar los 5 workflows fuente (Pajaro Loco), reemplaza valores hardcodeados (slug, calendar_id, nombre del negocio, referencia a WF2), activa los nuevos workflows y guarda los IDs en Supabase. El panel admin muestra el estado (pendiente / activando / activo / error).

**Tech Stack:** Supabase Edge Functions (Deno), n8n REST API (`/api/v1/workflows`), React + TypeScript (dashboard), Supabase MCP para SQL y deploy.

---

## Mapa de reemplazos por workflow

| Workflow | Fuente | Qué se reemplaza |
|---|---|---|
| WF1 `A1FUdToxhBHgoH5l` | Recepcion - Validación | `pajaro-loco` → slug; `RUzNBpw8OMIWkvzN` → nuevo ID WF2 |
| WF2 `RUzNBpw8OMIWkvzN` | Reservas - Confirmación | Nada (ya es 100% dinámico vía Supabase) |
| WF3 `dMkN3rooLHKZcNVq` | Resumen Mensual | `pajaro-loco` → slug |
| WF4 `ezUR5YsDGsejxCSU` | Cancelar Turno | `pajaro-loco` → slug; `ultraguschi@gmail.com` → calendar_id; `Pajaro Loco` → nombre |
| WF5 `iiVFmH2w1yqqjHhU` | Modificar Turno | `pajaro-loco` → slug; `ultraguschi@gmail.com` → calendar_id; `Pajaro Loco` → nombre |

## Archivos

- **Crear:** `supabase/functions/clonar-workflows/index.ts`
- **Modificar:** `dashboard/src/pages/admin/AdminClienteDetalle.tsx`
- **SQL:** aplicar via Supabase MCP (sin archivo de migración)

---

## Task 1 — SQL migration: columnas n8n en tabla clientes

**Files:** ninguno (aplicar via MCP)

- [ ] **Step 1: Aplicar migración via Supabase MCP**

```sql
alter table clientes
  add column if not exists n8n_activo boolean not null default false,
  add column if not exists n8n_workflow_ids jsonb;
```

Usar `mcp__supabase__execute_sql` con ese SQL.

- [ ] **Step 2: Verificar columnas**

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'clientes'
  and column_name in ('n8n_activo', 'n8n_workflow_ids');
```

Resultado esperado: 2 filas — `n8n_activo` (boolean, default false) y `n8n_workflow_ids` (jsonb, sin default).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add n8n_activo and n8n_workflow_ids to clientes table"
```

---

## Task 2 — Edge Function: `clonar-workflows/index.ts`

**Files:**
- Crear: `supabase/functions/clonar-workflows/index.ts`

- [ ] **Step 1: Crear directorio**

```bash
mkdir -p "D:/Claude Workspace/supabase/functions/clonar-workflows"
```

- [ ] **Step 2: Escribir la función**

Crear `supabase/functions/clonar-workflows/index.ts` con este contenido exacto:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const N8N_API_KEY = Deno.env.get('N8N_API_KEY')!
const N8N_BASE_URL = Deno.env.get('N8N_BASE_URL') ?? 'https://bairesstudio.app.n8n.cloud'
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map(s => s.trim())

// Pajaro Loco workflow IDs — source for cloning
const SOURCE_WF1 = 'A1FUdToxhBHgoH5l'
const SOURCE_WF2 = 'RUzNBpw8OMIWkvzN'
const SOURCE_WF3 = 'dMkN3rooLHKZcNVq'
const SOURCE_WF4 = 'ezUR5YsDGsejxCSU'
const SOURCE_WF5 = 'iiVFmH2w1yqqjHhU'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, error: 'No autorizado' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return json({ ok: false, error: 'Acceso denegado' }, 403)
  }

  const body = await req.json()
  const cliente_id: string = body.cliente_id
  if (!cliente_id) return json({ ok: false, error: 'cliente_id requerido' }, 400)

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('slug, nombre, calendar_id')
    .eq('id', cliente_id)
    .single()

  if (clienteError || !cliente) return json({ ok: false, error: 'Cliente no encontrado' }, 404)

  const { slug, nombre, calendar_id } = cliente as {
    slug: string; nombre: string; calendar_id: string
  }

  try {
    // WF2 primero — WF1 necesita su nuevo ID
    const wf2 = await cloneWorkflow(SOURCE_WF2, slug, nombre, calendar_id, {})
    const wf1 = await cloneWorkflow(SOURCE_WF1, slug, nombre, calendar_id, { [SOURCE_WF2]: wf2 })
    const wf3 = await cloneWorkflow(SOURCE_WF3, slug, nombre, calendar_id, {})
    const wf4 = await cloneWorkflow(SOURCE_WF4, slug, nombre, calendar_id, {})
    const wf5 = await cloneWorkflow(SOURCE_WF5, slug, nombre, calendar_id, {})

    // Activar los 5
    await Promise.all(
      [wf1, wf2, wf3, wf4, wf5].map(id =>
        n8nPost(`/workflows/${id}/activate`, {})
      )
    )

    const n8n_workflow_ids = { wf1, wf2, wf3, wf4, wf5 }

    await supabase
      .from('clientes')
      .update({ n8n_activo: true, n8n_workflow_ids })
      .eq('id', cliente_id)

    return json({ ok: true, n8n_workflow_ids })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return json({ ok: false, error: msg }, 500)
  }
})

async function cloneWorkflow(
  sourceId: string,
  slug: string,
  nombre: string,
  calendarId: string,
  idReplacements: Record<string, string>
): Promise<string> {
  const source = await n8nGet(`/workflows/${sourceId}`)

  // Quitar campos no portables de los nodos (webhookId genera conflictos)
  const nodes = (source.nodes as Record<string, unknown>[]).map(
    ({ webhookId: _wh, ...node }) => node
  )

  let payload = JSON.stringify({
    name: source.name,
    nodes,
    connections: source.connections,
    settings: source.settings ?? {},
  })

  // Reemplazar todos los valores hardcodeados de Pajaro Loco
  payload = payload.replaceAll('pajaro-loco', slug)
  payload = payload.replaceAll('ultraguschi@gmail.com', calendarId)
  payload = payload.replaceAll('Pajaro Loco', nombre)

  // Reemplazar IDs de workflows fuente → IDs clonados (ej: ref WF2 en WF1)
  for (const [from, to] of Object.entries(idReplacements)) {
    payload = payload.replaceAll(from, to)
  }

  const parsed = JSON.parse(payload)
  parsed.name = `${parsed.name} (${slug})`

  const created = await n8nPost('/workflows', parsed)
  return created.id as string
}

async function n8nGet(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${N8N_BASE_URL}/api/v1${path}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY },
  })
  if (!res.ok) throw new Error(`n8n GET ${path}: ${res.status} — ${await res.text()}`)
  return res.json()
}

async function n8nPost(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${N8N_BASE_URL}/api/v1${path}`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`n8n POST ${path}: ${res.status} — ${await res.text()}`)
  return res.json()
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/clonar-workflows/index.ts
git commit -m "feat: add clonar-workflows Edge Function"
```

---

## Task 3 — Deploy Edge Function y secrets

**Files:** ninguno (solo MCP/CLI)

- [ ] **Step 1: Deploy via Supabase MCP**

Usar `mcp__supabase__deploy_edge_function` con:
- `name`: `clonar-workflows`
- `files`: el contenido de `supabase/functions/clonar-workflows/index.ts`

- [ ] **Step 2: Configurar secrets**

Necesita el usuario proveer la n8n API key. Pedirle que la ejecute:

```bash
# En Supabase Dashboard → Settings → Edge Functions → Secrets, agregar:
# N8N_API_KEY = <la API key de n8n Cloud, desde bairesstudio.app.n8n.cloud/settings/api>
# ADMIN_EMAILS = bairesstudio12@gmail.com
# N8N_BASE_URL = https://bairesstudio.app.n8n.cloud
```

O via CLI si tiene Supabase CLI instalado:
```bash
supabase secrets set N8N_API_KEY=<key> ADMIN_EMAILS=bairesstudio12@gmail.com N8N_BASE_URL=https://bairesstudio.app.n8n.cloud
```

- [ ] **Step 3: Smoke test via curl**

Con el JWT de la sesión activa en el dashboard (obtenible desde DevTools → Application → localStorage → `supabase.auth.token`):

```bash
# SUPABASE_URL está en dashboard/.env como VITE_SUPABASE_URL
curl -X POST "$VITE_SUPABASE_URL/functions/v1/clonar-workflows" \
  -H "Authorization: Bearer <JWT del usuario admin — obtenible desde el dashboard: supabase.auth.getSession() en consola>" \
  -H "Content-Type: application/json" \
  -d '{"cliente_id": "<UUID de un cliente de prueba en Supabase>"}'
```

Resultado esperado:
```json
{ "ok": true, "n8n_workflow_ids": { "wf1": "...", "wf2": "...", "wf3": "...", "wf4": "...", "wf5": "..." } }
```

Verificar en n8n que aparezcan 5 nuevos workflows activos con el slug del cliente de prueba.

---

## Task 4 — UI: AdminClienteDetalle.tsx

**Files:**
- Modificar: `dashboard/src/pages/admin/AdminClienteDetalle.tsx`

- [ ] **Step 1: Actualizar interfaz Cliente y estados**

Reemplazar la definición de `Cliente` (líneas 1-12 del componente) y agregar estados:

```typescript
interface Cliente {
  id: string;
  nombre: string;
  slug: string;
  mail_dueno: string;
  calendar_id: string | null;
  n8n_activo: boolean;
  n8n_workflow_ids: { wf1: string; wf2: string; wf3: string; wf4: string; wf5: string } | null;
}
```

En el cuerpo del componente `AdminClienteDetalle`, agregar después de los estados existentes:

```typescript
const [activando, setActivando] = useState(false)
const [n8nError, setN8nError] = useState<string | null>(null)
```

- [ ] **Step 2: Agregar función activarEnN8n**

Agregar dentro del componente, antes del `return`:

```typescript
async function activarEnN8n() {
  if (!id) return
  setActivando(true)
  setN8nError(null)
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clonar-workflows`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cliente_id: id }),
      }
    )
    const data = await res.json()
    if (data.ok) {
      load(id)
    } else {
      setN8nError(data.error ?? 'Error desconocido')
    }
  } catch (e) {
    setN8nError(String(e))
  } finally {
    setActivando(false)
  }
}
```

- [ ] **Step 3: Reemplazar sección ámbar por sección de estado n8n**

Localizar en el archivo:
```tsx
{/* Instrucciones n8n */}
<section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
```

Reemplazar esa sección completa (hasta el `</section>` de cierre) por:

```tsx
{/* Estado n8n */}
<section>
  {cliente.n8n_activo ? (
    <div className="rounded-xl border border-green-200 bg-green-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <h2 className="text-sm font-semibold text-green-800">Activo en n8n</h2>
      </div>
      <ul className="space-y-1 text-sm text-green-700 font-mono">
        <li>/webhook/<strong>{cliente.slug}</strong>-reservas</li>
        <li>/webhook/<strong>{cliente.slug}</strong>-cancelar-turno</li>
        <li>/webhook/<strong>{cliente.slug}</strong>-modificar-turno</li>
      </ul>
    </div>
  ) : (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="mb-2 text-sm font-semibold text-amber-800">Próximo paso: activar en n8n</h2>
      <p className="text-sm text-amber-700 mb-4">
        Clona y configura los 5 workflows automáticamente para{' '}
        <span className="font-mono font-semibold">{cliente.slug}</span>.
      </p>
      {n8nError && (
        <p className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {n8nError}
        </p>
      )}
      <button
        onClick={activarEnN8n}
        disabled={activando}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
      >
        {activando ? (
          <>
            <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Activando workflows...
          </>
        ) : (
          'Activar en n8n'
        )}
      </button>
    </div>
  )}
</section>
```

- [ ] **Step 4: Build y verificar**

```bash
cd dashboard && npm run build
```

Resultado esperado: sin errores de TypeScript ni de build.

- [ ] **Step 5: Probar en el browser**

Iniciar el dashboard:
```bash
cd dashboard && npm run dev
```

Verificar:
1. Entrar a `/admin/clientes/<id>` de un cliente con `n8n_activo = false` → aparece cuadro ámbar con botón "Activar en n8n"
2. Hacer click → spinner "Activando workflows..."
3. Al completar → cuadro verde "Activo en n8n" con los 3 webhook URLs
4. En n8n Cloud: verificar que aparezcan 5 nuevos workflows activos con el slug del cliente

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/pages/admin/AdminClienteDetalle.tsx
git commit -m "feat: add Activar en n8n button and status in AdminClienteDetalle"
```

---

## Verificación end-to-end

1. En el panel admin, crear un cliente nuevo (nombre, email, calendar_id)
2. En su página de detalle, hacer click en "Activar en n8n"
3. Verificar que en n8n Cloud aparezcan 5 workflows nuevos con el slug correcto y activos
4. Verificar en Supabase que `clientes.n8n_activo = true` y `n8n_workflow_ids` tiene los 5 IDs
5. Hacer un POST de prueba al nuevo webhook: `POST https://bairesstudio.app.n8n.cloud/webhook/<slug>-reservas` con payload de reserva válido
6. Verificar que WF1 responda `{ ok: true }` y WF2 inserte el turno en Supabase
