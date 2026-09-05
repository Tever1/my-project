import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTimedSnapshot, reduceGameSnapshot, sanitizeSnapshot } from './game-security.mts';

const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'spy' }];
const voting = {
  phase: 'voting', mode: 'guess', players, spyId: 'spy', word: 'Secret',
  votes: { a: 'spy', b: 'spy' }, voteTimerLeft: 1, voteTimerRunning: true,
};

test('deadline closes voting and counts only submitted votes', () => {
  const result = advanceTimedSnapshot('spy', voting, 1);
  assert.equal(result?.phase, 'roundResult');
  assert.equal(result?.voteTimerRunning, false);
  assert.deepEqual(result?.votes, voting.votes);
  assert.deepEqual(result?.roundResult, { spyCaught: true, exposedId: 'spy', voteCount: 2, totalVotes: 2 });
});

test('voting stays open before the deadline', () => {
  const result = advanceTimedSnapshot('spy', { ...voting, voteTimerLeft: 5 }, 4);
  assert.equal(result?.phase, 'voting');
  assert.equal(result?.voteTimerLeft, 1);
});

test('no votes resolves without assigning any vote to absent players', () => {
  const result = advanceTimedSnapshot('spy', { ...voting, votes: {} }, 10);
  assert.equal(result?.phase, 'roundResult');
  assert.deepEqual(result?.roundResult, { spyCaught: false, exposedId: '', voteCount: 0, totalVotes: 0 });
});

test('equal tallies preserve the existing first-leader rule', () => {
  const result = advanceTimedSnapshot('spy', { ...voting, votes: { a: 'c', b: 'spy' } }, 1);
  assert.deepEqual(result?.roundResult, { spyCaught: false, exposedId: 'c', voteCount: 1, totalVotes: 2 });
});

test('host timer reaching zero resolves on the server too', () => {
  const result = reduceGameSnapshot('spy', voting, 'spy:sync', { voteTimerLeft: 0, voteTimerRunning: false });
  assert.equal(result?.phase, 'roundResult');
  assert.equal((result?.roundResult as { totalVotes: number }).totalVotes, 2);
});

test('all submitted votes can finish voting early without waiting for the timer', () => {
  const result = reduceGameSnapshot('spy', { ...voting, voteTimerLeft: 30, votes: { a: 'spy', b: 'spy', c: 'spy' } }, 'spy:vote', { voterId: 'spy', suspectId: 'a' });
  assert.equal(result?.phase, 'roundResult');
  assert.equal((result?.roundResult as { totalVotes: number }).totalVotes, 4);
});

test('late votes cannot change the resolved tally', () => {
  const result = advanceTimedSnapshot('spy', voting, 1);
  const late = reduceGameSnapshot('spy', result, 'spy:vote', { voterId: 'c', suspectId: 'a' });
  assert.deepEqual(late, result);
});

test('TV result reveals the result but not individual voting choices', () => {
  const result = advanceTimedSnapshot('spy', voting, 1);
  assert.ok(result);
  const tv = sanitizeSnapshot('spy', result, { playerId: null, isTv: true, isGameHost: false, isMafiaHost: false });
  assert.equal(tv.spyId, 'spy');
  assert.equal(tv.word, 'Secret');
  assert.deepEqual(tv.votes, { a: '', b: '' });
});
