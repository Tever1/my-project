import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuizQuality, textSimilarity } from './quality';
import type { ContentQuestion } from './catalog';

const question = (id: string, text: string, options = ['Один', 'Два', 'Три', 'Четыре']): ContentQuestion => ({
  id, questionRu: text, questionEn: 'English question', options: options.map((ru, index) => ({ ru, en: `Option ${index}` })),
  correctIndex: 0, topic: 'random', difficulty: 'medium', timeLimit: 20,
});
test('local quality analysis detects duplicates without model calls', () => {
  const first = question('1', 'Кто открыл закон всемирного тяготения?');
  const duplicate = question('2', 'Кто открыл закон всемирного тяготения!');
  const issues = analyzeQuizQuality([first, duplicate]);
  assert.ok(issues.get('1')?.some(issue => ['duplicate', 'similar'].includes(issue.code)));
  assert.ok(textSimilarity(first.questionRu, duplicate.questionRu) > 0.9);
});
test('local quality analysis detects malformed answer composition and missing translation', () => {
  const item = question('1', 'Очень длинный '.repeat(20), ['Да', 'Да', 'Коротко', 'Очень длинный правильный ответ, который явно отличается от остальных вариантов']);
  item.questionEn = ''; item.options[0].en = '';
  const codes = analyzeQuizQuality([item]).get(item.id)?.map(issue => issue.code);
  assert.ok(codes?.includes('duplicate-options'));
  assert.ok(codes?.includes('long-question'));
  assert.ok(codes?.includes('missing-translation'));
});
