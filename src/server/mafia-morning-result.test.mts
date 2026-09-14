import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTimedSnapshot, reduceGameSnapshot, sanitizeSnapshot, validateMafiaHostAction } from './game-security.mts';

test('night result waits for host, survives reconnect, then starts full discussion', () => {
  const base = { phase: 'night', round: 2, alive: ['maf','a','b','c'], roles: { maf:'mafia',a:'citizen',b:'doctor',c:'citizen' } };
  const morning = reduceGameSnapshot('mafia',base,'mafia',{type:'night-result',killedId:'a',killedIds:['a'],saved:false})!;
  assert.equal(morning.morningPending,true);
  assert.equal(advanceTimedSnapshot('mafia',morning,300)!.dayTimer,60);
  assert.equal(validateMafiaHostAction(morning,{type:'start-voting'},base.alive),false);
  const view = sanitizeSnapshot('mafia',morning,{playerId:null,isTv:true,isGameHost:false,isMafiaHost:false});
  assert.equal(view.morningPending,true);
  assert.deepEqual(view.lastNightKills,['a']);
  assert.equal((view.roles as Record<string,string>).a,undefined);
  assert.equal(validateMafiaHostAction(morning,{type:'morning-continue'},base.alive),true);
  const day = reduceGameSnapshot('mafia',morning,'mafia',{type:'morning-continue'})!;
  assert.equal(day.morningPending,false);
  assert.equal(advanceTimedSnapshot('mafia',day,1)!.dayTimer,59);
  assert.equal(advanceTimedSnapshot('mafia',day,60)!.phase,'voting');
});

test('terminal night reveals game outcome only after host continues', () => {
  const morning = { phase:'day',morningPending:true,round:2,alive:['maf','a'],roles:{maf:'mafia',a:'citizen'},winner:null };
  assert.equal(validateMafiaHostAction(morning,{type:'game-over',winner:'mafia'},morning.alive),false);
  const result = reduceGameSnapshot('mafia',morning,'mafia',{type:'morning-continue'})!;
  assert.equal(result.phase,'results');
  assert.equal(result.winner,'mafia');
});
