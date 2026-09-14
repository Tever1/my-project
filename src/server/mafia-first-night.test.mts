import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTimedSnapshot, reduceGameSnapshot, sanitizeSnapshot, validateMafiaActorAction, validateMafiaHostAction } from './game-security.mts';

const roles = { mafia: 'mafia', don: 'don', doctor: 'doctor', detective: 'detective', lover: 'lover', maniac: 'maniac', citizen: 'citizen' };
const night = { phase: 'night', round: 1, nightStage: 'mafia', roles, alive: Object.keys(roles), mafiaVotes: {}, loverVisit: null };

test('first night blocks every ability even if a client submits another stage', () => {
  for (const [id, type, actorKey, stage] of [
    ['mafia', 'mafia-vote', 'voterId', 'mafia'], ['don', 'don-check-sheriff', 'donId', 'don'],
    ['doctor', 'doctor-save', 'doctorId', 'doctor'], ['detective', 'detective-check', 'detectiveId', 'detective'],
    ['lover', 'lover-visit', 'loverId', 'lover'], ['maniac', 'maniac-kill', 'maniacId', 'maniac'],
  ]) assert.equal(validateMafiaActorAction({ ...night, nightStage: stage }, id, {type, [actorKey]: id, targetId: 'citizen'}), false);
  assert.equal(validateMafiaHostAction(night, {type:'advance-night-stage', stage:'doctor'}, Object.keys(roles)), false);
  const morning = {type:'night-result', killedId:null, killedIds:[], saved:false, savedIds:[], lastDoctorSave:null, lastLoverVisit:null};
  assert.equal(validateMafiaHostAction(night, morning, Object.keys(roles)), true);
  assert.equal(validateMafiaHostAction(night, {...morning, killedId:'citizen', killedIds:['citizen']}, Object.keys(roles)), false);
});

test('discussion expires once, preserves night result and does not erase later votes', () => {
  const day = {phase:'day', round:2, dayTimer:60, lastNightKills:['citizen'], votes:{}, votingRound:1};
  assert.equal(advanceTimedSnapshot('mafia', day, 59)?.phase, 'day');
  const voting = advanceTimedSnapshot('mafia', day, 60)!;
  assert.equal(voting.phase, 'voting');
  assert.equal(voting.dayTimer, 0);
  assert.deepEqual(voting.lastNightKills, ['citizen']);
  const voted = {...voting, votes:{mafia:'doctor'}};
  assert.deepEqual(advanceTimedSnapshot('mafia', voted, 120)?.votes, voted.votes);
});

test('night deaths and rescue survive private snapshots for phone and TV', () => {
  const morning = reduceGameSnapshot('mafia', {...night, round:2}, 'mafia', {
    type:'night-result', killedId:'citizen', killedIds:['citizen'], saved:true,
    savedIds:['doctor'], lastDoctorSave:'doctor', lastLoverVisit:null,
  })!;
  for (const isTv of [false, true]) {
    const view = sanitizeSnapshot('mafia', morning, {playerId:isTv ? null : 'doctor', isTv, isGameHost:false, isMafiaHost:false});
    assert.deepEqual(view.lastNightKills, ['citizen']);
    assert.equal(view.lastNightSaved, true);
    assert.equal((view.alive as string[]).includes('citizen'), false);
  }
});
