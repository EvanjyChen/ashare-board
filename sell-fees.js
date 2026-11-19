(function(root){
'use strict';
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
function calculate(code,amount,date,override){
 if(!Number.isFinite(amount)||amount<=0)throw Error('成交金额无效');
 if(override!=='' && override!==undefined && override!==null){
  const fee=Number(override);if(!Number.isFinite(fee)||fee<0||fee>amount)throw Error('卖出税费须在 0 与成交金额之间');
  return {total:round(fee),source:'手工录入佣金及税费合计'};
 }
 if(/^hk/.test(code))throw Error('港股通佣金未知，请填写交割单佣金及税费合计（港元）');
 if(date<'2023-08-28' || !/^(sh(60|68)|sz(00|30)|bj)/.test(code))throw Error('该证券或日期请按交割单填写卖出税费合计');
 const bj=/^bj/.test(code),sh=/^sh/.test(code);
 const commission=round(Math.max(5,amount*(bj?.004:.001)));
 const stamp=round(amount*.0005);
 // User screenshot: SZ transfer/handling/regulatory fees included in gross commission.
 const transfer=sh||bj?round(amount*.00001):0;
 const handling=bj?round(amount*.000125):0;
 const regulatory=bj?round(amount*.00002):0;
 const total=round(commission+stamp+transfer+handling+regulatory);
 if(total>amount)throw Error('税费超过成交金额，请核对交割单');
 return {total,commission,stamp,transfer,handling,regulatory,source:'按华福截图佣金及现行普通股税费预估'};
}
const api={calculate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SellFees=api;
})(typeof window==='undefined'?globalThis:window);
