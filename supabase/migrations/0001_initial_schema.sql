-- Mindboard Database Schema
-- Tables: users, maps, materials, nodes, edges
-- Supabase Auth handles authentication; users table is synced from auth.users trigger.

-- Users (metadata mirror of auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name varchar(100),
  email varchar(255) unique not null,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read their own profile"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id);

-- Trigger: create users row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Maps
create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title varchar(255) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maps enable row level security;

create policy "Users can read their own maps"
  on public.maps for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own maps"
  on public.maps for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own maps"
  on public.maps for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own maps"
  on public.maps for delete
  to authenticated
  using (auth.uid() = user_id);

-- Materials
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps (id) on delete cascade,
  type varchar(20) not null check (type in ('text', 'pdf')),
  content text not null,
  file_name varchar(255),
  created_at timestamptz not null default now()
);

alter table public.materials enable row level security;

create policy "Users can read materials for own maps"
  on public.materials for select
  to authenticated
  using (exists (
    select 1 from public.maps m where m.id = materials.map_id and m.user_id = auth.uid()
  ));

create policy "Users can insert materials for own maps"
  on public.materials for insert
  to authenticated
  with check (exists (
    select 1 from public.maps m where m.id = materials.map_id and m.user_id = auth.uid()
  ));

create policy "Users can delete materials for own maps"
  on public.materials for delete
  to authenticated
  using (exists (
    select 1 from public.maps m where m.id = materials.map_id and m.user_id = auth.uid()
  ));

-- Nodes
create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps (id) on delete cascade,
  parent_id uuid references public.nodes (id) on delete set null,
  label varchar(255) not null,
  description text,
  position_x float not null default 0,
  position_y float not null default 0,
  level integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nodes enable row level security;

create policy "Users can read nodes for own maps"
  on public.nodes for select
  to authenticated
  using (exists (
    select 1 from public.maps m where m.id = nodes.map_id and m.user_id = auth.uid()
  ));

create policy "Users can insert nodes for own maps"
  on public.nodes for insert
  to authenticated
  with check (exists (
    select 1 from public.maps m where m.id = nodes.map_id and m.user_id = auth.uid()
  ));

create policy "Users can update nodes for own maps"
  on public.nodes for update
  to authenticated
  using (exists (
    select 1 from public.maps m where m.id = nodes.map_id and m.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.maps m where m.id = nodes.map_id and m.user_id = auth.uid()
  ));

create policy "Users can delete nodes for own maps"
  on public.nodes for delete
  to authenticated
  using (exists (
    select 1 from public.maps m where m.id = nodes.map_id and m.user_id = auth.uid()
  ));

-- Edges
create table if not exists public.edges (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps (id) on delete cascade,
  source_node_id uuid not null references public.nodes (id) on delete cascade,
  target_node_id uuid not null references public.nodes (id) on delete cascade,
  relationship varchar(100),
  created_at timestamptz not null default now()
);

alter table public.edges enable row level security;

create policy "Users can read edges for own maps"
  on public.edges for select
  to authenticated
  using (exists (
    select 1 from public.maps m where m.id = edges.map_id and m.user_id = auth.uid()
  ));

create policy "Users can insert edges for own maps"
  on public.edges for insert
  to authenticated
  with check (exists (
    select 1 from public.maps m where m.id = edges.map_id and m.user_id = auth.uid()
  ));

create policy "Users can delete edges for own maps"
  on public.edges for delete
  to authenticated
  using (exists (
    select 1 from public.maps m where m.id = edges.map_id and m.user_id = auth.uid()
  ));

-- Indexes
create index if not exists idx_maps_user_id on public.maps (user_id);
create index if not exists idx_materials_map_id on public.materials (map_id);
create index if not exists idx_nodes_map_id on public.nodes (map_id);
create index if not exists idx_nodes_parent_id on public.nodes (parent_id);
create index if not exists idx_edges_map_id on public.edges (map_id);
create index if not exists idx_edges_source_node_id on public.edges (source_node_id);
create index if not exists idx_edges_target_node_id on public.edges (target_node_id);