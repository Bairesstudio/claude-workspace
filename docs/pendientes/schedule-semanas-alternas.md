# Pendiente: Soporte de horarios con semanas alternas en Supabase

> **Resuelto** el 2026-06-19. Ver spec en `docs/superpowers/specs/2026-06-18-horarios-semanas-alternas-design.md`
> y plan en `docs/superpowers/plans/2026-06-18-horarios-semanas-alternas.md`.
> El diseño final es **por empleado** (no por cliente entero) — pensado para que escale a negocios
> con varios empleados de turnos rotativos, no solo el caso de Pajaro Loco/Soledad.

## Contexto

Pajaro Loco (cliente de prueba) trabaja en semanas alternadas:
- **Semana A:** lunes, miércoles, viernes
- **Semana B:** martes, jueves, sábado

## Solución actual (temporal)

Bloques recurrentes en Google Calendar. Los workflows n8n ya consultan el calendario para validar disponibilidad, entonces funciona sin cambios en el sistema.

## Lo que hay que construir

Soporte nativo en Supabase para que cualquier cliente pueda configurar esquemas de semanas alternas desde el panel admin, sin depender de Google Calendar para esto.

Es un caso de uso que van a necesitar más clientes — conviene tenerlo como feature del sistema.

## Diseño sugerido

Agregar a la tabla `clientes` (o una tabla separada `horarios`) soporte para patrones par/impar de semanas:

```sql
-- Opción A: columna en clientes
alter table clientes
  add column horario_semana_a jsonb,  -- ej: ["lunes","miercoles","viernes"]
  add column horario_semana_b jsonb;  -- ej: ["martes","jueves","sabado"]

-- Opción B: tabla separada (más flexible para múltiples horarios)
create table horarios_semanales (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  semana char(1) check (semana in ('A','B')),
  dias text[]  -- ["lunes","miercoles","viernes"]
);
```

Los workflows n8n deberían consultar esto para validar si el día solicitado corresponde a la semana activa del cliente.

## Para retomar

Cuando quieras implementarlo, decile a Claude: *"implementemos el soporte de semanas A/B en Supabase"* — tiene el contexto completo.
