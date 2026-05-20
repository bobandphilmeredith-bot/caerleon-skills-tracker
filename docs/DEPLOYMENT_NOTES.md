# Deployment Notes

## Front End

The app is ready to deploy as a Next.js project on Vercel.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`
- `SUPABASE_SERVICE_ROLE_KEY`

Use `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true` only for local demo mode. Production must not show “Continue as this user”.

`SUPABASE_SERVICE_ROLE_KEY` must be added in Vercel as a server-side environment variable. Do not prefix it with `NEXT_PUBLIC_`, do not paste it into client components, and do not commit it to git.

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

## Staff Login

Production uses Supabase email/password login. Staff enter their school email address and password on `/login`.

After sign-in, the app reads the matching `public.staff_profiles` row. That row controls:

- role
- school
- assigned subjects
- active status

Users never choose their own role from the login page.

Password reset uses Supabase password reset email and redirects to `/auth/callback` on the current app origin. In Supabase Auth settings, set:

- Site URL: your Vercel app URL
- Redirect URLs: your Vercel app URL plus `/auth/callback`
- Optional local redirect URL for testing, such as `http://localhost:3003/auth/callback`

Do not use real pupil data. The database is for curriculum mapping only.

## Access Model

- `platform_admin`: manages schools.
- `school_admin`: manages their own school setup, users, frameworks, branding and mappings.
- `teacher`: adds and edits curriculum mapping entries.
- `subject_lead`: adds and edits entries for assigned subjects.
- `viewer`: read-only access.

`platform_admin` is the highest role. It can manage all schools and all users. `school_admin` can manage users only for their own school.

Important: `meredithp3@newportschools.wales` must remain active with the `platform_admin` role. Do not downgrade, deactivate, delete or overwrite this account.

## Creating Staff Users

Use `User Management` as a platform admin or school admin.

To create one user, enter:

- display name
- email
- temporary password
- role
- assigned subjects
- active status

The app uses a secure server-side route with `SUPABASE_SERVICE_ROLE_KEY` to create the Supabase Auth account and matching rows in:

- `public.users`
- `public.staff_profiles`
- `public.school_users`

School admins cannot create platform admins.

## Bulk CSV Upload

CSV upload columns:

```csv
display_name,email,role,assigned_subjects,active,password
Jane Smith,smithj@newportschools.wales,teacher,"English;Literacy",true,TempPass2026!
Bob Jones,jonesb@newportschools.wales,viewer,"",true,TempPass2026!
Sarah Evans,evanss@newportschools.wales,subject_lead,"History;Geography",true,TempPass2026!
```

Assigned subjects are separated with semicolons. Invalid roles are rejected. Non-platform admins cannot create platform admin users.

## Next Connection Step

The next build step is to add a Supabase client and replace browser-held staff profiles and mapping data with Supabase reads and writes.
