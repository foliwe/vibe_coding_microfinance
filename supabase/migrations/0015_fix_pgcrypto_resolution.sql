create or replace function public.set_my_transaction_pin(
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
begin
  select *
  into v_actor
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then
    raise exception 'active actor profile not found';
  end if;

  if v_actor.role not in ('agent', 'branch_manager') then
    raise exception 'only staff can set transaction pins';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'transaction pin must be exactly 4 digits';
  end if;

  insert into public.staff_users (
    profile_id,
    branch_id,
    transaction_pin_hash,
    device_binding_required,
    status
  )
  values (
    v_actor.id,
    v_actor.branch_id,
    extensions.crypt(p_pin, extensions.gen_salt('bf')),
    true,
    'active'
  )
  on conflict (profile_id)
  do update
    set
      branch_id = excluded.branch_id,
      transaction_pin_hash = excluded.transaction_pin_hash;

  update public.profiles
  set
    requires_pin_setup = false,
    updated_at = timezone('utc', now())
  where id = v_actor.id;

  perform public.write_audit_log(
    v_actor.id,
    v_actor.branch_id,
    'set_transaction_pin',
    'profile',
    v_actor.id::text
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
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role <> 'agent' then
    raise exception 'only agents can create transaction requests';
  end if;

  if v_actor.branch_id is null then
    raise exception 'agent branch is required';
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
