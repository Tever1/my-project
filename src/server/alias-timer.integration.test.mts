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

function waitForAliasTime(socket: ClientSocket, timeLeft: number): Promise<Payload> {
  return waitForEvent(socket, 'game:action', (value) => {
    if (value.action !== 'alias:state') return false;
    return (value.payload as Payload).timeLeft === timeLeft;
  });
}

test('Alias broadcasts every timer tick to phones and TV and keeps time monotonic across word changes', async (t) => {
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
  const playerThree = await connect(url);
  const playerFour = await connect(url);

  t.after(async () => {
    [tv, host, peer, playerThree, playerFour].forEach((socket) => socket.disconnect());
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  const created = await emitAck(tv, 'room:create', {
    playerId: 'alias-tv', nickname: 'TV', role: 'tv',
  });
  const code = String(created.code);
  await emitAck(host, 'room:join', { code, playerId: 'host', nickname: 'Host', role: 'player' });
  await emitAck(peer, 'room:join', { code, playerId: 'peer', nickname: 'Peer', role: 'player' });
  await emitAck(playerThree, 'room:join', { code, playerId: 'three', nickname: 'Three', role: 'player' });
  await emitAck(playerFour, 'room:join', { code, playerId: 'four', nickname: 'Four', role: 'player' });
  await emitAck(tv, 'tv:join', { code });

  host.emit('game:select', { code, gameType: 'alias' });
  const started = waitForEvent(peer, 'game:started', (value) => value.gameType === 'alias');
  host.emit('game:start', { code });
  await started;

  const base = {
    mode: 'classic',
    teams: [
      { id: 'team-1', name: 'One', playerIds: ['host', 'peer'], score: 0 },
      { id: 'team-2', name: 'Two', playerIds: ['three', 'four'], score: 0 },
    ],
    activeTeamIndex: 0,
    explainerIndex: 0,
    explainerIndices: [0, 0],
    currentWordIndex: 7,
    usedWordIndices: [7],
    timeLeft: 60,
    wordsGuessed: 0,
    wordsSkipped: 0,
    round: 1,
    totalRounds: 4,
    turnHistory: [],
    currentLetter: '',
  };

  for (const phase of ['teamSelect', 'teamName', 'waiting', 'explaining']) {
    const state = waitForAliasTime(peer, 60);
    host.emit('game:action', { code, action: 'alias:state', payload: { ...base, phase } });
    await state;
  }

  const peerTick = waitForAliasTime(peer, 59);
  const tvTick = waitForAliasTime(tv, 59);
  host.emit('game:action', { code, action: 'alias:tick', payload: { timeLeft: 59 } });
  await Promise.all([peerTick, tvTick]);

  const peerWordChange = waitForAliasTime(peer, 59);
  const tvWordChange = waitForAliasTime(tv, 59);
  host.emit('game:action', {
    code,
    action: 'alias:state',
    payload: { ...base, phase: 'explaining', currentWordIndex: 8, usedWordIndices: [7, 8], timeLeft: 60 },
  });
  await Promise.all([peerWordChange, tvWordChange]);

  const peerNextTick = waitForAliasTime(peer, 58);
  const tvNextTick = waitForAliasTime(tv, 58);
  host.emit('game:action', { code, action: 'alias:tick', payload: { timeLeft: 58 } });
  await Promise.all([peerNextTick, tvNextTick]);

  const overtimeState = waitForAliasTime(peer, 0);
  host.emit('game:action', {
    code,
    action: 'alias:state',
    payload: {
      ...base,
      phase: 'explaining',
      explainerIndices: [1, 0],
      currentWordIndex: 9,
      usedWordIndices: [7, 8, 9],
      timeLeft: 0,
      finalWordPending: true,
    },
  });
  await overtimeState;

  const awardAction = waitForEvent(host, 'game:action', (value) => value.action === 'alias:award-final-word');
  peer.emit('game:action', { code, action: 'alias:award-final-word', payload: { teamIndex: 1 } });
  const award = await awardAction;
  assert.equal((award.payload as Payload).teamIndex, 1);
  assert.equal((award.payload as Payload).resolvedWordIndex, 9);
});
