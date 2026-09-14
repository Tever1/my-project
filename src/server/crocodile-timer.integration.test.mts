import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { Server as SocketIOServer } from 'socket.io';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { setupSocketHandlers } from './socket-handlers.mts';
import { advanceTimedSnapshot, reduceGameSnapshot, validateStateSyncPhase } from './game-security.mts';

type Payload = Record<string, unknown>;

test('Crocodile preserves each turn result until continue, including the final turn', () => {
  const state = { phase: 'explaining', timeLeft: 60, turnNumber: 1, explainerIndex: 0,
    explainerId: 'host', playersOrder: ['host', 'peer'], usedWordIndices: [7],
    currentWordIndex: 7, wordsGuessed: 4, finishingRound: 1, scores: { host: 20, peer: 22 } };
  const nearlyDone = advanceTimedSnapshot('crocodile', state, 59)!;
  assert.equal(nearlyDone.timeLeft, 1);
  const result = advanceTimedSnapshot('crocodile', nearlyDone, 1)!;
  assert.equal(result.phase, 'turnResult');
  assert.equal(result.wordsGuessed, 4);
  assert.equal(result.explainerId, 'host');
  assert.deepEqual(advanceTimedSnapshot('crocodile', result, 600), result);
  assert.equal(validateStateSyncPhase('crocodile', result, { phase: 'ready' }), false);
  assert.equal(validateStateSyncPhase('crocodile', result, { wordsGuessed: 999 }), false);
  const ready = reduceGameSnapshot('crocodile', result, 'croc:continue', {})!;
  assert.equal(ready.phase, 'ready');
  assert.equal(ready.explainerId, 'peer');
  assert.equal(ready.timeLeft, 60);
  assert.notEqual(ready.currentWordIndex, 7);
  assert.equal(validateStateSyncPhase('crocodile', ready, state), false);
  assert.equal(ready.wordsGuessed, 0);
  assert.deepEqual(reduceGameSnapshot('crocodile', ready, 'croc:continue', {}), ready);
  const lastResult = advanceTimedSnapshot('crocodile', { ...ready, phase: 'explaining' }, 60)!;
  assert.equal(lastResult.phase, 'turnResult');
  const finished = reduceGameSnapshot('crocodile', lastResult, 'croc:continue', {})!;
  assert.equal(finished.phase, 'finished');
  assert.equal(finished.winnerId, 'peer');
  assert.equal(finished.timeLeft, 0);
});

test('Crocodile accepts play again after a multi-turn final and starts the fresh turn', () => {
  const finished = { phase: 'finished', turnNumber: 8, explainerId: 'peer', timeLeft: 0,
    currentWordIndex: 7, usedWordIndices: [7], scores: { host: 20, peer: 22 },
    wordsGuessed: 4, wordsSkipped: 2, finishingRound: 4, winnerId: 'peer' };
  const fresh = { phase: 'ready', turnNumber: 1, explainerIndex: 0, explainerId: 'host',
    playersOrder: ['host', 'peer'], currentWordIndex: 8, usedWordIndices: [8], timeLeft: 60,
    scores: { host: 0, peer: 0 }, wordsGuessed: 0, wordsSkipped: 0,
    finishingRound: null, winnerId: null };

  // This is the same state-sync gate used by the PLAY AGAIN button.
  assert.equal(validateStateSyncPhase('crocodile', finished, fresh), true);
  const ready = reduceGameSnapshot('crocodile', finished, 'croc:state', fresh)!;
  assert.deepEqual(ready, fresh);
  const explaining = reduceGameSnapshot('crocodile', ready, 'croc:start-turn', {})!;
  assert.equal(explaining.phase, 'explaining');
  assert.equal(explaining.timeLeft, 60);
  const guessed = reduceGameSnapshot('crocodile', explaining, 'croc:guessed', {})!;
  assert.equal((guessed.scores as Payload).host, 1);
  assert.equal(guessed.finishingRound, null);
  assert.equal(validateStateSyncPhase('crocodile', explaining, { ...fresh, turnNumber: 0 }), false);
});

function waitForEvent(
  socket: ClientSocket,
  event: string,
  predicate: (value: Payload) => boolean = () => true,
): Promise<Payload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, 1_500);
    const handler = (value: Payload) => {
      if (!predicate(value)) return;
      clearTimeout(timeout);
      socket.off(event, handler);
      resolve(value);
    };
    socket.on(event, handler);
  });
}

function emitAck(socket: ClientSocket, event: string, payload: Payload): Promise<Payload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event} acknowledgement`)), 1_500);
    socket.emit(event, payload, (response: Payload) => {
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

function waitForCrocTime(socket: ClientSocket, timeLeft: number): Promise<Payload> {
  return waitForEvent(socket, 'game:action', (value) => {
    if (value.action !== 'croc:state') return false;
    return (value.payload as Payload).timeLeft === timeLeft;
  });
}

test('Crocodile replay reaches host, peer and TV and accepts the new party actions', async (t) => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  const tv = await connect(url);
  const host = await connect(url);
  const peer = await connect(url);
  t.after(async () => {
    [tv, host, peer].forEach(socket => socket.disconnect());
    await io.close();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });
  const created = await emitAck(tv, 'room:create', { playerId: 'replay-tv', nickname: 'TV', role: 'tv' });
  const code = String(created.code);
  await emitAck(host, 'room:join', { code, playerId: 'host', nickname: 'Host', role: 'player' });
  await emitAck(peer, 'room:join', { code, playerId: 'peer', nickname: 'Peer', role: 'player' });
  await emitAck(tv, 'tv:join', { code });
  const send = (socket: ClientSocket, action: string, payload: Payload = {}) =>
    socket.emit('game:action', { code, action, payload });
  const stateFor = (socket: ClientSocket, phase: string) => waitForEvent(socket, 'game:action', value =>
    value.action === 'croc:state' && (value.payload as Payload).phase === phase);

  host.emit('game:select', { code, gameType: 'crocodile' });
  const started = waitForEvent(peer, 'game:started');
  host.emit('game:start', { code });
  await started;
  const seeded = stateFor(peer, 'ready');
  send(host, 'croc:state', {
    phase: 'ready', turnNumber: 8, explainerIndex: 1, explainerId: 'host',
    playersOrder: ['peer', 'host'], currentWordIndex: 7, usedWordIndices: [7],
    timeLeft: 60, scores: { host: 20, peer: 22 }, wordsGuessed: 0, wordsSkipped: 0,
    winnerId: null, finishingRound: 4,
  });
  await seeded;
  const explaining = stateFor(peer, 'explaining');
  send(host, 'croc:start-turn', { turnNumber: 8, currentWordIndex: 7 });
  await explaining;
  const turnResult = stateFor(peer, 'turnResult');
  const clockNow = Date.now;
  Date.now = () => clockNow() + 61_000;
  try { await turnResult; } finally { Date.now = clockNow; }
  const finished = stateFor(peer, 'finished');
  send(host, 'croc:continue', { turnNumber: 8 });
  await finished;

  const fresh: Payload = {
    phase: 'ready', turnNumber: 1, explainerIndex: 0, explainerId: 'host',
    playersOrder: ['host', 'peer'], currentWordIndex: 8, usedWordIndices: [8], timeLeft: 60,
    scores: { host: 0, peer: 0 }, wordsGuessed: 0, wordsSkipped: 0,
    finishingRound: null, winnerId: null,
  };
  const replayEvents = [peer, tv].map(socket => stateFor(socket, 'ready'));
  send(host, 'croc:state', fresh);
  for (const event of await Promise.all(replayEvents)) {
    const state = event.payload as Payload;
    assert.equal(state.turnNumber, 1);
    assert.deepEqual(state.scores, { host: 0, peer: 0 });
    assert.equal(state.finishingRound, null);
    assert.equal(state.currentWordIndex, -1);
  }
  const hostReady = stateFor(host, 'ready');
  send(host, 'croc:request-state');
  assert.deepEqual((await hostReady).payload, fresh);
  const newTurn = [host, peer, tv].map(socket => stateFor(socket, 'explaining'));
  send(host, 'croc:start-turn', { turnNumber: 1, currentWordIndex: 8 });
  for (const event of await Promise.all(newTurn)) assert.equal((event.payload as Payload).timeLeft, 60);
  const scored = waitForEvent(peer, 'game:action', value => value.action === 'croc:state'
    && ((value.payload as Payload).scores as Payload).host === 1);
  send(host, 'croc:guessed', { turnNumber: 1, currentWordIndex: 8 });
  assert.equal(((await scored).payload as Payload).wordsGuessed, 1);
});

test('Crocodile broadcasts every timer tick to phones and TV independently of swipes', async (t) => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;

  const tv = await connect(url);
  const host = await connect(url);
  const peer = await connect(url);

  t.after(async () => {
    [tv, host, peer].forEach((socket) => socket.disconnect());
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  const created = await emitAck(tv, 'room:create', {
    playerId: 'croc-tv', nickname: 'TV', role: 'tv',
  });
  const code = String(created.code);
  await emitAck(host, 'room:join', { code, playerId: 'host', nickname: 'Host', role: 'player' });
  await emitAck(peer, 'room:join', { code, playerId: 'peer', nickname: 'Peer', role: 'player' });
  await emitAck(tv, 'tv:join', { code });

  host.emit('game:select', { code, gameType: 'crocodile' });
  const started = waitForEvent(peer, 'game:started', (value) => value.gameType === 'crocodile');
  host.emit('game:start', { code });
  await started;

  let peerState = waitForCrocTime(peer, 60);
  host.emit('game:action', {
    code,
    action: 'croc:state',
    payload: {
      phase: 'ready', turnNumber: 1, explainerId: 'host', currentWordIndex: 7,
      usedWordIndices: [7], timeLeft: 60, scores: { host: 0, peer: 0 },
    },
  });
  await peerState;

  peerState = waitForCrocTime(peer, 60);
  host.emit('game:action', {
    code,
    action: 'croc:state',
    payload: {
      phase: 'explaining', turnNumber: 1, explainerId: 'host', currentWordIndex: 7,
      usedWordIndices: [7], timeLeft: 60, scores: { host: 0, peer: 0 },
    },
  });
  await peerState;

  const peerTick = waitForCrocTime(peer, 59);
  const tvTick = waitForCrocTime(tv, 59);
  // No browser tick: the server must wake and publish to all recipients.
  host.emit('game:action', { code, action: 'croc:tick', payload: { timeLeft: 0 } });
  const [peerTickState, tvTickState] = await Promise.all([peerTick, tvTick]);
  assert.equal((peerTickState.payload as Payload).timeLeft, 59);
  assert.equal((tvTickState.payload as Payload).timeLeft, 59);

  const peerSwipeState = waitForCrocTime(peer, 59);
  const tvSwipeState = waitForCrocTime(tv, 59);
  host.emit('game:action', {
    code,
    action: 'croc:state',
    payload: {
      phase: 'explaining', turnNumber: 1, explainerId: 'host', currentWordIndex: 8,
      usedWordIndices: [7, 8], timeLeft: 60, scores: { host: 1, peer: 0 },
    },
  });
  const [peerAfterSwipe, tvAfterSwipe] = await Promise.all([peerSwipeState, tvSwipeState]);
  assert.equal((peerAfterSwipe.payload as Payload).timeLeft, 59);
  assert.equal((tvAfterSwipe.payload as Payload).timeLeft, 59);

  const peerNextTick = waitForCrocTime(peer, 58);
  const tvNextTick = waitForCrocTime(tv, 58);
  host.disconnect();
  const [peerNextTickState, tvNextTickState] = await Promise.all([peerNextTick, tvNextTick]);
  assert.equal((peerNextTickState.payload as Payload).timeLeft, 58);
  assert.equal((tvNextTickState.payload as Payload).timeLeft, 58);
});

test('Crocodile resolves a swipe on the server when the host is unavailable', async (t) => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;

  const tv = await connect(url);
  const host = await connect(url);
  const peer = await connect(url);

  t.after(async () => {
    [tv, host, peer].forEach((socket) => socket.disconnect());
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  const created = await emitAck(tv, 'room:create', {
    playerId: 'croc-tv', nickname: 'TV', role: 'tv',
  });
  const code = String(created.code);
  await emitAck(host, 'room:join', { code, playerId: 'host', nickname: 'Host', role: 'player' });
  const peerJoin = await emitAck(peer, 'room:join', { code, playerId: 'peer', nickname: 'Peer', role: 'player' });
  await emitAck(tv, 'tv:join', { code });

  host.emit('game:select', { code, gameType: 'crocodile' });
  const started = waitForEvent(peer, 'game:started', (value) => value.gameType === 'crocodile');
  host.emit('game:start', { code });
  await started;

  const initialPeerState = waitForEvent(peer, 'game:action', (value) => {
    if (value.action !== 'croc:state') return false;
    const state = value.payload as Payload;
    return state.phase === 'ready' && state.currentWordIndex === 7;
  });
  host.emit('game:action', {
    code,
    action: 'croc:state',
    payload: {
      phase: 'ready', turnNumber: 1, explainerIndex: 1, explainerId: 'peer',
      playersOrder: ['host', 'peer'], currentWordIndex: 7, usedWordIndices: [7],
      timeLeft: 60, scores: { host: 0, peer: 0 }, wordsGuessed: 0, wordsSkipped: 0,
      winnerId: null, finishingRound: null,
    },
  });
  await initialPeerState;
  host.emit('player:away');

  const explainingState = waitForEvent(peer, 'game:action', (value) => {
    if (value.action !== 'croc:state') return false;
    const state = value.payload as Payload;
    return state.phase === 'explaining' && state.currentWordIndex === 7;
  });
  peer.emit('game:action', {
    code,
    action: 'croc:start-turn',
    payload: { turnNumber: 1, currentWordIndex: 7 },
  });
  await explainingState;

  const peerAfterSwipe = waitForEvent(peer, 'game:action', (value) => {
    if (value.action !== 'croc:state') return false;
    const state = value.payload as Payload;
    return state.currentWordIndex !== 7 && (state.scores as Payload).peer === 1;
  });
  const tvAfterSwipe = waitForEvent(tv, 'game:action', (value) => {
    if (value.action !== 'croc:state') return false;
    const state = value.payload as Payload;
    return (state.scores as Payload).peer === 1;
  });
  peer.emit('game:action', {
    code,
    action: 'croc:guessed',
    payload: { turnNumber: 1, currentWordIndex: 7 },
  });

  const [peerState, tvState] = await Promise.all([peerAfterSwipe, tvAfterSwipe]);
  assert.notEqual((peerState.payload as Payload).currentWordIndex, 7);
  assert.equal(((peerState.payload as Payload).scores as Payload).peer, 1);
  assert.equal((peerState.payload as Payload).wordsGuessed, 1);
  assert.equal((tvState.payload as Payload).currentWordIndex, -1);

  const canonicalAfterDuplicate = waitForEvent(peer, 'game:action', (value) => value.action === 'croc:state');
  peer.emit('game:action', {
    code,
    action: 'croc:guessed',
    payload: { turnNumber: 1, currentWordIndex: 7 },
  });
  peer.emit('game:action', { code, action: 'croc:request-state', payload: {} });
  const duplicateState = (await canonicalAfterDuplicate).payload as Payload;
  assert.equal((duplicateState.scores as Payload).peer, 1);
  assert.equal(duplicateState.wordsGuessed, 1);
  assert.equal(duplicateState.currentWordIndex, (peerState.payload as Payload).currentWordIndex);

  const clockNow = Date.now;
  const resultEvents = [peer, tv].map(socket => waitForEvent(socket, 'game:action', value =>
    value.action === 'croc:state' && (value.payload as Payload).phase === 'turnResult'));
  Date.now = () => clockNow() + 61_000;
  let results: Payload[];
  try { results = await Promise.all(resultEvents); } finally { Date.now = clockNow; }
  assert.equal((results[0].payload as Payload).wordsGuessed, 1);
  assert.equal((results[1].payload as Payload).currentWordIndex, -1);

  // The host cannot dismiss another player's result or replace it with old state.
  host.emit('game:action', { code, action: 'croc:continue', payload: { turnNumber: 1 } });
  host.emit('game:action', { code, action: 'croc:state', payload: { ...duplicateState, phase: 'ready' } });
  const hostSnapshot = waitForEvent(host, 'game:action', value => value.action === 'croc:state');
  host.emit('game:action', { code, action: 'croc:request-state', payload: {} });
  assert.equal(((await hostSnapshot).payload as Payload).phase, 'turnResult');

  peer.emit('game:action', { code, action: 'croc:continue', payload: { turnNumber: 0 } });
  const restored = waitForEvent(peer, 'game:action', value => value.action === 'croc:state');
  peer.emit('game:action', { code, action: 'croc:request-state', payload: {} });
  assert.equal(((await restored).payload as Payload).wordsGuessed, 1);

  peer.disconnect();
  const reconnected = await connect(url);
  t.after(() => { reconnected.disconnect(); });
  const resultAfterReconnect = waitForEvent(reconnected, 'game:action', value => value.action === 'croc:state');
  const joined = await emitAck(reconnected, 'room:join', {
    code, playerId: 'peer', nickname: 'Peer', role: 'player', reconnectToken: peerJoin.reconnectToken,
  });
  assert.equal(joined.success, true);
  reconnected.emit('game:action', { code, action: 'croc:request-state', payload: {} });
  const recovered = (await resultAfterReconnect).payload as Payload;
  assert.equal(recovered.phase, 'turnResult');
  assert.equal(recovered.wordsGuessed, 1);

  const nextEvents = [reconnected, tv].map(socket => waitForEvent(socket, 'game:action', value =>
    value.action === 'croc:state' && (value.payload as Payload).phase === 'ready'));
  reconnected.emit('game:action', { code, action: 'croc:continue', payload: { turnNumber: 1 } });
  for (const value of await Promise.all(nextEvents)) {
    const next = value.payload as Payload;
    assert.equal(next.turnNumber, 2);
    assert.equal(next.explainerId, 'host');
    assert.equal(next.wordsGuessed, 0);
    assert.equal((next.scores as Payload).peer, 1);
  }
});
