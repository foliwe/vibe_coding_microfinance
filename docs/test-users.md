# Test User Bootstrap

## Fastest path

Use the bootstrap script once your Supabase schema is applied and your service role key is available:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm run create:test-users
```

Default branch:

- branch code: `BAM`

Default credentials:

- branch manager: `manager@example.com` / `Manager123456!`
- agent: `agent@example.com` / `Agent123456!`
- member: `member@example.com` / `Member123456!`

Seeded accounts:

- savings account: `BAM-SAV-0001`
- deposit account: `BAM-DEP-0001`

## What the script does

- creates or reuses Supabase Auth users for a branch manager, agent, and member
- upserts matching rows into `public.profiles`
- upserts `staff_users` rows for the branch manager and agent
- upserts the member profile and active agent assignment
- creates one savings account and one deposit account for the member
- assigns the branch manager to the branch record

## Optional overrides

```bash
TEST_BRANCH_CODE="DOU" \
TEST_MANAGER_EMAIL="douala-manager@example.com" \
TEST_AGENT_EMAIL="douala-agent@example.com" \
TEST_MEMBER_EMAIL="douala-member@example.com" \
npm run create:test-users
```

You can also override any of the default names, phones, and passwords with matching `TEST_*` environment variables.

## Requirements

- the schema in [`supabase/migrations/0001_initial_schema.sql`](/Users/foliwefossung/Vibe_code/supabase/migrations/0001_initial_schema.sql) and later migrations must already be applied
- the service role key must be available in your shell environment
- the branch referenced by `TEST_BRANCH_CODE` must already exist in `public.branches`

## End-to-end path

After bootstrapping:

1. Sign in to the admin app as the branch manager.
2. Sign in to the mobile app as the agent and submit a deposit.
3. Approve the transaction from the admin transactions page.
4. Sign in to the mobile app as the member and refresh balances/history.
