import json,sys
from pathlib import Path
from urllib.parse import quote
from jira import api,ROOT
P=json.loads((ROOT/'plan.json').read_text())
B=json.loads((ROOT/'baseline.json').read_text())
FILE=ROOT/'receipts.json'
R=json.loads(FILE.read_text()) if FILE.exists() else {'issues':{},'sprints':{'1':36},'moved':[],'annotated':[],'links':[],'ranked':False}
def save():FILE.write_text(json.dumps(R,indent=2)+'\n')
def para(t):return {'type':'paragraph','content':[{'type':'text','text':t}]}
def heading(t):return {'type':'heading','attrs':{'level':2},'content':[{'type':'text','text':t}]}
def doc(lines):return {'version':1,'type':'doc','content':[para(t) for t in lines]}
def issue(k):return api('/rest/api/3/issue/'+k+'?fields=summary,description,status,parent,issuetype,labels,issuelinks,subtasks,customfield_10020,customfield_10016')
def key(k):return R['issues'].get(k,k)
def link(a,b,kind):
 a,b=key(a),key(b);mark=f'{kind}:{a}:{b}'
 if mark in R['links']:return
 f=issue(a)['fields']
 if not any(l['type']['name']==kind and l.get('outwardIssue',{}).get('key')==b for l in f['issuelinks']):
  api('/rest/api/3/issueLink','POST',{'type':{'name':kind},'inwardIssue':{'key':a},'outwardIssue':{'key':b}})
 R['links'].append(mark);save()
def append(k,lines,labels=None):
 mark='Single-developer sprint sequence — 2026-11-04'
 if k in R['annotated']:return
 before=issue(k);f=before['fields'];old=f.get('description')or {'type':'doc','version':1,'content':[]}
 fields={}
 if mark not in json.dumps(old):fields['description']={**old,'content':old['content']+[heading(mark)]+[para(t)for t in lines]}
 if labels:fields['labels']=sorted(set(f.get('labels',[])+labels))
 if fields:api('/rest/api/3/issue/'+k,'PUT',{'fields':fields})
 after=issue(k)['fields']
 assert after['status']['id']==f['status']['id']
 assert after.get('parent',{}).get('key')==f.get('parent',{}).get('key')
 if 'description'in fields:assert after['description']==fields['description']
 R['annotated'].append(k);save()
 print('Annotated',k,flush=True)

phase=sys.argv[1]
if phase=='issues':
 for id,s in P['extra'].items():
  if id not in R['issues']:
   label='sprint-plan-20261104-'+id
   found=api('/rest/api/3/search/jql?jql='+quote('project = AIN AND labels = "'+label+'"')+'&fields=summary&maxResults=10')['issues']
   if len(found)>1:raise RuntimeError('Duplicate marker '+id)
   slot=P['sprints'][P['assignment'][id]-1]
   description=doc([s['description'],'Acceptance and exit evidence: '+slot['exit'],
    'Definition of Done: implement this bounded scope; retain exact source versions and evidence; execute applicable Storybook play scenarios asserting user actions, observable outcomes and submitted payloads (success, validation, failure/retry, permission, loading/empty and pagination where applicable). Backend-only scope requires integration evidence linked to the affected user stories, not artificial UI.',
    'Use isolated fixtures that cannot write application data plus authenticated real-service Docker checks for persistence, permissions, retries and concurrency. Money/provider claims additionally require actual configured sandbox reconciliation. Record ticket/component/story IDs, commands/results and integrated staging build evidence. Any migration requires compatibility and rollback evidence.',
    'Existing parent/domain acceptance criteria remain intact. Completion of this delivery slice does not close the broader owner '+s['owner']+'. No implementation or deployment is claimed by planning.'])
   if found:k=found[0]['key']
   else:
    r=api('/rest/api/3/issue','POST',{'fields':{'project':{'key':'AIN'},'issuetype':{'id':'10036' if s['type']=='Story' else '10038'},'parent':{'key':s['epic']},'summary':s['summary'],'description':description,'labels':[label,'single-developer-plan']}});k=r['key']
   R['issues'][id]=k;save()
   f=issue(k)['fields'];assert f['parent']['key']==s['epic'];assert f['description']==description
   print('Created and verified',k,s['summary'],flush=True)
  link(id,s['owner'],'Relates')
  for t in s['related']:link(id,t,'Relates')
 for a,b in [('intake','AIN-16'),('intake','AIN-87'),('capacity-slice','AIN-88'),('capacity-slice','AIN-36'),('premium-slice','AIN-37'),('premium-slice','AIN-89'),('funding-slice','AIN-36'),('funding-slice','AIN-90'),('integration-slice','AIN-119'),('parametric','AIN-121')]:link(a,b,'Blocks')
 for t in ['AIN-38','AIN-40']:link('parametric',t,'Relates')
elif phase=='sprints':
 existing=[];start=0
 while True:
  page=api(f'/rest/agile/1.0/board/34/sprint?startAt={start}&maxResults=50');existing+=page['values']
  if page.get('isLast',True):break
  start+=len(page['values'])
 for s in P['sprints']:
  n=str(s['number']);name=s['jira_name']
  goal=f"One developer / two-week cadence. {s['goal']} Exit: {s['exit']} Capacity: 6 build + 2 verification + 1 review + 1 contingency days. Provisional scope; refine/split before activation if oversized. No production completion implied."
  if n=='1':
   old=api('/rest/agile/1.0/sprint/36')
   api('/rest/agile/1.0/sprint/36','POST',{'name':name,'goal':goal})
   got=api('/rest/agile/1.0/sprint/36');assert got['state']==old['state'];assert got['startDate']==old['startDate'];assert got['endDate']==old['endDate']
  elif n in R['sprints']:continue
  else:
   matches=[e for e in existing if e['name']==name]
   if len(matches)>1:raise RuntimeError('Ambiguous sprint '+name)
   got=matches[0] if matches else api('/rest/agile/1.0/sprint','POST',{'name':name,'originBoardId':34,'goal':goal})
   R['sprints'][n]=got['id'];save()
   got=api('/rest/agile/1.0/sprint/'+str(got['id']));assert got['state']=='future';assert not got.get('startDate');assert not got.get('endDate')
  assert got['name']==name;assert got['goal']==goal
  R['sprints'][n]=got['id'];save();print('Verified sprint',n,got['id'],flush=True)
elif phase=='move':
 for s in P['sprints']:
  n=str(s['number']);sid=R['sprints'][n]
  ks=[key(k)for k in s['issues']]
  if n in R['moved']:continue
  # Parent issues carry their subtasks; do not independently move or double-count child work.
  api('/rest/agile/1.0/sprint/'+str(sid)+'/issue','POST',{'issues':ks})
  for k in ks:
   f=issue(k)['fields'];assert any(v['id']==sid for v in f.get('customfield_10020')or[]),(k,sid)
  R['moved'].append(n);save();print('Assigned',n,','.join(ks),flush=True)
elif phase=='annotate':
 allissues={i['key']:i for i in B['issues']}
 for s in P['sprints']:
  keys=[key(k)for k in s['issues']]
  for old,number in P['assignment'].items():
   if number==s['number'] and old in allissues and allissues[old]['fields']['issuetype']['name']=='Subtask':keys.append(old)
  for k in keys:
   append(k,[f"Target candidate: AIN S{s['number']:02d} | {s['name']} (Jira sprint {R['sprints'][str(s['number'])]}).",'Sprint outcome: '+s['goal'],'Exit evidence: '+s['exit'],P['capacity'],P['commitment'],
    'Scheduling is not implementation: original AC/DoD and parent scope are unchanged. Related story/task/subtask effort is one delivery slice, not additive capacity. Required domain slices can be delivered earlier than the broader owner completion sprint; no broader item is Done until all original requirements pass.'],['single-developer-plan',f"planned-s{s['number']:02d}"])
 # Epics stay outside sprints and are ranked as roadmap containers.
 for ep in P['epic_order']:
  entries=[]
  for s in P['sprints']:
   ks=[]
   for k in s['issues']:
    parent=P['extra'][k]['epic'] if k in P['extra'] else allissues[k]['fields'].get('parent',{}).get('key')
    if parent==ep:ks.append(key(k))
   if ks:entries.append(f"S{s['number']:02d} {s['name']}: "+', '.join(ks))
  append(ep,['Roadmap priority '+str(P['epic_order'].index(ep)+1)+' of 14 open epics. '+P['cadence'],*entries,P['epic_dependency_rule'],P['commitment'],
   'Epic completion requires every original criterion, unfinished child/subtask and required dependency, including criteria not exhausted by the sprint issue titles. Early foundation milestones do not close this epic. Full backlog mapping and gate register are recorded on AIN-12 and in TASK_HANDOFF.md.'],['single-developer-plan'])
elif phase=='rank':
 # Re-rank only unfinished roadmap/work items. Completed issue records and sprint history are untouched.
 if not R['ranked']:
  ep=P['epic_order']
  api('/rest/agile/1.0/issue/rank','PUT',{'issues':ep,'rankBeforeIssue':'AIN-70','rankCustomFieldId':10019})
  work=[key(k)for s in P['sprints'] for k in s['issues']]
  after=ep[-1]
  for start in range(0,len(work),50):
   batch=work[start:start+50]
   api('/rest/agile/1.0/issue/rank','PUT',{'issues':batch,'rankAfterIssue':after,'rankCustomFieldId':10019});after=batch[-1]
  R['ranked']=True;save();print('Ranked open epics and sprint work',flush=True)
elif phase=='register':
 marker='Complete sprint and epic register — 2026-11-04'
 f=issue('AIN-12')['fields'];d=f['description']
 lines=[P['scope'],P['capacity'],P['commitment'],P['epic_dependency_rule'],
  'Important correction to the initial progress count: the original active sprint had 41 unfinished issues. Completed items remain in their original sprint/history; only unfinished work is rescheduled.']
 for s in P['sprints']:lines.append(f"S{s['number']:02d} | {s['name']} | "+', '.join(key(k)for k in s['issues'])+' | Exit: '+s['exit'])
 lines+=P['gates']
 lines+=['Readiness gates: confirm business/actuarial/compliance reviewer availability before relevant sprints; select approved provider/sandbox before premium/funding/billing/payment work; select named pilot vendor scope before integration. These are unverified delivery inputs, not blockers to creating this plan.',
 'Shared ownership milestone rules: AIN-36 pending-capacity slice is delivered before AIN-88; provider funding and collateral finish later. AIN-37 accrual precedes receipts/full acceptance. AIN-26 decision/authority contracts inform AIN-99 before final bind handoff. AIN-23 method review precedes the later stress extension. AIN-39 premium-specific reversal behavior is verified with AIN-89; broader cross-domain reversal integration closes later. Existing Relates links remain shared ownership, not automatic full-task blockers.',
 'No scope is excluded from all-epic planning. Done AIN-70/71/72 and other completed work are reused, not rescheduled. All prior 60 persona concerns remain mapped to their stories. No application changes, test execution, migrations, deployments or completion transitions are performed by this reordering.']
 if marker not in json.dumps(d):
  nd={**d,'content':d['content']+[heading(marker)]+[para(t)for t in lines]}
  api('/rest/api/3/issue/AIN-12','PUT',{'fields':{'description':nd}});assert issue('AIN-12')['fields']['description']==nd
 print('Verified complete Jira sprint register',flush=True)
elif phase=='verify':
 all=[];token=None
 while True:
  path='/rest/api/3/search/jql?jql='+quote('project = AIN ORDER BY Rank ASC')+'&maxResults=100&fields=summary,description,status,parent,issuetype,labels,issuelinks,subtasks,customfield_10020,customfield_10016,customfield_10019'
  if token:path+='&nextPageToken='+quote(token)
  page=api(path);all+=page['issues']
  if page.get('isLast',True):break
  token=page['nextPageToken']
 live={i['key']:i for i in all}
 for old in B['issues']:
  a,b=old['fields'],live[old['key']]['fields']
  assert a['status']['id']==b['status']['id'],(old['key'],'status')
  assert a.get('parent',{}).get('key')==b.get('parent',{}).get('key'),(old['key'],'parent')
  prior=(a.get('description')or{}).get('content',[])
  assert (b.get('description')or{}).get('content',[])[:len(prior)]==prior,(old['key'],'scope')
  assert a.get('customfield_10016')==b.get('customfield_10016'),(old['key'],'estimate')
  if a['status']['statusCategory']['key']=='done':
   history=lambda f:[{k:s.get(k)for k in ['id','state','boardId','startDate','endDate','completeDate']}for s in f.get('customfield_10020')or[]]
   assert history(a)==history(b),(old['key'],'completed sprint membership/history')
 for k,number in P['assignment'].items():
  f=live[key(k)]['fields'];sid=R['sprints'][str(number)]
  if f['issuetype']['name']=='Subtask':
   pf=live[f['parent']['key']]['fields'];assert any(s['id']==sid for s in pf.get('customfield_10020')or[])
   own=f.get('customfield_10020')or[]
   assert not own or any(s['id']==sid for s in own),(k,'subtask conflict')
  else:assert any(s['id']==sid for s in f.get('customfield_10020')or[]),(k,'sprint')
  if f['issuetype']['name']!='Epic':assert not any(s.get('state')=='active' and s['id']==36 for s in f.get('customfield_10020')or[]) or number==1,(k,'still active')
 expected=P['epic_order']+[key(k)for s in P['sprints']for k in s['issues']]
 actual=[i['key']for i in all if i['key']in set(expected)]
 assert expected==actual,('rank mismatch',actual)
 for l in R['links']:
  kind,a,b=l.split(':');assert any(x['type']['name']==kind and x.get('outwardIssue',{}).get('key')==b for x in live[a]['fields']['issuelinks']),l
 for i in all:
  for l in i['fields']['issuelinks']:
   if l['type']['name']=='Blocks' and 'outwardIssue'in l:
    amap={key(k):n for k,n in P['assignment'].items()};a,b=i['key'],l['outwardIssue']['key']
    if a in amap and b in amap:assert amap[a]<=amap[b],(a,b,'dependency order')
 active=api('/rest/agile/1.0/sprint/36');oldactive=json.loads((ROOT/'board-context.json').read_text())[1]['data']['values'][0]
 assert active['state']==oldactive['state'] and active['startDate']==oldactive['startDate'] and active['endDate']==oldactive['endDate']
 states=[];start=0
 while True:
  page=api(f'/rest/agile/1.0/board/34/sprint?startAt={start}&maxResults=50');states+=page['values']
  if page.get('isLast',True):break
  start+=len(page['values'])
 for n,id in R['sprints'].items():
  s=next(s for s in states if s['id']==id)
  if n!='1':assert s['state']=='future' and not s.get('startDate') and not s.get('endDate')
 (ROOT/'final-snapshot.json').write_text(json.dumps({'issues':all,'sprints':states},indent=2)+'\n')
 report={'epicsReviewed':17,'openEpicsRanked':14,'doneEpicsPreserved':3,'sprints':len(P['sprints']),'futureUndatedSprints':len(P['sprints'])-1,'originalUnfinishedItemsMapped':85,'additionalSliceOrCoverageItems':len(P['extra']),'originalActiveUnfinished':41,'newActiveUnfinished':len(P['sprints'][0]['issues']),'allOriginalStatusesParentsCriteriaEstimatesPreserved':True,'allCompletedSprintHistoriesPreserved':True,'dependencyOrderingVerified':True,'rankOrderingVerified':True,'applicationImplementation':'not performed','deployment':'not performed'}
 (ROOT/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
