import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import { setupSocketHandlers } from './socket-handlers.mts';

type State = Record<string, unknown>;

// Regression coverage for the four defects discovered in TASK-508.
test('H2O transitions preserve separate controllers and merge stale confirmations', async () => {
  const http = createServer();
  const server = new Server(http, { path: '/api/socketio' });
  setupSocketHandlers(server);
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const port = (http.address() as { port: number }).port;
  const sockets: Socket[] = [];
  const event = (socket: Socket, name: string, predicate: (data: State) => boolean = () => true) => new Promise<State>((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off(name, handler); reject(new Error(`Timeout: ${name}`)); }, 1500);
    const handler = (data: State) => {
      if (!predicate(data)) return;
      clearTimeout(timeout);
      socket.off(name, handler);
      resolve(data);
    };
    socket.on(name, handler);
  });
  const ack = (socket: Socket, name: string, data: State) => new Promise<State>((resolve, reject) => {
    socket.timeout(1500).emit(name, data, (error: Error | null, response: State) => error ? reject(error) : resolve(response));
  });
  try {
    for (let i = 0; i < 5; i++) {
      const socket = connect(`http://127.0.0.1:${port}`, { path: '/api/socketio', transports: ['websocket'] });
      sockets.push(socket);
      await event(socket, 'connect');
    }
    const [tv, owner, moderator, a, b] = sockets;
    const { code } = await ack(tv, 'room:create', { playerId: 'tv', nickname: 'TV', role: 'tv' });
    for (const [socket, id] of [[owner, 'owner'], [moderator, 'moderator'], [a, 'a'], [b, 'b']] as const) {
      await ack(socket, 'room:join', { code, playerId: id, nickname: id, role: 'player' });
    }
    await ack(tv, 'tv:join', { code });
    owner.emit('game:select', { code, gameType: 'hundred-to-one' });
    const started = event(owner, 'game:started');
    owner.emit('game:start', { code });
    await started;
    const snapshot = async (socket: Socket) => {
      const response = event(socket, 'game:action', data => data.action === 'h2o:sync' && data.from === 'server:snapshot');
      socket.emit('game:action', { code, action: 'h2o:request-state', payload: {} });
      return (await response).payload as State;
    };
    const send = async (socket: Socket, payload: State) => {
      socket.emit('game:action', { code, action: 'h2o:sync', payload });
      return snapshot(socket);
    };
    const phaseForAll = async (phase: string) => {
      for (const socket of sockets) assert.equal((await snapshot(socket)).phase, phase);
    };
    await send(owner, { phase: 'roleSelect', topicId: 'classic', qState: [] });
    let roles: State = {};
    for (const [socket, id, role] of [[owner, 'owner', 'team1'], [moderator, 'moderator', 'host'], [a, 'a', 'team1'], [b, 'b', 'team2']] as const) {
      roles = { ...roles, [id]: role };
      assert.deepEqual((await send(socket, { roles })).roles, roles);
    }
    const captains = { phase: 'captainSelect', captains: {}, captainConfirmed: { team1: false, team2: false } };
    await send(owner, captains);
    await phaseForAll('captainSelect');

    // Both teams built their payloads from the same initial snapshot.
    await send(a, { captains: { team1: 'a' }, captainConfirmed: { team1: true, team2: false } });
    const mergedCaptain = await send(b, { captains: { team2: 'b' }, captainConfirmed: { team1: false, team2: true } });
    assert.deepEqual(mergedCaptain.captains, { team1: 'a', team2: 'b' });
    await phaseForAll('teamNames');
    await send(a, { t1n: 'One', teamNameConfirmed: { team1: true, team2: false } });
    const mergedName = await send(b, { t2n: 'Two', teamNameConfirmed: { team1: false, team2: true } });
    assert.deepEqual(mergedName.teamNameConfirmed, { team1: true, team2: true });
    assert.equal(mergedName.t1n, 'One');
    assert.equal(mergedName.t2n, 'Two');
    await phaseForAll('title');

    // The UI offers START GAME to both the room host and the moderator.
    assert.equal((await send(a, { phase: 'buzzer' })).phase, 'title');
    assert.equal((await send(owner, { phase: 'buzzer' })).phase, 'buzzer');
    await phaseForAll('buzzer');

    // Re-enter setup through existing legal moderator transitions.
    await send(moderator, { phase: 'topicSelect' });
    await send(owner, { phase: 'roleSelect', topicId: 'classic', qState: [] });
    await send(owner, captains);
    await send(moderator, { teamNameConfirmed: { team1: false, team2: false } });
    await send(moderator, { phase: 'teamNames' });
    const skipped = await snapshot(moderator);
    assert.deepEqual(skipped.captains, {});
    await phaseForAll('captainSelect');
    // A forged foreign-team entry is ignored, never applied to that team.
    const first = await send(a, { captains: { team1: 'a', team2: 'a' }, captainConfirmed: { team1: true, team2: true }, phase: 'teamNames' });
    assert.deepEqual(first.captains, { team1: 'a' });
    await phaseForAll('captainSelect');
    await send(moderator, { phase: 'teamNames' });
    await phaseForAll('captainSelect');
    await send(b, { captains: { team2: 'b' }, captainConfirmed: { team1: false, team2: true } });
    await phaseForAll('teamNames');
  } finally {
    sockets.forEach(socket => socket.disconnect());
    await server.close();
    http.close();
  }
});
