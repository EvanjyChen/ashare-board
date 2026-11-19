const {test}=require('node:test'),a=require('node:assert/strict'),f=require('./sell-fees');
test('Shanghai gross commission plus stamp and SH transfer',()=>a.equal(f.calculate('sh600519',100000,'2026-11-19','').total,151));
test('Shenzhen transfer already included per screenshot',()=>a.equal(f.calculate('sz000001',100000,'2026-11-19','').total,150));
test('minimum commission',()=>a.equal(f.calculate('sh600519',1000,'2026-11-19','').total,5.51));
test('Beijing net commission adds separate regulatory and handling',()=>a.equal(f.calculate('bj920087',100000,'2026-11-19','').total,465.5));
test('HK fee unknown cannot silently charge zero',()=>a.throws(()=>f.calculate('hk09992',142400,'2026-11-19','')));
test('explicit HK total used once',()=>a.equal(f.calculate('hk09992',142400,'2026-11-19','200.12').total,200.12));
test('invalid fee blocked',()=>{for(const v of [-1,Infinity,'x',1001])a.throws(()=>f.calculate('sh600519',1000,'2026-11-19',v));});
test('daily profit subtracts sell fees once',()=>{
 const fs=require('fs'),vm=require('vm'),s=fs.readFileSync(__dirname+'/index.html','utf8');
 const c=vm.createContext({state:{txs:[{type:'卖出',code:'sh600519',price:110,qty:100,amount:11000,sellFee:10,tradeDate:'2026-11-19'}]},chinaDate:()=> '2026-11-19',normalizeCode:x=>x});
 vm.runInContext(s.slice(s.indexOf('function calcLiveDayPnl('),s.indexOf('/* =====================================================================\n * 盈亏与占比计算')),c);
 a.equal(c.calcLiveDayPnl('sh600519',0,110,100),990);
});
