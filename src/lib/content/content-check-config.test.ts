import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const route = read('../../app/api/admin/content-check/route.ts');
const studio = read('../../components/admin/ContentStudio.tsx');
const factCheck = read('./fact-check.ts');
const adminCodexDocs = read('../../../docs/ADMIN_CODEX.md');

test('content-check route is Russian-only, deadline-free, fact-check model and two-question bounded', () => {
  assert.match(route, /scope: 'ru'/);
  assert.match(route, /factCheckCodexOptions\(\)/);
  assert.match(route, /CONTENT_CHECK_BATCH_SIZE/);
  assert.match(route, /вне области проверки/);
  assert.doesNotMatch(route, /questions\.length > 20/);
  // The model payload must not include English question or option text.
  assert.doesNotMatch(route, /questionEn: q\.questionEn/);
  assert.doesNotMatch(route, /\{\s*ru: option\.ru,\s*en: option\.en\s*\}/);
});

test('content studio uses the two-question batch and scope-aware labels', () => {
  assert.match(studio, /CONTENT_CHECK_BATCH_SIZE/);
  assert.match(studio, /Проверен Codex · RU/);
  assert.doesNotMatch(studio, /index \+= 10/);
  assert.doesNotMatch(studio, /блоками до 10/);
});

test('batch constant is two and documented', () => {
  assert.match(factCheck, /CONTENT_CHECK_BATCH_SIZE = 2/);
  assert.match(adminCodexDocs, /блоками по 2/);
  assert.match(adminCodexDocs, /до 2 вопросов в блоке/);
  assert.match(adminCodexDocs, /gpt-5\.6-terra/);
  assert.match(adminCodexDocs, /ADMIN_CODEX_FACTCHECK_MODEL/);
  assert.match(adminCodexDocs, /без фиксированного\s+дедлайна/);
});
