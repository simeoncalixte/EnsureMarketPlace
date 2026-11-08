import sys,json
from pathlib import Path
sys.path.insert(0,'output/sprint-plan-2026-11-04');from jira import api
def doc(s):return {'type':'doc','version':1,'content':[{'type':'paragraph','content':[{'type':'text','text':s}]}]}
r=api('/rest/api/3/issue','POST',{'fields':{'project':{'key':'AIN'},'issuetype':{'name':'Subtask'},'parent':{'key':'AIN-153'},'summary':'Fix blank application from stale optimized XDS exports','description':doc('User reported blank localhost:3000 landing page. Existing Firefox console proves cached @ensured_xds_colors.js lacks categoryColor imported by PipelineProcesses; fresh-browser checks missed this. Acceptance: exclude locally mounted XDS from Vite immutable optimized dependencies; refresh local runtime; existing affected Firefox tab and clean browser render successfully; regression checks confirm direct XDS import and categoryColor export. Preserve session/account data. No new workflow; retain existing palette interaction evidence.') }})
Path('output/palette-2026-11-07/cache-ticket.json').write_text(json.dumps(r));print(r['key'])
t=next(t for t in api('/rest/api/3/issue/'+r['key']+'/transitions')['transitions'] if t['to']['name']=='In Progress');api('/rest/api/3/issue/'+r['key']+'/transitions','POST',{'transition':{'id':t['id']}})
