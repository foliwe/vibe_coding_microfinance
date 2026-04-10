revoke all on function public.get_member_account_balance(uuid) from public, anon;

grant execute on function public.get_member_account_balance(uuid)
  to authenticated, service_role;
