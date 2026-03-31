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
