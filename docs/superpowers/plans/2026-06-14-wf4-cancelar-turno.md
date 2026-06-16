# WF4 - Cancelar Turno (Panel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear, publicar y probar el workflow de n8n "Cancelar Turno (Panel)": recibe un `turno_id` por webhook, marca el turno como `cancelado` en Supabase y borra el evento correspondiente en Google Calendar (si existe).

**Architecture:** Un workflow nuevo en n8n (Webhook → Get Turno → Update Turno → If tiene `calendar_event_id` → Delete event → Respond) que reutiliza la credencial Supabase existente ("Supabase account") y requiere una credencial nueva de Google Calendar OAuth2 (también la necesita el "Create an event" de WF2, que hoy no la tiene). El orden Update Turno → Delete event es deliberado: Supabase queda marcado `cancelado` antes de tocar Calendar, así que si el borrado del evento falla, el turno sigue correctamente cancelado en la base (Calendar es best-effort, según la spec). Primero se valida la lógica con datos simulados (sin tocar servicios externos), luego se configura la credencial de Calendar, y por último se prueba con un turno real en Supabase.

**Tech Stack:** n8n Workflow SDK (`@n8n/workflow-sdk`) vía MCP de n8n; nodos `n8n-nodes-base.webhook`, `n8n-nodes-base.supabase`, `n8n-nodes-base.if`, `n8n-nodes-base.googleCalendar`, `n8n-nodes-base.respondToWebhook`; Supabase (tabla `turnos`).

Referencia: spec [docs/superpowers/specs/2026-06-14-panel-cliente-design.md](../specs/2026-06-14-panel-cliente-design.md), sección "Cancelar turno → WF4 (nuevo)".

---

## Task 1: Crear y publicar el workflow en n8n

**Files:**
- Modify: `docs/superpowers/specs/2026-06-14-panel-cliente-design.md` (Step 4, agrega la URL del webhook)

- [ ] **Step 1: Validar el código del workflow**

Este es el código completo de WF4 (ya diseñado y validado contra los tipos reales de los nodos de la instancia de n8n):

```javascript
import { workflow, node, trigger, ifElse, newCredential, expr } from '@n8n/workflow-sdk';

const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Webhook',
    parameters: {
      httpMethod: 'POST',
      path: 'pajaro-loco-cancelar-turno',
      responseMode: 'responseNode',
      options: {}
    },
    output: [{
      json: {
        body: { turno_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }
      }
    }]
  }
});

const getTurno = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Get Turno',
    parameters: {
      resource: 'row',
      operation: 'getAll',
      tableId: 'turnos',
      returnAll: false,
      limit: 1,
      filterType: 'manual',
      matchType: 'allFilters',
      filters: {
        conditions: [
          { keyName: 'id', condition: 'eq', keyValue: expr('={{ $json.body.turno_id }}') }
        ]
      }
    },
    credentials: { supabaseApi: newCredential('Supabase account') },
    output: [{
      json: {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        cliente_id: '11111111-1111-1111-1111-111111111111',
        estado: 'confirmado',
        calendar_event_id: 'abc123def456'
      }
    }]
  }
});

const updateTurno = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Update Turno',
    parameters: {
      resource: 'row',
      operation: 'update',
      tableId: 'turnos',
      filterType: 'manual',
      matchType: 'allFilters',
      filters: {
        conditions: [
          { keyName: 'id', condition: 'eq', keyValue: expr("={{ $('Get Turno').item.json.id }}") }
        ]
      },
      dataToSend: 'defineBelow',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'estado', fieldValue: 'cancelado' }
        ]
      }
    },
    credentials: { supabaseApi: newCredential('Supabase account') },
    output: [{
      json: {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        estado: 'cancelado'
      }
    }]
  }
});

const checkCalendarEvent = ifElse({
  version: 2.3,
  config: {
    name: 'Check Calendar Event',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [
          {
            leftValue: expr("={{ $('Get Turno').item.json.calendar_event_id }}"),
            operator: { type: 'string', operation: 'notEmpty' },
            rightValue: ''
          }
        ],
        combinator: 'and'
      }
    }
  }
});

const deleteEvent = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: {
    name: 'Delete event',
    parameters: {
      resource: 'event',
      operation: 'delete',
      calendar: { __rl: true, mode: 'id', value: 'ultraguschi@gmail.com' },
      eventId: expr("={{ $('Get Turno').item.json.calendar_event_id }}")
    },
    output: [{ json: { success: true } }]
  }
});

const respondCancelado = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond Cancelado',
    parameters: {
      respondWith: 'json',
      responseBody: '{ "ok": true }',
      options: { responseCode: 200 }
    }
  }
});

export default workflow('wf4-cancelar-turno', 'Cancelar Turno (Panel)')
  .add(webhookTrigger)
  .to(getTurno)
  .to(updateTurno)
  .to(checkCalendarEvent
    .onTrue(deleteEvent.to(respondCancelado))
    .onFalse(respondCancelado));
```

Llamar a `validate_workflow` (MCP de n8n) con este código completo.

Expected: `{"valid": true, "nodeCount": 6}`

- [ ] **Step 2: Crear el workflow en n8n**

Llamar a `create_workflow_from_code` con:
- `code`: el mismo código del Step 1
- `description`: `"Cancela un turno desde el panel de Pajaro Loco: marca turnos.estado='cancelado' en Supabase y borra el evento de Google Calendar asociado (si existe), vía webhook."`

(no pasar `name` ni `projectId` — el código ya define el nombre "Cancelar Turno (Panel)" y va al proyecto personal, igual que WF1-3).

Expected: respuesta con el `id` del workflow creado y `targetProject`. Guardar ese `id` — se usa en los pasos y tasks siguientes como `<WF4_ID>`.

- [ ] **Step 3: Confirmar la creación y la URL del webhook**

Llamar a `get_workflow_details` con `workflowId=<WF4_ID>`.

Expected:
- 6 nodos: `Webhook`, `Get Turno`, `Update Turno`, `Check Calendar Event`, `Delete event`, `Respond Cancelado`.
- El trigger `Webhook` tiene `path: "pajaro-loco-cancelar-turno"`, `httpMethod: "POST"`, `responseMode: "responseNode"`.
- Los detalles del trigger confirman (o permiten derivar) la URL de producción: `https://bairesstudio.app.n8n.cloud/webhook/pajaro-loco-cancelar-turno`.

- [ ] **Step 4: Publicar el workflow**

Llamar a `publish_workflow` con `workflowId=<WF4_ID>`.

Expected: el workflow queda activo (`active: true`), la URL de producción del webhook queda lista para recibir llamadas reales.

- [ ] **Step 5: Documentar la URL del webhook en la spec**

En `docs/superpowers/specs/2026-06-14-panel-cliente-design.md`, dentro de la sección "### Cancelar turno → WF4 (nuevo)", justo después del bloque de pseudocódigo (que termina en la línea con ` → Respond 200 { ok: true }` y la línea ` ``` `), agregar una línea nueva con la URL real:

```
Implementado: WF4 está creado y publicado en n8n como "Cancelar Turno (Panel)".
Webhook: `POST https://bairesstudio.app.n8n.cloud/webhook/pajaro-loco-cancelar-turno`
con body `{ "turno_id": "<uuid>" }`, responde `{ "ok": true }`. Esta es la URL
que debe usar el botón "Cancelar" del panel (Lovable).
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-06-14-panel-cliente-design.md
git commit -m "Document WF4 webhook URL after creating it in n8n"
```

---

## Task 2: Probar la lógica del workflow con datos simulados

No toca Supabase ni Google Calendar reales — usa `test_workflow` con pin data para validar el cableado y la condición del nodo `Check Calendar Event` en sus dos ramas.

**Files:** ninguno (todo ocurre vía MCP de n8n).

- [ ] **Step 1: Generar el esquema de pin data**

Llamar a `prepare_test_pin_data` con `workflowId=<WF4_ID>`.

Expected: devuelve esquemas para los nodos que necesitan pin data (`Webhook`, `Get Turno`, `Update Turno`, `Delete event` — los que tienen trigger/credenciales). `Check Calendar Event` y `Respond Cancelado` no los necesitan (ejecutan su lógica normalmente).

- [ ] **Step 2: Probar la rama "con evento de calendario"**

Llamar a `test_workflow` con `workflowId=<WF4_ID>` y este `pinData` (ajustar nombres de campo solo si el esquema del Step 1 difiere de esto):

```json
{
  "Webhook": [
    { "json": { "body": { "turno_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479" } } }
  ],
  "Get Turno": [
    {
      "json": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "cliente_id": "11111111-1111-1111-1111-111111111111",
        "estado": "confirmado",
        "calendar_event_id": "abc123def456"
      }
    }
  ],
  "Update Turno": [
    { "json": { "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "estado": "cancelado" } }
  ],
  "Delete event": [
    { "json": { "success": true } }
  ]
}
```

Expected: la ejecución termina en `success`.

- [ ] **Step 3: Verificar que tomó la rama "Delete event"**

Llamar a `get_execution` con `workflowId=<WF4_ID>`, `executionId` = el de Step 2, `includeData: true`, `nodeNames: ["Check Calendar Event", "Delete event", "Respond Cancelado"]`.

Expected: `Check Calendar Event` evalúa a `true` (rama `onTrue`), `Delete event` se ejecuta, y `Respond Cancelado` produce `{ "ok": true }`.

- [ ] **Step 4: Probar la rama "sin evento de calendario"**

Repetir `test_workflow` con el mismo `workflowId` y `pinData`, cambiando solo `Get Turno` para que `calendar_event_id` sea `null`:

```json
{
  "Webhook": [
    { "json": { "body": { "turno_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479" } } }
  ],
  "Get Turno": [
    {
      "json": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "cliente_id": "11111111-1111-1111-1111-111111111111",
        "estado": "confirmado",
        "calendar_event_id": null
      }
    }
  ],
  "Update Turno": [
    { "json": { "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "estado": "cancelado" } }
  ],
  "Delete event": [
    { "json": { "success": true } }
  ]
}
```

- [ ] **Step 5: Verificar que tomó la rama directa a "Respond Cancelado"**

Llamar a `get_execution` igual que en el Step 3 (nuevo `executionId`).

Expected: `Check Calendar Event` evalúa a `false` (rama `onFalse`), `Delete event` **no** se ejecuta, y `Respond Cancelado` produce `{ "ok": true }` igual.

---

## Task 3: Configurar la credencial de Google Calendar (acción manual del usuario)

Hoy en la instancia de n8n solo existe la credencial `"Supabase account"`. Tanto `Delete event` de WF4 como `Create an event` de WF2 (Reservas - Confirmación) necesitan una credencial de Google Calendar OAuth2 para funcionar contra el calendario `ultraguschi@gmail.com`. Esto requiere un login interactivo con Google — no se puede hacer vía MCP.

**Files:** ninguno.

- [ ] **Step 1: Crear la credencial en n8n (manual)**

En la UI de n8n (`https://bairesstudio.app.n8n.cloud/`):
1. Ir a **Credentials** → **Add Credential**.
2. Buscar **"Google Calendar OAuth2 API"**.
3. Click en **"Sign in with Google"** e iniciar sesión con la cuenta de Google que tiene acceso al calendario `ultraguschi@gmail.com`.
4. Aceptar los permisos solicitados.
5. Guardar la credencial con el nombre **"Google Calendar - Pajaro Loco"**.

- [ ] **Step 2: Asignar la credencial al nodo "Delete event" de WF4 (manual)**

1. Abrir el workflow **"Cancelar Turno (Panel)"** en n8n.
2. Click en el nodo **"Delete event"**.
3. En **"Credential to connect with"**, seleccionar **"Google Calendar - Pajaro Loco"**.
4. Guardar el workflow.

- [ ] **Step 3: Asignar la misma credencial al nodo "Create an event" de WF2 (manual)**

1. Abrir el workflow **"Reservas - Confirmación"** (versión Supabase).
2. Click en el nodo **"Create an event"**.
3. En **"Credential to connect with"**, seleccionar **"Google Calendar - Pajaro Loco"**.
4. Guardar el workflow.

- [ ] **Step 4: Confirmar la credencial desde acá**

Llamar a `list_credentials` con `type: "googleCalendarOAuth2Api"`.

Expected: aparece **"Google Calendar - Pajaro Loco"** en los resultados.

---

## Task 4: Probar WF4 de punta a punta con un turno real

Verifica el camino completo contra Supabase real: insertar un turno de prueba, cancelarlo vía WF4, y confirmar que `estado` cambia a `cancelado`.

**Files:** ninguno (SQL ejecutado directo en Supabase, resto vía MCP de n8n).

- [ ] **Step 1: Insertar un turno de prueba (acción manual del usuario, SQL editor de Supabase)**

```sql
insert into turnos (
  cliente_id, nombre_cliente, fecha, inicio_minutos, fin_minutos, duracion_minutos,
  precio_servicio, estado, calendar_event_id, mascota_nombre, mascota_raza, mascota_tamano
)
select id, 'Turno de prueba WF4', current_date + 1, 600, 660, 60,
       20000, 'confirmado', null, 'Rocky', 'Caniche', 'chico'
from clientes where slug = 'pajaro-loco'
returning id;
```

Guardar el `id` devuelto — se usa como `<TURNO_ID>` en los pasos siguientes.

Nota: `calendar_event_id` queda en `null` a propósito. Esto prueba el camino completo de Supabase (lectura, update, respuesta) sin depender de un evento de Calendar real. La rama `Delete event` se ejercitará la primera vez que se cancele un turno real creado por WF2 (que sí guarda `calendar_event_id`, una vez tenga la credencial de la Task 3) — si esa ejecución fallara, revisar el log de esa ejecución en n8n.

- [ ] **Step 2: Ejecutar WF4 con ese turno**

Llamar a `execute_workflow` con:
- `workflowId=<WF4_ID>`
- `executionMode: "manual"`
- `inputs: { "type": "webhook", "webhookData": { "method": "POST", "body": { "turno_id": "<TURNO_ID>" } } }`

Expected: devuelve un `executionId`.

- [ ] **Step 3: Verificar la ejecución**

Llamar a `get_execution` con `workflowId=<WF4_ID>`, `executionId` del Step 2, `includeData: true`.

Expected:
- Estado `success`.
- `Get Turno` devuelve la fila con `id=<TURNO_ID>`, `estado="confirmado"`, `calendar_event_id=null`.
- `Update Turno` devuelve `id=<TURNO_ID>`, `estado="cancelado"`.
- `Check Calendar Event` evalúa a `false` (porque `calendar_event_id` es `null`) → `Delete event` no se ejecuta.
- `Respond Cancelado` produce `{ "ok": true }`.

- [ ] **Step 4: Confirmar en Supabase (acción manual del usuario, SQL editor)**

```sql
select id, estado, calendar_event_id from turnos where id = '<TURNO_ID>';
```

Expected: `estado = 'cancelado'`.

---

## Notas para más adelante (fuera de este plan)

- El panel en Lovable y las políticas RLS quedan para una siguiente iteración (ver spec, secciones "Contenido y layout" y "Acceso y seguridad").
- Una vez que el panel exista, el botón "Cancelar" debe llamar al webhook documentado en la Task 1 (Step 5) pidiendo confirmación antes, según especifica la spec.
