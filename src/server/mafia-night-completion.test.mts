import assert from 'node:assert/strict';
import test from 'node:test';
import { isMafiaNightStageComplete } from '../lib/mafia-night-completion.mts';
import { validateMafiaHostAction } from './game-security.mts';

test('host cannot advance until every faction member confirms', () => {
  const base = { phase: 'night', round: 2, nightStage: 'mafia',
    roles: { maf: 'mafia', don: 'don', doc: 'doctor' }, alive: ['maf', 'don', 'doc'],
    mafiaVotes: { maf: 'doc' }, mafiaDraftVotes: { don: 'doc' } };
  const action = { type: 'advance-night-stage', stage: 'doctor' };
  assert.equal(validateMafiaHostAction(base, action, base.alive), false);
  assert.equal(validateMafiaHostAction({ ...base, mafiaVotes: { maf: 'doc', don: 'doc' } }, action, base.alive), true);
  assert.equal(validateMafiaHostAction(base, { type: 'night-result', killedId: 'doc', killedIds: ['doc'], saved: false, savedIds: [], lastDoctorSave: null, lastLoverVisit: null }, base.alive), false);
});

test('active roles require action and blocked roles or maniac skip complete stage', () => {
  const fields = { lover: 'loverVisit', maniac: 'maniacActed', doctor: 'doctorSave', detective: 'detectiveCheck', don: 'donCheck' };
  for (const [role, field] of Object.entries(fields)) {
    const base = { round: 2, nightStage: role, roles: { actor: role }, alive: ['actor'] };
    assert.equal(isMafiaNightStageComplete(base), false, role);
    assert.equal(isMafiaNightStageComplete({ ...base, [field]: role === 'maniac' ? true : 'target' }), true, role);
    if (role !== 'lover') assert.equal(isMafiaNightStageComplete({ ...base, loverVisit: 'actor' }), true, role);
  }
  assert.equal(isMafiaNightStageComplete({ round: 1, nightStage: 'mafia' }), true);
});

test('dawn requires the last completed stage', () => {
  const base = { phase: 'night', round: 2, nightStage: 'doctor', roles: { maf: 'mafia', doc: 'doctor', det: 'detective' },
    alive: ['maf', 'doc', 'det'], mafiaVotes: { maf: 'det' }, doctorSave: 'det', loverVisit: null };
  const action = { type: 'night-result', killedId: null, killedIds: [], saved: true, savedIds: ['det'], lastDoctorSave: 'det', lastLoverVisit: null };
  assert.equal(validateMafiaHostAction(base, action, base.alive), false);
  assert.equal(validateMafiaHostAction({ ...base, nightStage: 'detective' }, action, base.alive), false);
  assert.equal(validateMafiaHostAction({ ...base, nightStage: 'detective', detectiveCheck: 'maf' }, action, base.alive), true);
});
