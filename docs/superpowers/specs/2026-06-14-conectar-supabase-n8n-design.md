# Conectar Supabase a los workflows de n8n (tarea #4)

Fecha: 2026-06-14

## Contexto

El esquema de Supabase (`sheets/schema-supabase.sql`, `sheets/migracion-tamano-perro.sql`, `sheets/seed-pajaro-loco.sql`) ya está cargado con datos de **Pajaro Loco Pet Store** (cliente real, rubro peluquería canina).

Los 3 workflows existentes en n8n (`Recepcion - Validación`, `Reservas - Confirmación`, `Resumen Mensual - Mail Dueño`) pertenecen a un cliente anterior (genérico/Pilates-barbería) y usan Google Sheets como base de datos.

Esta tarea reescribe los 3 workflows para:
1. Reemplazar Google Sheets por Supabase (tablas `clientes`, `empleados`, `servicios`, `turnos`).
2. Adaptar la lógica al rubro canino de Pajaro Loco (campos de mascota y tamaño).

Esto combina la tarea #4 (conectar Supabase) con la tarea #6 (adaptación a peluquería canina) del documento de continuidad.

## Arquitectura general

- Cliente activo: **Pajaro Loco**, resuelto al inicio de cada workflow vía `SELECT * FROM clientes WHERE slug = 'pajaro-loco'`. Deja la puerta abierta a multi-cliente futuro (cambiar el slug o resolverlo dinámicamente).
- Google Calendar y Gmail se mantienen sin cambios estructurales (solo se actualizan los campos disponibles, ej. datos de mascota).
- Se usa el nodo nativo **Supabase** de n8n contra el proyecto ya conectado.
- Credencial de n8n: "Supabase - Baires Studio" (Project URL + service_role key), a crear por el usuario en n8n.

## Contrato de datos del formulario Lovable (Pajaro Loco)

El formulario todavía no existe. Define el payload que debe enviar el webhook:

| Campo | Tipo | Ejemplo | Nota |
|---|---|---|---|
| `name` | string | "Juana Pérez" | dueño/a del animal |
| `phone` | string | "+54911..." | |
| `email` | string | "juana@mail.com" | |
| `date` | string | "2026-06-20" | fecha turno (YYYY-MM-DD) |
| `time` | string | "14:30" | hora turno (HH:mm, 24hs) |
| `empleado` | string | "Soledad" | nombre del empleado |
| `service` | string | "Baño y corte" | se normaliza a `nombre_normalizado` de `servicios` |
| `tamano` | string | "chico" \| "mediano" \| "grande" | tamaño del perro |
| `mascota_nombre` | string | "Rocky" | |
| `mascota_raza` | string | "Caniche" | |
| `observaciones` | string | "Es nervioso con el secador" | opcional |
| `message` | string | "" | mensaje libre opcional |

La normalización de `service` es la misma que ya existe (minúsculas, sin acentos NFD, espacios → `_`). La combinación `(nombre_normalizado, tamano)` busca la fila exacta en `servicios` de Pajaro Loco para obtener `precio` y `duracion_minutos`.

## WF1 - Recepción - Validación

```
Webhook
  → CONFIG - Cliente        (Supabase SELECT clientes WHERE slug='pajaro-loco')
  → Merge                   (combina datos del cliente con el payload del webhook)
  → Flatten + Base Fields   (normaliza payload: datos del dueño, mascota, tamaño, servicio, fecha/hora)
  → Get Servicio            (Supabase SELECT servicios WHERE cliente_id=X AND nombre_normalizado=... AND tamano=...)
  → Get Empleado            (Supabase SELECT empleados WHERE cliente_id=X AND nombre=...)
  → Build Slot              (Code: calcula inicio_minutos, fin_minutos, duracion_minutos, precio_servicio
                              a partir de `time` (HH:mm) y los datos de Get Servicio. Reemplaza el slot_id
                              de texto y el parsing de horas AM/PM del original.)
  → Get Turnos del día      (Supabase SELECT turnos WHERE cliente_id=X AND empleado_id=Y AND fecha=Z
                              AND estado='confirmado')
  → Check Overlap           (Code: nuevo_inicio < existente_fin AND nuevo_fin > existente_inicio,
                              comparando inicio_minutos/fin_minutos numéricos directos)
  → Switch (Occupied / Free)
       Occupied → Respond 400 { ok: false, message: "Ese horario ya está ocupado, elegí otro." }
       Free     → Respond 200 { ok: true, message: "Turno reservado con éxito." }
                  + Call WF2 (pasa cliente_id, empleado_id, servicio_id, precio_servicio, duracion_minutos,
                              fecha, inicio_minutos, fin_minutos, datos del dueño y la mascota)
```

Cambios respecto al original:
- Se elimina `slot_id` y el parsing de horas en texto (AM/PM, formatos de fecha variados): el form de Lovable manda `date` en `YYYY-MM-DD` y `time` en `HH:mm`.
- El filtro de overlap se hace en la query a Supabase (por `cliente_id`, `empleado_id`, `fecha`, `estado`), aprovechando el índice `idx_turnos_overlap`. Resuelve el pendiente de performance (sección 10 del doc de continuidad).
- El Code de overlap se simplifica a comparación numérica de minutos.

## WF2 - Reservas - Confirmación

```
When Executed by Another Workflow (recibe payload resuelto de WF1)
  → Insert Turno         (Supabase INSERT en `turnos`: cliente_id, empleado_id, servicio_id, nombre_cliente,
                           telefono, email, fecha, inicio_minutos, fin_minutos, duracion_minutos,
                           precio_servicio, estado='confirmado', mascota_nombre, mascota_raza,
                           mascota_tamano, observaciones. Devuelve la fila insertada con su `id`.)
  → Create an event       (Google Calendar, igual que antes: start/end desde fecha + inicio_minutos/duracion_minutos)
  → Update Turno          (Supabase UPDATE turnos SET calendar_event_id=... WHERE id=<id de Insert Turno>)
  → Mail Cliente           (Gmail: incluye datos de mascota - nombre, raza, tamaño)
  → Mail Dueño             (Gmail: idem)
```

Cambios respecto al original:
- `Append row in sheet` → `Insert Turno` (Supabase).
- Se agrega `Update Turno` para guardar `calendar_event_id` (resuelve pendiente de la sección 10).
- Los mails incorporan los campos de mascota.

## WF3 - Resumen Mensual - Mail Dueño

```
Schedule Trigger (día 1 de cada mes, 08:00) — sin cambios
  → CONFIG - Cliente       (Supabase SELECT clientes WHERE slug='pajaro-loco') → cliente_id, mail_dueno
  → Get Turnos del mes     (Supabase SELECT turnos WHERE cliente_id=X AND estado='confirmado'
                             AND fecha >= <inicio mes anterior> AND fecha <= <fin mes anterior>)
  → Get Servicios          (Supabase SELECT servicios WHERE cliente_id=X) — mapa servicio_id → nombre
  → Calcular métricas      (Code: misma lógica de cantidad/total/desglose, pero el filtrado de mes ya
                             viene hecho por la query SQL, y el desglose usa nombres reales de servicio
                             vía el mapa servicio_id → nombre)
  → Mail Dueño - Resumen   (Gmail: usa mail_dueno de CONFIG en vez de placeholder)
```

## Fuera de alcance

- Formulario real en Lovable (queda documentado el contrato de payload para cuando se construya).
- Multi-cliente dinámico (slug fijo en `pajaro-loco` por ahora).
- WhatsApp, recordatorios, cancelaciones, calendarios por empleado (roadmap de mediano/largo plazo).
