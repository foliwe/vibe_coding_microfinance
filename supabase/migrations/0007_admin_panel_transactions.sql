create or replace function public.create_admin_transaction(
  p_actor_id uuid,
  p_member_account_id uuid,
  p_cash_agent_profile_id uuid,
  p_transaction_type public.transaction_type,
  p_amount numeric,
  p_note text default null
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
  v_cash_agent public.profiles;
  v_member_ledger_account_id uuid;
  v_cash_ledger_account_id uuid;
  v_journal_id uuid;
  v_amount numeric(18,2);
  v_business_date date := timezone('utc', now())::date;
  v_cash_delta numeric(18,2);
  v_available_balance numeric(18,2);
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can create admin transactions';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id is null then
    raise exception 'branch manager branch is required';
  end if;

  if p_transaction_type not in ('deposit', 'withdrawal') then
    raise exception 'unsupported transaction type %', p_transaction_type;
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be greater than zero';
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
    and mp.status = 'active';

  if not found then
    raise exception 'active member profile not found';
  end if;

  if v_member_account.branch_id <> v_member.branch_id then
    raise exception 'member account branch mismatch';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_member.branch_id then
    raise exception 'branch managers can only create transactions in their branch';
  end if;

  select *
  into v_cash_agent
  from public.profiles
  where id = p_cash_agent_profile_id
    and role = 'agent'
    and is_active = true;

  if not found then
    raise exception 'active agent not found for selected cash drawer';
  end if;

  if v_cash_agent.branch_id <> v_member.branch_id then
    raise exception 'selected cash drawer agent must belong to the member branch';
  end if;

  if p_transaction_type = 'withdrawal' then
    v_available_balance := public.get_member_account_balance(v_member_account.id);

    if v_available_balance < p_amount then
      raise exception 'insufficient approved balance';
    end if;
  end if;

  v_member_ledger_account_id := public.ensure_member_ledger_account(v_member_account.id);
  v_cash_ledger_account_id := public.ensure_agent_cash_ledger_account(
    v_member.branch_id,
    v_cash_agent.id
  );
  v_amount := round(p_amount::numeric, 2);

  insert into public.transaction_requests (
    branch_id,
    member_profile_id,
    member_account_id,
    agent_profile_id,
    transaction_type,
    amount,
    note,
    status,
    submitted_offline,
    approved_at,
    created_by
  )
  values (
    v_member.branch_id,
    v_member.profile_id,
    v_member_account.id,
    v_cash_agent.id,
    p_transaction_type,
    v_amount,
    p_note,
    'approved',
    false,
    timezone('utc', now()),
    v_actor.id
  )
  returning * into v_request;

  insert into public.ledger_journals (
    branch_id,
    transaction_request_id,
    created_by,
    approved_by,
    journal_type,
    description
  )
  values (
    v_request.branch_id,
    v_request.id,
    v_actor.id,
    v_actor.id,
    v_request.transaction_type,
    format(
      '%s %s from admin panel for request %s',
      initcap(v_request.transaction_type::text),
      v_amount,
      v_request.id
    )
  )
  returning id into v_journal_id;

  if v_request.transaction_type = 'deposit' then
    insert into public.ledger_entries (journal_id, ledger_account_id, debit, credit)
    values
      (v_journal_id, v_cash_ledger_account_id, v_amount, 0),
      (v_journal_id, v_member_ledger_account_id, 0, v_amount);

    v_cash_delta := v_amount;
  else
    insert into public.ledger_entries (journal_id, ledger_account_id, debit, credit)
    values
      (v_journal_id, v_member_ledger_account_id, v_amount, 0),
      (v_journal_id, v_cash_ledger_account_id, 0, v_amount);

    v_cash_delta := -v_amount;
  end if;

  perform public.ensure_cash_drawer(
    v_request.branch_id,
    v_request.agent_profile_id,
    v_business_date
  );

  update public.cash_drawers
  set expected_cash = round((expected_cash + v_cash_delta)::numeric, 2)
  where agent_profile_id = v_request.agent_profile_id
    and business_date = v_business_date;

  insert into public.approval_actions (request_id, action, actor_id, note)
  values (v_request.id, 'approve', v_actor.id, p_note);

  perform public.write_audit_log(
    v_actor.id,
    v_request.branch_id,
    'create_admin_transaction',
    'transaction_request',
    v_request.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'transaction_type', v_request.transaction_type,
        'amount', v_request.amount,
        'member_account_id', v_request.member_account_id,
        'member_profile_id', v_request.member_profile_id,
        'cash_agent_profile_id', v_request.agent_profile_id,
        'auto_approved', true,
        'source', 'admin_panel'
      )
    )
  );

  perform public.write_audit_log(
    v_actor.id,
    v_request.branch_id,
    'approve_transaction',
    'transaction_request',
    v_request.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'transaction_type', v_request.transaction_type,
        'amount', v_request.amount,
        'journal_id', v_journal_id,
        'member_account_id', v_request.member_account_id,
        'member_profile_id', v_request.member_profile_id,
        'agent_profile_id', v_request.agent_profile_id,
        'note', p_note,
        'source', 'admin_panel'
      )
    )
  );

  return v_request;
end;
$$;

revoke all on function public.create_admin_transaction(
  uuid,
  uuid,
  uuid,
  public.transaction_type,
  numeric,
  text
) from public, anon, authenticated;

grant execute on function public.create_admin_transaction(
  uuid,
  uuid,
  uuid,
  public.transaction_type,
  numeric,
  text
) to authenticated, service_role;
