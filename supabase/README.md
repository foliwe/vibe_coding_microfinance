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
- transaction workflow RPCs now live in `migrations/0003_transaction_workflows.sql`
- `create_transaction_request` validates agent scope, assignment, idempotency, and audit logging
- `approve_transaction_request` posts journals + entries, updates cash drawers, and writes approval/audit rows
- `reject_transaction_request` preserves history without posting ledger entries
- `create_admin_transaction` allows admins and branch managers to create branch-office deposits and withdrawals that auto-approve immediately against a selected agent cash drawer
