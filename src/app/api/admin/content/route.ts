import { NextResponse } from 'next/server';
import { withCodexAdmin } from '@/lib/admin-codex';
import { contentStore } from '@/lib/content/server';
import { ContentConflict } from '@/lib/content/store';
import { checkSignature, isCodexVerified, scopedCheckSignature, type ContentQuestion, type ContentQuiz } from '@/lib/content/catalog';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { applyQuestionCorrection } from '@/lib/content/fact-check';
import { quizPolicyId } from '@/lib/content/quiz-policy';

export const POST = withCodexAdmin(async request => {
  const input = await request.json();
  try {
    if (input.action === 'list') return NextResponse.json(await contentStore.draft());
    if (input.action === 'history') return NextResponse.json({ history: await contentStore.history() });
    if (input.action === 'question-history') {
      if (typeof input.quizId !== 'string' || typeof input.id !== 'string') throw new Error('Не указан вопрос');
      return NextResponse.json({ history: await contentStore.questionHistory(input.quizId, input.id) });
    }
    if (typeof input.revision !== 'string') return NextResponse.json({ error: 'Не указан номер черновика' }, { status: 400 });
    if (input.action === 'restore-question') {
      if (typeof input.historyId !== 'string' || typeof input.quizId !== 'string' || typeof input.id !== 'string') throw new Error('Не указана версия вопроса');
      return NextResponse.json(await contentStore.restoreQuestion(input.revision, input.historyId, input.quizId, input.id));
    }
    if (input.action === 'sync') {
      const draft = await contentStore.draft();
      for (const quiz of draft.catalog.quizzes) {
        if (!quiz.backgroundUrl.endsWith('.webp')) throw new Error('Выберите WebP-фон для каждого тематического квиза перед сохранением');
        await access(path.join(process.cwd(), 'public', quiz.backgroundUrl));
      }
      return NextResponse.json(await contentStore.sync(input.revision));
    }
    const labels: Record<string, string> = { 'save-question': 'Добавление / редактирование вопроса', 'delete-question': 'Удаление вопроса',
      'save-quiz': 'Создание / настройки тематического квиза', 'delete-quiz': 'Удаление квиза', 'save-character': 'Добавление / редактирование персонажа', 'delete-character': 'Удаление персонажа', 'approve-question': 'Вопрос утверждён владельцем', 'fix-question': 'Применено подтверждённое исправление Codex' };
    const draft = await contentStore.change(input.revision, labels[input.action] ?? 'Изменение контента', catalog => {
      const bank = input.quizId === 'general' ? catalog.general : catalog.quizzes.find(quiz => quiz.id === input.quizId)?.questions;
      if (input.action === 'fix-question' || input.action === 'approve-question') {
        const policy = quizPolicyId(catalog.quizzes.find(quiz => quiz.id === input.quizId));
        if (policy && bank?.find(q => q.id === input.id)?.check?.policy !== policy) throw new Error('Сначала перепроверьте вопрос по фильмам Гарри Поттера');
      }
      if (input.action === 'save-question' && bank) {
        const q = input.question as ContentQuestion;
        const previous = bank.find(item => item.id === q?.id);
        // Russian checks survive English-only edits; owner approval keeps the full bilingual signature semantics.
        const checkCurrent = !!previous?.check && previous.check.signature === scopedCheckSignature(previous.check.scope, q);
        const approvalCurrent = !!previous?.approval && previous.approval.signature === checkSignature(q);
        const translationCurrent = !!previous?.translation && previous.translation.signature === checkSignature(q);
        const safe = { ...q, check: checkCurrent ? previous?.check : undefined, approval: approvalCurrent ? previous?.approval : undefined,
          translation: translationCurrent ? previous?.translation : undefined };
        const index = bank.findIndex(item => item.id === q.id);
        if (index < 0) bank.push(safe); else bank[index] = safe;
      } else if (input.action === 'fix-question' && bank) {
        const question = bank.find(q => q.id === input.id);
        if (!question) throw new Error('Вопрос не найден');
        applyQuestionCorrection(question, input.signature);
      } else if (input.action === 'approve-question' && bank) {
        const q = bank.find(item => item.id === input.id);
        const check = q?.check;
        if (!q || !check || check.signature !== scopedCheckSignature(check.scope, q) || check.sources.length === 0) throw new Error('Сначала проверьте текущую версию вопроса с источниками');
        q.approval = { signature: checkSignature(q), approvedAt: new Date().toISOString() };
      } else if (input.action === 'delete-question' && bank) {
        const index = bank.findIndex(q => q.id === input.id);
        if (index < 0) throw new Error('Вопрос не найден');
        bank.splice(index, 1);
      } else if (input.action === 'bulk-question' && bank) {
        if (!Array.isArray(input.ids) || input.ids.length < 1 || input.ids.length > 500 || input.ids.some((id: unknown) => typeof id !== 'string')) throw new Error('Выберите вопросы');
        const ids = new Set(input.ids as string[]);
        if (input.operation === 'delete') {
          for (let index = bank.length - 1; index >= 0; index--) if (ids.has(bank[index].id)) bank.splice(index, 1);
        } else if (input.operation === 'approve') {
          for (const question of bank) if (ids.has(question.id)) {
            if (!isCodexVerified(question)) throw new Error(`Вопрос «${question.questionRu}» ещё не подтверждён Codex`);
            question.approval = { signature: checkSignature(question), approvedAt: new Date().toISOString() };
          }
        } else if (input.operation === 'difficulty' && ['easy', 'medium', 'hard'].includes(input.value)) {
          for (const question of bank) if (ids.has(question.id)) { question.difficulty = input.value; question.timeLimit = input.value === 'easy' ? 15 : input.value === 'hard' ? 25 : 20; }
        } else if (input.operation === 'topic' && input.quizId === 'general' && ['science', 'history', 'pop-culture'].includes(input.value)) {
          for (const question of bank) if (ids.has(question.id)) question.topic = input.value;
        } else throw new Error('Некорректное массовое действие');
      } else if (input.action === 'save-quiz') {
        const quiz = input.quiz as ContentQuiz;
        if (!quiz?.backgroundUrl?.endsWith('.webp')) throw new Error('Для игры выберите фон в формате WebP');
        const index = catalog.quizzes.findIndex(q => q.id === quiz?.id);
        const safe = { ...quiz, icon: '', questions: index < 0 ? [] : catalog.quizzes[index].questions };
        if (index < 0) catalog.quizzes.push(safe); else catalog.quizzes[index] = safe;
      } else if (input.action === 'delete-quiz') {
        const index = catalog.quizzes.findIndex(q => q.id === input.id);
        if (index < 0) throw new Error('Квиз не найден');
        catalog.quizzes.splice(index, 1);
      } else if (input.action === 'save-character') {
        const character = input.character;
        const index = catalog.characters.findIndex(c => c.id === character?.id);
        const previous = catalog.characters[index];
        const safe = { id: character?.id, ru: character?.ru, en: character?.en,
          checked: previous?.ru === character?.ru && previous?.en === character?.en ? previous?.checked : false };
        if (index < 0) catalog.characters.push(safe); else catalog.characters[index] = safe;
      } else if (input.action === 'check-character' || input.action === 'check-word') {
        if (typeof input.checked !== 'boolean') throw new Error('Некорректная отметка');
        const list = input.action === 'check-character' ? catalog.characters
          : ['alias', 'crocodile', 'spy'].includes(input.group) ? catalog.words?.[input.group as 'alias' | 'crocodile' | 'spy'] : undefined;
        const item = list?.find(c => c.id === input.id);
        if (!item) throw new Error('Элемент не найден');
        item.checked = input.checked;
      } else if (input.action === 'delete-character') {
        const index = catalog.characters.findIndex(c => c.id === input.id);
        if (index < 0) throw new Error('Персонаж не найден');
        catalog.characters.splice(index, 1);
      } else throw new Error('Неизвестное действие или квиз');
    });
    return NextResponse.json(draft);
  } catch (error) {
    return NextResponse.json({ error: error instanceof ContentConflict ? error.message : `Не сохранено: ${(error as Error).message}` }, { status: error instanceof ContentConflict ? 409 : 400 });
  }
});
