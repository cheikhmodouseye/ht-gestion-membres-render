create extension if not exists pgcrypto;

create table if not exists app_users (
  id text primary key default gen_random_uuid()::text,
  identifier text not null unique,
  password_hash text not null,
  full_name text not null default '',
  role text not null check (role in ('admin', 'administratif', 'social', 'surveillant_kourel')),
  zone text not null default '',
  kourel text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_sessions_expires on sessions(expires_at);

create table if not exists members (
  id text primary key, zone text not null default '', matricule text not null unique,
  nom text not null, prenom text not null, sexe text not null default '', birth_date text not null default '',
  address text not null default '', phone text not null default '', phone2 text not null default '', email text not null default '',
  profession text not null default '', daara_sector text not null default '', magal_sector text not null default '',
  cultural_space text not null default '', kourel text not null default '', registration_date text not null,
  created_by text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table members add column if not exists phone2 text not null default '';

create table if not exists renewals (
  id text primary key, member_id text not null references members(id) on delete cascade,
  year integer not null, renewal_date text not null, updated_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(member_id, year)
);

create table if not exists activities (
  id text primary key, zone text not null default '', type text not null, scope text not null,
  kourel text not null default 'Tous', date text not null, start_time text not null default '',
  end_time text not null default '', place text not null default '', event_name text not null default '',
  cultural_space text not null default '', melodies jsonb not null default '[]'::jsonb,
  created_by text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists attendance (
  id text primary key, activity_id text not null references activities(id) on delete cascade,
  member_id text not null references members(id) on delete cascade, status text not null,
  updated_by text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(activity_id, member_id)
);

create table if not exists social_contributions (
  id text primary key, member_id text not null references members(id) on delete cascade,
  month text not null, amount integer not null default 1000, paid_date text not null, created_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(member_id, month)
);

create table if not exists social_events (
  id text primary key, member_id text not null references members(id) on delete cascade,
  type text not null, date text not null, expense_amount integer not null default 0,
  kourel_performance boolean not null default false, note text not null default '', created_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists cash_movements (
  id text primary key, type text not null, date text not null, label text not null, amount integer not null,
  social_event_id text references social_events(id) on delete set null, created_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists idx_members_zone on members(zone);
create index if not exists idx_members_kourel on members(kourel);
create index if not exists idx_activities_scope_date on activities(scope, date);
create index if not exists idx_attendance_activity_member on attendance(activity_id, member_id);
create index if not exists idx_contributions_month on social_contributions(month);
