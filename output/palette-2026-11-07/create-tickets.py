import sys,json
from pathlib import Path
sys.path.insert(0,'output/sprint-plan-2026-11-04')
from jira import api
root=Path('output/palette-2026-11-07')
def doc(t):return {'type':'doc','version':1,'content':[{'type':'paragraph','content':[{'type':'text','text':p}]} for p in t.split('\n')]}
parent=api('/rest/api/3/issue/AIN-1?fields=summary,description,status,subtasks,issuelinks')
(root/'parent.json').write_text(json.dumps(parent,indent=2))
story=api('/rest/api/3/issue','POST',{'fields':{'project':{'key':'AIN'},'issuetype':{'name':'Story'},'parent':{'key':'AIN-1'},'summary':'[XDS] Apply Espresso palette consistently across application surfaces','description':doc('As an application user, I want consistent, readable colors and shared components across the application so that navigation, actions and states feel coherent in light and dark modes.\nUser-approved palette: Espresso #38271F; Terracotta #D66A42; Sand #F2DDBB; Dusty Sage #A9BAA0; Porcelain #F6F0E8. EnsuredXDS owns color definitions, derived accessible tones and reusable visual components.\nAcceptance: central light/dark semantic tokens and generated CSS defaults; migrate application-local colors and shared component styling to XDS; cover host UI, Marketplace, Network, registration/auth, SubmissionUI, Logistics and service catalog; preserve payloads and workflows; verify contrast, focus, hover, disabled, validation and theme persistence with executable Storybook interactions and relevant builds. Record remaining gaps explicitly. Local runtime refresh is included; production deployment/package publication is not authorized.\nDependencies: central tokens precede consumer migration, then verification. AIN-150 is a completed Settings regression boundary; AIN-151 is a pre-existing API-boundary issue unrelated to palette acceptance; AIN-87 is independent document workflow work. Broader AIN-1 release acceptance remains separate and incomplete.') }})
keys={'story':story['key'],'tasks':[]}
for title,body in [
 ('Define Espresso palette and shared theme contracts','Define exact five base colors in XDS, accessible derived light/dark semantic tones, raw renderer colors, shared CSS defaults generated from the same source. Fix shared component foreground/background pairings and add executable theme interaction/contrast evidence.'),
 ('Migrate application colors and shared visual components to XDS','After central tokens, inventory and migrate all application surfaces and reusable visual primitives to XDS ownership. Remove duplicate local palette literals and startup defaults; retain intentional vendor/data renderer tokens centrally. Verify standalone and hosted entry points.'),
 ('Verify Espresso rollout across application surfaces','After migration, run builds and executable Storybook interaction regressions in both themes, inspect representative desktop/mobile screens, check no accidental service writes, refresh local runtime and record ticket/component/story evidence. Track and fix discovered gaps before parent closure.')]:
 r=api('/rest/api/3/issue','POST',{'fields':{'project':{'key':'AIN'},'issuetype':{'name':'Subtask'},'parent':{'key':story['key']},'summary':'[Palette] '+title,'description':doc(body)}})
 keys['tasks'].append(r['key'])
(root/'tickets.json').write_text(json.dumps(keys,indent=2))
for key in [keys['story'],keys['tasks'][0]]:
 ts=api('/rest/api/3/issue/'+key+'/transitions')['transitions']
 t=next(t for t in ts if t['to']['name']=='In Progress');api('/rest/api/3/issue/'+key+'/transitions','POST',{'transition':{'id':t['id']}})
print(json.dumps(keys))
