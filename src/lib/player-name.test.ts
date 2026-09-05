import assert from 'node:assert/strict';
import test from 'node:test';
import playerName from './player-name.ts';

const { MAX_PLAYER_NAME_LENGTH, limitPlayerName, normalizePlayerName } = playerName;

test('player names are trimmed and limited to ten visible characters', () => {
  assert.equal(MAX_PLAYER_NAME_LENGTH, 10);
  assert.equal(normalizePlayerName('  Александрия  '), 'Александри');
  assert.equal(limitPlayerName('1234567890extra'), '1234567890');
  assert.equal(limitPlayerName('😀'.repeat(11)), '😀'.repeat(10));
  assert.equal(
    limitPlayerName('👨‍👩‍👧‍👦'.repeat(11)),
    '👨‍👩‍👧‍👦'.repeat(10),
  );
  assert.equal(limitPlayerName('е́'.repeat(11)), 'е́'.repeat(10));
  assert.equal(normalizePlayerName(null), '');
});
