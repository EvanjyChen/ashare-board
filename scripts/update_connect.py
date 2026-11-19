"""Archive official SSE reference and settlement FX, retaining source dates."""
import datetime as dt,json,pathlib,re,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
def parse(text,suffix=''):
 def get(key):
  m=re.search(r'var\s+'+key+suffix+r"\s*=\s*'([^']+)'",text)
  if not m:raise ValueError('Missing '+key)
  return m[1].strip()
 date=get('VALID_DATE');dt.date.fromisoformat(date)
 buy,sell=float(get('BUY_PRICE')),float(get('SELL_PRICE'))
 if not 0.1<buy<=sell<2:raise ValueError('Invalid FX')
 return {'date':date,'buy':buy,'sell':sell,'mid':round((buy+sell)/2,8)}
def main():
 p=ROOT/'data/connect-fx.json';d=json.loads(p.read_text()) if p.exists() else {'version':1,'reference':{},'settlement':{}}
 for kind,url,suffix in [('reference','exchange/data_1134.js',''),('settlement','ratios/data_1136.js','_clear')]:
  full='https://www.sse.com.cn/services/hkexsc/home/'+url
  txt=subprocess.check_output(['curl','-fsSL','--retry','3','--max-time','20',full]).decode()
  q=parse(txt,suffix);q['source']=full;d[kind][q['date']]=q
 d['updatedAt']=dt.datetime.now(dt.timezone.utc).isoformat();p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 print('Archived official SSE FX',max(d['reference']),max(d['settlement']))
if __name__=='__main__':main()
