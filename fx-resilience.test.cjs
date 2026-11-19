const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const FxPolicy=require('./fx-policy');
const html=fs.readFileSync(`${__dirname}/index.html`,'utf8');
const code=html.slice(html.indexOf('function isTodayStockTrade('),html.indexOf('function renderAll()'));
function fixture(saved={},fetcher=async()=>{throw Error('offline')}) {
  const cache=new Map(Object.entries(saved)), status={textContent:''};
  const c=vm.createContext({FxPolicy,AbortSignal,fetch:fetcher,$:()=>status,
    localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},
    state:{cash:1000,rows:[{code:'hk09992',cost:100,qty:1000}],txs:[]},
    quotes:{hk09992:{price:142.4,prevClose:140,date:'2026-11-20'}},normalizeCode:x=>x,
    document:{hidden:false},renderAll:()=>{}});
  vm.runInContext(code,c); c.chinaDate=()=> '2026-11-20';
  return {c,cache,status};
}
function amounts(c,rate) {
  const a=c.calc();
  for(const [key,n] of Object.entries({stockValue:142400*rate,totalAsset:142400*rate+1000,totalPnl:42400*rate,todayPnl:2400*rate})) {
    assert.ok(Number.isFinite(a[key]),key); assert.ok(Math.abs(a[key]-n)<1e-7,`${key}: ${a[key]} vs ${n}`);
  }
}
test('cold start and both reference endpoints offline keep every RMB metric available',async()=>{
  const {c,cache,status}=fixture(); amounts(c,.8496); await c.loadFxArchive(); amounts(c,.8496);
  assert.match(status.textContent,/接口不可用/); assert.ok(cache.has('ashare_fx_valuation_v1'));
});
test('same-origin reference mirror recovers when raw GitHub fails',async()=>{
  const calls=[]; const {c}=fixture({},async url=>{calls.push(url);if(url.startsWith('https:'))throw Error('blocked');
    return {ok:true,json:async()=>({version:1,reference:{'2026-11-20':{buy:.82,sell:.88}},settlement:{}})};});
  await c.loadFxArchive(); assert.equal(calls.length,2); amounts(c,.85);
});
test('malformed new reference and corrupted same-date cache cannot overwrite valid rate',async()=>{
  const bad={version:1,reference:{'2026-11-19':{buy:0,sell:9},'2026-11-20':{buy:'bad',sell:.9}},settlement:{}};
  const {c}=fixture({ashare_connect_fx_v1:JSON.stringify(bad)},async()=>({ok:true,json:async()=>bad}));
  await c.loadFxArchive(); amounts(c,.8496);
});
test('expired saved reference is retained with its original date',()=>{
  const {c,status}=fixture();c.chinaDate=()=> '2026-12-01';c.quotes.hk09992.date='2026-12-01';
  amounts(c,.8496);assert.match(status.textContent,/沿用已保存参考价/);assert.match(status.textContent,/2026-11-19/);
});
test('without reference, cached backup keeps all values available across reload',()=>{
  const {c,cache}=fixture();
  vm.runInContext("connectFx={reference:{}}; fxCache={rate:.84,quotedAt:new Date().toISOString(),source:'缓存备用'};",c);
  amounts(c,.84);
  const reloaded=fixture(Object.fromEntries(cache));vm.runInContext('connectFx={reference:{}};',reloaded.c);amounts(reloaded.c,.84);
});
test('Sina backup recovers Tencent failure, while all backup failures preserve reference',async()=>{
  const {c}=fixture();let calls=0;
  c.fxScript=async()=>{calls++;if(calls===1)throw Error('Tencent unavailable');const f=Array(18).fill('');const now=new Date(Date.now()+8*3600000).toISOString();f[8]='.86';f[17]=now.slice(0,10);f[0]=now.slice(11,19);return f.join(',');};
  await c.refreshFxFallback();assert.equal(calls,2);assert.equal(vm.runInContext("liveFx.rate",c),.86);amounts(c,.8496);
  c.fxScript=async()=>{throw Error('offline')};vm.runInContext('liveFx=null;',c);
  await c.refreshFxFallback();amounts(c,.8496);
});
