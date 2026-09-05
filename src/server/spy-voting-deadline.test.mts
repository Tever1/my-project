import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { advanceTimedSnapshot } from './game-security.mts';

const source = readFileSync(new URL('./socket-handlers.mts', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('socket-handlers.mts', source, ts.ScriptTarget.Latest, true);
const names = ['materializeRoomSnapshot', 'syncSpyVotingDeadline', 'finiteNumber'];
const functions = parsed.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text ?? ''));
assert.equal(functions.length, names.length);
const code = ts.transpileModule(functions.map((node) => node.getText(parsed)).join('\n') + '\nsyncSpyVotingDeadline;', {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function deadlineHarness() {
  let now = 1000;
  let scheduled: { callback: () => void; at: number; unref: () => void } | undefined;
  const delivered: Record<string, unknown>[] = [];
  const room = {
    code: 'TEST', currentGame: 'spy', gameStateUpdatedAt: now,
    gameState: { phase: 'voting', voteTimerLeft: 60, voteTimerRunning: true, votes: { a: 'spy' }, spyId: 'spy' },
  };
  const schedule: (io: unknown, target: typeof room) => void = runInNewContext(code, {
    Date: { now: () => now }, advanceTimedSnapshot,
    getRoomByCode: () => room,
    setTimeout(callback: () => void, delay: number) {
      scheduled = { callback, at: now + delay, unref() {} };
      return scheduled;
    },
    clearTimeout() { scheduled = undefined; },
    broadcastSnapshot() {
      delivered.push(structuredClone(room.gameState));
      schedule({}, room);
    },
  });
  return {
    room, delivered,
    schedule() { schedule({}, room); },
    get dueAt() { return scheduled?.at; },
    elapse(ms: number) {
      now += ms;
      if (scheduled && scheduled.at <= now) {
        const callback = scheduled.callback;
        scheduled = undefined;
        callback();
      }
    },
  };
}

test('the server deadline ends voting without any phone sending a timer tick', () => {
  const h = deadlineHarness();
  h.schedule();
  h.elapse(59999);
  assert.equal(h.delivered.length, 0);
  h.elapse(1);
  assert.equal(h.delivered.length, 1);
  assert.equal(h.delivered[0].phase, 'roundResult');
  assert.deepEqual(h.delivered[0].roundResult, { spyCaught: true, exposedId: 'spy', voteCount: 1, totalVotes: 1 });
  assert.equal(h.dueAt, undefined);
});

test('repeated snapshots do not extend an unchanged deadline', () => {
  const h = deadlineHarness();
  h.schedule();
  const dueAt = h.dueAt;
  h.elapse(10000);
  h.schedule();
  assert.equal(h.dueAt, dueAt);
});

test('finishing early cancels the pending deadline', () => {
  const h = deadlineHarness();
  h.schedule();
  h.room.gameState.phase = 'roundResult';
  h.room.gameState.voteTimerRunning = false;
  h.schedule();
  assert.equal(h.dueAt, undefined);
  h.elapse(60000);
  assert.deepEqual(h.delivered, []);
});
