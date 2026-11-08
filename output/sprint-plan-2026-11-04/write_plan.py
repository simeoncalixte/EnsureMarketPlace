import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
P=json.loads((ROOT/'plan.json').read_text());R=json.loads((ROOT/'receipts.json').read_text());B=json.loads((ROOT/'baseline.json').read_text())
issues={i['key']:i for i in B['issues']}
def key(k):return R['issues'].get(k,k)
def link(k):return f'[{k}](https://simeoncalixte1990.atlassian.net/browse/{k})'
def slink(n):return f'[S{n:02d}](https://simeoncalixte1990.atlassian.net/jira/software/projects/AIN/boards/34/backlog?sprint={R["sprints"][str(n)]})'
lines=['# One-developer sprint sequence','', 'Planning date: November 4, 2026. User-approved capacity: **one developer, two-week sprints**.','',P['scope'],'',P['capacity'],'',P['commitment'],'',
 '**This is a 57-slot provisional work breakdown, not a calibrated delivery estimate.** There are no existing story-point estimates or demonstrated team velocity. Do not promise 114 weeks or a launch date from the slot count. The first sprint is a bounded repair set; all later slots are candidates. Before starting each sprint, estimate the concrete remaining changes and split the candidate if it exceeds the six-day build envelope. An issue title is not a size estimate.','',
 'The prior active sprint held **41 unfinished issues**. Its active state and exact dates are preserved, while its unfinished scope is reduced to AIN-13, AIN-41 and AIN-42. Completed issues/history stay untouched. Previously In Progress AIN-30/35/48/59 retain their statuses but move to their planned future slots; this administrative reordering does not claim completion or fresh implementation.','',
 '## Delivery phases','',
 '| Candidates | Outcome |','| --- | --- |',
 '| S01–S06 | Build/access guardrails, canonical models, schema integrity, currency and truthful figures |',
 '| S07–S14 | Evidenced intake/search, LLM-generated forms, regeneration, readiness and work queue |',
 '| S15–S24 | Identity/eligibility, beneficiary controls, pricing, capacity and delegated authority |',
 '| S25–S34 | Treaty terms, binding, disclosure, client approval, broker coordination and discovery |',
 '| S35–S49 | Premiums, provider funding/collateral, reporting, claims, recoveries, retrocession and renewals |',
 '| S50–S53 | Subscription lifecycle and named external-system integrations |',
 '| S54–S57 | Legacy migration/restore rehearsals, full financial invariants and staged persona acceptance |','',
 '## Sprint candidates','',
 'A story and its existing implementation tasks describe the same outcome; their effort is not counted twice. Subtasks inherit their parent story slot and are not additional capacity. Each sprint has the affected issue AC/DoD plus the concrete exit below.','',
 '| Sprint | Goal | Primary issues | Exit evidence |','| --- | --- | --- | --- |']
for s in P['sprints']:
 lines.append('| '+slink(s['number'])+' '+s['name']+' | '+s['goal']+' | '+', '.join(link(key(k))for k in s['issues'])+' | '+s['exit']+' |')
lines+=['','## All-epic priority and milestones','',P['epic_dependency_rule'],'', '| Priority | Epic | Scheduled child milestones |','| --- | --- | --- |']
for order,ep in enumerate(P['epic_order'],1):
 nums=[]
 for s in P['sprints']:
  if any((P['extra'][k]['epic'] if k in P['extra'] else issues[k]['fields'].get('parent',{}).get('key'))==ep for k in s['issues']):nums.append(s['number'])
 lines.append('| '+str(order)+' | '+link(ep)+' '+issues[ep]['fields']['summary']+' | '+', '.join(slink(n)for n in nums)+' |')
lines+=['','Completed epics '+', '.join(link(k)for k in P['completed_epics'])+' remain Done. Their identity, social, publication and participation evidence is reused; no completed issue is reassigned or reopened.','',
 '## Explicit split and missing-coverage map','', '| New item | Original owner | Bounded purpose |','| --- | --- | --- |']
for id,e in P['extra'].items():lines.append('| '+link(key(id))+' | '+link(e['owner'])+' | '+e['description']+' |')
lines+=['',
 'The new items supplement original obligations. Intake resilience and parametric claims were already required by AIN-2/10, not newly invented product expansion. AIN-132/133/134/136 divide large existing work into earlier independently verifiable slices; they do not authorize closing their owners early.','',
 '## Shared implementation and dependency rules','',
 '- Existing `Blocks` edges between scheduled non-epic issues must point to the same or a later sprint; every edge is checked during final verification. Within a shared sprint the predecessor slice runs first. Existing `Relates` links identify ownership/reuse and do not imply every linked issue must finish first.',
 '- AIN-36 pending acceptance/cancellation/expiry/release is isolated in AIN-132 before capacity AIN-88. Provider funding/custody/reconciliation stays in later AIN-134/36/90. This avoids a false dependency on funded cash before an eligible pending commitment.',
 '- AIN-37 accrual is isolated in AIN-133, followed by full AIN-37/89 receipts and supported economics. Domain-specific reversal cases must pass there; AIN-39 later completes cross-domain provider reversal integration.',
 '- AIN-26 authority/decision contracts are consumed by AIN-99 before final quote-to-bind integration. AIN-23 methods and known answers precede later stress-scenario acceptance. Broader original task acceptance still governs closure.',
 '- AIN-1 provides reproducible build/staging foundations early and full adapter/restore evidence late. AIN-47 provides model contracts early and representative migration/cutover late. Epic-level release dependencies remain preserved; early milestones do not imply epic completion.',
 '- All prior 60 persona concerns remain covered by their mapped stories; this sprint plan does not replace the previous feedback register.','',
 '## Readiness and completion gates','']
lines += ['- '+x for x in P['gates']]
lines += ['',
 'Before activating a candidate, confirm scope, estimate, required predecessor evidence, staging availability and the accountable business reviewer. Provider slots additionally require the approved provider and sandbox; integration slots require named vendors and supported API/schema versions. These inputs are currently unverified. If unavailable, keep the dependent candidate unstarted and pull the next ready bounded item; never substitute mocks for required external evidence.','',
 'Every sprint reserves verification time. The final gates run cumulative release checks and representative migration/restore rehearsals; they are not permission to postpone tests until the end. Existing human approvals, immutable audit, private financial mandates and independent Network/opt-in boundaries remain intact.','',
 '## Complete unfinished-issue assignment','', '| Issue | Sprint | Basis |','| --- | --- | --- |']
for k,n in sorted(P['assignment'].items(),key=lambda kv:(kv[1],key(kv[0]))):
 basis='Child follows parent; not extra capacity' if k in issues and issues[k]['fields']['issuetype']['name']=='Subtask' else 'Primary delivery / existing shared implementation'
 lines.append('| '+link(key(k))+' | '+slink(n)+' | '+basis+' |')
lines += ['', '## Verification and continuity','',
 '- Live baseline: all 130 original issues, 17 epics, full child/link/subtask metadata and board/sprint configuration. Original active sprint ID 36, board ID 34.',
 '- Final audit checks all original statuses, hierarchy, description/AC prefixes, estimates and completed sprint histories; every unfinished assignment; all created future sprint states; rank order and dependency direction.',
 '- New slice/coverage items and sprint/issue changes are recorded in `receipts.json`. `baseline.json`, `board-context.json`, `final-snapshot.json` and `verification.json` provide before/after evidence.',
 '- Commands: `python3 output/sprint-plan-2026-11-04/build_plan.py`; `python3 output/sprint-plan-2026-11-04/publish.py verify`; `python3 output/sprint-plan-2026-11-04/write_plan.py`. API helpers use existing local configuration without storing credentials in these artifacts; publishing depends on the temporary session helper and must not be replayed blindly.',
 '- This is planning/reordering only. Application implementation, application tests, migrations and deployment were not performed. The broader platform objective remains incomplete. Next delivery step: refresh AIN-13/41/42 and execute the active sprint in dependency order with regression evidence.', '']
(ROOT/'SPRINT_PLAN.md').write_text('\n'.join(lines))
print('Wrote full sprint/epic/dependency map')
