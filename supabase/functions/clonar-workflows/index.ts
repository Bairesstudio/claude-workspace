import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const N8N_API_KEY = Deno.env.get('N8N_API_KEY')!
const N8N_BASE_URL = Deno.env.get('N8N_BASE_URL') ?? 'https://bairesstudio.app.n8n.cloud'

// Issue 7 fix: filter empty strings so an empty ADMIN_EMAILS env var doesn't grant access to ''
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(s => s.length > 0)

// Template workflow IDs — source for cloning (Templates Maestros folder)
const SOURCE_WF1 = '0CKZG6roonivPpHo'
const SOURCE_WF2 = 'Fm9htwARw2xrWnQK'
const SOURCE_WF3 = 'vE709Gqvnmnpqv1r'
const SOURCE_WF4 = '6rQoMxp0cMSNNSJq'
const SOURCE_WF5 = 'OaYT1UmswAkX9iU7'

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
  // Issue 7 fix: also guard against user.email being empty/undefined
  if (authError || !user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
    return json({ ok: false, error: 'Acceso denegado' }, 403)
  }

  // Issue 4 fix: catch malformed JSON bodies before they bubble up as 500
  let body: { cliente_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'Body JSON inválido' }, 400)
  }

  const cliente_id: string = body.cliente_id ?? ''
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

  // Issue 1 fix: track created IDs so we can roll back on partial failure
  const createdIds: string[] = []
  try {
    // WF2 primero — WF1 necesita su nuevo ID
    const wf2 = await cloneWorkflow(SOURCE_WF2, slug, nombre, calendar_id, {})
    createdIds.push(wf2)
    const wf1 = await cloneWorkflow(SOURCE_WF1, slug, nombre, calendar_id, { [SOURCE_WF2]: wf2 })
    createdIds.push(wf1)
    const wf3 = await cloneWorkflow(SOURCE_WF3, slug, nombre, calendar_id, {})
    createdIds.push(wf3)
    const wf4 = await cloneWorkflow(SOURCE_WF4, slug, nombre, calendar_id, {})
    createdIds.push(wf4)
    const wf5 = await cloneWorkflow(SOURCE_WF5, slug, nombre, calendar_id, {})
    createdIds.push(wf5)

    // Activar los 5
    await Promise.all(
      [wf1, wf2, wf3, wf4, wf5].map(id =>
        n8nPost(`/workflows/${id}/activate`, {})
      )
    )

    const n8n_workflow_ids = { wf1, wf2, wf3, wf4, wf5 }

    // Issue 2 fix: validate that the Supabase update actually succeeded
    const { error: updateError } = await supabase
      .from('clientes')
      .update({ n8n_activo: true, n8n_workflow_ids })
      .eq('id', cliente_id)
    if (updateError) throw new Error(`Supabase update failed: ${updateError.message}`)

    return json({ ok: true, n8n_workflow_ids })
  } catch (e: unknown) {
    // Issue 1 fix: best-effort cleanup of any workflows already created in n8n
    await Promise.allSettled(createdIds.map(id => n8nDelete(`/workflows/${id}`)))
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

  // Reemplazar placeholders del template
  payload = payload.replaceAll('__SLUG__', slug)
  payload = payload.replaceAll('__CALENDAR_ID__', calendarId)
  payload = payload.replaceAll('__NOMBRE__', nombre)

  // Reemplazar IDs de workflows fuente → IDs clonados (ej: ref WF2 en WF1)
  for (const [from, to] of Object.entries(idReplacements)) {
    payload = payload.replaceAll(from, to)
  }

  const parsed = JSON.parse(payload)
  parsed.name = `${parsed.name} (${slug})`

  const created = await n8nPost('/workflows', parsed)

  // Issue 5 fix: guard against n8n returning a response without a valid string ID
  if (!created.id || typeof created.id !== 'string') {
    throw new Error(`n8n no retornó un ID válido para el workflow clonado`)
  }
  return created.id
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

// Issue 1 fix: helper used for rollback cleanup — errors are intentionally swallowed
async function n8nDelete(path: string): Promise<void> {
  await fetch(`${N8N_BASE_URL}/api/v1${path}`, {
    method: 'DELETE',
    headers: { 'X-N8N-API-KEY': N8N_API_KEY },
  }).catch(() => {/* ignore cleanup errors */})
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
