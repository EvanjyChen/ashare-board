const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const source=html.slice(html.indexOf('function navHistory('),html.indexOf('// 简单 canvas 市值走势图'));
let records=[],exported=false,drawn;
const nodes={};const node=id=>nodes[id]||(nodes[id]={textContent:'',innerHTML:'',appendChild(){}});
const c=vm.createContext({Map,Number,state:{txs:[]},loadSnapshots:()=>records,
netExternalFlow:()=>50,$:node,fmt:String,fmtSigned:String,escapeHtml:String,pnlClass:()=>'',drawChart:x=>drawn=x,
toast:()=>{},Blob,URL:{createObjectURL:()=>{exported=true;return 'blob:test'},revokeObjectURL(){}},setTimeout:()=>{},
document:{createElement:()=>({click(){}})}});
vm.runInContext(source,c);
c.renderHistory();assert.equal(drawn.length,0);
records=[{date:'2026-11-19',stockValue:1000,cash:100,isClose:true},{date:'2026-11-20',stockValue:1100,cash:150,isClose:true}];
c.renderHistory();assert.equal(drawn.length,2);assert.equal(drawn[0].delta,null);assert.equal(drawn[1].delta,100);assert.equal(drawn[1].baseDate,'2026-11-19');assert.match(node('navSummary').textContent,/2026-11-19/);
c.exportNavHistory();assert.equal(exported,true);
records.unshift({date:'2026-10-08',stockValue:900,cash:100,isClose:true});
c.renderHistory();assert.equal(drawn.length,3);assert.match(node('navSummary').textContent,/2026-10-08/);
records=[{date:'2026-11-19',stockValue:NaN,cash:0,isClose:true},{date:'2026-11-20',stockValue:100,cash:0,isClose:false}];
c.renderHistory();assert.equal(drawn.length,0);
console.log('PASS: missing baseline, available history, cash-flow adjustment, export, original baseline and invalid records');
