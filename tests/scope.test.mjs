import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSeeMember, canSeeActivity, attendanceForRoster } from '../src/lib/scope.ts';

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
