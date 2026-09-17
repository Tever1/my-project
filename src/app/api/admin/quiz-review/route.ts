import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { withCodexAdmin } from '@/lib/admin-codex';
import { questionSignature, type QuestionReview, type ReviewQuestion } from '@/lib/quiz-review';

const root = path.join(process.cwd(), 'data', 'quiz-reviews');
export const POST = withCodexAdmin(async request => {
  const input = await request.json();
  if (typeof input.quizKey !== 'string' || !input.quizKey || input.quizKey.length > 500) {
    return NextResponse.json({ error: 'Некорректный квиз' }, { status: 400 });
  }
  const filename = path.join(root, `${createHash('sha256').update(input.quizKey).digest('hex')}.json`);
  async function read(): Promise<Record<string, QuestionReview>> {
    try { return JSON.parse(await readFile(filename, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error; }
  }
  if (input.action === 'list') return NextResponse.json({ reviews: await read() });
  const q = input.question as ReviewQuestion;
  if (input.action !== 'save' || !q || typeof q.id !== 'string' || !q.id || q.id.length > 200
    || typeof q.questionRu !== 'string' || !q.questionRu.trim() || q.questionRu.length > 2000
    || typeof q.questionEn !== 'string' || q.questionEn.length > 2000
    || !Array.isArray(q.options) || q.options.length !== 4
    || q.options.some(option => !option || typeof option.ru !== 'string' || !option.ru.trim()
      || option.ru.length > 1000 || typeof option.en !== 'string' || option.en.length > 1000)
    || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3
    || !['unverified', 'confirmed', 'error', 'fixed'].includes(input.status)
    || typeof input.note !== 'string' || input.note.length > 4000
    || typeof input.source !== 'string' || input.source.length > 2000
    || (input.source && !/^https:\/\//.test(input.source))) {
    return NextResponse.json({ error: 'Проверьте вопрос, четыре ответа и ссылку https' }, { status: 400 });
  }
  await mkdir(root, { recursive: true });
  const lock = `${filename}.lock`;
  try { await writeFile(lock, '', { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    return NextResponse.json({ error: 'Другой запрос сохраняет квиз. Повторите сохранение.' }, { status: 409 });
  }
  try {
    const reviews = await read();
    const previous = reviews[q.id];
    if ((previous?.revision ?? '') !== (input.revision ?? '')) {
      return NextResponse.json({ error: 'Вопрос изменён в другой вкладке. Обновите страницу.' }, { status: 409 });
    }
    const changed = previous && questionSignature(previous.question) !== questionSignature(q);
    // Any content edit invalidates the previous manual confirmation.
    const entry: QuestionReview = { question: q, status: changed ? 'fixed' : input.status,
      note: input.note, source: input.source, updatedAt: new Date().toISOString(), revision: randomUUID() };
    reviews[q.id] = entry;
    const temporary = `${filename}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(reviews), { flag: 'wx', mode: 0o600 });
    await rename(temporary, filename);
    return NextResponse.json({ review: entry });
  } finally { await unlink(lock); }
});
