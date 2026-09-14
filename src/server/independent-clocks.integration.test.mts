import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { Server } from 'socket.io';
import { io as client, type Socket } from 'socket.io-client';
import { setupSocketHandlers } from './socket-handlers.mts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>; // Test protocol fixtures span several game schemas.
const event = (s: Socket, name: string, match: (v: Data) => boolean = () => true): Promise<Data> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { s.off(name, handler); reject(new Error(`Missing ${name}`)); }, 2500);
  const handler = (v: Data) => { if (match(v)) { clearTimeout(timer); s.off(name, handler); resolve(v); } };
  s.on(name, handler);
});
const ack = (s: Socket, name: string, data: Data): Promise<Data> => new Promise(resolve => s.emit(name, data, resolve));

for (const variant of ['quiz', 'spy', 'alias', 'alias-classic']) test(`${variant}: server ticks and expires with disconnected host`, async () => {
  const game = variant === 'alias-classic' ? 'alias' : variant;
  const http = createServer(), io = new Server(http, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const sockets: Socket[] = [];
  const connect = async () => {
    const s = client(`http://127.0.0.1:${(http.address() as {port:number}).port}`, { path: '/api/socketio', transports: ['websocket'] });
    sockets.push(s); await event(s, 'connect'); return s;
  };
  try {
    const tv = await connect(), host = await connect(), peer = await connect();
    const { code } = await ack(tv, 'room:create', { playerId:'tv', nickname:'TV', role:'tv' });
    await ack(host, 'room:join', { code, playerId:'host', nickname:'Host', role:'player' });
    await ack(peer, 'room:join', { code, playerId:'peer', nickname:'Peer', role:'player' });
    await ack(tv, 'tv:join', { code });
    host.emit('game:select', { code, gameType:game });
    const started = event(peer, 'game:started'); host.emit('game:start', { code }); await started;
    const action = game === 'quiz' ? 'quiz:sync' : game === 'spy' ? 'spy:sync' : 'alias:state';
    let aliasState: Data = {};
    const send = async (name:string, payload:Data) => {
      if (game === 'alias') { aliasState = { ...aliasState, ...payload }; payload = aliasState; }
      const received = event(peer, 'game:action', v => v.action === action);
      host.emit('game:action', { code, action:name, payload }); await received;
    };
    if (game === 'quiz') {
      await send('quiz:config', { phase:'waiting', scores:{}, questionQueue:[{questionRu:'Вопрос',questionEn:'Question',options:['a','b'],correctIndex:0,timeLimit:2}] });
      await send('quiz:countdown', { value:3, questionIndex:0 });
    } else if (game === 'spy') {
      await send(action, { phase:'dealing', mode:'text', spyId:'host', word:'secret', playersOrder:['host','peer'], votes:{} });
      await send(action, { phase:'playing', timerLeft:3, timerRunning:true });
    } else {
      await send(action, { phase:'modeSelect', mode:variant === 'alias-classic' ? 'classic' : 'letter' });
      await send(action, { phase:variant === 'alias-classic' ? 'teamSelect' : 'individualSetup' });
      await send(action, { phase:variant === 'alias-classic' ? 'teamName' : 'letterRule', teams:[{id:'host',playerIds:['host'],score:0},{id:'peer',playerIds:['peer'],score:0}], activeTeamIndex:0, explainerIndices:[0,0], round:1 });
      await send(action, { phase:'waiting' });
      await send(action, { phase:'explaining', timeLeft:3, wordsGuessed:2, wordsSkipped:0 });
    }
    const key = game === 'quiz' ? 'countdownValue' : game === 'spy' ? 'timerLeft' : 'timeLeft';
    const ticks = [tv,peer].map(s => event(s, 'game:action', v => v.from === 'server:timer' && v.payload[key] === 2));
    host.disconnect();
    await Promise.all(ticks);
    const expiry = [tv,peer].map(s => event(s, 'game:action', v => v.from === 'server:timer' && (game === 'quiz' ? v.payload.showCorrect === true : variant === 'alias-classic' ? v.payload.phase === 'explaining' && v.payload.timeLeft === 0 : v.payload.phase === (game === 'spy' ? 'discussion' : 'turnResult'))));
    const now = Date.now; Date.now = () => now() + 6000;
    try { const states = await Promise.all(expiry); assert.equal(states[0].payload.phase, states[1].payload.phase); }
    finally { Date.now = now; }
  } finally { sockets.forEach(s => s.disconnect()); await io.close(); http.close(); }
});

test('quiz: only the server may leave a revealed result, while mid-leaderboard Continue remains host-controlled', async () => {
  const http = createServer(), io = new Server(http, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const sockets: Socket[] = [];
  const connect = async () => {
    const socket = client(`http://127.0.0.1:${(http.address() as {port:number}).port}`, { path: '/api/socketio', transports: ['websocket'] });
    sockets.push(socket); await event(socket, 'connect'); return socket;
  };
  try {
    const tv = await connect(), host = await connect(), peer = await connect();
    const { code } = await ack(tv, 'room:create', { playerId:'tv', nickname:'TV', role:'tv' });
    await ack(host, 'room:join', { code, playerId:'host', nickname:'Host', role:'player' });
    await ack(peer, 'room:join', { code, playerId:'peer', nickname:'Peer', role:'player' });
    await ack(tv, 'tv:join', { code });
    host.emit('game:select', { code, gameType:'quiz' });
    const started = event(peer, 'game:started'); host.emit('game:start', { code }); await started;
    const question = (index:number) => ({ questionRu:`Вопрос ${index}`, questionEn:`Question ${index}`, options:['a','b'], correctIndex:0, timeLimit:20 });
    const send = async (action:string, payload:Data) => {
      const received = event(peer, 'game:action', value => value.action === 'quiz:sync');
      host.emit('game:action', { code, action, payload });
      await received;
    };
    const snapshot = async () => {
      const received = event(host, 'game:action', value => value.action === 'quiz:sync' && value.from === 'server:snapshot');
      host.emit('game:action', { code, action:'quiz:request-state', payload:{} });
      return (await received).payload;
    };

    await send('quiz:config', { phase:'waiting', totalQuestions:7, scores:{}, questionQueue:Array.from({ length:7 }, (_, index) => question(index)) });
    await send('quiz:countdown', { value:3, questionIndex:0 });
    await send('quiz:start-question', { questionIndex:0, timeLeft:20, question:question(0) });
    await send('quiz:sync', { phase:'mid-leaderboard' });
    await send('quiz:start-question', { questionIndex:1, timeLeft:20, question:question(1) });
    assert.equal((await snapshot()).questionIndex, 1);

    await send('quiz:show-results', {});
    const reveal = await snapshot();
    assert.equal(reveal.phase, 'question');
    assert.equal(reveal.showCorrect, true);
    for (const [action, payload] of [
      ['quiz:start-question', { questionIndex:2, timeLeft:20, question:question(2) }],
      ['quiz:final', {}],
      ['quiz:sync', { phase:'mid-leaderboard' }],
    ] as const) {
      host.emit('game:action', { code, action, payload });
      await new Promise(resolve => setTimeout(resolve, 20));
      const state = await snapshot();
      assert.equal(state.phase, 'question');
      assert.equal(state.questionIndex, 1);
      assert.equal(state.showCorrect, true);
    }
  } finally { sockets.forEach(socket => socket.disconnect()); await io.close(); http.close(); }
});
