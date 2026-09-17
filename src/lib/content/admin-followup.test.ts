import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ContentStore } from './store';
import { checkSignature, isCodexVerified, validateCatalog, withoutChecks, type GameCatalog, type ContentQuestion } from './catalog';
import { pendingQuestionChecks } from './fact-check';

const question: ContentQuestion = { id: 'q', questionRu: 'Вопрос', questionEn: 'Question', options: ['A', 'B', 'C', 'D'].map(ru => ({ ru, en: ru })), correctIndex: 0, difficulty: 'medium', topic: 'science', timeLimit: 20 };
const verified = (): ContentQuestion => ({ ...structuredClone(question), check: { status: 'verified', signature: checkSignature(question), checkedAt: new Date().toISOString(), sources: ['https://example.org/source'], summary: 'Верно' } });
function catalog(): GameCatalog {
  return { general: ['science', 'history', 'pop-culture'].flatMap(topic => ['easy', 'medium', 'hard'].map(difficulty => ({ ...structuredClone(question), id: `${topic}-${difficulty}`, topic, difficulty } as ContentQuestion))), quizzes: [], characters: Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, ru: `Герой ${i}`, en: `Hero ${i}` })), words: { alias: [{ id: 'a', ru: 'Слово', en: 'Word' }], crocodile: [{ id: 'c', ru: 'Кот', en: 'Cat' }], spy: [{ id: 's', ru: 'Пляж' }] } };
}
test('canonical Codex verdict skips rechecking even if caller omits check metadata', () => {
  assert.deepEqual(pendingQuestionChecks([verified()], [question]), []);
});
test('changed content, missing sources, issue and owner approval do not skip Codex checking', () => {
  const changed = verified(); changed.questionRu += '!';
  const noSources = verified(); noSources.check!.sources = [];
  const issue = verified(); issue.check!.status = 'issue';
  const owner = { ...question, approval: { signature: checkSignature(question), approvedAt: '2026-09-14' } };
  for (const item of [changed, noSources, issue, owner]) {
    assert.equal(isCodexVerified(item), false);
    assert.equal(pendingQuestionChecks([item], [item]).length, 1);
  }
});
test('mixed batch includes only unconfirmed canonical entries', () => {
  const second = { ...question, id: 'second' };
  assert.deepEqual(pendingQuestionChecks([verified(), second], [question, second]).map(q => q.id), ['second']);
});
test('stale, deleted and duplicate requests cannot cause a model check', () => {
  assert.throws(() => pendingQuestionChecks([question], [{ ...question, questionRu: 'Old' }]));
  assert.throws(() => pendingQuestionChecks([], [question]));
  assert.throws(() => pendingQuestionChecks([question], [question, question]));
});
test('manual metadata stays private and invalid checkbox values are rejected', () => {
  const data = catalog(); data.characters[0].checked = true; data.words!.alias[0].checked = true;
  const clean = withoutChecks(data);
  assert.equal(clean.characters[0].checked, undefined);
  assert.equal(clean.words, undefined);
  data.words!.alias[0].checked = 'yes' as unknown as boolean;
  assert.throws(() => validateCatalog(data));
});
test('manual checks survive reload but reach published files only on disk sync', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'party-admin-followup-'));
  try {
    const store = new ContentStore(root, async () => catalog());
    const draft = await store.draft();
    const next = await store.change(draft.revision, 'manual checks', data => { data.characters[0].checked = true; data.words!.alias[0].checked = true; });
    assert.equal((await new ContentStore(root, async () => catalog()).draft()).catalog.words!.alias[0].checked, true);
    assert.equal((await store.published()).catalog.characters[0].checked, undefined);
    await store.sync(next.revision);
    assert.equal((await store.published()).catalog.words!.alias[0].checked, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('pre-existing draft without words keeps edits and receives backward-compatible lists', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'party-admin-upgrade-'));
  try {
    const data = catalog(); delete data.words; data.characters[0].ru = 'Правка владельца';
    await mkdir(path.join(root, 'data'));
    await writeFile(path.join(root, 'data', 'admin-content-draft.json'), JSON.stringify({ revision: 'owner', baseRevision: 'baseline', changes: ['owner edit'], catalog: data }));
    const draft = await new ContentStore(root, async () => catalog()).draft();
    assert.equal(draft.revision, 'owner'); assert.equal(draft.catalog.characters[0].ru, 'Правка владельца');
    assert.equal(draft.catalog.words!.alias.length, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
