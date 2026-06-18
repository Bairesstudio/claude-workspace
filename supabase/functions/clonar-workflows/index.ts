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
