import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { reduceGameSnapshot, sanitizeSnapshot } from './game-security.mts';

test('question chain continues from the canonical order even without a snapshot roster', () => {
  let state = { phase: 'playing', mode: 'guess', playerOrder: ['a', 'b', 'c', 'd'], guessAskerId: 'a', guessTargetId: 'b', guessCycleAnswered: ['b'] };
  for (let i = 0; i < 20; i++) {
    const previousTarget = state.guessTargetId;
    state = reduceGameSnapshot('spy', state, 'spy:pass-turn', {}) as typeof state;
    assert.equal(state.guessAskerId, previousTarget);
    assert.ok(state.playerOrder.includes(state.guessTargetId));
    assert.notEqual(state.guessAskerId, state.guessTargetId);
  }
});

test('all submitted votes finish immediately with only the canonical order present', () => {
  let state = { phase: 'voting', playerOrder: ['a', 'b', 'c', 'd'], spyId: 'd', voteTimerLeft: 50, voteTimerRunning: true, votes: {} };
  for (const id of state.playerOrder) state = reduceGameSnapshot('spy', state, 'spy:vote', { voterId: id, suspectId: id === 'd' ? 'a' : 'd' }) as typeof state;
  assert.equal(state.phase, 'roundResult');
});

test('a typo waits for a dispute and a server judge verdict resolves it', () => {
  const initial = { phase: 'spyGuess', word: 'Аэропорт', spyId: 'd', players: [{ id: 'a' }, { id: 'd' }] };
  const typo = reduceGameSnapshot('spy', initial, 'spy:guess-try', { text: 'Аэропор' })!;
  assert.equal(typo.phase, 'spyGuess');
  assert.equal(typo.spyGuessNeedsConfirm, true);
  const judged = reduceGameSnapshot('spy', typo, 'spy:guess-confirm', { judgeId: 'a' })!;
  assert.equal(judged.spyGuessAwaitingJudge, true);
  assert.equal(judged.spyGuessJudgeId, 'a');
  const tv = sanitizeSnapshot('spy', judged, { playerId: null, isTv: true, isGameHost: false, isMafiaHost: false });
  assert.equal(tv.word, '');
  assert.equal(tv.spyGuessText, '');
  const accepted = reduceGameSnapshot('spy', judged, 'spy:guess-verdict', { accept: true })!;
  assert.equal(accepted.phase, 'roundResult');
  assert.equal((accepted.roundResult as { guessedRight: boolean }).guessedRight, true);
});

test('TV voting composition includes its own countdown', () => {
  const source = readFileSync(new URL('../app/tv/[roomId]/[gameType]/page.tsx', import.meta.url), 'utf8');
  const start = source.indexOf("sp.phase === 'voting' && <div");
  const end = source.indexOf("sp.phase === 'spyGuess' &&", start);
  assert.match(source.slice(start, end), /formatSec\(sp.voteTimerLeft\)/);
});

for (const mode of ['guess', 'draw']) test(`${mode} passes in fixed circles without repeating any participant`, () => {
  const order = ['a', 'c', 'd', 'b'];
  let state: Record<string, unknown> = { phase: 'playing', mode, playerOrder: order, playerOrderIdx: 0, drawerId: 'a', guessAskerId: 'a', guessTargetId: 'c', guessCycleAnswered: ['c'] };
  for (let index = 1; index <= 24; index++) {
    state = reduceGameSnapshot('spy', state, 'spy:pass-turn', {})!;
    assert.equal(mode === 'draw' ? state.drawerId : state.guessAskerId, order[index % order.length]);
    if (mode === 'guess') assert.equal(state.guessTargetId, order[(index + 1) % order.length]);
  }
});

test('a final guess during discussion stops its countdown', () => {
  const state = reduceGameSnapshot('spy', { phase: 'discussion', discussionTimeLeft: 45, discussionTimerRunning: true }, 'spy:guess-start', {})!;
  assert.equal(state.phase, 'spyGuess');
  assert.equal(state.discussionTimerRunning, false);
});
