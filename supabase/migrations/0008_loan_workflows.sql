alter table public.ledger_accounts
  add column if not exists loan_id uuid references public.loans (id) on delete cascade;

create unique index if not exists ledger_accounts_loan_unique_idx
  on public.ledger_accounts (loan_id, account_type)
  where loan_id is not null;

create or replace function public.ensure_loan_ledger_account(
  p_loan_id uuid,
  p_account_type public.account_type
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_account_id uuid;
  v_loan public.loans;
  v_member_name text;
  v_account_label text;
begin
  if p_account_type not in ('loan_principal', 'loan_interest') then
    raise exception 'unsupported loan ledger account type %', p_account_type;
  end if;

  select l.*
  into v_loan
  from public.loans l
  where l.id = p_loan_id;

  if not found then
    raise exception 'loan not found';
  end if;

  select p.full_name
  into v_member_name
  from public.profiles p
  where p.id = v_loan.member_profile_id;

  select la.id
  into v_ledger_account_id
  from public.ledger_accounts la
  where la.loan_id = p_loan_id
    and la.account_type = p_account_type
  limit 1;

  if v_ledger_account_id is not null then
    return v_ledger_account_id;
  end if;

  v_account_label :=
    case
      when p_account_type = 'loan_principal' then 'Loan principal'
      else 'Loan interest'
    end;

  insert into public.ledger_accounts (
    branch_id,
    owner_profile_id,
    loan_id,
    account_type,
    account_name
  )
  values (
    v_loan.branch_id,
    v_loan.member_profile_id,
    v_loan.id,
    p_account_type,
    format(
      '%s - %s - %s',
      v_account_label,
      coalesce(v_member_name, v_loan.member_profile_id::text),
      left(replace(v_loan.id::text, '-', ''), 6)
    )
  )
  on conflict (loan_id, account_type)
  where loan_id is not null
  do update
    set account_name = excluded.account_name
  returning id into v_ledger_account_id;

  return v_ledger_account_id;
end;
$$;

create or replace function public.create_loan_application(
  p_actor_id uuid,
  p_member_profile_id uuid,
  p_requested_amount numeric,
  p_monthly_interest_rate numeric,
  p_term_months integer,
  p_collateral_required boolean default false,
  p_collateral_notes text default null,
  p_note text default null
)
returns public.loan_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_member public.member_profiles;
  v_application public.loan_applications;
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can create loan applications';
  end if;

  if p_requested_amount is null or p_requested_amount <= 0 then
    raise exception 'requested amount must be greater than zero';
  end if;

  if p_monthly_interest_rate is null or p_monthly_interest_rate < 0 then
    raise exception 'monthly interest rate must be zero or greater';
  end if;

  if p_term_months is null or p_term_months <= 0 then
    raise exception 'term months must be greater than zero';
  end if;

  select mp.*
  into v_member
  from public.member_profiles mp
  where mp.profile_id = p_member_profile_id
    and mp.status = 'active';

  if not found then
    raise exception 'active member profile not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_member.branch_id then
    raise exception 'branch managers can only create applications in their branch';
  end if;

  insert into public.loan_applications (
    branch_id,
    member_profile_id,
    requested_amount,
    monthly_interest_rate,
    term_months,
    collateral_required,
    collateral_notes,
    status,
    created_by
  )
  values (
    v_member.branch_id,
    v_member.profile_id,
    round(p_requested_amount::numeric, 2),
    p_monthly_interest_rate,
    p_term_months,
    coalesce(p_collateral_required, false),
    nullif(trim(coalesce(p_collateral_notes, '')), ''),
    'application_submitted',
    v_actor.id
  )
  returning * into v_application;

  perform public.write_audit_log(
    v_actor.id,
    v_application.branch_id,
    'create_loan_application',
    'loan_application',
    v_application.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'member_profile_id', v_application.member_profile_id,
        'requested_amount', v_application.requested_amount,
        'monthly_interest_rate', v_application.monthly_interest_rate,
        'term_months', v_application.term_months,
        'collateral_required', v_application.collateral_required,
        'collateral_notes', v_application.collateral_notes,
        'note', p_note
      )
    )
  );

  return v_application;
end;
$$;

create or replace function public.start_loan_application_review(
  p_application_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns public.loan_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_application public.loan_applications;
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can review loan applications';
  end if;

  select *
  into v_application
  from public.loan_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'loan application not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_application.branch_id then
    raise exception 'branch managers can only review applications in their branch';
  end if;

  if v_application.status <> 'application_submitted' then
    raise exception 'loan application is not awaiting review';
  end if;

  update public.loan_applications
  set status = 'under_review',
      reviewed_by = v_actor.id
  where id = p_application_id
  returning * into v_application;

  perform public.write_audit_log(
    v_actor.id,
    v_application.branch_id,
    'start_loan_application_review',
    'loan_application',
    v_application.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'member_profile_id', v_application.member_profile_id,
        'note', p_note
      )
    )
  );

  return v_application;
end;
$$;

create or replace function public.approve_loan_application(
  p_application_id uuid,
  p_actor_id uuid,
  p_approved_principal numeric,
  p_note text default null
)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_application public.loan_applications;
  v_existing_loan_id uuid;
  v_loan public.loans;
  v_approved_principal numeric(18,2);
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can approve loan applications';
  end if;

  if p_approved_principal is null or p_approved_principal <= 0 then
    raise exception 'approved principal must be greater than zero';
  end if;

  select *
  into v_application
  from public.loan_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'loan application not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_application.branch_id then
    raise exception 'branch managers can only approve applications in their branch';
  end if;

  if v_application.status not in ('application_submitted', 'under_review') then
    raise exception 'loan application cannot be approved from status %', v_application.status;
  end if;

  if v_application.collateral_required
     and nullif(trim(coalesce(v_application.collateral_notes, '')), '') is null then
    raise exception 'collateral details are required before approval';
  end if;

  v_approved_principal := round(p_approved_principal::numeric, 2);

  if v_approved_principal > v_application.requested_amount then
    raise exception 'approved principal cannot exceed requested amount';
  end if;

  select l.id
  into v_existing_loan_id
  from public.loans l
  where l.application_id = p_application_id
  limit 1;

  if v_existing_loan_id is not null then
    raise exception 'loan already exists for this application';
  end if;

  update public.loan_applications
  set status = 'approved',
      reviewed_by = v_actor.id
  where id = p_application_id
  returning * into v_application;

  insert into public.loans (
    application_id,
    branch_id,
    member_profile_id,
    approved_principal,
    remaining_principal,
    monthly_interest_rate,
    status,
    approved_by
  )
  values (
    v_application.id,
    v_application.branch_id,
    v_application.member_profile_id,
    v_approved_principal,
    v_approved_principal,
    v_application.monthly_interest_rate,
    'approved',
    v_actor.id
  )
  returning * into v_loan;

  perform public.write_audit_log(
    v_actor.id,
    v_application.branch_id,
    'approve_loan_application',
    'loan_application',
    v_application.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'loan_id', v_loan.id,
        'approved_principal', v_loan.approved_principal,
        'requested_amount', v_application.requested_amount,
        'member_profile_id', v_application.member_profile_id,
        'note', p_note
      )
    )
  );

  return v_loan;
end;
$$;

create or replace function public.reject_loan_application(
  p_application_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns public.loan_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_application public.loan_applications;
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can reject loan applications';
  end if;

  select *
  into v_application
  from public.loan_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'loan application not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_application.branch_id then
    raise exception 'branch managers can only reject applications in their branch';
  end if;

  if v_application.status not in ('application_submitted', 'under_review') then
    raise exception 'loan application cannot be rejected from status %', v_application.status;
  end if;

  update public.loan_applications
  set status = 'rejected',
      reviewed_by = v_actor.id
  where id = p_application_id
  returning * into v_application;

  perform public.write_audit_log(
    v_actor.id,
    v_application.branch_id,
    'reject_loan_application',
    'loan_application',
    v_application.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'member_profile_id', v_application.member_profile_id,
        'requested_amount', v_application.requested_amount,
        'note', p_note
      )
    )
  );

  return v_application;
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
    raise exception 'only admins and branch managers can record loan repayments';
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
        when v_remaining_principal = 0 then 'closed'
        else 'active'
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

revoke all on function public.ensure_loan_ledger_account(uuid, public.account_type)
  from public, anon, authenticated;
revoke all on function public.create_loan_application(uuid, uuid, numeric, numeric, integer, boolean, text, text)
  from public, anon, authenticated;
revoke all on function public.start_loan_application_review(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.approve_loan_application(uuid, uuid, numeric, text)
  from public, anon, authenticated;
revoke all on function public.reject_loan_application(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.disburse_loan(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.record_loan_repayment(uuid, uuid, uuid, numeric, public.repayment_mode, text)
  from public, anon, authenticated;

grant execute on function public.create_loan_application(uuid, uuid, numeric, numeric, integer, boolean, text, text)
  to authenticated, service_role;
grant execute on function public.start_loan_application_review(uuid, uuid, text)
  to authenticated, service_role;
grant execute on function public.approve_loan_application(uuid, uuid, numeric, text)
  to authenticated, service_role;
grant execute on function public.reject_loan_application(uuid, uuid, text)
  to authenticated, service_role;
grant execute on function public.disburse_loan(uuid, uuid, uuid, text)
  to authenticated, service_role;
grant execute on function public.record_loan_repayment(uuid, uuid, uuid, numeric, public.repayment_mode, text)
  to authenticated, service_role;
