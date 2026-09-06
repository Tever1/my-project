import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTimedSnapshot, reduceGameSnapshot } from './game-security.mts';

test('H2O reset is explicit and stale ticks cannot resurrect expired clocks', () => {
  const running = { phase: 'playing', r4Time: 20, r4Running: true };
  const reset = reduceGameSnapshot('hundred-to-one', running, 'h2o:sync', { r4Reset: true });
  assert.equal(reset?.r4Time, 60);
  assert.equal(reset?.r4Running, false);
  const expired = advanceTimedSnapshot('hundred-to-one', running, 30);
  const stale = reduceGameSnapshot('hundred-to-one', expired, 'h2o:sync', { r4Time: 19, r4Running: true });
  assert.equal(stale?.r4Time, 0);
  assert.equal(stale?.r4Running, false);
});

test('Big Game expiry completes unanswered slots and permits the next player timer', () => {
  const expired = advanceTimedSnapshot('hundred-to-one', {
    phase: 'bigGame', bgPhase: 1, bgTimeLeft: 2, bgTimerPaused: false, bgP1Ans: ['answer'],
  }, 3);
  assert.equal(expired?.bgCurQ, 5);
  assert.deepEqual(expired?.bgP1Ans, ['answer', '—', '—', '—', '—']);
  const stale = reduceGameSnapshot('hundred-to-one', expired, 'h2o:sync', { bgTimeLeft: 1 });
  assert.equal(stale?.bgTimeLeft, 0);
  const next = reduceGameSnapshot('hundred-to-one', expired, 'h2o:sync', { bgPhase: 3, bgTimeLeft: 40 });
  assert.equal(next?.bgTimeLeft, 40);
});

test('Server clocks respect pauses and Mafia reaches zero during host suspension', () => {
  const paused = advanceTimedSnapshot('hundred-to-one', {
    phase: 'bigGame', bgPhase: 1, bgTimeLeft: 12, bgTimerPaused: true, r4Running: false, r4Time: 25,
  }, 90);
  assert.equal(paused?.bgTimeLeft, 12);
  assert.equal(paused?.r4Time, 25);
  assert.equal(advanceTimedSnapshot('mafia', { phase: 'day', dayTimer: 60 }, 90)?.dayTimer, 0);
});

test('H2O answer progress rejects stale patches but allows reset and the next finalist', () => {
  const state = { phase: 'bigGame', bgPhase: 1, bgCurQ: 2, bgP1Ans: ['one', 'two'], bgTimeLeft: 20, bgTimerPaused: true };
  assert.deepEqual(reduceGameSnapshot('hundred-to-one', state, 'h2o:sync', {
    bgCurQ: 1, bgP1Ans: ['one'], bgTimerPaused: false,
  }), state);
  assert.deepEqual(reduceGameSnapshot('hundred-to-one', state, 'h2o:sync', {
    bgCurQ: 2, bgP1Ans: ['changed', 'two'],
  }), state);
  const resumed = reduceGameSnapshot('hundred-to-one', state, 'h2o:sync', { bgTimerPaused: false });
  assert.equal(resumed?.bgTimerPaused, false);
  const reset = reduceGameSnapshot('hundred-to-one', state, 'h2o:sync', { bgPhase: 0, bgCurQ: 0, bgP1Ans: [], bgTimeLeft: 0 });
  assert.deepEqual(reset?.bgP1Ans, []);
  const second = reduceGameSnapshot('hundred-to-one', state, 'h2o:sync', { bgPhase: 3, bgCurQ: 0, bgP2Ans: [], bgTimeLeft: 40 });
  assert.equal(second?.bgCurQ, 0);
  assert.equal(second?.bgTimeLeft, 40);
});
