# Horarios por empleado con semanas alternas (A/B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada empleado tenga un horario semanal fijo o alternado (semana A / semana B), validado al recibir una reserva, y configurable desde el panel admin.

**Architecture:** Nueva tabla Supabase `horarios_empleado` (1 fila por empleado, opt-in). El workflow real de n8n `Recepcion - Validación (Supabase)` (id `A1FUdToxhBHgoH5l`, plantilla fuente clonada para todo cliente nuevo) se actualiza vía la API de n8n para insertar un chequeo de día entre `Get Empleado` y `Build Slot`. El panel admin (`AdminClienteDetalle.tsx`) suma un formulario inline por empleado para configurar el horario.

**Tech Stack:** Supabase (Postgres + REST), n8n (API REST v1, nodos Code/Supabase/Switch), React + TypeScript + Tailwind (dashboard existente). Sin framework de tests en el repo — la verificación de cada task es manual (SQL, curl, navegador), siguiendo el patrón ya usado en el proyecto.

**Referencia:** Spec completo en `docs/superpowers/specs/2026-06-18-horarios-semanas-alternas-design.md`.

---

### Task 1: Migración SQL — tabla `horarios_empleado`

**Files:**
- Create: `sheets/migracion-horarios-empleado.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- Migracion: horario por empleado (fijo o semanas alternas A/B)
-- Ejecutar despues de schema-supabase.sql

create table horarios_empleado (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade unique,
  fecha_referencia date not null,   -- una fecha conocida en la que aplicaba "semana A"
  dias_semana_a text[] not null,    -- ej: ['lunes','miercoles','viernes']
  dias_semana_b text[] not null,    -- igual a dias_semana_a si el horario es fijo (no alterna)
  created_at timestamptz not null default now()
);

-- Sin fila para un empleado = disponible todos los dias (default).
-- Dias validos: lunes, martes, miercoles, jueves, viernes, sabado, domingo.
```

- [ ] **Step 2: Ejecutar en el editor SQL de Supabase**

El usuario corre este archivo en el SQL Editor del proyecto Supabase de Baires Studio (mismo flujo manual que `migracion-tamano-perro.sql`).

- [ ] **Step 3: Verificar que la tabla existe**

Pedirle al usuario que corra esta query en el SQL Editor y confirme que devuelve 0 filas sin error:

```sql
select * from horarios_empleado;
```

Expected: tabla vacía, sin error de "relation does not exist".

- [ ] **Step 4: Commit**

```bash
git add sheets/migracion-horarios-empleado.sql
git commit -m "feat: add horarios_empleado table for per-employee A/B week schedules"
```

---

### Task 2: Insertar fila de prueba y validar el cálculo de paridad manualmente

Antes de tocar n8n, validamos la lógica de paridad de semana con datos reales para no debuggear dentro del Code node de n8n.

**Files:**
- Test (manual, sin archivo nuevo): se usa la consola SQL de Supabase y `node` local.

- [ ] **Step 1: Insertar un horario de prueba para Soledad**

Pedirle al usuario que corra esto en el SQL Editor de Supabase (reemplazando el id de empleado real de Soledad, obtenible con `select id, nombre from empleados;`):

```sql
insert into horarios_empleado (empleado_id, fecha_referencia, dias_semana_a, dias_semana_b)
values (
  '<id-de-soledad>',
  '2026-06-15',  -- lunes de la semana A
  array['lunes','miercoles','viernes'],
  array['martes','jueves','sabado']
);
```

- [ ] **Step 2: Probar la función de paridad en Node local**

Crear un archivo temporal `/tmp/check-paridad.mjs` (no se commitea, es solo para validar la lógica antes de pegarla en n8n):

```js
function diaDeSemana(fechaStr) {
  const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  const d = new Date(fechaStr + 'T00:00:00Z');
  return dias[d.getUTCDay()];
}

function lunesDeSemana(fechaStr) {
  const d = new Date(fechaStr + 'T00:00:00Z');
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function diaHabilitado(fechaTurno, fechaReferencia, diasA, diasB) {
  const lunesTurno = lunesDeSemana(fechaTurno);
  const lunesRef = lunesDeSemana(fechaReferencia);
  const diffDias = Math.round((lunesTurno.getTime() - lunesRef.getTime()) / 86400000);
  const diffSemanas = diffDias / 7;
  const esSemanaA = ((diffSemanas % 2) + 2) % 2 === 0;
  const dias = esSemanaA ? diasA : diasB;
  return dias.includes(diaDeSemana(fechaTurno));
}

const diasA = ['lunes','miercoles','viernes'];
const diasB = ['martes','jueves','sabado'];
const ref = '2026-06-15'; // lunes, semana A

console.log('2026-06-15 (lun, semana A)', diaHabilitado('2026-06-15', ref, diasA, diasB)); // true
console.log('2026-06-16 (mar, semana A)', diaHabilitado('2026-06-16', ref, diasA, diasB)); // false
console.log('2026-06-22 (lun, semana B)', diaHabilitado('2026-06-22', ref, diasA, diasB)); // false
console.log('2026-06-23 (mar, semana B)', diaHabilitado('2026-06-23', ref, diasA, diasB)); // true
```

- [ ] **Step 3: Ejecutar y verificar**

Run: `node /tmp/check-paridad.mjs`
Expected:
```
2026-06-15 (lun, semana A) true
2026-06-16 (mar, semana A) false
2026-06-22 (lun, semana B) false
2026-06-23 (mar, semana B) true
```

Si alguno no coincide, corregir la lógica acá antes de pasar al Task 3 (es la misma lógica que se va a pegar en el Code node de n8n).

- [ ] **Step 4: Borrar el archivo temporal**

```bash
rm /tmp/check-paridad.mjs
```

No se commitea — es solo una validación previa.

---

### Task 3: Versionar el WF1 actualizado en el repo

**Files:**
- Create: `n8n/workflows/WF1-recepcion-validacion.json`

- [ ] **Step 1: Crear el archivo con el workflow completo actualizado**

```json
{
  "name": "Recepcion - Validación (Supabase)",
  "nodes": [
    {
      "id": "17350367-07b4-4baa-bf78-9d513a24b892",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-1900, 400],
      "parameters": { "httpMethod": "POST", "path": "pajaro-loco-reservas", "responseMode": "responseNode", "options": {} },
      "webhookId": "1e919322-d807-4107-aa61-cafdf92a0a15"
    },
    {
      "id": "20c0fbe6-66ef-48cc-a52f-aac91497c508",
      "name": "CONFIG - Cliente",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [-1680, 400],
      "parameters": {
        "resource": "row", "operation": "getAll", "tableId": "clientes",
        "returnAll": false, "limit": 1, "filterType": "manual", "matchType": "allFilters",
        "filters": { "conditions": [{ "keyName": "slug", "condition": "eq", "keyValue": "pajaro-loco" }] }
      },
      "credentials": { "supabaseApi": { "id": "pICd44ujPpoNK1Kc", "name": "Supabase account" } }
    },
    {
      "id": "8de2eba8-18f4-48d6-bb71-047aa3205507",
      "name": "Flatten + Base Fields",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [-1460, 400],
      "parameters": {
        "mode": "manual", "includeOtherFields": false,
        "assignments": { "assignments": [
          { "id": "a1", "name": "cliente_id", "value": "={{ $('CONFIG - Cliente').item.json.id }}", "type": "string" },
          { "id": "a2", "name": "negocio_nombre", "value": "={{ $('CONFIG - Cliente').item.json.nombre }}", "type": "string" },
          { "id": "a3", "name": "email_duenio", "value": "={{ $('CONFIG - Cliente').item.json.mail_dueno }}", "type": "string" },
          { "id": "a4", "name": "nombre", "value": "={{ $('Webhook').item.json.body?.name ?? $('Webhook').item.json.name }}", "type": "string" },
          { "id": "a5", "name": "telefono", "value": "={{ $('Webhook').item.json.body?.phone ?? $('Webhook').item.json.phone }}", "type": "string" },
          { "id": "a6", "name": "email_cliente", "value": "={{ $('Webhook').item.json.body?.email ?? $('Webhook').item.json.email }}", "type": "string" },
          { "id": "a7", "name": "mensaje", "value": "={{ $('Webhook').item.json.body?.message ?? $('Webhook').item.json.message ?? '' }}", "type": "string" },
          { "id": "a8", "name": "observaciones", "value": "={{ $('Webhook').item.json.body?.observaciones ?? $('Webhook').item.json.observaciones ?? '' }}", "type": "string" },
          { "id": "a9", "name": "fecha_turno", "value": "={{ $('Webhook').item.json.body?.date ?? $('Webhook').item.json.date }}", "type": "string" },
          { "id": "a10", "name": "hora_turno", "value": "={{ $('Webhook').item.json.body?.time ?? $('Webhook').item.json.time }}", "type": "string" },
          { "id": "a11", "name": "empleado", "value": "={{ $('Webhook').item.json.body?.empleado ?? $('Webhook').item.json.empleado }}", "type": "string" },
          { "id": "a12", "name": "tamano", "value": "={{ $('Webhook').item.json.body?.tamano ?? $('Webhook').item.json.tamano }}", "type": "string" },
          { "id": "a13", "name": "mascota_nombre", "value": "={{ $('Webhook').item.json.body?.mascota_nombre ?? $('Webhook').item.json.mascota_nombre ?? '' }}", "type": "string" },
          { "id": "a14", "name": "mascota_raza", "value": "={{ $('Webhook').item.json.body?.mascota_raza ?? $('Webhook').item.json.mascota_raza ?? '' }}", "type": "string" },
          { "id": "a15", "name": "servicio", "value": "={{ ($('Webhook').item.json.body?.service ?? $('Webhook').item.json.service ?? '').toLowerCase().trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/ /g, '_') }}", "type": "string" }
        ] },
        "options": {}
      }
    },
    {
      "id": "89fda778-9fd2-4dbe-b376-6972c4044783",
      "name": "Get Servicio",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [-1240, 400],
      "parameters": {
        "resource": "row", "operation": "getAll", "tableId": "servicios",
        "returnAll": false, "limit": 1, "filterType": "manual", "matchType": "allFilters",
        "filters": { "conditions": [
          { "keyName": "cliente_id", "condition": "eq", "keyValue": "={{ $json.cliente_id }}" },
          { "keyName": "nombre_normalizado", "condition": "eq", "keyValue": "={{ $json.servicio }}" },
          { "keyName": "tamano", "condition": "eq", "keyValue": "={{ $json.tamano }}" }
        ] }
      },
      "credentials": { "supabaseApi": { "id": "pICd44ujPpoNK1Kc", "name": "Supabase account" } }
    },
    {
      "id": "15114564-6060-4e76-8341-3a2286c508c2",
      "name": "Get Empleado",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [-1020, 400],
      "parameters": {
        "resource": "row", "operation": "getAll", "tableId": "empleados",
        "returnAll": false, "limit": 1, "filterType": "manual", "matchType": "allFilters",
        "filters": { "conditions": [
          { "keyName": "cliente_id", "condition": "eq", "keyValue": "={{ $('Flatten + Base Fields').item.json.cliente_id }}" },
          { "keyName": "nombre", "condition": "eq", "keyValue": "={{ $('Flatten + Base Fields').item.json.empleado }}" }
        ] }
      },
      "credentials": { "supabaseApi": { "id": "pICd44ujPpoNK1Kc", "name": "Supabase account" } }
    },
    {
      "id": "f1a2b3c4-0001-4a1a-9c1a-000000000001",
      "name": "Get Horario Empleado",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [-940, 600],
      "parameters": {
        "resource": "row", "operation": "getAll", "tableId": "horarios_empleado",
        "returnAll": false, "limit": 1, "filterType": "manual", "matchType": "allFilters",
        "filters": { "conditions": [
          { "keyName": "empleado_id", "condition": "eq", "keyValue": "={{ $('Get Empleado').item.json.id }}" }
        ] }
      },
      "credentials": { "supabaseApi": { "id": "pICd44ujPpoNK1Kc", "name": "Supabase account" } },
      "alwaysOutputData": true
    },
    {
      "id": "f1a2b3c4-0002-4a1a-9c1a-000000000002",
      "name": "Check Día Habilitado",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-800, 600],
      "parameters": {
        "mode": "runOnceForAllItems",
        "language": "javaScript",
        "jsCode": "const flat = $('Flatten + Base Fields').item.json;\nconst empleado = $('Get Empleado').item.json;\nconst horarioRows = $input.all().map(i => i.json).filter(r => r && r.id);\nconst horario = horarioRows[0];\n\nfunction diaDeSemana(fechaStr) {\n  const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];\n  const d = new Date(fechaStr + 'T00:00:00Z');\n  return dias[d.getUTCDay()];\n}\n\nfunction lunesDeSemana(fechaStr) {\n  const d = new Date(fechaStr + 'T00:00:00Z');\n  const dow = d.getUTCDay();\n  const diff = dow === 0 ? -6 : 1 - dow;\n  d.setUTCDate(d.getUTCDate() + diff);\n  return d;\n}\n\nlet diaHabilitado = true;\n\nif (horario) {\n  const lunesTurno = lunesDeSemana(flat.fecha_turno);\n  const lunesRef = lunesDeSemana(horario.fecha_referencia);\n  const diffDias = Math.round((lunesTurno.getTime() - lunesRef.getTime()) / 86400000);\n  const diffSemanas = diffDias / 7;\n  const esSemanaA = ((diffSemanas % 2) + 2) % 2 === 0;\n  const dias = esSemanaA ? horario.dias_semana_a : horario.dias_semana_b;\n  diaHabilitado = Array.isArray(dias) && dias.includes(diaDeSemana(flat.fecha_turno));\n}\n\nreturn [{\n  json: {\n    ...flat,\n    empleado_id: empleado.id,\n    diaHabilitado,\n  }\n}];"
      }
    },
    {
      "id": "f1a2b3c4-0003-4a1a-9c1a-000000000003",
      "name": "Switch Día",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.4,
      "position": [-580, 600],
      "parameters": {
        "mode": "rules",
        "rules": { "values": [
          {
            "outputKey": "No Habilitado",
            "conditions": { "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "loose" }, "combinator": "and", "conditions": [
              { "leftValue": "={{ $json.diaHabilitado }}", "rightValue": "", "operator": { "type": "boolean", "operation": "false", "singleValue": true } }
            ] }
          },
          {
            "outputKey": "Habilitado",
            "conditions": { "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "loose" }, "combinator": "and", "conditions": [
              { "leftValue": "={{ $json.diaHabilitado }}", "rightValue": "", "operator": { "type": "boolean", "operation": "true", "singleValue": true } }
            ] }
          }
        ] },
        "looseTypeValidation": true,
        "options": {}
      }
    },
    {
      "id": "f1a2b3c4-0004-4a1a-9c1a-000000000004",
      "name": "Respond Día No Habilitado",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [-360, 700],
      "parameters": {
        "respondWith": "json",
        "responseBody": "{ \"ok\": false, \"message\": \"Ese empleado no trabaja ese día, elegí otro día u otro profesional.\" }",
        "options": { "responseCode": 400 }
      }
    },
    {
      "id": "e1b81a69-8a5f-43e3-8617-d384be19d9cd",
      "name": "Build Slot",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-800, 400],
      "parameters": {
        "mode": "runOnceForAllItems",
        "language": "javaScript",
        "jsCode": "const flat = $('Flatten + Base Fields').item.json;\nconst servicio = $('Get Servicio').item.json;\nconst empleado = $('Get Empleado').item.json;\n\nfunction minutosDesdeHora(hora) {\n  const [h, m] = String(hora).split(':').map(Number);\n  return (h * 60) + (m || 0);\n}\n\nconst inicio_minutos = minutosDesdeHora(flat.hora_turno);\nconst duracion_minutos = Number(servicio.duracion_minutos ?? 60);\nconst fin_minutos = inicio_minutos + duracion_minutos;\n\nreturn [{\n  json: {\n    ...flat,\n    servicio_id: servicio.id,\n    servicio_nombre: servicio.nombre,\n    empleado_id: empleado.id,\n    precio_servicio: Number(servicio.precio ?? 0),\n    duracion_minutos,\n    inicio_minutos,\n    fin_minutos,\n  }\n}];"
      }
    },
    {
      "id": "4630440d-9283-4927-bd97-d53477a93b95",
      "name": "Get Turnos del día",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [-580, 400],
      "parameters": {
        "resource": "row", "operation": "getAll", "tableId": "turnos",
        "returnAll": true, "filterType": "manual", "matchType": "allFilters",
        "filters": { "conditions": [
          { "keyName": "cliente_id", "condition": "eq", "keyValue": "={{ $('Build Slot').item.json.cliente_id }}" },
          { "keyName": "empleado_id", "condition": "eq", "keyValue": "={{ $('Build Slot').item.json.empleado_id }}" },
          { "keyName": "fecha", "condition": "eq", "keyValue": "={{ $('Build Slot').item.json.fecha_turno }}" },
          { "keyName": "estado", "condition": "eq", "keyValue": "confirmado" }
        ] }
      },
      "credentials": { "supabaseApi": { "id": "pICd44ujPpoNK1Kc", "name": "Supabase account" } },
      "alwaysOutputData": true
    },
    {
      "id": "b64a5645-3ceb-4d66-8897-93f7f1077701",
      "name": "Check Overlap",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-360, 400],
      "parameters": {
        "mode": "runOnceForAllItems",
        "language": "javaScript",
        "jsCode": "const nuevo = $('Build Slot').item.json;\nconst existentes = $input.all();\n\nlet isOccupied = false;\nlet turnoConflictivo = null;\n\nfor (const item of existentes) {\n  const row = item.json;\n  if (!row || !row.id) continue;\n  const seSuperpone = nuevo.inicio_minutos < row.fin_minutos && nuevo.fin_minutos > row.inicio_minutos;\n  if (seSuperpone) {\n    isOccupied = true;\n    turnoConflictivo = row;\n    break;\n  }\n}\n\nreturn [{\n  json: {\n    ...nuevo,\n    isOccupied,\n    turno_conflictivo: turnoConflictivo,\n  }\n}];"
      }
    },
    {
      "id": "9c96f791-f561-4157-9998-1946b04b97fd",
      "name": "Switch",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.4,
      "position": [-140, 400],
      "parameters": {
        "mode": "rules",
        "rules": { "values": [
          {
            "outputKey": "Occupied",
            "conditions": { "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "loose" }, "combinator": "and", "conditions": [
              { "leftValue": "={{ $json.isOccupied }}", "rightValue": "", "operator": { "type": "boolean", "operation": "true", "singleValue": true } }
            ] }
          },
          {
            "outputKey": "Free",
            "conditions": { "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "loose" }, "combinator": "and", "conditions": [
              { "leftValue": "={{ $json.isOccupied }}", "rightValue": "", "operator": { "type": "boolean", "operation": "false", "singleValue": true } }
            ] }
          }
        ] },
        "looseTypeValidation": true,
        "options": {}
      }
    },
    {
      "id": "a4461058-2c70-4adf-bb12-ef0b6ce9d374",
      "name": "Respond Ocupado",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [80, 280],
      "parameters": { "respondWith": "json", "responseBody": "{ \"ok\": false, \"message\": \"Ese horario ya está ocupado, elegí otro.\" }", "options": { "responseCode": 400 } }
    },
    {
      "id": "24644147-1822-45a2-8a72-1180baf2ca06",
      "name": "Respond Confirmado",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [80, 520],
      "parameters": { "respondWith": "json", "responseBody": "{ \"ok\": true, \"message\": \"Turno reservado con éxito.\" }", "options": { "responseCode": 200 } }
    },
    {
      "id": "9d75afd5-70dc-4883-848a-344b9eda65ca",
      "name": "Call Reservas - Confirmación",
      "type": "n8n-nodes-base.executeWorkflow",
      "typeVersion": 1.3,
      "position": [320, 520],
      "parameters": {
        "source": "database",
        "workflowId": { "__rl": true, "mode": "list", "value": "RUzNBpw8OMIWkvzN", "cachedResultName": "Reservas - Confirmación (Supabase)" },
        "workflowInputs": { "mappingMode": "defineBelow", "value": {}, "matchingColumns": [], "schema": [], "attemptToConvertTypes": false, "convertFieldsToString": true },
        "mode": "once",
        "options": { "waitForSubWorkflow": false }
      }
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "CONFIG - Cliente", "type": "main", "index": 0 }]] },
    "CONFIG - Cliente": { "main": [[{ "node": "Flatten + Base Fields", "type": "main", "index": 0 }]] },
    "Flatten + Base Fields": { "main": [[{ "node": "Get Servicio", "type": "main", "index": 0 }]] },
    "Get Servicio": { "main": [[{ "node": "Get Empleado", "type": "main", "index": 0 }]] },
    "Get Empleado": { "main": [[{ "node": "Get Horario Empleado", "type": "main", "index": 0 }]] },
    "Get Horario Empleado": { "main": [[{ "node": "Check Día Habilitado", "type": "main", "index": 0 }]] },
    "Check Día Habilitado": { "main": [[{ "node": "Switch Día", "type": "main", "index": 0 }]] },
    "Switch Día": { "main": [
      [{ "node": "Respond Día No Habilitado", "type": "main", "index": 0 }],
      [{ "node": "Build Slot", "type": "main", "index": 0 }]
    ] },
    "Build Slot": { "main": [[{ "node": "Get Turnos del día", "type": "main", "index": 0 }]] },
    "Get Turnos del día": { "main": [[{ "node": "Check Overlap", "type": "main", "index": 0 }]] },
    "Check Overlap": { "main": [[{ "node": "Switch", "type": "main", "index": 0 }]] },
    "Switch": { "main": [
      [{ "node": "Respond Ocupado", "type": "main", "index": 0 }],
      [{ "node": "Respond Confirmado", "type": "main", "index": 0 }]
    ] },
    "Respond Confirmado": { "main": [[{ "node": "Call Reservas - Confirmación", "type": "main", "index": 0 }]] }
  }
}
```

Notas sobre los cambios respecto al original:
- `Get Empleado` ahora conecta a `Get Horario Empleado` (antes conectaba directo a `Build Slot`).
- `Get Horario Empleado` tiene `"alwaysOutputData": true` — igual que `Get Turnos del día` — para que `Check Día Habilitado` se ejecute aunque no haya fila (0 resultados), y así el default sea "disponible todos los días".
- `Switch Día` → rama `Habilitado` conecta a `Build Slot`, retomando el flujo original sin cambios desde ahí.

- [ ] **Step 2: Commit**

```bash
git add n8n/workflows/WF1-recepcion-validacion.json
git commit -m "feat: version WF1 with per-employee weekday check before overlap validation"
```

---

### Task 4: Aplicar el WF1 actualizado al workflow real en n8n

**Files:** ninguno nuevo — se usa la API REST de n8n directamente (credenciales ya configuradas como MCP server `n8n-mcp` en este proyecto).

- [ ] **Step 1: Confirmar el ID del workflow live y que está activo**

```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://bairesstudio.app.n8n.cloud/api/v1/workflows/A1FUdToxhBHgoH5l" \
  | grep -o '"name":"[^"]*"\|"active":[a-z]*' | head -5
```

Expected: `"name":"Recepcion - Validación (Supabase)"` y `"active":true`.

- [ ] **Step 2: Armar el payload de actualización a partir del JSON versionado**

El endpoint `PUT /workflows/{id}` de n8n acepta `{ name, nodes, connections, settings }` (mismo patrón que usa `supabase/functions/clonar-workflows/index.ts`). Crear un script temporal `/tmp/update-wf1.mjs`:

```js
import { readFileSync } from 'node:fs';

const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://bairesstudio.app.n8n.cloud';
const WORKFLOW_ID = 'A1FUdToxhBHgoH5l';

const workflow = JSON.parse(readFileSync('n8n/workflows/WF1-recepcion-validacion.json', 'utf8'));

const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
  method: 'PUT',
  headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: { executionOrder: 'v1' },
  }),
});

if (!res.ok) {
  console.error('FAILED', res.status, await res.text());
  process.exit(1);
}
console.log('OK', (await res.json()).id);
```

- [ ] **Step 3: Ejecutar la actualización**

Run: `N8N_API_KEY=<api-key> node /tmp/update-wf1.mjs`
Expected: `OK A1FUdToxhBHgoH5l`

Si falla con 400, leer el mensaje de error completo (`res.text()`) — suele indicar qué nodo/parámetro no valida.

- [ ] **Step 4: Confirmar que el workflow sigue activo después del update**

```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://bairesstudio.app.n8n.cloud/api/v1/workflows/A1FUdToxhBHgoH5l" \
  | grep -o '"active":[a-z]*'
```

Expected: `"active":true`. Si dio `false` (el `PUT` puede desactivarlo), reactivar:

```bash
curl -s -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://bairesstudio.app.n8n.cloud/api/v1/workflows/A1FUdToxhBHgoH5l/activate"
```

- [ ] **Step 5: Borrar el script temporal**

```bash
rm /tmp/update-wf1.mjs
```

---

### Task 5: Verificación end-to-end contra el webhook real

Usa la fila de horario de prueba insertada en el Task 2 (Soledad: semana A lunes/miércoles/viernes desde el 2026-06-15, semana B martes/jueves/sábado).

**Files:** ninguno — solo curl contra el webhook de producción.

- [ ] **Step 1: Probar un día NO habilitado (debe rechazar)**

2026-06-16 es martes en semana A (Soledad no trabaja ese día según la config de prueba):

```bash
curl -s -X POST "https://bairesstudio.app.n8n.cloud/webhook/pajaro-loco-reservas" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Cliente", "phone": "+5491100000000", "email": "test@example.com",
    "date": "2026-06-16", "time": "10:00", "empleado": "Soledad",
    "service": "Baño", "tamano": "chico",
    "mascota_nombre": "Test", "mascota_raza": "Test"
  }'
```

Expected: `{"ok":false,"message":"Ese empleado no trabaja ese día, elegí otro día u otro profesional."}` con status 400.

- [ ] **Step 2: Probar un día habilitado (debe seguir el flujo normal)**

2026-06-15 es lunes en semana A (sí trabaja):

```bash
curl -s -X POST "https://bairesstudio.app.n8n.cloud/webhook/pajaro-loco-reservas" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Cliente", "phone": "+5491100000000", "email": "test@example.com",
    "date": "2026-06-15", "time": "10:00", "empleado": "Soledad",
    "service": "Baño", "tamano": "chico",
    "mascota_nombre": "Test", "mascota_raza": "Test"
  }'
```

Expected: `{"ok":true,"message":"Turno reservado con éxito."}` con status 200 (o el rechazo de "horario ocupado" si esa fecha/hora ya tiene un turno de prueba previo — en cualquier caso, NO debe ser el mensaje de "no trabaja ese día").

- [ ] **Step 3: Limpiar el turno de prueba creado**

Si el Step 2 dio `ok:true`, se creó un turno real. Pedirle al usuario que lo borre:

```sql
delete from turnos where nombre_cliente = 'Test Cliente';
```

- [ ] **Step 4: Limpiar la fila de horario de prueba (o dejarla si el usuario quiere el horario real de Soledad ya configurado)**

Preguntarle al usuario si la fila de horario insertada en el Task 2 es exactamente el horario real de Soledad. Si sí, dejarla. Si era solo de prueba con datos ficticios, borrarla:

```sql
delete from horarios_empleado where empleado_id = '<id-de-soledad>';
```

---

### Task 6: Panel admin — sección "Horario" por empleado

**Files:**
- Modify: `dashboard/src/pages/admin/AdminClienteDetalle.tsx`

- [ ] **Step 1: Agregar la interfaz `HorarioEmpleado` y la constante de días**

Agregar después de la interfaz `Empleado` existente (línea 15):

```tsx
interface HorarioEmpleado {
  id: string;
  empleado_id: string;
  fecha_referencia: string;
  dias_semana_a: string[];
  dias_semana_b: string[];
}

const DIAS: { value: string; label: string }[] = [
  { value: 'lunes', label: 'Lun' },
  { value: 'martes', label: 'Mar' },
  { value: 'miercoles', label: 'Mié' },
  { value: 'jueves', label: 'Jue' },
  { value: 'viernes', label: 'Vie' },
  { value: 'sabado', label: 'Sáb' },
  { value: 'domingo', label: 'Dom' },
];

function mismosDias(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((d, i) => d === sortedB[i]);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Agregar estado para horarios y el formulario**

Agregar junto a los demás `useState` del componente (después de `savingSvc`, línea 41):

```tsx
const [horarios, setHorarios] = useState<Record<string, HorarioEmpleado>>({});
const [editingHorarioFor, setEditingHorarioFor] = useState<string | null>(null);
const [horarioForm, setHorarioForm] = useState<{
  diasA: string[];
  diasB: string[];
  alterna: boolean;
  fechaReferencia: string;
}>({ diasA: [], diasB: [], alterna: false, fechaReferencia: hoyISO() });
const [savingHorario, setSavingHorario] = useState(false);
```

- [ ] **Step 3: Cargar horarios en `load()`**

Modificar la función `load` (líneas 48-59) para que, después de cargar empleados, busque sus horarios:

```tsx
async function load(clienteId: string) {
  setLoading(true);
  const [{ data: cl }, { data: emps }, { data: svcs }] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', clienteId).single(),
    supabase.from('empleados').select('*').eq('cliente_id', clienteId).order('nombre'),
    supabase.from('servicios').select('*').eq('cliente_id', clienteId).order('nombre'),
  ]);
  setCliente(cl);
  setEmpleados(emps ?? []);
  setServicios(svcs ?? []);

  const empIds = (emps ?? []).map(e => e.id);
  if (empIds.length > 0) {
    const { data: hors } = await supabase
      .from('horarios_empleado')
      .select('*')
      .in('empleado_id', empIds);
    const map: Record<string, HorarioEmpleado> = {};
    for (const h of hors ?? []) map[h.empleado_id] = h;
    setHorarios(map);
  } else {
    setHorarios({});
  }

  setLoading(false);
}
```

- [ ] **Step 4: Funciones para abrir el formulario y guardar**

Agregar después de `addEmpleado` (después de línea 70):

```tsx
function abrirHorario(empleadoId: string) {
  const existente = horarios[empleadoId];
  if (existente) {
    setHorarioForm({
      diasA: existente.dias_semana_a,
      diasB: existente.dias_semana_b,
      alterna: !mismosDias(existente.dias_semana_a, existente.dias_semana_b),
      fechaReferencia: existente.fecha_referencia,
    });
  } else {
    setHorarioForm({ diasA: [], diasB: [], alterna: false, fechaReferencia: hoyISO() });
  }
  setEditingHorarioFor(empleadoId);
}

function toggleDia(grupo: 'diasA' | 'diasB', dia: string) {
  setHorarioForm(f => {
    const actual = f[grupo];
    const nuevo = actual.includes(dia) ? actual.filter(d => d !== dia) : [...actual, dia];
    return { ...f, [grupo]: nuevo };
  });
}

async function guardarHorario(empleadoId: string) {
  setSavingHorario(true);
  const diasB = horarioForm.alterna ? horarioForm.diasB : horarioForm.diasA;
  await supabase.from('horarios_empleado').upsert(
    {
      empleado_id: empleadoId,
      fecha_referencia: horarioForm.fechaReferencia,
      dias_semana_a: horarioForm.diasA,
      dias_semana_b: diasB,
    },
    { onConflict: 'empleado_id' }
  );
  setSavingHorario(false);
  setEditingHorarioFor(null);
  if (id) load(id);
}
```

- [ ] **Step 5: Renderizar el botón "Horario" y el formulario en la lista de empleados**

Reemplazar el bloque de render de cada empleado (líneas 199-206):

```tsx
empleados.map(emp => (
  <div key={emp.id} className="px-4 py-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-900">{emp.nombre}</span>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2 py-0.5 text-xs ${emp.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {emp.activo ? 'Activo' : 'Inactivo'}
        </span>
        <button
          onClick={() => editingHorarioFor === emp.id ? setEditingHorarioFor(null) : abrirHorario(emp.id)}
          className="text-sm font-medium text-primary hover:text-primary-dark"
        >
          {horarios[emp.id] ? 'Horario' : 'Sin horario (todos los días)'}
        </button>
      </div>
    </div>

    {editingHorarioFor === emp.id && (
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {horarioForm.alterna ? 'Días - Semana A' : 'Días que trabaja'}
          </label>
          <div className="flex gap-1.5">
            {DIAS.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDia('diasA', d.value)}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  horarioForm.diasA.includes(d.value)
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 border border-gray-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={horarioForm.alterna}
            onChange={e => setHorarioForm(f => ({ ...f, alterna: e.target.checked }))}
          />
          ¿Alterna semanas? (semana A / semana B)
        </label>

        {horarioForm.alterna && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Días - Semana B</label>
              <div className="flex gap-1.5">
                {DIAS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDia('diasB', d.value)}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      horarioForm.diasB.includes(d.value)
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 border border-gray-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Fecha de referencia (un día que sabés que fue semana A)
              </label>
              <input
                type="date"
                value={horarioForm.fechaReferencia}
                onChange={e => setHorarioForm(f => ({ ...f, fechaReferencia: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => guardarHorario(emp.id)}
            disabled={savingHorario || horarioForm.diasA.length === 0}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {savingHorario ? '...' : 'Guardar horario'}
          </button>
          <button
            type="button"
            onClick={() => setEditingHorarioFor(null)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    )}
  </div>
))
```

- [ ] **Step 6: Levantar el dashboard y probar manualmente**

Run: `cd dashboard && npm run dev`

En el navegador, ir a `/admin/clientes/<id-de-pajaro-loco>`:
1. Click en "Sin horario (todos los días)" junto a Soledad → debe abrir el formulario vacío.
2. Tildar Lun/Mié/Vie → click "Guardar horario" → debe cerrar el form y el botón debe cambiar a "Horario".
3. Volver a abrirlo → debe mostrar Lun/Mié/Vie tildados y el toggle "¿Alterna semanas?" desactivado.
4. Tildar el toggle, marcar Mar/Jue/Sáb en Semana B, elegir una fecha de referencia, guardar → reabrir y confirmar que persistió todo correctamente.

Expected: sin errores en la consola del navegador, los datos persisten en Supabase (verificable con `select * from horarios_empleado;`).

- [ ] **Step 7: Commit**

```bash
git add dashboard/src/pages/admin/AdminClienteDetalle.tsx
git commit -m "feat: add per-employee schedule config to admin panel"
```

---

### Task 7: Actualizar documentación

**Files:**
- Modify: `docs/pendientes/schedule-semanas-alternas.md`

- [ ] **Step 1: Marcar el pendiente como resuelto**

Agregar al principio del archivo, después del título:

```markdown
> **Resuelto** el 2026-06-18. Ver spec en `docs/superpowers/specs/2026-06-18-horarios-semanas-alternas-design.md`
> y plan en `docs/superpowers/plans/2026-06-18-horarios-semanas-alternas.md`.
> El diseño final es por empleado (no por cliente) — ver esos documentos para el detalle.
```

- [ ] **Step 2: Commit**

```bash
git add docs/pendientes/schedule-semanas-alternas.md
git commit -m "docs: mark schedule-semanas-alternas pendiente as resolved"
```

---

## Spec coverage check

- Esquema `horarios_empleado` → Task 1.
- Cálculo de paridad de semana → Task 2 (validado en aislado) + Task 3 (mismo código en n8n).
- Validación en WF1 antes de `Get Turnos del día` → Task 3 + Task 4.
- Aplicado al workflow real (no solo JSON) → Task 4.
- Verificación end-to-end del rechazo y la aceptación → Task 5.
- Panel admin por empleado con horario fijo o alternado → Task 6.
- Documentación del pendiente actualizada → Task 7.
