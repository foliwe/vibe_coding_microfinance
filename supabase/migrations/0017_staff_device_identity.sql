alter table public.device_registrations
  add column if not exists device_kind text;

update public.device_registrations dr
set device_kind = case
  when p.role = 'branch_manager' then 'workstation'
  else 'mobile'
end
from public.profiles p
where p.id = dr.profile_id
  and dr.device_kind is null;

alter table public.device_registrations
  alter column device_kind set not null;

alter table public.device_registrations
  drop constraint if exists device_registrations_device_kind_check;

alter table public.device_registrations
  add constraint device_registrations_device_kind_check
  check (device_kind in ('mobile', 'workstation'));

create unique index if not exists device_registrations_active_profile_idx
  on public.device_registrations (profile_id)
  where is_active = true;

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
  v_registration public.device_registrations;
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

  update public.device_registrations
  set is_active = false
  where profile_id = v_actor.id
    and is_active = true
    and device_id <> v_device_id;

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

  if v_device_id is null then
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
      null::text,
      null::text,
      null::text;
    return;
  end if;

  select *
  into v_registration
  from public.device_registrations
  where profile_id = v_actor.id
    and is_active = true
  order by last_seen_at desc nulls last, created_at desc
  limit 1;

  if not found then
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

create or replace function public.reset_staff_device(
  p_profile_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_target public.profiles;
  v_cleared_count integer := 0;
begin
  select *
  into v_actor
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then
    raise exception 'active actor profile not found';
  end if;

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can reset trusted staff devices';
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_profile_id
    and role in ('agent', 'branch_manager');

  if not found then
    raise exception 'target staff profile not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id is distinct from v_target.branch_id then
    raise exception 'branch managers can only reset trusted devices in their branch';
  end if;

  update public.device_registrations
  set is_active = false
  where profile_id = v_target.id
    and is_active = true;

  get diagnostics v_cleared_count = row_count;

  insert into public.staff_users (
    profile_id,
    branch_id,
    device_binding_required,
    status
  )
  values (
    v_target.id,
    v_target.branch_id,
    true,
    'active'
  )
  on conflict (profile_id)
  do update
    set
      branch_id = excluded.branch_id,
      device_binding_required = true,
      status = 'active';

  perform public.write_audit_log(
    v_actor.id,
    v_target.branch_id,
    'reset_staff_device',
    'profile',
    v_target.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'reason', nullif(trim(p_reason), ''),
        'cleared_active_registrations', v_cleared_count
      )
    )
  );

  return true;
end;
$$;

create or replace function public.create_transaction_request(
  p_actor_id uuid,
  p_member_account_id uuid,
  p_transaction_type public.transaction_type,
  p_amount numeric,
  p_note text default null,
  p_idempotency_key text default null,
  p_submitted_offline boolean default false,
  p_device_id text default null,
  p_payload_hash text default null,
  p_transaction_pin text default null
)
returns public.transaction_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_request public.transaction_requests;
  v_member_account public.member_accounts;
  v_member public.member_profiles;
  v_assigned_agent_id uuid;
  v_staff_user public.staff_users;
  v_device_access record;
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role <> 'agent' then
    raise exception 'only agents can create transaction requests';
  end if;

  if v_actor.branch_id is null then
    raise exception 'agent branch is required';
  end if;

  select *
  into v_device_access
  from public.assert_staff_device_access(p_device_id, 'mobile')
  limit 1;

  if coalesce(v_device_access.access, 'blocked') <> 'allowed' then
    raise exception 'this account is locked to a different phone';
  end if;

  if p_transaction_type not in ('deposit', 'withdrawal') then
    raise exception 'unsupported transaction type %', p_transaction_type;
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;

  if p_transaction_type = 'withdrawal' then
    if coalesce(p_submitted_offline, false) then
      raise exception 'withdrawals require connectivity';
    end if;

    if p_transaction_pin is null or p_transaction_pin !~ '^[0-9]{4}$' then
      raise exception 'transaction pin is required for withdrawals';
    end if;

    select *
    into v_staff_user
    from public.staff_users su
    where su.profile_id = v_actor.id
      and su.status = 'active'
    limit 1;

    if not found or v_staff_user.transaction_pin_hash is null then
      raise exception 'transaction pin setup is required before withdrawals';
    end if;

    if extensions.crypt(p_transaction_pin, v_staff_user.transaction_pin_hash) <> v_staff_user.transaction_pin_hash then
      raise exception 'invalid transaction pin';
    end if;
  end if;

  if p_idempotency_key is not null then
    select *
    into v_request
    from public.transaction_requests tr
    where tr.idempotency_key = p_idempotency_key
      and tr.created_by = p_actor_id
    limit 1;

    if found then
      return v_request;
    end if;
  end if;

  select ma.*
  into v_member_account
  from public.member_accounts ma
  where ma.id = p_member_account_id
    and ma.status = 'active';

  if not found then
    raise exception 'active member account not found';
  end if;

  select mp.*
  into v_member
  from public.member_profiles mp
  where mp.profile_id = v_member_account.member_profile_id
    and mp.branch_id = v_actor.branch_id
    and mp.status = 'active';

  if not found then
    raise exception 'active member profile not found in agent branch';
  end if;

  if v_member_account.branch_id <> v_actor.branch_id then
    raise exception 'member account branch mismatch';
  end if;

  select ama.agent_profile_id
  into v_assigned_agent_id
  from public.agent_member_assignments ama
  where ama.member_profile_id = v_member.profile_id
    and ama.is_active = true
  order by ama.starts_at desc
  limit 1;

  if v_assigned_agent_id is null then
    v_assigned_agent_id := v_member.assigned_agent_id;
  end if;

  if v_assigned_agent_id is not null and v_assigned_agent_id <> v_actor.id then
    raise exception 'member is not assigned to this agent';
  end if;

  insert into public.transaction_requests (
    branch_id,
    member_profile_id,
    member_account_id,
    agent_profile_id,
    transaction_type,
    amount,
    note,
    status,
    idempotency_key,
    submitted_offline,
    device_id,
    payload_hash,
    created_by
  )
  values (
    v_actor.branch_id,
    v_member.profile_id,
    v_member_account.id,
    v_actor.id,
    p_transaction_type,
    round(p_amount::numeric, 2),
    p_note,
    'pending_approval',
    p_idempotency_key,
    coalesce(p_submitted_offline, false),
    p_device_id,
    p_payload_hash,
    v_actor.id
  )
  returning * into v_request;

  perform public.write_audit_log(
    v_actor.id,
    v_actor.branch_id,
    'create_transaction_request',
    'transaction_request',
    v_request.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'transaction_type', v_request.transaction_type,
        'amount', v_request.amount,
        'member_account_id', v_request.member_account_id,
        'member_profile_id', v_request.member_profile_id,
        'submitted_offline', v_request.submitted_offline,
        'device_id', v_request.device_id,
        'payload_hash', v_request.payload_hash
      )
    )
  );

  return v_request;
end;
$$;

create or replace function public.submit_cash_reconciliation(
  p_counted_cash numeric,
  p_variance_reason text default null,
  p_device_id text default null
)
returns public.cash_reconciliations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_drawer public.cash_drawers;
  v_reconciliation public.cash_reconciliations;
  v_counted_cash numeric(18,2);
  v_expected_cash numeric(18,2);
  v_variance numeric(18,2);
  v_device_access record;
begin
  select *
  into v_actor
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then
    raise exception 'active actor profile not found';
  end if;

  if v_actor.role <> 'agent' then
    raise exception 'only agents can submit cash reconciliations';
  end if;

  select *
  into v_device_access
  from public.assert_staff_device_access(p_device_id, 'mobile')
  limit 1;

  if coalesce(v_device_access.access, 'blocked') <> 'allowed' then
    raise exception 'this account is locked to a different phone';
  end if;

  if p_counted_cash is null or p_counted_cash < 0 then
    raise exception 'counted cash must be zero or greater';
  end if;

  select *
  into v_drawer
  from public.cash_drawers cd
  where cd.agent_profile_id = v_actor.id
    and cd.business_date = timezone('utc', now())::date
  for update;

  if not found then
    raise exception 'no open cash drawer found for today';
  end if;

  if v_drawer.status = 'closed' then
    raise exception 'cash drawer is already closed';
  end if;

  if exists (
    select 1
    from public.cash_reconciliations cr
    where cr.cash_drawer_id = v_drawer.id
      and cr.status = 'pending_review'
  ) then
    raise exception 'cash reconciliation is already pending review';
  end if;

  v_counted_cash := round(p_counted_cash::numeric, 2);
  v_expected_cash := round(coalesce(v_drawer.expected_cash, 0)::numeric, 2);
  v_variance := round((v_counted_cash - v_expected_cash)::numeric, 2);

  if v_variance <> 0 and coalesce(nullif(trim(p_variance_reason), ''), null) is null then
    raise exception 'variance reason is required when counted cash differs from expected cash';
  end if;

  update public.cash_drawers
  set
    counted_cash = v_counted_cash,
    variance = v_variance,
    status = 'pending_review'
  where id = v_drawer.id
  returning * into v_drawer;

  insert into public.cash_reconciliations (
    branch_id,
    cash_drawer_id,
    submitted_by,
    reviewed_by,
    counted_cash,
    expected_cash,
    variance,
    variance_reason,
    status,
    submitted_at,
    reviewed_at,
    review_note
  )
  values (
    v_drawer.branch_id,
    v_drawer.id,
    v_actor.id,
    null,
    v_counted_cash,
    v_expected_cash,
    v_variance,
    nullif(trim(p_variance_reason), ''),
    'pending_review',
    timezone('utc', now()),
    null,
    null
  )
  returning * into v_reconciliation;

  perform public.write_audit_log(
    v_actor.id,
    v_drawer.branch_id,
    'submit_cash_reconciliation',
    'cash_reconciliation',
    v_reconciliation.id::text,
    jsonb_build_object(
      'cash_drawer_id', v_drawer.id,
      'counted_cash', v_counted_cash,
      'expected_cash', v_expected_cash,
      'variance', v_variance,
      'device_id', p_device_id
    )
  );

  return v_reconciliation;
end;
$$;

revoke all on function public.register_my_device(text, text, text) from public, anon, authenticated;
grant execute on function public.register_my_device(text, text, text) to authenticated, service_role;

revoke all on function public.assert_staff_device_access(text, text) from public, anon, authenticated;
grant execute on function public.assert_staff_device_access(text, text) to authenticated, service_role;

revoke all on function public.reset_staff_device(uuid, text) from public, anon, authenticated;
grant execute on function public.reset_staff_device(uuid, text) to authenticated, service_role;

revoke all on function public.create_transaction_request(
  uuid,
  uuid,
  public.transaction_type,
  numeric,
  text,
  text,
  boolean,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.create_transaction_request(
  uuid,
  uuid,
  public.transaction_type,
  numeric,
  text,
  text,
  boolean,
  text,
  text,
  text
) to authenticated, service_role;

revoke all on function public.submit_cash_reconciliation(numeric, text, text) from public, anon, authenticated;
grant execute on function public.submit_cash_reconciliation(numeric, text, text) to authenticated, service_role;
