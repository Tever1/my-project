import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export interface QuizCheckReport {
  id: string;
  createdAt: string;
  quizKey: string;
  label: string;
  report: string;
  questions: string;
  questionIds?: string[];
}

const directory = path.join(process.cwd(), 'data', 'quiz-check-reports');

export async function saveQuizCheckReport(input: Omit<QuizCheckReport, 'id' | 'createdAt'>, root = directory) {
  const entry: QuizCheckReport = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, `${entry.id}.json`), JSON.stringify(entry), { flag: 'wx', mode: 0o600 });
  return entry;
}

export async function listQuizCheckReports(quizKey: string, root = directory): Promise<QuizCheckReport[]> {
  let names: string[];
  try { names = await readdir(root); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  const entries: QuizCheckReport[] = [];
  for (const name of names) {
    if (!/^[a-f0-9-]{36}\.json$/.test(name)) continue;
    const entry: QuizCheckReport = JSON.parse(await readFile(path.join(root, name), 'utf8'));
    if (entry.quizKey === quizKey || (quizKey === 'general:all:all' && entry.quizKey.startsWith('general:'))) entries.push(entry);
  }
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
