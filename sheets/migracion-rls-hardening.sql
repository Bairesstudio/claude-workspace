-- Hardening de RLS: aislamiento real por cliente_id + rol
-- Ejecutar a mano en el SQL editor de Supabase (igual que las migraciones anteriores).
--
-- Reemplaza la policy "authenticated_full_access" (creada a mano, sin versionar) que
-- hoy deja que cualquier usuario autenticado lea/escriba TODAS las filas de TODAS las
-- tablas. Con un solo cliente real (Pajaro Loco) no se nota, pero en cuanto haya un
-- segundo cliente, la cuenta de Soledad podria leer o pisar datos de otro negocio
-- usando el anon key + su propia sesion.
--
-- Las escrituras de turnos (cancelar/reprogramar) las hace n8n con la service_role key,
-- que siempre bypassea RLS -> por eso turnos solo necesita policy de lectura aca.

-- Funciones helper (SECURITY DEFINER: evitan recursion al leer user_profiles desde sus propias policies)
create or replace function auth_role() returns text
language sql security definer stable
as $$
  select role from user_profiles where user_id = auth.uid()
$$;

create or replace function auth_cliente_id() returns uuid
language sql security definer stable
as $$
  select cliente_id from user_profiles where user_id = auth.uid()
$$;

-- user_profiles: cada usuario lee/edita su propia fila. Admin ve y edita todas.
alter table user_profiles enable row level security;
drop policy if exists authenticated_full_access on user_profiles;
create policy user_profiles_admin_all on user_profiles
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy user_profiles_select_own on user_profiles
  for select using (user_id = auth.uid());

-- clientes: admin CRUD completo. Cliente solo lee su propia fila (para el nombre del negocio).
alter table clientes enable row level security;
drop policy if exists authenticated_full_access on clientes;
create policy clientes_admin_all on clientes
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy clientes_select_own on clientes
  for select using (id = auth_cliente_id());

-- empleados: admin CRUD completo. Cliente solo lee los propios.
alter table empleados enable row level security;
drop policy if exists authenticated_full_access on empleados;
create policy empleados_admin_all on empleados
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy empleados_select_own on empleados
  for select using (cliente_id = auth_cliente_id());

-- servicios: admin CRUD completo. Cliente solo lee los propios.
alter table servicios enable row level security;
drop policy if exists authenticated_full_access on servicios;
create policy servicios_admin_all on servicios
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy servicios_select_own on servicios
  for select using (cliente_id = auth_cliente_id());

-- turnos: solo lectura desde el dashboard (las escrituras las hace n8n con service_role).
alter table turnos enable row level security;
drop policy if exists authenticated_full_access on turnos;
create policy turnos_admin_all on turnos
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy turnos_select_own on turnos
  for select using (cliente_id = auth_cliente_id());

-- horarios_empleado: no tiene cliente_id propio, se resuelve via empleados.
alter table horarios_empleado enable row level security;
drop policy if exists authenticated_full_access on horarios_empleado;
create policy horarios_empleado_admin_all on horarios_empleado
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy horarios_empleado_select_own on horarios_empleado
  for select using (
    empleado_id in (select id from empleados where cliente_id = auth_cliente_id())
  );
