import sys,json
sys.path.insert(0,'output/sprint-plan-2026-11-04')
from jira import api
from pathlib import Path
def doc(s):return {'type':'doc','version':1,'content':[{'type':'paragraph','content':[{'type':'text','text':s}]}]}
def transition(k,name):
 t=next(t for t in api('/rest/api/3/issue/'+k+'/transitions')['transitions'] if t['to']['name']==name)
 api('/rest/api/3/issue/'+k+'/transitions','POST',{'transition':{'id':t['id']}})
api('/rest/api/3/issue/AIN-154/comment','POST',{'body':doc('Central foundation implemented: EnsuredXDS/src/palette.ts owns exact five base colors, accessible semantic themes and renderer ramps; colors.ts and generated colors.css share it. Shared Badge now uses withAlpha for CSS variables (fixes NaN status fills); Heatmap uses color-mix instead of parsing CSS variables; Button secondary pairing/focus and Input focus fixed. Evidence: npm --prefix EnsuredXDS run build and build-storybook pass; node --test EnsuredXDS/test/palette.test.mjs passes 5/5 (both themes, text/action/state contrast >=4.5); node scripts/verify-palette-stories.mjs passes xds-palette-workflow--theme-and-form including theme persistence, exact computed tokens, invalid submit, payload, keyboard focus, disabled states, badge fill and actual browser hover in both themes. Screenshots/results: output/palette-2026-11-07. AIN-153 remains incomplete pending AIN-155 consumer migration and AIN-156 regression/local runtime rollout. No deployment.')})
transition('AIN-154','Done');transition('AIN-155','In Progress')
for k in ['AIN-153','AIN-154','AIN-155','AIN-156']:
 r=api('/rest/api/3/issue/'+k+'?fields=summary,status,subtasks');print(k,r['fields']['status']['name'])
