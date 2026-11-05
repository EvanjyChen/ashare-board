const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
function setup(rows,txs,quotes) {
  const c=vm.createContext({state:{rows,txs,cash:1000},quotes,normalizeCode:x=>x});
  vm.runInContext(html.slice(html.indexOf('function isTodayStockTrade('),html.indexOf('function renderAll()')),c);
  c.chinaDate=()=> '2026-11-05';
  return c;
}
const tx=(type,qty,price,date='2026-11-05')=>({type,qty,price,amount:qty*price,code:'sz000001',time:date+'T23:00:00.000Z'});
const quote={sz000001:{price:12,prevClose:10,date:'2026-11-05'}};
let c=setup([{code:'sz000001',qty:100,cost:9}],[],quote);
assert.equal(c.calc().todayPnl,200);
// Late entered historical buys do not become today's purchases.
c.state.txs=[tx('买入',100,9,'2026-10-08')];
assert.equal(c.calc().todayPnl,200);
// Literal recorded date is retained even when the ISO instant is next day in China.
c.state.txs=[tx('买入',20,11)];
assert.equal(c.calc().todayPnl,180);
// Buy/sell order must not affect daily cash-flow identity.
c.state.txs=[tx('卖出',30,13),tx('买入',20,11)];
assert.equal(c.calc().todayPnl,270);
c.state.txs.reverse(); assert.equal(c.calc().todayPnl,270);
// Liquidated stocks still contribute, even when absent from current position rows.
c=setup([],[tx('卖出',100,11)],quote);
assert.equal(c.calc().todayPnl,100);
assert.equal(c.calc().items[0].row.qty,0);
// No silently partial totals or stale prior-day quotes.
c=setup([{code:'sz000001',qty:100,cost:9}],[],{});
assert.equal(c.calc().todayPnl,null); assert.ok(Number.isNaN(c.calc().totalAsset));
c.quotes={sz000001:{price:12,prevClose:10,date:'2026-11-04'}};
assert.equal(c.calc().todayPnl,null);
c.quotes=quote; c.state.txs=[tx('买入',101,11)];
assert.equal(c.calc().todayPnl,null);
// A same-day round trip with no overnight position does not require yesterday's close.
c=setup([],[tx('买入',100,10),tx('卖出',100,11)],{sz000001:{price:11,prevClose:0,date:'2026-11-05'}});
assert.equal(c.calc().todayPnl,100);
// Historical snapshots and balance adjustments cannot alter stock trading PnL.
c.state.cash=123456; c.state.txs.push({type:'转入',amount:126868,time:'2026-11-05T07:18:09.551Z'});
assert.equal(c.calc().todayPnl,100);
console.log('PASS: literal trade dates, backfills, buys, sells, liquidations, transfer independence, incomplete quotes, inconsistent positions');
