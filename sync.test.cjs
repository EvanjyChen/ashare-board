const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomBytes } = require('node:crypto');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
new vm.Script(script);
const helpers = script.slice(script.indexOf('async function parseSyncResponse'), script.indexOf('function genBoardId'));
const records = new Map();
let writes = 0;
let fail = false;
const context = vm.createContext({
  Blob, Response, TextEncoder, CompressionStream, DecompressionStream, Uint8Array, atob, btoa,
  syncUrl: suffix => suffix, syncHeaders: () => ({}),
  fetch: async (url, options) => {
    if (options.method === 'POST') {
      assert.ok(Buffer.byteLength(options.body) < 40960);
      if (fail) return Response.json({ error: 'quota exceeded' });
      const id = `chunk${++writes}`;
      records.set(id, JSON.parse(options.body));
      return Response.json({ objectId: id });
    }
    const row = records.get(decodeURIComponent(url.slice(1)));
    return Response.json(row || { error: 'missing chunk' }, { status: row ? 200 : 404 });
  }
});
vm.runInContext(helpers, context);
const plain = value => JSON.parse(JSON.stringify(value));
async function roundTrip(payload) {
  const upload = await context.prepareSyncPayload(payload);
  assert.ok(Buffer.byteLength(JSON.stringify(upload)) < 40960);
  const restored = await context.decodeSyncPayload(upload);
  for (const key of Object.keys(payload)) assert.deepEqual(plain(restored[key]), payload[key]);
  return upload;
}
(async () => {
  const base = { boardId: 'testboard', syncedAt: '2026-10-07', cash: 123, rows: [], lists: [], pool: [], notes: {}, txs: [] };
  const small = await roundTrip(base);
  assert.equal(small.syncPacked, '');
  assert.deepEqual(plain(small.syncChunks), []);
  assert.deepEqual(plain(await context.decodeSyncPayload(base)), base);
  const chinese = { ...base, notes: { text: '交易复盘😀中文内容'.repeat(9000) } };
  assert.ok(Buffer.byteLength(JSON.stringify(chinese)) > 40960);
  const compressed = await roundTrip(chinese);
  assert.ok(compressed.syncPacked);
  assert.equal(writes, 0);
  const large = { ...base, notes: { text: randomBytes(100000).toString('hex') } };
  const chunked = await roundTrip(large);
  assert.ok(chunked.syncChunks.length > 1);
  fail = true;
  await assert.rejects(context.prepareSyncPayload(large), /quota exceeded/);
  const previous = await context.decodeSyncPayload(chunked);
  assert.equal(previous.notes.text, large.notes.text);
  records.delete(chunked.syncChunks[0]);
  await assert.rejects(context.decodeSyncPayload(chunked), /missing chunk/);
  await assert.rejects(context.decodeSyncPayload({ ...compressed, boardId: 'wrong' }), /校验失败/);
  console.log('PASS: legacy, small, UTF-8 gzip, chunking, failed upload, missing chunk, board validation; inline script syntax');
})().catch(error => { console.error(error); process.exitCode = 1; });
