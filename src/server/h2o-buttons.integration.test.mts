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

import assert from 'node:assert/strict';

test('H2O room host can advance roles when another player is the moderator', async () => {
  const http = createServer();
  const io = new SocketIOServer(http, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const port = (http.address() as { port: number }).port;
  const sockets: ClientSocket[] = [];
  try {
    for (let i = 0; i < 5; i++) {
      const socket = createClient(`http://127.0.0.1:${port}`, { path: '/api/socketio', transports: ['websocket'] });
      sockets.push(socket);
      await waitForEvent(socket, 'connect');
    }
    const [tv, roomHost, moderator, teammate, opponent] = sockets;
    const { code } = await emitAck(tv, 'room:create', { playerId: 'tv', nickname: 'TV', role: 'tv' });
    for (const [socket, id] of [[roomHost, 'room-host'], [moderator, 'moderator'], [teammate, 'teammate'], [opponent, 'opponent']] as const) {
      await emitAck(socket, 'room:join', { code, playerId: id, nickname: id, role: 'player' });
    }
    await emitAck(tv, 'tv:join', { code });
    roomHost.emit('game:select', { code, gameType: 'hundred-to-one' });
    const started = waitForEvent(roomHost, 'game:started');
    roomHost.emit('game:start', { code });
    await started;
    const snapshot = async (socket: ClientSocket) => {
      const response = waitForEvent(socket, 'game:action', value => value.action === 'h2o:sync' && value.from === 'server:snapshot');
      socket.emit('game:action', { code, action: 'h2o:request-state', payload: {} });
      return (await response).payload as Payload;
    };
    const send = async (socket: ClientSocket, payload: Payload) => {
      socket.emit('game:action', { code, action: 'h2o:sync', payload });
      return snapshot(socket);
    };
    await send(roomHost, { phase: 'roleSelect', topicId: 'classic', qState: [] });
    let roles: Payload = {};
    for (const [socket, id, role] of [[roomHost, 'room-host', 'team1'], [moderator, 'moderator', 'host'], [teammate, 'teammate', 'team1'], [opponent, 'opponent', 'team2']] as const) {
      roles = { ...roles, [id]: role };
      assert.deepEqual((await send(socket, { roles })).roles, roles);
    }
    const transition = { phase: 'captainSelect', captains: {}, captainConfirmed: { team1: false, team2: false } };
    assert.equal((await send(teammate, transition)).phase, 'roleSelect');
    assert.equal((await send(roomHost, { ...transition, t1s: 999 })).phase, 'roleSelect');
    const updates = sockets.map(socket => waitForEvent(socket, 'game:action', value => value.action === 'h2o:sync' && (value.payload as Payload)?.phase === 'captainSelect'));
    roomHost.emit('game:action', { code, action: 'h2o:sync', payload: transition });
    await Promise.all(updates);
    for (const socket of sockets) {
      const state = await snapshot(socket);
      assert.equal(state.phase, 'captainSelect');
      assert.deepEqual(state.roles, roles);
    }
    assert.equal((await send(roomHost, { phase: 'teamNames' })).phase, 'captainSelect');
    assert.equal((await send(roomHost, { t1s: 999 })).t1s === 999, false);
  } finally {
    sockets.forEach(socket => socket.disconnect());
    await io.close();
    http.close();
  }
});

test('H2O button protocol from team setup through replay', async () => {
  const http = createServer(), io = new SocketIOServer(http, { path: '/api/socketio' });
  setupSocketHandlers(io);
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const port = (http.address() as { port: number }).port;
  const sockets: ClientSocket[] = [], failures: string[] = [];
  let count = 0;
  const connect = async () => {
    const socket = createClient('http://127.0.0.1:' + port, { path: '/api/socketio', transports: ['websocket'] });
    sockets.push(socket); await waitForEvent(socket, 'connect'); return socket;
  };
  try {
    const tv = await connect(), host = await connect(), a = await connect(), b = await connect(), c = await connect();
    const { code } = await emitAck(tv, 'room:create', { playerId: 'tv', nickname: 'TV', role: 'tv' });
    for (const [socket, id] of [[host, 'host'], [a, 'a'], [b, 'b'], [c, 'c']] as const)
      await emitAck(socket, 'room:join', { code, playerId: id, nickname: id, role: 'player' });
    await emitAck(tv, 'tv:join', { code });
    host.emit('game:select', { code, gameType: 'hundred-to-one' });
    const started = waitForEvent(host, 'game:started'); host.emit('game:start', { code }); await started;
    const snapshot = async (socket: ClientSocket) => {
      const response = waitForEvent(socket, 'game:action', v => v.action === 'h2o:sync' && v.from === 'server:snapshot');
      socket.emit('game:action', { code, action: 'h2o:request-state', payload: {} });
      return (await response).payload as Payload;
    };
    const step = async (label: string, socket: ClientSocket, patch: Payload, expected: Payload) => {
      socket.emit('game:action', { code, action: 'h2o:sync', payload: patch });
      await snapshot(socket); // Same-socket ordering guarantees the action was processed.
      const state = await snapshot(host);
      count++;
      try { for (const [key, value] of Object.entries(expected)) assert.deepEqual(state[key], value, label + ': ' + key); }
      catch (error) { failures.push(label + ': ' + String(error)); }
      return state;
    };
    await step('choose topic', host, { phase: 'roleSelect', topicId: 'classic', qState: [] }, { phase: 'roleSelect' });
    let roles: Payload = {};
    for (const [socket, id, role] of [[host,'host','host'],[a,'a','team1'],[b,'b','team2'],[c,'c','team1']] as const) {
      roles = { ...roles, [id]: role };
      await step('choose role ' + id, socket, { roles }, { roles });
    }
    await step('captain selection', host, { phase:'captainSelect', captains:{}, captainConfirmed:{team1:false,team2:false} }, {phase:'captainSelect'});
    await step('captain one', a, {captains:{team1:'a'},captainConfirmed:{team1:true,team2:false}}, {captains:{team1:'a'}});
    await step('captain two', b, {captains:{team1:'a',team2:'b'},captainConfirmed:{team1:true,team2:true},phase:'teamNames',teamNameConfirmed:{team1:false,team2:false}}, {phase:'teamNames'});
    await step('name one', a, {t1n:'One',teamNameConfirmed:{team1:true,team2:false}}, {t1n:'One'});
    await step('name two / title', b, {t2n:'Two',teamNameConfirmed:{team1:true,team2:true},phase:'title'}, {phase:'title'});
    await step('unsupported title transition rejected', host, {phase:'teamNames'}, {phase:'title'});
    const board = Array.from({length:4},()=>Array.from({length:6},()=>({rev:false,pub:false,to:0})));
    const initial = {phase:'buzzer',topicId:'classic',curQ:0,t1n:'One',t2n:'Two',t1s:0,t2s:0,qState:board,
      roles,captains:{team1:'a',team2:'b'},captainConfirmed:{team1:true,team2:true},
      roundActiveTeam:[0,0,0],roundFund:[0,0,0],roundWonBy:[0,0,0],roundPhase:['start','start','start'],
      strikes:[[0,0],[0,0],[0,0]],roundBusted:[[false,false],[false,false],[false,false]],
      buzzerCountdown:-1,buzzerActive:false,buzzerWinner:0,r4Time:60,r4Running:false,
      bgPhase:0,bgP1Ans:[],bgP2Ans:[],bgP1Matched:[],bgP2Matched:[],bgFund:0,bgCurQ:0,
      bgTimeLeft:0,bgTimerTotal:0,bgTimerPaused:false,bgP1Id:'',bgP2Id:'',winTeam:0,players:[],
      teamNameConfirmed:{team1:false,team2:false}};
    await step('start',host,initial,{phase:'buzzer'});
    await step('buzzer countdown',host,{buzzerCountdown:3,buzzerActive:false,buzzerWinner:0},{buzzerCountdown:3});
    await new Promise(resolve=>setTimeout(resolve,3100));
    await step('captain buzzer',a,{buzzerWinner:1,buzzerActive:false},{buzzerWinner:1});
    await step('second buzzer rejected',b,{buzzerWinner:2,buzzerActive:false},{buzzerWinner:1});
    await step('host delayed transition',host,{phase:'playing',roundActiveTeam:[1,0,0]},{phase:'playing'});
    const revealed = structuredClone(board); revealed[0][0]={rev:true,pub:true,to:0};
    await step('reveal answer',host,{qState:revealed,roundFund:[25,0,0]},{qState:revealed,roundFund:[25,0,0]});
    await step('duplicate reveal snapshot',host,{qState:revealed,roundFund:[25,0,0]},{roundFund:[25,0,0]});
    await step('player cannot award scores',a,{t1s:999},{t1s:0});
    await step('close answer',host,{qState:board,roundFund:[0,0,0],t1s:0,t2s:0},{qState:board});
    await step('strike / transfer',host,{strikes:[[3,0],[0,0],[0,0]],roundPhase:['switched','start','start'],roundActiveTeam:[2,0,0]}, {roundActiveTeam:[2,0,0]});
    await step('cannot skip second team turn',host,{curQ:1,phase:'buzzer',buzzerWinner:0,buzzerActive:false,buzzerCountdown:-1},{phase:'playing',curQ:0});
    await step('bank award',host,{t2s:25,roundWonBy:[2,0,0],roundPhase:['won','start','start']},{t2s:25});
    for (let round=1;round<=3;round++) {
      await step('next round '+round,host,{curQ:round,phase:round===3?'r4rules':'buzzer',buzzerWinner:0,buzzerActive:false,buzzerCountdown:-1},{curQ:round,phase:round===3?'r4rules':'buzzer'});
      await step('enter round '+round,host,{phase:'playing'},{phase:'playing'});
    }
    await step('round4 start',host,{r4Running:true},{r4Running:true});
    await step('round4 pause',host,{r4Running:false},{r4Running:false});
    await step('round4 reset',host,{r4Reset:true},{r4Time:60,r4Running:false});
    await step('results',host,{phase:'results'},{phase:'results'});
    await step('Big Game',host,{phase:'bigGame',bgPhase:0,winTeam:1,bgP1Id:'',bgP2Id:'',bgP1Ans:[],bgP2Ans:[],bgP1Matched:[],bgP2Matched:[],bgFund:0,bgCurQ:0},{phase:'bigGame'});
    await step('choose finalists',a,{bgP1Id:'a',bgP2Id:'c'},{bgP1Id:'a',bgP2Id:'c'});
    for (const [phase, player, key, time] of [[1,a,'bgP1Ans',30],[3,c,'bgP2Ans',40]] as const) {
      await step('start finalist '+phase,host,{bgPhase:phase,bgCurQ:0,bgTimeLeft:time,bgTimerTotal:time,bgTimerPaused:false,[key]:[]},{bgPhase:phase,bgTimeLeft:time});
      await step('host cannot confirm readiness '+phase,host,{bgReady:true},{bgAwaitingReady:true,bgTimerPaused:true});
      await step('other finalist cannot confirm '+phase,player===a?c:a,{bgReady:true},{bgAwaitingReady:true});
      await new Promise(resolve=>setTimeout(resolve,1100));
      const waiting = await snapshot(player);
      assert.equal(waiting.bgTimeLeft,time);
      assert.equal(waiting.bgAwaitingReady,true);
      await step('answer before ready rejected '+phase,player,{bgCurQ:1,[key]:['early']},{bgCurQ:0});
      await step('confirm readiness '+phase,player,{bgReady:true},{bgAwaitingReady:false,bgTimerPaused:false});
      await new Promise(resolve=>setTimeout(resolve,1100));
      assert.ok(Number((await snapshot(player)).bgTimeLeft) < time);
      await step('duplicate readiness ignored '+phase,player,{bgReady:true},{bgAwaitingReady:false});
      await step('typing pause '+phase,player,{bgTimerPaused:true},{bgTimerPaused:true});
      await step('typing resume '+phase,player,{bgTimerPaused:false},{bgTimerPaused:false});
      for(let q=1;q<=5;q++) {
        const answers=Array.from({length:q},(_,i)=>'answer-'+phase+'-'+i);
        await step('answer '+phase+'/'+q,player,{bgCurQ:q,bgTimerPaused:false,[key]:answers,...(q===5?{bgTimeLeft:0}:{})},{bgCurQ:q,[key]:answers});
        if (q === 2) {
          await step('delayed previous answer '+phase,player,{bgCurQ:1,bgTimerPaused:false,[key]:answers.slice(0,1)},{bgCurQ:2,[key]:answers});
        }
      }
      await step('check finalist '+phase,host,{bgPhase:phase+1,bgTimeLeft:0,[key]:Array.from({length:5},(_,i)=>'answer-'+phase+'-'+i)},{bgPhase:phase+1});
      if (phase === 1) {
        const secondPlayerView = await snapshot(c);
        assert.deepEqual(secondPlayerView.bgP1Ans,[]);
        assert.deepEqual(secondPlayerView.bgP1Matched,[]);
      }
      await step('manual credit '+phase,host,{[phase===1?'bgP1Matched':'bgP2Matched']:['credited'],bgFund:phase*20},{bgFund:phase*20});
    }
    await step('final',host,{phase:'final',bgPhase:5},{phase:'final'});
    await step('replay',host,{...initial,phase:'topicSelect',roles:{},captains:{},captainConfirmed:{team1:false,team2:false}},{phase:'topicSelect',roles:{}});
    console.log(JSON.stringify({checked:count,failures},null,2));
    assert.deepEqual(failures,[]);
  } finally { sockets.forEach(s=>s.disconnect()); await io.close(); http.close(); }
});
