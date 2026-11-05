const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8'), ctx=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function navHistory('),html.indexOf('function exportNavHistory(')),ctx);
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
assert.equal(ctx.navHistory([{date:'2026-11-02',stockValue:NaN,cash:0,isClose:true}]).length,0);
console.log('PASS: total assets, cash changes, percentage, first record, missing date, invalid snapshots');
