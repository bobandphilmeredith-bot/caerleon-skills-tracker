# Skills Tracker Wales Database Setup

This folder prepares the app for a future Supabase database.

It does not connect the app yet. The current app can keep using local data until the Supabase connection is added later.

## What Is Included

- `schema.sql` creates the database structure.
- `RLS_POLICIES.sql` adds security rules.
- `seed.sql` adds clean starter data for Caerleon Comprehensive School and Newport Sample School.
- `seed-data/` contains older CSV seed files, but `seed.sql` is now the recommended setup route.

The database is designed for curriculum visibility only. It does not include pupil data, assessment data, behaviour data, grades, judgement scores, compliance scores or staff rankings.

## Recommended Setup Order

1. Create a Supabase project.
2. Run `schema.sql`.
3. Run `RLS_POLICIES.sql`.
4. Run `seed.sql`.
5. Add `.env.local` later when the app is ready to connect.

This order keeps the setup close to production security rules while still using Supabase SQL Editor for the starter data.

## 1. Run schema.sql

1. Open Supabase.
2. Open your project.
3. Go to `SQL Editor`.
4. Create a new query.
5. Paste the contents of `supabase/schema.sql`.
6. Click `Run`.

After this, the database should contain tables such as:

- `schools`
- `subjects`
- `frameworks`
- `strands`
- `elements`
- `progression_descriptors`
- `curriculum_entries`
- `branding_settings`
- `framework_colour_themes`

## 2. Run RLS_POLICIES.sql

1. Go back to `SQL Editor`.
2. Create a new query.
3. Paste the contents of `supabase/RLS_POLICIES.sql`.
4. Click `Run`.

This switches on Row Level Security.

The intended access model is:

- `platform_admin`: can access everything.
- `school_admin`: can manage data for their own school.
- `teacher`: can add and edit curriculum mapping data for their school.
- `subject_lead`: can add and edit curriculum mapping data for their assigned school.
- `viewer`: can read school data but cannot change it.

## 3. Run seed.sql

1. Go to `SQL Editor`.
2. Create a new query.
3. Paste the contents of `supabase/seed.sql`.
4. Click `Run`.

This adds starter setup data only:

- schools
- AoLE options
- subjects
- frameworks
- strands
- elements
- progression descriptors
- branding settings
- framework colour themes

It does not add curriculum entries, sample mappings, sample activity data, audit logs or review history.

The seed script uses `ON CONFLICT DO NOTHING`, so it is safe to run more than once.

## CSV Files

The folder still includes CSV seed files, but use `seed.sql` instead of CSV import for the first setup.

SQL seed data avoids common CSV import problems with commas, quotes, UUIDs and PostgreSQL array columns.

## 4. Create Users Later

The seed data does not create real users.

When Supabase Auth is connected later, each staff user will need:

1. A Supabase Auth account.
2. A matching row in `public.users`.
3. A row in `school_users` linking them to a school and role.

Example roles:

- `school_admin`
- `teacher`
- `subject_lead`
- `viewer`

## 5. Create .env.local Later

When the app is ready to connect to Supabase, create a file called `.env.local` in the project root.

It will eventually need values like:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not put the service role key in the browser app.

## 6. Connect Supabase Later

The app pages have not been changed yet.

When it is time to connect Supabase, the next build step should:

1. Add the Supabase client library.
2. Create a small Supabase client helper.
3. Replace local mapping reads with database reads.
4. Replace local save/edit/delete with database insert/update/delete.
5. Keep all queries filtered by `school_id`.

## 7. Test Data Saving Later

Once the app is connected:

1. Sign in as a user linked to Caerleon Comprehensive School.
2. Open `Add Mapping Entry`.
3. Save a test curriculum mapping entry.
4. Check it appears in `curriculum_entries`.
5. Open `Curriculum Explorer`.
6. Confirm the entry appears there.
7. Edit the entry.
8. Confirm the database row updates.
9. Delete the entry if it was only a test.

Also test with a Newport Sample School user to confirm they cannot see Caerleon data.

## Notes For Future Development

Keep the system subject-first.

AoLE should remain optional metadata attached to subjects.

Progression references are curriculum references only. They are not pupil assessment.

Every school-owned table includes `school_id` so the app can support multiple schools safely.
