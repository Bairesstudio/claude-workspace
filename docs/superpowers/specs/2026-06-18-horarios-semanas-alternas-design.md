# Horarios por empleado con semanas alternas (A/B)

Fecha: 2026-06-18

## Contexto

Pendiente documentado en `docs/pendientes/schedule-semanas-alternas.md`. Pajaro Loco (Soledad, única empleada hoy) trabaja en semanas alternadas: semana A lunes/miércoles/viernes, semana B martes/jueves/sábado.

El doc pendiente asumía que el problema ya estaba resuelto vía bloqueos recurrentes en Google Calendar. Al revisar el WF1 real en n8n (`Recepcion - Validación (Supabase)`, id `A1FUdToxhBHgoH5l`) se confirmó que **no existe ningún chequeo de día de semana ni de calendario** — WF1 solo valida superposición horaria contra la tabla `turnos`. Hoy nada impide reservar a un empleado un día que no trabaja.

El diseño se generaliza a **por empleado** (no por cliente entero), pensando tanto en el caso actual (Soledad sola) como en clientes futuros con varios empleados de turnos rotativos (común en barberías/peluquerías).

## Alcance

Incluye:
- Esquema Supabase para horario por empleado (fijo o semanas alternas A/B).
- Validación en WF1 que rechaza la reserva si el empleado no trabaja ese día.
- Sección en el panel admin para configurar el horario de cada empleado.
- Aplicación del cambio directamente sobre el WF1 real en n8n (vía API), no solo en el JSON versionado en el repo.

Fuera de alcance (queda documentado para retomar después):
- Endpoint de disponibilidad en tiempo real y cambios en el formulario de Lovable para filtrar el dropdown de empleados según el día seleccionado. Por ahora la validación ocurre al enviar la reserva, igual patrón que el chequeo de "horario ocupado" existente.
- Horarios con franjas horarias dentro del día (ej. "trabaja de 9 a 13hs"). Hoy solo se valida día de la semana, no horario de apertura/cierre.

## 1. Esquema de base de datos

Nueva tabla `horarios_empleado`, una fila por empleado (relación 1:1):

```sql
create table horarios_empleado (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade unique,
  fecha_referencia date not null,   -- una fecha conocida en la que aplicaba "semana A"
  dias_semana_a text[] not null,    -- ej: ['lunes','miercoles','viernes']
  dias_semana_b text[] not null,    -- ej: ['martes','jueves','sabado']; igual a dias_semana_a si el horario es fijo (no alterna)
  created_at timestamptz not null default now()
);
```

Reglas:
- **Sin fila para un empleado** → disponible todos los días (comportamiento actual, sin restricción). Activar el feature es opt-in por empleado.
- **Horario fijo (no alterna)** → `dias_semana_a` y `dias_semana_b` con el mismo contenido. Un solo mecanismo cubre ambos casos.
- Días en español, minúscula, sin acentos: `'lunes'`, `'martes'`, `'miercoles'`, `'jueves'`, `'viernes'`, `'sabado'`, `'domingo'`.
- `fecha_referencia` es cualquier fecha conocida de semana A (no tiene que ser lunes ni la fecha actual). Sirve solo como ancla para calcular paridad.

## 2. Cálculo de paridad de semana

Dada `fecha_turno` y `fecha_referencia` de la fila de `horarios_empleado`:

1. Calcular el lunes de la semana calendario de cada fecha (ISO, lunes a domingo).
2. `diferencia_semanas = (lunes_fecha_turno - lunes_fecha_referencia) / 7` (división entera de días).
3. Si `diferencia_semanas` es par → semana A (usar `dias_semana_a`). Si es impar → semana B (usar `dias_semana_b`).
4. Verificar si el día de la semana de `fecha_turno` está incluido en el array correspondiente.

Este cálculo es independiente del huso horario del servidor: se trabaja únicamente con fechas (`date`), no con horas.

## 3. Validación en WF1 (n8n)

Flujo actual relevante: `... → Get Empleado → Build Slot → Get Turnos del día → Check Overlap → Switch → Respond`

Cambio: entre `Get Empleado` y `Build Slot` se inserta:

```
Get Empleado
  → Get Horario Empleado   (Supabase SELECT horarios_empleado WHERE empleado_id = <id de Get Empleado>)
  → Check Día Habilitado   (Code: si no hay fila → habilitado=true;
                              si hay fila → calcula paridad de semana (sección 2) y chequea
                              si el día de fecha_turno está en el array correspondiente)
  → Switch Día
       No habilitado → Respond 400 { ok: false, message: "Ese empleado no trabaja ese día, elegí otro día u otro profesional." }
       Habilitado    → Build Slot → Get Turnos del día → Check Overlap → ... (flujo existente sin cambios)
```

Chequear el día primero (antes de `Get Turnos del día`) evita una query innecesaria a `turnos` cuando la reserva ya es inválida por día.

**Aplicación del cambio:** se modifica directamente el workflow real en n8n (`Recepcion - Validación (Supabase)`, id `A1FUdToxhBHgoH5l`) vía la API de n8n (ya configurada como MCP server `n8n-mcp` en este proyecto). Como este workflow es la plantilla fuente que `clonar-workflows` (Edge Function) clona para cada cliente nuevo, el chequeo de día queda disponible automáticamente para todos los clientes futuros, no solo para Pajaro Loco.

## 4. Panel admin (dashboard)

En `dashboard/src/pages/admin/AdminClienteDetalle.tsx`, sección Empleados: cada fila de empleado suma un botón **"Horario"** (mismo patrón visual que el botón "Agregar" de Servicios) que despliega un formulario inline:

- Checkboxes de los 7 días para **Semana A** (o "horario" único si no alterna).
- Toggle **"¿Alterna semanas?"**:
  - Desactivado (default): solo se muestran los checkboxes de un horario único. Al guardar, `dias_semana_a = dias_semana_b` con esos días.
  - Activado: aparecen checkboxes adicionales para **Semana B** y un selector de fecha **"Fecha de referencia (semana A)"**.
- Si el empleado no tiene fila en `horarios_empleado`, el botón muestra "Sin horario configurado (disponible todos los días)" y al hacer click arranca el formulario vacío.
- Guardar hace upsert en `horarios_empleado` (insert si no existe, update si ya existe, por `empleado_id`).

## Testing

- Caso sin horario configurado: reserva en cualquier día se comporta igual que hoy (sin restricción).
- Caso horario fijo (A = B): reserva en día incluido pasa: reserva en día no incluido se rechaza con el mensaje nuevo.
- Caso semanas alternas: reservar el mismo día de la semana en dos semanas consecutivas debe dar resultados opuestos (una habilitada, otra rechazada), validando el cálculo de paridad.
- Verificar que el chequeo de día corre antes de la query de `turnos` (no se ejecuta `Get Turnos del día` cuando el día ya está bloqueado).
