"""Capture a timestamped Tencent quote at XHKG continuous-session close.
Scheduled early because Actions cron is not an exact-time scheduler. Never
substitute a late/night quote if the capture window was missed.
"""
import argparse, datetime as dt, json, math, pathlib, re, subprocess, time
from zoneinfo import ZoneInfo
import exchange_calendars as xc
HK = ZoneInfo('Asia/Hong_Kong')
ROOT = pathlib.Path(__file__).resolve().parents[1]

def calendar(now):
    start = now.date() - dt.timedelta(days=45)
    end = now.date() + dt.timedelta(days=400)
    cal = xc.get_calendar('XHKG', start=str(start), end=str(end))
    rows = []
    for day, r in cal.schedule.iterrows():
        def iso(v):
            return None if str(v) == 'NaT' else v.isoformat()
        rows.append(dict(date=str(day.date()), open=iso(r['open']), close=iso(r['close']),
                         breakStart=iso(r['break_start']), breakEnd=iso(r['break_end'])))
    return dict(version=1, validFrom=str(start), validThrough=str(end), sessions=rows,
                convention='XHKG continuous-session close; 16:00 full day, 12:00 half day', closes={})

def parse_quote(raw):
    fields = raw.split('"')[1].split('~')
    rate = float(fields[3])
    stamp = dt.datetime.strptime(fields[5], '%Y%m%d%H%M%S').replace(tzinfo=HK)
    if not math.isfinite(rate) or not 0.1 < rate < 2: raise ValueError('Invalid FX rate')
    return dict(rate=rate, quotedAt=stamp.isoformat(), source='Tencent whHKDCNY')

def quote():
    raw = subprocess.check_output(['curl','--fail','--silent','--show-error','--max-time','10',
        'https://qt.gtimg.cn/q=whHKDCNY&_='+str(time.time_ns())]).decode('gb18030')
    return parse_quote(raw)

def acceptable(q, target):
    # Use only a quote from the final 30 seconds BEFORE close, never a post-close quote.
    age = (target - dt.datetime.fromisoformat(q['quotedAt'])).total_seconds()
    return 0 <= age <= 30

def main():
    p=argparse.ArgumentParser(); p.add_argument('--calendar-only',action='store_true'); p.add_argument('--probe',action='store_true'); a=p.parse_args()
    if a.probe: print(json.dumps(quote())); return
    now=dt.datetime.now(HK); path=ROOT/'data/hkd-cny.json'; data=calendar(now)
    if path.exists(): data['closes']=json.loads(path.read_text())['closes']
    if not a.calendar_only:
        session=next((s for s in data['sessions'] if s['date']==str(now.date())),None)
        if not session: print('HKEX holiday: no capture'); return
        target=dt.datetime.fromisoformat(session['close']); remaining=(target-now).total_seconds()
        if remaining > 2400: print('Not near this session close'); return
        if str(now.date()) in data['closes']: print('Already captured'); return
        if remaining < -45: raise RuntimeError('Missed close capture window; refusing current FX')
        best=None
        while dt.datetime.now(HK) <= target+dt.timedelta(seconds=35):
            if (target-dt.datetime.now(HK)).total_seconds() > 45:
                time.sleep(min(30, max(1,(target-dt.datetime.now(HK)).total_seconds()-45))); continue
            try:
                q=quote()
                if acceptable(q,target) and (best is None or q['quotedAt']>best['quotedAt']): best=q
            except Exception as e: print('Quote retry:',type(e).__name__,flush=True)
            if best and dt.datetime.now(HK)>=target+dt.timedelta(seconds=10): break
            time.sleep(2)
        if not best: raise RuntimeError('No quote within 30s before close; existing archive unchanged')
        best['closeAt']=target.isoformat(); data['closes'][str(now.date())]=best
    path.parent.mkdir(exist_ok=True); path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('Saved calendar and',len(data['closes']),'verified close snapshots')
if __name__=='__main__': main()
