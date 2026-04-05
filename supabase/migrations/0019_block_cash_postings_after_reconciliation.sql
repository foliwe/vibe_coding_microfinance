create or replace function public.assert_cash_drawer_available(
  p_branch_id uuid,
  p_agent_profile_id uuid,
  p_business_date date,
  p_action_label text default 'cash posting'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drawer public.cash_drawers;
begin
  select *
  into v_drawer
  from public.cash_drawers
  where branch_id = p_branch_id
    and agent_profile_id = p_agent_profile_id
    and business_date = p_business_date
  for update;

  if found and v_drawer.status <> 'open' then
    raise exception 'cash drawer is % and cannot accept % for %',
      v_drawer.status,
      p_action_label,
      p_business_date;
  end if;
end;
$$;

create or replace function public.approve_transaction_request(
  p_request_id uuid,
  p_actor_id uuid,
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
    raise exception 'only admins and branch managers can approve transactions';
  end if;

  select *
  into v_request
  from public.transaction_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'transaction request not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_request.branch_id then
    raise exception 'branch managers can only approve requests in their branch';
  end if;

  if v_request.created_by = v_actor.id then
    raise exception 'maker-checker violation';
  end if;

  if v_request.status <> 'pending_approval' then
    raise exception 'request is not pending approval';
  end if;

  select ma.*
  into v_member_account
  from public.member_accounts ma
  where ma.id = v_request.member_account_id
    and ma.branch_id = v_request.branch_id
    and ma.status = 'active';

  if not found then
    raise exception 'active member account not found for request';
  end if;

  if v_member_account.member_profile_id <> v_request.member_profile_id then
    raise exception 'member account does not belong to request member';
  end if;

  if v_request.transaction_type = 'withdrawal' then
    v_available_balance := public.get_member_account_balance(v_request.member_account_id);

    if v_available_balance < v_request.amount then
      raise exception 'insufficient approved balance';
    end if;
  end if;

  perform public.assert_cash_drawer_available(
    v_request.branch_id,
    v_request.agent_profile_id,
    v_business_date,
    v_request.transaction_type::text
  );

  v_member_ledger_account_id := public.ensure_member_ledger_account(v_request.member_account_id);
  v_cash_ledger_account_id := public.ensure_agent_cash_ledger_account(
    v_request.branch_id,
    v_request.agent_profile_id
  );
  v_amount := round(v_request.amount::numeric, 2);

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
    v_request.created_by,
    v_actor.id,
    v_request.transaction_type,
    format(
      '%s %s for request %s',
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

  update public.transaction_requests
  set status = 'approved',
      approved_at = timezone('utc', now())
  where id = p_request_id
  returning * into v_request;

  insert into public.approval_actions (request_id, action, actor_id, note)
  values (p_request_id, 'approve', v_actor.id, p_note);

  perform public.write_audit_log(
    v_actor.id,
    v_request.branch_id,
    'approve_transaction',
    'transaction_request',
    p_request_id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'transaction_type', v_request.transaction_type,
        'amount', v_request.amount,
        'journal_id', v_journal_id,
        'member_account_id', v_request.member_account_id,
        'member_profile_id', v_request.member_profile_id,
        'agent_profile_id', v_request.agent_profile_id,
        'note', p_note
      )
    )
  );

  return v_request;
end;
$$;

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

  perform public.assert_cash_drawer_available(
    v_member.branch_id,
    v_cash_agent.id,
    v_business_date,
    p_transaction_type::text
  );

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

create or replace function public.disburse_loan(
  p_loan_id uuid,
  p_actor_id uuid,
  p_cash_agent_profile_id uuid,
  p_note text default null
)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_loan public.loans;
  v_cash_agent public.profiles;
  v_principal_ledger_account_id uuid;
  v_cash_ledger_account_id uuid;
  v_journal_id uuid;
  v_amount numeric(18,2);
  v_business_date date := timezone('utc', now())::date;
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can disburse loans';
  end if;

  select *
  into v_loan
  from public.loans
  where id = p_loan_id
  for update;

  if not found then
    raise exception 'loan not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_loan.branch_id then
    raise exception 'branch managers can only disburse loans in their branch';
  end if;

  if v_loan.status <> 'approved' then
    raise exception 'loan is not ready for disbursement';
  end if;

  select *
  into v_cash_agent
  from public.profiles
  where id = p_cash_agent_profile_id
    and role = 'agent'
    and branch_id = v_loan.branch_id
    and is_active = true;

  if not found then
    raise exception 'active agent not found for selected cash drawer';
  end if;

  perform public.assert_cash_drawer_available(
    v_loan.branch_id,
    p_cash_agent_profile_id,
    v_business_date,
    'loan_disbursement'
  );

  v_amount := round(v_loan.approved_principal::numeric, 2);
  v_principal_ledger_account_id := public.ensure_loan_ledger_account(v_loan.id, 'loan_principal');
  v_cash_ledger_account_id := public.ensure_agent_cash_ledger_account(
    v_loan.branch_id,
    p_cash_agent_profile_id
  );

  insert into public.ledger_journals (
    branch_id,
    loan_id,
    created_by,
    approved_by,
    journal_type,
    description
  )
  values (
    v_loan.branch_id,
    v_loan.id,
    v_actor.id,
    v_actor.id,
    'loan_disbursement',
    format('Loan disbursement %s for loan %s', v_amount, v_loan.id)
  )
  returning id into v_journal_id;

  insert into public.ledger_entries (journal_id, ledger_account_id, debit, credit)
  values
    (v_journal_id, v_principal_ledger_account_id, v_amount, 0),
    (v_journal_id, v_cash_ledger_account_id, 0, v_amount);

  perform public.ensure_cash_drawer(
    v_loan.branch_id,
    p_cash_agent_profile_id,
    v_business_date
  );

  update public.cash_drawers
  set expected_cash = round((expected_cash - v_amount)::numeric, 2)
  where agent_profile_id = p_cash_agent_profile_id
    and business_date = v_business_date;

  update public.loans
  set status = 'disbursed',
      disbursed_at = timezone('utc', now())
  where id = p_loan_id
  returning * into v_loan;

  perform public.write_audit_log(
    v_actor.id,
    v_loan.branch_id,
    'disburse_loan',
    'loan',
    v_loan.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'amount', v_amount,
        'cash_agent_profile_id', p_cash_agent_profile_id,
        'journal_id', v_journal_id,
        'note', p_note
      )
    )
  );

  return v_loan;
end;
$$;

create or replace function public.record_loan_repayment(
  p_loan_id uuid,
  p_actor_id uuid,
  p_cash_agent_profile_id uuid,
  p_amount numeric,
  p_repayment_mode public.repayment_mode,
  p_note text default null
)
returns public.loan_repayments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_loan public.loans;
  v_cash_agent public.profiles;
  v_repayment public.loan_repayments;
  v_cash_ledger_account_id uuid;
  v_principal_ledger_account_id uuid;
  v_interest_ledger_account_id uuid;
  v_journal_id uuid;
  v_amount numeric(18,2);
  v_interest_due numeric(18,2);
  v_interest_component numeric(18,2);
  v_principal_component numeric(18,2);
  v_remaining_principal numeric(18,2);
  v_business_date date := timezone('utc', now())::date;
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can record repayments';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'repayment amount must be greater than zero';
  end if;

  select *
  into v_loan
  from public.loans
  where id = p_loan_id
  for update;

  if not found then
    raise exception 'loan not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_loan.branch_id then
    raise exception 'branch managers can only record repayments in their branch';
  end if;

  if v_loan.status not in ('disbursed', 'active', 'defaulted') then
    raise exception 'loan is not in a repayable state';
  end if;

  if v_loan.remaining_principal <= 0 then
    raise exception 'loan has no remaining principal';
  end if;

  select *
  into v_cash_agent
  from public.profiles
  where id = p_cash_agent_profile_id
    and role = 'agent'
    and branch_id = v_loan.branch_id
    and is_active = true;

  if not found then
    raise exception 'active agent not found for selected cash drawer';
  end if;

  perform public.assert_cash_drawer_available(
    v_loan.branch_id,
    p_cash_agent_profile_id,
    v_business_date,
    'loan_repayment'
  );

  v_amount := round(p_amount::numeric, 2);
  v_interest_due := round((v_loan.remaining_principal * v_loan.monthly_interest_rate)::numeric, 2);

  if p_repayment_mode = 'interest_only' then
    if v_amount > v_interest_due then
      raise exception 'interest-only repayment cannot exceed current interest due';
    end if;

    v_interest_component := v_amount;
    v_principal_component := 0;
  else
    if v_amount > (v_interest_due + v_loan.remaining_principal) then
      raise exception 'repayment exceeds remaining obligation for the current cycle';
    end if;

    v_interest_component := least(v_amount, v_interest_due);
    v_principal_component := round(greatest(v_amount - v_interest_component, 0)::numeric, 2);
  end if;

  v_remaining_principal := round(
    greatest(v_loan.remaining_principal - v_principal_component, 0)::numeric,
    2
  );

  v_cash_ledger_account_id := public.ensure_agent_cash_ledger_account(
    v_loan.branch_id,
    p_cash_agent_profile_id
  );
  v_principal_ledger_account_id := public.ensure_loan_ledger_account(v_loan.id, 'loan_principal');

  if v_interest_component > 0 then
    v_interest_ledger_account_id := public.ensure_loan_ledger_account(v_loan.id, 'loan_interest');
  end if;

  insert into public.ledger_journals (
    branch_id,
    loan_id,
    created_by,
    approved_by,
    journal_type,
    description
  )
  values (
    v_loan.branch_id,
    v_loan.id,
    v_actor.id,
    v_actor.id,
    'loan_repayment',
    format('Loan repayment %s for loan %s', v_amount, v_loan.id)
  )
  returning id into v_journal_id;

  insert into public.ledger_entries (journal_id, ledger_account_id, debit, credit)
  values (v_journal_id, v_cash_ledger_account_id, v_amount, 0);

  if v_interest_component > 0 then
    insert into public.ledger_entries (journal_id, ledger_account_id, debit, credit)
    values (v_journal_id, v_interest_ledger_account_id, 0, v_interest_component);
  end if;

  if v_principal_component > 0 then
    insert into public.ledger_entries (journal_id, ledger_account_id, debit, credit)
    values (v_journal_id, v_principal_ledger_account_id, 0, v_principal_component);
  end if;

  insert into public.loan_repayments (
    loan_id,
    branch_id,
    amount,
    repayment_mode,
    interest_component,
    principal_component,
    created_by,
    approved_by
  )
  values (
    v_loan.id,
    v_loan.branch_id,
    v_amount,
    p_repayment_mode,
    v_interest_component,
    v_principal_component,
    v_actor.id,
    v_actor.id
  )
  returning * into v_repayment;

  perform public.ensure_cash_drawer(
    v_loan.branch_id,
    p_cash_agent_profile_id,
    v_business_date
  );

  update public.cash_drawers
  set expected_cash = round((expected_cash + v_amount)::numeric, 2)
  where agent_profile_id = p_cash_agent_profile_id
    and business_date = v_business_date;

  update public.loans
  set remaining_principal = v_remaining_principal,
      status = case
        when v_remaining_principal = 0 then 'closed'::public.loan_status
        else 'active'::public.loan_status
      end
  where id = p_loan_id;

  perform public.write_audit_log(
    v_actor.id,
    v_loan.branch_id,
    'record_loan_repayment',
    'loan',
    v_loan.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'repayment_id', v_repayment.id,
        'cash_agent_profile_id', p_cash_agent_profile_id,
        'amount', v_repayment.amount,
        'repayment_mode', v_repayment.repayment_mode,
        'interest_component', v_repayment.interest_component,
        'principal_component', v_repayment.principal_component,
        'remaining_principal', v_remaining_principal,
        'journal_id', v_journal_id,
        'note', p_note
      )
    )
  );

  return v_repayment;
end;
$$;
