-- Run this after creating the Auth user with a service-role script or Admin API.
-- This script only touches public.profiles and does not access auth.users.
-- Update the values in this section before running.
do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000000';
  v_email text := 'new-admin@example.com';
  v_full_name text := 'New Admin';
  v_phone text := '+237600000999';
begin
  insert into public.profiles (
    id,
    role,
    full_name,
    phone,
    email,
    branch_id,
    must_change_password,
    requires_pin_setup,
    is_active
  )
  values (
    v_user_id,
    'admin',
    v_full_name,
    v_phone,
    v_email,
    null,
    false,
    false,
    true
  )
  on conflict (id) do update
  set
    role = excluded.role,
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    branch_id = null,
    must_change_password = false,
    requires_pin_setup = false,
    is_active = true,
    updated_at = now();
end
$$;
