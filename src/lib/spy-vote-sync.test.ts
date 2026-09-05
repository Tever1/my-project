import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the production socket callback without opening a browser or a live room.
const source = readFileSync(new URL('../app/game/[roomId]/spy/page.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('spy-page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callbackSource = '';
function findSocketCallback(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(parsed) === 'on'
    && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'game:action') {
    callbackSource = node.arguments[1].getText(parsed);
  }
  ts.forEachChild(node, findSocketCallback);
}
findSocketCallback(parsed);
assert.ok(callbackSource, 'The production game:action callback must be found');
const callbackJs = ts.transpileModule(`(${callbackSource})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function votingPhone(phase = 'voting', hasVoted = false) {
  let state: Record<string, unknown> = { phase, currentRound: 1, votes: {}, voteTimerLeft: 60 };
  let selection: string | null = 'suspect';
  let submitted = hasVoted;
  const sRef = { current: state };
  const receive = runInNewContext(callbackJs, {
    sRef,
    isGameHost: false,
    setLocalVote: (value: string | null) => { selection = value; },
    setHasVoted: (value: boolean) => { submitted = value; },
    setPeeking: () => {},
    setGuessInput: () => {},
    setS: (update: (previous: Record<string, unknown>) => Record<string, unknown>) => {
      state = update(state);
    },
  }) as (event: { action: string; payload: Record<string, unknown> }) => void;
  return {
    sync(patch: Record<string, unknown>) {
      receive({ action: 'spy:sync', payload: patch });
      sRef.current = state;
    },
    get selection() { return selection; },
    get submitted() { return submitted; },
    get state() { return state; },
  };
}

test('a full one-second voting snapshot preserves the unconfirmed suspect', () => {
  const phone = votingPhone();
  for (let seconds = 59; seconds >= 55; seconds--) {
    phone.sync({ phase: 'voting', currentRound: 1, votes: {}, voteTimerLeft: seconds });
    assert.equal(phone.selection, 'suspect');
    assert.equal(phone.submitted, false);
    assert.equal(phone.state.voteTimerLeft, seconds);
  }
});

test('another player voting does not clear the local selection', () => {
  const phone = votingPhone();
  phone.sync({ phase: 'voting', currentRound: 1, votes: { other: '' } });
  assert.equal(phone.selection, 'suspect');
});

test('same-round snapshots preserve the submitted vote lock', () => {
  const phone = votingPhone('voting', true);
  phone.sync({ phase: 'voting', currentRound: 1, votes: {} });
  assert.equal(phone.submitted, true);
});

test('entering voting clears a previous selection and submitted lock', () => {
  const phone = votingPhone('discussion', true);
  phone.sync({ phase: 'voting', currentRound: 1 });
  assert.equal(phone.selection, null);
  assert.equal(phone.submitted, false);
});

test('reconnecting into a new voting round clears the previous round selection', () => {
  const phone = votingPhone('voting', true);
  phone.sync({ phase: 'voting', currentRound: 2 });
  assert.equal(phone.selection, null);
  assert.equal(phone.submitted, false);
});

test('a partial timer patch preserves selection', () => {
  const phone = votingPhone();
  phone.sync({ voteTimerLeft: 58 });
  assert.equal(phone.selection, 'suspect');
});
