import datetime as dt, unittest
from capture_fx import acceptable, calendar, HK, parse_quote
class Tests(unittest.TestCase):
 def test_quote(self):
  q=parse_quote('v_whHKDCNY="310~港元人民币~HKDCNY~0.8496~0~20261119155959";')
  target=dt.datetime(2026,11,19,16,tzinfo=HK)
  self.assertTrue(acceptable(q,target))
  for sec in [-1,31]:
   q['quotedAt']=(target-dt.timedelta(seconds=sec)).isoformat();self.assertFalse(acceptable(q,target))
 def test_calendar(self):
  d=calendar(dt.datetime(2026,11,19,tzinfo=HK));s={s['date']:s for s in d['sessions']}
  self.assertNotIn('2026-12-25',s)
  self.assertNotIn('2026-11-21',s)
  self.assertEqual(dt.datetime.fromisoformat(s['2026-12-24']['close']).astimezone(HK).hour,12)
  self.assertEqual(dt.datetime.fromisoformat(s['2026-11-19']['close']).astimezone(HK).hour,16)
if __name__=='__main__':unittest.main()
