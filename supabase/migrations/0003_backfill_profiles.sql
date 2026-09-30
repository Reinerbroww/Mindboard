-- Repair: backfill public.users rows for auth users that predate the
-- on_auth_user_created trigger (or were created before the DB applied 0001).
-- Symptoms fixed: "23503 ... violates foreign key constraint "maps_user_id_fkey""
-- when creating a map, because public.maps.user_id references public.users(id).

-- 1) Backfill missing profile rows from auth.users (idempotent).
insert into public.users (id, email, name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- 2) Ensure the trigger exists so future signups always get a row.
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