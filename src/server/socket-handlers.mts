import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import playerName from '../lib/player-name.ts';
import whoAmIFlow from '../lib/who-am-i-flow.ts';
import {
  actionMatchesGame,
  advanceTimedSnapshot,
  canUndoSpyDrawing,
  isRequestStateAction,
  isStateSyncAction,
  normalizeWhoAmIGuess,
  reduceGameSnapshot,
  sanitizeSnapshot,
  stateActionForGame,
  validateMafiaActorAction,
  validateMafiaHostAction,
  validateStateSyncPhase,
  type GameRecipient,
} from './game-security.mts';

interface Player {
  id: string;
  socketId: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  isAway: boolean;
  role: 'tv' | 'player';
  reconnectToken: string;
  team?: string;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

interface Room {
  id: string;
  code: string;
  ownerId: string;
  hostId: string;
  players: Map<string, Player>;
  maxPlayers: number;
  status: 'lobby' | 'in-game' | 'finished';
  currentGame: string | null;
  gameState: Record<string, unknown> | null;
  gameStateUpdatedAt: number;
  spyVotingTimeout?: ReturnType<typeof setTimeout>;
  spyVotingDeadline?: number;
  tvSocketId: string | null;
  createdAt: number;
  kickedPlayerIds: Set<string>;
  gameHostPlayerId: string | null;
  mafiaHostPlayerId: string | null;
  showQrCode: boolean;
  locale: 'ru' | 'en';
  inactivityTimer?: ReturnType<typeof setTimeout>;
  pendingQuizConfig?: {
    mode: 'general' | 'special';
    difficulty: string;
    topic: string;
    specialQuizId: string | null;
  } | null;
}

const rooms = new Map<string, Room>();
const playerRooms = new Map<string, string>();
const presenceSubscribers = new Set<string>();
const SUPPORTED_GAMES = new Set(['quiz', 'hundred-to-one', 'crocodile', 'spy', 'mafia', 'who-am-i', 'alias']);
const { normalizePlayerName } = playerName;
const { getWhoAmIActivePlayerId } = whoAmIFlow;

// Expose rooms to admin API routes via globalThis (avoids ESM/CJS boundary issues).
// rooms-registry.ts reads from this same key using getRoomsSnapshot().
(globalThis as Record<string, unknown>)['__partyGamesRoomsProvider__'] = () =>
  Array.from(rooms.values()).map((room) => ({
    code: room.code,
    status: room.status,
    currentGame: room.currentGame,
    playerCount: room.players.size,
    players: Array.from(room.players.values()).map((p) => ({
      nickname: p.nickname,
      isHost: p.isHost,
      isConnected: p.isConnected,
      isAway: p.isAway,
    })),
    createdAt: room.createdAt,
  }));

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function getRoomByCode(code: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.code === code) return room;
  }
  return undefined;
}

function getPlayerBySocket(room: Room, socketId: string): Player | undefined {
  return Array.from(room.players.values()).find((player) => player.socketId === socketId);
}

function socketBelongsToRoom(room: Room, socketId: string): boolean {
  return room.tvSocketId === socketId || Boolean(getPlayerBySocket(room, socketId));
}

function isRoomController(room: Room, player: Player | undefined, socketId: string): boolean {
  void socketId;
  return Boolean(player && (player.id === room.ownerId || player.id === room.gameHostPlayerId));
}

function isGameController(room: Room, player: Player | undefined): boolean {
  return Boolean(player && player.id === room.gameHostPlayerId);
}

function isMafiaController(room: Room, player: Player | undefined): boolean {
  const controllerId = room.mafiaHostPlayerId ?? room.gameHostPlayerId;
  return Boolean(player && player.id === controllerId);
}

function isH2OController(room: Room, player: Player | undefined): boolean {
  return Boolean(player && asRecord(room.gameState?.roles)[player.id] === 'host');
}

function getRecipient(room: Room, socketId: string): GameRecipient {
  const player = getPlayerBySocket(room, socketId);
  const isH2OHost = room.currentGame === 'hundred-to-one'
    && Boolean(player && asRecord(room.gameState?.roles)[player.id] === 'host');
  return {
    playerId: player?.role === 'player' ? player.id : null,
    isTv: room.tvSocketId === socketId || player?.role === 'tv',
    isGameHost: room.currentGame === 'hundred-to-one'
      ? isH2OHost
      : Boolean(player && player.id === room.gameHostPlayerId),
    isMafiaHost: Boolean(player && player.id === room.mafiaHostPlayerId),
  };
}

function roomSocketIds(room: Room): string[] {
  return Array.from(new Set([
    ...Array.from(room.players.values()).filter((player) => player.isConnected).map((player) => player.socketId),
    ...(room.tvSocketId ? [room.tvSocketId] : []),
  ]));
}

function materializeRoomSnapshot(room: Room): void {
  if (!room.currentGame || !room.gameState) return;
  const elapsedSeconds = Math.floor((Date.now() - room.gameStateUpdatedAt) / 1000);
  if (elapsedSeconds <= 0) return;
  room.gameState = advanceTimedSnapshot(room.currentGame, room.gameState, elapsedSeconds);
  room.gameStateUpdatedAt += elapsedSeconds * 1000;
}

function syncSpyVotingDeadline(io: SocketIOServer, room: Room): void {
  const state = room.gameState;
  const deadline = room.currentGame === 'spy' && state?.phase === 'voting' && state.voteTimerRunning
    ? room.gameStateUpdatedAt + finiteNumber(state.voteTimerLeft) * 1000
    : undefined;
  if (deadline === room.spyVotingDeadline) return;
  if (room.spyVotingTimeout) clearTimeout(room.spyVotingTimeout);
  room.spyVotingTimeout = undefined;
  room.spyVotingDeadline = deadline;
  if (deadline === undefined) return;
  room.spyVotingTimeout = setTimeout(() => {
    room.spyVotingTimeout = undefined;
    room.spyVotingDeadline = undefined;
    if (getRoomByCode(room.code) !== room) return;
    materializeRoomSnapshot(room);
    broadcastSnapshot(io, room, 'server:timer');
  }, Math.max(1, deadline - Date.now()));
  room.spyVotingTimeout.unref();
}

function actionTouchesGameClock(action: string, payload: Record<string, unknown>): boolean {
  if (['croc:state', 'croc:tick', 'alias:state', 'alias:tick', 'quiz:timer', 'quiz:countdown', 'quiz:start-question'].includes(action)) return true;
  if (action === 'quiz:sync') return ['phase', 'timeLeft', 'countdownValue'].some((key) => key in payload);
  if (action === 'spy:sync') return ['phase', 'timerLeft', 'timerRunning', 'discussionTimeLeft', 'discussionTimerRunning', 'voteTimerLeft', 'voteTimerRunning'].some((key) => key in payload);
  if (action === 'h2o:sync') return ['buzzerCountdown', 'r4Time', 'r4Running', 'bgTimeLeft', 'bgTimerPaused', 'bgPhase'].some((key) => key in payload);
  if (action === 'mafia') return ['night-result', 'day-timer'].includes(String(payload.type));
  return false;
}

function emitSnapshotToSocket(io: SocketIOServer, room: Room, socketId: string, from: string): void {
  if (!room.currentGame || !room.gameState) return;
  materializeRoomSnapshot(room);
  syncSpyVotingDeadline(io, room);
  const stateAction = stateActionForGame(room.currentGame, sanitizeSnapshot(
    room.currentGame,
    room.gameState,
    getRecipient(room, socketId),
  ));
  if (!stateAction) return;
  io.to(socketId).emit('game:action', { ...stateAction, from });
}

function broadcastSnapshot(io: SocketIOServer, room: Room, from: string, excludeSocketId?: string): void {
  syncSpyVotingDeadline(io, room);
  for (const socketId of roomSocketIds(room)) {
    if (socketId === excludeSocketId) continue;
    emitSnapshotToSocket(io, room, socketId, from);
  }
}

function emitRawAction(
  io: SocketIOServer,
  room: Room,
  socketIds: Iterable<string>,
  action: string,
  payload: unknown,
  from: string,
): void {
  for (const socketId of new Set(socketIds)) {
    io.to(socketId).emit('game:action', { action, payload, from });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function gameControllerSocketId(room: Room): string | null {
  const h2oHostId = room.currentGame === 'hundred-to-one'
    ? Object.entries(asRecord(room.gameState?.roles)).find(([, role]) => role === 'host')?.[0]
    : null;
  const playerId = room.currentGame === 'mafia'
    ? room.mafiaHostPlayerId ?? room.gameHostPlayerId
    : h2oHostId ?? room.gameHostPlayerId;
  return playerId ? room.players.get(playerId)?.socketId ?? null : null;
}

function activeAliasExplainerId(snapshotValue: Record<string, unknown> | null): string | null {
  const snapshot = asRecord(snapshotValue);
  const teams = Array.isArray(snapshot.teams) ? snapshot.teams.map(asRecord) : [];
  const activeTeamIndex = typeof snapshot.activeTeamIndex === 'number' ? snapshot.activeTeamIndex : 0;
  const team = teams[activeTeamIndex];
  const ids = stringArray(team?.playerIds);
  const indices = Array.isArray(snapshot.explainerIndices) ? snapshot.explainerIndices : [];
  const legacyIndex = typeof snapshot.explainerIndex === 'number' ? snapshot.explainerIndex : 0;
  const index = typeof indices[activeTeamIndex] === 'number' ? indices[activeTeamIndex] : legacyIndex;
  return ids.length > 0 ? ids[index % ids.length] ?? null : null;
}

function activeWhoAmIPlayerId(snapshotValue: Record<string, unknown> | null): string | null {
  const snapshot = asRecord(snapshotValue);
  return getWhoAmIActivePlayerId({
    turnOrder: stringArray(snapshot.turnOrder),
    guessedPlayers: stringArray(snapshot.guessedPlayers),
    currentTurnIndex: finiteNumber(snapshot.currentTurnIndex),
  });
}

function onlyKeys(payload: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(payload).every((key) => allowed.includes(key));
}

const H2O_STATE_KEYS = [
  'phase', 'topicId', 'curQ', 't1n', 't2n', 't1s', 't2s', 'qState', 'strikes',
  'roundBusted', 'roundActiveTeam', 'roundFund', 'roundWonBy', 'roundPhase',
  'r4Time', 'r4Running', 'bgPhase', 'bgP1Ans', 'bgP2Ans', 'bgP1Matched',
  'bgP2Matched', 'bgFund', 'bgCurQ', 'bgTimeLeft', 'bgTimerTotal',
  'bgTimerPaused', 'bgP1Id', 'bgP2Id', 'winTeam', 'players', 'roles',
  'captains', 'captainConfirmed', 'buzzerWinner', 'buzzerActive',
  'buzzerCountdown', 'teamNameConfirmed',
];

function isAuthorizedH2OHostSync(snapshot: Record<string, unknown>, payload: Record<string, unknown>): boolean {
  const phase = typeof snapshot.phase === 'string' ? snapshot.phase : 'topicSelect';
  const nextPhase = typeof payload.phase === 'string' ? payload.phase : phase;
  if (!validateStateSyncPhase('hundred-to-one', snapshot, payload)) return false;

  // Full initialization/reset snapshots are allowed only on their declared
  // legal phase transitions. Same-phase patches use a narrow per-phase list.
  if ((phase === 'title' && nextPhase === 'buzzer') || (phase === 'final' && nextPhase === 'topicSelect')) {
    return onlyKeys(payload, H2O_STATE_KEYS);
  }

  const allowedByPhase: Record<string, string[]> = {
    topicSelect: ['topicId', 'phase', 'qState'],
    roleSelect: ['roles', 'phase', 'captains', 'captainConfirmed'],
    captainSelect: ['captains', 'captainConfirmed', 'phase', 'teamNameConfirmed'],
    teamNames: ['t1n', 't2n', 'teamNameConfirmed', 'phase'],
    title: ['phase'],
    buzzer: ['buzzerCountdown', 'buzzerActive', 'buzzerWinner', 'phase', 'roundActiveTeam'],
    playing: [
      'qState', 'strikes', 'roundBusted', 'roundActiveTeam', 'roundFund',
      'roundWonBy', 'roundPhase', 't1s', 't2s', 'curQ', 'phase',
      'buzzerWinner', 'buzzerActive', 'buzzerCountdown', 'r4Time', 'r4Running',
    ],
    r4rules: ['phase', 'r4Time', 'r4Running'],
    results: [
      'phase', 'bgPhase', 'bgP1Ans', 'bgP2Ans', 'bgP1Matched', 'bgP2Matched',
      'bgFund', 'bgCurQ', 'bgP1Id', 'bgP2Id', 'bgTimeLeft', 'bgTimerTotal',
      'bgTimerPaused', 'winTeam',
    ],
    bigGame: [
      'phase', 'bgPhase', 'bgP1Ans', 'bgP2Ans', 'bgP1Matched', 'bgP2Matched',
      'bgFund', 'bgCurQ', 'bgP1Id', 'bgP2Id', 'bgTimeLeft', 'bgTimerTotal',
      'bgTimerPaused',
    ],
    final: ['phase'],
  };
  return onlyKeys(payload, allowedByPhase[phase] ?? []);
}

function isAuthorizedH2OSync(room: Room, senderId: string, payload: Record<string, unknown>): boolean {
  const snapshot = asRecord(room.gameState);
  const roles = asRecord(snapshot.roles);
  const senderRole = roles[senderId];
  if (senderRole === 'host') return isAuthorizedH2OHostSync(snapshot, payload);

  if ((!snapshot.phase || snapshot.phase === 'topicSelect') && senderId === room.gameHostPlayerId) {
    return onlyKeys(payload, ['topicId', 'phase', 'qState']);
  }

  const phase = snapshot.phase;
  if (phase === 'roleSelect' && onlyKeys(payload, ['roles'])) {
    const nextRoles = asRecord(payload.roles);
    const allIds = new Set([...Object.keys(roles), ...Object.keys(nextRoles)]);
    for (const id of allIds) {
      if (id !== senderId && roles[id] !== nextRoles[id]) return false;
    }
    const selected = nextRoles[senderId];
    if (selected !== undefined && !['team1', 'team2', 'host'].includes(String(selected))) return false;
    return Object.values(nextRoles).filter((role) => role === 'host').length <= 1;
  }

  const myTeam = senderRole === 'team1' || senderRole === 'team2' ? senderRole : null;
  if (phase === 'captainSelect' && myTeam && onlyKeys(payload, ['captains', 'captainConfirmed', 'phase', 'teamNameConfirmed'])) {
    const nextCaptains = asRecord(payload.captains);
    const currentCaptains = asRecord(snapshot.captains);
    const nextConfirmed = asRecord(payload.captainConfirmed);
    const currentConfirmed = asRecord(snapshot.captainConfirmed);
    const otherTeam = myTeam === 'team1' ? 'team2' : 'team1';
    const captainId = nextCaptains[myTeam];
    return typeof captainId === 'string' && roles[captainId] === myTeam
      && nextCaptains[otherTeam] === currentCaptains[otherTeam]
      && nextConfirmed[otherTeam] === currentConfirmed[otherTeam]
      && nextConfirmed[myTeam] === true;
  }
  if (phase === 'teamNames' && myTeam && snapshot.captains && asRecord(snapshot.captains)[myTeam] === senderId
    && onlyKeys(payload, ['t1n', 't2n', 'teamNameConfirmed', 'phase'])) {
    const otherTeam = myTeam === 'team1' ? 'team2' : 'team1';
    const ownNameKey = myTeam === 'team1' ? 't1n' : 't2n';
    const otherNameKey = myTeam === 'team1' ? 't2n' : 't1n';
    const nextConfirmed = asRecord(payload.teamNameConfirmed);
    const currentConfirmed = asRecord(snapshot.teamNameConfirmed);
    return typeof payload[ownNameKey] === 'string'
      && payload[otherNameKey] === undefined
      && nextConfirmed[myTeam] === true
      && nextConfirmed[otherTeam] === currentConfirmed[otherTeam];
  }
  if (phase === 'buzzer' && myTeam && asRecord(snapshot.captains)[myTeam] === senderId
    && onlyKeys(payload, ['buzzerWinner', 'buzzerActive'])) {
    const teamNumber = myTeam === 'team1' ? 1 : 2;
    return payload.buzzerWinner === teamNumber && snapshot.buzzerActive === true && snapshot.buzzerWinner === 0;
  }
  if (phase === 'bigGame' && snapshot.bgPhase === 0 && myTeam) {
    const winningRole = snapshot.winTeam === 1 ? 'team1' : 'team2';
    const captainId = asRecord(snapshot.captains)[winningRole];
    if (senderId !== captainId || myTeam !== winningRole || !onlyKeys(payload, ['bgP1Id', 'bgP2Id'])) return false;
    return ['bgP1Id', 'bgP2Id'].every((key) => payload[key] === undefined || roles[String(payload[key])] === winningRole);
  }
  if (phase === 'bigGame' && (snapshot.bgPhase === 1 || snapshot.bgPhase === 3)) {
    const answeringId = snapshot.bgPhase === 1 ? snapshot.bgP1Id : snapshot.bgP2Id;
    const allowed = snapshot.bgPhase === 1
      ? ['bgP1Ans', 'bgCurQ', 'bgTimeLeft', 'bgTimerPaused']
      : ['bgP2Ans', 'bgCurQ', 'bgTimeLeft', 'bgTimerPaused'];
    return answeringId === senderId && onlyKeys(payload, allowed);
  }
  return false;
}

function isAuthorizedGameAction(room: Room, socket: Socket, action: string, payloadValue: unknown): boolean {
  if (!room.currentGame || !socketBelongsToRoom(room, socket.id) || !actionMatchesGame(room.currentGame, action)) {
    return false;
  }
  const sender = getPlayerBySocket(room, socket.id);
  const payload = asRecord(payloadValue);
  const senderId = sender?.role === 'player' ? sender.id : null;

  if (isRequestStateAction(action, payload)) return true;
  if (!senderId) return false;

  if (isStateSyncAction(action, payload)) {
    if (room.currentGame === 'mafia' || room.currentGame === 'who-am-i') return false;
    if (room.currentGame === 'hundred-to-one') {
      return isAuthorizedH2OSync(room, senderId, payload)
        && validateStateSyncPhase(room.currentGame, room.gameState, payload);
    }
    return isGameController(room, sender)
      && validateStateSyncPhase(room.currentGame, room.gameState, payload);
  }

  if (room.currentGame === 'quiz') {
    if (action === 'quiz:answer') {
      const currentQuestion = asRecord(room.gameState?.currentQuestion);
      const optionCount = Array.isArray(currentQuestion.options) ? currentQuestion.options.length : 0;
      return payload.playerId === senderId && room.gameState?.phase === 'question'
        && !room.gameState?.showCorrect
        && Number.isInteger(payload.answerIndex)
        && finiteNumber(payload.answerIndex, -1) >= 0
        && finiteNumber(payload.answerIndex, -1) < optionCount;
    }
    if (!isGameController(room, sender)) return false;
    const phase = room.gameState?.phase;
    if (action === 'quiz:config') return !phase || phase === 'waiting';
    if (action === 'quiz:timer') {
      return phase === 'question' && typeof payload.timeLeft === 'number'
        && payload.timeLeft >= 0 && payload.timeLeft <= finiteNumber(room.gameState?.timeLeft);
    }
    if (action === 'quiz:show-results') return phase === 'question' && !room.gameState?.showCorrect;
    if (action === 'quiz:countdown') return phase === 'waiting' || phase === 'countdown';
    if (action === 'quiz:start-question') {
      return phase === 'countdown' || phase === 'results' || phase === 'mid-leaderboard'
        || (phase === 'question' && room.gameState?.showCorrect === true);
    }
    if (action === 'quiz:final') return phase === 'question' && room.gameState?.showCorrect === true;
    return false;
  }

  if (room.currentGame === 'crocodile') {
    if (['croc:start-turn', 'croc:guessed', 'croc:skip'].includes(action)) {
      const expectedPhase = action === 'croc:start-turn' ? 'ready' : 'explaining';
      return room.gameState?.explainerId === senderId && room.gameState?.phase === expectedPhase;
    }
    return false;
  }

  if (room.currentGame === 'alias') {
    const phase = room.gameState?.phase;
    if (action === 'alias:join-team') return payload.playerId === senderId && room.gameState?.phase === 'teamSelect';
    if (action === 'alias:select-mode') return isGameController(room, sender) && (!phase || phase === 'modeSelect');
    if (action === 'alias:set-team-name') {
      const teamIndex = typeof payload.teamIndex === 'number' ? payload.teamIndex : -1;
      const teams = Array.isArray(room.gameState?.teams) ? room.gameState.teams.map(asRecord) : [];
      return room.gameState?.phase === 'teamName' && stringArray(teams[teamIndex]?.playerIds).includes(senderId);
    }
    if (['alias:begin-turn', 'alias:guessed', 'alias:skip'].includes(action)) {
      const expectedPhase = action === 'alias:begin-turn' ? 'waiting' : 'explaining';
      return activeAliasExplainerId(room.gameState) === senderId && room.gameState?.phase === expectedPhase;
    }
    const hostPhaseByAction: Record<string, string> = {
      'alias:randomize-teams': 'teamSelect',
      'alias:confirm-teams': 'teamSelect',
      'alias:continue-teamnames': 'teamName',
      'alias:continue-individual-setup': 'individualSetup',
      'alias:continue-letter-rule': 'letterRule',
      'alias:next-turn': 'turnResult',
    };
    if (hostPhaseByAction[action]) return isGameController(room, sender) && phase === hostPhaseByAction[action];
    return false;
  }

  if (room.currentGame === 'spy') {
    const phase = room.gameState?.phase;
    if (action === 'spy:pass-turn') {
      const playerOrder = stringArray(room.gameState?.playerOrder);
      const activePlayerId = room.gameState?.mode === 'draw'
        ? room.gameState?.drawerId
        : room.gameState?.guessAskerId
          || playerOrder[finiteNumber(room.gameState?.playerOrderIdx) % Math.max(playerOrder.length, 1)];
      return phase === 'playing' && activePlayerId === senderId;
    }
    if (action === 'spy:ready') {
      return phase === 'dealing' && payload.playerId === senderId
        && !stringArray(room.gameState?.readyPlayers).includes(senderId);
    }
    if (action === 'spy:vote') {
      const votes = asRecord(room.gameState?.votes);
      const suspectId = typeof payload.suspectId === 'string' ? payload.suspectId : '';
      const suspect = room.players.get(suspectId);
      return payload.voterId === senderId && room.gameState?.phase === 'voting'
        && !Object.hasOwn(votes, senderId) && suspectId !== senderId
        && Boolean(suspect && suspect.role === 'player');
    }
    if (action === 'spy:stroke') {
      const coordinates = ['x1', 'y1', 'x2', 'y2'].map((key) => payload[key]);
      return phase === 'playing' && room.gameState?.mode === 'draw'
        && room.gameState?.drawerId === senderId
        && coordinates.every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1);
    }
    if (action === 'spy:clear') {
      return phase === 'playing' && room.gameState?.mode === 'draw'
        && (room.gameState?.drawerId === senderId || isGameController(room, sender));
    }
    if (action === 'spy:undo') return canUndoSpyDrawing(room.gameState, payload, senderId);
    if (action === 'spy:guess-start') return phase === 'playing' && room.gameState?.spyId === senderId;
    if (action === 'spy:guess-try') {
      return phase === 'spyGuess' && room.gameState?.spyId === senderId
        && typeof payload.text === 'string' && payload.text.trim().length > 0
        && !room.gameState?.spyGuessAwaitingJudge;
    }
    if (action === 'spy:guess-confirm') {
      return phase === 'spyGuess' && room.gameState?.spyId === senderId
        && room.gameState?.spyGuessNeedsConfirm === true && !room.gameState?.spyGuessAwaitingJudge;
    }
    if (action === 'spy:guess-verdict') {
      return phase === 'spyGuess' && room.gameState?.spyGuessAwaitingJudge === true
        && room.gameState?.spyGuessJudgeId === senderId && typeof payload.accept === 'boolean';
    }
    return false;
  }

  if (room.currentGame === 'mafia') {
    const type = typeof payload.type === 'string' ? payload.type : '';
    if (type === 'select-host') {
      const selected = typeof payload.hostPlayerId === 'string' ? room.players.get(payload.hostPlayerId) : undefined;
      return isGameController(room, sender) && (!room.gameState || room.gameState.phase === 'lobby')
        && Boolean(selected && isHostEligible(selected));
    }
    const hostOnlyActions = new Set([
      'assign-roles', 'start-night', 'advance-night-stage', 'sync-state', 'detective-result',
      'don-check-result', 'resolve-night', 'night-result', 'start-voting', 'vote-alibi',
      'day-timer', 'vote-tie', 'vote-pardoned', 'eliminate', 'eliminate-many', 'game-over', 'end-game',
    ]);
    if (hostOnlyActions.has(type)) {
      return isMafiaController(room, sender) && validateMafiaHostAction(
        room.gameState,
        payload,
        Array.from(room.players.values()).filter((player) => player.role === 'player').map((player) => player.id),
      );
    }
    return validateMafiaActorAction(room.gameState, senderId, payload);
  }

  if (room.currentGame === 'who-am-i') {
    const type = typeof payload.type === 'string' ? payload.type : '';
    const phase = room.gameState?.phase;
    if (type === 'start-game') return isGameController(room, sender) && (!phase || phase === 'lobby' || phase === 'finished');
    if (type === 'end-game') return isGameController(room, sender) && phase === 'playing';
    const activeId = activeWhoAmIPlayerId(room.gameState);
    if (type === 'next-turn' || type === 'ask-question' || type === 'guess-try') {
      return phase === 'playing' && activeId === senderId
        && (type !== 'ask-question' && type !== 'guess-try' || payload.playerId === senderId)
        && !room.gameState?.guessNeedsConfirm && !room.gameState?.guessAwaitingJudge;
    }
    if (type === 'guess-confirm') {
      return phase === 'playing' && room.gameState?.guessNeedsConfirm === true
        && room.gameState?.guessPendingPlayerId === senderId && payload.playerId === senderId;
    }
    if (type === 'guess') {
      return phase === 'playing' && room.gameState?.guessAwaitingJudge === true
        && room.gameState?.guessJudgeId === senderId && room.gameState?.guessPendingPlayerId === payload.playerId
        && typeof payload.correct === 'boolean';
    }
    return false;
  }

  return false;
}

function broadcastRoomState(io: SocketIOServer, room: Room) {
  syncSpyVotingDeadline(io, room);
  const allPlayers = Array.from(room.players.values());
  const tvConnected = allPlayers.some((p) => p.role === 'tv' && p.isConnected);
  const players = allPlayers
    .filter((p) => p.role !== 'tv')
    .map(({ socketId: _socketId, reconnectToken: _reconnectToken, reconnectTimer: _reconnectTimer, ...rest }) => {
      void _socketId;
      void _reconnectToken;
      void _reconnectTimer;
      return rest;
    });
  const state = {
    id: room.id,
    code: room.code,
    ownerId: room.ownerId,
    hostId: room.hostId,
    players,
    maxPlayers: room.maxPlayers,
    status: room.status,
    currentGame: room.currentGame,
    // Full game snapshots contain private roles, words and votes. Game clients
    // receive recipient-specific state through game:action instead.
    gameState: null,
    tvConnected,
    gameHostPlayerId: room.gameHostPlayerId,
    showQrCode: room.showQrCode,
    locale: room.locale,
    pendingQuizConfig: room.pendingQuizConfig ?? null,
  };
  io.to(`room:${room.code}`).emit('room:state', state);
}

function emitPresenceCount(io: SocketIOServer) {
  const count = io.engine.clientsCount;
  for (const socketId of presenceSubscribers) {
    io.to(socketId).emit('presence:count', { count });
  }
}

function closeInactiveRoom(io: SocketIOServer, room: Room) {
  if (room.spyVotingTimeout) clearTimeout(room.spyVotingTimeout);
  io.to(`room:${room.code}`).emit('room:closed');
  if (room.inactivityTimer) {
    clearTimeout(room.inactivityTimer);
    room.inactivityTimer = undefined;
  }
  for (const player of room.players.values()) {
    if (player.reconnectTimer) {
      clearTimeout(player.reconnectTimer);
      player.reconnectTimer = undefined;
    }
    playerRooms.delete(player.socketId);
  }
  if (room.tvSocketId) {
    playerRooms.delete(room.tvSocketId);
  }
  rooms.delete(room.code);
}

function scheduleRoomInactivityCheck(io: SocketIOServer, room: Room) {
  // Active games keep their roster indefinitely. Mobile browsers can suspend
  // sockets for longer than the lobby grace period while the screen is locked.
  if (room.status === 'in-game') {
    if (room.inactivityTimer) {
      clearTimeout(room.inactivityTimer);
      room.inactivityTimer = undefined;
    }
    return;
  }

  const players = Array.from(room.players.values());
  const allPlayersInactive = players.length > 0 && players.every((p) => !p.isConnected || p.isAway);

  if (!allPlayersInactive) {
    if (room.inactivityTimer) {
      clearTimeout(room.inactivityTimer);
      room.inactivityTimer = undefined;
    }
    return;
  }

  if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
  room.inactivityTimer = setTimeout(() => {
    const currentRoom = rooms.get(room.code);
    if (!currentRoom) return;

    const currentPlayers = Array.from(currentRoom.players.values());
    const stillAllInactive =
      currentPlayers.length > 0 && currentPlayers.every((p) => !p.isConnected || p.isAway);

    if (stillAllInactive) {
      closeInactiveRoom(io, currentRoom);
    } else if (currentRoom.inactivityTimer) {
      clearTimeout(currentRoom.inactivityTimer);
      currentRoom.inactivityTimer = undefined;
    }
  }, 300000);
  room.inactivityTimer.unref();
}

// A player is eligible to be host only if they joined as a 'player' (phone),
// never the TV/creator screen. Single source of truth for the role-model rule.
function isHostEligible(player: Player): boolean {
  return player.role === 'player';
}

// Reassign host to a random remaining connected player (role:'player') when the
// host leaves. If none eligible, clear host so the next joining phone becomes host.
// Mirrors the role-model rules of the manual room:transfer-host handler.
function reassignHostOnLeave(room: Room, departingPlayerId: string): void {
  const eligible = Array.from(room.players.values()).filter(
    (p) => p.id !== departingPlayerId && isHostEligible(p) && p.isConnected,
  );

  for (const p of room.players.values()) {
    p.isHost = false;
  }

  if (eligible.length > 0) {
    const newHost = eligible[Math.floor(Math.random() * eligible.length)];
    newHost.isHost = true;
    room.hostId = newHost.id;
    room.gameHostPlayerId = newHost.id;
  } else {
    room.hostId = '';
    room.gameHostPlayerId = null;
  }
}

// If an in-progress game loses its last real player (role:'player'), abort the
// game and return everyone (incl. the TV display) to the lobby. The TV/lobby
// 'tv' entries don't count; only phones playing the game keep it alive.
function abortGameIfNoPlayers(io: SocketIOServer, room: Room): boolean {
  if (room.status !== 'in-game') return false;
  const hasPlayers = Array.from(room.players.values()).some((p) => p.role === 'player');
  if (hasPlayers) return false;
  room.status = 'lobby';
  room.gameState = null;
  room.gameStateUpdatedAt = Date.now();
  room.currentGame = null;
  room.pendingQuizConfig = null;
  broadcastRoomState(io, room);
  io.to(`room:${room.code}`).emit('game:ended');
  return true;
}

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    emitPresenceCount(io);

    socket.on('presence:subscribe', () => {
      presenceSubscribers.add(socket.id);
      emitPresenceCount(io);
    });

    // Create room
    socket.on('room:create', (data: { playerId: string; nickname: string; role?: 'tv' | 'player' }, callback) => {
      const nickname = normalizePlayerName(data.nickname);
      if (!nickname) {
        callback({ success: false, error: 'invalid-nickname' });
        return;
      }
      const code = generateRoomCode();
      const room: Room = {
        id: uuidv4(),
        code,
        ownerId: data.playerId,
        hostId: '',
        players: new Map(),
        maxPlayers: 20,
        status: 'lobby',
        currentGame: null,
        gameState: null,
        gameStateUpdatedAt: Date.now(),
        tvSocketId: null,
        createdAt: Date.now(),
        kickedPlayerIds: new Set<string>(),
        gameHostPlayerId: null,
        mafiaHostPlayerId: null,
        showQrCode: true,
        locale: 'ru',
        pendingQuizConfig: null,
      };

      const player: Player = {
        id: data.playerId,
        socketId: socket.id,
        nickname,
        isHost: false,
        isConnected: true,
        isAway: false,
        role: data.role ?? 'player',
        reconnectToken: uuidv4(),
      };

      room.players.set(data.playerId, player);
      rooms.set(room.code, room);
      playerRooms.set(socket.id, room.code);
      socket.join(`room:${code}`);

      callback({ success: true, code, roomId: room.id, reconnectToken: player.reconnectToken });
      broadcastRoomState(io, room);
    });

    // Join room
    socket.on('room:join', (data: { code: string; playerId: string; nickname: string; isReconnect?: boolean; role?: 'tv' | 'player'; reconnectToken?: string }, callback) => {
      const room = getRoomByCode(data.code.toUpperCase());
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      // Kicked-list check: auto-reconnect for a previously kicked player must fail.
      // Manual join (isReconnect=false) clears the kicked flag and proceeds normally.
      if (room.kickedPlayerIds.has(data.playerId)) {
        if (data.isReconnect) {
          callback({ success: false, error: 'Player was removed due to inactivity' });
          return;
        }
        room.kickedPlayerIds.delete(data.playerId);
      }

      const existingPlayer = room.players.get(data.playerId);

      // A public room code and player id are not credentials. A different
      // socket may replace an existing player only with the opaque token that
      // was issued on that player's first join. Repeated joins from the same
      // live socket remain compatible with existing lobby clients.
      if (existingPlayer && existingPlayer.socketId !== socket.id
        && data.reconnectToken !== existingPlayer.reconnectToken) {
        callback({ success: false, error: 'Invalid reconnect credentials' });
        return;
      }

      // Allow existing players to reconnect even mid-game; block only new players
      if (room.status === 'in-game' && !existingPlayer) {
        callback({ success: false, error: 'Game already in progress' });
        return;
      }
      if (room.players.size >= room.maxPlayers && !existingPlayer) {
        callback({ success: false, error: 'Room is full' });
        return;
      }

      if (existingPlayer) {
        if (existingPlayer.reconnectTimer) {
          clearTimeout(existingPlayer.reconnectTimer);
          existingPlayer.reconnectTimer = undefined;
        }
        existingPlayer.socketId = socket.id;
        existingPlayer.isConnected = true;
        existingPlayer.isAway = false;
      } else {
        const nickname = normalizePlayerName(data.nickname);
        if (!nickname) {
          callback({ success: false, error: 'invalid-nickname' });
          return;
        }
        const normalizedNickname = nickname.toLowerCase();
        const isNameTaken = Array.from(room.players.values()).some(
          (player) => player.role !== 'tv' && player.nickname.trim().toLowerCase() === normalizedNickname
        );
        if (isNameTaken) {
          callback({ success: false, error: 'name-taken' });
          return;
        }

        const player: Player = {
          id: data.playerId,
          socketId: socket.id,
          nickname,
          isHost: false,
          isConnected: true,
          isAway: false,
          role: data.role ?? 'player',
          reconnectToken: uuidv4(),
        };
        room.players.set(data.playerId, player);
        // First phone player becomes the game host for starting the selected game.
        if (isHostEligible(player) && room.gameHostPlayerId === null) {
          room.gameHostPlayerId = player.id;
          room.hostId = player.id;
          player.isHost = true;
        }
      }

      playerRooms.set(socket.id, room.code);
      socket.join(`room:${room.code}`);
      const joinedPlayer = room.players.get(data.playerId);
      callback({
        success: true,
        code: room.code,
        roomId: room.id,
        reconnectToken: joinedPlayer?.reconnectToken,
      });
      scheduleRoomInactivityCheck(io, room);
      broadcastRoomState(io, room);
      if (room.status === 'in-game' && room.gameState) {
        emitSnapshotToSocket(io, room, socket.id, 'server:reconnect');
      }
    });

    // TV mode join
    socket.on('tv:join', (data: { code: string }, callback) => {
      const room = getRoomByCode(data.code.toUpperCase());
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }
      room.tvSocketId = socket.id;
      playerRooms.set(socket.id, room.code);
      socket.join(`room:${room.code}`);
      callback({ success: true });
      broadcastRoomState(io, room);
    });

    // Request current room state
    socket.on('room:get-state', (data: { code: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) {
        socket.emit('room:not-found', { code: data.code });
        return;
      }
      const allPlayers = Array.from(room.players.values());
      const tvConnected = allPlayers.some((p) => p.role === 'tv' && p.isConnected);
      const players = allPlayers
        .filter((p) => p.role !== 'tv')
        .map(({ socketId: _socketId, reconnectToken: _reconnectToken, reconnectTimer: _reconnectTimer, ...rest }) => {
          void _socketId;
          void _reconnectToken;
          void _reconnectTimer;
          return rest;
        });
      const state = {
        id: room.id,
        code: room.code,
        ownerId: room.ownerId,
        hostId: room.hostId,
        players,
        maxPlayers: room.maxPlayers,
        status: room.status,
        currentGame: room.currentGame,
        gameState: null,
        tvConnected,
        gameHostPlayerId: room.gameHostPlayerId,
        showQrCode: room.showQrCode,
        locale: room.locale,
        pendingQuizConfig: room.pendingQuizConfig ?? null,
      };
      socket.emit('room:state', state);
    });

    // Select game
    socket.on('game:select', (data: {
      code: string;
      gameType: string;
      quizConfig?: { mode: string; difficulty: string; topic: string; specialQuizId: string | null } | null;
    }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      const sender = getPlayerBySocket(room, socket.id);
      if (!socketBelongsToRoom(room, socket.id) || !isRoomController(room, sender, socket.id)) return;
      if (room.status !== 'lobby') return;
      if (!SUPPORTED_GAMES.has(data.gameType)) return;
      room.currentGame = data.gameType;
      if (data.quizConfig) {
        room.pendingQuizConfig = data.quizConfig as Room['pendingQuizConfig'];
      } else {
        room.pendingQuizConfig = null;
      }
      broadcastRoomState(io, room);
    });

    // Deselect game (TV returns to lobby before starting)
    socket.on('game:deselect', (data: { code: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      const sender = getPlayerBySocket(room, socket.id);
      if (!socketBelongsToRoom(room, socket.id) || !isRoomController(room, sender, socket.id)) return;
      // Only meaningful in lobby; never wipe an in-progress game.
      if (room.status !== 'lobby') return;
      room.currentGame = null;
      room.pendingQuizConfig = null;
      broadcastRoomState(io, room);
    });

    // Start game
    socket.on('game:start', (data: { code: string }) => {
      const room = getRoomByCode(data.code);
      if (!room || !room.currentGame) return;
      const sender = getPlayerBySocket(room, socket.id);
      if (!isGameController(room, sender) || room.status !== 'lobby') return;
      const playerCount = Array.from(room.players.values()).filter((p) => p.role === 'player').length;
      if (playerCount === 0) {
        socket.emit('game:error', {
          messageRu: 'В комнате нет игроков',
          messageEn: 'No players in the room',
        });
        return;
      }
      if (room.currentGame === 'crocodile' && (playerCount < 2 || playerCount > 10)) {
        socket.emit('game:error', {
          messageRu: 'Для Крокодила нужно от 2 до 10 игроков',
          messageEn: 'Crocodile requires 2 to 10 players',
        });
        return;
      }
      if (room.currentGame === 'quiz' && (playerCount < 2 || playerCount > 10)) {
        socket.emit('game:error', {
          messageRu: 'Для Квиза нужно от 2 до 10 игроков',
          messageEn: 'Quiz requires 2 to 10 players',
        });
        return;
      }
      room.showQrCode = false;
      room.status = 'in-game';
      room.mafiaHostPlayerId = null;
      room.gameState = null;
      room.gameStateUpdatedAt = Date.now();
      io.to(`room:${room.code}`).emit('room:show-qr', { show: false });
      broadcastRoomState(io, room);
      io.to(`room:${room.code}`).emit('game:started', {
        gameType: room.currentGame,
        roomCode: room.code,
        quizConfig: room.pendingQuizConfig ?? null,
      });
    });

    // Game action (generic handler for all games)
    socket.on('game:action', (data: { code: string; action: string; payload: Record<string, unknown> }) => {
      const room = getRoomByCode(data.code);
      if (room && socketBelongsToRoom(room, socket.id)) {
        const previousPhase = room.gameState?.phase;
        materializeRoomSnapshot(room);
        if (room.currentGame === 'spy' && previousPhase === 'voting' && room.gameState?.phase === 'roundResult') {
          broadcastSnapshot(io, room, 'server:timer');
        }
      }
      if (!room || !room.currentGame || !isAuthorizedGameAction(room, socket, data.action, data.payload)) return;

      if (isRequestStateAction(data.action, data.payload)) {
        if (room.gameState) {
          emitSnapshotToSocket(io, room, socket.id, 'server:snapshot');
          return;
        }
        const controllerSocketId = gameControllerSocketId(room);
        if (controllerSocketId && controllerSocketId !== socket.id) {
          emitRawAction(io, room, [controllerSocketId], data.action, data.payload, socket.id);
        }
        return;
      }

      let payload: Record<string, unknown> = data.payload;
      if (room.currentGame === 'who-am-i') {
        payload = normalizeWhoAmIGuess(room.gameState, payload);
        if (payload.type === 'guess-confirm') {
          const sender = getPlayerBySocket(room, socket.id);
          const candidates = Array.from(room.players.values()).filter((player) => (
            player.role === 'player'
              && player.isConnected
              && !player.isAway
              && player.id !== sender?.id
          ));
          const judge = candidates[Math.floor(Math.random() * candidates.length)];
          payload = judge
            ? { ...payload, judgeId: judge.id }
            : {
                type: 'guess',
                playerId: sender?.id ?? payload.playerId,
                guess: room.gameState?.guessPendingText ?? '',
                correct: false,
              };
        }
      }

      materializeRoomSnapshot(room);
      room.gameState = reduceGameSnapshot(room.currentGame, room.gameState, data.action, payload);
      if (actionTouchesGameClock(data.action, payload)) room.gameStateUpdatedAt = Date.now();

      if (isStateSyncAction(data.action, payload)) {
        broadcastSnapshot(io, room, socket.id, room.currentGame === 'spy' ? undefined : socket.id);
        return;
      }

      const allSocketIds = roomSocketIds(room);
      const sender = getPlayerBySocket(room, socket.id);
      const controllerSocketId = gameControllerSocketId(room);

      if (room.currentGame === 'quiz') {
        if (data.action === 'quiz:answer') {
          for (const targetSocketId of allSocketIds) {
            const recipient = getRecipient(room, targetSocketId);
            const canSeeAnswer = targetSocketId === socket.id || recipient.isGameHost;
            emitRawAction(io, room, [targetSocketId], data.action, {
              ...payload,
              answerIndex: canSeeAnswer ? payload.answerIndex : -1,
            }, socket.id);
          }
          return;
        }
        broadcastSnapshot(io, room, socket.id, socket.id);
        return;
      }

      if (room.currentGame === 'crocodile' || room.currentGame === 'alias') {
        if (data.action.endsWith(':state') || data.action.endsWith(':tick')) {
          broadcastSnapshot(io, room, socket.id, socket.id);
        } else if (data.action === 'alias:select-mode') {
          emitRawAction(io, room, allSocketIds, data.action, payload, socket.id);
        } else if (controllerSocketId) {
          const controllerPayload = room.currentGame === 'alias'
            && (data.action === 'alias:guessed' || data.action === 'alias:skip')
            ? { ...payload, resolvedWordIndex: room.gameState?.currentWordIndex }
            : payload;
          emitRawAction(io, room, [controllerSocketId, socket.id], data.action, controllerPayload, socket.id);
        }
        return;
      }

      if (room.currentGame === 'spy') {
        if (data.action === 'spy:sync') {
          broadcastSnapshot(io, room, socket.id, socket.id);
          return;
        }
        if (['spy:pass-turn', 'spy:guess-start', 'spy:guess-try', 'spy:undo'].includes(data.action)) {
          broadcastSnapshot(io, room, socket.id);
          return;
        }
        if (data.action === 'spy:vote') {
          broadcastSnapshot(io, room, socket.id);
          return;
        }
        if (data.action === 'spy:guess-confirm') {
          if (controllerSocketId) emitRawAction(io, room, [controllerSocketId, socket.id], data.action, payload, socket.id);
          return;
        }
        if (data.action === 'spy:guess-verdict') {
          if (controllerSocketId) emitRawAction(io, room, [controllerSocketId, socket.id], data.action, payload, socket.id);
          return;
        }
        emitRawAction(io, room, allSocketIds, data.action, payload, socket.id);
        return;
      }

      if (room.currentGame === 'hundred-to-one') {
        broadcastSnapshot(io, room, socket.id, socket.id);
        return;
      }

      if (room.currentGame === 'who-am-i') {
        const type = typeof payload.type === 'string' ? payload.type : '';
        if (type === 'start-game' || type === 'guess-try' || type === 'guess-confirm') {
          broadcastSnapshot(io, room, socket.id);
          return;
        }
        if (type === 'guess') {
          emitRawAction(io, room, allSocketIds, data.action, payload, socket.id);
          broadcastSnapshot(io, room, socket.id);
          return;
        }
        emitRawAction(io, room, allSocketIds, data.action, payload, socket.id);
        return;
      }

      if (room.currentGame === 'mafia') {
        const type = typeof payload.type === 'string' ? payload.type : '';
        if (type === 'select-host') {
          const selectedHostId = typeof payload.hostPlayerId === 'string' ? payload.hostPlayerId : '';
          const selectedHost = room.players.get(selectedHostId);
          if (!selectedHost || !isHostEligible(selectedHost)) return;
          room.mafiaHostPlayerId = selectedHost.id;
        }
        if (type === 'assign-roles') {
          broadcastSnapshot(io, room, socket.id);
          return;
        }
        const snapshotTransitionTypes = new Set([
          'start-night', 'advance-night-stage', 'night-result', 'start-voting',
          'vote-alibi', 'vote-tie', 'vote-pardoned', 'eliminate',
          'eliminate-many', 'game-over',
        ]);
        if (snapshotTransitionTypes.has(type)) {
          broadcastSnapshot(io, room, socket.id);
          return;
        }
        const actorSecretTypes = new Set([
          'mafia-vote', 'maniac-kill', 'don-check-sheriff', 'lover-visit',
          'detective-check', 'doctor-save', 'cast-vote',
        ]);
        if (actorSecretTypes.has(type)) {
          const targets = [socket.id, ...(controllerSocketId ? [controllerSocketId] : [])];
          if (type === 'cast-vote') {
            emitRawAction(io, room, targets, data.action, payload, socket.id);
            for (const targetSocketId of allSocketIds) {
              if (!targets.includes(targetSocketId)) {
                emitRawAction(io, room, [targetSocketId], data.action, { ...payload, targetId: '' }, socket.id);
              }
            }
            return;
          }
          if (type === 'mafia-vote') {
            const roles = asRecord(room.gameState?.roles);
            for (const player of room.players.values()) {
              if (roles[player.id] === 'mafia' || roles[player.id] === 'don') targets.push(player.socketId);
            }
          }
          emitRawAction(io, room, targets, data.action, payload, socket.id);
          return;
        }
        if (type === 'detective-result' || type === 'don-check-result') {
          const targetId = type === 'detective-result' ? payload.detectiveId : payload.donId;
          const targetSocketId = typeof targetId === 'string' ? room.players.get(targetId)?.socketId : null;
          emitRawAction(io, room, [socket.id, ...(targetSocketId ? [targetSocketId] : [])], data.action, payload, socket.id);
          return;
        }
        emitRawAction(io, room, allSocketIds, data.action, payload, socket.id);
        return;
      }

      // Keep TypeScript aware that a room player initiated every remaining action.
      void sender;
    });

    // Update game state (from host)
    socket.on('game:state-update', (data: { code: string; gameState: Record<string, unknown> }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      const sender = getPlayerBySocket(room, socket.id);
      if (!room.currentGame || !isGameController(room, sender)) return;
      const allowedKeys = room.currentGame === 'quiz'
        ? ['scores']
        : room.currentGame === 'hundred-to-one'
          ? ['teamAScore', 'teamBScore']
          : [];
      const gameStateUpdate = asRecord(data.gameState);
      if (!onlyKeys(gameStateUpdate, allowedKeys) || Object.keys(gameStateUpdate).length === 0) return;
      materializeRoomSnapshot(room);
      room.gameState = { ...(room.gameState ?? {}), ...gameStateUpdate };
      broadcastRoomState(io, room);
    });

    // End game
    socket.on('game:end', (data: { code: string }) => {
      const room = getRoomByCode(data.code.toUpperCase());
      if (!room) return;
      const sender = getPlayerBySocket(room, socket.id);
      const canEnd = isGameController(room, sender)
        || isMafiaController(room, sender)
        || isH2OController(room, sender)
        || Boolean(sender && sender.id === room.ownerId);
      if (!canEnd) return;
      room.status = 'lobby';
      room.currentGame = null;
      room.gameState = null;
      room.gameStateUpdatedAt = Date.now();
      room.mafiaHostPlayerId = null;
      room.pendingQuizConfig = null;
      broadcastRoomState(io, room);
      io.to(`room:${room.code}`).emit('game:ended');
    });

    // Chat message
    socket.on('chat:message', (data: { code: string; playerId: string; playerName: string; text: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      io.to(`room:${room.code}`).emit('chat:message', {
        id: uuidv4(),
        playerId: data.playerId,
        playerName: data.playerName,
        text: data.text,
        timestamp: Date.now(),
      });
    });

    // Kick player
    socket.on('room:kick', (data: { code: string; playerId: string }) => {
      const room = getRoomByCode(data.code);
      if (!room || room.status !== 'lobby') return;
      const sender = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
      if (!sender || sender.id !== room.ownerId) return;
      const player = room.players.get(data.playerId);
      if (!player || player.id === room.ownerId || player.role === 'tv') return;

      const wasHost = player.isHost;
      if (player.reconnectTimer) clearTimeout(player.reconnectTimer);
      room.kickedPlayerIds.add(player.id);
      io.to(player.socketId).emit('room:kicked');
      io.sockets.sockets.get(player.socketId)?.leave(`room:${room.code}`);
      playerRooms.delete(player.socketId);
      room.players.delete(player.id);
      if (wasHost) reassignHostOnLeave(room, player.id);
      scheduleRoomInactivityCheck(io, room);
      broadcastRoomState(io, room);
    });

    // Transfer host
    socket.on('room:transfer-host', (data: { code: string; newHostId: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      const sender = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
      if (!sender || !sender.isHost) return;
      const newHost = room.players.get(data.newHostId);
      if (!newHost || !isHostEligible(newHost)) return;
      for (const player of room.players.values()) {
        player.isHost = false;
      }
      newHost.isHost = true;
      room.hostId = data.newHostId;
      room.gameHostPlayerId = data.newHostId;
      broadcastRoomState(io, room);
    });

    // Show QR screen on TV lobby when host/game-host wants to add players.
    socket.on('room:show-qr', (data: { code: string; show?: boolean }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      const sender = getPlayerBySocket(room, socket.id);
      if (!isRoomController(room, sender, socket.id)) return;
      room.showQrCode = data.show !== false;
      io.to(`room:${room.code}`).emit('room:show-qr', { show: room.showQrCode });
    });

    // Leave room
    socket.on('room:leave', () => {
      handleDisconnect(io, socket, true);
    });

    socket.on('player:away', () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;
      const room = getRoomByCode(roomCode);
      if (!room) return;
      for (const player of room.players.values()) {
        if (player.socketId === socket.id) {
          if (!player.isAway) {
            player.isAway = true;
            scheduleRoomInactivityCheck(io, room);
            broadcastRoomState(io, room);
          }
          return;
        }
      }
    });

    socket.on('player:back', () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;
      const room = getRoomByCode(roomCode);
      if (!room) return;
      for (const player of room.players.values()) {
        if (player.socketId === socket.id) {
          if (player.isAway) {
            player.isAway = false;
            scheduleRoomInactivityCheck(io, room);
            broadcastRoomState(io, room);
          }
          return;
        }
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      presenceSubscribers.delete(socket.id);
      handleDisconnect(io, socket);
      emitPresenceCount(io);
    });
  });
}

function handleDisconnect(io: SocketIOServer, socket: Socket, explicit = false) {
  const roomCode = playerRooms.get(socket.id);
  if (!roomCode) return;

  const room = getRoomByCode(roomCode);
  if (!room) return;

  // Check if it's a TV socket
  if (room.tvSocketId === socket.id) {
    room.tvSocketId = null;
    playerRooms.delete(socket.id);
    broadcastRoomState(io, room);
    return;
  }

  // Find player by socketId
  for (const [playerId, player] of room.players.entries()) {
    if (player.socketId === socket.id) {
      player.isConnected = false;

      if (explicit) {
        const wasHost = player.isHost;
        room.players.delete(playerId);
        playerRooms.delete(socket.id);
        if (room.players.size === 0) {
          if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
          if (room.spyVotingTimeout) clearTimeout(room.spyVotingTimeout);
          rooms.delete(roomCode);
          return;
        }
        if (wasHost) reassignHostOnLeave(room, playerId);
        scheduleRoomInactivityCheck(io, room);
        if (!abortGameIfNoPlayers(io, room)) {
          broadcastRoomState(io, room);
        }
        return;
      }

      // Broadcast immediately so other clients see the grayscale avatar.
      scheduleRoomInactivityCheck(io, room);
      broadcastRoomState(io, room);

      // Cancel any existing grace-period timer before starting a new one.
      // Mobile may disconnect/reconnect multiple times; only the latest timer counts.
      if (player.reconnectTimer) clearTimeout(player.reconnectTimer);

      // During an active game the roster is stable: a suspended phone must be
      // able to reconnect even after the lobby grace period has elapsed.
      if (room.status === 'in-game') break;

      // Unexpected lobby disconnect keeps the reconnect grace period.
      player.reconnectTimer = setTimeout(() => {
        if (!player.isConnected) {
          const wasHost = player.isHost;
          // Mark as kicked so auto-reconnect (isReconnect=true) is refused.
          // Manual re-join via code input/QR clears this flag.
          room.kickedPlayerIds.add(playerId);
          room.players.delete(playerId);
          if (room.players.size === 0) {
            if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
            if (room.spyVotingTimeout) clearTimeout(room.spyVotingTimeout);
            rooms.delete(roomCode);
          } else {
            if (wasHost) reassignHostOnLeave(room, playerId);
            scheduleRoomInactivityCheck(io, room);
            if (!abortGameIfNoPlayers(io, room)) {
              broadcastRoomState(io, room);
            }
          }
        }
      }, 300000); // 5 min grace — mobile browsers kill WS when backgrounded
      player.reconnectTimer.unref();

      break;
    }
  }

  playerRooms.delete(socket.id);
  broadcastRoomState(io, room);
}
