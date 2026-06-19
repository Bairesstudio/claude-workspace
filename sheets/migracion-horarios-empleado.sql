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
