import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { Server as SocketIOServer } from 'socket.io';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { setupSocketHandlers } from './socket-handlers.mts';
import whoAmIFlow, { type WhoAmIFocusState } from '../lib/who-am-i-flow.ts';

const { getWhoAmIActivePlayerId, getWhoAmIPhoneFocus } = whoAmIFlow;

type EventPayload = Record<string, unknown>;

function whoState(event: EventPayload): EventPayload {
  const payload = event.payload as EventPayload;
  return payload.type === 'sync-state' ? payload.state as EventPayload : payload;
}

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

test('Who Am I assigns a connected judge when the requested player disconnected', async (t) => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;

  const tv = await connect(url);
  const guesser = await connect(url);
  const staleJudge = await connect(url);
  const connectedJudge = await connect(url);

  t.after(async () => {
    [tv, guesser, staleJudge, connectedJudge].forEach((socket) => socket.disconnect());
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  const created = await emitAck(tv, 'room:create', {
    playerId: 'who-tv', nickname: 'TV', role: 'tv',
  });
  const code = String(created.code);
  await emitAck(guesser, 'room:join', {
    code, playerId: 'guesser', nickname: 'Guesser', role: 'player',
  });
  await emitAck(staleJudge, 'room:join', {
    code, playerId: 'stale-judge', nickname: 'Stale', role: 'player',
  });
  await emitAck(connectedJudge, 'room:join', {
    code, playerId: 'connected-judge', nickname: 'Judge', role: 'player',
  });
  await emitAck(tv, 'tv:join', { code });

  guesser.emit('game:select', { code, gameType: 'who-am-i' });
  const started = waitForEvent(connectedJudge, 'game:started', (value) => value.gameType === 'who-am-i');
  guesser.emit('game:start', { code });
  await started;

  let judgeState = waitForEvent(connectedJudge, 'game:action', (value) => value.action === 'who-am-i');
  guesser.emit('game:action', {
    code,
    action: 'who-am-i',
    payload: {
      type: 'start-game',
      turnOrder: ['guesser', 'stale-judge', 'connected-judge'],
      characters: {
        guesser: { ru: 'Кот', en: 'Cat' },
        'stale-judge': { ru: 'Пёс', en: 'Dog' },
        'connected-judge': { ru: 'Лиса', en: 'Fox' },
      },
    },
  });
  await judgeState;

  judgeState = waitForEvent(connectedJudge, 'game:action', (value) => (
    value.action === 'who-am-i'
      && Boolean(whoState(value).guessNeedsConfirm)
  ));
  guesser.emit('game:action', {
    code,
    action: 'who-am-i',
    payload: { type: 'guess-try', playerId: 'guesser', guess: 'Тигр' },
  });
  await judgeState;

  const disconnected = waitForEvent(connectedJudge, 'room:state', (value) => (
    (value.players as EventPayload[]).some((player) => (
      player.id === 'stale-judge' && player.isConnected === false
    ))
  ));
  staleJudge.disconnect();
  await disconnected;

  judgeState = waitForEvent(connectedJudge, 'game:action', (value) => (
    value.action === 'who-am-i'
      && Boolean(whoState(value).guessAwaitingJudge)
  ));
  guesser.emit('game:action', {
    code,
    action: 'who-am-i',
    payload: {
      type: 'guess-confirm', playerId: 'guesser', judgeId: 'stale-judge',
    },
  });
  const assigned = whoState(await judgeState);

  assert.equal(assigned.guessJudgeId, 'connected-judge');
  assert.equal(assigned.guessPendingText, 'Тигр');

  let guesserState = waitForEvent(guesser, 'game:action', (value) => (
    value.action === 'who-am-i'
      && (value.payload as EventPayload).type === 'sync-state'
      && !Boolean(whoState(value).guessAwaitingJudge)
  ));
  connectedJudge.emit('game:action', {
    code,
    action: 'who-am-i',
    payload: { type: 'guess', playerId: 'guesser', guess: 'Тигр', correct: false },
  });
  await guesserState;

  // Reset the fixture before testing the separate no-connected-judge fallback.
  guesserState = waitForEvent(guesser, 'game:action', (value) => (
    value.action === 'who-am-i' && whoState(value).phase === 'playing'
      && whoState(value).currentTurnIndex === 0
  ));
  guesser.emit('game:action', { code, action: 'who-am-i', payload: { type: 'end-game' } });
  guesser.emit('game:action', {
    code, action: 'who-am-i', payload: {
      type: 'start-game', turnOrder: ['guesser', 'stale-judge', 'connected-judge'],
      characters: {
        guesser: { ru: 'Кот', en: 'Cat' },
        'stale-judge': { ru: 'Пёс', en: 'Dog' },
        'connected-judge': { ru: 'Лиса', en: 'Fox' },
      },
    },
  });
  await guesserState;

  const lastJudgeDisconnected = waitForEvent(guesser, 'room:state', (value) => (
    (value.players as EventPayload[]).some((player) => (
      player.id === 'connected-judge' && player.isConnected === false
    ))
  ));
  connectedJudge.disconnect();
  await lastJudgeDisconnected;

  guesserState = waitForEvent(guesser, 'game:action', (value) => (
    value.action === 'who-am-i'
      && Boolean(whoState(value).guessNeedsConfirm)
  ));
  guesser.emit('game:action', {
    code,
    action: 'who-am-i',
    payload: { type: 'guess-try', playerId: 'guesser', guess: 'Волк' },
  });
  await guesserState;

  guesserState = waitForEvent(guesser, 'game:action', (value) => (
    value.action === 'who-am-i'
      && (value.payload as EventPayload).type === 'sync-state'
      && !Boolean(whoState(value).guessNeedsConfirm)
      && !Boolean(whoState(value).guessAwaitingJudge)
  ));
  guesser.emit('game:action', {
    code,
    action: 'who-am-i',
    payload: { type: 'guess-confirm', playerId: 'guesser' },
  });
  await guesserState;
});

test('four-player Who Am I continues questions, disputes and guesses after the first correct answer', async (t) => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  const tv = await connect(url);
  const phones = new Map<string, ClientSocket>();
  for (const id of ['A', 'B', 'C', 'D']) phones.set(id, await connect(url));
  t.after(async () => {
    [tv, ...phones.values()].forEach((socket) => socket.disconnect());
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });
  const created = await emitAck(tv, 'room:create', { playerId: 'flow-tv', nickname: 'TV', role: 'tv' });
  const code = String(created.code);
  const tokens = new Map<string, string>();
  for (const [id, socket] of phones) {
    const joined = await emitAck(socket, 'room:join', { code, playerId: id, nickname: id, role: 'player' });
    assert.equal(joined.success, true);
    tokens.set(id, String(joined.reconnectToken));
  }
  await emitAck(tv, 'tv:join', { code });
  const host = phones.get('A')!;
  host.emit('game:select', { code, gameType: 'who-am-i' });
  const started = waitForEvent(tv, 'game:started');
  host.emit('game:start', { code });
  await started;

  const snapshot = async (socket: ClientSocket): Promise<EventPayload & WhoAmIFocusState> => {
    const response = waitForEvent(socket, 'game:action', (event) => (
      event.action === 'who-am-i' && event.from === 'server:snapshot'
    ));
    socket.emit('game:action', { code, action: 'who-am-i', payload: { type: 'request-state' } });
    return whoState(await response) as EventPayload & WhoAmIFocusState;
  };
  const act = async (id: string, payload: EventPayload) => {
    const socket = phones.get(id)!;
    socket.emit('game:action', { code, action: 'who-am-i', payload });
    return snapshot(socket);
  };
  await act('A', {
    type: 'start-game', turnOrder: [...phones.keys()],
    characters: Object.fromEntries([...phones.keys()].map((id) => [id, { ru: `Персонаж ${id}`, en: `Character ${id}` }])),
  });
  let state = await act('A', { type: 'guess-try', playerId: 'A', guess: 'Персонаж A' });
  assert.deepEqual(state.guessedPlayers, ['A']);
  assert.equal(getWhoAmIActivePlayerId(state), 'B');
  assert.equal(getWhoAmIActivePlayerId(await snapshot(tv)), 'B');

  state = await act('B', { type: 'ask-question', playerId: 'B', answer: 'yes' });
  assert.equal(state.consecutiveYesAnswers, 1);
  assert.equal((state.questionsAsked as EventPayload).B, 1);
  state = await act('B', { type: 'guess-try', playerId: 'B', guess: 'Неточное имя' });
  assert.equal(getWhoAmIPhoneFocus(state, 'B', true), 'confirm');
  assert.equal(state.guessAwaitingJudge, false);
  assert.equal(state.guessJudgeId, '');

  const recipients = [...phones.entries()];
  const deliveries = recipients.map(([, socket]) => waitForEvent(socket, 'game:action', (event) => (
    event.action === 'who-am-i' && whoState(event).guessAwaitingJudge === true
  )));
  state = await act('B', { type: 'guess-confirm', playerId: 'B' });
  const judgeId = state.guessJudgeId;
  assert.notEqual(judgeId, 'B');
  for (const [index, event] of (await Promise.all(deliveries)).entries()) {
    const id = recipients[index][0];
    const view = whoState(event) as EventPayload & WhoAmIFocusState;
    assert.equal(getWhoAmIPhoneFocus(view, id, true), id === judgeId ? 'judge' : 'main');
    assert.equal(view.guessPendingText, id === 'B' || id === judgeId ? 'Неточное имя' : '');
    if (id === judgeId) assert.deepEqual((view.characters as EventPayload).B, { ru: 'Персонаж B', en: 'Character B' });
  }
  const publicState = await snapshot(tv);
  assert.deepEqual(publicState.characters, {});
  assert.equal(publicState.guessPendingText, '');

  // A replacement socket must restore the pending judge screen, not just the room roster.
  phones.get(judgeId)!.disconnect();
  const reconnectedJudge = await connect(url);
  phones.set(judgeId, reconnectedJudge);
  const restored = waitForEvent(reconnectedJudge, 'game:action', (event) => event.from === 'server:reconnect');
  const joined = await emitAck(reconnectedJudge, 'room:join', {
    code, playerId: judgeId, nickname: judgeId, role: 'player', isReconnect: true, reconnectToken: tokens.get(judgeId),
  });
  assert.equal(joined.success, true);
  assert.equal(getWhoAmIPhoneFocus(whoState(await restored) as unknown as WhoAmIFocusState, judgeId, true), 'judge');
  state = await act(judgeId, { type: 'guess', playerId: 'B', guess: 'Неточное имя', correct: false });
  assert.equal(state.guessAwaitingJudge, false);
  assert.equal(getWhoAmIActivePlayerId(state), 'C');
  assert.equal(state.consecutiveYesAnswers, 0);
  assert.deepEqual(state.guessedPlayers, ['A']);
  for (const socket of [tv, ...phones.values()]) {
    const view = await snapshot(socket);
    assert.equal(getWhoAmIActivePlayerId(view), 'C');
    assert.equal(view.guessPendingText, '');
    assert.equal(view.guessAwaitingJudge, false);
  }
  // Neither a repeated verdict nor an old player's action may skip C's turn.
  state = await act(judgeId, { type: 'guess', playerId: 'B', guess: 'Неточное имя', correct: false });
  assert.equal(getWhoAmIActivePlayerId(state), 'C');
  state = await act('B', { type: 'next-turn' });
  assert.equal(getWhoAmIActivePlayerId(state), 'C');

  state = await act('C', { type: 'ask-question', playerId: 'C', answer: 'yes' });
  assert.equal((state.questionsAsked as EventPayload).C, 1);
  await act('C', { type: 'guess-try', playerId: 'C', guess: 'Альтернативное имя' });
  state = await act('C', { type: 'guess-confirm', playerId: 'C' });
  state = await act(state.guessJudgeId, { type: 'guess', playerId: 'C', guess: 'Альтернативное имя', correct: true });
  assert.deepEqual(state.guessedPlayers, ['A', 'C']);
  assert.equal(getWhoAmIActivePlayerId(state), 'D');
  state = await act('D', { type: 'guess-try', playerId: 'D', guess: 'Персонаж D' });
  assert.equal(getWhoAmIActivePlayerId(state), 'B');
  for (let count = 1; count <= 3; count += 1) {
    state = await act('B', { type: 'ask-question', playerId: 'B', answer: 'yes' });
    assert.equal(state.consecutiveYesAnswers, count);
  }
  state = await act('B', { type: 'next-turn' });
  assert.equal(state.consecutiveYesAnswers, 0);
  assert.equal(getWhoAmIActivePlayerId(state), 'B');
  state = await act('B', { type: 'guess-try', playerId: 'B', guess: 'Персонаж B' });
  assert.equal(state.phase, 'finished');
  assert.equal(new Set(state.guessedPlayers).size, 4);
  const finalTv = await snapshot(tv);
  assert.deepEqual(finalTv.characters, Object.fromEntries([...phones.keys()].map((id) => [id, { ru: `Персонаж ${id}`, en: `Character ${id}` }])));
  assert.equal(finalTv.guessPendingText, '');

  // A newly opened TV must receive the complete final results without live guess events.
  const resultTv = await connect(url);
  try {
    await emitAck(resultTv, 'tv:join', { code });
    assert.deepEqual((await snapshot(resultTv)).characters, finalTv.characters);
  } finally {
    resultTv.disconnect();
  }
});
