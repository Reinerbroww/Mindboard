-- Map content language, so a map remembers the language its nodes are written
-- in and every later AI feature follows it.

alter table public.maps
  add column if not exists language varchar(2) not null default 'en';

-- Existing maps default to English, matching their generated content.
update public.maps set language = 'en' where language is null or language not in ('en', 'id');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'maps_language_check'
  ) then
    alter table public.maps
      add constraint maps_language_check check (language in ('en', 'id'));
  end if;
end;
$$;

-- Applies a finished translation in one transaction: either every node's text
-- and the map's language change together, or nothing does. A partial update is
-- impossible, so a failed save can never leave a half-translated map.
-- `security invoker` keeps the existing RLS policies in force.
create or replace function public.apply_map_translation(
  p_map_id uuid,
  p_language varchar,
  p_translations jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.nodes n
  set label = t.label,
      description = t.description,
      updated_at = now()
  from jsonb_to_recordset(p_translations) as t(id uuid, label text, description text)
  where n.id = t.id
    and n.map_id = p_map_id;

  update public.maps m
  set language = p_language,
      updated_at = now()
  where m.id = p_map_id;
end;
$$;

grant execute on function public.apply_map_translation(uuid, varchar, jsonb) to authenticated;