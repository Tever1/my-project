import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeCrocodileStateSync } from './crocodile-state-sync';

test('a word swipe cannot reset the phone timer during the same player turn', () => {
  const current = {
    phase: 'explaining',
    turnNumber: 2,
    explainerId: 'player-2',
    timeLeft: 42,
    currentWordIndex: 7,
  };

  const afterSwipe = mergeCrocodileStateSync(current, {
    ...current,
    timeLeft: 60,
    currentWordIndex: 8,
  });

  assert.equal(afterSwipe.timeLeft, 42);
  assert.equal(afterSwipe.currentWordIndex, 8);
});

test('a different player turn can start with a fresh minute', () => {
  const current = {
    phase: 'explaining',
    turnNumber: 2,
    explainerId: 'player-2',
    timeLeft: 1,
  };

  const nextTurn = mergeCrocodileStateSync(current, {
    phase: 'ready',
    turnNumber: 3,
    explainerId: 'player-3',
    timeLeft: 60,
  });

  assert.equal(nextTurn.timeLeft, 60);
});
