/* HK valuation policy. Archive dates follow HKEX, not the device timezone. */
(function(root) {
  'use strict';
  function select(data, live, now) {
    const day = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
    if (!data || !Array.isArray(data.sessions) || !data.closes || !data.validFrom || !data.validThrough || day < data.validFrom || day > data.validThrough) return {rate:null,label:'交易日历不可用，等待更新'};
    const session=data.sessions.find(s=>s.date===day);
    // Lunch remains within today's session; only final close freezes valuation.
    if (session && now>=Date.parse(session.open) && now<Date.parse(session.close)) {
      const age=live ? now-Date.parse(live.quotedAt) : Infinity;
      if (!live || !Number.isFinite(live.rate) || live.rate<=0 || !Number.isFinite(age) || age< -5000 || age>180000) return {rate:null,label:'实时汇率暂不可用'};
      return {...live,label:'盘中实时汇率'};
    }
    const completed=data.sessions.filter(s=>Date.parse(s.close)<=now).at(-1);
    const q=completed && data.closes[completed.date];
    const age=q ? Date.parse(completed.close)-Date.parse(q.quotedAt) : Infinity;
    if (!q || !Number.isFinite(q.rate) || q.rate<=0 || !Number.isFinite(age) || age<0 || age>30000 || Date.parse(q.closeAt)!==Date.parse(completed.close))
      return {rate:null,label:(completed ? completed.date+' ' : '')+'收盘汇率待采集，请稍后刷新'};
    return {...q,label:completed.date+' 收盘锁定汇率'};
  }
  function valid(q, now) {
    return q && Number.isFinite(q.rate) && q.rate>0.1 && q.rate<2 &&
      Number.isFinite(Date.parse(q.quotedAt)) && Date.parse(q.quotedAt)<=now+5000;
  }
  function resolve(data, live, candidates, now) {
    const target=select(data, live, now);
    if (target.rate) return {...target,estimated:false};
    const archived=data && data.closes ? Object.values(data.closes).filter(q=>Date.parse(q.closeAt)<=now) : [];
    const options=[live,...(candidates||[]),...archived].filter(q=>valid(q,now));
    options.sort((a,b)=>Date.parse(b.quotedAt)-Date.parse(a.quotedAt));
    if (!options.length) return {...target,estimated:true};
    const q=options[0];
    return {...q,estimated:true,label:target.label+' · 备用估算（'+(q.source||'缓存')+'）'};
  }
  function validReference(q,date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && q && Number.isFinite(q.buy) && Number.isFinite(q.sell) && q.buy>0.1 && q.sell>=q.buy && q.sell<2;
  }
  function mergeReference(old, incoming) {
    const out=Object.assign({},old||{});
    Object.entries(incoming||{}).forEach(([date,q])=>{if(validReference(q,date))out[date]=q;});
    return out;
  }
  function reference(data, day) {
    const records=data && data.reference || {};
    const date=Object.keys(records).filter(d=>d<=day && validReference(records[d],d)).sort().at(-1);
    const q=date && records[date];
    if (!q) return null;
    return {rate:(q.buy+q.sell)/2,label:'港股通参考中间价'+(date<day?'（沿用已保存参考价）':'')+' · 适用日 '+date,source:'上交所',effectiveDate:date,quotedAt:date+'T00:00:00+08:00',estimated:date<day};
  }
  function trade(data, date, buy) {
    for (const [kind,status] of [['settlement','settled'],['reference','pending']]) {
      const q=data[kind] && data[kind][date];
      const rate=q && (buy?q.sell:q.buy);
      if (Number.isFinite(rate) && rate>0.1 && rate<2) return {rate,status};
    }
    return null;
  }
  function reconcile(tx, actual, cash) {
    const amount=Math.round(actual*100)/100;
    return {amount,cash:Math.round((cash+(tx.type==='卖出'?1:-1)*(amount-tx.cashAmountCny))*100)/100};
  }
  const api={select,resolve,valid,reference,trade,reconcile,mergeReference};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  else root.FxPolicy=api;
})(typeof window==='undefined' ? globalThis : window);
