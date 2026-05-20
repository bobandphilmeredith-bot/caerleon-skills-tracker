# Deployment Notes

## Front End

The app is ready to deploy as a Next.js project on Vercel.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`

Use `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true` only for local demo mode. Production must not show “Continue as this user”.

## Supabase

Supabase setup files are in `/supabase`:

- `schema.sql`
- `seed.sql`
- `seed_example.sql`
- `README_DATABASE_SETUP.md`

Run `schema.sql` only on a fresh Supabase project unless a migration has been written. `create table if not exists` will not update older versions of tables.

Run them in this order on a fresh project:

1. `schema.sql`
2. `seed.sql` or the edited `seed_example.sql`

Do not run `RLS_POLICIES.sql` separately. RLS is now included in `schema.sql`, and the old separate file has been removed.

Create the first admin user by:

1. Creating the staff account in Supabase Authentication.
2. Copying the new Auth user UUID.
3. Inserting a matching `staff_profiles` row with the correct `school_id`, `email`, `display_name`, `role`, `assigned_subjects` and `active=true`.

Magic-link login sends staff to the `/login` page on the current app origin. In Supabase Auth settings, set:

- Site URL: your Vercel app URL
- Redirect URLs: your Vercel app URL plus `/login`
- Optional local redirect URL for testing, such as `http://localhost:3003/login`

Do not use real pupil data. The database is for curriculum mapping only.

## Access Model

- `platform_admin`: manages schools.
- `school_admin`: manages their own school setup, users, frameworks, branding and mappings.
- `teacher`: adds and edits curriculum mapping entries.
- `subject_lead`: adds and edits entries for assigned subjects.
- `viewer`: read-only access.

## Next Connection Step

The next build step is to add a Supabase client and replace browser-held staff profiles and mapping data with Supabase reads and writes.
