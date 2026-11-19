const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const context = vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function normalizeCode('), html.indexOf('// 展示用：')), context);
for (const [input, output] of Object.entries({605179:'sh605179',sz605179:'sh605179',sh000001:'sh000001','09992':'hk09992', hk09992:'hk09992',920087:'bj920087',sh920087:'bj920087',bj920087:'bj920087',830974:'bj830974',600519:'sh600519','000001':'sz000001',hk600519:'',1234567:''})) {
  assert.equal(context.normalizeCode(input), output, input);
}
console.log('PASS: HK, Beijing, legacy Beijing prefix correction, Shanghai/Shenzhen, invalid codes');

(async function () {
  const calls = [];
  const merged = {};
  const c = vm.createContext({
    loadFxArchive:async()=>{}, applyFxPolicy:()=>{},
    state: {rows:[{code:'sh600519'},{code:'sh605179'}],pool:[],lists:[],txs:[]},
    normalizeCode:context.normalizeCode, isTodayStockTrade:()=>false,
    getProviderChain:()=>[
      ['primary',async codes=>{calls.push([...codes]);return {sh600519:{price:1500}};}],
      ['backup',async codes=>{calls.push([...codes]);return {sh605179:{price:17.25}};}]
    ],
    mergeQuotes:map=>Object.assign(merged,map),renderAll:()=>{},toast:()=>{},autoFillNames:()=>{},maybeSnapshot:()=>{}
  });
  vm.runInContext(html.slice(html.indexOf('let fetching = false;'),html.indexOf('// 编辑模式下：')),c);
  await c.refreshQuotes();
  assert.deepEqual(calls,[['sh600519','sh605179'],['sh605179']]);
  assert.equal(merged.sh605179.price,17.25);
  assert.equal(merged.sh600519.price,1500);
  console.log('PASS: partial provider response retries missing stocks without overwriting successful quotes');
})().catch(e=>{console.error(e);process.exitCode=1;});

