# Panel de cliente (tarea 11.2 del roadmap)

Fecha: 2026-06-14

## Contexto

El roadmap (`docs/proyecto-baires-studio.md`, sección 11.2 "Panel simple para los negocios") pide darle al dueño/a de cada negocio un panel propio para ver sus turnos y métricas sin depender del equipo — esto reemplaza lo que hoy se mira "a mano" en la sheet.

Primer cliente real: **Pajaro Loco Pet Store**, vía `/panel/pajaro-loco` (URL ya prevista en el comentario de `clientes.slug` en `schema-supabase.sql`).

Mockup de referencia (aprobado): [docs/mockups/panel-pajaro-loco.html](../../mockups/panel-pajaro-loco.html) — estilo "SSJ3" (fondo casi negro, acentos dorados con glow, tipografía Russo One + Inter).

Relación con [2026-06-14-conectar-supabase-n8n-design.md](2026-06-14-conectar-supabase-n8n-design.md): el panel lee y escribe Supabase **directo desde Lovable**, no pasa por n8n (salvo para cancelar turnos, ver más abajo) — se puede construir en paralelo a la migración de WF1-3. Sí depende de que `turnos` tenga datos reales: hasta que WF2 escriba en Supabase, el panel muestra datos vacíos o de prueba (los del seed).

Nota de alcance: la otra spec deja "cancelaciones" fuera de alcance refiriéndose al flujo *del cliente final* (cancelar desde el mail de confirmación, roadmap mediano plazo). Esta spec cubre cancelar *desde el panel* (acción de la dueña/empleada) — un flujo distinto, aunque comparten el mecanismo de fondo.

## Contenido y layout (aprobado vía mockup)

Una sola página con scroll, nav superior con anchors. Contenido:

1. **Header**: nombre del negocio (`clientes.nombre`), saludo a la empleada, fecha de hoy.
2. **Turnos**: pestañas *Próximos* / *Historial*, agrupados por fecha. Cada fila: hora, mascota (nombre + raza + badge de tamaño), dueño/a, servicio, precio, observaciones. En *Próximos*, botón "Cancelar" por fila. En *Historial*, badge "Confirmado" / "Cancelado".
3. **Métricas del mes**: cards de turnos totales y facturación estimada, + desglose por servicio con barras proporcionales (misma lógica que WF3, pero del mes en curso en vez del mes cerrado).
4. **Servicios y precios**: tabla servicio × tamaño con precio editable + botón "Guardar cambios".

Estilo visual: fondo casi negro (`#0b0b0d`) con glow radial dorado/naranja, acentos `#ffc400` / `#ff9100`, tipografía Russo One (títulos/números) + Inter (texto), badges de tamaño codificados por color (chico=verde, mediano=dorado, grande=rojo). El HTML del mockup es la referencia visual completa para Lovable.

## Arquitectura y datos

Resolución de cliente (mismo patrón que los workflows): `select id, nombre, mail_dueno from clientes where slug = 'pajaro-loco'` → `cliente_id`.

Lovable habla con Supabase directo (vía `anon` key + RLS, ver sección siguiente) para **todas las lecturas** y para **editar precios**. La única excepción es **cancelar turno**, que pasa por un webhook de n8n nuevo porque tiene un efecto en Google Calendar.

| Sección | Query | Notas |
|---|---|---|
| Turnos · Próximos | `select * from turnos where cliente_id=:id and fecha >= :hoy and estado='confirmado' order by fecha, inicio_minutos` | Agrupar por `fecha` en el frontend para los headers de fecha |
| Turnos · Historial | `select * from turnos where cliente_id=:id and fecha < :hoy order by fecha desc, inicio_minutos` | Incluye `confirmado` y `cancelado`, cada uno con su badge |
| Métricas del mes | `select * from turnos where cliente_id=:id and estado='confirmado' and fecha between :inicio_mes and :fin_mes` | `:inicio_mes`/`:fin_mes` = mes en curso (no el mes anterior como WF3) |
| Desglose por servicio | join con `servicios` por `servicio_id`, agrupar por `servicios.nombre` | "Baño y corte" existe 3 veces en `servicios` (una por tamaño) pero debe sumarse como una sola fila — agregación client-side en Lovable, igual que el Code de WF3 pero corriendo en el browser |
| Servicios y precios | `select * from servicios where cliente_id=:id order by nombre, tamano` | |

### Cancelar turno → WF4 (nuevo)

`turnos.calendar_event_id` existe justo para esto (agregado en la otra spec). Si el panel hiciera `update turnos set estado='cancelado'` directo, el evento quedaría activo en el calendario de Soledad.

```
WF4 - Cancelar turno (panel)
  Webhook (recibe turno_id)
    → Get Turno      (Supabase SELECT turnos WHERE id=:turno_id, trae calendar_event_id)
    → Update Turno   (Supabase UPDATE turnos SET estado='cancelado' WHERE id=:turno_id)
    → Delete event   (Google Calendar, borra calendar_event_id si no es null)
    → Respond 200 { ok: true }
```

Implementado: WF4 está creado y publicado en n8n como "Cancelar Turno (Panel)".
Webhook: `POST https://bairesstudio.app.n8n.cloud/webhook/pajaro-loco-cancelar-turno`
con body `{ "turno_id": "<uuid>" }`, responde `{ "ok": true }`. Esta es la URL
que debe usar el botón "Cancelar" del panel (Lovable).

Manejo de errores: Supabase es la fuente de verdad. Si `Update Turno` tiene éxito pero `Delete event` falla (ej. el evento ya no existe), el turno queda igual marcado `cancelado` — el borrado de Calendar es best-effort y no revierte el estado. Si `Update Turno` falla, se responde error y el panel no marca la fila como cancelada (muestra un toast de error y deja el botón "Cancelar" activo).

En el panel, el botón "Cancelar" pide confirmación (ej. modal "¿Cancelar el turno de Rocky a las 10:00?") antes de llamar al webhook — el mockup no la tiene por simplicidad, pero la versión real sí.

### Editar precio → directo

`update servicios set precio=:nuevo_precio where id=:servicio_id and cliente_id=:id`, sin dependencias externas, no pasa por n8n.

## Acceso y seguridad

Hasta ahora Supabase solo lo toca n8n con la `service_role` key (server-side, sin RLS). El panel lo toca Lovable **client-side** con la `anon` key, y tiene escritura (editar precio directo, cancelar vía WF4) — hace falta acotar esto con RLS.

**Recomendación para v1** (un solo cliente real):
- Habilitar RLS en `turnos`, `servicios` y `clientes`.
- Políticas de `select`/`update` que solo permiten operar sobre filas donde `cliente_id = '<uuid de Pajaro Loco>'` (valor fijo en la policy — mismo patrón que el slug fijo `'pajaro-loco'` en `CONFIG - Cliente` de los workflows).
- WF4 sigue usando `service_role` desde n8n, no se ve afectado por RLS.

Suficiente para el caso actual (1 cliente real) sin construir login. Queda como deuda para "Onboarding multi-cliente" (sección 11.3 del roadmap): con más clientes, las políticas deben volverse dinámicas (idealmente Supabase Auth, un usuario por cliente).

Riesgo aceptado y documentado: quien conozca la URL `/panel/pajaro-loco` y la `anon` key del proyecto podría cancelar turnos o cambiar precios de Pajaro Loco (no de otros clientes, gracias a RLS). Tolerable para un solo cliente real de bajo perfil; revisar antes de sumar el segundo cliente.

## Cómo probarlo

- Datos de prueba ya existen vía `sheets/seed-pajaro-loco.sql`.
- Lovable: apuntar el preview al mismo proyecto Supabase y verificar las 4 secciones contra esos datos.
- WF4: probar con el trigger manual de n8n pasando un `turno_id` real, confirmar que `turnos.estado` cambia a `cancelado` y que el evento desaparece del Google Calendar de Soledad.

## Prompt para Lovable

```
Creá una página nueva en la ruta /panel/pajaro-loco para "Pájaro Loco Pet Store":
un panel privado donde la dueña ve sus turnos, métricas y precios. Una sola
página con scroll y nav superior con anchors a Turnos / Métricas / Servicios.

ESTILO VISUAL (estilo de marca de Baires Studio, "SSJ3"):
- Fondo casi negro (#0b0b0d) con un resplandor radial dorado/naranja sutil de fondo
- Acentos dorados #ffc400 y #ff9100, con glow (box-shadow) en cards y elementos activos
- Tipografía "Russo One" (Google Fonts) para títulos, números grandes y botones;
  "Inter" para texto general
- Texto principal claro (#f5f5f0) sobre fondo oscuro
- Badges de tamaño de perro: chico=verde (#7CE2A6), mediano=dorado (#FFC400),
  grande=rojo (#FF6B6B)
- Referencia visual completa: mockup HTML adjunto (panel-pajaro-loco.html)

DATOS: proyecto Supabase ya conectado, tablas clientes, empleados, servicios, turnos.
Resolver primero cliente_id con:
  select id, nombre, mail_dueno from clientes where slug = 'pajaro-loco'

SECCIONES:

1. Header
   - Nombre del negocio (clientes.nombre)
   - Saludo a la empleada + fecha de hoy

2. Turnos (pestañas "Próximos" / "Historial")
   - Próximos: turnos where cliente_id=X and fecha >= hoy and estado='confirmado',
     ordenados por fecha e inicio_minutos, agrupados visualmente por fecha
     (encabezado "Hoy", "Mañana", o la fecha)
   - Cada fila: hora (desde inicio_minutos), mascota_nombre + mascota_raza + badge
     de mascota_tamano, nombre_cliente, nombre del servicio, precio_servicio,
     observaciones si existe
   - Cada fila de Próximos tiene un botón "Cancelar": pide confirmación
     (ej. "¿Cancelar el turno de Rocky a las 10:00?"), y si se confirma hace
     POST a https://bairesstudio.app.n8n.cloud/webhook/pajaro-loco-cancelar-turno
     con body { "turno_id": "<id del turno>" }; si responde { ok: true },
     marcar la fila como cancelada visualmente; si falla, mostrar error y no
     cambiar nada
   - Historial: turnos where cliente_id=X and fecha < hoy, orden desc, mismo
     formato de fila pero con badge "Confirmado" o "Cancelado" según
     turnos.estado, sin botón de acción

3. Métricas del mes
   - Turnos confirmados del mes en curso (cliente_id=X, estado='confirmado',
     fecha entre el primer y último día del mes actual)
   - Card "Turnos del mes": cantidad total
   - Card "Facturación estimada": suma de precio_servicio
   - Desglose por servicio: agrupar por servicios.nombre (join turnos.servicio_id
     -> servicios.id), mostrar cantidad de turnos, total facturado y una barra
     proporcional al % del total

4. Servicios y precios
   - servicios where cliente_id=X, ordenados por nombre y tamano
   - Columnas: nombre del servicio, badge de tamaño, duración (duracion_minutos),
     precio (editable)
   - Botón "Guardar cambios" que actualiza servicios.precio para las filas
     modificadas
```

## Fuera de alcance

- Login / Supabase Auth para el panel (se evalúa en "Onboarding multi-cliente").
- Editar turnos existentes (hora, servicio, mascota) — solo cancelar.
- Alta de nuevos servicios o empleados desde el panel — solo editar precio de servicios existentes.
- Cancelación desde el lado del cliente final (mail de confirmación) — roadmap mediano plazo, ítem separado.
- Notificaciones / recordatorios.
