const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');
const source = readFileSync(require('node:path').join(__dirname, '../fingerprint.js'), 'utf8');
function setup(options = {}) {
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, { textContent: '', value: '', disabled: true, focus() {}, select() {}, addEventListener() {} }); return nodes.get(id); };
  const drawing = { fillRect() {}, fillText() {}, beginPath() {}, arc() {}, stroke() {} };
  const context = vm.createContext({ crypto: options.noCrypto ? {} : webcrypto, TextEncoder, Uint8Array, Intl, navigator: { userAgent: 'Chrome example', language: 'en-US', hardwareConcurrency: 8, clipboard: { async writeText() { throw Error('blocked'); }, async readText() { throw Error('blocked'); } } }, screen: { width: 1920, height: 1080 }, window: { devicePixelRatio: 1 }, document: { getElementById: node, createElement: () => ({ getContext: kind => kind === '2d' && !options.noCanvas ? drawing : null, toDataURL: () => 'data:image/png;base64,fixture' }) } });
  vm.runInContext(source, context);
  return { context, node, run: code => vm.runInContext(code, context) };
}
async function ready(s) { for (let i = 0; i < 100 && !s.node('status').textContent; i++) await new Promise(r => setTimeout(r, 5)); }
test('hash compatibility, comparisons, and invalid input', async () => {
  const s = setup(); await ready(s);
  const snapshot = JSON.parse(s.run('JSON.stringify(currentSnapshot)'));
  assert.match(snapshot.fingerprint, /^[a-f0-9]{64}$/);
  const raw = ['browser','language','timezone','screen','cpu','canvasHash','gpuVendor','gpuRenderer'].map(k => snapshot[k]).join('|');
  assert.equal(snapshot.fingerprint, createHash('sha256').update(raw).digest('hex'));
  assert.equal(snapshot.canvasHash, createHash('sha256').update('data:image/png;base64,fixture').digest('hex'));
  s.node('snapshotInput').value = JSON.stringify(snapshot); s.run('compareSnapshot()');
  assert.equal((s.node('compareResult').textContent.match(/SAME/g) || []).length, 9);
  snapshot.browser = 'Edge example'; s.node('snapshotInput').value = JSON.stringify(snapshot); s.run('compareSnapshot()');
  assert.match(s.node('compareResult').textContent, /browser\s+: DIFFERENT/);
  for (const input of ['null', '[]', '{}', '{', '{"cpu":{}}']) { s.node('snapshotInput').value = input; s.run('compareSnapshot()'); assert.match(s.node('compareResult').textContent, /Invalid/); }
  s.node('snapshotInput').value = ''; s.run('compareSnapshot()'); assert.match(s.node('compareResult').textContent, /No snapshot/);
});
test('clipboard denial falls back to manual transfer', async () => {
  const s = setup(); await ready(s); await s.run('copySnapshot()');
  assert.match(s.node('status').textContent, /manually/); assert.ok(JSON.parse(s.node('snapshotInput').value).fingerprint);
  await s.run('pasteSnapshot()'); assert.match(s.node('status').textContent, /Paste manually/);
});
test('graphics APIs unavailable still produces a fingerprint', async () => {
  const s = setup({ noCanvas: true }); await ready(s);
  assert.equal(s.node('gpuVendor').textContent, 'WebGL unavailable'); assert.match(s.node('fingerprint').textContent, /^[a-f0-9]{64}$/);
});
test('missing Web Crypto reports error and prevents empty snapshot export', async () => {
  const s = setup({ noCrypto: true }); await ready(s);
  assert.match(s.node('status').textContent, /localhost/); assert.equal(s.node('copyButton').disabled, true);
  await s.run('copySnapshot()'); assert.equal(s.node('snapshotInput').value, '');
});
