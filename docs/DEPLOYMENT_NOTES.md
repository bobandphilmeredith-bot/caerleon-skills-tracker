# Deployment Notes

## Front End

The app is ready to deploy as a Next.js project on Vercel.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These are listed in `.env.example`.

## Supabase

Supabase setup files are in `/supabase`:

- `schema.sql`
- `RLS_POLICIES.sql`
- `seed.sql`
- `README_DATABASE_SETUP.md`

Run them in this order:

1. `schema.sql`
2. `RLS_POLICIES.sql`
3. `seed.sql`

## Access Model

- `platform_admin`: manages schools.
- `school_admin`: manages their own school setup, users, frameworks, branding and mappings.
- `teacher`: adds and edits curriculum mapping entries.
- `subject_lead`: adds and edits entries for assigned subjects.
- `viewer`: read-only access.

## Next Connection Step

The next build step is to add a Supabase client and replace browser-held staff profiles and mapping data with Supabase reads and writes.
