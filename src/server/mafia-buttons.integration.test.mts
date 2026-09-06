import { createServer } from 'node:http';
import test from 'node:test';
import { Server as SocketIOServer } from 'socket.io';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { setupSocketHandlers } from './socket-handlers.mts';
import { sanitizeSnapshot } from './game-security.mts';

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

test('Mafia blocked status is recipient-only and clears after night', () => {
  for (const role of ['doctor', 'detective', 'maniac', 'don']) {
    const state = { phase: 'night', roles: { actor: role, lover: 'lover', peer: 'citizen' },
      alive: ['actor', 'lover', 'peer'], loverVisit: 'actor' };
    const recipient = { playerId: 'actor', isTv: false, isGameHost: false, isMafiaHost: false };
    assert.equal(sanitizeSnapshot('mafia', state, recipient).abilityBlocked, true);
    assert.equal(sanitizeSnapshot('mafia', state, recipient).loverVisit, null);
    assert.equal(sanitizeSnapshot('mafia', state, { ...recipient, playerId: 'peer' }).abilityBlocked, false);
    assert.equal(sanitizeSnapshot('mafia', { ...state, phase: 'day' }, recipient).abilityBlocked, false);
    assert.equal(sanitizeSnapshot('mafia', { ...state, loverVisit: null }, recipient).abilityBlocked, false);
  }
});

test('Mafia internal button flow and recipient state', async () => {
  const http = createServer(), io = new SocketIOServer(http,{path:'/api/socketio'});
  setupSocketHandlers(io);
  await new Promise<void>(resolve=>http.listen(0,'127.0.0.1',resolve));
  const sockets: ClientSocket[] = [], failures: string[] = [];
  let checked=0;
  const connect=async()=>{
    const socket=createClient('http://127.0.0.1:'+(http.address() as {port:number}).port,{path:'/api/socketio',transports:['websocket']});
    sockets.push(socket); await waitForEvent(socket,'connect'); return socket;
  };
  try {
    const tv=await connect(), host=await connect();
    const {code}=await emitAck(tv,'room:create',{playerId:'tv',nickname:'TV',role:'tv'});
    await emitAck(host,'room:join',{code,playerId:'host',nickname:'Host',role:'player'});
    const roles: Record<string,string>={don:'don',maf:'mafia',doc:'doctor',det:'detective',lover:'lover',maniac:'maniac',c1:'citizen',c2:'citizen'};
    const players: Record<string,ClientSocket>={};
    for(const id of Object.keys(roles)){
      players[id]=await connect();
      await emitAck(players[id],'room:join',{code,playerId:id,nickname:id,role:'player'});
    }
    await emitAck(tv,'tv:join',{code});
    host.emit('game:select',{code,gameType:'mafia'});
    const start=waitForEvent(host,'game:started'); host.emit('game:start',{code}); await start;
    const snap=async(socket:ClientSocket)=>{
      const result=waitForEvent(socket,'game:action',v=>v.action==='mafia'&&v.from==='server:snapshot');
      socket.emit('game:action',{code,action:'mafia',payload:{type:'request-state'}});
      return ((await result).payload as Payload).state as Payload;
    };
    const check=(label:string,fn:()=>void)=>{
      checked++; try{fn();}catch(error){failures.push(label+': '+String(error));}
    };
    const action=async(label:string,socket:ClientSocket,payload:Payload,expected:Payload)=>{
      socket.emit('game:action',{code,action:'mafia',payload});
      await snap(socket);
      const state=await snap(host);
      check(label,()=>{for(const [key,value] of Object.entries(expected))assert.deepEqual(state[key],value);});
      return state;
    };
    const send=async(type:string,patch:Payload,expected:Payload)=>action(type,host,{type,...patch},expected);
    await send('select-host',{hostPlayerId:'host'},{hostPlayerId:'host'});
    await send('assign-roles',{hostPlayerId:'host',roles},{phase:'role-reveal',roles});
    for(const id of Object.keys(roles)) await action('see role '+id,players[id],{type:'role-seen',playerId:id},{phase:'role-reveal'});
    const publicState=await snap(tv);
    check('TV roles hidden',()=>assert.deepEqual(publicState.roles,{}));
    await send('start-night',{round:1},{phase:'night',nightStage:'mafia'});
    await action('citizen cannot vote as Mafia',players.c1,{type:'mafia-vote',voterId:'c1',targetId:'c2'},{mafiaVotes:{}});
    await action('Mafia target',players.maf,{type:'mafia-vote',voterId:'maf',targetId:'c1'},{mafiaVotes:{maf:'c1'}});
    await action('Don target',players.don,{type:'mafia-vote',voterId:'don',targetId:'c1'},{mafiaVotes:{maf:'c1',don:'c1'}});
    await send('advance-night-stage',{stage:'lover'},{nightStage:'lover'});
    await action('Lover visit',players.lover,{type:'lover-visit',loverId:'lover',targetId:'c2'},{loverVisit:'c2'});
    await send('advance-night-stage',{stage:'maniac'},{nightStage:'maniac'});
    await action('Maniac skips',players.maniac,{type:'maniac-kill',maniacId:'maniac',targetId:null},{maniacActed:true,maniacKill:null});
    await send('advance-night-stage',{stage:'doctor'},{nightStage:'doctor'});
    await action('Doctor confirms',players.doc,{type:'doctor-save',doctorId:'doc',targetId:'c1'},{doctorSave:'c1'});
    await action('Doctor changed confirmation rejected',players.doc,{type:'doctor-save',doctorId:'doc',targetId:'c2'},{doctorSave:'c1'});
    await action('restore doctor test input',players.doc,{type:'doctor-save',doctorId:'doc',targetId:'c1'},{doctorSave:'c1'});
    await send('advance-night-stage',{stage:'detective'},{nightStage:'detective'});
    await action('Detective confirms',players.det,{type:'detective-check',detectiveId:'det',targetId:'maf'},{detectiveCheck:'maf'});
    await action('Detective changed confirmation rejected',players.det,{type:'detective-check',detectiveId:'det',targetId:'c2'},{detectiveCheck:'maf'});
    await action('restore detective test input',players.det,{type:'detective-check',detectiveId:'det',targetId:'maf'},{detectiveCheck:'maf'});
    await send('advance-night-stage',{stage:'don'},{nightStage:'don'});
    const donState=await snap(players.don);
    // This is the target expression used by renderNightClub for the Don.
    const donTargets=[...(donState.alive as string[]), ...(donState.eliminated as {id:string}[]).map(({id})=>id)].filter(id=>id!=='don');
    check('Don button can target Detective',()=>assert.ok(donTargets.includes('det'),JSON.stringify(donTargets)));
    await action('Don check protocol',players.don,{type:'don-check-sheriff',donId:'don',targetId:'det'},{donCheck:'det'});
    await send('detective-result',{detectiveId:'det',role:'mafia'},{detectiveResult:'mafia'});
    await send('don-check-result',{donId:'don',targetId:'det',isDetective:true},{donCheckResult:true});
    await send('night-result',{killedId:null,killedIds:[],saved:true,savedIds:['c1'],lastDoctorSave:'c1',lastLoverVisit:'c2'},{phase:'day',dayTimer:60});
    const morningTv=await snap(tv);
    check('night result private on TV',()=>assert.equal(morningTv.detectiveResult,null));
    await send('start-voting',{}, {phase:'voting'});
    for(const id of Object.keys(roles)) await action('day vote '+id,players[id],{type:'cast-vote',voterId:id,targetId:'c2'},{phase:'voting'});
    await send('vote-alibi',{playerId:'c2'},{phase:'results',lastVoteResult:'alibi'});
    await send('start-night',{round:2},{phase:'night',round:2});
    await send('advance-night-stage',{stage:'lover'},{nightStage:'lover'});
    await action('Lover blocks doctor',players.lover,{type:'lover-visit',loverId:'lover',targetId:'doc'},{loverVisit:'doc'});
    await send('advance-night-stage',{stage:'maniac'},{nightStage:'maniac'});
    await send('advance-night-stage',{stage:'doctor'},{nightStage:'doctor'});
    const doctorState=await snap(players.doc);
    check('blocked Doctor UI condition',()=>assert.equal(doctorState.abilityBlocked,true));
    check('Doctor does not receive Lover target',()=>assert.equal(doctorState.loverVisit,null));
    const blockedTv=await snap(tv), blockedPeer=await snap(players.det);
    check('TV does not receive private blocked state',()=>assert.equal(blockedTv.abilityBlocked,false));
    check('Other player does not receive private blocked state',()=>assert.equal(blockedPeer.abilityBlocked,false));
    check('Don still cannot see Detective role',()=>assert.equal((donState.roles as Payload).det,undefined));
    await action('blocked Doctor action rejected',players.doc,{type:'doctor-save',doctorId:'doc',targetId:'c2'},{doctorSave:null});
    await send('advance-night-stage',{stage:'detective'},{nightStage:'detective'});
    await send('advance-night-stage',{stage:'don'},{nightStage:'don'});
    await send('night-result',{killedId:null,killedIds:[],saved:false,savedIds:[],lastDoctorSave:null,lastLoverVisit:'doc'},{phase:'day'});
    await send('start-voting',{}, {phase:'voting'});
    for(let round=1;round<=2;round++){
      await action('tie A '+round,players.c1,{type:'cast-vote',voterId:'c1',targetId:'maf'},{phase:'voting'});
      await action('tie B '+round,players.c2,{type:'cast-vote',voterId:'c2',targetId:'don'},{phase:'voting'});
      await send('vote-tie',{round:round+1,candidates:['maf','don']},{votingRound:round+1,votes:{}});
    }
    await action('pardon vote',players.c1,{type:'cast-vote',voterId:'c1',targetId:'pardon'},{votes:{c1:'pardon'}});
    await action('second day vote rejected',players.c1,{type:'cast-vote',voterId:'c1',targetId:'execute'},{votes:{c1:'pardon'}});
    await send('vote-pardoned',{playerIds:['maf','don']},{phase:'results',lastVoteResult:'pardoned'});
    await send('start-night',{round:3},{phase:'night',round:3});
    for (const stage of ['lover','maniac','doctor','detective','don'])
      await send('advance-night-stage',{stage},{nightStage:stage});
    await send('night-result',{killedId:null,killedIds:[],saved:false,savedIds:[],lastDoctorSave:null,lastLoverVisit:null},{phase:'day'});
    await send('start-voting',{}, {phase:'voting'});
    await action('elimination vote',players.c1,{type:'cast-vote',voterId:'c1',targetId:'maf'},{votes:{c1:'maf'}});
    await send('eliminate',{playerId:'maf',role:'mafia'},{phase:'results',lastVoteTargetIds:['maf']});
    const afterElimination=await snap(tv);
    check('day elimination role hidden on TV',()=>assert.equal((afterElimination.roles as Payload).maf,undefined));
    await send('end-game',{}, {phase:'lobby'});
    console.log(JSON.stringify({checked,failures},null,2));
    assert.deepEqual(failures,[]);
  } finally {sockets.forEach(s=>s.disconnect());await io.close();http.close();}
});
