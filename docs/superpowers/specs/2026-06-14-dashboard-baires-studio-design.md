# Dashboard Baires Studio — "Sitio 2" (diseño)

## Contexto

Baires Studio vende automatización de turnos a negocios locales. El stack actual:

```
Lovable (form reserva) → webhook → n8n Cloud → Supabase (Postgres) → Google Calendar + Gmail
```

El cliente beta es un local de baño canino ("Pajaro Loco"). Ya existen 5 workflows activos en n8n:

1. Validación de overlap al recibir una reserva (Lovable → webhook).
2. Confirmación: crea turno + evento de Calendar + mails (cliente y dueño).
3. Resumen mensual al dueño (cron, agrupa por servicio/empleado).
4. **Cancelar Turno (Panel)** — webhook `/pajaro-loco-cancelar-turno`, recibe `{ turno_id }`.
5. **Modificar Turno (Panel)** — webhook `/pajaro-loco-modificar-turno`, recibe `{ turno_id, fecha, hora }`, responde 400 + `{ ok:false, message }` si el nuevo horario está ocupado, o 200 + `{ ok:true, message }` si se reprogramó.

Sitio 2 es el dashboard que usará el dueño del local para ver sus turnos y métricas, y para cancelar/reprogramar turnos. El dueño nunca accede a n8n ni a Supabase directamente.

## Objetivo

Una SPA privada, de un solo cliente (Pajaro Loco) por ahora pero con datos ya modelados multi-tenant, que:

- Muestra los turnos de **hoy**, **próximos** e **historial**.
- Muestra **métricas** del mes (facturación, desglose por servicio y empleado).
- Permite **cancelar** y **reprogramar** turnos desde la propia lista, sin tocar n8n/Supabase a mano.

## Arquitectura

```
┌─────────────────────────────┐
│   Dashboard (React SPA)      │
│                               │
│  Lectura ──────► Supabase     (anon key + RLS, solo SELECT)
│  Acciones ─────► n8n webhooks (cancelar / modificar turno)
└─────────────────────────────┘
```

- **Lectura**: el dashboard consulta Supabase directo (cliente JS, anon key) para `turnos`, `servicios`, `empleados`, igual que cualquier sitio que lee su propia base. RLS limita el acceso a SELECT sobre las tablas necesarias.
- **Escritura (cancelar/modificar)**: el dashboard **no** escribe en Supabase. Llama a los webhooks de n8n ya activos, que son los dueños de la lógica de negocio (re-chequeo de overlap, actualización de Calendar, envío de mails). Esto evita duplicar esa lógica en el frontend.
- **`cliente_id`**: se resuelve una vez al cargar la app, consultando `clientes` por `slug = 'pajaro-loco'` (mismo patrón que usan los workflows de n8n). Se cachea en memoria para el resto de la sesión. Esto deja el código listo para que, en el futuro multi-tenant, el slug sea parte de la URL o de la sesión del usuario en lugar de una constante.

## Stack

- **React + Vite + TypeScript + Tailwind CSS**. SPA liviana, build estático, fácil de deployar (Vercel/Netlify).
- **Recharts** para los gráficos de métricas.
- **Supabase JS client** (`@supabase/supabase-js`) para lectura.
- **`magic` MCP** + skills `frontend-design` / `ui-ux-pro-max` / `design-system` / `ui-styling` / `web-design-guidelines` para construir los componentes y aplicar buenas prácticas de UX/accesibilidad.

## Modelo de datos (Supabase, ya existente)

No se modifica el schema. Campos relevantes para el dashboard, según lo usado por los workflows de n8n:

**`clientes`**: `id`, `slug`, `nombre`, `mail_dueno`.

**`turnos`**: `id`, `cliente_id`, `empleado_id`, `servicio_id`, `fecha` (date), `hora`, `inicio_minutos`, `fin_minutos`, `duracion_minutos`, `estado` (`confirmado` | `cancelado`), `precio_servicio`, `email`, `nombre_cliente`, `mascota_nombre`, `mascota_raza`, `mascota_tamano`, `calendar_event_id`.

**`servicios`**: `id`, `cliente_id`, `nombre` (+ precio, usado para mostrar el servicio).

**`empleados`**: `id`, `cliente_id`, `nombre`.

El dashboard hace `select` con joins/lookups simples para resolver `servicio_id` → nombre y `empleado_id` → nombre al mostrar cada turno.

## Vistas / Páginas

Layout: barra lateral de navegación + contenido principal. Cuatro secciones:

1. **Hoy** — turnos con `fecha = hoy` y `estado = confirmado`, ordenados por hora. Cada fila: hora, mascota (nombre/raza/tamaño), cliente, servicio, empleado, y botones **Cancelar** / **Reprogramar**.
2. **Próximos** — turnos con `fecha > hoy` y `estado = confirmado`, agrupados por fecha (agenda). Mismas acciones que Hoy.
3. **Historial** — turnos con `fecha < hoy` (cualquier estado), agrupados por fecha, mostrando un badge de estado (confirmado/cancelado). Sin acciones.
4. **Métricas** — resumen del mes en curso (o selector de mes): facturación total, gráfico de barras por servicio (cantidad y monto) y por empleado (cantidad y monto). Calculado client-side a partir de los turnos `confirmado` del rango de fechas, replicando la lógica de WF3.

## Flujos de acción

**Cancelar**:
1. Click en "Cancelar" → modal de confirmación con el detalle del turno.
2. Confirmar → `POST /pajaro-loco-cancelar-turno` con `{ turno_id }`.
3. Mientras responde, el botón muestra estado de carga.
4. Si `ok:true` → cerrar modal, refrescar la lista (refetch de Supabase) y mostrar un toast de éxito.
5. Si falla (red, 5xx) → mostrar error en el modal, no cerrar, permitir reintentar.

**Reprogramar**:
1. Click en "Reprogramar" → modal con selector de fecha y hora (prellenado con los valores actuales).
2. Confirmar → `POST /pajaro-loco-modificar-turno` con `{ turno_id, fecha, hora }`.
3. Si `ok:false` (horario ocupado, status 400) → mostrar el `message` del backend dentro del modal, el usuario elige otro horario sin cerrar el modal.
4. Si `ok:true` → cerrar modal, refrescar lista, toast de éxito.
5. Error de red/5xx → mismo manejo que cancelar.

## Autenticación

Acceso por **link privado + contraseña compartida**: pantalla de login simple que valida contra una contraseña configurada por variable de entorno (`VITE_DASHBOARD_PASSWORD`), guarda la sesión en `sessionStorage` y muestra el dashboard. No es un control de seguridad fuerte (la contraseña queda en el bundle del cliente) — es un filtro contra acceso casual al link.

El control de seguridad real es **RLS en Supabase**: la `anon key` solo puede hacer `SELECT` sobre `turnos`, `servicios`, `empleados`, `clientes`, filtrado a nivel de fila si se quiere reforzar por `cliente_id`. Ninguna tabla permite `INSERT`/`UPDATE`/`DELETE` desde el cliente — esas operaciones siguen pasando exclusivamente por los webhooks de n8n.

Cuando se pase a multi-tenant real, esto se reemplaza por Supabase Auth (un usuario por cliente, RLS por `auth.uid()` → `cliente_id`). Fuera de alcance de este proyecto.

## Manejo de errores

- **Carga inicial de datos**: spinner por sección; si falla la consulta a Supabase, mensaje de error con botón "Reintentar".
- **`cliente_id` no resuelve** (slug no encontrado): pantalla de error general, ya que nada puede mostrarse sin esto.
- **Acciones (cancelar/modificar)**: errores se muestran dentro del modal de la acción, sin afectar el resto de la pantalla. Los webhooks de n8n ya devuelven mensajes legibles (`message`) para el caso "ocupado".
- **Sin turnos**: estados vacíos con texto amigable ("No hay turnos para hoy") en cada sección.

## Testing

- Proyecto frontend-only, sin backend propio: testing manual en navegador (`npm run dev`) cubriendo:
  - Las 4 vistas cargan datos reales desde Supabase.
  - Cancelar un turno de prueba → verificar que desaparece de "Hoy"/"Próximos", llega el mail, se borra el evento de Calendar.
  - Reprogramar un turno de prueba a un horario libre → se mueve correctamente; a un horario ocupado → muestra el error sin romper la UI.
  - Estados vacíos y de error (probar con `cliente_id` inválido temporalmente).
- Opcional, si el tiempo lo permite: tests unitarios con Vitest para las funciones de cálculo de métricas (agrupación por servicio/empleado), que son lógica pura y fácil de testear sin mocks pesados.

## Configuración / variables de entorno

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_N8N_BASE_URL=https://bairesstudio.app.n8n.cloud/webhook
VITE_CLIENTE_SLUG=pajaro-loco
VITE_DASHBOARD_PASSWORD=...
```

## Fuera de alcance

- Multi-tenant real (selección de cliente, Supabase Auth por usuario).
- Edición de `servicios`/`empleados`/precios desde el dashboard.
- Creación manual de turnos desde el dashboard (eso sigue siendo vía Lovable/WF1-2).
- Notificaciones push/realtime (el dashboard se actualiza por refetch tras cada acción, no por suscripción en vivo).

## Ubicación del proyecto

Nuevo directorio `dashboard/` en la raíz de este repo, en la branch `dashboard-baires-studio`. El `package.json` raíz actual (proyecto de práctica de git/PRs) no se modifica.
