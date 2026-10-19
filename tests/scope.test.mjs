import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_CULTURAL_SPACES, ALL_ZONES, canSeeMember, canSeeActivity, attendanceForRoster, membersForDaaraActivity } from '../src/lib/scope.ts';

test('le profil administratif couvre les zones et le surveillant reste limité au kourel', () => {
  const zone = {role:'administratif',zone:'A',kourel:''};
  const kourel = {role:'surveillant_kourel',zone:'',kourel:'K1'};
  assert.equal(canSeeMember(zone,{zone:'A',kourel:'K2'}),true);
  assert.equal(canSeeMember(zone,{zone:'B',kourel:'K1'}),true);
  assert.equal(canSeeMember(kourel,{zone:'B',kourel:'K1'}),true);
  assert.equal(canSeeMember(kourel,{zone:'A',kourel:'K2'}),false);
  assert.equal(canSeeMember({...zone,zone:''},{zone:''}),true);
  assert.equal(canSeeMember({...kourel,kourel:' '},{kourel:' '}),false);
  assert.equal(canSeeActivity(zone,{scope:'general',zone:'A'}),true);
  assert.equal(canSeeActivity(zone,{scope:'general',zone:'B'}),true);
  assert.equal(canSeeActivity(zone,{scope:'kourel',zone:'A',kourel:'K1'}),false);
  assert.equal(canSeeActivity(kourel,{scope:'kourel',kourel:'K2'}),false);
});

test('changer de sélection exclut les anciennes présences du pointage', () => {
  assert.deepEqual(attendanceForRoster([{id:'new'},{id:'common'}],{old:'present',common:'absent'}),{new:'present',common:'absent'});
});

test('une activité Daara peut concerner une sélection ou tous les membres', () => {
  const members = [
    {id:'1',zone:'A',culturalSpace:'ECH1'},
    {id:'2',zone:'A',culturalSpace:'ECF1'},
    {id:'3',zone:'B',culturalSpace:'ECH1'},
  ];
  assert.deepEqual(membersForDaaraActivity(members, 'A', 'ECH1').map(x => x.id), ['1']);
  assert.deepEqual(membersForDaaraActivity(members, ALL_ZONES, 'ECH1').map(x => x.id), ['1','3']);
  assert.deepEqual(membersForDaaraActivity(members, 'A', ALL_CULTURAL_SPACES).map(x => x.id), ['1','2']);
  assert.deepEqual(membersForDaaraActivity(members, ALL_ZONES, ALL_CULTURAL_SPACES).map(x => x.id), ['1','2','3']);
});
