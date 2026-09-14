import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTimedSnapshot, reduceGameSnapshot, sanitizeSnapshot } from './game-security.mts';

for (const mode of ['classic', 'letter']) {
  test(`Alias ${mode}: private host snapshots do not erase guessed/skipped history`, () => {
    let state = {
      phase: 'explaining', mode, round: 1, activeTeamIndex: 0, explainerIndices: [0, 0],
      teams: [{ id: 'a', playerIds: ['explainer'] }, { id: 'b', playerIds: ['host'] }],
      currentWordIndex: 1, timeLeft: 60, wordsGuessed: 0, wordsSkipped: 0,
      turnHistory: [],
    } as Record<string, unknown>;
    const expected = [
      { word: { ru: 'Первое', en: 'First' }, guessed: true },
      { word: { ru: 'Второе', en: 'Second' }, guessed: false },
      { word: { ru: 'Третье', en: 'Third' }, guessed: true },
    ];
    for (const [index, item] of expected.entries()) {
      const host = sanitizeSnapshot('alias', state, {
        playerId: 'host', isGameHost: true, isTv: false, isMafiaHost: false,
      });
      assert.deepEqual(host.turnHistory, []);
      state = reduceGameSnapshot('alias', state, 'alias:state', {
        ...host, currentWordIndex: index + 2,
        wordsGuessed: Number(host.wordsGuessed) + Number(item.guessed),
        wordsSkipped: Number(host.wordsSkipped) + Number(!item.guessed),
        turnHistory: [item],
      })!;
    }
    if (mode === 'letter') state = advanceTimedSnapshot('alias', state, 90)!;
    else {
      const host = sanitizeSnapshot('alias', state, {
        playerId: 'host', isGameHost: true, isTv: false, isMafiaHost: false,
      });
      const final = { word: { ru: 'Последнее', en: 'Last' }, guessed: true };
      expected.push(final);
      state = reduceGameSnapshot('alias', { ...state, timeLeft: 0 }, 'alias:state', {
        ...host, phase: 'turnResult', timeLeft: 0,
        wordsGuessed: Number(host.wordsGuessed) + 1, turnHistory: [final],
      })!;
    }
    const tv = sanitizeSnapshot('alias', state, {
      playerId: 'tv', isGameHost: false, isTv: true, isMafiaHost: false,
    });
    assert.deepEqual(tv.turnHistory, expected);
    assert.equal(tv.wordsGuessed, expected.filter(item => item.guessed).length);
    assert.equal(tv.wordsSkipped, expected.filter(item => !item.guessed).length);
    const duplicate = reduceGameSnapshot('alias', state, 'alias:state', state)!;
    assert.deepEqual(duplicate.turnHistory, expected);
    const nextTurn = reduceGameSnapshot('alias', state, 'alias:state', {
      ...state, phase: 'waiting', activeTeamIndex: 1, wordsGuessed: 0, wordsSkipped: 0, turnHistory: [],
    })!;
    assert.deepEqual(nextTurn.turnHistory, []);
  });
}
