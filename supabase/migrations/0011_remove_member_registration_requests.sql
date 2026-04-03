drop policy if exists "member registration requests visible by role scope"
  on public.member_registration_requests;

drop table if exists public.member_registration_requests;

drop function if exists public.create_member_registration_request(uuid, text, text, text, text);
