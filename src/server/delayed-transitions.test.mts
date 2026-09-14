import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { mafiaWinner, reduceGameSnapshot } from './game-security.mts';

const source = readFileSync(new URL('./socket-handlers.mts', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('socket-handlers.mts', source, ts.ScriptTarget.Latest, true);
const names = ['syncDelayedTransition', 'finiteNumber', 'stringArray', 'asRecord'];
const functions = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text ?? ''));
assert.equal(functions.length, names.length);
const code = ts.transpileModule(functions.map(n => n.getText(parsed)).join('\n') + '\nsyncDelayedTransition;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

for (const game of ['mafia', 'hundred-to-one']) test(`${game}: delayed transition needs no client and cannot fire after reset`, () => {
  let now = 1000;
  let pending: { at: number; callback: () => void; unref: () => void } | undefined;
  const snapshots: Record<string, unknown>[] = [];
  const initial = game === 'mafia'
    ? { phase:'day', round:2, alive:['a','b'], roles:{a:'mafia',b:'citizen'}, winner:null }
    : { phase:'buzzer', curQ:1, buzzerWinner:2, buzzerActive:false, roundActiveTeam:[1,0,0,0] };
  const room = { code:'TEST', currentGame:game, gameState:{...initial} as Record<string, unknown>, gameStateUpdatedAt:now };
  const sync = runInNewContext(code, {
    Date:{now:()=>now}, mafiaWinner, reduceGameSnapshot, getRoomByCode:()=>room,
    setTimeout(callback:()=>void, delay:number) { pending={at:now+delay,callback,unref(){}};return pending; },
    clearTimeout(){pending=undefined;}, syncRoomClock(){},
    broadcastSnapshot(){snapshots.push(structuredClone(room.gameState));},
  }) as (io:unknown, room:unknown)=>void;
  sync({},room);
  const deadline = pending!.at;
  now += 1000; sync({},room);
  assert.equal(pending!.at,deadline);
  assert.equal(snapshots.length,0);
  now=deadline; pending!.callback();
  assert.equal(snapshots.length,1);
  assert.equal(room.gameState.phase,game === 'mafia' ? 'results' : 'playing');
  if(game==='mafia') assert.equal(room.gameState.winner,'mafia');
  else assert.deepEqual(structuredClone(room.gameState.roundActiveTeam),[1,2,0,0]);
  room.gameState={...initial};sync({},room);
  const stale = pending!.callback;
  room.gameState={phase:'lobby'};sync({},room);stale();
  assert.equal(room.gameState.phase,'lobby');
});

test('quiz: revealed results continue exactly once after five seconds', () => {
  let now = 1000;
  let pending: { at: number; callback: () => void; unref: () => void } | undefined;
  const snapshots: Record<string, unknown>[] = [];
  const question = (id: number) => ({ questionRu:`Вопрос ${id}`, questionEn:`Question ${id}`, options:['a','b'], correctIndex:0, timeLimit:17 });
  const room = {
    code:'QUIZ', currentGame:'quiz', gameStateUpdatedAt:now,
    gameState:{ phase:'question', showCorrect:true, questionIndex:0, totalQuestions:7, scores:{p1:1}, questionQueue:[question(0),question(1),question(2),question(3),question(4),question(5),question(6)] } as Record<string, unknown>,
  };
  const sync = runInNewContext(code, {
    Date:{now:()=>now}, mafiaWinner, reduceGameSnapshot, getRoomByCode:()=>room,
    setTimeout(callback:()=>void, delay:number) { pending={at:now+delay,callback,unref(){}};return pending; },
    clearTimeout(){pending=undefined;}, syncRoomClock(){},
    broadcastSnapshot(){snapshots.push(structuredClone(room.gameState));},
  }) as (io:unknown, room:unknown)=>void;

  sync({}, room);
  assert.equal(pending!.at, 6000);
  now = 2000; sync({}, room);
  assert.equal(pending!.at, 6000);
  now = 5999;
  assert.equal(room.gameState.questionIndex, 0);
  assert.equal(room.gameState.showCorrect, true);
  const reveal = pending!;
  now = reveal.at; pending = undefined; reveal.callback();
  assert.equal(room.gameState.phase, 'question');
  assert.equal(room.gameState.questionIndex, 1);
  assert.equal(room.gameState.timeLeft, 17);
  assert.equal(room.gameState.showCorrect, false);
  assert.deepEqual(Object.keys(room.gameState.answers as Record<string, unknown>), []);
  assert.equal((room.gameState.correctPlayers as unknown[]).length, 0);
  assert.equal(snapshots.length, 1);
});

test('quiz: fifth-question boundary waits for host and final question ends automatically', () => {
  let now = 1000;
  let pending: { at: number; callback: () => void; unref: () => void } | undefined;
  const question = (id: number) => ({ questionRu:`Вопрос ${id}`, questionEn:`Question ${id}`, options:['a','b'], correctIndex:0, timeLimit:20 });
  const room = {
    code:'QUIZ', currentGame:'quiz', gameStateUpdatedAt:now,
    gameState:{ phase:'question', showCorrect:true, questionIndex:4, totalQuestions:7, scores:{p1:4}, questionQueue:[question(0),question(1),question(2),question(3),question(4),question(5),question(6)] } as Record<string, unknown>,
  };
  const sync = runInNewContext(code, {
    Date:{now:()=>now}, mafiaWinner, reduceGameSnapshot, getRoomByCode:()=>room,
    setTimeout(callback:()=>void, delay:number) { pending={at:now+delay,callback,unref(){}};return pending; },
    clearTimeout(){pending=undefined;}, syncRoomClock(){}, broadcastSnapshot(){},
  }) as (io:unknown, room:unknown)=>void;

  sync({}, room); const reveal = pending!; now = reveal.at; pending = undefined; reveal.callback();
  assert.equal(room.gameState.phase, 'mid-leaderboard');
  assert.equal(pending, undefined);
  sync({}, room);
  assert.equal(pending, undefined);

  room.gameState = { ...room.gameState, phase:'question', showCorrect:true, questionIndex:6 };
  sync({}, room); const finalReveal = pending!; now = finalReveal.at; pending = undefined; finalReveal.callback();
  assert.equal(room.gameState.phase, 'final');
});

test('quiz: stale reveal callback cannot overwrite a changed state', () => {
  const now = 1000;
  let pending: { at: number; callback: () => void; unref: () => void } | undefined;
  const room = {
    code:'QUIZ', currentGame:'quiz', gameStateUpdatedAt:now,
    gameState:{ phase:'question', showCorrect:true, questionIndex:1, totalQuestions:2, questionQueue:[] } as Record<string, unknown>,
  };
  const sync = runInNewContext(code, {
    Date:{now:()=>now}, mafiaWinner, reduceGameSnapshot, getRoomByCode:()=>room,
    setTimeout(callback:()=>void, delay:number) { pending={at:now+delay,callback,unref(){}};return pending; },
    clearTimeout(){pending=undefined;}, syncRoomClock(){}, broadcastSnapshot(){},
  }) as (io:unknown, room:unknown)=>void;

  sync({}, room);
  const stale = pending!.callback;
  room.gameState = { phase:'mid-leaderboard', questionIndex:1, scores:{} };
  sync({}, room);
  stale();
  assert.equal(room.gameState.phase, 'mid-leaderboard');
});
