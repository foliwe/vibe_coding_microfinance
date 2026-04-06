create or replace function public.register_my_device(
  p_device_id text,
  p_device_name text,
  p_device_kind text
)
returns public.device_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_device_id text;
  v_device_name text;
  v_expected_kind text;
  v_active_registration public.device_registrations;
  v_registration public.device_registrations;
  v_has_active_registration boolean := false;
begin
  select *
  into v_actor
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then
    raise exception 'active actor profile not found';
  end if;

  if v_actor.role = 'admin' then
    raise exception 'admins are exempt from device registration';
  end if;

  if v_actor.role not in ('agent', 'branch_manager') then
    raise exception 'only staff can register trusted devices';
  end if;

  if v_actor.must_change_password or v_actor.requires_pin_setup then
    raise exception 'complete password and transaction pin setup before trusting this device';
  end if;

  if v_actor.branch_id is null then
    raise exception 'staff branch assignment is required before trusting a device';
  end if;

  v_device_id := nullif(trim(p_device_id), '');
  v_device_name := coalesce(nullif(trim(p_device_name), ''), 'Trusted staff device');
  v_expected_kind := case
    when v_actor.role = 'agent' then 'mobile'
    else 'workstation'
  end;

  if v_device_id is null then
    raise exception 'device id is required';
  end if;

  if nullif(trim(p_device_kind), '') is distinct from v_expected_kind then
    raise exception 'device kind % is not valid for role %', p_device_kind, v_actor.role;
  end if;

  select *
  into v_active_registration
  from public.device_registrations
  where profile_id = v_actor.id
    and is_active = true
  order by last_seen_at desc nulls last, created_at desc
  limit 1;

  v_has_active_registration := found;

  if v_has_active_registration
    and (
      v_active_registration.device_id is distinct from v_device_id
      or v_active_registration.device_kind is distinct from v_expected_kind
    ) then
    perform public.write_audit_log(
      v_actor.id,
      v_actor.branch_id,
      'device_access_denied',
      'device_registration',
      v_active_registration.id::text,
      jsonb_build_object(
        'attempted_device_id', v_device_id,
        'attempted_device_kind', p_device_kind,
        'active_device_id', v_active_registration.device_id,
        'active_device_kind', v_active_registration.device_kind,
        'reason', 'rebind_requires_reset'
      )
    );

    raise exception 'this account already has an active trusted device; reset it before rebinding';
  end if;

  insert into public.device_registrations (
    profile_id,
    device_id,
    device_name,
    device_kind,
    is_active,
    last_seen_at
  )
  values (
    v_actor.id,
    v_device_id,
    v_device_name,
    v_expected_kind,
    true,
    timezone('utc', now())
  )
  on conflict (profile_id, device_id)
  do update
    set
      device_name = excluded.device_name,
      device_kind = excluded.device_kind,
      is_active = true,
      last_seen_at = excluded.last_seen_at
  returning * into v_registration;

  update public.device_registrations
  set is_active = false
  where profile_id = v_actor.id
    and is_active = true
    and id <> v_registration.id;

  insert into public.staff_users (
    profile_id,
    branch_id,
    device_binding_required,
    status
  )
  values (
    v_actor.id,
    v_actor.branch_id,
    false,
    'active'
  )
  on conflict (profile_id)
  do update
    set
      branch_id = excluded.branch_id,
      device_binding_required = false,
      status = 'active';

  perform public.write_audit_log(
    v_actor.id,
    v_actor.branch_id,
    'register_device',
    'device_registration',
    v_registration.id::text,
    jsonb_build_object(
      'device_id', v_registration.device_id,
      'device_kind', v_registration.device_kind,
      'device_name', v_registration.device_name
    )
  );

  return v_registration;
end;
$$;

create or replace function public.assert_staff_device_access(
  p_device_id text,
  p_device_kind text
)
returns table (
  access text,
  active_device_id text,
  active_device_name text,
  active_device_kind text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_device_id text;
  v_expected_kind text;
  v_registration public.device_registrations;
  v_has_active_registration boolean := false;
begin
  select *
  into v_actor
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then
    raise exception 'active actor profile not found';
  end if;

  if v_actor.role = 'admin' then
    return query
    select
      'allowed'::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  if v_actor.role not in ('agent', 'branch_manager') then
    return query
    select
      'allowed'::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  v_device_id := nullif(trim(p_device_id), '');
  v_expected_kind := case
    when v_actor.role = 'agent' then 'mobile'
    else 'workstation'
  end;

  select *
  into v_registration
  from public.device_registrations
  where profile_id = v_actor.id
    and is_active = true
  order by last_seen_at desc nulls last, created_at desc
  limit 1;

  v_has_active_registration := found;

  if v_device_id is null then
    if v_has_active_registration then
      perform public.write_audit_log(
        v_actor.id,
        v_actor.branch_id,
        'device_access_denied',
        'device_registration',
        v_registration.id::text,
        jsonb_build_object(
          'attempted_device_id', null,
          'attempted_device_kind', p_device_kind,
          'active_device_id', v_registration.device_id,
          'active_device_kind', v_registration.device_kind,
          'reason', 'missing_device_identity'
        )
      );

      return query
      select
        'blocked'::text,
        v_registration.device_id,
        v_registration.device_name,
        v_registration.device_kind;
      return;
    end if;

    return query
    select
      'needs_binding'::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  if nullif(trim(p_device_kind), '') is distinct from v_expected_kind then
    perform public.write_audit_log(
      v_actor.id,
      v_actor.branch_id,
      'device_access_denied',
      'profile',
      v_actor.id::text,
      jsonb_build_object(
        'attempted_device_id', v_device_id,
        'attempted_device_kind', p_device_kind,
        'reason', 'device_kind_mismatch'
      )
    );

    return query
    select
      'blocked'::text,
      case when v_has_active_registration then v_registration.device_id else null::text end,
      case when v_has_active_registration then v_registration.device_name else null::text end,
      case when v_has_active_registration then v_registration.device_kind else null::text end;
    return;
  end if;

  if not v_has_active_registration then
    return query
    select
      'needs_binding'::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  if v_registration.device_id = v_device_id and v_registration.device_kind = v_expected_kind then
    update public.device_registrations
    set last_seen_at = timezone('utc', now())
    where id = v_registration.id;

    update public.staff_users
    set device_binding_required = false
    where profile_id = v_actor.id;

    return query
    select
      'allowed'::text,
      v_registration.device_id,
      v_registration.device_name,
      v_registration.device_kind;
    return;
  end if;

  perform public.write_audit_log(
    v_actor.id,
    v_actor.branch_id,
    'device_access_denied',
    'device_registration',
    v_registration.id::text,
    jsonb_build_object(
      'attempted_device_id', v_device_id,
      'attempted_device_kind', p_device_kind,
      'active_device_id', v_registration.device_id,
      'active_device_kind', v_registration.device_kind
    )
  );

  return query
  select
    'blocked'::text,
    v_registration.device_id,
    v_registration.device_name,
    v_registration.device_kind;
end;
$$;
