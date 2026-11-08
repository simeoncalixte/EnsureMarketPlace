import sys,json
from pathlib import Path
sys.path.insert(0,'output/sprint-plan-2026-11-04')
from jira import api
p=Path('output/palette-2026-11-07')
def doc(s):return {'type':'doc','version':1,'content':[{'type':'paragraph','content':[{'type':'text','text':s}]}]}
def move(k):
 r=api('/rest/api/3/issue/'+k+'?fields=status')
 if r['fields']['status']['name']=='Done':return
 t=next(t for t in api('/rest/api/3/issue/'+k+'/transitions')['transitions'] if t['to']['name']=='Done')
 api('/rest/api/3/issue/'+k+'/transitions','POST',{'transition':{'id':t['id']}})
message='Final local verification complete. 151 successful interaction runs covering 96 unique stories; executable fixture transports block application/external writes. Both themes and representative 375/1440px layouts checked. XDS palette/contrast tests 5/5; manifest+palette 7/7; full XDS 12/13 with only pre-existing AIN-151 source boundary failure. Main workspace, SubmissionUI, Logistics and Auth builds pass; static Services tests 7/7 and Auth stylesheet test pass. Host typecheck exactly matches 21 baseline diagnostic fingerprints. theme:check passes all 4 generated assets and 312 product source files. Latest landing CTA contrast and ThemeToggle SVG verified. Local UI/Auth/Services/SubmissionUI artifacts refreshed; existing PostgreSQL volume restored on internal Docker network to avoid unrelated host port conflict. Live host and SubmissionUI render both themes without JS errors; Services renders Espresso; Auth and Services generated CSS return 200 (7/7 runtime checks). Logistics production artifact built; no existing Logistics runtime to refresh. No new migration required, no production deployment or registry publication. Evidence: output/palette-2026-11-07/verification-summary.json, runtime.json, final build/test logs/screenshots; commands scripts/verify-palette-{stories,runtime}.mjs and npm run theme:check. Story mapping: XDS palette workflow, host Settings/model-library/email/pipeline/commercial/landing/navigation, Marketplace experience/participation, Network fixtures/party participation, Logistics collaboration, Auth registration. All scoped palette acceptance criteria satisfied; broader AIN-1 platform release remains incomplete and excluded obligations unchanged.'
api('/rest/api/3/issue/AIN-156/comment','POST',{'body':doc(message)})
move('AIN-156')
r=api('/rest/api/3/issue/AIN-153?fields=status,subtasks,description,issuelinks')
children=r['fields']['subtasks']
assert {x['key'] for x in children}=={'AIN-154','AIN-155','AIN-156','AIN-157'}
assert all(api('/rest/api/3/issue/'+x['key']+'?fields=status')['fields']['status']['name']=='Done' for x in children)
api('/rest/api/3/issue/AIN-153/comment','POST',{'body':doc(message+' Reconciled all four required subtasks Done before parent closure. Exact five base colors and accessible derived tones centrally owned by XDS; application domain compositions consume shared primitives. Developer CallGraph demos, generated document/email outputs, third-party assets and stored signatures remain explicit exclusions.')})
move('AIN-153')
receipt={k:api('/rest/api/3/issue/'+k+'?fields=status,subtasks') for k in ['AIN-153','AIN-154','AIN-155','AIN-156','AIN-157','AIN-151']}
(p/'jira-final.json').write_text(json.dumps(receipt,indent=2))
for k,r in receipt.items():print(k,r['fields']['status']['name'])
