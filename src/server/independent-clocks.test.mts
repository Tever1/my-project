import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTimedSnapshot, reduceGameSnapshot } from './game-security.mts';

test('Alias expiry preserves classic final-word rules and does not double score letter mode', () => {
  const state = { phase:'explaining', timeLeft:1, teams:[{score:4}], wordsGuessed:4, finalWordPending:false };
  const classic = advanceTimedSnapshot('alias',{...state,mode:'classic'},10)!;
  assert.equal(classic.phase,'explaining'); assert.equal(classic.timeLeft,0);
  assert.deepEqual(classic.teams,state.teams);
  const letter = advanceTimedSnapshot('alias',{...state,mode:'letter'},10)!;
  assert.equal(letter.phase,'turnResult'); assert.deepEqual(letter.teams,state.teams);
  assert.deepEqual(advanceTimedSnapshot('alias',letter,100),letter);
});

test('Spy server time crosses discussion and voting exactly once', () => {
  const state = { phase:'playing',timerLeft:1,timerRunning:true,word:'secret',spyId:'a',votes:{} };
  const discussion = advanceTimedSnapshot('spy',state,1)!;
  assert.equal(discussion.phase,'discussion'); assert.equal(discussion.discussionTimeLeft,120);
  const voting = advanceTimedSnapshot('spy',discussion,120)!;
  assert.equal(voting.phase,'voting'); assert.equal(voting.voteTimerLeft,60);
  const result = advanceTimedSnapshot('spy',voting,60)!;
  assert.equal(result.phase,'roundResult');
  assert.deepEqual(advanceTimedSnapshot('spy',result,1000),result);
});

test('Quiz counts down, expires and scores once; stale same-question sync cannot change time', () => {
  const question = {questionRu:'Q',questionEn:'Q',options:['a','b'],correctIndex:0,timeLimit:20};
  const state = advanceTimedSnapshot('quiz',{phase:'countdown',countdownValue:3,questionIndex:0,questionQueue:[question],scores:{}},3)!;
  assert.equal(state.phase,'question'); assert.equal(state.timeLeft,20);
  const stale = reduceGameSnapshot('quiz',state,'quiz:sync',{timeLeft:0})!;
  assert.equal(stale.timeLeft,20);
  const answered = reduceGameSnapshot('quiz',state,'quiz:answer',{playerId:'a',answerIndex:0});
  const result = advanceTimedSnapshot('quiz',answered,20)!;
  assert.equal(result.showCorrect,true); assert.deepEqual(result.scores,{a:1});
  assert.deepEqual(advanceTimedSnapshot('quiz',result,100),result);
});
