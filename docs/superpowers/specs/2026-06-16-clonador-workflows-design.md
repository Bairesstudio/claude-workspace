# Clonador de Workflows n8n — Spec de diseño

Fecha: 2026-06-16

## Contexto

Baires Studio vende sistemas de automatización de turnos a negocios locales. Cada cliente nuevo requiere 5 workflows en n8n (WF1–WF5) actualmente hardcodeados para el cliente beta "Pajaro Loco" (slug `pajaro-loco`). Sin el clonador, dar de alta un nuevo cliente implica copiar y editar esos workflows a mano — no escala.

El objetivo es que al agregar un cliente en el panel admin, un botón "Activar en n8n" clone automáticamente los 5 workflows, los parametrice con los datos del cliente y los active.

## Arquitectura general

```
Panel admin (AdminClienteDetalle)
  → botón "Activar en n8n"
  → Supabase Edge Function: clonar-workflows ({ cliente_id })
      → n8n REST API: leer templates, crear workflows nuevos, activarlos
  → Supabase: guardar n8n_activo + IDs de los 5 workflows
  → Panel actualiza estado: badge "Activo" + webhook URLs
```

## Paso 0 — Crear workflows template en n8n (prerequisito)

Claude ejecuta esto **una sola vez** usando el MCP de n8n, **sin tocar los workflows de Pajaro Loco**.

Para cada uno de los 5 workflows actuales:
1. Leer el JSON completo vía n8n MCP
2. Reemplazar todas las ocurrencias de `pajaro-loco` por el sentinel `__SLUG__`
3. Webhook paths: `/pajaro-loco-reservas` → `/__SLUG__-reservas`, etc.
4. Crear un workflow nuevo con nombre `[TEMPLATE] <nombre original>`
5. Dejarlo **inactivo** (es solo fuente para clonar)

Workflows a templatear:
| ID actual | Nombre | Webhook path actual |
|---|---|---|
| A1FUdToxhBHgoH5l | WF1 Recepcion - Validación | `/pajaro-loco-reservas` |
| RUzNBpw8OMIWkvzN | WF2 Reservas - Confirmación | (llamado por WF1) |
| dMkN3rooLHKZcNVq | WF3 Resumen Mensual | (schedule trigger) |
| ezUR5YsDGsejxCSU | WF4 Cancelar Turno | `/pajaro-loco-cancelar-turno` |
| iiVFmH2w1yqqjHhU | WF5 Modificar Turno | `/pajaro-loco-modificar-turno` |

En el template WF1, el nodo "Call WF2" referencia al ID del template WF2. El clonador lo reemplaza por el ID del WF2 nuevo al momento de clonar.

## Paso 1 — Migración de Supabase

Agregar a la tabla `clientes`:

```sql
alter table clientes
  add column n8n_activo boolean not null default false,
  add column n8n_workflow_ids jsonb;
```

`n8n_workflow_ids` guarda los IDs de los 5 workflows del cliente:
```json
{
  "wf1": "id-wf1-nuevo",
  "wf2": "id-wf2-nuevo",
  "wf3": "id-wf3-nuevo",
  "wf4": "id-wf4-nuevo",
  "wf5": "id-wf5-nuevo"
}
```

## Paso 2 — Supabase Edge Function: `clonar-workflows`

**Endpoint:** `POST /functions/v1/clonar-workflows`
**Body:** `{ "cliente_id": "uuid" }`
**Auth:** El panel admin llama a la Edge Function pasando el JWT del usuario autenticado (header `Authorization: Bearer <token>`). La función verifica el JWT con Supabase y comprueba que el `email` del usuario esté en la variable de entorno `ADMIN_EMAILS` (lista separada por comas, ej: `bairesstudio12@gmail.com`). Si no matchea, retorna 403.

**Algoritmo:**

```
1. Fetch cliente desde Supabase: slug, calendar_id, mail_dueno
2. Fetch JSON template WF2 desde n8n API (GET /api/v1/workflows/<template_wf2_id>)
3. JSON.stringify → reemplazar "__SLUG__" → slug del cliente
4. POST /api/v1/workflows → guardar ID del WF2 nuevo
5. Fetch JSON template WF1
6. Reemplazar "__SLUG__" + reemplazar ID del template WF2 → ID del WF2 nuevo
7. POST /api/v1/workflows → guardar ID del WF1 nuevo
8. Para WF3, WF4, WF5: fetch template → reemplazar "__SLUG__" → POST
9. Activar WF1, WF3, WF4, WF5: POST /api/v1/workflows/<id>/activate
   (WF2 no se activa manualmente — es sub-workflow, se ejecuta cuando WF1 lo llama)
10. Supabase UPDATE clientes SET n8n_activo=true, n8n_workflow_ids={...} WHERE id=cliente_id
```

**Variables de entorno de la Edge Function:**
- `N8N_API_KEY` — API key de n8n (secret de Supabase)
- `N8N_BASE_URL` — `https://bairesstudio.app.n8n.cloud`
- `TEMPLATE_WF_IDS` — JSON con los IDs de los 5 templates (se populan al crear los templates en el Paso 0)

**Errores:**
- Si algún paso falla, la función retorna `{ ok: false, error: "..." }` con detalle del paso que falló
- No hay rollback automático en esta versión: si falla en WF3 habiendo creado WF1/WF2, el admin puede volver a intentar (los workflows duplicados se borran a mano en n8n por ahora)

## Paso 3 — Panel admin: `AdminClienteDetalle.tsx`

Reemplazar la sección ámbar de instrucciones manuales por un componente de estado:

**Estado "Pendiente"** (`n8n_activo = false`):
- Cuadro ámbar con botón `Activar en n8n`
- Al hacer click: llama a la Edge Function, muestra spinner

**Estado "Activando"** (loading):
- Botón deshabilitado con spinner "Activando workflows..."

**Estado "Activo"** (`n8n_activo = true`):
- Badge verde "Activo en n8n"
- Webhook URLs generadas:
  - Reservas: `/webhook/__slug__-reservas`
  - Cancelar: `/webhook/__slug__-cancelar-turno`
  - Modificar: `/webhook/__slug__-modificar-turno`

**Estado "Error"**:
- Cuadro rojo con el mensaje de error
- Botón "Reintentar"

## Fuera de alcance

- Rollback automático si falla a mitad del proceso
- Onboarding self-service (el cliente llena el form solo) — Fase 2 posterior
- Clonar credentials de Google Calendar/Gmail por cliente — el dueño comparte su Calendar con la cuenta n8n manualmente (instrucción incluida en el panel)
- Borrar workflows clonados desde el panel

## Orden de implementación

1. Paso 0: Claude crea los 5 templates en n8n vía MCP (una vez, ahora)
2. Paso 1: Migración SQL en Supabase
3. Paso 2: Edge Function `clonar-workflows`
4. Paso 3: UI en `AdminClienteDetalle.tsx`
