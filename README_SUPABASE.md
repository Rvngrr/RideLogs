Supabase setup for MotoLog

This document explains how to provision the Supabase environment and apply the SQL schema and seeds included in the repository.

Files added:
- `.env.example` — template for required env vars
- `migrations/schema.sql` — SQL schema for the app
- `migrations/seed.sql` — seed data to populate the tables

Quick steps (recommended)

1. Create a Supabase project:
   - Go to https://app.supabase.com and create a new project.
   - Open the project and go to "Settings → API" to find the Project URL and the Service Role Key.

2. Apply schema and seed (two options):

  Option A — use Supabase SQL editor (web UI):
  - Open Supabase project → SQL Editor → New query
  - Paste the contents of `migrations/schema.sql` and run it.
  - Paste the contents of `migrations/seed.sql` and run it (this will insert sample data).

  Option B — use `psql` (requires a Postgres connection string):
  - In Supabase project → Settings → Database → Connection string, copy a connection string for psql.
  - Run locally:
    ```bash
    psql "<CONNECTION_STRING>" -f migrations/schema.sql
    psql "<CONNECTION_STRING>" -f migrations/seed.sql
    ```

3. Configure Vercel environment variables:
   - In your Vercel project settings, add:
     - `SUPABASE_URL` = <your supabase project url>
     - `SUPABASE_SERVICE_ROLE_KEY` = <your service role key>
   - For preview environments, set the same variables under Preview.
   - Never expose the service role key in client-side variables.

4. Redeploy your Vercel project (push to Git or trigger redeploy). The serverless function will detect the env vars and route reads/writes to Supabase.

5. Verify API from your deployed site:

  ```bash
  curl https://<your-deployment>/api/db
  ```

Notes
- If you prefer client-side Supabase access, create an anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), enable Row-Level Security (RLS), and add appropriate policies.
- The `POST /api/reset` endpoint will wipe and re-seed data when Supabase is enabled — use with caution.

If you want, I can also add a script using the Supabase CLI (`supabase`) to automate migrations.

Direct Postgres connection (DATABASE_URL)
----------------------------------------
You can also connect directly to the Supabase Postgres using a connection string. Add the following to your local `.env.local` (do NOT commit):

```text
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.avehtcujvmjnafavozpp.supabase.co:5432/postgres
```

Replace `[YOUR-PASSWORD]` with the database password from Supabase project settings. Example `psql` usage:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.avehtcujvmjnafavozpp.supabase.co:5432/postgres" -f migrations/schema.sql
psql "postgresql://postgres:[YOUR-PASSWORD]@db.avehtcujvmjnafavozpp.supabase.co:5432/postgres" -f migrations/seed.sql
```

Optional: Install Agent Skills for Supabase
-----------------------------------------
Agent Skills provide helpful automation and scripts for working with Supabase.
Run locally to install:

```bash
npx skills add supabase/agent-skills
```

If you want, I can run the install command here for you (requires network access and will modify your environment). Ask me to proceed if you'd like me to run it.
