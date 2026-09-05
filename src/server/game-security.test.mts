import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceTimedSnapshot,
  normalizeWhoAmIGuess,
  reduceGameSnapshot,
  sanitizeSnapshot,
  validateMafiaActorAction,
  validateMafiaHostAction,
  validateStateSyncPhase,
  type GameRecipient,
} from './game-security.mts';

const player = (playerId: string, overrides: Partial<GameRecipient> = {}): GameRecipient => ({
  playerId,
  isTv: false,
  isGameHost: false,
  isMafiaHost: false,
  ...overrides,
});

test('controller state sync allows only declared phase transitions', () => {
  assert.equal(validateStateSyncPhase('crocodile', null, { phase: 'ready' }), true);
  assert.equal(validateStateSyncPhase('crocodile', { phase: 'ready' }, { phase: 'finished' }), true);
  assert.equal(validateStateSyncPhase('crocodile', { phase: 'ready' }, { phase: 'voting' }), false);
  assert.equal(validateStateSyncPhase('alias', { phase: 'explaining' }, { phase: 'teamSelect' }), false);
  assert.equal(validateStateSyncPhase('spy', { phase: 'discussion' }, { phase: 'voting' }), true);
  assert.equal(validateStateSyncPhase('hundred-to-one', { phase: 'roleSelect' }, { roles: {} }), true);
});

test('quiz hides the correct answer and other answer values until reveal', () => {
  const hidden = sanitizeSnapshot('quiz', {
    phase: 'question',
    showCorrect: false,
    currentQuestion: { questionRu: 'Q', questionEn: 'Q', options: [], correctIndex: 2 },
    answers: { p1: 1, p2: 2 },
    correctPlayers: ['p2'],
    questionQueue: [{ id: 'secret', correctIndex: 2 }],
  }, player('p1'));

  assert.equal((hidden.currentQuestion as Record<string, unknown>).correctIndex, -1);
  assert.deepEqual(hidden.answers, { p1: 1, p2: -1 });
  assert.deepEqual(hidden.correctPlayers, []);
  assert.equal(Object.hasOwn(hidden, 'questionQueue'), false);

  const revealed = sanitizeSnapshot('quiz', { ...hidden, showCorrect: true, currentQuestion: { correctIndex: 2 } }, player('p1'));
  assert.equal((revealed.currentQuestion as Record<string, unknown>).correctIndex, 2);
});

test('quiz keeps only the latest answer from each player before reveal', () => {
  const question = reduceGameSnapshot('quiz', null, 'quiz:start-question', {
    questionIndex: 0,
    timeLeft: 20,
    question: { options: [{}, {}, {}, {}], correctIndex: 2 },
  });
  const firstChoice = reduceGameSnapshot('quiz', question, 'quiz:answer', {
    playerId: 'p1',
    answerIndex: 1,
  });
  const changedChoice = reduceGameSnapshot('quiz', firstChoice, 'quiz:answer', {
    playerId: 'p1',
    answerIndex: 2,
  });

  assert.deepEqual(changedChoice?.answers, { p1: 2 });
  assert.equal(Object.keys(changedChoice?.answers as Record<string, unknown>).length, 1);
});

test('crocodile and alias expose the word only to the active explainer', () => {
  const croc = { phase: 'explaining', explainerId: 'p1', currentWordIndex: 42, usedWordIndices: [3, 42] };
  assert.equal(sanitizeSnapshot('crocodile', croc, player('p1')).currentWordIndex, 42);
  const crocOther = sanitizeSnapshot('crocodile', croc, player('p2'));
  assert.equal(crocOther.currentWordIndex, -1);
  assert.deepEqual(crocOther.usedWordIndices, []);

  const alias = {
    phase: 'explaining', activeTeamIndex: 0, explainerIndices: [0],
    teams: [{ playerIds: ['p1', 'p2'] }], currentWordIndex: 7,
    usedWordIndices: [1, 7], turnHistory: [{ word: { ru: 'секрет' }, guessed: true }],
  };
  assert.equal(sanitizeSnapshot('alias', alias, player('p1')).currentWordIndex, 7);
  const guesserView = sanitizeSnapshot('alias', alias, player('p2'));
  assert.equal(guesserView.currentWordIndex, -1);
  assert.deepEqual(guesserView.turnHistory, []);
  assert.equal(sanitizeSnapshot('crocodile', croc, player('host', { isGameHost: true })).currentWordIndex, -1);
  assert.equal(sanitizeSnapshot('alias', alias, player('host', { isGameHost: true })).currentWordIndex, -1);
});

test('spy hides the word, spy identity and vote choices from TV', () => {
  const snapshot = {
    phase: 'voting', word: 'Airport', spyId: 'p2', votes: { p1: 'p2', p2: 'p1' },
    spyGuessJudgeId: '', spyGuessText: '',
  };
  const view = sanitizeSnapshot('spy', snapshot, {
    playerId: null, isTv: true, isGameHost: false, isMafiaHost: false,
  });
  assert.equal(view.word, '');
  assert.equal(view.spyId, '');
  assert.deepEqual(view.votes, { p1: '', p2: '' });

  const voterView = sanitizeSnapshot('spy', snapshot, player('p1'));
  assert.deepEqual(voterView.votes, { p1: 'p2', p2: '' });
  const hostSpyView = sanitizeSnapshot('spy', snapshot, player('p2', { isGameHost: true }));
  assert.equal(hostSpyView.word, '');
  assert.equal(hostSpyView.spyId, 'p2');
});

test('spy keeps identity hidden during the final guess and reveals identity and word in the result', () => {
  const guessing = {
    phase: 'spyGuess', word: 'Аэропорт', spyId: 'p2', votes: {}, spyGuessJudgeId: '', spyGuessText: '',
  };
  const tv = { playerId: null, isTv: true, isGameHost: false, isMafiaHost: false };
  const hidden = sanitizeSnapshot('spy', guessing, tv);
  assert.equal(hidden.spyId, '');
  assert.equal(hidden.word, '');

  const result = sanitizeSnapshot('spy', { ...guessing, phase: 'roundResult' }, tv);
  assert.equal(result.spyId, 'p2');
  assert.equal(result.word, 'Аэропорт');
});

test('spy pass-turn advances both question and drawing modes on the server', () => {
  const guess = reduceGameSnapshot('spy', {
    phase: 'playing', mode: 'guess', players: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
    playerOrder: ['p1', 'p2', 'p3'], playerOrderIdx: 0,
    guessAskerId: 'p1', guessTargetId: 'p2', guessCycleAnswered: ['p2'],
  }, 'spy:pass-turn', {});
  assert.equal(guess?.guessAskerId, 'p2');
  assert.ok(['p1', 'p3'].includes(String(guess?.guessTargetId)));
  assert.notEqual(guess?.guessTargetId, guess?.guessAskerId);
  assert.deepEqual(guess?.guessCycleAnswered, ['p2', guess?.guessTargetId]);

  const draw = reduceGameSnapshot('spy', {
    phase: 'playing', mode: 'draw', playerOrder: ['p1', 'p2', 'p3'], playerOrderIdx: 0, drawerId: 'p1',
  }, 'spy:pass-turn', {});
  assert.equal(draw?.playerOrderIdx, 1);
  assert.equal(draw?.drawerId, 'p2');
});

test('spy guess resolves immediately and exposes the round result', () => {
  const base = {
    phase: 'spyGuess', mode: 'guess', word: 'Аэропорт', spyId: 'p2', timerRunning: false,
    spyGuessNeedsConfirm: false, spyGuessAwaitingJudge: false, spyGuessJudgeId: '',
  };
  const wrong = reduceGameSnapshot('spy', base, 'spy:guess-try', { text: 'Вокзал' });
  assert.equal(wrong?.phase, 'roundResult');
  assert.deepEqual(wrong?.roundResult, {
    spyCaught: true, exposedId: 'p2', voteCount: 0, viaGuess: true, guessedRight: false,
  });

  const correct = reduceGameSnapshot('spy', base, 'spy:guess-try', { text: '  аэропорт  ' });
  assert.equal(correct?.phase, 'roundResult');
  assert.deepEqual(correct?.roundResult, {
    spyCaught: false, exposedId: 'p2', voteCount: 0, viaGuess: true, guessedRight: true,
  });
});

test('hundred-to-one hides the first big-game answers from the second player', () => {
  const snapshot = {
    phase: 'bigGame', bgPhase: 1, bgP1Id: 'p1', bgP2Id: 'p2',
    bgP1Ans: ['answer'], bgP2Ans: [], bgP1Matched: ['answer'], bgP2Matched: [],
  };
  assert.deepEqual(sanitizeSnapshot('hundred-to-one', snapshot, player('p2')).bgP1Ans, []);
  assert.deepEqual(sanitizeSnapshot('hundred-to-one', snapshot, player('p1')).bgP1Ans, ['answer']);

  const secondPlayerRound = { ...snapshot, bgPhase: 3, bgP2Ans: ['second'] };
  const secondPlayerView = sanitizeSnapshot('hundred-to-one', secondPlayerRound, player('p2'));
  assert.deepEqual(secondPlayerView.bgP1Ans, []);
  assert.deepEqual(secondPlayerView.bgP2Ans, ['second']);
  const tvView = sanitizeSnapshot('hundred-to-one', secondPlayerRound, {
    playerId: null, isTv: true, isGameHost: false, isMafiaHost: false,
  });
  assert.deepEqual(tvView.bgP1Ans, []);
  assert.deepEqual(tvView.bgP2Ans, []);
});

test('who-am-i removes only the recipient character and validates exact guesses on the server', () => {
  const snapshot = {
    phase: 'playing', characters: { p1: { ru: 'Кот', en: 'Cat' }, p2: { ru: 'Пёс', en: 'Dog' } },
    currentTurnIndex: 0, turnOrder: ['p1', 'p2'], guessedPlayers: [], questionsAsked: { p1: 0, p2: 0 },
    consecutiveYesAnswers: 0, scores: {}, guessPendingPlayerId: '', guessJudgeId: '', guessPendingText: '',
  };
  const view = sanitizeSnapshot('who-am-i', snapshot, player('p1'));
  assert.deepEqual(view.characters, { p2: { ru: 'Пёс', en: 'Dog' } });
  const hostView = sanitizeSnapshot('who-am-i', snapshot, player('p1', { isGameHost: true }));
  assert.deepEqual(hostView.characters, { p2: { ru: 'Пёс', en: 'Dog' } });
  const guessedView = sanitizeSnapshot('who-am-i', {
    ...snapshot,
    guessedPlayers: ['p1'],
  }, player('p1'));
  assert.deepEqual(guessedView.characters, snapshot.characters);
  assert.deepEqual(normalizeWhoAmIGuess(snapshot, { type: 'guess-try', playerId: 'p1', guess: ' cat ' }), {
    type: 'guess', playerId: 'p1', guess: ' cat ', correct: true,
  });
  assert.deepEqual(normalizeWhoAmIGuess(snapshot, {
    type: 'ask-question', playerId: 'p1', answer: 'yes', questionsAsked: 999, consecutiveYesAnswers: 999,
  }), {
    type: 'ask-question', playerId: 'p1', answer: 'yes', questionsAsked: 1, consecutiveYesAnswers: 1,
  });
});

test('Who Am I TV reveals guessed characters only in final results', () => {
  const characters = { p1: { ru: 'Кот', en: 'Cat' }, p2: { ru: 'Пёс', en: 'Dog' } };
  const tv = player('tv', { isTv: true });
  const snapshot = { phase: 'finished', characters, guessedPlayers: ['p1', 'p2'], guessPendingText: 'secret', guessPendingPlayerId: 'p1' };
  assert.deepEqual(sanitizeSnapshot('who-am-i', snapshot, tv).characters, characters);
  assert.equal(sanitizeSnapshot('who-am-i', snapshot, tv).guessPendingText, '');
  for (const phase of ['lobby', 'playing']) {
    assert.deepEqual(sanitizeSnapshot('who-am-i', { ...snapshot, phase }, tv).characters, {});
  }
  assert.deepEqual(sanitizeSnapshot('who-am-i', {
    ...snapshot, phase: 'playing', guessAwaitingJudge: true, guessJudgeId: 'p2',
  }, tv).characters, {});
  // Ending early must not expose characters that have not been guessed.
  assert.deepEqual(sanitizeSnapshot('who-am-i', { ...snapshot, guessedPlayers: ['p1'] }, tv).characters, { p1: characters.p1 });
  assert.deepEqual(snapshot.characters, characters);
});

test('server reducers retain quiz, who-am-i and mafia state for reconnect', () => {
  const quiz = reduceGameSnapshot('quiz', null, 'quiz:start-question', {
    questionIndex: 3, timeLeft: 20, question: { correctIndex: 1 },
  });
  assert.equal(quiz?.phase, 'question');
  assert.equal((quiz?.currentQuestion as Record<string, unknown>).correctIndex, 1);

  const who = reduceGameSnapshot('who-am-i', null, 'who-am-i', {
    type: 'start-game', characters: { p1: { ru: 'Кот', en: 'Cat' } }, turnOrder: ['p1'],
  });
  assert.equal(who?.phase, 'playing');
  assert.deepEqual(who?.turnOrder, ['p1']);

  const mafia = reduceGameSnapshot('mafia', null, 'mafia', {
    type: 'assign-roles', hostPlayerId: 'host', roles: { p1: 'doctor', p2: 'mafia', p3: 'citizen' },
  });
  assert.equal(mafia?.phase, 'role-reveal');
  assert.deepEqual(mafia?.alive, ['p1', 'p2', 'p3']);

  const mafiaWithTimer = reduceGameSnapshot('mafia', mafia, 'mafia', {
    type: 'day-timer', value: 37,
  });
  assert.equal(mafiaWithTimer?.dayTimer, 37);
});

test('server advances active timers while browsers are suspended', () => {
  const croc = advanceTimedSnapshot('crocodile', { phase: 'explaining', timeLeft: 42 }, 12);
  assert.equal(croc?.timeLeft, 30);

  const spy = advanceTimedSnapshot('spy', {
    phase: 'playing', timerRunning: true, timerLeft: 5,
    discussionTimerRunning: false, discussionTimeLeft: 120,
    voteTimerRunning: false, voteTimerLeft: 60,
  }, 8);
  assert.equal(spy?.phase, 'discussion');
  assert.equal(spy?.discussionTimeLeft, 117);

  const mafia = advanceTimedSnapshot('mafia', { phase: 'day', dayTimer: 60 }, 17);
  assert.equal(mafia?.dayTimer, 43);

  const h2o = advanceTimedSnapshot('hundred-to-one', {
    phase: 'bigGame', bgPhase: 3, bgTimeLeft: 20, bgTimerPaused: false,
  }, 7);
  assert.equal(h2o?.bgTimeLeft, 13);
});

test('crocodile state sync cannot rewind the timer during the same turn', () => {
  const current = {
    phase: 'explaining',
    turnNumber: 3,
    explainerId: 'p2',
    currentWordIndex: 7,
    timeLeft: 42,
  };
  const afterSwipe = reduceGameSnapshot('crocodile', current, 'croc:state', {
    ...current,
    currentWordIndex: 8,
    timeLeft: 60,
  });
  assert.equal(afterSwipe?.timeLeft, 42);

  const nextTurn = reduceGameSnapshot('crocodile', current, 'croc:state', {
    ...current,
    turnNumber: 4,
    explainerId: 'p3',
    phase: 'ready',
    timeLeft: 60,
  });
  assert.equal(nextTurn?.timeLeft, 60);
});

test('mafia actor validation enforces role, phase, life and action rules', () => {
  const snapshot = {
    phase: 'night', nightStage: 'doctor',
    roles: { doctor: 'doctor', mafia: 'mafia', citizen: 'citizen', dead: 'detective' },
    alive: ['doctor', 'mafia', 'citizen'], votes: {}, lastDoctorSave: 'citizen', lastLoverVisit: null,
    loverVisit: null,
  };
  assert.equal(validateMafiaActorAction(snapshot, 'doctor', {
    type: 'doctor-save', doctorId: 'doctor', targetId: 'mafia',
  }), true);
  assert.equal(validateMafiaActorAction(snapshot, 'mafia', {
    type: 'doctor-save', doctorId: 'mafia', targetId: 'citizen',
  }), false);
  assert.equal(validateMafiaActorAction(snapshot, 'doctor', {
    type: 'doctor-save', doctorId: 'doctor', targetId: 'doctor',
  }), false);
  assert.equal(validateMafiaActorAction(snapshot, 'doctor', {
    type: 'doctor-save', doctorId: 'doctor', targetId: 'citizen',
  }), false);
  assert.equal(validateMafiaActorAction(snapshot, 'dead', {
    type: 'detective-check', detectiveId: 'dead', targetId: 'mafia',
  }), false);
});

test('mafia host validation enforces legal phases, transitions and outcomes', () => {
  const night = {
    phase: 'night', nightStage: 'doctor', round: 1, hostPlayerId: 'host',
    roles: { mafia: 'mafia', doctor: 'doctor', citizen: 'citizen' },
    alive: ['mafia', 'doctor', 'citizen'], mafiaVotes: { mafia: 'citizen' },
    doctorSave: 'citizen', lastDoctorSave: null, loverVisit: null, maniacKill: null,
  };
  assert.equal(validateMafiaHostAction(night, { type: 'start-voting' }, ['host', 'mafia', 'doctor', 'citizen']), false);
  assert.equal(validateMafiaHostAction(night, {
    type: 'night-result', killedId: null, killedIds: [], saved: true, savedIds: ['citizen'],
    lastDoctorSave: 'citizen', lastLoverVisit: null,
  }, ['host', 'mafia', 'doctor', 'citizen']), true);
  assert.equal(validateMafiaHostAction(night, {
    type: 'night-result', killedId: 'doctor', killedIds: ['doctor'], saved: false, savedIds: [],
    lastDoctorSave: 'citizen', lastLoverVisit: null,
  }, ['host', 'mafia', 'doctor', 'citizen']), false);
});

test('mafia private view exposes only own/faction and publicly revealed roles', () => {
  const snapshot = {
    phase: 'night', winner: null,
    roles: { m1: 'mafia', don: 'don', doctor: 'doctor', citizen: 'citizen', dead: 'detective' },
    alive: ['m1', 'don', 'doctor', 'citizen'], lastNightKills: ['dead'],
    votes: { m1: 'doctor', doctor: 'm1' }, mafiaVotes: { m1: 'doctor', don: 'citizen' },
    doctorSave: 'citizen', detectiveCheck: null, detectiveResult: null,
    donCheck: null, donCheckResult: null, loverVisit: null, maniacKill: null, maniacActed: false,
  };
  const mafiaView = sanitizeSnapshot('mafia', snapshot, player('m1'));
  assert.deepEqual(mafiaView.roles, { m1: 'mafia', don: 'don', dead: 'detective' });
  assert.deepEqual(mafiaView.mafiaVotes, { m1: 'doctor', don: 'citizen' });
  assert.deepEqual(mafiaView.votes, { m1: 'doctor', doctor: '' });

  const citizenView = sanitizeSnapshot('mafia', snapshot, player('citizen'));
  assert.deepEqual(citizenView.roles, { citizen: 'citizen', dead: 'detective' });
  assert.deepEqual(citizenView.mafiaVotes, {});
  assert.deepEqual(citizenView.votes, { m1: '', doctor: '' });
});
