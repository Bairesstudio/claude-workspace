# Contexto: Baires Studio

Proyecto: Baires Studio ("tu negocio en piloto automático") — empresa que estamos armando para vender sistemas de automatización de turnos a negocios locales (peluquerías, pilates, estética, baño canino, etc.).

## Stack
Lovable (formulario de reserva) → webhook → n8n Cloud (lógica, bairesstudio.app.n8n.cloud) → Supabase (Postgres, ya migrado desde Google Sheets) → Google Calendar (evento por turno) → Gmail (mails de confirmación/avisos).

## Cliente beta
Un local de baño canino (conocido nuestro), sin cobrar, para testear en vivo.

## Schema de Supabase (multi-tenant desde el día 1)
Tablas: `clientes`, `empleados`, `servicios`, `turnos` (con índices para overlap por `cliente_id + empleado_id + fecha`).

## Workflows de n8n
1. Recibe POST de Lovable → chequea overlap de horario (empleado+fecha+duración) en Supabase → si hay overlap, responde "ocupado".
2. (Sub-workflow) Si no hay overlap → crea row en `turnos` + evento en Google Calendar + mails de confirmación (cliente y dueño) — corre async para responder rápido a Lovable.
3. Resumen mensual: trigger día 1 de cada mes → query turnos del mes anterior en Supabase → agrupa por servicio y empleado → mail al dueño con desglose de ganancias.
4. **Cancelar Turno (Panel)** (activo) — webhook `/pajaro-loco-cancelar-turno`: busca el turno, marca `estado='cancelado'`, borra el evento de Calendar (si existe) y manda mail de aviso al cliente.
5. **Modificar Turno (Panel)** (activo) — webhook `/pajaro-loco-modificar-turno`: recibe `{ turno_id, fecha, hora }`, recalcula el slot, re-chequea overlap (excluyendo el propio turno), actualiza Supabase + el evento de Calendar y manda mail al cliente con la nueva fecha/hora.

Nota: se decidió mantener 4 y 5 como workflows separados (no unificados con switch por `accion`) — la lógica compartida era mínima y así es más simple de mantener/debuggear.

## Sitio 2 (dashboard del negocio)
Se construye con los skills de UI/UX instalados en este proyecto (`frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `agent-browser`, `mcp-builder`, `find-skills`, `magic` MCP para generar componentes). Muestra turnos del día y métricas al dueño, y permite cancelar/modificar turnos (dispara el workflow 4/5 unificado).

## Visión a futuro (multi-cliente / SaaS)
La base de Supabase ya soporta multi-tenant. Falta parametrizar los workflows de n8n para que no estén hardcodeados a un solo cliente (resolver `cliente_id` dinámicamente por slug/credencial), para que "vender a un local nuevo" sea: insertar row en `clientes` + duplicar workflows con esos parámetros + conectar su Calendar/Gmail.

## Estado de las conexiones (MCP) — recién verificado
Configuradas como scope local de este proyecto (`D:\Claude Workspace`), las tres conectan OK:
- `n8n-mcp` → https://bairesstudio.app.n8n.cloud/mcp-server/http
- `supabase` → proyecto Supabase del negocio
- `magic` → generador de componentes (21st.dev), para el dashboard

Skill `/graphify` también vive en este proyecto (`.claude/skills/graphify`).

## Dashboard conectado a Supabase (E2E probado)
`useTurnos` ahora lee directamente de Supabase (`turnos` + join a `servicios`/`empleados`, filtrado por `cliente_id` resuelto desde el slug `pajaro-loco`). Se agregaron políticas RLS de `SELECT` para el rol `anon` en las 4 tablas (lectura pública — aceptable para esta beta de un solo cliente, pero a revisar antes de multi-tenant). `.env` del dashboard ya tiene `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` reales (gitignored).

Probado end-to-end con turnos de prueba (insertados y borrados via SQL):
- Cancelar (Hoy → modal → webhook `/pajaro-loco-cancelar-turno`) → Supabase `estado='cancelado'` → dashboard refetch OK.
- Reprogramar (Próximos → modal → webhook `/pajaro-loco-modificar-turno`) → Supabase recalcula `inicio_minutos`/`fin_minutos` → dashboard refetch OK.
Ambos workflows mandan mail al cliente (probado contra bairesstudio12@gmail.com); revisar esa bandeja para confirmar el contenido de los mails.

## Flujo de reserva (WF1/WF2) activado y probado E2E
WF1 "Recepcion - Validación (Supabase)" y WF2 "Reservas - Confirmación (Supabase)" estaban **inactivos** (a pesar de lo que decía la nota anterior) y WF2 tenía la credencial Gmail sin asignar en los nodos "Mail Cliente"/"Mail Dueño" (por eso no podía publicarse). Se asignó la credencial "Gmail OAuth2 API" a esos 2 nodos y se publicaron ambos workflows — **quedan activos en producción**.

Prueba E2E real (POST simulando a Lovable a `/webhook/pajaro-loco-reservas`):
- WF1 resolvió cliente/servicio/empleado, calculó el slot, no detectó overlap → respondió `ok:true`.
- WF2 insertó el turno en Supabase, creó el evento en Google Calendar (`ultraguschi@gmail.com`, el calendario configurado en el nodo "Create an event" — confirmar si es el correcto para el negocio real), guardó `calendar_event_id`, y mandó mail a cliente y dueño (Gmail OK).
- El turno apareció correctamente en el dashboard (Próximos).
- Luego se canceló desde el dashboard: WF5 marcó `estado='cancelado'`, mandó mail de cancelación y **borró el evento de Calendar** (`Delete event` → success).
- Se borró el turno de prueba de Supabase al finalizar.

## Formulario Lovable conectado al backend (WF1/WF2)
El formulario de `pajaro-loco-spa.lovable.app` se modificó para:
- POST a `https://bairesstudio.app.n8n.cloud/webhook/pajaro-loco-reservas` en lugar de abrir WhatsApp
- Campos del payload: `name`, `email`, `date` (YYYY-MM-DD), `time` (HH:MM), `empleado` (hardcodeado "Soledad"), `tamano` (chico/mediano/grande), `service` (bano/bano_y_corte/corte_de_unas), `mascota_nombre`, `mascota_raza`, `observaciones`
- El campo teléfono se eliminó del form (no usan WhatsApp)
- SelectItem values de Tamaño y Servicio ya están normalizados para coincidir con la DB

## Bugs pendientes de corregir en Lovable (para el compañero)
1. **Filtrar servicios por tamaño**: al elegir tamaño en el combobox, el combobox de "Servicio" debe mostrar solo las opciones correspondientes a ese tamaño (y resetear la selección previa). Corte de uñas aparece para todos los tamaños.
2. **Bache horario (15:30 → 16:30)**: hay un salto de 60 min en el selector de hora entre 15:30 y 16:30. Revisar qué slots corresponden al descanso real del negocio y ajustar el array de horas. Confirmar con el dueño cuál es el horario correcto exacto.
3. **Detalles estéticos / eliminar campos visuales**: revisar si hay elementos UI de "teléfono" o "mensaje" que hayan quedado visibles en el form o en algún texto del sitio, y limpiarlos.

## Bugs corregidos en n8n (WF2)
- **Teléfono y Mensaje eliminados del evento de Calendar**: la descripción del evento ahora solo incluye Cliente, Email, Servicio, Mascota, Observaciones.
- **Teléfono eliminado del Mail Dueño**: ya no aparece teléfono ni mensaje en el mail al dueño (el form no envía teléfono).
- **Zona horaria del Calendar**: ver nota abajo.

## Zona horaria del Calendar
El evento se crea con hora correcta en UTC absoluto (ej: turno 10:00 → 13:00 UTC, correcto para Argentina UTC-3). Si el usuario ve el evento con 1 hora de diferencia en Google Calendar, es porque la cuenta `ultraguschi@gmail.com` tiene configurada una zona horaria diferente a `America/Argentina/Buenos_Aires`. Fix: en Google Calendar → Configuración → Zona horaria → seleccionar "(UTC-03:00) Buenos Aires".

## Roadmap acordado

### Fase 1 — Beta lista (prioridad inmediata)
1. Desplegar dashboard a Vercel o Netlify (hoy solo corre en localhost)
2. Confirmar E2E real desde el formulario Lovable en el browser
3. Cambiar `mail_dueno` y calendar a los datos reales del negocio (hoy apuntan a cuentas de prueba)
4. Bugs pendientes en Lovable: filtro de servicios por tamaño, bache de horarios, detalles estéticos

### Fase 2 — Producto real (post-beta)
1. **Multi-tenant real**: parametrizar workflows de n8n (hoy "pajaro-loco" hardcodeado), dashboard por cliente con su propia URL, vincular Calendar/Gmail propio de cada cliente
2. **Autenticación robusta** en el dashboard: cada dueño ve solo sus datos
3. **Plantillas de mail HTML**: reemplazar los mails de texto plano por diseño profesional
4. **Panel admin Baires Studio**: vista de todos los clientes, métricas globales, facturación
5. **Onboarding self-service**: nuevo cliente completa un form → se crea todo automáticamente en Supabase + n8n + subdominio de dashboard, sin tocar código

### Fuera de scope por ahora (descartado)
- Recordatorio automático 24hs antes
- Cancelación desde el mail del cliente
- Integración de pagos
- WhatsApp Business API
- App mobile / PWA
- Múltiples empleados con calendarios independientes
- Reseñas post-turno

## Mails de prueba al mail personal (temporal)
`clientes.mail_dueno` (pajaro-loco) se cambió de `flown8n2020@outlook.com` a `flown8n2026@outlook.com` — mail personal del usuario para no llenar de mails de prueba el mail de la empresa. Recordar que esto es temporal ("por ahora"); cuando se pase a producción real con el cliente, hay que volver a poner el mail del dueño del negocio.

## Lovable
URL publicada: `https://pajaro-loco-spa.lovable.app` (mismo proyecto que `lovable.dev/projects/d3db957b-735b-4876-bc28-48401a218150` — confirmado por el ID que aparece en las meta tags og:image). El editor vía magic_link redirigió a login y no se pudo abrir directamente; sí se puede abrir el sitio publicado sin login. No existe MCP oficial de Lovable conocido.

**Sí se puede seguir editando y republicando** un sitio Lovable ya publicado — el link público no es estático/congelado, cada nueva publicación lo actualiza. Para que nosotros (Claude) podamos editar el código directamente haría falta conectar el proyecto a un repo de GitHub desde Lovable (Settings → GitHub); sin eso, los cambios de código solo se hacen desde el editor de Lovable (con IA o a mano).

### ⚠️ Hallazgo importante: el formulario publicado NO está conectado a nuestro backend
Se inspeccionó el bundle JS de `pajaro-loco-spa.lovable.app` (sin necesidad de enviar el form). El formulario "Pedí tu turno" es **standalone**: al tocar "Confirmar turno 🐾" no hace ningún `fetch`/POST a n8n ni a Supabase — directamente abre WhatsApp (`wa.me/5491100000000?text=...`, número placeholder/fake) con un mensaje pre-armado resumiendo la reserva.

Campos del form actual: nombre del dueño, teléfono, tipo de mascota (Perro/Gato), tamaño, servicio, fecha, hora, consulta. **Faltan campos que WF1 necesita**: `email` (para mail de confirmación al cliente) y `empleado` (no hay selector — WF1 hace lookup en `empleados.nombre`). Tampoco hay campo para `mascota_nombre` ni `mascota_raza` (raza), solo "tipo" Perro/Gato.

Conclusión: si el usuario prueba una "reserva real" desde este link público, **no va a generar ningún efecto en Supabase/Calendar/mail** — solo va a abrir WhatsApp con un mensaje de texto. Para probar el flujo real end-to-end hay que: (a) modificar este formulario de Lovable para que haga POST a `https://bairesstudio.app.n8n.cloud/webhook/pajaro-loco-reservas` con los campos que espera WF1 (agregando email, empleado, mascota_nombre, mascota_raza), o (b) seguir probando con el POST simulado vía Node como se hizo hasta ahora.

## Workflows archivados
Se archivaron 3 workflows viejos (pre-Supabase, sin sufijo "(Supabase)"): "Recepcion - Validación", "Reservas - Confirmación" y "Resumen Mensual - Mail Dueño". Quedan solo los 5 vigentes (WF1-3 Supabase + Cancelar/Modificar Panel).

## Credenciales conectadas
Gmail OAuth2 ("Gmail OAuth2 API") conectado y asignado a los nodos de mail (WF2 Mail Cliente/Dueño, Cancelar → Mail Cancelación, Modificar → Mail Modificación).
