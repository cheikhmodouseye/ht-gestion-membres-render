-- Apply AFTER schema.sql and role_permissions.sql. Existing rows stay unassigned.
begin;
alter table public.profiles add column if not exists zone text not null default '';
alter table public.profiles add column if not exists kourel text not null default '';
alter table public.members add column if not exists zone text not null default '';
alter table public.activities add column if not exists zone text not null default '';
create index if not exists members_zone_idx on public.members(zone);
create index if not exists members_kourel_idx on public.members(kourel);

create or replace function public.member_in_scope(member_zone text, member_kourel text)
returns boolean language sql stable security definer set search_path = public as $$
 select coalesce((select case
 when role in ('admin','social') then true
 when role = 'administratif' then btrim(zone) <> '' and zone = member_zone
 when role = 'surveillant_kourel' then btrim(kourel) <> '' and kourel = member_kourel
 else false end from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.activity_in_scope(activity_scope text, activity_zone text, activity_kourel text)
returns boolean language sql stable security definer set search_path = public as $$
 select coalesce((select case
 when role = 'admin' then true
 when role = 'administratif' then btrim(zone) <> '' and zone = activity_zone and activity_scope = 'general'
 when role = 'surveillant_kourel' then btrim(kourel) <> '' and kourel = activity_kourel and activity_scope = 'kourel'
 else false end from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.member_id_in_scope(target_member text)
returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from public.members m where m.id = target_member and public.member_in_scope(m.zone,m.kourel));
$$;

create or replace function public.attendance_in_scope(target_activity text, target_member text)
returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from public.activities a cross join public.members m
 where a.id = target_activity and m.id = target_member
 and public.activity_in_scope(a.scope,a.zone,a.kourel)
 and public.member_in_scope(m.zone,m.kourel)
 and (public.current_user_role() = 'admin'
   or (a.scope = 'kourel' and a.kourel = m.kourel)
   or (a.scope = 'general' and a.zone = m.zone)));
$$;

create or replace function public.can_manage_activity(target_activity_id text)
returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from public.activities a where a.id = target_activity_id
 and public.activity_in_scope(a.scope,a.zone,a.kourel));
$$;

revoke all on function public.member_in_scope(text,text), public.activity_in_scope(text,text,text), public.member_id_in_scope(text), public.attendance_in_scope(text,text) from public;
grant execute on function public.member_in_scope(text,text), public.activity_in_scope(text,text,text), public.member_id_in_scope(text), public.attendance_in_scope(text,text) to authenticated;

-- RESTRICTIVE policies are ANDed with the existing role policies, never ORed.
drop policy if exists members_scope on public.members;
create policy members_scope on public.members as restrictive for all to authenticated
using (public.member_in_scope(zone,kourel)) with check (public.member_in_scope(zone,kourel));
drop policy if exists renewals_scope on public.renewals;
create policy renewals_scope on public.renewals as restrictive for all to authenticated
using (public.member_id_in_scope(member_id)) with check (public.member_id_in_scope(member_id));
drop policy if exists activities_scope on public.activities;
create policy activities_scope on public.activities as restrictive for all to authenticated
using (public.activity_in_scope(scope,zone,kourel)) with check (public.activity_in_scope(scope,zone,kourel));
drop policy if exists attendance_scope on public.attendance;
create policy attendance_scope on public.attendance as restrictive for all to authenticated
using (public.attendance_in_scope(activity_id,member_id))
with check (public.attendance_in_scope(activity_id,member_id));

-- Atomic save: an invalid/out-of-scope member rolls back the activity and all
-- attendance edits. SECURITY INVOKER preserves the caller's RLS restrictions.
create or replace function public.save_scoped_activity(item jsonb, records jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
 activity_id_value text := item->>'id';
 member_key text;
 status_value text;
begin
 if auth.uid() is null or jsonb_typeof(records) is distinct from 'object' then
   raise exception 'Session ou présences invalides';
 end if;
 if coalesce(item->>'type','') = '' or coalesce(item->>'date','') = '' then
   raise exception 'Type et date obligatoires';
 end if;
 insert into public.activities(id,type,scope,zone,kourel,date,start_time,end_time,place,event_name,cultural_space,melodies,created_by)
 values(activity_id_value,item->>'type',item->>'scope',coalesce(item->>'zone',''),coalesce(item->>'kourel','Tous'),item->>'date',coalesce(item->>'start_time',''),coalesce(item->>'end_time',''),coalesce(item->>'place',''),coalesce(item->>'event_name',''),coalesce(item->>'cultural_space',''),coalesce(item->'melodies','[]'::jsonb),auth.uid()::text)
 on conflict(id) do update set type=excluded.type,scope=excluded.scope,zone=excluded.zone,kourel=excluded.kourel,date=excluded.date,start_time=excluded.start_time,end_time=excluded.end_time,place=excluded.place,event_name=excluded.event_name,cultural_space=excluded.cultural_space,melodies=excluded.melodies,updated_at=now();
 for member_key,status_value in select key,value from jsonb_each_text(records) loop
   if status_value not in ('present','late','absent','justified') or status_value is null
      or not public.attendance_in_scope(activity_id_value,member_key) then
     raise exception 'Membre hors périmètre ou statut invalide';
   end if;
 end loop;
 delete from public.attendance where activity_id = activity_id_value;
 insert into public.attendance(id,activity_id,member_id,status,updated_by)
 select gen_random_uuid()::text,activity_id_value,key,value,auth.uid()::text from jsonb_each_text(records);
end;
$$;
revoke all on function public.save_scoped_activity(jsonb,jsonb) from public;
grant execute on function public.save_scoped_activity(jsonb,jsonb) to authenticated;
commit;
