import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('RLS: zone, kourel, comptes non affectés et pointage atomique', async () => {
  const db = new PGlite();
  const ids = Array.from({length: 5}, (_, i) => `00000000-0000-0000-0000-00000000000${i + 1}`);
  try {
    await db.exec(`create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;`);
    for (const file of ['schema.sql', 'role_permissions.sql', 'scoped_access.sql', 'scoped_access.sql']) {
      await db.exec(await readFile(new URL(`../supabase/${file}`, import.meta.url), 'utf8'));
    }
    for (const id of ids) await db.query('insert into auth.users values ($1)', [id]);
    const profiles = [ ['admin','',''], ['administratif','A',''], ['surveillant_kourel','','K1'], ['administratif','',''], ['social','',''] ];
    for (let i=0; i<profiles.length; i++) await db.query('insert into profiles(id,role,zone,kourel) values($1,$2,$3,$4)',[ids[i],...profiles[i]]);
    await db.exec(`insert into members(id,matricule,nom,prenom,registration_date,created_by,zone,kourel) values
      ('m1','1','Test','Un','2026-09-30','fixture','A','K1'),
      ('m2','2','Test','Deux','2026-09-30','fixture','A','K2'),
      ('m3','3','Test','Trois','2026-09-30','fixture','B','K1'),
      ('m4','4','Test','Quatre','2026-09-30','fixture','','');
      insert into renewals(id,member_id,year,renewal_date,updated_by) values
      ('r1','m1',2026,'2026-09-30','fixture'),('r2','m3',2026,'2026-09-30','fixture');`);
    const login = async i => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[i]]);
      await db.exec('set role authenticated');
    };
    const visible = async table => (await db.query(`select id from ${table} order by id`)).rows.map(x=>x.id);
    const save = (id,scope,zone,kourel,records,type='Animation') => db.query('select save_scoped_activity($1::jsonb,$2::jsonb)',[JSON.stringify({id,scope,zone,kourel,type,date:'2026-09-30'}),JSON.stringify(records)]);
    await login(1);
    assert.deepEqual(await visible('members'),['m1','m2']);
    assert.deepEqual(await visible('renewals'),['r1']);
    await save('a1','general','A','Tous',{m1:'present',m2:'absent'});
    await assert.rejects(save('a1','general','A','Tous',{m3:'present'},'Invalid replacement'));
    assert.equal((await db.query("select type from activities where id='a1'")).rows[0].type,'Animation');
    assert.equal((await visible('attendance')).length,2);
    await assert.rejects(save('bad','general','B','Tous',{m3:'present'}));
    await assert.rejects(db.exec("update members set zone='B' where id='m1'"));
    await assert.rejects(db.exec("insert into attendance(id,activity_id,member_id,status,updated_by) values('bad','a1','m3','present','fixture')"));
    await db.exec("update profiles set zone='B' where id=auth.uid()");
    assert.deepEqual(await visible('members'),['m1','m2']);
    await login(2);
    assert.deepEqual(await visible('members'),['m1','m3']);
    assert.deepEqual(await visible('activities'),[]);
    assert.deepEqual(await visible('attendance'),[]);
    await save('k1','kourel','','K1',{m1:'late',m3:'present'});
    await assert.rejects(save('bad','kourel','','K2',{m2:'present'}));
    await assert.rejects(save('bad','general','A','Tous',{m1:'present'}));
    await assert.rejects(save('invalid','kourel','','K1',{m1:null}));
    await login(3);
    assert.deepEqual(await visible('members'),[]);
    assert.deepEqual(await visible('activities'),[]);
    await assert.rejects(save('bad','general','','Tous',{}));
    await login(4);
    assert.equal((await visible('members')).length,4);
    assert.deepEqual(await visible('activities'),[]);
    await login(0);
    assert.equal((await visible('members')).length,4);
    assert.deepEqual(await visible('activities'),['a1','k1']);
    assert.equal((await visible('attendance')).length,4);
  } finally { await db.close(); }
});
