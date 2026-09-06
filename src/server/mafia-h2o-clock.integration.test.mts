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



test('Mafia and H2O publish server time without host ticks', async (t) => {
  for (const game of ['mafia', 'hundred-to-one']) {
    await t.test(game, async () => {
      const http = createServer();
      const io = new SocketIOServer(http, { path: '/api/socketio' });
      setupSocketHandlers(io);
      await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
      const address = http.address() as { port: number };
      const clients: ClientSocket[] = [];
      const join = async () => {
        const s = createClient('http://127.0.0.1:' + address.port, { path: '/api/socketio', transports: ['websocket'] });
        clients.push(s);
        await waitForEvent(s, 'connect');
        return s;
      };
      try {
        const tv = await join(), peer = await join();
        let host = await join();
        const created = await emitAck(tv, 'room:create', { playerId: 'tv', nickname: 'TV', role: 'tv' });
        const code = created.code;
        const hostJoin = await emitAck(host, 'room:join', { code, playerId: 'host', nickname: 'Host', role: 'player' });
        await emitAck(peer, 'room:join', { code, playerId: 'peer', nickname: 'Peer', role: 'player' });
        if (game === 'hundred-to-one') {
          const secondTeam = await join();
          await emitAck(secondTeam, 'room:join', { code, playerId: 'second', nickname: 'Second', role: 'player' });
        }
        await emitAck(tv, 'tv:join', { code });
        host.emit('game:select', { code, gameType: game });
        const started = waitForEvent(peer, 'game:started');
        host.emit('game:start', { code });
        await started;
        const action = game === 'mafia' ? 'mafia' : 'h2o:sync';
        const send = async (payload: Payload) => {
          const received = waitForEvent(peer, 'game:action', v => v.action === action);
          host.emit('game:action', { code, action, payload });
          await received;
        };
        if (game === 'mafia') {
          await send({ type: 'select-host', hostPlayerId: 'host' });
          await send({ type: 'assign-roles', hostPlayerId: 'host', roles: { peer: 'citizen' } });
          await send({ type: 'start-night', round: 1 });
          await send({ type: 'night-result', killedId: null, killedIds: [], savedIds: [], saved: false, lastDoctorSave: null, lastLoverVisit: null });
        } else {
          await send({ topicId: 'classic', phase: 'roleSelect', qState: {} });
          await send({ roles: { host: 'host' } });
          await send({ roles: { host: 'host', peer: 'team1', second: 'team2' } });
          await send({ phase: 'captainSelect' });
          await send({ captains: { team1: 'peer', team2: 'second' } });
          for (const phase of ['teamNames', 'title']) await send({ phase });
          await send({ phase: 'buzzer', buzzerCountdown: -1, r4Time: 60, r4Running: false });
          await send({ phase: 'playing' });
          await send({ r4Running: true });
        }
        const received = [tv, host, peer].map(s => waitForEvent(s, 'game:action', value => {
          const p = value.payload as Payload;
          return value.from === 'server:timer' && (game === 'mafia' ? p.value === 59 : p.r4Time === 59);
        }));
        await Promise.all(received);
        // No browser interval or explicit state request produced this tick.
        const whileDisconnected = [tv, peer].map(s => waitForEvent(s, 'game:action', value => {
          const p = value.payload as Payload;
          return value.from === 'server:timer' && (game === 'mafia' ? p.value === 58 : p.r4Time === 58);
        }));
        host.disconnect();
        await Promise.all(whileDisconnected);
        host = await join();
        await emitAck(host, 'room:join', {
          code, playerId: 'host', nickname: 'Host', role: 'player', reconnectToken: hostJoin.reconnectToken,
        });
        const restored = waitForEvent(host, 'game:action', value => {
          const p = value.payload as Payload;
          const remaining = game === 'mafia' ? (p.state as Payload)?.dayTimer : p.r4Time;
          return typeof remaining === 'number' && remaining <= 58 && remaining > 0;
        });
        host.emit('game:action', {
          code, action: game === 'mafia' ? 'mafia' : 'h2o:request-state', payload: { type: 'request-state' },
        });
        await restored;
        if (game !== 'mafia') {
          await send({ r4Reset: true });
          const state = waitForEvent(tv, 'game:action', v => (v.payload as Payload).r4Time === 60);
          tv.emit('game:action', { code, action: 'h2o:request-state', payload: {} });
          await state;
        }
      } finally {
        clients.forEach(s => s.disconnect());
        await io.close();
        http.close();
      }
    });
  }
});
