import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { reduceGameSnapshot } from '../server/game-security.mts';

type Stroke = { x1: number; y1: number; x2: number; y2: number; gestureId?: string };
type Action = { action: string; payload: Record<string, unknown> };
type Element = { type: string; props: Record<string, unknown>; children: Element[] };
type Slot = { value?: unknown; deps?: unknown[] };

const source = readFileSync(new URL('../app/game/[roomId]/spy/page.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('spy-page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'DrawCanvas');
assert.ok(component, 'The production DrawCanvas must be found');
const code = ts.transpileModule(`${component.getText(parsed)}; DrawCanvas;`, {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText;
let socketCallback = '';
let undoCallback = '';
function findCallbacks(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(parsed) === 'on'
    && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'game:action') {
    socketCallback = node.arguments[1].getText(parsed);
  }
  if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === 'handleUndo'
    && node.initializer && ts.isCallExpression(node.initializer)) {
    undoCallback = node.initializer.arguments[0].getText(parsed);
  }
  ts.forEachChild(node, findCallbacks);
}
findCallbacks(parsed);
assert.ok(socketCallback && undoCallback, 'Production socket and undo callbacks must be found');
const compileCallback = (callback: string) => ts.transpileModule(`(${callback})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

// Run the actual component handlers and dependency-driven effects with a fake canvas.
// This is a deterministic local reproduction, not browser or multiplayer QA.
function drawingPhone(restoredStrokes: Stroke[] = []) {
  const slots: Slot[] = [];
  let cursor = 0;
  let dirty = false;
  let effects: (() => void)[] = [];
  let strokes: Stroke[] = structuredClone(restoredStrokes);
  let serverState = { phase: 'playing', mode: 'draw', drawerId: 'drawer', drawStrokes: strokes };
  let phoneState: Record<string, unknown> = { ...serverState };
  let queued: Action[] = [];
  let deliveredDrawings: Stroke[][] = [];
  let tree: Element;
  const ctx = { scale() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} };
  const canvas = { width: 0, height: 0, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), getContext: () => ctx };
  const receive = runInNewContext(compileCallback(socketCallback), {
    isGameHost: false,
    sRef: { current: phoneState },
    setPeeking() {},
    setGuessInput() {},
    document: { getElementById: () => canvas },
    setS(update: (previous: Record<string, unknown>) => Record<string, unknown>) {
      phoneState = update(phoneState);
      strokes = phoneState.drawStrokes as Stroke[];
    },
  }) as (event: Action) => void;
  const sendAction = (action: string, payload: Record<string, unknown> = {}) => queued.push({ action, payload });
  const sendClear = () => sendAction('spy:clear');
  const onUndo = runInNewContext(compileCallback(undoCallback), { sendAction }) as (gestureId: string | undefined, strokeCount: number) => void;
  const changed = (slot: Slot, deps: unknown[]) => !slot.deps || deps.some((value, index) => !Object.is(value, slot.deps?.[index]));
  const renderComponent = runInNewContext(code, {
    useTranslation: () => ({ locale: 'ru' }),
    useRef(value: unknown) {
      const slot = slots[cursor] ??= { value: { current: value } };
      cursor++;
      return slot.value;
    },
    useState(value: unknown) {
      const slot = slots[cursor] ??= { value };
      cursor++;
      return [slot.value, (next: unknown) => {
        if (!Object.is(slot.value, next)) { slot.value = next; dirty = true; }
      }];
    },
    useCallback(callback: unknown, deps: unknown[]) {
      const slot = slots[cursor] ??= {};
      cursor++;
      if (changed(slot, deps)) { slot.value = callback; slot.deps = deps; }
      return slot.value;
    },
    useEffect(effect: () => void, deps: unknown[]) {
      const slot = slots[cursor] ??= {};
      cursor++;
      if (changed(slot, deps)) { effects.push(effect); slot.deps = deps; }
    },
    queueMicrotask: (callback: () => void) => effects.push(callback),
    React: { createElement(type: string, props: Record<string, unknown>, ...children: Element[]) {
      if (type === 'canvas') (props.ref as { current: unknown }).current = canvas;
      return { type, props: props ?? {}, children: children.flat() };
    } },
  }) as (props: unknown) => Element;
  const onStroke = (stroke: Stroke) => sendAction('spy:stroke', stroke);
  const onClear = sendClear;
  function render() {
    do {
      cursor = 0;
      dirty = false;
      tree = renderComponent({ canDraw: true, strokes, onStroke, onUndo, onClear });
      while (effects.length) {
        const pending = effects;
        effects = [];
        pending.forEach((effect) => effect());
      }
    } while (dirty);
  }
  function elements(node: Element): Element[] {
    if (!node || typeof node !== 'object') return [];
    return [node, ...node.children.flatMap(elements)];
  }
  function trigger(type: string, eventName: string, x = 0, y = 0, index = 0) {
    const target = elements(tree).filter((element) => element.type === type)[index];
    assert.ok(target, `Missing ${type}`);
    assert.notEqual(target.props.disabled, true, 'The action should be enabled');
    (target.props[eventName] as (event: unknown) => void)({
      clientX: x, clientY: y, preventDefault() {},
      ...(eventName.startsWith('onTouch') ? { touches: [{ clientX: x, clientY: y }] } : {}),
    });
    render();
  }
  function echo() {
    const actions = queued;
    queued = [];
    actions.forEach((event) => {
      serverState = reduceGameSnapshot('spy', serverState, event.action, event.payload) as typeof serverState;
      receive(event.action === 'spy:undo' ? { action: 'spy:sync', payload: structuredClone(serverState) } : event);
      render();
      deliveredDrawings.push(structuredClone(strokes));
    });
  }
  render();
  return {
    gesture(offset: number, echoWhileDrawing = true, touch = false) {
      trigger('canvas', touch ? 'onTouchStart' : 'onMouseDown', offset, offset);
      trigger('canvas', touch ? 'onTouchMove' : 'onMouseMove', offset + 5, offset + 5);
      if (echoWhileDrawing) echo();
      trigger('canvas', touch ? 'onTouchMove' : 'onMouseMove', offset + 10, offset + 10);
      if (echoWhileDrawing) echo();
      trigger('canvas', touch ? 'onTouchEnd' : 'onMouseUp');
      echo();
    },
    snapshot() {
      strokes = structuredClone(serverState.drawStrokes);
      phoneState = { ...phoneState, drawStrokes: strokes };
      render();
    },
    undo() { trigger('button', 'onClick'); echo(); return structuredClone(strokes); },
    clear() { trigger('button', 'onClick', 0, 0, 1); echo(); },
    get strokes() { return structuredClone(strokes); },
    get serverStrokes() { return structuredClone(serverState.drawStrokes); },
    startObserving() { deliveredDrawings = []; },
    get deliveredDrawings() { return deliveredDrawings; },
  };
}

test('undo removes the whole last gesture after stroke echoes and a full snapshot', () => {
  const phone = drawingPhone();
  phone.gesture(10);
  const firstGesture = phone.strokes;
  phone.gesture(50);
  phone.snapshot();
  assert.deepEqual(phone.undo(), firstGesture);
  assert.deepEqual(phone.serverStrokes, firstGesture);
  assert.deepEqual(phone.strokes, firstGesture);
});

test('undo without a full snapshot does not replay duplicate echoed segments', () => {
  const phone = drawingPhone();
  phone.gesture(10);
  const firstGesture = phone.strokes;
  phone.gesture(50);
  assert.deepEqual(phone.undo(), firstGesture);
});

test('successive undo removes successive gestures even after snapshot updates', () => {
  const phone = drawingPhone();
  phone.gesture(10, false);
  phone.gesture(50, false);
  phone.snapshot();
  phone.undo();
  phone.snapshot();
  assert.deepEqual(phone.undo(), []);
});

test('clear still empties the drawing and the next gesture remains undoable', () => {
  const phone = drawingPhone();
  phone.gesture(10);
  phone.clear();
  assert.deepEqual(phone.strokes, []);
  phone.gesture(50);
  phone.snapshot();
  assert.deepEqual(phone.undo(), []);
});

test('a restored phone can undo one whole gesture from the canonical drawing', () => {
  const original = drawingPhone();
  original.gesture(10);
  const firstGesture = original.strokes;
  original.gesture(50);
  const reconnected = drawingPhone(original.serverStrokes);
  assert.deepEqual(reconnected.undo(), firstGesture);
  assert.deepEqual(reconnected.serverStrokes, firstGesture);
});

test('separate gestures stay separate even if the second starts at the first endpoint', () => {
  const phone = drawingPhone();
  phone.gesture(10);
  const firstGesture = phone.strokes;
  phone.gesture(20);
  phone.snapshot();
  assert.deepEqual(phone.undo(), firstGesture);
});

test('legacy segments without gesture IDs remain readable and undoable', () => {
  const phone = drawingPhone([{ x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 }]);
  assert.deepEqual(phone.undo(), []);
});

test('touch gestures also undo as whole actions', () => {
  const phone = drawingPhone();
  phone.gesture(10, true, true);
  const firstGesture = phone.strokes;
  phone.gesture(50, true, true);
  phone.snapshot();
  assert.deepEqual(phone.undo(), firstGesture);
  assert.deepEqual(phone.serverStrokes, firstGesture);
});

test('undo is disabled after all gestures have been removed', () => {
  const phone = drawingPhone();
  phone.gesture(10);
  phone.undo();
  assert.throws(() => phone.undo(), /The action should be enabled/);
});

test('undo publishes the remaining drawing once without an intermediate empty canvas', () => {
  const phone = drawingPhone();
  phone.gesture(10);
  const expected = phone.strokes;
  phone.gesture(50);
  phone.startObserving();
  phone.undo();
  assert.deepEqual(phone.deliveredDrawings, [expected]);
});
