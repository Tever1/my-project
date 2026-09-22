import { NextResponse } from 'next/server';
import { withCodexAdmin } from '@/lib/admin-codex';
import { contentStore } from '@/lib/content/server';
import { cancelAdminJob, createAdminJob, listAdminJobs, retryAdminJob, type AdminJobType } from '@/lib/content/admin-jobs';

export const POST = withCodexAdmin(async request => {
  const input = await request.json();
  try {
    if (input.action === 'list') return NextResponse.json({ jobs: await listAdminJobs() });
    if (input.action === 'retry' && typeof input.id === 'string') return NextResponse.json({ job: await retryAdminJob(input.id) });
    if (input.action === 'cancel' && typeof input.id === 'string') return NextResponse.json({ job: await cancelAdminJob(input.id) });
    if (input.action !== 'create' || !['quiz-check', 'quiz-generate', 'quiz-translate'].includes(input.type)) throw new Error('Некорректный тип задания');
    const type = input.type as AdminJobType;
    if (typeof input.quizId !== 'string' || input.quizId.length > 200) throw new Error('Некорректный квиз');
    const draft = await contentStore.draft();
    const bank = input.quizId === 'general' ? draft.catalog.general : draft.catalog.quizzes.find(quiz => quiz.id === input.quizId)?.questions;
    if (!bank) throw new Error('Квиз не найден');
    if (type === 'quiz-generate') {
      if (input.quizId === 'general' || !Number.isInteger(input.count) || input.count < 1 || input.count > 10) throw new Error('Для тематического квиза укажите от 1 до 10 вопросов');
      return NextResponse.json({ job: await createAdminJob(type, { quizId: input.quizId, count: input.count }, `Создание ${input.count} вопросов`) });
    }
    if (!Array.isArray(input.questionIds) || !input.questionIds.length || input.questionIds.length > 500
      || input.questionIds.some((id: unknown) => typeof id !== 'string' || !bank.some(question => question.id === id))) throw new Error('Выберите актуальные вопросы');
    const unique = [...new Set(input.questionIds as string[])];
    const reportKey = typeof input.reportKey === 'string' && input.reportKey.length <= 300 ? input.reportKey : undefined;
    const reportLabel = typeof input.reportLabel === 'string' && input.reportLabel.length <= 200 ? input.reportLabel : undefined;
    return NextResponse.json({ job: await createAdminJob(type, { quizId: input.quizId, questionIds: unique, reportKey, reportLabel },
      type === 'quiz-check' ? `Проверка ${unique.length} вопросов` : `Перевод ${unique.length} вопросов`) });
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
});
