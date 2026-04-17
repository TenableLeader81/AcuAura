-- Tabla de reportes comunitarios
create table reports (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('sin_agua','fuga','contaminacion','baja_presion','otro')),
  description text,
  lat double precision not null,
  lng double precision not null,
  municipality text not null,
  address text,
  status text default 'activo' check (status in ('activo','en_revision','resuelto')),
  votes integer default 0,
  created_at timestamptz default now()
);

-- Acceso público para leer y crear reportes
alter table reports enable row level security;

create policy "Anyone can read reports"
  on reports for select using (true);

create policy "Anyone can insert reports"
  on reports for insert with check (true);

create policy "Anyone can vote on reports"
  on reports for update using (true) with check (true);
