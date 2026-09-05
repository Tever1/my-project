import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual TV URL declarations/effect, without mounting the game or a browser.
const source = readFileSync(new URL('../app/tv/[roomId]/[gameType]/page.tsx', import.meta.url), 'utf8');
test('Who Am I game TV has no redundant join panel or shared QR overlay', () => {
  const start = source.indexOf("      if (ws.phase === 'lobby')");
  assert.ok(start > 0);
  const intro = source.slice(start, source.indexOf("      if (ws.phase === 'finished')", start));
  assert.doesNotMatch(intro, /QRCodeCanvas|tvQrPanel|ROOM CODE|КОД КОМНАТЫ|siteUrl/);
  assert.match(intro, /whoClay\.tvLobbyClosed/);
  assert.match(source, /const qrOverlay = showQrOverlay && gameType !== 'who-am-i'/);
});
const ast = ts.createSourceFile('tv.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = ast.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === 'TVGamePage');
assert.ok(page?.body);
const snippets = page.body.statements.filter((node) => {
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.some((d) => /^(localIp|siteUrl|port|joinUrl|\[localIp,|\[siteUrl,)/.test(d.name.getText(ast)));
  }
  return ts.isExpressionStatement(node) && node.getText(ast).includes("fetch('/api/local-ip')");
}).map((node) => node.getText(ast)).join('\n');
const code = ts.transpileModule(`(() => { ${snippets}; return { siteUrl, joinUrl }; })()`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function harness(location?: { origin: string; port: string }, response: { ip?: string } | Error = {}) {
  const states: unknown[] = [];
  const effects: (() => void)[] = [];
  let cursor = 0;
  const context = {
    roomId: 'Z97WPG',
    ...(location ? { window: { location } } : {}),
    useState: (initial: unknown) => {
      const slot = cursor++;
      if (!(slot in states)) states[slot] = initial;
      return [states[slot], (value: unknown) => { states[slot] = value; }];
    },
    useEffect: (effect: () => void) => { effects.push(effect); },
    fetch: async () => {
      if (response instanceof Error) throw response;
      return { json: async () => response };
    },
  };
  return {
    render: () => { cursor = 0; return runInNewContext(code, context) as { siteUrl: string; joinUrl: string }; },
    mount: async () => { effects.splice(0).forEach((effect) => effect()); await new Promise(setImmediate); },
  };
}

test('TV join text and QR URL match between SSR and the first client render', () => {
  const server = harness().render();
  const client = harness({ origin: 'http://localhost:3000', port: '3000' }).render();
  assert.equal(client.siteUrl, server.siteUrl);
  assert.equal(client.joinUrl, server.joinUrl);
});

test('after mount the TV URL uses the LAN IP and actual port', async () => {
  const client = harness({ origin: 'http://localhost:3100', port: '3100' }, { ip: '192.168.1.7' });
  client.render();
  await client.mount();
  assert.equal(client.render().joinUrl, 'http://192.168.1.7:3100/join/Z97WPG');
});

test('missing LAN IP falls back to the browser origin after mount', async () => {
  const client = harness({ origin: 'https://party.example', port: '' });
  client.render();
  await client.mount();
  assert.equal(client.render().joinUrl, 'https://party.example/join/Z97WPG');
});

test('failed LAN lookup falls back to the browser origin after mount', async () => {
  const client = harness({ origin: 'http://localhost:3000', port: '3000' }, new Error('offline'));
  client.render();
  await client.mount();
  assert.equal(client.render().joinUrl, 'http://localhost:3000/join/Z97WPG');
});
