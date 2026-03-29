drop function if exists public.get_my_profile();

create function public.get_my_profile()
returns table (
  id uuid,
  role public.user_role,
  full_name text,
  email text,
  branch_id uuid,
  must_change_password boolean,
  requires_pin_setup boolean,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.role,
    p.full_name,
    p.email,
    p.branch_id,
    p.must_change_password,
    p.requires_pin_setup,
    p.is_active
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_profile() from public, anon, authenticated;
grant execute on function public.get_my_profile() to authenticated, service_role;

create or replace function public.complete_password_change()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    must_change_password = false,
    updated_at = timezone('utc', now())
  where id = auth.uid();

  return true;
end;
$$;

revoke all on function public.complete_password_change() from public, anon, authenticated;
grant execute on function public.complete_password_change() to authenticated, service_role;
