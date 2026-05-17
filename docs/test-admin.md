# Test Admin Bootstrap

## Fastest path

Use the bootstrap script if you have your Supabase service role key:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm run create:test-admin
```

## Split path

If you want a dedicated admin bootstrap command:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
ADMIN_EMAIL="owner@example.com" \
ADMIN_PASSWORD="StrongPassword123!" \
ADMIN_NAME="Owner Admin" \
ADMIN_PHONE="+237600000999" \
npm run create:admin-auth
```

That command now creates or updates both the Supabase Auth user and the matching `public.profiles` admin row using the service role key. You do not need to run [`supabase/scripts/upsert-admin-profile.sql`](/Users/foliwefossung/Vibe_code/supabase/scripts/upsert-admin-profile.sql) for this flow.

Default credentials:

- email: `admin@example.com`
- password: `Admin123456!`

You can override them:

```bash
TEST_ADMIN_EMAIL="owner@example.com" \
TEST_ADMIN_PASSWORD="StrongPassword123!" \
TEST_ADMIN_NAME="Owner Admin" \
TEST_ADMIN_PHONE="+237600000111" \
npm run create:test-admin
```

## What the script does

- creates a Supabase Auth user if it does not exist
- marks the email as confirmed
- upserts a matching row into `public.profiles`
- assigns role `admin`

## Requirements

- the schema in [`supabase/migrations/0001_initial_schema.sql`](/Users/foliwefossung/Vibe_code/supabase/migrations/0001_initial_schema.sql) must already be applied
- the service role key must be available in your shell environment

## Next step

Once the admin exists, bootstrap a full branch test flow:

```bash
npm run create:test-users
```

That provisions a branch manager, an agent, a member, an active assignment, and two member accounts so the admin and mobile apps can exercise live transaction approval end to end.
