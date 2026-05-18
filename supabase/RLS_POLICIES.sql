-- Skills Tracker Wales
-- Supabase Row Level Security policies.
-- Run this after schema.sql.

alter table public.schools enable row level security;
alter table public.users enable row level security;
alter table public.school_users enable row level security;
alter table public.subjects enable row level security;
alter table public.aoles enable row level security;
alter table public.frameworks enable row level security;
alter table public.strands enable row level security;
alter table public.elements enable row level security;
alter table public.progression_descriptors enable row level security;
alter table public.curriculum_entries enable row level security;
alter table public.branding_settings enable row level security;
alter table public.framework_colour_themes enable row level security;
alter table public.review_cycles enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_user_is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.school_users su
    where su.user_id = auth.uid()
      and su.role = 'platform_admin'
      and su.active = true
  );
$$;

create or replace function public.current_user_has_school_access(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_is_platform_admin()
    or exists (
      select 1
      from public.school_users su
      where su.user_id = auth.uid()
        and su.school_id = target_school_id
        and su.active = true
    );
$$;

create or replace function public.current_user_can_write_school(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_is_platform_admin()
    or exists (
      select 1
      from public.school_users su
      where su.user_id = auth.uid()
        and su.school_id = target_school_id
        and su.role in ('school_admin', 'teacher', 'subject_lead')
        and su.active = true
    );
$$;

create or replace function public.current_user_is_school_admin(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_is_platform_admin()
    or exists (
      select 1
      from public.school_users su
      where su.user_id = auth.uid()
        and su.school_id = target_school_id
        and su.role = 'school_admin'
        and su.active = true
    );
$$;

create policy "platform admins can create schools"
on public.schools for insert
to authenticated
with check (public.current_user_is_platform_admin());

create policy "school users can read their schools"
on public.schools for select
to authenticated
using (public.current_user_has_school_access(id));

create policy "school admins can update their school"
on public.schools for update
to authenticated
using (public.current_user_is_school_admin(id))
with check (public.current_user_is_school_admin(id));

create policy "platform admins can delete schools"
on public.schools for delete
to authenticated
using (public.current_user_is_platform_admin());

create policy "users can read themselves and shared school users"
on public.users for select
to authenticated
using (
  id = auth.uid()
  or public.current_user_is_platform_admin()
  or exists (
    select 1
    from public.school_users own_membership
    join public.school_users other_membership
      on other_membership.school_id = own_membership.school_id
    where own_membership.user_id = auth.uid()
      and own_membership.active = true
      and other_membership.user_id = public.users.id
      and other_membership.active = true
  )
);

create policy "users can update themselves"
on public.users for update
to authenticated
using (id = auth.uid() or public.current_user_is_platform_admin())
with check (id = auth.uid() or public.current_user_is_platform_admin());

create policy "users can insert themselves"
on public.users for insert
to authenticated
with check (id = auth.uid() or public.current_user_is_platform_admin());

create policy "school users can read memberships for their school"
on public.school_users for select
to authenticated
using (public.current_user_has_school_access(school_id));

create policy "school admins can manage school memberships"
on public.school_users for insert
to authenticated
with check (public.current_user_is_school_admin(school_id));

create policy "school admins can update school memberships"
on public.school_users for update
to authenticated
using (public.current_user_is_school_admin(school_id))
with check (public.current_user_is_school_admin(school_id));

create policy "school admins can delete school memberships"
on public.school_users for delete
to authenticated
using (public.current_user_is_school_admin(school_id));

create policy "aoles read by school members"
on public.aoles for select to authenticated
using (public.current_user_has_school_access(school_id));
create policy "aoles written by school editors"
on public.aoles for insert to authenticated
with check (public.current_user_can_write_school(school_id));
create policy "aoles updated by school editors"
on public.aoles for update to authenticated
using (public.current_user_can_write_school(school_id))
with check (public.current_user_can_write_school(school_id));
create policy "aoles deleted by school admins"
on public.aoles for delete to authenticated
using (public.current_user_is_school_admin(school_id));

create policy "subjects read by school members"
on public.subjects for select to authenticated
using (public.current_user_has_school_access(school_id));
create policy "subjects written by school editors"
on public.subjects for insert to authenticated
with check (public.current_user_can_write_school(school_id));
create policy "subjects updated by school editors"
on public.subjects for update to authenticated
using (public.current_user_can_write_school(school_id))
with check (public.current_user_can_write_school(school_id));
create policy "subjects deleted by school admins"
on public.subjects for delete to authenticated
using (public.current_user_is_school_admin(school_id));

create policy "frameworks read by school members"
on public.frameworks for select to authenticated
using (public.current_user_has_school_access(school_id));
create policy "frameworks written by school editors"
on public.frameworks for insert to authenticated
with check (public.current_user_can_write_school(school_id));
create policy "frameworks updated by school editors"
on public.frameworks for update to authenticated
using (public.current_user_can_write_school(school_id))
with check (public.current_user_can_write_school(school_id));
create policy "frameworks deleted by school admins"
on public.frameworks for delete to authenticated
using (public.current_user_is_school_admin(school_id));

create policy "strands read by school members"
on public.strands for select to authenticated
using (public.current_user_has_school_access(school_id));
create policy "strands written by school editors"
on public.strands for insert to authenticated
with check (public.current_user_can_write_school(school_id));
create policy "strands updated by school editors"
on public.strands for update to authenticated
using (public.current_user_can_write_school(school_id))
with check (public.current_user_can_write_school(school_id));
create policy "strands deleted by school admins"
on public.strands for delete to authenticated
using (public.current_user_is_school_admin(school_id));

create policy "elements read by school members"
on public.elements for select to authenticated
using (public.current_user_has_school_access(school_id));
create policy "elements written by school editors"
on public.elements for insert to authenticated
with check (public.current_user_can_write_school(school_id));
create policy "elements updated by school editors"
on public.elements for update to authenticated
using (public.current_user_can_write_school(school_id))
with check (public.current_user_can_write_school(school_id));
create policy "elements deleted by school admins"
on public.elements for delete to authenticated
using (public.current_user_is_school_admin(school_id));

create policy "progression descriptors read by school members"
on public.progression_descriptors for select to authenticated
using (public.current_user_has_school_access(school_id));
create policy "progression descriptors written by school editors"
on public.progression_descriptors for insert to authenticated
with check (public.current_user_can_write_school(school_id));
create policy "progression descriptors updated by school editors"
on public.progression_descriptors for update to authenticated
using (public.current_user_can_write_school(school_id))
with check (public.current_user_can_write_school(school_id));
create policy "progression descriptors deleted by school admins"
on public.progression_descriptors for delete to authenticated
using (public.current_user_is_school_admin(school_id));

create policy "curriculum entries read by school members"
on public.curriculum_entries for select to authenticated
using (public.current_user_has_school_access(school_id));
create policy "curriculum entries written by school editors"
on public.curriculum_entries for insert to authenticated
with check (public.current_user_can_write_school(school_id));
create policy "curriculum entries updated by school editors"
on public.curriculum_entries for update to authenticated
using (public.current_user_can_write_school(school_id))
with check (public.current_user_can_write_school(school_id));
create policy "curriculum entries deleted by school admins"
on public.curriculum_entries for delete to authenticated
using (public.current_user_is_school_admin(school_id));

create policy "branding read by school members"
on public.branding_settings for select to authenticated
using (public.current_user_has_school_access(school_id));
create policy "branding written by school admins"
on public.branding_settings for insert to authenticated
with check (public.current_user_is_school_admin(school_id));
create policy "branding updated by school admins"
on public.branding_settings for update to authenticated
using (public.current_user_is_school_admin(school_id))
with check (public.current_user_is_school_admin(school_id));
create policy "branding deleted by platform admins"
on public.branding_settings for delete to authenticated
using (public.current_user_is_platform_admin());

create policy "framework colour themes read by school members"
on public.framework_colour_themes for select to authenticated
using (public.current_user_has_school_access(school_id));
create policy "framework colour themes written by school admins"
on public.framework_colour_themes for insert to authenticated
with check (public.current_user_is_school_admin(school_id));
create policy "framework colour themes updated by school admins"
on public.framework_colour_themes for update to authenticated
using (public.current_user_is_school_admin(school_id))
with check (public.current_user_is_school_admin(school_id));
create policy "framework colour themes deleted by platform admins"
on public.framework_colour_themes for delete to authenticated
using (public.current_user_is_platform_admin());

create policy "review cycles read by school members"
on public.review_cycles for select to authenticated
using (public.current_user_has_school_access(school_id));
create policy "review cycles written by school editors"
on public.review_cycles for insert to authenticated
with check (public.current_user_can_write_school(school_id));
create policy "review cycles updated by school editors"
on public.review_cycles for update to authenticated
using (public.current_user_can_write_school(school_id))
with check (public.current_user_can_write_school(school_id));
create policy "review cycles deleted by school admins"
on public.review_cycles for delete to authenticated
using (public.current_user_is_school_admin(school_id));

create policy "audit logs read by school admins"
on public.audit_logs for select to authenticated
using (public.current_user_is_school_admin(school_id));
create policy "audit logs inserted by school editors"
on public.audit_logs for insert to authenticated
with check (public.current_user_can_write_school(school_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.current_user_is_platform_admin() to authenticated;
grant execute on function public.current_user_has_school_access(uuid) to authenticated;
grant execute on function public.current_user_can_write_school(uuid) to authenticated;
grant execute on function public.current_user_is_school_admin(uuid) to authenticated;
