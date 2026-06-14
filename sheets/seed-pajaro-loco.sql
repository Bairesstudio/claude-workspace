-- Carga inicial: Pajaro Loco Pet Store
-- Ejecutar despues de schema-supabase.sql y migracion-tamano-perro.sql

insert into clientes (nombre, slug, mail_dueno, plan)
values ('Pajaro Loco Pet Store', 'pajaro-loco', 'flown8n2020@outlook.com', 'pro');

insert into empleados (cliente_id, nombre)
select id, 'Soledad' from clientes where slug = 'pajaro-loco';

-- Servicios: precio y duracion varian por tamano de perro
insert into servicios (cliente_id, nombre, nombre_normalizado, tamano, duracion_minutos, precio)
select id, v.nombre, v.nombre_normalizado, v.tamano, v.duracion_minutos, v.precio
from clientes,
  (values
    -- Baño
    ('Baño', 'bano', 'chico',   50, 20000),
    ('Baño', 'bano', 'mediano', 75, 25000),
    ('Baño', 'bano', 'grande',  90, 30000),

    -- Baño y corte
    ('Baño y corte', 'bano_y_corte', 'chico',   60, 23000),
    ('Baño y corte', 'bano_y_corte', 'mediano', 90, 23000),
    ('Baño y corte', 'bano_y_corte', 'grande', 105, 23000),

    -- Corte de uñas (mismo valor para los 3 tamanos - A CONFIRMAR con la dueña)
    ('Corte de uñas', 'corte_de_unas', 'chico',   15, 5000),
    ('Corte de uñas', 'corte_de_unas', 'mediano', 15, 5000),
    ('Corte de uñas', 'corte_de_unas', 'grande',  15, 5000)
  ) as v(nombre, nombre_normalizado, tamano, duracion_minutos, precio)
where clientes.slug = 'pajaro-loco';
