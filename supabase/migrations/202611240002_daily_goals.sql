create table public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    constraint daily_goals_user_id_fkey
    references auth.users(id) on delete cascade,
  title text not null
    constraint daily_goals_title_check
    check (
      title ~ '[^[:space:]]'
      and char_length(btrim(title)) <= 180
    ),
  description text not null default ''
    constraint daily_goals_description_check
    check (char_length(description) <= 1000),
  goal_date date not null,
  category text not null
    constraint daily_goals_category_check
    check (category in ('academics', 'dsa', 'coding', 'placement', 'skills', 'personal', 'other')),
  priority text not null default 'medium'
    constraint daily_goals_priority_check
    check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending'
    constraint daily_goals_status_check
    check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_goals_completed_at_check
    check ((status = 'completed') = (completed_at is not null))
);

create index daily_goals_user_date_idx
  on public.daily_goals (user_id, goal_date);

create trigger daily_goals_updated_at
  before update on public.daily_goals
  for each row execute function public.set_academics_updated_at();

alter table public.daily_goals enable row level security;

create policy daily_goals_select on public.daily_goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy daily_goals_insert on public.daily_goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy daily_goals_update on public.daily_goals
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy daily_goals_delete on public.daily_goals
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all privileges on table public.daily_goals from anon, public;
grant select, insert, update, delete
  on table public.daily_goals to authenticated;
