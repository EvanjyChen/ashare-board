const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
let formatterCount=0;
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
const today=formatter.format(new Date());
const state={cash:0,rows:[],txs:[]},quotes={};
for(let i=0;i<25;i++){const code='stock'+i;state.rows.push({code,qty:100,cost:10});quotes[code]={price:11,prevClose:10,date:today};}
for(let i=0;i<500;i++)state.txs.push({type:'买入',code:'stock'+(i%25),qty:1,price:9,time:'2026-01-01T15:00:00+08:00'});
const ctx=vm.createContext({state,quotes,normalizeCode:x=>x,Intl:{DateTimeFormat:function(){formatterCount++;return formatter;}}});
vm.runInContext(html.slice(html.indexOf('function isTodayStockTrade('),html.indexOf('function renderAll()')),ctx);
for(let i=0;i<5;i++)assert.equal(ctx.calc().todayPnl,2500);
assert.equal(formatterCount,1,'Reuse one formatter instead of constructing one per transaction');
console.log('PASS: 25 holdings × 500 trades × 5 calculations; one date formatter; unchanged PnL');
