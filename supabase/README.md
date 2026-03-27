# Supabase Notes

This folder contains the schema-first backend for the credit union app.

## Files

- `migrations/0001_initial_schema.sql`: enum types, tables, views, helper functions, and starter RLS
- `seed.sql`: starter branch seed records
- `functions/sync-ingest/index.ts`: Edge Function stub for offline sync ingestion

## Implementation notes

- keep all sensitive financial writes behind RPCs or Edge Functions
- use the ledger tables as the balance source of truth
- add tighter RLS policies as auth claims and helper functions are finalized
- extend the approval RPC to create ledger journals and entries during posting
