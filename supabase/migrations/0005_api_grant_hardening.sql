revoke select on all tables in schema public from anon;
revoke insert, update, delete on all tables in schema public from anon, authenticated;

alter default privileges in schema public revoke select on tables from anon;
alter default privileges in schema public revoke insert, update, delete on tables from anon, authenticated;

revoke all on function public.get_my_profile() from public, anon, authenticated;
revoke all on function public.get_ledger_account_balance(uuid) from public, anon, authenticated;
revoke all on function public.create_transaction_request(
  uuid,
  uuid,
  public.transaction_type,
  numeric,
  text,
  text,
  boolean,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.approve_transaction_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.reject_transaction_request(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.get_my_profile()
  to authenticated, service_role;

grant execute on function public.get_ledger_account_balance(uuid)
  to authenticated, service_role;

grant execute on function public.create_transaction_request(
  uuid,
  uuid,
  public.transaction_type,
  numeric,
  text,
  text,
  boolean,
  text,
  text
) to authenticated, service_role;

grant execute on function public.approve_transaction_request(uuid, uuid, text)
  to authenticated, service_role;

grant execute on function public.reject_transaction_request(uuid, uuid, text)
  to authenticated, service_role;
