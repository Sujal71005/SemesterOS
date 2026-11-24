create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    constraint study_sessions_user_id_fkey
    references auth.users(id) on delete cascade,
  subject_id uuid,
  title text not null
    constraint study_sessions_title_check
    check (title ~ '[^[:space:]]' and char_length(btrim(title)) between 1 and 180),
  description text not null default '',
  session_category text not null
    constraint study_sessions_category_check
    check (session_category in ('lecture', 'practical', 'self_study', 'revision', 'other')),
  schedule_type text not null
    constraint study_sessions_schedule_type_check
    check (schedule_type in ('recurring', 'one_time')),
  day_of_week smallint,
  session_date date,
  start_time time without time zone not null,
  end_time time without time zone not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_user_id_id_key unique (user_id, id),
  constraint study_sessions_user_subject_fkey
    foreign key (user_id, subject_id)
    references public.subjects (user_id, id)
    on delete set null (subject_id),
  constraint study_sessions_day_of_week_check
    check (day_of_week is null or day_of_week between 0 and 6),
  constraint study_sessions_schedule_check
    check (
      (schedule_type = 'recurring' and day_of_week is not null and session_date is null)
      or (schedule_type = 'one_time' and session_date is not null and day_of_week is null)
    ),
  constraint study_sessions_time_range_check check (end_time > start_time)
);

create table public.study_session_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    constraint study_session_logs_user_id_fkey
    references auth.users(id) on delete cascade,
  session_id uuid not null,
  occurrence_date date not null,
  status text not null
    constraint study_session_logs_status_check
    check (status in ('planned', 'completed', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint study_session_logs_user_id_id_key unique (user_id, id),
  constraint study_session_logs_user_session_fkey
    foreign key (user_id, session_id)
    references public.study_sessions (user_id, id) on delete cascade,
  constraint study_session_logs_occurrence_key
    unique (user_id, session_id, occurrence_date),
  constraint study_session_logs_completed_at_check
    check ((status = 'completed') = (completed_at is not null))
);

create index study_sessions_recurring_timetable_idx
  on public.study_sessions (user_id, day_of_week, start_time)
  where schedule_type = 'recurring';

create index study_sessions_one_time_timetable_idx
  on public.study_sessions (user_id, session_date, start_time)
  where schedule_type = 'one_time';

create index study_sessions_subject_idx
  on public.study_sessions (user_id, subject_id)
  where subject_id is not null;

create index study_session_logs_occurrence_idx
  on public.study_session_logs (user_id, occurrence_date, status);

create trigger study_sessions_updated_at
  before update on public.study_sessions
  for each row execute function public.set_academics_updated_at();

alter table public.study_sessions enable row level security;
alter table public.study_session_logs enable row level security;

create policy study_sessions_select on public.study_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy study_sessions_insert on public.study_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy study_sessions_update on public.study_sessions
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy study_sessions_delete on public.study_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy study_session_logs_select on public.study_session_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy study_session_logs_insert on public.study_session_logs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy study_session_logs_update on public.study_session_logs
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy study_session_logs_delete on public.study_session_logs
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all privileges on table public.study_sessions, public.study_session_logs from anon, public;
grant select, insert, update, delete
  on table public.study_sessions, public.study_session_logs to authenticated;
