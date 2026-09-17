import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ContentStore, ContentConflict } from './store';
import { checkSignature, isVerified, withoutChecks, type GameCatalog, type ContentQuestion } from './catalog';
import { parseCheckVerdicts } from './fact-check';

function baseline(): GameCatalog {
  const general: ContentQuestion[] = [];
  for (const topic of ['science', 'history', 'pop-culture'] as const) for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    general.push({ id: `${topic}-${difficulty}`, topic, difficulty, questionRu: 'Вопрос', questionEn: 'Question',
      options: ['A', 'B', 'C', 'D'].map(text => ({ ru: text, en: text })), correctIndex: 0, timeLimit: 20 });
  }
  return { general, characters: Array.from({ length: 12 }, (_, i) => ({ id: `c-${i}`, ru: `Имя ${i}`, en: `Name ${i}` })),
    quizzes: [{ id: 'test-1', theme: 'test', number: 1, titleRu: 'Тест', titleEn: 'Test', icon: '', iconUrl: '/icons/games/quiz.png', backgroundUrl: '/backgrounds/test.png', questions: [{ ...general[0], id: 'themed-q' }] }] };
}
async function fixture(run: (store: ContentStore, root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'party-content-test-'));
  try { await run(new ContentStore(root, async () => baseline()), root); }
  finally { await rm(root, { recursive: true, force: true }); }
}
test('edits remain drafts until the disk sync; sync creates a backup', () => fixture(async (store, root) => {
  const initial = await store.draft();
  const edited = await store.change(initial.revision, 'edit', catalog => { catalog.general[0].questionRu = 'Изменён'; });
  assert.equal((await store.published()).catalog.general[0].questionRu, 'Вопрос');
  const saved = await store.sync(edited.revision);
  assert.equal(saved.changes.length, 0);
  assert.equal((await store.published()).catalog.general[0].questionRu, 'Изменён');
  assert.equal((await readdir(path.join(root, 'data', 'content-backups'))).length, 1);
}));
test('deleting a quiz does not delete published content before disk sync', () => fixture(async store => {
  const first = await store.draft();
  const next = await store.change(first.revision, 'delete quiz', catalog => { catalog.quizzes = []; });
  assert.equal((await store.published()).catalog.quizzes.length, 1);
  await store.sync(next.revision);
  assert.equal((await store.published()).catalog.quizzes.length, 0);
}));
test('new theme and character appear in runtime only after sync', () => fixture(async store => {
  const initial = await store.draft();
  const next = await store.change(initial.revision, 'create', catalog => {
    catalog.quizzes.push({ ...catalog.quizzes[0], id: 'new-1', theme: 'new', titleRu: 'Новый', titleEn: 'New', questions: [{ ...catalog.quizzes[0].questions[0], id: 'new-q' }] });
    catalog.characters.push({ id: 'new-character', ru: 'Новый герой', en: 'New Hero' });
  });
  assert.equal((await store.published()).catalog.quizzes.length, 1);
  await store.sync(next.revision);
  assert.equal((await store.published()).catalog.quizzes.length, 2);
  assert.equal((await store.published()).catalog.characters.length, 13);
}));
test('old draft revision cannot overwrite new edits', () => fixture(async store => {
  const initial = await store.draft();
  await store.change(initial.revision, 'edit', catalog => { catalog.general[0].questionRu = 'Новое'; });
  await assert.rejects(store.change(initial.revision, 'stale', () => {}), ContentConflict);
  await assert.rejects(store.sync(initial.revision), ContentConflict);
}));
test('dangerous background paths and duplicate question IDs are rejected without changing drafts', () => fixture(async store => {
  const initial = await store.draft();
  await assert.rejects(store.change(initial.revision, 'bad path', catalog => { catalog.quizzes[0].backgroundUrl = '/backgrounds/../../secret.png'; }));
  await assert.rejects(store.change(initial.revision, 'duplicate', catalog => { catalog.general.push(catalog.general[0]); }));
  assert.equal((await store.draft()).revision, initial.revision);
}));
test('sync rejects empty playable general banks and too few characters', () => fixture(async store => {
  const initial = await store.draft();
  const next = await store.change(initial.revision, 'remove', catalog => { catalog.general = []; });
  await assert.rejects(store.sync(next.revision), /пустой банк/);
  const next2 = await store.change(next.revision, 'remove characters', catalog => { catalog.general = baseline().general; catalog.characters = []; });
  await assert.rejects(store.sync(next2.revision), /12 персонажей/);
}));
test('draft reload preserves edits across store instances', () => fixture(async (store, root) => {
  const initial = await store.draft();
  const next = await store.change(initial.revision, 'edit', catalog => { catalog.general[0].questionRu = 'Сохранён'; });
  const reloaded = new ContentStore(root, async () => baseline());
  assert.equal((await reloaded.draft()).revision, next.revision);
  assert.equal((await reloaded.draft()).catalog.general[0].questionRu, 'Сохранён');
}));
test('legacy migration is pending, not automatically published', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'party-content-migrate-'));
  try {
    const store = new ContentStore(root, async () => baseline(), async catalog => { catalog.general[0].questionRu = 'Прежний черновик'; return catalog; });
    assert.equal((await store.draft()).changes.length, 1);
    assert.equal((await store.published()).catalog.general[0].questionRu, 'Вопрос');
    const draft = await store.draft(); await store.sync(draft.revision);
    assert.match(await readFile(path.join(root, 'content', 'game-content.json'), 'utf8'), /Прежний черновик/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('positive source-backed verdict verifies only its exact question version', () => {
  const q = baseline().general[0];
  q.check = { status: 'verified', signature: checkSignature(q), checkedAt: new Date().toISOString(), sources: ['https://example.org/source'], summary: 'Верно' };
  assert.equal(isVerified(q), true); q.questionEn = 'Edited'; assert.equal(isVerified(q), false);
  assert.equal(withoutChecks({ ...baseline(), general: [q] }).general[0].check, undefined);
});
test('verified without sources is downgraded; malformed, duplicate and partial checks fail closed', () => {
  const result = parseCheckVerdicts(JSON.stringify({ results: [{ id: 'q', status: 'verified', summary: 'OK', sources: [] }] }), ['q']);
  assert.equal(result[0].status, 'unverified');
  assert.throws(() => parseCheckVerdicts('{}', ['q']));
  assert.throws(() => parseCheckVerdicts(JSON.stringify({ results: [result[0], result[0]] }), ['q', 'q2']));
  assert.throws(() => parseCheckVerdicts(JSON.stringify({ results: [{ ...result[0], sources: ['javascript:alert(1)'] }] }), ['q']));
});
test('manual owner approval is version-specific and omitted from public banks', () => {
  const q = baseline().general[0];
  q.approval = { signature: checkSignature(q), approvedAt: new Date().toISOString() };
  assert.equal(isVerified(q), true);
  assert.equal(withoutChecks({ ...baseline(), general: [q] }).general[0].approval, undefined);
  q.options[0].en = 'Changed';
  assert.equal(isVerified(q), false);
});
