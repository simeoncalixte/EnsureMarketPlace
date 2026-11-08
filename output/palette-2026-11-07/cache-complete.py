import sys,json
from pathlib import Path
sys.path.insert(0,'output/sprint-plan-2026-11-04');from jira import api
msg='Fixed actual Firefox blank screen: cached optimized XDS colors lacked categoryColor. Vite now excludes mounted XDS and explicitly optimizes Recharts/use-sync-external-store shim. Refreshed container config/cache. Existing signed-in Firefox then revealed API 502 from stopped watch child after database outage; restarted API, health 200. Actual affected Firefox tab now renders /marketplace with Deal Inventory, filters and Active Opportunities; developer tools closed. No account/session clearing. Extended runtime check rejects optimized XDS imports in served PipelineProcesses; all 7 runtime checks pass both themes. Evidence cache-runtime.log/runtime.json and TASK_HANDOFF.md. Existing interaction stories unchanged; real-browser regression verifies dev bundling. Local correction complete, production not deployed.'
doc={'type':'doc','version':1,'content':[{'type':'paragraph','content':[{'type':'text','text':msg}]}]}
for k in ['AIN-158','AIN-156','AIN-153']:
 if k=='AIN-153':
  r=api('/rest/api/3/issue/'+k+'?fields=subtasks');assert all(x['fields']['status']['name']=='Done' for x in r['fields']['subtasks'])
 api('/rest/api/3/issue/'+k+'/comment','POST',{'body':doc})
 ts=api('/rest/api/3/issue/'+k+'/transitions')['transitions'];t=next(t for t in ts if t['to']['name']=='Done');api('/rest/api/3/issue/'+k+'/transitions','POST',{'transition':{'id':t['id']}})
r={k:api('/rest/api/3/issue/'+k+'?fields=status,subtasks') for k in ['AIN-158','AIN-156','AIN-153']};Path('output/palette-2026-11-07/cache-jira-final.json').write_text(json.dumps(r,indent=2));print({k:v['fields']['status']['name'] for k,v in r.items()})
