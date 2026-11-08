"""Publish the reviewed plan with resumable receipts; credentials are read only by /tmp helper."""
import json, sys
from pathlib import Path
sys.path.insert(0, '/tmp')
from persona_jira_api import api

ROOT=Path(__file__).resolve().parent
PLAN=json.loads((ROOT/'plan.json').read_text())
RECEIPTS=ROOT/'receipts.json'
state=json.loads(RECEIPTS.read_text()) if RECEIPTS.exists() else {'issues':{},'updates':[],'links':[],'verified':{}}
def save(): RECEIPTS.write_text(json.dumps(state,indent=2)+'\n')
def p(text): return {'type':'paragraph','content':[{'type':'text','text':text}]}
def h(text): return {'type':'heading','attrs':{'level':2},'content':[{'type':'text','text':text}]}
def doc(sections):
    content=[]
    for heading,lines in sections:
        content.append(h(heading))
        content.extend(p(line) for line in lines)
    return {'type':'doc','version':1,'content':content}
def issue(key): return api('issue/'+key+'?fields=summary,description,issuetype,status,parent,issuelinks,subtasks,labels')
def create(id,title,typeid,description,parent=None):
    if id in state['issues']:return state['issues'][id]
    label='persona-20261104-'+id
    from urllib.parse import quote
    found=api('search/jql?jql='+quote('project = AIN AND labels = "'+label+'"')+'&fields=summary,parent,issuetype&maxResults=10')['issues']
    if len(found)>1:raise RuntimeError('Duplicate marker '+id)
    if found:
        result=found[0]; key=result['key']
    else:
        fields={'project':{'key':'AIN'},'issuetype':{'id':typeid},'summary':title,'description':description,'labels':['persona-feedback-20261104',label]}
        if parent:fields['parent']={'key':parent}
        result=api('issue','POST',{'fields':fields});key=result['key']
    state['issues'][id]=key;save()
    current=issue(key)
    assert current['fields']['summary']==title
    assert current['fields']['description']==description,(key,'description mismatch')
    if parent:assert current['fields']['parent']['key']==parent
    assert current['fields']['status']['statusCategory']['key']=='new'
    state['verified'][key]=current;save()
    print('Created and verified',key,title,flush=True)
    return key
def append(key,marker,sections):
    if key+marker in state['updates']:return
    current=issue(key);old=current['fields'].get('description') or {'type':'doc','version':1,'content':[]}
    if marker not in json.dumps(old):
        updated={**old,'content':old['content']+[h(marker)]+doc(sections)['content']}
        api('issue/'+key,'PUT',{'fields':{'description':updated}})
        after=issue(key)
        assert after['fields']['description']==updated
        assert after['fields']['status']==current['fields']['status']
        assert after['fields'].get('parent')==current['fields'].get('parent')
        state['verified'][key]=after
    state['updates'].append(key+marker);save()
    print('Updated and verified',key,flush=True)
def link(a,b,name='Relates'):
    marker=f'{name}:{a}:{b}'
    if marker in state['links']:return
    current=issue(a)
    present=any(x['type']['name']==name and x.get('outwardIssue',{}).get('key')==b for x in current['fields']['issuelinks'])
    if not present:
        api('issueLink','POST',{'type':{'name':name},'inwardIssue':{'key':a},'outwardIssue':{'key':b}})
    state['links'].append(marker);save()

def story_doc(s):
    dependencies=[state['issues'].get(d,d) for d in s['depends']]
    # Initial content uses durable plan IDs for not-yet-created prerequisites; final append resolves all keys.
    return doc([
      ('User story',[f"As a {s['actor']}, I want to {s['intent']} so that {s['benefit']}."]),
      ('Feedback coverage',['Original feedback: '+', '.join(s['feedback'])+'. I = insurer; B = broker; R = reinsurer; numbering follows the 20 points per persona in the user conversation.']),
      ('Scope and existing implementation',['Extend current services, generated-form workbench, commercial records and tests. These are outcome/verification gaps, not an assertion that every underlying capability is absent. Preserve existing working functionality and all broader parent obligations.', 'Existing implementation owners: '+(', '.join(s['tasks']) if s['tasks'] else 'a child implementation task is created for this story')+'. Existing tasks retain their original scope and hierarchy. Completed tasks are reuse evidence, not proof that this broader story is Done.']),
      ('Acceptance criteria',[f'{i+1}. {c}' for i,c in enumerate(s['criteria'])]),
      ('Required dependencies',['Required predecessor outcomes: '+(', '.join(dependencies) or 'No new-story predecessor; use the existing implementation contracts/tasks listed above.')+'; final Jira key mapping follows below.']),
      ('Story-specific verification',[s['proof']]),
      ('Definition of Done',[f'{i+1}. {c}' for i,c in enumerate(PLAN['dod'])]+([PLAN['form_dod']] if s['generated_forms'] else [])),
      ('Completion boundary',['Backlog planning only on 2026-11-04. No implementation, test execution, migration or deployment is claimed. Assignee, estimates and dates remain for delivery planning.'])])

phase=sys.argv[1]
if phase=='create':
    # Detect cycles before any write.
    byid={s['id']:s for s in PLAN['stories']};done=set();order=[]
    while len(done)<len(byid):
        ready=[s for s in PLAN['stories'] if s['id'] not in done and set(s['depends'])<=done]
        if not ready:raise RuntimeError('Dependency cycle or unknown predecessor')
        for s in ready:done.add(s['id']);order.append(s)
    e=PLAN['epic']
    ek=create('broker-epic',e['title'],'10035',doc([('Outcome',[e['story']]),('Acceptance criteria',e['criteria']),('Definition of Done',PLAN['dod']),('Scope boundary',['This epic adds client coordination outcomes. AIN-1–10/12/47 retain existing domain/release obligations. Completed Network epics AIN-70–72 remain unchanged and are reused, not reopened.'])]))
    for s in order:
        parent=ek if s['epic']=='BROKER' else s['epic']
        create(s['id'],'[Persona] '+s['title'],'10036',story_doc(s),parent)
elif phase=='tasks':
    for s in PLAN['stories']:
        if s['tasks']:continue
        desc=doc([('Implementation scope',[s['intent']+'. Implement the owning API persistence/authorization contract and host UI integration for the parent outcome; reuse existing domain models and components.']),('Acceptance criteria',s['criteria']),('Verification',[s['proof']]),('Definition of Done',PLAN['dod']+([PLAN['form_dod']] if s['generated_forms'] else []))])
        create(s['id']+'-implementation','Implement and verify: '+s['title'],'10034',desc,state['issues'][s['id']])
elif phase=='link':
    for s in PLAN['stories']:
        key=state['issues'][s['id']]
        for t in s['tasks']:link(key,t)
        for d in s['depends']:link(state['issues'][d],key,'Blocks')
        impl=s['tasks'] or [state['issues'][s['id']+'-implementation']]
        deps=[state['issues'][d] for d in s['depends']]
        append(key,'Resolved delivery map — persona feedback 2026-11-04',[
          ('Implementation ownership',['Required implementation tasks/slices: '+', '.join(impl)+'. Reuse existing completed work, implement and verify the remaining acceptance criteria in this story. Relates links identify shared ownership; Blocks links identify ordered predecessor outcomes.']),
          ('Predecessor stories',[', '.join(deps) if deps else 'No additional predecessor stories.']),
          ('Verification mapping',['Before Done, replace the pending evidence with actual component paths, Storybook story IDs, execution commands/results, Docker integration evidence and staging build IDs. Evidence is currently NOT RUN; no synthetic result is claimed.'])])
    for reused in PLAN['reuse']:
        append(reused['key'],'Persona feedback reconciliation — 2026-11-04',[
          ('Feedback coverage',[', '.join(reused['feedback'])+'; numbering follows the user conversation.',reused['extra']]),
          ('Definition of Done for this story',PLAN['dod']),
          ('Scope',['Preserve the original acceptance criteria and implementation ownership. This update adds clarity, not a Done transition.'])])
    # Reuse explicit existing completed capabilities without reopening them.
    for id,targets in {'followup':['AIN-75','AIN-76','AIN-77'],'counterparty':['AIN-73','AIN-74','AIN-84'],'capacity':['AIN-78'],'premium':['AIN-34','AIN-65'],'collateral':['AIN-33','AIN-52'],'claims':['AIN-63'],'management':['AIN-80']}.items():
        for t in targets:link(state['issues'][id],t)
elif phase=='epics':
    groups={}
    for s in PLAN['stories']:
        ep=state['issues']['broker-epic'] if s['epic']=='BROKER' else s['epic']
        groups.setdefault(ep,[]).append(state['issues'][s['id']]+': '+s['title'])
    for key,children in groups.items():
        append(key,'Persona outcome delivery map — 2026-11-04',[
          ('Required child outcomes',children),
          ('Definition of Done clarification',['Preserve every original acceptance criterion and existing child obligation. Close only after all required children, subtasks and predecessor outcomes are implemented and verified; adding these stories does not replace prior scope.',*PLAN['dod']]),
          ('LLM forms architecture',[PLAN['form_dod']]),
          ('Current evidence',['Stories created for planning; no new implementation/test/migration/deployment result. Existing completed work is reusable evidence only.'])])
elif phase=='register':
    register=json.loads((ROOT/'feedback-register.json').read_text())
    append('AIN-12','Complete 60-point persona feedback register — 2026-11-04',[
      ('Original objective',['Resolve the 20 insurer, 20 broker and 20 reinsurer concerns through the mapped user stories. This register preserves all points; overlapping concerns share outcomes. I = insurer, B = broker, R = reinsurer.']),
      ('Feedback to Jira stories',[k+' — '+v['concern']+': '+', '.join(v['stories']) for k,v in register.items()]),
      ('Required scope and reuse',['All mapped story acceptance criteria, implementation task slices and predecessor outcomes are required for the feedback outcome. Existing AIN-1–10/12/47 obligations remain intact. Reuse AIN-79/80 and completed AIN-33/34/52/61–78/81–85; do not recreate completed Network identity/social/publication work.']),
      ('Excluded expansion',['New subscription/checkout features and unrelated social feature expansion are not requested by these 60 points. Existing AIN-11/41–44 remain release obligations where already required; their links do not authorize duplicating or dropping them. Preserve independent Network members, opt-in visibility, domain ownership and private financial mandates.']),
      ('Planning status',['35 new stories, 2 reused stories, 9 implementation subtasks and broker coordination epic AIN-86. Creation is not implementation. Story evidence remains pending; deployment and provider settlement are unverified.'])])
elif phase=='verify':
    from urllib.parse import quote
    keys=set(state['issues'].values())|{x['key'] for x in PLAN['reuse']}
    snapshot=[];token=None
    while True:
        path='search/jql?jql=project%3DAIN&maxResults=100&fields=summary,description,issuetype,status,parent,issuelinks,subtasks,labels'
        if token:path+='&nextPageToken='+quote(token)
        page=api(path);snapshot.extend(page['issues'])
        if page.get('isLast',True):break
        token=page['nextPageToken']
    (ROOT/'final-snapshot.json').write_text(json.dumps(snapshot,indent=2)+'\n')
    live={i['key']:i for i in snapshot}
    for k in keys:state['verified'][k]=live[k]
    baseline=json.loads((ROOT/'baseline.json').read_text())['issues']
    for old in baseline:
        before=old['fields'];after=live[old['key']]['fields']
        assert after['status']['id']==before['status']['id'],(old['key'],'status changed')
        assert after.get('parent',{}).get('key')==before.get('parent',{}).get('key')
        prior=(before.get('description') or {}).get('content',[])
        assert (after.get('description') or {}).get('content',[])[:len(prior)]==prior,(old['key'],'original scope overwritten')
    for s in PLAN['stories']:
        k=state['issues'][s['id']];f=state['verified'][k]['fields']
        expected=state['issues']['broker-epic'] if s['epic']=='BROKER' else s['epic']
        assert f['parent']['key']==expected
        assert f['issuetype']['name']=='Story'
        assert f['status']['statusCategory']['key']=='new'
        assert 'Definition of Done' in json.dumps(f['description'])
        for d in s['depends']:
            dk=state['issues'][d]
            assert any(l['type']['name']=='Blocks' and l.get('inwardIssue',{}).get('key')==dk for l in f['issuelinks']),(k,dk)
        for t in s['tasks']:
            assert any(l['type']['name']=='Relates' and (l.get('inwardIssue',{}).get('key')==t or l.get('outwardIssue',{}).get('key')==t) for l in f['issuelinks']),(k,t)
        if not s['tasks']:assert state['issues'][s['id']+'-implementation'] in [c['key'] for c in f['subtasks']]
    save()
    print(json.dumps({'verifiedIssues':len(keys),'newStories':len(PLAN['stories']),'reusedStories':len(PLAN['reuse']),'coverage':len(PLAN['coverage']),'links':len(state['links']),'newEpic':state['issues']['broker-epic']}),flush=True)
