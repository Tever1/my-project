import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { CONTENT_CHECK_BATCH_SIZE } from './fact-check';
import { checkQuizQuestionBatch, generateThematicQuizQuestions, translateQuizQuestionBatch } from './admin-content-services';

export type AdminJobType = 'quiz-check' | 'quiz-generate' | 'quiz-translate';
export type AdminJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export interface AdminJobInput { quizId: string; questionIds?: string[]; count?: number; reportKey?: string; reportLabel?: string }
export interface AdminJob {
  id: string; type: AdminJobType; status: AdminJobStatus; label: string; input: AdminJobInput;
  createdAt: string; updatedAt: string; progress: { done: number; total: number; message: string };
  attempts: number; error?: string; result?: Record<string, number>;
}
export function recoverInterruptedJobs(jobs: AdminJob[], runnerActive: boolean) {
  if (runnerActive) return false;
  let recovered = false;
  for (const job of jobs) if (job.status === 'running') { job.status = 'queued'; job.progress.message = 'Возобновляется после перезапуска'; recovered = true; }
  return recovered;
}

const file = path.join(process.cwd(), 'data', 'admin-content-jobs.json');
const globalState = globalThis as typeof globalThis & { adminJobRunner?: Promise<void>; adminJobLock?: Promise<void> };

async function locked<T>(operation: () => Promise<T>): Promise<T> {
  const previous = globalState.adminJobLock ?? Promise.resolve();
  let release!: () => void;
  globalState.adminJobLock = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try { return await operation(); } finally { release(); }
}

async function readJobs(): Promise<AdminJob[]> {
  try { return JSON.parse(await readFile(file, 'utf8')) as AdminJob[]; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}
async function writeJobs(jobs: AdminJob[]) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(jobs.slice(0, 100), null, 2), { flag: 'wx', mode: 0o600 }); await rename(temporary, file); }
  finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }); }
}
async function mutate(id: string, edit: (job: AdminJob) => void) {
  return locked(async () => {
    const jobs = await readJobs(); const job = jobs.find(item => item.id === id);
    if (!job) throw new Error('Задание не найдено');
    edit(job); job.updatedAt = new Date().toISOString(); await writeJobs(jobs); return job;
  });
}
async function processJob(job: AdminJob) {
  const ids = job.input.questionIds ?? [];
  if (job.type === 'quiz-generate') {
    const result = await generateThematicQuizQuestions(job.input.quizId, job.input.count ?? 1);
    await mutate(job.id, current => { current.progress = { done: 1, total: 1, message: 'Вопросы добавлены в черновик' }; current.result = result; });
    return;
  }
  const batchSize = job.type === 'quiz-check' ? CONTENT_CHECK_BATCH_SIZE : 5;
  let applied = 0; let skipped = 0;
  for (let index = job.progress.done; index < ids.length; index += batchSize) {
    const current = (await readJobs()).find(item => item.id === job.id);
    if (!current || current.status === 'cancelled') return;
    const batch = ids.slice(index, index + batchSize);
    const result = job.type === 'quiz-check'
      ? await checkQuizQuestionBatch(job.input.quizId, batch, job.input.reportKey, job.input.reportLabel)
      : await translateQuizQuestionBatch(job.input.quizId, batch);
    applied += result.applied; skipped += result.skipped;
    await mutate(job.id, item => { item.progress = { done: Math.min(index + batch.length, ids.length), total: ids.length,
      message: job.type === 'quiz-check' ? 'Проверка русского оригинала' : 'Перевод на английский' }; item.result = { applied, skipped }; });
  }
}
async function runQueue() {
  while (true) {
    const jobs = await readJobs();
    const job = jobs.find(item => item.status === 'queued');
    if (!job) return;
    await mutate(job.id, item => { item.status = 'running'; item.attempts++; item.error = undefined; item.progress.message = 'Запущено'; });
    try {
      await processJob(job);
      await mutate(job.id, item => { if (item.status !== 'cancelled') { item.status = 'completed'; item.progress.done = item.progress.total; item.progress.message = 'Готово'; } });
    } catch (error) {
      await mutate(job.id, item => { item.status = 'failed'; item.error = (error as Error).message; item.progress.message = 'Нужна повторная попытка'; });
    }
  }
}
export function kickAdminJobs() {
  if (!globalState.adminJobRunner) globalState.adminJobRunner = runQueue().finally(async () => {
    globalState.adminJobRunner = undefined;
    if ((await readJobs()).some(job => job.status === 'queued')) kickAdminJobs();
  });
}
export async function listAdminJobs() {
  const jobs = await locked(async () => {
    const items = await readJobs(); let recovered = false;
    recovered = recoverInterruptedJobs(items, !!globalState.adminJobRunner);
    if (recovered) await writeJobs(items);
    return items;
  });
  if (jobs.some(job => job.status === 'queued')) kickAdminJobs();
  return jobs;
}
export async function createAdminJob(type: AdminJobType, input: AdminJobInput, label: string) {
  const job = await locked(async () => {
    const jobs = await readJobs(); const total = type === 'quiz-generate' ? 1 : input.questionIds?.length ?? 0;
    const now = new Date().toISOString();
    const created: AdminJob = { id: randomUUID(), type, status: 'queued', label: label.slice(0, 200), input, createdAt: now, updatedAt: now,
      progress: { done: 0, total, message: 'В очереди' }, attempts: 0 };
    jobs.unshift(created); await writeJobs(jobs); return created;
  });
  kickAdminJobs(); return job;
}
export async function retryAdminJob(id: string) {
  const job = await mutate(id, item => { if (!['failed', 'cancelled'].includes(item.status)) throw new Error('Повторить можно только остановленное задание'); item.status = 'queued'; item.error = undefined; item.progress.message = 'В очереди'; });
  kickAdminJobs(); return job;
}
export async function cancelAdminJob(id: string) {
  return mutate(id, item => { if (item.status === 'completed') throw new Error('Завершённое задание нельзя отменить'); item.status = 'cancelled'; item.progress.message = 'Отменено'; });
}
