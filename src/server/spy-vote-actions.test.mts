import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { actionMatchesGame, advanceTimedSnapshot, isRequestStateAction, isStateSyncAction, reduceGameSnapshot, validateStateSyncPhase } from './game-security.mts';

const source = readFileSync(new URL('./socket-handlers.mts', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('socket-handlers.mts', source, ts.ScriptTarget.Latest, true);
const names = ['isAuthorizedGameAction', 'materializeRoomSnapshot', 'actionTouchesGameClock', 'asRecord', 'finiteNumber', 'stringArray'];
const helpers = parsed.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text ?? ''));
assert.equal(helpers.length, names.length);
let callback = '';
function find(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(parsed) === 'socket.on'
    && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'game:action') {
    callback = node.arguments[1].getText(parsed);
  }
  ts.forEachChild(node, find);
}
find(parsed);
assert.ok(callback);
const code = ts.transpileModule(helpers.map((node) => node.getText(parsed)).join('\n') + `\n(${callback});`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function roomAt(elapsedMs: number, actor = 'c') {
  const players = ['a', 'b', 'c', 'spy'].map((id) => ({ id, socketId: id, role: 'player' }));
  const room = {
    currentGame: 'spy', gameStateUpdatedAt: 1000,
    players: new Map(players.map((player) => [player.id, player])),
    gameState: {
      phase: 'voting', voteTimerLeft: 60, voteTimerRunning: true,
      players, spyId: 'spy', votes: { a: 'spy', b: 'spy' },
    } as Record<string, unknown>,
  };
  const broadcasts: { state: Record<string, unknown>; exclude?: string }[] = [];
  const receive = runInNewContext(code, {
    Date: { now: () => 1000 + elapsedMs }, io: {}, socket: { id: actor },
    actionMatchesGame, advanceTimedSnapshot, isRequestStateAction, isStateSyncAction, reduceGameSnapshot, validateStateSyncPhase,
    getRoomByCode: () => room,
    socketBelongsToRoom: () => true,
    getPlayerBySocket: () => room.players.get(actor),
    isGameController: (_room: unknown, sender: { id: string }) => sender.id === 'b',
    roomSocketIds: () => players.map((player) => player.id),
    gameControllerSocketId: () => 'b',
    broadcastSnapshot: (_io: unknown, _room: unknown, _from: string, exclude?: string) => {
      broadcasts.push({ state: structuredClone(room.gameState), exclude });
    },
  }) as (data: { code: string; action: string; payload: Record<string, unknown> }) => void;
  return { room, broadcasts, receive };
}

test('the actual socket handler excludes a vote that arrives exactly at the deadline', () => {
  const h = roomAt(60000);
  h.receive({ code: 'TEST', action: 'spy:vote', payload: { voterId: 'c', suspectId: 'a' } });
  assert.equal(h.room.gameState.phase, 'roundResult');
  assert.deepEqual(h.room.gameState.votes, { a: 'spy', b: 'spy' });
  assert.equal(h.broadcasts.length, 1);
});

test('the actual socket handler still accepts a vote just before the deadline', () => {
  const h = roomAt(59999);
  h.receive({ code: 'TEST', action: 'spy:vote', payload: { voterId: 'c', suspectId: 'a' } });
  assert.equal(h.room.gameState.phase, 'voting');
  assert.deepEqual(h.room.gameState.votes, { a: 'spy', b: 'spy', c: 'a' });
  assert.equal(h.broadcasts.length, 1);
  assert.equal(h.broadcasts[0].exclude, undefined);
});

test('the host also receives the canonical result when its last timer patch arrives', () => {
  const h = roomAt(59999, 'b');
  h.receive({ code: 'TEST', action: 'spy:sync', payload: { voteTimerLeft: 0, voteTimerRunning: false } });
  assert.equal(h.room.gameState.phase, 'roundResult');
  assert.equal(h.broadcasts.at(-1)?.exclude, undefined);
});
