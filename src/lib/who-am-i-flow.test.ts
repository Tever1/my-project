import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { getWhoAmIActivePlayerId, getWhoAmINextTurnIndex, getWhoAmIPhoneFocus } from './who-am-i-flow.ts';
import { reduceGameSnapshot, normalizeWhoAmIGuess, sanitizeSnapshot } from '../server/game-security.mts';

const phone = readFileSync(new URL('../app/game/[roomId]/who-am-i/page.tsx', import.meta.url), 'utf8');
const tv = readFileSync(new URL('../app/tv/[roomId]/[gameType]/page.tsx', import.meta.url), 'utf8');
const state = {
  phase: 'playing', turnOrder: ['A', 'B', 'C', 'D'], currentTurnIndex: 0,
  guessedPlayers: [] as string[], guessNeedsConfirm: false, guessAwaitingJudge: false,
  guessPendingPlayerId: '', guessJudgeId: '',
};

test('rejected guesses advance once, skip guessed players, wrap and clear the streak', () => {
  for (const scenario of [
    { cursor: 0, guessed: [], next: 'B' },
    { cursor: 1, guessed: ['A', 'C'], next: 'D' },
    { cursor: 3, guessed: ['A', 'C'], next: 'B' },
    { cursor: 0, guessed: ['A', 'C'], next: 'D' },
    { cursor: 1, guessed: ['A', 'C', 'D'], next: 'B' },
  ]) {
    const before = { ...state, currentTurnIndex: scenario.cursor, guessedPlayers: scenario.guessed,
      consecutiveYesAnswers: 2, questionsAsked: { B: 4 }, guessAwaitingJudge: true,
      guessPendingPlayerId: 'B', guessPendingText: 'Wrong', guessJudgeId: 'C' };
    const after = reduceGameSnapshot('who-am-i', before, 'who-am-i', {
      type: 'guess', playerId: getWhoAmIActivePlayerId(before), guess: 'Wrong', correct: false,
    })!;
    assert.equal(getWhoAmIActivePlayerId(after as unknown as typeof state), scenario.next);
    assert.equal(after.consecutiveYesAnswers, 0);
    assert.deepEqual(after.guessedPlayers, scenario.guessed);
    assert.deepEqual(after.questionsAsked, before.questionsAsked);
    assert.equal(after.phase, 'playing');
    assert.equal(after.guessAwaitingJudge, false);
    assert.equal(after.guessNeedsConfirm, false);
    assert.equal(after.guessPendingText, '');
    assert.equal(after.guessJudgeId, '');
    assert.equal(after.guessPendingPlayerId, '');
  }
});

test('a nonmatching guess waits for review without passing the turn early', () => {
  const before = { ...state, consecutiveYesAnswers: 2 };
  const pending = reduceGameSnapshot('who-am-i', before, 'who-am-i', {
    type: 'guess-try', playerId: 'A', guess: 'Wrong',
  })!;
  assert.equal(pending.currentTurnIndex, 0);
  assert.equal(pending.consecutiveYesAnswers, 2);
  assert.equal(pending.guessNeedsConfirm, true);
});

test('yes counters and next players keep the production phone screen mounted', () => {
  const start = phone.indexOf('  const visualPhaseKey =');
  const block = phone.slice(start, phone.indexOf('\n\n  return (', start));
  const key = new Function('gs', 'currentPlayerId', 'phoneFocus', 'lastGuessResult', `${block}; return visualPhaseKey;`);
  const before = key({ ...state, consecutiveYesAnswers: 0 }, 'A', 'main', null);
  for (const streak of [1, 2, 3, 0]) {
    assert.equal(key({ ...state, consecutiveYesAnswers: streak }, 'A', 'main', null), before);
  }
  assert.equal(key({ ...state, consecutiveYesAnswers: 0 }, 'B', 'main', null), before);
  for (const focus of ['input', 'confirm', 'judge']) assert.notEqual(key(state, 'A', focus, null), before);
});

test('all phone screen transitions avoid full-content fade, blur and exit waiting', () => {
  const layout = readFileSync(new URL('../components/games/who-am-i-clay/WhoAmIClay.tsx', import.meta.url), 'utf8');
  const main = layout.slice(layout.indexOf('<main'), layout.indexOf('</main>'));
  assert.doesNotMatch(main, /mode="wait"|opacity: 0|blur\(/);
  assert.match(main, /reduceMotion/);
});

test('TV reveal keeps centering throughout its animation and clay respects reduced motion', () => {
  const css = readFileSync(new URL('../components/games/who-am-i-clay/WhoAmIClay.module.css', import.meta.url), 'utf8');
  assert.match(css, /\.tvOverlay \{[^}]*animation: tvRevealPop/);
  const animation = css.slice(css.indexOf('@keyframes tvRevealPop'), css.indexOf('@media (prefers-reduced-motion'));
  const transforms = [...animation.matchAll(/transform: ([^;]+);/g)].map(match => match[1]);
  assert.equal(transforms.length, 2);
  assert.ok(transforms.every(transform => transform.startsWith('translate(-50%,')));
  assert.doesNotMatch(animation, /opacity|blur/);
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion'));
  assert.match(reduced, /\.surface \*/);
  assert.match(reduced, /animation: none !important/);
  assert.match(reduced, /transition: none !important/);
});

test('Who Am I completes in turn order without awarding scores', () => {
  let snapshot = reduceGameSnapshot('who-am-i', null, 'who-am-i', {
    type: 'start-game', turnOrder: ['A', 'B', 'C'],
    characters: { A: { ru: 'Кот', en: 'Cat' }, B: { ru: 'Пёс', en: 'Dog' }, C: { ru: 'Лев', en: 'Lion' } },
  });
  assert.equal(Object.hasOwn(snapshot!, 'scores'), false);
  for (const [playerId, guess] of [['A', 'Кот'], ['B', 'Пёс'], ['C', 'Лев']]) {
    snapshot = reduceGameSnapshot('who-am-i', snapshot, 'who-am-i', normalizeWhoAmIGuess(snapshot, { type: 'guess-try', playerId, guess }));
    assert.equal(Object.hasOwn(snapshot!, 'scores'), false);
  }
  assert.equal(snapshot?.phase, 'finished');
  assert.deepEqual(snapshot?.guessedPlayers, ['A', 'B', 'C']);
});

test('old Who Am I scores do not survive state sync or recipient snapshots', () => {
  const old = { ...state, scores: { A: 100, B: 20 } };
  const synced = reduceGameSnapshot('who-am-i', old, 'who-am-i', { type: 'sync-state', state: old });
  assert.equal(Object.hasOwn(synced!, 'scores'), false);
  const view = sanitizeSnapshot('who-am-i', old, { playerId: null, isTv: true, isGameHost: false, isMafiaHost: false });
  assert.equal(Object.hasOwn(view, 'scores'), false);
});

test('Who Am I UI has no points, ranking places or winner selection', () => {
  const tvGame = tv.slice(tv.indexOf('  // ===================== WHO AM I TV RENDER'), tv.indexOf('  // ===================== GENERIC TV RENDER'));
  for (const ui of [phone, tvGame]) {
    assert.doesNotMatch(ui, /\.scores|\.score\b|calculate\w*Score|\bwinner\b|name="(?:trophy|medal)"|РЕЙТИНГ|ОЧКОВ|RANKING|POINTS/);
    assert.doesNotMatch(ui, /resultRowWinner|tvResultWinner|index === 0/);
  }
});

test('production TV results are 20 percent narrower without scaling the content', () => {
  const css = readFileSync(new URL('../components/games/who-am-i-clay/WhoAmIClay.module.css', import.meta.url), 'utf8');
  const rule = css.match(/\.tvResultsList:has\(\.tvParticipantRow\) \{([^}]+)\}/)?.[1];
  assert.ok(rule);
  assert.match(rule, /width: min\(960px,70\.4%\)/);
  assert.doesNotMatch(rule, /transform|scale|font-size|height: [\d.]+(?:px|%)/);
  for (const containerWidth of [1213, 1780]) {
    assert.ok(Math.abs(Math.min(960, containerWidth * .704) - Math.min(1200, containerWidth * .88) * .8) < .001);
  }
});

test('phone and TV select B after A guesses correctly using their production selectors', () => {
  const initial = reduceGameSnapshot('who-am-i', null, 'who-am-i', {
    type: 'start-game', turnOrder: state.turnOrder, characters: { A: { ru: 'Кот', en: 'Cat' } },
  });
  const after = reduceGameSnapshot('who-am-i', initial, 'who-am-i',
    normalizeWhoAmIGuess(initial, { type: 'guess-try', playerId: 'A', guess: 'Кот' }));
  const phoneSelector = phone.slice(phone.indexOf('  // Current player whose turn'), phone.indexOf('  const isMyTurn ='));
  const tvStart = tv.indexOf('    const ws = whoAmIState;');
  const tvSelector = tv.slice(tvStart, tv.indexOf('    const currentPlayerName =', tvStart));
  assert.equal(new Function('gs', 'getWhoAmIActivePlayerId', `${phoneSelector};return currentPlayerId;`)(after, getWhoAmIActivePlayerId), 'B');
  assert.equal(new Function('whoAmIState', 'getWhoAmIActivePlayerId', `${tvSelector};return currentPlayerId;`)(after, getWhoAmIActivePlayerId), 'B');
});

test('production phone screen prioritizes confirmation over an open guess input', () => {
  const pending = { ...state, guessNeedsConfirm: true, guessPendingPlayerId: 'A' };
  const body = phone.slice(phone.indexOf('  let content = (phaseRenderers'), phone.indexOf('  const visualPhaseKey ='));
  const render = new Function('gs', 'showGuessInput', 'isMyConfirmScreen', 'isGuessJudge', 'phaseRenderers', 'renderLobby', 'renderGuessInput', 'renderGuessConfirm', 'renderJudge', 'phoneFocus', `${body};return content;`);
  assert.equal(render(pending, true, true, false, { playing: () => 'main' }, () => 'lobby', () => 'input', () => 'confirm', () => 'judge', getWhoAmIPhoneFocus(pending, 'A', true)), 'confirm');
});

test('original-order cursor skips guessed players and advances past the actual active player', () => {
  const skipped = { ...state, guessedPlayers: ['A', 'C'] };
  assert.equal(getWhoAmIActivePlayerId(skipped), 'B');
  const next = { ...skipped, currentTurnIndex: getWhoAmINextTurnIndex(skipped) };
  assert.equal(getWhoAmIActivePlayerId(next), 'D');
  assert.equal(getWhoAmIActivePlayerId({ ...next, currentTurnIndex: getWhoAmINextTurnIndex(next) }), 'B');
  assert.equal(getWhoAmIActivePlayerId({ ...state, guessedPlayers: state.turnOrder }), null);
});

test('judge and pending waiting states cannot be covered by stale guess inputs', () => {
  const pending = { ...state, guessAwaitingJudge: true, guessPendingPlayerId: 'A', guessJudgeId: 'B' };
  assert.equal(getWhoAmIPhoneFocus(pending, 'B', true), 'judge');
  assert.equal(getWhoAmIPhoneFocus(pending, 'A', true), 'main');
  assert.equal(getWhoAmIPhoneFocus(state, 'B', true), 'main');
  assert.equal(getWhoAmIPhoneFocus(state, 'A', true), 'input');
});

test('server advancement skips the actual active player, including a cursor on a guessed player', () => {
  const next = reduceGameSnapshot('who-am-i', { ...state, guessedPlayers: ['A', 'C'] }, 'who-am-i', { type: 'next-turn' });
  assert.equal(getWhoAmIActivePlayerId(next as unknown as typeof state), 'D');
});

test('production TV says sent to judge only after a judge has been assigned', () => {
  const ast = ts.createSourceFile('tv.tsx', tv, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression = '';
  const visit = (node: ts.Node) => {
    if (ts.isJsxExpression(node) && node.expression) {
      const text = node.expression.getText(ast);
      if (text.includes('sent the answer to a judge') && !text.includes('<h1>')) expression = text;
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(expression);
  const label = new Function('ws', 'disputingPlayerName', 'l', `return ${expression};`);
  assert.match(label({ ...state, guessNeedsConfirm: true }, 'A', (ru: string) => ru), /подтверждает отправку/);
  assert.match(label({ ...state, guessAwaitingJudge: true, guessJudgeId: 'B' }, 'A', (ru: string) => ru), /передал\(а\) ответ судье/);
});
