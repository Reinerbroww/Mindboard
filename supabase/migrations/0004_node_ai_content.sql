-- Persisted AI output so a node's explanation survives reloads and other
-- devices, instead of living only in browser storage.

create table if not exists public.node_ai_content (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps (id) on delete cascade,
  node_id uuid not null references public.nodes (id) on delete cascade,
  kind varchar(20) not null check (kind in ('explain', 'connection')),
  language varchar(2) not null default 'en' check (language in ('en', 'id')),
  -- Shape depends on kind: { explanation } for 'explain', the structured
  -- connection note for 'connection'.
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One stored answer per node, per kind, per language.
  unique (node_id, kind, language)
);

alter table public.node_ai_content enable row level security;

create policy "Users can read ai content for own maps"
  on public.node_ai_content for select
  to authenticated
  using (exists (
    select 1 from public.maps m where m.id = node_ai_content.map_id and m.user_id = auth.uid()
  ));

create policy "Users can insert ai content for own maps"
  on public.node_ai_content for insert
  to authenticated
  with check (exists (
    select 1 from public.maps m where m.id = node_ai_content.map_id and m.user_id = auth.uid()
  ));

create policy "Users can update ai content for own maps"
  on public.node_ai_content for update
  to authenticated
  using (exists (
    select 1 from public.maps m where m.id = node_ai_content.map_id and m.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.maps m where m.id = node_ai_content.map_id and m.user_id = auth.uid()
  ));

create policy "Users can delete ai content for own maps"
  on public.node_ai_content for delete
  to authenticated
  using (exists (
    select 1 from public.maps m where m.id = node_ai_content.map_id and m.user_id = auth.uid()
  ));

create index if not exists idx_node_ai_content_map_id on public.node_ai_content (map_id);
create index if not exists idx_node_ai_content_node_id on public.node_ai_content (node_id);