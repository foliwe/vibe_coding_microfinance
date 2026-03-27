create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_branch_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'branch_manager';
$$;

create or replace function public.get_my_profile()
returns table (
  id uuid,
  role public.user_role,
  full_name text,
  email text,
  branch_id uuid,
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
    p.is_active
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;
