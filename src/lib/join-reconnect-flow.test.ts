import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/join/[code]/page.tsx', import.meta.url), 'utf8');

test('the join page waits for a successful reconnect acknowledgement', () => {
  const effectStart = source.indexOf('const existingPlayer = roomState.players.find');
  const effectEnd = source.indexOf('const handleJoin = useCallback', effectStart);
  assert.ok(effectStart > 0 && effectEnd > effectStart);
  const effect = source.slice(effectStart, effectEnd);
  const successBranch = effect.indexOf('if (result.success)');
  const markJoined = effect.indexOf('setJoined(true)');
  assert.ok(successBranch >= 0 && markJoined > successBranch);
  assert.doesNotMatch(effect.slice(0, successBranch), /setJoined\(true\)/);
  assert.match(effect, /autoRejoinAttemptRef\.current === attemptKey/);
  assert.match(effect, /setError\(result\.error/);
});
