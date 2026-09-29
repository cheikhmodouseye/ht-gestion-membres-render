create table if not exists public.members (
  id text primary key, matricule text not null unique, nom text not null, prenom text not null,
  sexe text not null default '', birth_date text not null default '', address text not null default '',
  phone text not null default '', email text not null default '', profession text not null default '',
  daara_sector text not null default '', magal_sector text not null default '', cultural_space text not null default '',
  kourel text not null default '', registration_date text not null, created_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.renewals (
  id text primary key, member_id text not null references public.members(id) on delete cascade,
  year integer not null, renewal_date text not null, updated_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(member_id, year)
);

create table if not exists public.activities (
  id text primary key, type text not null, scope text not null, kourel text not null default 'Tous',
  date text not null, start_time text not null default '', end_time text not null default '', place text not null default '',
  event_name text not null default '', cultural_space text not null default '', melodies jsonb not null default '[]'::jsonb,
  created_by text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id text primary key, activity_id text not null references public.activities(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade, status text not null,
  updated_by text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(activity_id, member_id)
);

create table if not exists public.social_contributions (
  id text primary key, member_id text not null references public.members(id) on delete cascade,
  month text not null, amount integer not null default 1000, paid_date text not null, created_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(member_id, month)
);

create table if not exists public.social_events (
  id text primary key, member_id text not null references public.members(id) on delete cascade,
  type text not null, date text not null, expense_amount integer not null default 0,
  kourel_performance boolean not null default false, note text not null default '', created_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.cash_movements (
  id text primary key, type text not null, date text not null, label text not null, amount integer not null,
  social_event_id text references public.social_events(id) on delete set null, created_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists idx_activities_date_type on public.activities(date, type);
create index if not exists idx_attendance_member on public.attendance(member_id);
create index if not exists idx_social_events_date on public.social_events(date);
create index if not exists idx_cash_movements_date_type on public.cash_movements(date, type);

alter table public.members enable row level security;
alter table public.renewals enable row level security;
alter table public.activities enable row level security;
alter table public.attendance enable row level security;
alter table public.social_contributions enable row level security;
alter table public.social_events enable row level security;
alter table public.cash_movements enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['members','renewals','activities','attendance','social_contributions','social_events','cash_movements']
  loop
    execute format('drop policy if exists "authenticated_access" on public.%I', table_name);
    execute format('create policy "authenticated_access" on public.%I for all to authenticated using (true) with check (true)', table_name);
  end loop;
end $$;
