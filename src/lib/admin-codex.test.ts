import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { getAdminCodexKey, withCodexAdmin, codexCompletion, codexExecArgs, createAdminSession, validAdminSession, ADMIN_SESSION_AGE, ADMIN_SESSION_COOKIE, resolveCodexModel, factCheckCodexOptions, codexDeadlineMs, FACTCHECK_MODEL_DEFAULT } from './admin-codex';
import { POST as sessionPost } from '../app/api/admin/session/route';

test('session signatures reject tampering, expiry and a rotated key', () => {
  const now = Date.now();
  const token = createAdminSession('test-key', now);
  assert.equal(validAdminSession(token, 'test-key', now), true);
  assert.equal(validAdminSession(token, 'different-key', now), false);
  assert.equal(validAdminSession(token, 'test-key', now + ADMIN_SESSION_AGE * 1000), false);
  assert.equal(validAdminSession(token + '0', 'test-key', now), false);
  assert.equal(validAdminSession('garbage', 'test-key', now), false);
});

test('login issues an HttpOnly session and logout clears it; cookie requires same origin', async () => {
  const key = await getAdminCodexKey();
  const req = (action: string, headers: Record<string, string> = {}, origin = 'http://localhost:3000') => new NextRequest('http://0.0.0.0:3000/api/admin/session', {
    method: 'POST', headers: { host: 'localhost:3000', ...(origin ? { origin } : {}), ...headers }, body: JSON.stringify({ action }),
  });
  assert.equal((await sessionPost(req('login'))).status, 401);
  const login = await sessionPost(req('login', { 'x-codex-admin-key': key }));
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=strict/i);
  assert.match(cookie, /Max-Age=2592000/i);
  assert.match(cookie, /Path=\/api\/admin/i);
  assert.equal(cookie.includes(key), false);
  const headers = { cookie: cookie.split(';')[0] };
  assert.equal((await sessionPost(req('status', headers))).status, 200);
  assert.equal((await sessionPost(req('status', headers, 'http://evil.example'))).status, 403);
  assert.equal((await sessionPost(req('status', headers, ''))).status, 403);
  assert.equal((await sessionPost(req('login', headers))).status, 401);
  const expired = createAdminSession(key, Date.now() - (ADMIN_SESSION_AGE + 1) * 1000);
  assert.equal((await sessionPost(req('status', { cookie: `${ADMIN_SESSION_COOKIE}=${expired}` }))).status, 401);
  const logout = await sessionPost(req('logout', headers));
  assert.match(logout.headers.get('set-cookie')!, /Max-Age=0/i);
  assert.equal((await logout.json()).authenticated, false);
  assert.equal((await sessionPost(req('status'))).status, 401);
});

test('admin gate blocks missing keys and foreign origins before invoking a handler', async () => {
  let calls = 0;
  const handler = withCodexAdmin(async () => { calls++; return Response.json({ ok: true }); });
  const req = (headers: Record<string, string>) => new NextRequest('http://localhost:3000/api/admin/test', { method: 'POST', headers, body: '{}' });
  assert.equal((await handler(req({}))).status, 401);
  assert.equal((await handler(req({ 'x-codex-admin-key': 'fake' }))).status, 401);
  const key = await getAdminCodexKey();
  assert.equal((await handler(req({ 'x-codex-admin-key': key, origin: 'https://other.example' }))).status, 403);
  assert.equal(calls, 0);
  assert.equal((await handler(req({ 'x-codex-admin-key': key, origin: 'http://localhost:3000' }))).status, 200);
  assert.equal(calls, 1);
});

test('admin gate uses the browser Host instead of the Next internal bind address', async () => {
  const key = await getAdminCodexKey();
  let calls = 0;
  const handler = withCodexAdmin(async () => { calls++; return Response.json({ ok: true }); });
  const request = (host: string, origin: string, extra = {}) => new NextRequest('http://0.0.0.0:3000/api/admin/test', {
    method: 'POST', headers: { host, origin, 'x-codex-admin-key': key, ...extra }, body: '{}',
  });
  for (const host of ['localhost:3000', '127.0.0.1:3000', '192.168.0.121:3000', '[::1]:3000']) {
    assert.equal((await handler(request(host, `http://${host}`))).status, 200, host);
  }
  assert.equal(calls, 4);
  for (const origin of ['https://other.example', 'http://localhost:4000', 'https://localhost:3000', 'null', 'http://0.0.0.0:3000']) {
    assert.equal((await handler(request('localhost:3000', origin, { 'x-forwarded-host': 'other.example' }))).status, 403, origin);
  }
  assert.equal(calls, 4);
});

test('admin gate bounds streamed body and preserves JSON', async () => {
  const key = await getAdminCodexKey();
  const handler = withCodexAdmin(async req => Response.json(await req.json()));
  const req = (body: string) => new NextRequest('http://localhost:3000/api/admin/test', { method: 'POST', headers: { 'x-codex-admin-key': key }, body });
  assert.equal((await handler(req('x'.repeat(100_001)))).status, 413);
  assert.deepEqual(await (await handler(req('{"count":2}'))).json(), { count: 2 });
});

test('Codex bridge rejects invalid work and concurrent requests without spawning', async () => {
  assert.equal((await codexCompletion('')).status, 400);
  const state = globalThis as typeof globalThis & { adminCodexBusy?: boolean };
  state.adminCodexBusy = true;
  try { assert.equal((await codexCompletion('test')).status, 429); }
  finally { state.adminCodexBusy = false; }
});

test('fact-check resolves the smaller model with no deadline while other operations keep their defaults', () => {
  assert.equal(FACTCHECK_MODEL_DEFAULT, 'gpt-5.6-terra');
  assert.equal(resolveCodexModel(undefined, {}), 'gpt-6-astra');
  assert.equal(resolveCodexModel(undefined, { ADMIN_CODEX_MODEL: 'custom' }), 'custom');
  assert.equal(resolveCodexModel('per-call', { ADMIN_CODEX_MODEL: 'custom' }), 'per-call');
  assert.deepEqual(factCheckCodexOptions({}), { model: 'gpt-5.6-terra', noDeadline: true });
  assert.equal(factCheckCodexOptions({ ADMIN_CODEX_FACTCHECK_MODEL: 'small-model' }).model, 'small-model');
  // The global model override must not affect the fact-check path.
  assert.equal(factCheckCodexOptions({ ADMIN_CODEX_MODEL: 'gpt-6-astra' }).model, 'gpt-5.6-terra');
  assert.equal(codexDeadlineMs(false), 180_000);
  assert.equal(codexDeadlineMs(true), 480_000);
  assert.equal(codexDeadlineMs(false, { noDeadline: true }), undefined);
  assert.equal(codexDeadlineMs(true, { noDeadline: true }), undefined);
});

test('codex exec asks for the output schema only when the caller supplies one', () => {
  const base = { model: 'gpt-5.6-terra', image: false, webSearch: true, outputPath: '/tmp/answer.txt' };
  const plain = codexExecArgs(base);
  assert.equal(plain.includes('--output-schema'), false);
  assert.equal(plain.at(-1), '-');
  assert.equal(plain[plain.indexOf('--output-last-message') + 1], '/tmp/answer.txt');
  assert.equal(plain[plain.indexOf('-m') + 1], 'gpt-5.6-terra');
  const shaped = codexExecArgs({ ...base, outputSchemaPath: '/tmp/output-schema.json' });
  const index = shaped.indexOf('--output-schema');
  assert.ok(index >= 0);
  assert.equal(shaped[index + 1], '/tmp/output-schema.json');
  assert.equal(shaped.at(-1), '-');
  // Image generation never receives a fact-check schema.
  assert.equal(codexExecArgs({ ...base, image: true, outputSchemaPath: undefined }).includes('--output-schema'), false);
});
