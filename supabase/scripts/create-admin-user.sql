-- Run in the Supabase SQL editor as a privileged user such as `postgres`.
-- Do not run this through a client session that uses the `authenticated` role.
-- Client-side SQL runners cannot create Auth users because they cannot access `auth.users`.
-- Update the values in this section before running.
do $$
declare
  v_email text := 'new-admin@example.com';
  v_password text := 'ChangeMe123!';
  v_full_name text := 'New Admin';
  v_phone text := '+237600000999';
  v_user_id uuid;
begin
  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(v_email)
  limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', v_full_name, 'email_verified', true),
      now(),
      now()
    );
  else
    update auth.users
    set
      email = v_email,
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = jsonb_build_object(
        'provider',
        'email',
        'providers',
        jsonb_build_array('email')
      ),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'full_name',
        v_full_name,
        'email_verified',
        true
      ),
      updated_at = now()
    where id = v_user_id;
  end if;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object(
      'sub',
      v_user_id::text,
      'email',
      v_email,
      'email_verified',
      true,
      'phone_verified',
      false
    ),
    'email',
    null,
    now(),
    now()
  )
  on conflict (provider, provider_id) do update
  set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now();

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
