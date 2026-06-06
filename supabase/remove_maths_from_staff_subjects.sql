-- Remove Maths from staff subject assignments.
-- This does not delete users. It only removes exact "Maths" entries from
-- public.staff_profiles.assigned_subjects.
--
-- To preview affected users before running the update:
select
  id,
  email,
  display_name,
  role,
  assigned_subjects
from public.staff_profiles
where exists (
  select 1
  from unnest(assigned_subjects) as subject_name
  where lower(trim(subject_name)) = 'maths'
)
order by display_name, email;

begin;

update public.staff_profiles
set assigned_subjects = coalesce(
  (
    select array_agg(subject_name order by ordinality)
    from unnest(assigned_subjects) with ordinality as subjects(subject_name, ordinality)
    where lower(trim(subject_name)) <> 'maths'
  ),
  '{}'::text[]
)
where exists (
  select 1
  from unnest(assigned_subjects) as subject_name
  where lower(trim(subject_name)) = 'maths'
);

-- Confirm no exact Maths assignments remain.
select
  id,
  email,
  display_name,
  role,
  assigned_subjects
from public.staff_profiles
where exists (
  select 1
  from unnest(assigned_subjects) as subject_name
  where lower(trim(subject_name)) = 'maths'
)
order by display_name, email;

commit;
