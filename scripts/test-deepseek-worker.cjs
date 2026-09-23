/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const assert = require('node:assert/strict');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quiet-worker-test-'));
const bin = path.join(root, 'bin');
fs.mkdirSync(bin);
const stub = (name, text) => fs.writeFileSync(path.join(bin, name), text, {mode: 0o755});
stub('git', '#!/bin/sh\nprintf "%s\\n" "${MOCK_BRANCH:-deepseek/test}"\n');
stub('npx', `#!${process.execPath}
const fs = require('node:fs');
console.log('PRIVATE_REASONING_' + 'x'.repeat(50000));
console.error('PRIVATE_STDERR');
if (process.env.MOCK_REPORT !== 'missing') {
  fs.writeFileSync(process.env.DEEPSEEK_SUMMARY_FILE,
    process.env.MOCK_REPORT === 'long' ? 'я'.repeat(9000) :
    'Changed: example.ts\\nChecks: mock check PASS\\nRemaining: none');
}
process.exit(Number(process.env.MOCK_EXIT || 0));
`);
stub('deepseek-usage', '#!/bin/sh\necho PRIVATE_USAGE\nexit 1\n');
stub('deepseek-record-usage', '#!/bin/sh\necho PRIVATE_RECORD\nexit 1\n');
const script = process.argv[2] || path.join(__dirname, 'deepseek-worker.zsh');
let count = 0;
function run(name, settings, expected, check = () => {}) {
  const dir = path.join(root, name);
  const worktree = path.join(dir, 'worktree');
  const state = path.join(dir, 'state');
  fs.mkdirSync(worktree, {recursive:true});
  fs.mkdirSync(state, {recursive:true});
  fs.writeFileSync(path.join(state, 'mode'), settings.MODE || 'on');
  const result = spawnSync('/bin/zsh', [script, 'Mock task only'], {
    env: {...process.env, PATH: bin + ':' + process.env.PATH,
      DEEPSEEK_WORKTREE: worktree, DEEPSEEK_STATE_DIR: state, ...settings},
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, expected, name + ': ' + result.stderr);
  assert(!result.stdout.includes('PRIVATE_'), name + ': private output leaked');
  assert(!result.stderr.includes('PRIVATE_'), name + ': private stderr leaked');
  assert(result.stdout.length < 3000, name + ': unbounded output');
  assert(!fs.readdirSync(worktree).some(n => n.startsWith('.deepseek-result-')));
  check(result, state);
  count++;
}
run('success', {}, 0, (r, state) => {
  assert(r.stdout.includes('mock check PASS'));
  const entry = fs.readdirSync(path.join(state, 'logs'))[0];
  const log = fs.readFileSync(path.join(state, 'logs', entry, 'worker.log'), 'utf8');
  assert(log.includes('PRIVATE_REASONING_') && log.includes('PRIVATE_STDERR'));
  assert(log.includes('PRIVATE_RECORD'));
});
run('long', {MOCK_REPORT:'long'}, 0, r => assert(r.stdout.includes('[Summary truncated]')));
run('missing', {MOCK_REPORT:'missing'}, 65, r => assert(r.stdout.includes('unverified')));
run('failed', {MOCK_EXIT:'17'}, 17);
run('failed-missing', {MOCK_EXIT:'17', MOCK_REPORT:'missing'}, 17);
run('off', {MODE:'off'}, 20);
run('wrong-branch', {MOCK_BRANCH:'main'}, 5);
console.log(count + '/7 launcher checks passed; no real DeepSeek/API calls.');
