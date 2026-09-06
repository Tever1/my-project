import whoAmIFlow from '../lib/who-am-i-flow.ts';

const { getWhoAmINextTurnIndex } = whoAmIFlow;

export type GameSnapshot = Record<string, unknown>;

export interface GameRecipient {
  playerId: string | null;
  isTv: boolean;
  isGameHost: boolean;
  isMafiaHost: boolean;
}

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const numberValue = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const stringValue = (value: unknown): string => typeof value === 'string' ? value : '';

const cloneRecord = (value: unknown): UnknownRecord => structuredClone(record(value));

export function canUndoSpyDrawing(snapshotValue: GameSnapshot | null, payloadValue: unknown, actorId: string): boolean {
  const snapshot = record(snapshotValue);
  const payload = record(payloadValue);
  const strokes = Array.isArray(snapshot.drawStrokes) ? snapshot.drawStrokes : [];
  const lastStroke = record(strokes.at(-1));
  const gestureId = stringValue(lastStroke.gestureId);
  return Boolean(actorId) && snapshot.drawerId === actorId
    && snapshot.phase === 'playing' && snapshot.mode === 'draw'
    && strokes.length > 0 && Number.isInteger(payload.strokeCount)
    && numberValue(payload.strokeCount) > 0 && numberValue(payload.strokeCount) <= strokes.length
    && (payload.gestureId === undefined || typeof payload.gestureId === 'string')
    && stringValue(payload.gestureId) === gestureId
    // Tagged gestures tolerate their final segments still being in flight to the phone.
    && (Boolean(gestureId) || payload.strokeCount === strokes.length);
}

const normalizeSpyWord = (value: unknown): string =>
  stringValue(value).trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');

function finishSpyVoting(snapshot: UnknownRecord): void {
  const tally = new Map<string, number>();
  let totalVotes = 0;
  for (const suspect of Object.values(record(snapshot.votes))) {
    const id = stringValue(suspect);
    if (!id) continue;
    tally.set(id, (tally.get(id) ?? 0) + 1);
    totalVotes++;
  }
  let exposedId = '';
  let voteCount = 0;
  for (const [id, count] of tally) {
    if (count > voteCount) { exposedId = id; voteCount = count; }
  }
  Object.assign(snapshot, {
    phase: 'roundResult', voteTimerRunning: false,
    roundResult: { spyCaught: Boolean(exposedId) && exposedId === snapshot.spyId, exposedId, voteCount, totalVotes },
  });
}

function advanceSpyTurn(snapshot: UnknownRecord): UnknownRecord {
  const mode = stringValue(snapshot.mode);
  const playerOrder = strings(snapshot.playerOrder);
  if (mode === 'draw') {
    const nextIndex = playerOrder.length > 0
      ? (numberValue(snapshot.playerOrderIdx) + 1) % playerOrder.length
      : 0;
    return {
      playerOrderIdx: nextIndex,
      drawerId: playerOrder[nextIndex] ?? '',
    };
  }

  const players = Array.isArray(snapshot.players) ? snapshot.players.map(record) : [];
  const fallbackIndex = playerOrder.length > 0
    ? (numberValue(snapshot.playerOrderIdx) + 1) % playerOrder.length
    : 0;
  const nextAskerId = stringValue(snapshot.guessTargetId) || playerOrder[fallbackIndex] || '';
  let cycleAnswered = strings(snapshot.guessCycleAnswered);
  let candidates = players.filter((candidate) => {
    const id = stringValue(candidate.id);
    return id && id !== nextAskerId && !cycleAnswered.includes(id);
  });
  if (candidates.length === 0) {
    cycleAnswered = [];
    candidates = players.filter((candidate) => {
      const id = stringValue(candidate.id);
      return id && id !== nextAskerId;
    });
  }
  const targetId = stringValue(candidates[Math.floor(Math.random() * candidates.length)]?.id);
  return {
    guessAskerId: nextAskerId,
    guessTargetId: targetId,
    guessCycleAnswered: targetId ? [...cycleAnswered, targetId] : cycleAnswered,
  };
}

export function isRequestStateAction(action: string, payload: unknown): boolean {
  if (action.endsWith(':request-state')) return true;
  if (action !== 'mafia' && action !== 'who-am-i') return false;
  return record(payload).type === 'request-state';
}

export function isStateSyncAction(action: string, payload: unknown): boolean {
  if (['croc:state', 'croc:tick', 'alias:state', 'alias:tick', 'quiz:sync', 'spy:sync', 'h2o:sync'].includes(action)) {
    return true;
  }
  if (action !== 'mafia' && action !== 'who-am-i') return false;
  return record(payload).type === 'sync-state';
}

export function validateStateSyncPhase(
  gameType: string,
  currentValue: GameSnapshot | null,
  payloadValue: unknown,
): boolean {
  const current = record(currentValue);
  const payload = record(payloadValue);
  if (typeof payload.phase !== 'string') return true;

  const nextPhase = payload.phase;
  const currentPhase = stringValue(current.phase);
  const initialPhases: Record<string, string[]> = {
    crocodile: ['ready'],
    alias: ['modeSelect', 'teamSelect', 'individualSetup'],
    quiz: ['waiting'],
    spy: ['modeSelect', 'dealing'],
    'hundred-to-one': ['topicSelect', 'roleSelect'],
  };
  if (!currentPhase) return (initialPhases[gameType] ?? []).includes(nextPhase);
  if (nextPhase === currentPhase) return true;

  const transitions: Record<string, Record<string, string[]>> = {
    crocodile: {
      ready: ['explaining', 'finished'],
      explaining: ['ready', 'finished'],
      finished: ['ready'],
    },
    alias: {
      modeSelect: ['teamSelect', 'individualSetup'],
      teamSelect: ['teamName', 'modeSelect'],
      teamName: ['waiting', 'modeSelect'],
      individualSetup: ['letterRule', 'waiting', 'modeSelect'],
      letterRule: ['waiting', 'modeSelect'],
      waiting: ['explaining', 'modeSelect'],
      explaining: ['turnResult'],
      turnResult: ['waiting', 'finished', 'modeSelect'],
      finished: ['modeSelect', 'teamSelect', 'individualSetup'],
    },
    quiz: {
      waiting: ['countdown'],
      countdown: ['question'],
      question: ['mid-leaderboard', 'final'],
      'mid-leaderboard': ['countdown', 'final'],
      final: ['waiting'],
    },
    spy: {
      modeSelect: ['dealing'],
      dealing: ['playing', 'modeSelect'],
      playing: ['discussion', 'voting', 'spyGuess', 'roundResult', 'dealing'],
      discussion: ['voting', 'roundResult'],
      voting: ['roundResult', 'dealing'],
      spyGuess: ['roundResult'],
      roundResult: ['dealing', 'modeSelect'],
    },
    'hundred-to-one': {
      topicSelect: ['roleSelect'],
      roleSelect: ['captainSelect', 'topicSelect'],
      captainSelect: ['teamNames', 'topicSelect'],
      teamNames: ['title', 'topicSelect'],
      title: ['buzzer', 'topicSelect'],
      buzzer: ['playing', 'topicSelect'],
      playing: ['buzzer', 'results', 'r4rules', 'bigGame', 'final', 'topicSelect'],
      results: ['buzzer', 'r4rules', 'bigGame', 'final', 'topicSelect'],
      r4rules: ['playing', 'topicSelect'],
      bigGame: ['final', 'topicSelect'],
      final: ['topicSelect'],
    },
  };
  return (transitions[gameType]?.[currentPhase] ?? []).includes(nextPhase);
}

export function stateActionForGame(gameType: string, snapshot: GameSnapshot): { action: string; payload: unknown } | null {
  switch (gameType) {
    case 'crocodile': return { action: 'croc:state', payload: snapshot };
    case 'alias': return { action: 'alias:state', payload: snapshot };
    case 'quiz': return { action: 'quiz:sync', payload: snapshot };
    case 'spy': return { action: 'spy:sync', payload: snapshot };
    case 'hundred-to-one': return { action: 'h2o:sync', payload: snapshot };
    case 'mafia': return { action: 'mafia', payload: { type: 'sync-state', state: snapshot } };
    case 'who-am-i': return { action: 'who-am-i', payload: { type: 'sync-state', state: snapshot } };
    default: return null;
  }
}

export function actionMatchesGame(gameType: string | null, action: string): boolean {
  if (!gameType) return false;
  const expected: Record<string, string> = {
    crocodile: 'croc:',
    alias: 'alias:',
    quiz: 'quiz:',
    spy: 'spy:',
    'hundred-to-one': 'h2o:',
  };
  if (gameType === 'mafia') return action === 'mafia';
  if (gameType === 'who-am-i') return action === 'who-am-i';
  return action.startsWith(expected[gameType] ?? '__invalid__');
}

function getMafiaNightStages(snapshot: UnknownRecord): string[] {
  const roles = record(snapshot.roles) as Record<string, string>;
  const alive = strings(snapshot.alive);
  const aliveRoles = new Set(alive.map((id) => roles[id]));
  const stages = ['mafia', 'lover', 'maniac', 'doctor', 'detective', 'don'];
  return stages.filter((stage) => stage === 'mafia'
    ? alive.some((id) => roles[id] === 'mafia' || roles[id] === 'don')
    : aliveRoles.has(stage));
}

function initialMafiaSnapshot(): UnknownRecord {
  return {
    phase: 'lobby', hostPlayerId: null, nightStage: null, roles: {}, roleSeenIds: [], alive: [], eliminated: [],
    mafiaVotes: {}, maniacKill: null, maniacActed: false, donCheck: null, donCheckResult: null,
    loverVisit: null, detectiveCheck: null, detectiveResult: null, doctorSave: null,
    lastDoctorSave: null, lastLoverVisit: null, dayTimer: 60, votes: {}, votingRound: 1,
    votingCandidates: [], lastVoteResult: null, lastVoteTargetIds: [], lastNightKill: null,
    lastNightKills: [], lastNightSaved: false, winner: null, round: 1,
  };
}

function reduceMafiaSnapshot(current: GameSnapshot | null, payloadValue: unknown): GameSnapshot | null {
  const payload = record(payloadValue);
  const type = stringValue(payload.type);
  if (type === 'sync-state') return cloneRecord(payload.state);
  if (type === 'request-state') return current;

  const next = { ...initialMafiaSnapshot(), ...cloneRecord(current) };
  const roles = record(next.roles) as Record<string, string>;
  const alive = strings(next.alive);

  switch (type) {
    case 'select-host':
      next.hostPlayerId = payload.hostPlayerId ?? null;
      break;
    case 'assign-roles': {
      const assignedRoles = cloneRecord(payload.roles);
      Object.assign(next, {
        phase: 'role-reveal', hostPlayerId: payload.hostPlayerId ?? next.hostPlayerId,
        nightStage: null, roles: assignedRoles, roleSeenIds: [], alive: Object.keys(assignedRoles),
        eliminated: [], round: 1, votingRound: 1, votingCandidates: [], lastVoteResult: null,
        lastVoteTargetIds: [], winner: null,
      });
      break;
    }
    case 'role-seen': {
      const playerId = stringValue(payload.playerId);
      const seen = strings(next.roleSeenIds);
      next.roleSeenIds = seen.includes(playerId) ? seen : [...seen, playerId];
      break;
    }
    case 'start-night':
      Object.assign(next, {
        phase: 'night', nightStage: getMafiaNightStages(next)[0] ?? 'mafia', round: numberValue(payload.round, 1),
        mafiaVotes: {}, maniacKill: null, maniacActed: false, donCheck: null, donCheckResult: null,
        detectiveCheck: null, detectiveResult: null, loverVisit: null, doctorSave: null, votes: {},
        votingRound: 1, votingCandidates: [], lastVoteResult: null, lastVoteTargetIds: [],
      });
      break;
    case 'advance-night-stage': next.nightStage = payload.stage ?? null; break;
    case 'mafia-vote': next.mafiaVotes = { ...record(next.mafiaVotes), [stringValue(payload.voterId)]: payload.targetId }; break;
    case 'maniac-kill': next.maniacKill = payload.targetId ?? null; next.maniacActed = true; break;
    case 'don-check-sheriff': next.donCheck = payload.targetId ?? null; break;
    case 'don-check-result': next.donCheck = payload.targetId ?? next.donCheck; next.donCheckResult = payload.isDetective ?? null; break;
    case 'lover-visit': next.loverVisit = payload.targetId ?? null; break;
    case 'detective-check': next.detectiveCheck = payload.targetId ?? null; break;
    case 'detective-result': next.detectiveResult = payload.role ?? null; break;
    case 'doctor-save': next.doctorSave = payload.targetId ?? null; break;
    case 'cast-vote': next.votes = { ...record(next.votes), [stringValue(payload.voterId)]: payload.targetId }; break;
    case 'night-result': {
      const killedIds = strings(payload.killedIds).length > 0
        ? strings(payload.killedIds)
        : stringValue(payload.killedId) ? [stringValue(payload.killedId)] : [];
      const eliminated = Array.isArray(next.eliminated) ? [...next.eliminated] : [];
      for (const id of killedIds) eliminated.push({ id, role: roles[id] });
      Object.assign(next, {
        phase: 'day', nightStage: null, lastNightKill: payload.killedId ?? null, lastNightKills: killedIds,
        lastNightSaved: Boolean(payload.saved), lastDoctorSave: payload.lastDoctorSave ?? null,
        lastLoverVisit: payload.lastLoverVisit ?? null, alive: alive.filter((id) => !killedIds.includes(id)),
        eliminated, dayTimer: 60, votes: {}, votingRound: 1, votingCandidates: [],
        lastVoteResult: null, lastVoteTargetIds: [],
      });
      break;
    }
    case 'day-timer': next.dayTimer = Math.max(0, numberValue(payload.value)); break;
    case 'start-voting': Object.assign(next, { phase: 'voting', votes: {}, votingRound: 1, votingCandidates: [], lastVoteResult: null, lastVoteTargetIds: [] }); break;
    case 'vote-alibi': Object.assign(next, { phase: 'results', votes: {}, votingRound: 1, votingCandidates: [], lastVoteResult: 'alibi', lastVoteTargetIds: [payload.playerId] }); break;
    case 'vote-tie': Object.assign(next, { phase: 'voting', votes: {}, votingRound: payload.round, votingCandidates: payload.candidates, lastVoteResult: null, lastVoteTargetIds: payload.candidates }); break;
    case 'vote-pardoned': Object.assign(next, { phase: 'results', votes: {}, votingRound: 1, votingCandidates: [], lastVoteResult: 'pardoned', lastVoteTargetIds: payload.playerIds }); break;
    case 'eliminate': {
      const id = stringValue(payload.playerId);
      Object.assign(next, {
        phase: 'results', alive: alive.filter((playerId) => playerId !== id),
        eliminated: [...(Array.isArray(next.eliminated) ? next.eliminated : []), { id, role: roles[id] }],
        votes: {}, votingRound: 1, votingCandidates: [], lastVoteResult: 'eliminated', lastVoteTargetIds: [id],
      });
      break;
    }
    case 'eliminate-many': {
      const ids = strings(payload.playerIds);
      Object.assign(next, {
        phase: 'results', alive: alive.filter((id) => !ids.includes(id)),
        eliminated: [...(Array.isArray(next.eliminated) ? next.eliminated : []), ...ids.map((id) => ({ id, role: roles[id] }))],
        votes: {}, votingRound: 1, votingCandidates: [], lastVoteResult: 'eliminated', lastVoteTargetIds: ids,
      });
      break;
    }
    case 'game-over': next.winner = payload.winner ?? null; next.phase = 'results'; break;
    case 'end-game': return initialMafiaSnapshot();
  }
  return next;
}

function clearWhoGuess(): UnknownRecord {
  return { guessNeedsConfirm: false, guessAwaitingJudge: false, guessJudgeId: '', guessPendingPlayerId: '', guessPendingText: '' };
}

function nextWhoAmITurnIndex(snapshot: UnknownRecord): number {
  return getWhoAmINextTurnIndex({
    turnOrder: strings(snapshot.turnOrder),
    guessedPlayers: strings(snapshot.guessedPlayers),
    currentTurnIndex: numberValue(snapshot.currentTurnIndex),
  });
}

function reduceWhoAmISnapshot(current: GameSnapshot | null, payloadValue: unknown): GameSnapshot | null {
  const payload = record(payloadValue);
  const type = stringValue(payload.type);
  if (type === 'sync-state') {
    const state = cloneRecord(payload.state);
    delete state.scores;
    return state;
  }
  if (type === 'request-state') return current;
  const next = { ...cloneRecord(current) };
  delete next.scores;

  switch (type) {
    case 'start-game': {
      const turnOrder = strings(payload.turnOrder);
      return {
        phase: 'playing', characters: cloneRecord(payload.characters), currentTurnIndex: 0, turnOrder,
        guessedPlayers: [], questionsAsked: Object.fromEntries(turnOrder.map((id) => [id, 0])),
        consecutiveYesAnswers: 0, ...clearWhoGuess(),
      };
    }
    case 'next-turn':
      next.currentTurnIndex = nextWhoAmITurnIndex(next);
      next.consecutiveYesAnswers = 0;
      Object.assign(next, clearWhoGuess());
      break;
    case 'ask-question':
      next.questionsAsked = { ...record(next.questionsAsked), [stringValue(payload.playerId)]: numberValue(payload.questionsAsked) };
      next.consecutiveYesAnswers = numberValue(payload.consecutiveYesAnswers);
      break;
    case 'guess-try':
      Object.assign(next, { guessNeedsConfirm: true, guessAwaitingJudge: false, guessJudgeId: '', guessPendingPlayerId: payload.playerId, guessPendingText: payload.guess });
      break;
    case 'guess-confirm':
      Object.assign(next, { guessNeedsConfirm: false, guessAwaitingJudge: true, guessJudgeId: payload.judgeId, guessPendingPlayerId: payload.playerId });
      break;
    case 'guess': {
      // A resolved guess ends the turn, regardless of the judge's verdict.
      next.currentTurnIndex = nextWhoAmITurnIndex(next);
      next.consecutiveYesAnswers = 0;
      if (payload.correct) {
        const playerId = stringValue(payload.playerId);
        const guessed = strings(next.guessedPlayers);
        const newGuessed = guessed.includes(playerId) ? guessed : [...guessed, playerId];
        next.guessedPlayers = newGuessed;
        next.phase = newGuessed.length >= strings(next.turnOrder).length ? 'finished' : next.phase;
      }
      Object.assign(next, clearWhoGuess());
      break;
    }
    case 'end-game': next.phase = 'finished'; Object.assign(next, clearWhoGuess()); break;
  }
  return next;
}

export function reduceGameSnapshot(
  gameType: string,
  current: GameSnapshot | null,
  action: string,
  payloadValue: unknown,
): GameSnapshot | null {
  const payload = record(payloadValue);
  if (gameType === 'mafia') return reduceMafiaSnapshot(current, payload);
  if (gameType === 'who-am-i') return reduceWhoAmISnapshot(current, payload);
  if (isRequestStateAction(action, payload)) return current;

  if (action === 'croc:state' || action === 'alias:state') {
    const next = cloneRecord(payload);
    if (numberValue(next.currentWordIndex, -1) < 0 && numberValue(current?.currentWordIndex, -1) >= 0) {
      next.currentWordIndex = current?.currentWordIndex;
    }
    const isSameCrocodileTurn = action === 'croc:state'
      && current?.phase === 'explaining'
      && next.phase === 'explaining'
      && numberValue(current.turnNumber) === numberValue(next.turnNumber)
      && stringValue(current.explainerId) === stringValue(next.explainerId);
    const isSameAliasTurn = action === 'alias:state'
      && current?.phase === 'explaining'
      && next.phase === 'explaining'
      && numberValue(current.round) === numberValue(next.round)
      && numberValue(current.activeTeamIndex) === numberValue(next.activeTeamIndex)
      && activeAliasExplainer(record(current)) === activeAliasExplainer(next);
    if (isSameCrocodileTurn || isSameAliasTurn) {
      next.timeLeft = Math.min(numberValue(current?.timeLeft), numberValue(next.timeLeft));
    }
    return next;
  }
  if (action === 'alias:select-mode') return { ...cloneRecord(current), mode: payload.mode };
  if (action === 'croc:tick' || action === 'alias:tick') {
    const previous = cloneRecord(current);
    return { ...previous, timeLeft: Math.min(numberValue(previous.timeLeft), numberValue(payload.timeLeft)) };
  }
  if (action === 'spy:sync' || action === 'h2o:sync' || action === 'quiz:sync') {
    const previous = cloneRecord(current);
    const next = { ...previous, ...cloneRecord(payload) };
    const timerKeys = action === 'spy:sync'
      ? []
      : action === 'h2o:sync'
        ? []
        : ['timeLeft', 'countdownValue'];
    timerKeys.forEach((key) => {
      if (typeof previous[key] === 'number' && typeof payload[key] === 'number' && numberValue(payload[key]) > numberValue(previous[key])) {
        next[key] = previous[key];
      }
    });
    if (action === 'spy:sync') {
      const spyTimers: Array<[string, string]> = [
        ['timerLeft', 'timerRunning'],
        ['discussionTimeLeft', 'discussionTimerRunning'],
        ['voteTimerLeft', 'voteTimerRunning'],
      ];
      spyTimers.forEach(([timeKey, runningKey]) => {
        if (previous[runningKey] && typeof payload[timeKey] === 'number'
          && numberValue(payload[timeKey]) > numberValue(previous[timeKey])) {
          next[timeKey] = previous[timeKey];
        }
      });
      if (next.phase === 'voting' && numberValue(next.voteTimerLeft) <= 0) finishSpyVoting(next);
    }
    if (action === 'h2o:sync') {
      const sameAnsweringTurn = previous.phase === 'bigGame' && next.phase === 'bigGame'
        && (previous.bgPhase === 1 || previous.bgPhase === 3)
        && next.bgPhase === previous.bgPhase;
      if (sameAnsweringTurn) {
        const answerKey = previous.bgPhase === 1 ? 'bgP1Ans' : 'bgP2Ans';
        const answers = Array.isArray(previous[answerKey]) ? previous[answerKey] : [];
        const incoming = payload[answerKey];
        // A delayed submission must not undo accepted answers, cursor or pause state.
        if ((typeof payload.bgCurQ === 'number' && payload.bgCurQ < numberValue(previous.bgCurQ))
          || (Array.isArray(incoming) && (incoming.length < answers.length
            || answers.some((answer, index) => incoming[index] !== answer)))) return previous;
      }
      if (typeof previous.r4Time === 'number' && typeof payload.r4Time === 'number'
        && next.phase === previous.phase) {
        next.r4Time = previous.r4Time;
      }
      if (payload.r4Reset === true) {
        next.r4Time = 60;
        next.r4Running = false;
      }
      delete next.r4Reset;
      if (numberValue(next.r4Time) <= 0) next.r4Running = false;
      if ((previous.bgPhase === 1 || previous.bgPhase === 3)
        && (payload.bgPhase === undefined || payload.bgPhase === previous.bgPhase)
        && typeof payload.bgTimeLeft === 'number' && payload.bgTimeLeft !== 0) {
        next.bgTimeLeft = previous.bgTimeLeft;
      }
      if (numberValue(previous.buzzerCountdown) > 0 && typeof payload.buzzerCountdown === 'number'
        && numberValue(payload.buzzerCountdown) > numberValue(previous.buzzerCountdown)) {
        next.buzzerCountdown = previous.buzzerCountdown;
      }
    }
    return next;
  }

  const next = { ...cloneRecord(current) };
  if (gameType === 'quiz') {
    switch (action) {
      case 'quiz:config': Object.assign(next, payload); break;
      case 'quiz:answer': next.answers = { ...record(next.answers), [stringValue(payload.playerId)]: payload.answerIndex }; break;
      case 'quiz:timer': next.timeLeft = Math.min(numberValue(next.timeLeft), numberValue(payload.timeLeft)); break;
      case 'quiz:show-results': Object.assign(next, { showCorrect: true, scores: payload.scores, correctPlayers: payload.correctPlayers }); break;
      case 'quiz:countdown': Object.assign(next, {
        phase: 'countdown',
        countdownValue: next.phase === 'countdown'
          ? Math.min(numberValue(next.countdownValue), numberValue(payload.value))
          : payload.value,
        questionIndex: typeof payload.questionIndex === 'number' ? payload.questionIndex : next.questionIndex,
      }); break;
      case 'quiz:start-question': Object.assign(next, { phase: 'question', questionIndex: payload.questionIndex, timeLeft: payload.timeLeft, currentQuestion: payload.question, answers: {}, showCorrect: false, correctPlayers: [] }); break;
      case 'quiz:final': next.phase = 'final'; break;
    }
  }
  if (gameType === 'spy') {
    if (action === 'spy:pass-turn') Object.assign(next, advanceSpyTurn(next));
    if (action === 'spy:guess-start') {
      Object.assign(next, {
        phase: 'spyGuess',
        timerRunning: false,
        spyGuessText: '',
        spyGuessNeedsConfirm: false,
        spyGuessAwaitingJudge: false,
        spyGuessJudgeId: '',
      });
    }
    if (action === 'spy:guess-try') {
      const correct = normalizeSpyWord(payload.text) === normalizeSpyWord(next.word);
      Object.assign(next, {
        phase: 'roundResult',
        timerRunning: false,
        spyGuessText: payload.text,
        spyGuessNeedsConfirm: false,
        spyGuessAwaitingJudge: false,
        spyGuessJudgeId: '',
        roundResult: {
          spyCaught: !correct,
          exposedId: next.spyId,
          voteCount: 0,
          viaGuess: true,
          guessedRight: correct,
        },
      });
    }
    if (action === 'spy:ready') {
      const ready = strings(next.readyPlayers);
      const playerId = stringValue(payload.playerId);
      next.readyPlayers = ready.includes(playerId) ? ready : [...ready, playerId];
    }
    if (action === 'spy:vote' && next.phase === 'voting') {
      next.votes = { ...record(next.votes), [stringValue(payload.voterId)]: payload.suspectId };
      const players = Array.isArray(next.players) ? next.players.map(record) : [];
      if (players.length > 0 && players.every((player) => Object.hasOwn(record(next.votes), stringValue(player.id)))) {
        finishSpyVoting(next);
      }
    }
    if (action === 'spy:stroke') {
      const strokes = Array.isArray(next.drawStrokes) ? next.drawStrokes : [];
      next.drawStrokes = [...strokes, cloneRecord(payload)].slice(-20000);
    }
    if (action === 'spy:clear') next.drawStrokes = [];
    if (action === 'spy:undo' && canUndoSpyDrawing(next, payload, stringValue(next.drawerId))) {
      const strokes = next.drawStrokes as unknown[];
      const gestureId = stringValue(record(strokes.at(-1)).gestureId);
      let start = strokes.length - 1;
      while (gestureId && start > 0 && stringValue(record(strokes[start - 1]).gestureId) === gestureId) start--;
      next.drawStrokes = strokes.slice(0, start);
    }
  }
  return next;
}

export function advanceTimedSnapshot(
  gameType: string,
  snapshotValue: GameSnapshot | null,
  elapsedSeconds: number,
): GameSnapshot | null {
  if (!snapshotValue || elapsedSeconds <= 0) return snapshotValue;
  const next = cloneRecord(snapshotValue);
  const subtract = (key: string, seconds: number) => {
    next[key] = Math.max(0, numberValue(next[key]) - seconds);
  };

  if ((gameType === 'crocodile' || gameType === 'alias') && next.phase === 'explaining') {
    subtract('timeLeft', elapsedSeconds);
    return next;
  }

  if (gameType === 'quiz') {
    if (next.phase === 'countdown') {
      const remaining = numberValue(next.countdownValue);
      if (elapsedSeconds < remaining) {
        next.countdownValue = remaining - elapsedSeconds;
        return next;
      }
      const queue = Array.isArray(next.questionQueue) ? next.questionQueue.map(record) : [];
      const question = queue[numberValue(next.questionIndex)];
      if (question) {
        Object.assign(next, {
          phase: 'question',
          countdownValue: 0,
          timeLeft: numberValue(question.timeLimit, 20),
          currentQuestion: {
            questionRu: question.questionRu,
            questionEn: question.questionEn,
            options: question.options,
            correctIndex: question.correctIndex,
          },
          answers: {},
          showCorrect: false,
          correctPlayers: [],
        });
        elapsedSeconds -= remaining;
      }
    }
    if (next.phase === 'question' && !next.showCorrect) {
      const remaining = numberValue(next.timeLeft);
      if (elapsedSeconds < remaining) {
        next.timeLeft = remaining - elapsedSeconds;
      } else {
        const question = record(next.currentQuestion);
        const answers = record(next.answers);
        const scores = record(next.scores) as Record<string, number>;
        const correctPlayers = Object.entries(answers)
          .filter(([, answer]) => answer === question.correctIndex)
          .map(([id]) => id);
        next.timeLeft = 0;
        next.showCorrect = true;
        next.correctPlayers = correctPlayers;
        next.scores = { ...scores };
        correctPlayers.forEach((id) => { (next.scores as Record<string, number>)[id] = numberValue(scores[id]) + 1; });
      }
    }
    return next;
  }

  if (gameType === 'spy') {
    let remainingElapsed = elapsedSeconds;
    if (next.timerRunning && next.phase === 'playing') {
      const timerLeft = numberValue(next.timerLeft);
      if (remainingElapsed < timerLeft) {
        next.timerLeft = timerLeft - remainingElapsed;
        return next;
      }
      remainingElapsed -= timerLeft;
      Object.assign(next, {
        timerLeft: 0, timerRunning: false, phase: 'discussion',
        discussionTimeLeft: 120, discussionTimerRunning: true,
      });
    }
    if (next.discussionTimerRunning && next.phase === 'discussion') {
      const timerLeft = numberValue(next.discussionTimeLeft);
      if (remainingElapsed < timerLeft) {
        next.discussionTimeLeft = timerLeft - remainingElapsed;
        return next;
      }
      remainingElapsed -= timerLeft;
      Object.assign(next, {
        discussionTimeLeft: 0, discussionTimerRunning: false, phase: 'voting',
        votes: {}, voteTimerLeft: 60, voteTimerRunning: true,
      });
    }
    if (next.voteTimerRunning && next.phase === 'voting') {
      next.voteTimerLeft = Math.max(0, numberValue(next.voteTimerLeft) - remainingElapsed);
    }
    if (next.phase === 'voting' && numberValue(next.voteTimerLeft) <= 0) finishSpyVoting(next);
    return next;
  }

  if (gameType === 'mafia' && next.phase === 'day') {
    subtract('dayTimer', elapsedSeconds);
    return next;
  }

  if (gameType === 'hundred-to-one') {
    if (next.phase === 'buzzer' && numberValue(next.buzzerCountdown) > 0) {
      next.buzzerCountdown = Math.max(0, numberValue(next.buzzerCountdown) - elapsedSeconds);
      if (next.buzzerCountdown === 0) next.buzzerActive = true;
    }
    if (next.phase === 'playing' && next.r4Running) {
      subtract('r4Time', elapsedSeconds);
      if (next.r4Time === 0) next.r4Running = false;
    }
    if (next.phase === 'bigGame' && (next.bgPhase === 1 || next.bgPhase === 3) && !next.bgTimerPaused && !next.bgAwaitingReady) {
      subtract('bgTimeLeft', elapsedSeconds);
      if (next.bgTimeLeft === 0) {
        const key = next.bgPhase === 1 ? 'bgP1Ans' : 'bgP2Ans';
        const answers = Array.isArray(next[key]) ? [...next[key]] : [];
        while (answers.length < 5) answers.push('—');
        next[key] = answers;
        next.bgCurQ = 5;
      }
    }
    return next;
  }

  return next;
}

function activeAliasExplainer(snapshot: UnknownRecord): string | null {
  const teams = Array.isArray(snapshot.teams) ? snapshot.teams.map(record) : [];
  const activeTeamIndex = numberValue(snapshot.activeTeamIndex);
  const team = teams[activeTeamIndex];
  if (!team) return null;
  const playerIds = strings(team.playerIds);
  const indices = Array.isArray(snapshot.explainerIndices) ? snapshot.explainerIndices : [];
  const index = numberValue(indices[activeTeamIndex], numberValue(snapshot.explainerIndex));
  return playerIds.length > 0 ? playerIds[index % playerIds.length] ?? null : null;
}

function sanitizeMafia(snapshotValue: GameSnapshot, recipient: GameRecipient): GameSnapshot {
  const snapshot = cloneRecord(snapshotValue);
  snapshot.abilityBlocked = Boolean(recipient.playerId && snapshot.phase === 'night'
    && strings(snapshot.alive).includes(recipient.playerId)
    && snapshot.loverVisit === recipient.playerId);
  if (recipient.isMafiaHost || recipient.isGameHost && snapshot.phase === 'lobby') return snapshot;
  const roles = record(snapshot.roles) as Record<string, string>;
  const myRole = recipient.playerId ? roles[recipient.playerId] : undefined;
  const revealAll = Boolean(snapshot.winner);
  const visibleRoleIds = new Set<string>();
  if (recipient.playerId) visibleRoleIds.add(recipient.playerId);
  if (myRole === 'mafia' || myRole === 'don') {
    Object.entries(roles).forEach(([id, role]) => {
      if (role === 'mafia' || role === 'don') visibleRoleIds.add(id);
    });
  }
  strings(snapshot.lastNightKills).forEach((id) => visibleRoleIds.add(id));
  if (revealAll) Object.keys(roles).forEach((id) => visibleRoleIds.add(id));
  snapshot.roles = Object.fromEntries(Object.entries(roles).filter(([id]) => visibleRoleIds.has(id)));
  if (Array.isArray(snapshot.eliminated)) {
    snapshot.eliminated = snapshot.eliminated.map((entryValue) => {
      const entry = cloneRecord(entryValue);
      if (!visibleRoleIds.has(stringValue(entry.id))) delete entry.role;
      return entry;
    });
  }

  const votes = record(snapshot.votes);
  snapshot.votes = Object.fromEntries(Object.entries(votes).map(([id, targetId]) => [
    id,
    id === recipient.playerId ? targetId : '',
  ]));
  const mafiaVotes = record(snapshot.mafiaVotes);
  snapshot.mafiaVotes = myRole === 'mafia' || myRole === 'don'
    ? mafiaVotes
    : {};
  if (myRole !== 'doctor') { snapshot.doctorSave = null; snapshot.lastDoctorSave = null; }
  if (myRole !== 'detective') { snapshot.detectiveCheck = null; snapshot.detectiveResult = null; }
  if (myRole !== 'don') { snapshot.donCheck = null; snapshot.donCheckResult = null; }
  if (myRole !== 'lover') { snapshot.loverVisit = null; snapshot.lastLoverVisit = null; }
  if (myRole !== 'maniac') { snapshot.maniacKill = null; snapshot.maniacActed = false; }
  return snapshot;
}

function sanitizeWhoAmI(snapshotValue: GameSnapshot, recipient: GameRecipient): GameSnapshot {
  const snapshot = cloneRecord(snapshotValue);
  delete snapshot.scores;
  const characters = record(snapshot.characters);
  const guessedPlayers = new Set(strings(snapshot.guessedPlayers));
  const canSeeOwnCharacter = recipient.playerId !== null
    && (guessedPlayers.has(recipient.playerId) || snapshot.phase === 'finished');
  snapshot.characters = recipient.isTv
    ? Object.fromEntries(Object.entries(characters).filter(([id]) => (
      snapshot.phase === 'finished' && guessedPlayers.has(id)
    )))
    : Object.fromEntries(Object.entries(characters).filter(([id]) => (
      id !== recipient.playerId || canSeeOwnCharacter
    )));
  const canSeePending = recipient.playerId !== null && (
    recipient.playerId === snapshot.guessPendingPlayerId || recipient.playerId === snapshot.guessJudgeId
  );
  if (!canSeePending) snapshot.guessPendingText = '';
  return snapshot;
}

export function sanitizeSnapshot(gameType: string, snapshotValue: GameSnapshot, recipient: GameRecipient): GameSnapshot {
  const snapshot = cloneRecord(snapshotValue);
  if (gameType === 'mafia') return sanitizeMafia(snapshot, recipient);
  if (gameType === 'who-am-i') return sanitizeWhoAmI(snapshot, recipient);
  if (gameType === 'quiz' && recipient.isGameHost) return snapshot;

  if (gameType === 'crocodile') {
    if (recipient.playerId !== snapshot.explainerId) {
      snapshot.currentWordIndex = -1;
      snapshot.usedWordIndices = [];
    }
  }
  if (gameType === 'alias' && recipient.playerId !== activeAliasExplainer(snapshot)) {
    snapshot.currentWordIndex = -1;
    snapshot.usedWordIndices = [];
    if (snapshot.phase === 'explaining') snapshot.turnHistory = [];
  }
  if (gameType === 'quiz') {
    delete snapshot.questionQueue;
    const showCorrect = Boolean(snapshot.showCorrect);
    if (snapshot.currentQuestion) {
      const question = cloneRecord(snapshot.currentQuestion);
      if (!showCorrect) question.correctIndex = -1;
      snapshot.currentQuestion = question;
    }
    const answers = record(snapshot.answers);
    snapshot.answers = Object.fromEntries(Object.entries(answers).map(([id, answer]) => [
      id,
      id === recipient.playerId ? answer : -1,
    ]));
    if (!showCorrect) snapshot.correctPlayers = [];
  }
  if (gameType === 'spy') {
    const revealResult = stringValue(snapshot.phase) === 'roundResult' || Boolean(snapshot.gameOver);
    const isSpy = recipient.playerId !== null && recipient.playerId === snapshot.spyId;
    if (!revealResult && (recipient.isTv || isSpy)) snapshot.word = '';
    if (!recipient.isGameHost && !revealResult && !isSpy) snapshot.spyId = '';
    const votes = record(snapshot.votes);
    if (!recipient.isGameHost) {
      snapshot.votes = Object.fromEntries(Object.entries(votes).map(([id, targetId]) => [
        id,
        !recipient.isTv && id === recipient.playerId ? targetId : '',
      ]));
    }
    const canSeeGuess = isSpy || recipient.playerId === snapshot.spyGuessJudgeId;
    if (!recipient.isGameHost && !canSeeGuess) snapshot.spyGuessText = '';
  }
  if (gameType === 'hundred-to-one') {
    const phase = numberValue(snapshot.bgPhase);
    if (!recipient.isGameHost && phase >= 1 && phase <= 3) {
      const canSeeP1 = recipient.playerId === snapshot.bgP1Id;
      const canSeeP2 = phase === 3 && recipient.playerId === snapshot.bgP2Id;
      if (!canSeeP1) {
        snapshot.bgP1Ans = [];
        snapshot.bgP1Matched = [];
      }
      if (!canSeeP2) {
        snapshot.bgP2Ans = [];
        snapshot.bgP2Matched = [];
      }
    }
  }
  return snapshot;
}

export function normalizeWhoAmIGuess(snapshotValue: GameSnapshot | null, payloadValue: unknown): UnknownRecord {
  const payload = cloneRecord(payloadValue);
  if (!snapshotValue) return payload;
  const snapshot = record(snapshotValue);
  if (payload.type === 'ask-question') {
    const playerId = stringValue(payload.playerId);
    const questions = record(snapshot.questionsAsked);
    const currentStreak = numberValue(snapshot.consecutiveYesAnswers);
    return {
      ...payload,
      questionsAsked: numberValue(questions[playerId]) + 1,
      consecutiveYesAnswers: payload.answer === 'yes' ? currentStreak + 1 : currentStreak,
    };
  }
  if (payload.type !== 'guess-try') return payload;
  const playerId = stringValue(payload.playerId);
  const character = record(record(snapshot.characters)[playerId]);
  const guess = stringValue(payload.guess).trim().toLowerCase();
  const correct = guess.length > 0 && [character.ru, character.en]
    .some((value) => stringValue(value).trim().toLowerCase() === guess);
  return correct ? { type: 'guess', playerId, guess: payload.guess, correct: true } : payload;
}

export function validateMafiaActorAction(snapshotValue: GameSnapshot | null, senderId: string, payloadValue: unknown): boolean {
  if (!snapshotValue) return false;
  const snapshot = record(snapshotValue);
  const payload = record(payloadValue);
  const type = stringValue(payload.type);
  const roles = record(snapshot.roles) as Record<string, string>;
  const alive = strings(snapshot.alive);
  const role = roles[senderId];
  const isAlive = alive.includes(senderId);
  const phase = stringValue(snapshot.phase);
  const stage = stringValue(snapshot.nightStage);
  const blocked = snapshot.loverVisit === senderId;
  const targetId = stringValue(payload.targetId);
  const targetAlive = alive.includes(targetId);

  if (type === 'role-seen') return payload.playerId === senderId && phase === 'role-reveal' && Boolean(role);
  if (type === 'cast-vote') {
    const votes = record(snapshot.votes);
    if (payload.voterId !== senderId || phase !== 'voting' || !isAlive || Object.hasOwn(votes, senderId)) return false;
    if (numberValue(snapshot.votingRound, 1) === 3) return targetId === 'execute' || targetId === 'pardon';
    const candidates = strings(snapshot.votingCandidates);
    return targetAlive && (candidates.length === 0 || candidates.includes(targetId));
  }
  if (!isAlive || phase !== 'night') return false;
  if (type === 'mafia-vote') {
    return payload.voterId === senderId && stage === 'mafia' && (role === 'mafia' || role === 'don')
      && targetAlive && roles[targetId] !== 'mafia' && roles[targetId] !== 'don';
  }
  if (blocked) return false;
  if (type === 'maniac-kill') return payload.maniacId === senderId && stage === 'maniac' && role === 'maniac' && (!targetId || targetAlive && targetId !== senderId);
  if (type === 'don-check-sheriff') return payload.donId === senderId && stage === 'don' && role === 'don' && Boolean(roles[targetId]) && targetId !== senderId;
  if (type === 'lover-visit') return payload.loverId === senderId && stage === 'lover' && role === 'lover' && targetAlive && targetId !== senderId && targetId !== snapshot.lastLoverVisit;
  if (type === 'detective-check') return !snapshot.detectiveCheck && payload.detectiveId === senderId && stage === 'detective' && role === 'detective' && targetAlive && targetId !== senderId;
  if (type === 'doctor-save') return !snapshot.doctorSave && payload.doctorId === senderId && stage === 'doctor' && role === 'doctor' && targetAlive && targetId !== senderId && targetId !== snapshot.lastDoctorSave;
  return false;
}

function sameStringSet(leftValue: unknown, rightValue: unknown): boolean {
  const left = [...new Set(strings(leftValue))].sort();
  const right = [...new Set(strings(rightValue))].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function mafiaWinner(alive: string[], roles: Record<string, string>): string | null {
  if (alive.length === 1 && roles[alive[0]] === 'maniac') return 'maniac';
  const mafiaCount = alive.filter((id) => roles[id] === 'mafia' || roles[id] === 'don').length;
  const maniacCount = alive.filter((id) => roles[id] === 'maniac').length;
  if (mafiaCount === 0 && maniacCount === 0) return 'citizens';
  if (mafiaCount >= alive.length - mafiaCount) return 'mafia';
  return null;
}

function topVoteIds(votesValue: unknown): string[] {
  const counts: Record<string, number> = {};
  Object.values(record(votesValue)).forEach((target) => {
    const id = stringValue(target);
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  });
  const max = Math.max(0, ...Object.values(counts));
  return Object.entries(counts).filter(([, count]) => count === max).map(([id]) => id);
}

function expectedMafiaNightResult(snapshot: UnknownRecord): { killedIds: string[]; savedIds: string[]; doctorSave: string | null } {
  const roles = record(snapshot.roles) as Record<string, string>;
  const alive = strings(snapshot.alive);
  const aliveSet = new Set(alive);
  const roleId = (role: string) => Object.entries(roles).find(([id, value]) => value === role && aliveSet.has(id))?.[0];
  const loverId = roleId('lover');
  const doctorId = roleId('doctor');
  const donId = roleId('don');
  const maniacId = roleId('maniac');
  const blockedId = loverId ? stringValue(snapshot.loverVisit) : '';
  const killed = new Set<string>();
  const saved = new Set<string>();
  const mafiaVotes = record(snapshot.mafiaVotes);
  const donVote = donId ? stringValue(mafiaVotes[donId]) : '';
  const regularVotes = Object.fromEntries(Object.entries(mafiaVotes).filter(([id]) => id !== donId));
  const mafiaTarget = donVote || topVoteIds(regularVotes)[0] || '';
  if (mafiaTarget && aliveSet.has(mafiaTarget)) killed.add(mafiaTarget);
  const maniacKill = stringValue(snapshot.maniacKill);
  if (maniacId && blockedId !== maniacId && aliveSet.has(maniacKill)) killed.add(maniacKill);
  const doctorSave = doctorId && blockedId !== doctorId
    && stringValue(snapshot.doctorSave) !== doctorId
    && snapshot.doctorSave !== snapshot.lastDoctorSave
    ? stringValue(snapshot.doctorSave)
    : '';
  if (doctorSave && killed.delete(doctorSave)) saved.add(doctorSave);
  if (loverId && killed.has(loverId) && aliveSet.has(blockedId)) killed.add(blockedId);
  return { killedIds: [...killed], savedIds: [...saved], doctorSave: doctorSave || null };
}

export function validateMafiaHostAction(
  snapshotValue: GameSnapshot | null,
  payloadValue: unknown,
  validPlayerIds: string[],
): boolean {
  const snapshot = record(snapshotValue);
  const payload = record(payloadValue);
  const type = stringValue(payload.type);
  const phase = stringValue(snapshot.phase) || 'lobby';
  const roles = record(snapshot.roles) as Record<string, string>;
  const alive = strings(snapshot.alive);
  const aliveSet = new Set(alive);
  const validIds = new Set(validPlayerIds);

  if (type === 'assign-roles') {
    const assigned = record(payload.roles) as Record<string, string>;
    const allowedRoles = new Set(['citizen', 'mafia', 'don', 'maniac', 'detective', 'doctor', 'lover']);
    return phase === 'lobby' && payload.hostPlayerId === snapshot.hostPlayerId
      && Object.keys(assigned).length > 0
      && Object.entries(assigned).every(([id, role]) => validIds.has(id) && id !== snapshot.hostPlayerId && allowedRoles.has(role));
  }
  if (type === 'start-night') {
    const expectedRound = phase === 'role-reveal' ? 1 : numberValue(snapshot.round, 1) + 1;
    return (phase === 'role-reveal' || phase === 'results') && payload.round === expectedRound && !snapshot.winner;
  }
  if (type === 'advance-night-stage') {
    const stages = getMafiaNightStages(snapshot);
    const currentIndex = stages.indexOf(stringValue(snapshot.nightStage));
    return phase === 'night' && currentIndex >= 0 && payload.stage === stages[currentIndex + 1];
  }
  if (type === 'detective-result') {
    const detectiveId = stringValue(payload.detectiveId);
    const stages = getMafiaNightStages(snapshot);
    return phase === 'night' && stages.indexOf(stringValue(snapshot.nightStage)) >= stages.indexOf('detective')
      && roles[detectiveId] === 'detective' && aliveSet.has(detectiveId)
      && payload.role === roles[stringValue(snapshot.detectiveCheck)];
  }
  if (type === 'don-check-result') {
    const donId = stringValue(payload.donId);
    const targetId = stringValue(snapshot.donCheck);
    return phase === 'night' && snapshot.nightStage === 'don'
      && roles[donId] === 'don' && aliveSet.has(donId)
      && payload.targetId === targetId && payload.isDetective === (roles[targetId] === 'detective');
  }
  if (type === 'night-result') {
    const expected = expectedMafiaNightResult(snapshot);
    return phase === 'night' && sameStringSet(payload.killedIds, expected.killedIds)
      && sameStringSet(payload.savedIds, expected.savedIds)
      && payload.killedId === (expected.killedIds[0] ?? null)
      && payload.saved === (expected.savedIds.length > 0)
      && payload.lastDoctorSave === expected.doctorSave
      && payload.lastLoverVisit === (snapshot.loverVisit ?? null);
  }
  if (type === 'start-voting') return phase === 'day';
  if (type === 'day-timer') {
    return phase === 'day' && typeof payload.value === 'number'
      && payload.value >= 0 && payload.value <= numberValue(snapshot.dayTimer, 60);
  }
  if (type === 'vote-alibi') {
    return phase === 'voting' && aliveSet.has(stringValue(payload.playerId))
      && payload.playerId === snapshot.lastLoverVisit && topVoteIds(snapshot.votes).includes(stringValue(payload.playerId));
  }
  if (type === 'vote-tie') {
    const candidates = topVoteIds(snapshot.votes).filter((id) => aliveSet.has(id));
    return phase === 'voting' && numberValue(snapshot.votingRound, 1) < 3
      && payload.round === numberValue(snapshot.votingRound, 1) + 1
      && sameStringSet(payload.candidates, candidates) && candidates.length > 1;
  }
  if (type === 'vote-pardoned') {
    const votes = record(snapshot.votes);
    const execute = Object.values(votes).filter((value) => value === 'execute').length;
    const pardon = Object.values(votes).filter((value) => value === 'pardon').length;
    return phase === 'voting' && snapshot.votingRound === 3 && execute <= pardon
      && sameStringSet(payload.playerIds, snapshot.votingCandidates);
  }
  if (type === 'eliminate' || type === 'eliminate-many') {
    const ids = type === 'eliminate' ? [stringValue(payload.playerId)] : strings(payload.playerIds);
    const expected = snapshot.votingRound === 3
      ? strings(snapshot.votingCandidates).filter((id) => id !== snapshot.lastLoverVisit)
      : topVoteIds(snapshot.votes).filter((id) => aliveSet.has(id) && id !== snapshot.lastLoverVisit);
    return phase === 'voting' && ids.length > 0 && sameStringSet(ids, expected)
      && ids.every((id) => aliveSet.has(id));
  }
  if (type === 'game-over') return (phase === 'day' || phase === 'results') && payload.winner === mafiaWinner(alive, roles);
  if (type === 'end-game') return true;
  return false;
}
