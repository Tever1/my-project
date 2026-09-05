import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { Server as SocketIOServer } from 'socket.io';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { setupSocketHandlers } from './socket-handlers.mts';

type EventPayload = Record<string, unknown>;

function waitForEvent(
  socket: ClientSocket,
  event: string,
  predicate: (value: EventPayload) => boolean = () => true,
): Promise<EventPayload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, 2_000);
    const handler = (value: EventPayload) => {
      if (!predicate(value)) return;
      clearTimeout(timeout);
      socket.off(event, handler);
      resolve(value);
    };
    socket.on(event, handler);
  });
}

function emitAck(socket: ClientSocket, event: string, payload: EventPayload): Promise<EventPayload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event} acknowledgement`)), 2_000);
    socket.emit(event, payload, (response: EventPayload) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

async function connect(url: string): Promise<ClientSocket> {
  const socket = createClient(url, { path: '/api/socketio', transports: ['websocket'], forceNew: true });
  await waitForEvent(socket, 'connect');
  return socket;
}

async function seedGame(
  gameType: string,
  code: string,
  host: ClientSocket,
  peer: ClientSocket,
): Promise<{ action: string; verify: (payload: EventPayload) => void }> {
  const observeState = (action: string) => waitForEvent(
    peer,
    'game:action',
    (value) => value.action === action,
  );

  if (gameType === 'crocodile') {
    let observed = observeState('croc:state');
    host.emit('game:action', {
      code,
      action: 'croc:state',
      payload: { phase: 'ready', explainerId: 'host', currentWordIndex: 7, usedWordIndices: [7], timeLeft: 60, scores: {} },
    });
    await observed;
    observed = observeState('croc:state');
    host.emit('game:action', {
      code,
      action: 'croc:state',
      payload: { phase: 'explaining', explainerId: 'host', currentWordIndex: 7, usedWordIndices: [7], timeLeft: 60, scores: {} },
    });
    await observed;
    return {
      action: 'croc:state',
      verify: (payload) => {
        assert.equal(payload.phase, 'explaining');
        assert.equal(payload.currentWordIndex, 7);
        assert.ok(Number(payload.timeLeft) < 60);
      },
    };
  }

  if (gameType === 'alias') {
    const selected = waitForEvent(peer, 'game:action', (value) => value.action === 'alias:select-mode');
    host.emit('game:action', { code, action: 'alias:select-mode', payload: { mode: 'classic' } });
    await selected;
    const observed = observeState('alias:state');
    host.emit('game:action', {
      code,
      action: 'alias:state',
      payload: {
        phase: 'teamSelect', mode: 'classic', teams: [{ playerIds: ['host'] }, { playerIds: ['peer'] }],
        activeTeamIndex: 0, explainerIndices: [0, 0], currentWordIndex: 7, timeLeft: 60,
      },
    });
    await observed;
    return { action: 'alias:state', verify: (payload) => assert.equal(payload.currentWordIndex, 7) };
  }

  if (gameType === 'quiz') {
    const observed = observeState('quiz:sync');
    host.emit('game:action', {
      code,
      action: 'quiz:config',
      payload: { phase: 'waiting', marker: 'quiz-reconnect', scores: {}, answers: {}, showCorrect: false },
    });
    await observed;
    const countdown = observeState('quiz:sync');
    host.emit('game:action', { code, action: 'quiz:countdown', payload: { value: 3, questionIndex: 0 } });
    await countdown;
    return {
      action: 'quiz:sync',
      verify: (payload) => {
        assert.equal(payload.marker, 'quiz-reconnect');
        assert.equal(payload.phase, 'countdown');
        assert.ok(Number(payload.countdownValue) < 3);
      },
    };
  }

  if (gameType === 'spy') {
    let observed = observeState('spy:sync');
    host.emit('game:action', {
      code,
      action: 'spy:sync',
      payload: {
        phase: 'dealing', mode: 'text', word: 'secret', spyId: 'peer',
        readyPlayers: [], votes: {}, drawStrokes: [], marker: 'spy-reconnect',
      },
    });
    await observed;
    observed = observeState('spy:sync');
    host.emit('game:action', {
      code,
      action: 'spy:sync',
      payload: { phase: 'playing', timerLeft: 180, timerRunning: true },
    });
    await observed;
    return {
      action: 'spy:sync',
      verify: (payload) => {
        assert.equal(payload.marker, 'spy-reconnect');
        assert.equal(payload.phase, 'playing');
        assert.ok(Number(payload.timerLeft) < 180);
      },
    };
  }

  if (gameType === 'hundred-to-one') {
    let observed = observeState('h2o:sync');
    host.emit('game:action', {
      code,
      action: 'h2o:sync',
      payload: { topicId: 'classic', phase: 'roleSelect', qState: {} },
    });
    await observed;
    observed = observeState('h2o:sync');
    host.emit('game:action', { code, action: 'h2o:sync', payload: { roles: { host: 'host' } } });
    await observed;
    return {
      action: 'h2o:sync',
      verify: (payload) => {
        assert.equal(payload.topicId, 'classic');
        assert.deepEqual(payload.roles, { host: 'host' });
      },
    };
  }

  if (gameType === 'mafia') {
    host.emit('game:action', { code, action: 'mafia', payload: { type: 'select-host', hostPlayerId: 'host' } });
    const observed = observeState('mafia');
    host.emit('game:action', {
      code,
      action: 'mafia',
      payload: { type: 'assign-roles', hostPlayerId: 'host', roles: { peer: 'citizen' } },
    });
    await observed;
    // Legacy score sync must not bypass Mafia's validated action reducer.
    host.emit('game:state-update', { code, gameState: { phase: 'finished', roles: {} } });
    return {
      action: 'mafia',
      verify: (payload) => {
        assert.equal(payload.type, 'sync-state');
        assert.equal((payload.state as EventPayload).phase, 'role-reveal');
      },
    };
  }

  const observed = observeState('who-am-i');
  host.emit('game:action', {
    code,
    action: 'who-am-i',
    payload: {
      type: 'start-game',
      turnOrder: ['host', 'peer'],
      characters: {
        host: { ru: 'Кот', en: 'Cat' },
        peer: { ru: 'Пёс', en: 'Dog' },
      },
    },
  });
  await observed;
  return {
    action: 'who-am-i',
    verify: (payload) => {
      assert.equal(payload.type, 'sync-state');
      assert.equal((payload.state as EventPayload).phase, 'playing');
    },
  };
}

function requestGameSnapshot(socket: ClientSocket, code: string, gameType: string): void {
  if (gameType === 'mafia' || gameType === 'who-am-i') {
    socket.emit('game:action', { code, action: gameType, payload: { type: 'request-state' } });
    return;
  }
  const prefix = gameType === 'crocodile'
    ? 'croc'
    : gameType === 'hundred-to-one'
      ? 'h2o'
      : gameType;
  socket.emit('game:action', { code, action: `${prefix}:request-state`, payload: {} });
}

function sendUnknownGameAction(socket: ClientSocket, code: string, gameType: string): void {
  if (gameType === 'mafia' || gameType === 'who-am-i') {
    socket.emit('game:action', { code, action: gameType, payload: { type: 'forged-action' } });
    return;
  }
  const prefix = gameType === 'crocodile'
    ? 'croc'
    : gameType === 'hundred-to-one'
      ? 'h2o'
      : gameType;
  if (gameType === 'hundred-to-one') {
    socket.emit('game:action', {
      code,
      action: 'h2o:sync',
      payload: { roles: { attacker: 'host' }, winTeam: 2 },
    });
    return;
  }
  socket.emit('game:action', {
    code,
    action: gameType === 'crocodile' ? 'croc:next-player' : `${prefix}:forged-action`,
    payload: { phase: 'finished' },
  });
}

test('every production game restores an existing player after a full socket reconnect', async (t) => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  for (const gameType of ['crocodile', 'alias', 'quiz', 'spy', 'hundred-to-one', 'mafia', 'who-am-i']) {
    await t.test(gameType, async () => {
      const owner = await connect(url);
      const host = await connect(url);
      const peer = await connect(url);
      const sockets = [owner, host, peer];

      const created = await emitAck(owner, 'room:create', { playerId: `owner-${gameType}`, nickname: 'TV', role: 'tv' });
      assert.equal(created.success, true);
      const code = String(created.code);
      const hostJoin = await emitAck(host, 'room:join', { code, playerId: 'host', nickname: 'Host', role: 'player' });
      assert.equal(hostJoin.success, true);
      assert.equal(typeof hostJoin.reconnectToken, 'string');
      const hostReconnectToken = String(hostJoin.reconnectToken);
      const peerJoin = await emitAck(peer, 'room:join', { code, playerId: 'peer', nickname: 'Peer', role: 'player' });
      assert.equal(peerJoin.success, true);
      const peerReconnectToken = String(peerJoin.reconnectToken);
      assert.ok(peerReconnectToken);
      assert.equal((await emitAck(owner, 'tv:join', { code })).success, true);

      const roomState = waitForEvent(host, 'room:state');
      host.emit('room:get-state', { code });
      const publicRoom = await roomState;
      const publicPlayers = publicRoom.players as EventPayload[];
      assert.equal(publicPlayers.some((player) => 'reconnectToken' in player || 'reconnectTimer' in player), false);
      assert.equal(publicRoom.locale, 'ru');

      host.emit('game:select', { code, gameType });
      const started = waitForEvent(peer, 'game:started', (value) => value.gameType === gameType);
      host.emit('game:start', { code });
      await started;

      const expected = await seedGame(gameType, code, host, peer);
      sendUnknownGameAction(host, code, gameType);
      if (['crocodile', 'quiz', 'spy'].includes(gameType)) {
        await new Promise((resolve) => setTimeout(resolve, 1_100));
      }

      peer.disconnect();
      const peerReconnected = await connect(url);
      sockets.push(peerReconnected);
      const peerSnapshot = waitForEvent(peerReconnected, 'game:action', (value) => value.action === expected.action);
      assert.equal((await emitAck(peerReconnected, 'room:join', {
        code,
        playerId: 'peer',
        nickname: 'Peer',
        role: 'player',
        isReconnect: true,
        reconnectToken: peerReconnectToken,
      })).success, true);
      await peerSnapshot;

      owner.disconnect();
      const tvReconnected = await connect(url);
      sockets.push(tvReconnected);
      assert.equal((await emitAck(tvReconnected, 'tv:join', { code })).success, true);
      const tvSnapshot = waitForEvent(tvReconnected, 'game:action', (value) => value.action === expected.action);
      requestGameSnapshot(tvReconnected, code, gameType);
      await tvSnapshot;

      host.disconnect();

      const attacker = await connect(url);
      sockets.push(attacker);
      const rejected = await emitAck(attacker, 'room:join', {
        code, playerId: 'host', nickname: 'Host', role: 'player', isReconnect: true,
      });
      assert.equal(rejected.success, false);
      attacker.disconnect();

      const reconnected = await connect(url);
      sockets.push(reconnected);
      const snapshot = waitForEvent(
        reconnected,
        'game:action',
        (value) => value.action === expected.action && value.from === 'server:reconnect',
      );
      const joined = await emitAck(reconnected, 'room:join', {
        code, playerId: 'host', nickname: 'Host', role: 'player', isReconnect: true,
        reconnectToken: hostReconnectToken,
      });
      assert.equal(joined.success, true);
      const restored = await snapshot;
      expected.verify(restored.payload as EventPayload);

      sockets.forEach((socket) => socket.disconnect());
    });
  }
});

test('room locale is Russian for phones and TV even when the creator browser sends English', async (t) => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  const owner = await connect(url);
  const phone = await connect(url);
  const tv = await connect(url);

  t.after(async () => {
    [owner, phone, tv].forEach((socket) => socket.disconnect());
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  const created = await emitAck(owner, 'room:create', {
    playerId: 'locale-owner', nickname: 'TV', role: 'tv', locale: 'en',
  });
  const code = String(created.code);
  await emitAck(phone, 'room:join', {
    code, playerId: 'locale-phone', nickname: 'Phone', role: 'player',
  });
  await emitAck(tv, 'tv:join', { code });

  for (const socket of [owner, phone, tv]) {
    const state = waitForEvent(socket, 'room:state');
    socket.emit('room:get-state', { code });
    assert.equal((await state).locale, 'ru');
  }
});

test('quiz accepts only the latest private answer before reveal', async (t) => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  const tv = await connect(url);
  const host = await connect(url);
  const player = await connect(url);

  t.after(async () => {
    [tv, host, player].forEach((socket) => socket.disconnect());
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  const created = await emitAck(tv, 'room:create', {
    playerId: 'quiz-tv', nickname: 'TV', role: 'tv',
  });
  const code = String(created.code);
  await emitAck(host, 'room:join', { code, playerId: 'quiz-host', nickname: 'Host', role: 'player' });
  await emitAck(player, 'room:join', { code, playerId: 'quiz-player', nickname: 'Player', role: 'player' });
  await emitAck(tv, 'tv:join', { code });
  host.emit('game:select', { code, gameType: 'quiz' });
  const started = waitForEvent(player, 'game:started', (value) => value.gameType === 'quiz');
  host.emit('game:start', { code });
  await started;

  let observed = waitForEvent(player, 'game:action', (value) => value.action === 'quiz:sync');
  host.emit('game:action', {
    code,
    action: 'quiz:config',
    payload: { phase: 'waiting', scores: {}, answers: {}, showCorrect: false },
  });
  await observed;
  observed = waitForEvent(player, 'game:action', (value) => value.action === 'quiz:sync');
  host.emit('game:action', { code, action: 'quiz:countdown', payload: { value: 3, questionIndex: 0 } });
  await observed;
  observed = waitForEvent(player, 'game:action', (value) => value.action === 'quiz:sync');
  host.emit('game:action', {
    code,
    action: 'quiz:start-question',
    payload: {
      questionIndex: 0,
      timeLeft: 20,
      question: {
        questionRu: 'Вопрос', questionEn: 'Question', correctIndex: 2,
        options: [{ ru: 'A', en: 'A' }, { ru: 'B', en: 'B' }, { ru: 'C', en: 'C' }, { ru: 'D', en: 'D' }],
      },
    },
  });
  await observed;

  let hostAnswer = waitForEvent(host, 'game:action', (value) => value.action === 'quiz:answer');
  let tvAnswer = waitForEvent(tv, 'game:action', (value) => value.action === 'quiz:answer');
  player.emit('game:action', {
    code, action: 'quiz:answer', payload: { playerId: 'quiz-player', answerIndex: 1 },
  });
  const firstHostEvent = await hostAnswer;
  const firstTvEvent = await tvAnswer;
  assert.equal((firstHostEvent.payload as EventPayload).answerIndex, 1);
  assert.equal((firstTvEvent.payload as EventPayload).answerIndex, -1);

  hostAnswer = waitForEvent(host, 'game:action', (value) => value.action === 'quiz:answer');
  tvAnswer = waitForEvent(tv, 'game:action', (value) => value.action === 'quiz:answer');
  player.emit('game:action', {
    code, action: 'quiz:answer', payload: { playerId: 'quiz-player', answerIndex: 2 },
  });
  const changedHostEvent = await hostAnswer;
  const changedTvEvent = await tvAnswer;
  assert.equal((changedHostEvent.payload as EventPayload).answerIndex, 2);
  assert.equal((changedTvEvent.payload as EventPayload).answerIndex, -1);

  const playerSnapshot = waitForEvent(player, 'game:action', (value) => value.action === 'quiz:sync');
  player.emit('game:action', { code, action: 'quiz:request-state', payload: {} });
  const privateState = (await playerSnapshot).payload as EventPayload;
  assert.deepEqual(privateState.answers, { 'quiz-player': 2 });

  const tvSnapshot = waitForEvent(tv, 'game:action', (value) => value.action === 'quiz:sync');
  tv.emit('game:action', { code, action: 'quiz:request-state', payload: {} });
  const publicState = (await tvSnapshot).payload as EventPayload;
  assert.deepEqual(publicState.answers, { 'quiz-player': -1 });
});

test('room player names are limited to ten characters before duplicate checks', async (t) => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  const owner = await connect(url);
  const player = await connect(url);
  const duplicate = await connect(url);

  t.after(async () => {
    [owner, player, duplicate].forEach((socket) => socket.disconnect());
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  const created = await emitAck(owner, 'room:create', {
    playerId: 'long-owner', nickname: 'ABCDEFGHIJKL', role: 'player',
  });
  const code = String(created.code);
  const joined = await emitAck(player, 'room:join', {
    code, playerId: 'long-player', nickname: '1234567890extra', role: 'player',
  });
  assert.equal(joined.success, true);

  const state = waitForEvent(owner, 'room:state');
  owner.emit('room:get-state', { code });
  const players = (await state).players as Array<{ id: string; nickname: string }>;
  assert.equal(players.find(({ id }) => id === 'long-owner')?.nickname, 'ABCDEFGHIJ');
  assert.equal(players.find(({ id }) => id === 'long-player')?.nickname, '1234567890');

  const rejected = await emitAck(duplicate, 'room:join', {
    code, playerId: 'duplicate-player', nickname: '1234567890other', role: 'player',
  });
  assert.equal(rejected.success, false);
  assert.equal(rejected.error, 'name-taken');
});

test('spy active player can pass the turn and a wrong spy guess ends the round', async (t) => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  const owner = await connect(url);
  const host = await connect(url);
  const active = await connect(url);
  const spy = await connect(url);

  t.after(async () => {
    [owner, host, active, spy].forEach((socket) => socket.disconnect());
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  const created = await emitAck(owner, 'room:create', { playerId: 'owner-spy-flow', nickname: 'TV', role: 'tv' });
  const code = String(created.code);
  await emitAck(host, 'room:join', { code, playerId: 'host', nickname: 'Host', role: 'player' });
  await emitAck(active, 'room:join', { code, playerId: 'active', nickname: 'Active', role: 'player' });
  await emitAck(spy, 'room:join', { code, playerId: 'spy', nickname: 'Spy', role: 'player' });
  await emitAck(owner, 'tv:join', { code });
  host.emit('game:select', { code, gameType: 'spy' });
  const started = waitForEvent(active, 'game:started', (value) => value.gameType === 'spy');
  host.emit('game:start', { code });
  await started;

  let observed = waitForEvent(active, 'game:action', (value) => value.action === 'spy:sync');
  host.emit('game:action', {
    code,
    action: 'spy:sync',
    payload: {
      phase: 'dealing', mode: 'guess', word: 'Аэропорт', spyId: 'spy',
      players: [
        { id: 'host', nickname: 'Host', isHost: true },
        { id: 'active', nickname: 'Active', isHost: false },
        { id: 'spy', nickname: 'Spy', isHost: false },
      ],
      playerOrder: ['host', 'active', 'spy'], playerOrderIdx: 0,
      guessAskerId: '', guessTargetId: '', guessCycleAnswered: [],
      readyPlayers: [], votes: {}, drawStrokes: [], timerLeft: 180, timerRunning: false,
    },
  });
  await observed;

  observed = waitForEvent(active, 'game:action', (value) => value.action === 'spy:sync');
  host.emit('game:action', {
    code,
    action: 'spy:sync',
    payload: {
      phase: 'playing', timerRunning: true,
      guessAskerId: 'active', guessTargetId: 'host', guessCycleAnswered: ['host'],
    },
  });
  await observed;

  const passed = waitForEvent(host, 'game:action', (value) => (
    value.action === 'spy:sync'
      && (value.payload as EventPayload).guessAskerId === 'host'
  ));
  active.emit('game:action', { code, action: 'spy:pass-turn', payload: {} });
  const passedState = (await passed).payload as EventPayload;
  assert.equal(passedState.guessAskerId, 'host');
  assert.notEqual(passedState.guessTargetId, 'host');

  const tvGuessing = waitForEvent(owner, 'game:action', (value) => (
    value.action === 'spy:sync' && (value.payload as EventPayload).phase === 'spyGuess'
  ));
  spy.emit('game:action', { code, action: 'spy:guess-start', payload: {} });
  const hiddenGuessingState = (await tvGuessing).payload as EventPayload;
  assert.equal(hiddenGuessingState.spyId, '');
  assert.equal(hiddenGuessingState.word, '');

  const tvResult = waitForEvent(owner, 'game:action', (value) => (
    value.action === 'spy:sync' && (value.payload as EventPayload).phase === 'roundResult'
  ));
  spy.emit('game:action', { code, action: 'spy:guess-try', payload: { text: 'Вокзал' } });
  const resultState = (await tvResult).payload as EventPayload;
  assert.equal(resultState.spyId, 'spy');
  assert.equal(resultState.word, 'Аэропорт');
  assert.deepEqual(resultState.roundResult, {
    spyCaught: true, exposedId: 'spy', voteCount: 0, viaGuess: true, guessedRight: false,
  });
});
