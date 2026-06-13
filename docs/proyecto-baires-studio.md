# BAIRES STUDIO
## Automatización para negocios locales
Documento de continuidad del proyecto - Versión actualizada junio 2026

| Campo | Detalle |
|---|---|
| Nombre de la empresa | Baires Studio |
| Fecha de actualización | Junio 2026 |
| Estado general | MVP en desarrollo avanzado. Validación de duración y superposición probadas. Nombre y estrategia comercial definidos. |
| Equipo | 2 founders (Mateo y Agustín) construyendo el servicio con apoyo de herramientas IA (Claude como tercer integrante). |
| Primer caso real | Pajaro Loco Pet Store - peluquería canina, Mendoza 4626, CABA. |
| Objetivo de negocio | Vender sistemas simples de automatización a negocios locales que trabajan con turnos. |
| Marca registrada | En proceso. 'Baires Studio' no encontrado en INPI. Registro recomendado en Clase 42. |

---

## 1. Resumen ejecutivo

El proyecto es un sistema de automatización de turnos para negocios locales. La idea no es vender solamente una página web, sino ofrecer una solución completa: reservas online, validación de disponibilidad, registro de datos, eventos en calendario, notificaciones automáticas y métricas mensuales.

La versión actual tiene una base sólida: **Lovable** como frontend, **n8n** como motor de automatización, **Google Sheets** como base de datos, **Google Calendar** como agenda y **Gmail/Outlook** para notificaciones.

| Área | Estado actual |
|---|---|
| Recepción de reservas desde Lovable | Funcionando. |
| Validación de disponibilidad | Funcionando con superposición horaria por empleado. |
| Duración real del servicio | Funcionando. Calendar crea eventos con duración correcta usando duracion_minutos. |
| Google Sheets | Funcionando como base de datos por cliente. |
| Google Calendar | Funcionando. Crea eventos con hora de inicio y fin correcta. |
| Mails | En uso para confirmación al cliente y aviso al dueño. |
| Resumen mensual | Diseñado con Schedule Trigger, lectura de filas y cálculo de métricas. |
| Velocidad de respuesta | Entre 4 y 5 segundos. Pendiente optimización. |

---

## 2. Identidad y naming - Baires Studio

El proceso de naming fue uno de los desarrollos más importantes de la etapa comercial del proyecto. Se exploraron múltiples caminos antes de llegar al nombre definitivo.

### 2.1 Caminos explorados

| Nombre | Ángulo | Por qué se descartó |
|---|---|---|
| LocalFlow | Producto / automatización local | Buena opción técnica pero sin identidad propia. Suena a SaaS genérico. |
| TurnoFlow | Producto específico de turnos | Limita el crecimiento. Si venden otras automatizaciones, el nombre juega en contra. |
| Operia | Startup / operaciones | Requiere explicar siempre qué hace. Barrera para negocios locales. |
| Despeja / Margen / Orden | El alivio que ofrece el producto | Palabras sueltas, sin forma de marca. Faltaba construcción. |
| Despeja / Timón / Ancla | Verbos e imágenes de control | Demasiado imperativo, tono de publicidad antigua. |
| Trama / Margen / Pausa | La estructura que construyen | Más cercanos pero ninguno cerró del todo para el equipo. |

### 2.2 El nombre elegido: Baires Studio

La decisión final fue **Baires Studio**. El nombre salió de la idea de darle una identidad argentina clara, con proyección internacional.

**Por qué Baires**
- Es identidad pura. No necesita explicación para quien sepa que Buenos Aires existe.
- Transmite algo porteño, con personalidad, que no intenta ser una empresa genérica de Silicon Valley.
- En mercados externos, 'Baires' genera curiosidad en lugar de rechazo.
- Diferencia la marca en un mercado donde todos los SaaS se llaman igual.

**Por qué Studio y no Estudio**
- 'Estudio' en español suena a lugar físico, a algo estático.
- 'Studio' tiene más energía, es internacional sin perder identidad local.
- Ya es una palabra que el mundo tech adoptó naturalmente.

**Estado del registro de marca**
- Búsqueda realizada en el INPI (portaltramites.inpi.gob.ar): no se encontraron registros para 'Baires Studio'.
- Existe una barbería en Neuquén con handle @baires_studio21 en Instagram y un sitio baires.studio de una diseñadora web, pero en rubros diferentes y sin registro formal.
- Registro recomendado en **Clase 42** (servicios de tecnología y software).
- Costo estimado del trámite: $25.000 a $30.000 ARS.
- Plazo de resolución: 12 a 18 meses. Desde el día de presentación ya tienen prioridad legal.
- El trámite se puede hacer sin abogado directamente en portaltramites.inpi.gob.ar.

---

## 3. Modelo comercial y estrategia de precios

### 3.1 Los dos planes

| Plan | Incluye | Cliente ideal |
|---|---|---|
| Estándar | Sitio web con automatización de turno + mail al cliente + mail al dueño + calendar al dueño. | Negocios chicos que hoy toman turnos por WhatsApp manualmente. |
| Pro | Todo lo del Estándar + hoja de Google Sheets con métricas + mail a principio de mes con facturación desglosada + calendar por cada empleado. | Peluquerías, barberías, estética, pilates con varios profesionales. |

### 3.2 Costos y precios

Costo mensual de subscripciones: **$219.449 ARS** entre 2 personas (**$109.724 cada uno**). Este es el piso absoluto antes de ganancia, tiempo y soporte.

| | Plan Estándar | Plan Pro |
|---|---|---|
| Setup (pago único) | $150.000 ARS / u$s 103 | $220.000 ARS / u$s 151 |
| Mantenimiento mensual | $89.000 ARS / u$s 61 | $139.000 ARS / u$s 95 |

Con 3 clientes Estándar ya cubren costos operativos. Con 5 clientes mixtos están ganando bien los dos.

### 3.3 Tres approaches de venta

**Approach 1 - Volumen rápido**
Precio de lanzamiento con descuento del 30% para los primeros 5 clientes. Les das precio más bajo a cambio de testimonios y casos de éxito. Funciona para arrancar con tracción.

**Approach 2 - Nicho especializado**
Ir a fondo en un rubro: peluquerías caninas, barberías o centros de estética. El boca a boca funciona dentro del rubro. Más lento al principio pero más eficiente.

**Approach 3 - Valor percibido**
Calculás con el cliente cuánto tiempo pierde por semana gestionando turnos manualmente. Si son 2 horas diarias x 5 días x 4 semanas = 40 horas al mes. Con eso justificás el precio solo.

**Recomendación:** arrancar con Approach 1 para conseguir los primeros 3-5 clientes rápido, y mientras tanto construir el caso de nicho del Approach 2 para escalar después.

---

## 4. Discursos de venta en frío

Ver [ventas/discursos.md](../ventas/discursos.md)

---

## 5. Stack tecnológico

| Componente | Tecnología | Uso |
|---|---|---|
| Frontend | Lovable AI | Sitio web y formulario para el cliente final. |
| Automatización | n8n Cloud | Recibe webhooks, valida disponibilidad, conecta Sheets, Calendar y mails. |
| Base de datos | Google Sheets | Una sheet por cliente. Guarda turnos, precios, duraciones, estados y métricas. |
| Calendario | Google Calendar | Agenda del negocio. A futuro: una agenda por empleado. |
| Mail | Gmail + Outlook | Confirmaciones al cliente y notificaciones al dueño. |
| Futuro canal | WhatsApp Business | Recordatorios y confirmaciones. Aún no implementado. |

---

## 6. Arquitectura en n8n

| Workflow | Función | Qué hace |
|---|---|---|
| WF1 | Principal / sincrónico | Recibe la reserva, arma datos base, calcula slot_id, valida disponibilidad con Check Overlap, responde a Lovable y dispara WF2. |
| WF2 | Confirmación / asincrónica | Guarda reserva en Sheets, calcula duración, crea evento en Calendar y manda mails. |
| WF3 | Resumen mensual | El día 1 de cada mes calcula métricas del mes anterior y las manda al dueño. |

### 6.1 Flujo WF1 recomendado
Webhook → CONFIG-Cliente → Merge → Flatten+Base Fields → Build Slot → Get row(s) → Check Overlap → Switch → [Occupied] Respond 400 / [Free] Respond 200 + Call WF2

### 6.2 Flujo WF2 recomendado
When Executed by Another Workflow → Calcular duración → Append row in sheet → Create an event → Mail Cliente → Mail Dueño

---

## 7. Evolución del proyecto

| Etapa | Descripción | Resultado |
|---|---|---|
| Idea inicial | Vender a locales un paquete con sitio web y automatización simple. | Se eligieron rubros con turnos: barberías, peluquerías, pilates, estética, petshops. |
| Pack Base | Formulario Lovable conectado a n8n, Sheets y mail. | Funcionó end-to-end: webhook, CONFIG, Merge, Flatten, Sheets Append, Gmail. |
| Pack Pro | Agregar fecha y hora de turno, validar disponibilidad. | Se implementó slot_id y lógica de ocupado/libre. |
| Pack Pro por empleado | slot_id incluye negocio, fecha, hora, servicio y empleado. | Permite múltiples turnos al mismo horario si cambia el empleado. |
| Arquitectura asincrónica | Separar WF1 de respuesta rápida y WF2 en background. | Bajó la espera pero sigue pendiente optimización. |
| Duración de servicios | CONFIG define precios y duraciones. | Calendar crea eventos con duración real. |
| Superposición horaria | Se agregó Check Overlap para detectar cruces por empleado. | Funciona: bloquea horarios dentro del rango y permite justo al terminar. |
| Naming y comercial | Se definió Baires Studio como nombre y se armó estrategia de venta. | Nombre registrable, estrategia de precios y discursos de venta definidos. |
| Primer cliente real | Pajaro Loco Pet Store, peluquería canina en Mendoza 4626, CABA. | Prompt para Lovable generado. Sistema en adaptación a rubro canino. |

---

## 8. Bugs y problemas resueltos

| Bug / problema | Causa | Solución aplicada |
|---|---|---|
| Campos en inglés desde Lovable | Lovable manda name, phone, service, etc. | Flatten + Base Fields traduce y aplana campos. |
| Acentos en servicios | "Corte Clásico" generaba keys con acentos que no matcheaban CONFIG. | Normalización NFD y eliminación de diacríticos. |
| Eventos 3 horas corridos | Timezone mal interpretado por Calendar. | Uso de America/Argentina/Buenos_Aires. |
| isOccupied siempre true | Se chequeaba el slot_id construido, no el de Sheets. | Reemplazado por Check Overlap con lógica de superposición. |
| Lovable mostraba éxito aunque ocupado | Condición frontend no contemplaba payload ok:false. | Agregar `payload?.ok === false` a la condición. |
| Calendar con 60 minutos siempre | duracion_servicio se perdía en Append. | Mover "Calcular duración" antes de Append y usar duracion_minutos. |
| Check Overlap no podía importar luxon | Code node no permitía require('luxon'). | Reescribir lógica con JavaScript nativo y minutos del día. |
| Switch no leía bien isOccupied | Check Overlap devolvía strings true/false. | Cambiar isOccupied a booleano real. |

---

## 9. Estado actual validado

- El sistema recibe reservas desde Lovable.
- Calcula precio_servicio correctamente según CONFIG.
- Calcula duracion_minutos correctamente según CONFIG.
- La duración se guarda en Google Sheets.
- Google Calendar crea eventos con duración correcta.
- Se bloquean superposiciones horarias para el mismo empleado.
- Se permiten reservas justo cuando termina el turno anterior.
- Se permiten reservas en el mismo horario con empleados distintos.
- El sistema ya se acerca a un MVP vendible.

---

## 10. Problemas pendientes

| Pendiente | Impacto | Prioridad |
|---|---|---|
| Velocidad de respuesta | Tarda 4-5 segundos. El usuario percibe espera. | Alta |
| Optimización de Get row(s) | Traer demasiadas filas escala mal. | Alta |
| Columnas auxiliares de normalización | Necesarias para filtrar rápido por fecha/empleado. | Alta |
| Mail cliente end-to-end | Verificar con datos reales y cuentas definitivas. | Media |
| calendar_event_id | Útil para cancelar/reprogramar turnos. | Media |
| Adaptación a peluquería canina | Agregar campos: nombre del perro, raza, tamaño, observaciones. | Alta - primer cliente real |
| Registro de marca INPI | Proteger el nombre Baires Studio en Clase 42. | Alta |
| Limpieza de Sheet de pruebas | Filas viejas con formatos mezclados. | Media |
| Calendarios por empleado | Mejora operación real y visibilidad por profesional. | Media |
| Onboarding multi-cliente | Hoy el CONFIG se toca manualmente. | Largo plazo |

---

## 11. Ideas de mejora y roadmap a futuro

### 11.1 Corto plazo (próximas 2-4 semanas)
- Agregar columnas auxiliares en Sheets: fecha_key, empleado_key, inicio_minutos, fin_minutos.
- Cambiar Get row(s) para filtrar por fecha_key y empleado_key. Esto debería bajar la latencia significativamente.
- Limpiar la Sheet de pruebas o crear una nueva por cliente.
- Adaptar formulario y CONFIG al rubro peluquería canina: campos de mascota, raza, tamaño y observaciones.
- Hacer 5 a 10 reservas reales con Pajaro Loco y medir todo.
- Presentar la solicitud de marca en el INPI.

### 11.2 Mediano plazo (1-3 meses)
- Sheet maestra de clientes: un registro central donde se gestionen todos los negocios que usan el sistema.
- Calendarios por empleado: cada profesional tiene su propia agenda en Google Calendar.
- Mejora visual de los mails: template con logo del negocio, colores y firma profesional.
- Dashboard de resumen mensual más prolijo enviado automáticamente.
- Primer landing page de Baires Studio con los dos planes y formulario de contacto.
- Sistema de cancelaciones: el cliente puede cancelar desde el mail de confirmación.

### 11.3 Largo plazo (3-12 meses)
- Onboarding automático: dar de alta un cliente nuevo genera Sheet, calendario y configuración sin tocar n8n.
- Integración con WhatsApp Business para recordatorios y confirmaciones.
- Panel simple para los negocios: ver sus turnos, métricas y configuración sin depender del equipo.
- Reprogramaciones automáticas: el cliente puede elegir otro horario desde el mail.
- Sistema de lista de espera: si un turno se cancela, se notifica automáticamente al siguiente.
- Soporte multi-sucursal: un negocio con varias sedes.
- Exportación de reportes en PDF para el dueño del negocio.
- App móvil o PWA para que el dueño vea su agenda desde el celular.

### 11.4 Ideas de nuevos productos sobre la misma base
- Control de inventario automático: cuando se usa un producto en un turno, se descuenta del stock.
- Recordatorios de fidelización: "Han pasado 30 días desde tu último turno, reserva ahora."
- Encuesta post-servicio automática para recolectar reseñas de Google.
- Sistema de descuentos y promociones automáticas por fecha o frecuencia de visita.
- Integración con Mercado Pago para cobrar anticipos al reservar.

---

## 12. Checklist de pruebas recomendado

| Prueba | Resultado esperado |
|---|---|
| Reserva libre con empleado X | Responder ok, crear row, crear evento y mandar mails. |
| Reserva mismo empleado dentro de rango ocupado | Responder ocupado. No crear row, evento ni mails. |
| Reserva mismo empleado justo al finalizar turno anterior | Permitir. |
| Reserva otro empleado en mismo horario | Permitir. |
| Servicio de 25 min | Calendar debe durar 25 min y Sheets guardar 25. |
| Servicio de 90 min | Calendar debe durar 90 min y overlap bloquear rangos internos. |
| Fecha con varias reservas previas | Check Overlap debe filtrar por fecha y empleado correctamente. |
| Lovable ocupado | Debe mostrar mensaje de horario ocupado. |
| Lovable libre | Debe mostrar mensaje de turno reservado con éxito. |
| Mail cliente | Debe llegar con servicio, fecha, hora y negocio correcto. |
| Mail dueño | Debe llegar con datos de cliente y turno. |

---

## 13. Código de referencia

Ver [codigo/referencia.md](../codigo/referencia.md)

---

*Baires Studio - Documento interno de continuidad - Junio 2026*
