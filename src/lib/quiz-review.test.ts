import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewStatusAfterEdit, type ReviewQuestion } from './quiz-review';
const question: ReviewQuestion = { id: 'q1', questionRu: 'Вопрос', questionEn: 'Question',
  options: ['A', 'B', 'C', 'D'].map(text => ({ ru: text, en: text })), correctIndex: 0 };
test('unchanged content preserves manual status', () => {
  assert.equal(reviewStatusAfterEdit(question, structuredClone(question), 'confirmed'), 'confirmed');
});
for (const field of ['questionRu', 'questionEn', 'correctIndex', 'options'] as const) {
  test(`${field} changes invalidate confirmation`, () => {
    const changed = structuredClone(question);
    if (field === 'correctIndex') changed.correctIndex = 1;
    else if (field === 'options') changed.options[0].en = 'Edited';
    else changed[field] = 'Edited';
    assert.equal(reviewStatusAfterEdit(question, changed, 'confirmed'), 'fixed');
  });
}
