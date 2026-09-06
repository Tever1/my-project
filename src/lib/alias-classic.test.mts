import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALIAS_CLASSIC_TARGET_SCORE,
  ALIAS_LETTER_TARGET_SCORE,
  getAliasFinishingRound,
  pickNextAliasLetter,
  scoreClassicTurn,
  shouldFinishAliasRound,
} from './alias-classic.mts';

test('classic scoring awards timed points to the active team and the final word to the selected team', () => {
  const result = scoreClassicTurn({
    teams: [{ id: 'one', score: 27 }, { id: 'two', score: 25 }],
    activeTeamIndex: 0,
    wordsGuessedBeforeFinal: 4,
    wordsSkipped: 1,
    finalWordTeamIndex: 1,
  });

  assert.deepEqual(result.teams, [{ id: 'one', score: 30 }, { id: 'two', score: 26 }]);
  assert.deepEqual(result.deltas, { one: 3, two: 1 });
});

test('classic scoring adds the final word to the active team when it wins the choice', () => {
  const result = scoreClassicTurn({
    teams: [{ id: 'one', score: 26 }, { id: 'two', score: 24 }],
    activeTeamIndex: 0,
    wordsGuessedBeforeFinal: 4,
    wordsSkipped: 1,
    finalWordTeamIndex: 0,
  });

  assert.equal(result.teams[0].score, ALIAS_CLASSIC_TARGET_SCORE);
  assert.deepEqual(result.deltas, { one: 4, two: 0 });
});

test('classic finishing round starts at 30 and waits for the last team turn', () => {
  const teams = [{ id: 'one', score: 30 }, { id: 'two', score: 28 }];
  assert.equal(getAliasFinishingRound(null, 5, teams, ALIAS_CLASSIC_TARGET_SCORE), 5);
  assert.equal(shouldFinishAliasRound(0, 2, 5, 5), false);
  assert.equal(shouldFinishAliasRound(1, 2, 5, 5), true);
});

test('classic finishing round remains stable if another team later reaches the target', () => {
  const teams = [{ id: 'one', score: 31 }, { id: 'two', score: 32 }];
  assert.equal(getAliasFinishingRound(5, 6, teams, ALIAS_CLASSIC_TARGET_SCORE), 5);
});

test('letter mode starts its finishing round at 15 and waits for every player', () => {
  const players = [
    { id: 'one', score: ALIAS_LETTER_TARGET_SCORE },
    { id: 'two', score: 12 },
    { id: 'three', score: 9 },
  ];

  assert.equal(getAliasFinishingRound(null, 3, players, ALIAS_LETTER_TARGET_SCORE), 3);
  assert.equal(shouldFinishAliasRound(0, players.length, 3, 3), false);
  assert.equal(shouldFinishAliasRound(1, players.length, 3, 3), false);
  assert.equal(shouldFinishAliasRound(2, players.length, 3, 3), true);
});

test('letter mode always picks a different letter after a guessed word', () => {
  assert.equal(pickNextAliasLetter(['А', 'Б', 'В'], 'А', 0), 'Б');
  assert.equal(pickNextAliasLetter(['А', 'Б', 'В'], 'Б', 0.999), 'В');
});
