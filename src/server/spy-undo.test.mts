import assert from 'node:assert/strict';
import test from 'node:test';
import { canUndoSpyDrawing, reduceGameSnapshot, sanitizeSnapshot } from './game-security.mts';

const line = (gestureId: string, n: number) => ({ gestureId, x1: n / 10, y1: 0, x2: (n + 1) / 10, y2: 0 });
const first = [line('first', 0), line('first', 1)];
const second = [line('second', 3), line('second', 4)];
const snapshot = {
  phase: 'playing', mode: 'draw', drawerId: 'drawer',
  drawStrokes: [...first, ...second], spyId: 'spy', word: 'secret', votes: {},
};
const request = { gestureId: 'second', strokeCount: 4 };

test('only the current drawing player can undo the current complete gesture', () => {
  assert.equal(canUndoSpyDrawing(snapshot, request, 'drawer'), true);
  assert.equal(canUndoSpyDrawing(snapshot, request, 'other'), false);
  assert.equal(canUndoSpyDrawing(snapshot, request, ''), false);
  assert.equal(canUndoSpyDrawing({ ...snapshot, phase: 'voting' }, request, 'drawer'), false);
  assert.equal(canUndoSpyDrawing({ ...snapshot, mode: 'guess' }, request, 'drawer'), false);
});

test('invalid and stale requests cannot erase a different drawing', () => {
  for (const invalid of [
    {}, { ...request, strokeCount: 5 }, { ...request, strokeCount: '4' },
    { ...request, strokeCount: 0 }, { ...request, strokeCount: 2.5 },
    { ...request, gestureId: 'first' }, { ...request, gestureId: {} },
  ]) {
    assert.equal(canUndoSpyDrawing(snapshot, invalid, 'drawer'), false);
    assert.deepEqual(reduceGameSnapshot('spy', snapshot, 'spy:undo', invalid)?.drawStrokes, snapshot.drawStrokes);
  }
  assert.equal(canUndoSpyDrawing({ ...snapshot, drawStrokes: [] }, request, 'drawer'), false);
});

test('undo produces one canonical result and does not apply the same request twice', () => {
  const after = reduceGameSnapshot('spy', snapshot, 'spy:undo', request);
  assert.deepEqual(after?.drawStrokes, first);
  assert.deepEqual(reduceGameSnapshot('spy', after, 'spy:undo', request)?.drawStrokes, first);
  assert.deepEqual(snapshot.drawStrokes, [...first, ...second]);
});

test('TV and reconnect snapshots receive the complete remaining drawing without revealing secrets', () => {
  const after = reduceGameSnapshot('spy', snapshot, 'spy:undo', request);
  assert.ok(after);
  const tv = sanitizeSnapshot('spy', after, { playerId: null, isTv: true, isGameHost: false, isMafiaHost: false });
  assert.deepEqual(tv.drawStrokes, first);
  assert.equal(tv.word, '');
  assert.equal(tv.spyId, '');
});

test('undoing the last gesture empties the canvas intentionally and clear still clears all', () => {
  const one = { ...snapshot, drawStrokes: first };
  assert.deepEqual(reduceGameSnapshot('spy', one, 'spy:undo', { gestureId: 'first', strokeCount: 2 })?.drawStrokes, []);
  assert.deepEqual(reduceGameSnapshot('spy', snapshot, 'spy:clear', {})?.drawStrokes, []);
});

test('legacy drawing without gesture IDs can still undo its last segment', () => {
  const legacy = { ...snapshot, drawStrokes: [{ x1: 0, y1: 0, x2: 0.1, y2: 0 }] };
  assert.equal(canUndoSpyDrawing(legacy, { strokeCount: 1 }, 'drawer'), true);
  assert.deepEqual(reduceGameSnapshot('spy', legacy, 'spy:undo', { strokeCount: 1 })?.drawStrokes, []);
});

test('a gesture can be undone even if its final segment has not yet echoed to the phone', () => {
  assert.equal(canUndoSpyDrawing(snapshot, { ...request, strokeCount: 3 }, 'drawer'), true);
  assert.deepEqual(reduceGameSnapshot('spy', snapshot, 'spy:undo', { ...request, strokeCount: 3 })?.drawStrokes, first);
});
