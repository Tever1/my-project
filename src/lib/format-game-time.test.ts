import assert from 'node:assert/strict';
import test from 'node:test';
import { formatGameTime } from './format-game-time';

test('formats a full minute without showing 00:60', () => {
  assert.equal(formatGameTime(60), '01:00');
  assert.equal(formatGameTime(59), '00:59');
  assert.equal(formatGameTime(-1), '00:00');
});
