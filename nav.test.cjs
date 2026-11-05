const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8'), ctx=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function latestTransferDate('),html.indexOf('function exportNavHistory(')),ctx);
assert.equal(ctx.latestTransferDate([{type:'转入',amount:100,time:'2026-10-08T08:00:00Z'},{type:'转出',amount:20,time:'2026-10-10T18:00:00Z'},{type:'买入',amount:10,time:'2026-11-01T08:00:00Z'}]),'2026-10-11');
assert.equal(ctx.latestTransferDate([]),'');
const rows=ctx.navHistory([
 {date:'2026-11-02',stockValue:80,cash:20,isClose:true},
 {date:'2026-11-03',stockValue:900,cash:20},
 {date:'2026-11-04',stockValue:90,cash:30,isClose:true}
]);
assert.equal(rows.length,2);
assert.equal(rows[0].delta,null);
assert.equal(rows[1].total,120);
assert.equal(rows[1].delta,20);
assert.equal(rows[1].pct,20);
assert.equal(rows[1].baseDate,'2026-11-02');
const limited=ctx.navHistory(rows,'2026-11-04');
assert.equal(limited.length,1);
assert.equal(limited[0].delta,null);
assert.equal(ctx.navHistory([{date:'2026-11-02',stockValue:NaN,cash:0,isClose:true}]).length,0);
console.log('PASS: total assets, cash changes, percentage, first record, missing date, invalid snapshots');
