-- Tabla de perfiles de usuario
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text not null,
  apellidos text not null,
  email text not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read all profiles"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Agregar columnas de usuario a reports
alter table reports
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists user_name text;
