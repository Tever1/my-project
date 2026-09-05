import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { Server as SocketIOServer } from 'socket.io';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { setupSocketHandlers } from './socket-handlers.mts';

type Payload = Record<string, unknown>;

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
  host.emit('game:action', { code, action: 'croc:tick', payload: { timeLeft: 59 } });
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
  host.emit('game:action', { code, action: 'croc:tick', payload: { timeLeft: 58 } });
  const [peerNextTickState, tvNextTickState] = await Promise.all([peerNextTick, tvNextTick]);
  assert.equal((peerNextTickState.payload as Payload).timeLeft, 58);
  assert.equal((tvNextTickState.payload as Payload).timeLeft, 58);
});
