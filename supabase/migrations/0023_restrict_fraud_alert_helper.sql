revoke all on function public.upsert_fraud_alert(uuid, uuid, uuid, uuid, uuid, text, integer, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.upsert_fraud_alert(uuid, uuid, uuid, uuid, uuid, text, integer, text, text, jsonb, text) to service_role;
