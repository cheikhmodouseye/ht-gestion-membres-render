create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null check (role in ('admin', 'administratif', 'social', 'surveillant_kourel')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select, insert, update, delete on public.profiles to authenticated;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.can_manage_activity(target_activity_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_user_role()
    when 'admin' then true
    when 'administratif' then exists (
      select 1 from public.activities where id = target_activity_id and scope = 'general'
    )
    when 'surveillant_kourel' then exists (
      select 1 from public.activities where id = target_activity_id and scope = 'kourel'
    )
    else false
  end;
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.can_manage_activity(text) from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.can_manage_activity(text) to authenticated;

drop policy if exists "authenticated_access" on public.members;
drop policy if exists "authenticated_access" on public.renewals;
drop policy if exists "authenticated_access" on public.activities;
drop policy if exists "authenticated_access" on public.attendance;
drop policy if exists "authenticated_access" on public.social_contributions;
drop policy if exists "authenticated_access" on public.social_events;
drop policy if exists "authenticated_access" on public.cash_movements;

drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin');
create policy "profiles_admin_write" on public.profiles for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "members_read" on public.members;
drop policy if exists "members_write" on public.members;
create policy "members_read" on public.members for select to authenticated
using (public.current_user_role() is not null);
create policy "members_write" on public.members for all to authenticated
using (public.current_user_role() in ('admin', 'administratif'))
with check (public.current_user_role() in ('admin', 'administratif'));

drop policy if exists "renewals_read" on public.renewals;
drop policy if exists "renewals_write" on public.renewals;
create policy "renewals_read" on public.renewals for select to authenticated
using (public.current_user_role() in ('admin', 'administratif'));
create policy "renewals_write" on public.renewals for all to authenticated
using (public.current_user_role() in ('admin', 'administratif'))
with check (public.current_user_role() in ('admin', 'administratif'));

drop policy if exists "activities_read" on public.activities;
drop policy if exists "activities_insert" on public.activities;
drop policy if exists "activities_update" on public.activities;
drop policy if exists "activities_delete" on public.activities;
create policy "activities_read" on public.activities for select to authenticated
using (public.current_user_role() in ('admin', 'administratif', 'surveillant_kourel'));
create policy "activities_insert" on public.activities for insert to authenticated
with check (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'administratif' and scope = 'general')
  or (public.current_user_role() = 'surveillant_kourel' and scope = 'kourel')
);
create policy "activities_update" on public.activities for update to authenticated
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'administratif' and scope = 'general')
  or (public.current_user_role() = 'surveillant_kourel' and scope = 'kourel')
)
with check (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'administratif' and scope = 'general')
  or (public.current_user_role() = 'surveillant_kourel' and scope = 'kourel')
);
create policy "activities_delete" on public.activities for delete to authenticated
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'administratif' and scope = 'general')
  or (public.current_user_role() = 'surveillant_kourel' and scope = 'kourel')
);

drop policy if exists "attendance_read" on public.attendance;
drop policy if exists "attendance_write" on public.attendance;
create policy "attendance_read" on public.attendance for select to authenticated
using (public.current_user_role() in ('admin', 'administratif', 'surveillant_kourel'));
create policy "attendance_write" on public.attendance for all to authenticated
using (public.can_manage_activity(activity_id))
with check (public.can_manage_activity(activity_id));

drop policy if exists "contributions_access" on public.social_contributions;
create policy "contributions_access" on public.social_contributions for all to authenticated
using (public.current_user_role() in ('admin', 'social'))
with check (public.current_user_role() in ('admin', 'social'));

drop policy if exists "social_events_access" on public.social_events;
create policy "social_events_access" on public.social_events for all to authenticated
using (public.current_user_role() in ('admin', 'social'))
with check (public.current_user_role() in ('admin', 'social'));

drop policy if exists "cash_movements_access" on public.cash_movements;
create policy "cash_movements_access" on public.cash_movements for all to authenticated
using (public.current_user_role() in ('admin', 'social'))
with check (public.current_user_role() in ('admin', 'social'));

-- Après avoir créé les quatre comptes dans Authentication > Users, attribuer les rôles :
-- insert into public.profiles (id, full_name, role)
-- select id, 'Administrateur', 'admin' from auth.users where email = 'admin@ht-gestion.app';
