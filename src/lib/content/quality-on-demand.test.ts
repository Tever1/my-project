import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeQuizQuality } from './quality';
import { buildQuizQualityReport, isQuizQualityReportFresh, quizQualityIssueIds } from './quality-report';
import type { ContentQuestion } from './catalog';

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const studio = read('../../components/admin/ContentStudio.tsx');
const healthPanel = read('../../components/admin/QuizHealthPanel.tsx');

const question = (id: string, text: string, options = ['Один', 'Два', 'Три', 'Четыре']): ContentQuestion => ({
  id, questionRu: text, questionEn: 'English question', options: options.map((ru, index) => ({ ru, en: `Option ${index}` })),
  correctIndex: 0, topic: 'random', difficulty: 'medium', timeLimit: 20,
});

test('quality analysis runs only through the explicit report builder, never while checking freshness', () => {
  let calls = 0;
  const analyzer = (items: ContentQuestion[]) => { calls += 1; return analyzeQuizQuality(items); };
  const report = buildQuizQualityReport('general:all@rev-1', [question('1', 'Кто открыл закон всемирного тяготения?')], analyzer);
  assert.equal(calls, 1);
  assert.equal(isQuizQualityReportFresh(report, 'general:all@rev-1'), true);
  assert.equal(calls, 1, 'freshness checks must not run the analysis');
  assert.equal(isQuizQualityReportFresh(report, 'general:science@rev-1'), false);
  assert.equal(isQuizQualityReportFresh(report, 'general:all@rev-2'), false, 'a new draft revision invalidates the report');
  assert.equal(isQuizQualityReportFresh(null, 'general:all@rev-1'), false);
  assert.equal(calls, 1);
});

test('issue ids are derived from an explicit report instead of a fresh analysis', () => {
  const items = [question('1', 'Кто открыл закон всемирного тяготения?'), question('2', 'Кто открыл закон всемирного тяготения!')];
  const issues = analyzeQuizQuality(items);
  assert.deepEqual(quizQualityIssueIds(issues, items).sort(), ['1', '2']);
  assert.deepEqual(quizQualityIssueIds(new Map(), items), []);
});

test('admin quiz render path no longer invokes local quality analysis automatically', () => {
  assert.doesNotMatch(studio, /analyzeQuizQuality/, 'ContentStudio must not import or call the expensive analyzer in render');
  assert.doesNotMatch(healthPanel, /analyzeQuizQuality/, 'QuizHealthPanel must not compute quality during render');
  assert.equal((studio.match(/buildQuizQualityReport\(/g) ?? []).length, 1, 'the report builder is wired exactly once');
  assert.match(studio, /function runQualityCheck\(\)\s*\{[^}]*buildQuizQualityReport\(qualityKey, questions\)/, 'the report is built only inside the explicit quality action');
  assert.match(studio, /issues=\{quality\}/, 'the health panel receives the on-demand report instead of computing it');
});
