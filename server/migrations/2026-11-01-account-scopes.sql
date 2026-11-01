alter table app_users add column if not exists access_scope text not null default 'all';
alter table app_users add column if not exists cultural_space text not null default '';

update app_users
set access_scope = 'zone'
where role = 'administratif' and zone <> '' and access_scope = 'all';

update app_users
set access_scope = 'kourel'
where role = 'surveillant_kourel' and kourel <> '' and access_scope = 'all';

create index if not exists idx_members_cultural_space on members(cultural_space);
