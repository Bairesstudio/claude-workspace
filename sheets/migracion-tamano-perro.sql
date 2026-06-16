-- Migracion: precio/duracion varian segun tamano de perro (Pajaro Loco)
-- Ejecutar despues de schema-supabase.sql

alter table servicios
  add column tamano text check (tamano in ('chico', 'mediano', 'grande'));

-- Cada servicio ahora puede tener hasta 3 filas (una por tamano).
-- Para clientes sin esta logica (otros rubros), tamano queda null.

-- Evita duplicados: un mismo servicio+tamano no se repite para el mismo cliente
create unique index idx_servicios_unicos
  on servicios (cliente_id, nombre_normalizado, coalesce(tamano, 'sin_tamano'));
