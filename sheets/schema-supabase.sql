-- Esquema inicial Baires Studio - Supabase
-- Pensado multi-cliente desde el dia 1: todas las tablas tienen cliente_id

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text unique not null,              -- usado para el link del panel: /panel/slug
  mail_dueno text not null,
  plan text not null default 'estandar',  -- 'estandar' o 'pro'
  zona_horaria text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now()
);

create table empleados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nombre text not null,
  activo boolean not null default true
);

create table servicios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nombre text not null,              -- ej: "Corte Clasico"
  nombre_normalizado text not null,  -- ej: "corte_clasico" (sin acentos, para matching)
  duracion_minutos integer not null default 60,
  precio numeric(10,2) not null default 0,
  activo boolean not null default true
);

create table turnos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  empleado_id uuid references empleados(id),
  servicio_id uuid references servicios(id),

  -- datos del cliente final
  nombre_cliente text not null,
  telefono text,
  email text,

  -- horario (claves para overlap y filtrado rapido)
  fecha date not null,
  inicio_minutos integer not null,   -- minutos desde las 00:00 (ej: 14:30 = 870)
  fin_minutos integer not null,
  duracion_minutos integer not null,
  precio_servicio numeric(10,2) not null default 0,

  -- estado y referencias externas
  estado text not null default 'confirmado',  -- 'confirmado' | 'cancelado'
  calendar_event_id text,                      -- para cancelar/reprogramar (pendiente seccion 10)

  -- campos especificos rubro canino (Pajaro Loco) - null para otros clientes
  mascota_nombre text,
  mascota_raza text,
  mascota_tamano text,
  observaciones text,

  created_at timestamptz not null default now()
);

-- Indices para que la validacion de overlap sea rapida (resuelve problema #1 y #2 de la seccion 10)
create index idx_turnos_overlap on turnos (cliente_id, empleado_id, fecha) where estado = 'confirmado';

-- Indice para el panel del cliente (ver sus proximos turnos rapido)
create index idx_turnos_cliente_fecha on turnos (cliente_id, fecha);
