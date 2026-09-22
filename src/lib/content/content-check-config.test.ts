import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FACT_CHECK_OUTPUT_SCHEMA } from './fact-check';

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const route = read('../../app/api/admin/content-check/route.ts');
const studio = read('../../components/admin/ContentStudio.tsx');
const services = read('./admin-content-services.ts');
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

test('every fact-check call site requests the structured schema and parses it through the safe seam', () => {
  for (const source of [route, services]) {
    assert.match(source, /outputSchema: FACT_CHECK_OUTPUT_SCHEMA/);
    assert.match(source, /parseCodexCheckResponse\(/);
    assert.doesNotMatch(source, /parseCheckVerdicts\(/);
  }
});

test('both RU fact-check prompts require correction:null exactly where the schema does', () => {
  const item = FACT_CHECK_OUTPUT_SCHEMA.properties.results.items;
  // The schema makes correction mandatory and nullable, so the prompts must ask for null instead of omission.
  assert.ok((item.required as readonly string[]).includes('correction'));
  assert.deepEqual(item.properties.correction.anyOf.map(branch => branch.type), ['null', 'object']);
  for (const source of [route, services]) {
    assert.match(source, /Поле correction обязательно у каждого результата/);
    assert.match(source, /correction: null/);
    // Valid JSON only: no pipe-separated alternatives in status or correction (pseudo-JSON).
    assert.doesNotMatch(source, /"status":"[^"]*\|/);
    assert.doesNotMatch(source, /"correction":null\s*\|/);
    // A concrete nullable verdict and a separate concrete issue verdict with its correction object.
    assert.match(source, /"status":"verified"[^}]*"correction":null\}/);
    assert.match(source, /"status":"issue"/);
    assert.match(source, /"correction":\{"questionRu"/);
    assert.doesNotMatch(source, /correction опускай/i);
  }
});
