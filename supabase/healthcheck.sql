create table if not exists public.healthcheck (
  id int primary key,
  name text not null,
  last_checked timestamptz default now()
);

insert into public.healthcheck (id, name)
values (1, 'skills_tracker_heartbeat')
on conflict (id) do nothing;
