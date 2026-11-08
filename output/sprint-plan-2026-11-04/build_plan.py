import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
baseline=json.loads((ROOT/'baseline.json').read_text())
issues={i['key']:i for i in baseline['issues']}
sprints=[]
def sprint(name,keys,goal,gate):
 sprints.append({'number':len(sprints)+1,'name':name,'issues':keys.split(),'goal':goal,'exit':gate})

sprint('Build and paid-access guardrails','AIN-13 AIN-41 AIN-42',
 'Make the clean-checkout verification reliable and close the two bounded production checkout guardrail defects.',
 'Pipeline parity passes; unconfigured paid production checkout and unauthorized plan selection are rejected with regression evidence. Existing active sprint dates stay unchanged.')
sprint('Canonical ownership contracts','AIN-48',
 'Finish the remaining field/ownership inventory and agree the contracts needed by subsequent slices.',
 'Current/proposed ownership, money/null/version semantics and raw-SQL/service-owned fields are reviewed; unresolved mappings are explicit.')
sprint('Database integrity and CI','AIN-49 AIN-55',
 'Enforce the reviewed tenant/reference/state constraints and make drift detectable in CI.',
 'Valid legacy fixtures migrate; direct invalid writes and concurrent duplicates fail; model/migration drift checks pass.')
sprint('Flexible schema and revision contracts','AIN-50 AIN-51',
 'Specify and validate stable typed core facts plus versioned JSON extensions and immutable temporal references.',
 'Old/new schemas remain readable; missing/conflicting/zero are distinct; effective/recorded/valuation times and revision links are tested.')
sprint('Currency propagation and precision','AIN-35',
 'Complete remaining money writers/readers against the existing explicit currency policy.',
 'Supported precision and provenance are enforced across remaining consumers; unknown legacy currencies remain unresolved; approved backfill mappings are prepared, not guessed.')
sprint('Truthful financial views','AIN-17 AIN-30 AIN-31 AIN-32 AIN-80',
 'Finish one financial-truth outcome across existing board, portfolio and Marketplace views, reusing the currency contract.',
 'No mixed-currency sums, unowned-return pollution, pending-as-funded amounts or live illustrative totals; unavailable states and exact-version action gates pass interaction and API tests.')
sprint('Document financial provenance','AIN-15',
 'Preserve source-backed parties, amounts, currency, units and valuation from documents.',
 'Ambiguous/conflicting facts remain review issues; each accepted fact resolves to a document/page/table anchor and exact version.')
sprint('Reliable intake execution','intake',
 'Close the original ingestion epic criteria for duplicate deliveries, worker restart, cancellation and provider failure.',
 'The configured pilot intake channels persist one submission/artifact chain; partial failure, replay and dead-letter recovery retain evidence without duplicate side effects.')
sprint('Authorized evidence search','AIN-16',
 'Implement tenant-scoped indexing and exact artifact retrieval on the evidenced intake chain.',
 'Authorized users retrieve original financial evidence; cross-tenant, duplicate indexing and retention/deletion cases pass.')
sprint('Document-generated review forms','AIN-87',
 'Deliver reviewable LLM-generated structured forms on pinned evidence and validated component contracts.',
 'Sparse/conflicting/unfamiliar/repeated/hostile-document corpus passes; extensions and evidence survive; unsafe output and provider failures cannot replace the active form.')
sprint('Safe regeneration and activation','AIN-18 AIN-95',
 'Connect effective financial revisions and preserve human corrections during regeneration.',
 'Stable semantic/entity matching survives reorder; material changes identify stale pricing/quotes/approvals; one effective revision and historical replay are proven.')
sprint('Indexed rebuildable projections','AIN-53',
 'Deliver authorized submission/party projections with consistent pagination and rebuild semantics.',
 'Counts, currency totals and source checkpoints reconcile after rebuild; query plans and latency meet an explicitly recorded pilot workload.')
sprint('Submission readiness','AIN-98',
 'Make missing/conflicting generated-form information actionable without rejecting valid drafts.',
 'Issues have owner and resolution; configured publication/quote/bind gates re-evaluate against the current revision; stale readiness cannot authorize a transition.')
sprint('Underwriting work queue','AIN-106',
 'Expose one prioritized queue with ownership, deadlines, referrals and exact deep links.',
 'Assignment/escalation, stable sort/pagination, current access and return-to-queue interactions pass.')
sprint('Remaining financial identity adapters','AIN-59',
 'Finish canonical ownership/funding/collateral/payout identity mappings without inventing identities.',
 'Owning-domain adapters and unresolved legacy records are explicit; social consent never grants financial authority. Downstream provider journeys revalidate these mappings later.')
sprint('Counterparty transaction review','AIN-28 AIN-92',
 'Apply the approved transaction-specific policy using current EnsuredAPI submissions, insured subjects and role evidence.',
 'Reviewed policy and accountable reviewer are recorded; stale/revoked/unavailable evidence blocks/refers; participant approval is not universal clearance.')
sprint('Beneficiary mandates','AIN-29',
 'Enforce verified payout destinations and independent payment approval.',
 'Beneficiary changes invalidate prior approval; unauthorized changes/self-approval are rejected; statement-view mandates remain separate.')
sprint('Rating-basis correctness','AIN-19 AIN-20',
 'Repair the two bounded pricing-input/output correctness gaps before experience modeling.',
 'Configured revenue/payroll/TIV basis is selected correctly; unavailable premium remains distinct from a genuine approved zero.')
sprint('Loss experience into pricing','AIN-22 AIN-96',
 'Reconcile approved loss/exposure experience and feed it into existing credibility pricing.',
 'Gross/net, paid/incurred, dates and currency reconcile; duplicates and exceptional losses are reviewed; no-experience and qualified-experience known answers pass.')
sprint('Defensible pricing review','AIN-23 AIN-100',
 'Publish reviewed model methods and expose reproducible results and overrides.',
 'Independent known answers and two unlike configured classes pass; model/input versions and override authority replay exactly. Portfolio stress extension is verified in its later sprint.')
sprint('Capacity lifecycle','AIN-24 AIN-25 AIN-88 capacity-slice',
 'Use authoritative facility balances and complete the pending reservation/expiry/release slice of capital lifecycle.',
 'Concurrent allocation cannot exceed limits; unknown currency/capacity cannot authorize bind; retry/expiry/cancellation releases once. External funded-capital work remains under AIN-36.')
sprint('Underwriting authority and referrals','AIN-27 AIN-99',
 'Enforce reviewed decision authority, explicit exceptions and independent approvals.',
 'Over-limit/expired/delegated/manual paths enforce policy server-side; material source changes invalidate approval. Bind event integration remains under AIN-26.')
sprint('Incremental portfolio accumulation','AIN-101',
 'Show the current and proposed concentration of evidenced underlying exposure.',
 'Overlapping participations are deduplicated by evidenced identity; gross/ceded/retained and currency views reconcile; concurrent updates require re-evaluation.')
sprint('Delegated facility oversight','AIN-107',
 'Monitor mandate usage, exceptions and overdue reporting with current authority.',
 'Expired/revoked grants and over-limit activity are controlled; exceptions have owners and retained evidence.')
sprint('Document-derived treaty terms','AIN-105',
 'Make reviewed facultative/treaty wording available as typed, versioned executable semantics.',
 'Unfamiliar clauses remain extensions; supported-economics matrix is explicit; ambiguous/unsupported terms cannot silently drive a generic calculation.')
sprint('Quote-to-bind handoff','AIN-26 AIN-108',
 'Bind the exact approved terms and consume capacity with a durable financial/servicing handoff.',
 'One idempotent bind produces one contract/capacity effect and recoverable obligations; stale approval/signature alone cannot bind.')
sprint('Recipient-specific disclosure','AIN-102',
 'Replace all-or-nothing sharing with immutable, previewed recipient packages.',
 'Nested fields/documents are actually omitted or redacted in API/export payloads; changed audience/content invalidates consent; revocation blocks future platform access.')
sprint('Comparable quotations','AIN-103',
 'Compare current offers and material wording differences using evidence-backed semantic bindings.',
 'Different deductible/coverage bases and missing terms are shown accurately; changed or expired offers cannot be accepted as current.')
sprint('Client recommendation approval','AIN-109',
 'Present a private client recommendation and retain exact-terms approval.',
 'Client authority, package hash and version are recorded; material changes invalidate approval without rewriting history or implying insurer binding.')
sprint('Issued contract documents','AIN-113',
 'Issue and deliver exact bound artifacts with explicit lifecycle states.',
 'Draft/issued/superseded states, source hash, delivery retry and access revocation are verified; missing required terms block issuance.')
sprint('Client workspace','AIN-91',
 'Project existing client submissions, placement and servicing into one authorized workspace.',
 'No duplicate client or ledger; permitted counts/deep links, ownership/next actions, pagination and partial-service outages are verified.')
sprint('Market approaches','AIN-110',
 'Track authorized approaches, responses, declines and remaining placement work.',
 'Delivery is evidenced rather than inferred; retries do not duplicate recipients; revised packages/offers and remaining capacity reconcile.')
sprint('Broker handover and follow-up','AIN-116 AIN-97',
 'Make client responsibility transfers and permitted introduction follow-up accountable.',
 'Handover retains decisions/deadlines; assignment is not access; private follow-ups do not leak through Network and stale commercial links are denied.')
sprint('Effective market discovery','AIN-79',
 'Make supported Marketplace filtering/sorting effective and explain source freshness for matching.',
 'Map/list/table inventory agrees under filters; unknown/stale appetite is not represented as willingness to quote; permissions and exact source links hold.')
sprint('Premium and commission accruals','premium-slice',
 'Implement the accrual/invoice and typed basis slice of AIN-37 using the existing party subledger.',
 'Reviewed gross-to-net example reconciles by party/currency; quoted, earned and due states remain distinct; unsupported commission economics remain unavailable.')
sprint('Premium receipts and adjustments','AIN-37 AIN-89',
 'Finish supported premium/commission/tax/fee lifecycle and its user workflow.',
 'Partial receipts, supported variable commission boundaries and reversal requirements reconcile; actual provider receipt evidence is required before settlement claims.')
sprint('Provider funding handoff','funding-slice',
 'Implement one approved provider sandbox call/receipt handoff, with persisted operation and uncertain-result recovery.',
 'Timeout-after-success, duplicate/out-of-order events and failed persistence recover to one matched receipt; no simulated event is called confirmed cash.')
sprint('Funding and collateral reconciliation','AIN-36 AIN-90',
 'Complete funded-capital/custody/collateral reconciliation and authorized release on the approved provider scope.',
 'Partial/reversed/unmatched statements, mandate changes and release limits reconcile by party/currency; attach provider-sandbox evidence. Reuse earlier capacity slice.')
sprint('Management financial metrics','AIN-94',
 'Expose current reconciled management KPIs and source drill-through.',
 'Definitions, ownership, freshness, missing coverage and currencies are explicit; rebuilt metrics reconcile to authoritative transactions.')
sprint('Contractual reports and bordereaux','AIN-104',
 'Track obligations and validate document-derived reporting without losing unfamiliar evidence.',
 'Revised/duplicate rows and period/currency discrepancies enter resolution; accepted reports update one current projection with retained history.')
sprint('Layer and reinstatement economics','AIN-38 AIN-111',
 'Calculate supported multilayer protection and reinstatement effects from approved terms.',
 'Independent boundary, aggregate exhaustion and reinstatement premium/coverage cases pass; unsupported clauses block computation.')
sprint('Endorsements and cancellation','AIN-112',
 'Amend bound coverage with effective-date, financial and capacity adjustments.',
 'Limit endorsement and cancellation after partial premium payment reconcile; retries do not double-release/refund; prior coverage and approvals remain historical.')
sprint('Operational claims workflow','AIN-114',
 'Replace sample claims with durable intake, review, reserves and adjudication linked to bound coverage.',
 'Document-derived evidence/conflicts and current roles are exercised; recognized/disputed/paid/outstanding states reconcile to existing servicing.')
sprint('Cash reversal integration','AIN-39',
 'Connect original-event-linked reversals across premium, recovery and capital provider workflows.',
 'Repeated/partial/over-limit reversal tests preserve immutable evidence and reconcile provider outcome separately from local adjustment.')
sprint('Recoveries and beneficiary waterfalls','AIN-40 AIN-118',
 'Complete party recoverables, approved distributions and evidenced receipts/payments.',
 'Known-answer priorities/rounding, disputes, insufficient cash, partial receipts and reversals reconcile; beneficiary authority and provider sandbox evidence pass.')
sprint('Parametric trigger review','parametric',
 'Close the original claims epic requirement for authenticated trigger observations and reviewable parametric payouts.',
 'Pinned observations and approved trigger/formula versions reproduce the payout; duplicate/conflicting triggers and disputes cannot cause duplicate payments.')
sprint('Outward protection traceability','AIN-120',
 'Trace retrocession through underlying versions, amendments and losses.',
 'Two outward covers cannot duplicate or cycle recoveries; ceded/retained amounts and remaining protection reconcile by version/currency.')
sprint('Reproducible stress scenarios','AIN-117',
 'Compare baseline/proposed portfolio stress without changing booked positions.',
 'Pinned model/portfolio scenarios replay; known-answer layer effects and missing-data limits are visible; no live ledger writes occur.')
sprint('Renewal preparation','AIN-115',
 'Assemble renewal dossiers from evidenced experience, changes and outstanding servicing.',
 'Open recovery/changed exposure is visible; fresh periods and approvals are required; predecessor history and compatible corrections are preserved.')
sprint('Idempotent subscription checkout','AIN-43',
 'Prevent duplicate external subscriptions and recover uncertain checkout outcomes.',
 'Concurrent checkout, timeout-after-provider-success and DB failure converge to one intended provider subscription.')
sprint('Billing lifecycle and entitlements','AIN-44',
 'Finish lifecycle events, usage/invoice reconciliation and customer access behavior.',
 'Renewal/past-due/cancellation/refund/out-of-order cases converge; usage totals and receivables match provider invoices/payments; customer change/cancel paths pass.')
sprint('Pilot system adapter contracts','integration-slice',
 'Pin the named pilot policy/claims/accounting adapter scope and deliver its first bounded end-to-end handoff.',
 'Authoritative writers, IDs and semantic mappings are documented; a named sandbox exchange passes deduplication, stale-input and rejected-mapping cases.')
sprint('External system reconciliation','AIN-119',
 'Finish the remaining explicitly agreed pilot adapter mappings and recovery/reconciliation workflows.',
 'Every supported adapter passes vendor sandbox duplicate/out-of-order/uncertain outcome tests; counts/versions/currencies reconcile. Split further before activation if the agreed adapter set exceeds one developer sprint.')
sprint('Legacy migration rehearsal','AIN-54',
 'Rehearse additive migrations/backfills and compatible application cutover on representative legacy data.',
 'All delivered migrations, including identity/participation additions, have reviewed mappings or quarantine; idempotent batches and rollback preserve immutable history.')
sprint('Restore and operational recovery','AIN-14 AIN-93',
 'Prove cross-service restore, interrupted-job recovery and external outcome reconciliation.',
 'Recorded recovery targets, restored versions/counts/balances and provider replay are verified; rollback never implies cash reversal.')
sprint('Financial invariant release gate','AIN-45 AIN-46',
 'Reconcile the full coverage register and execute cross-party failure injection across all delivered financial domains.',
 'Conservation, concurrency, replay, provider uncertainty and restore evidence pass; unresolved risks and scope limits are explicit, not silently waived.')
sprint('Staged persona acceptance','AIN-121',
 'Certify the agreed pilot and capital scope across two unlike configured classes and all three personas.',
 'Baseline/measured outcomes, exact build versions, Storybook/API/provider evidence, accessibility, owner sign-off and rollback criteria are recorded; every required child/epic gate is reconciled.')

extra={
'intake':dict(epic='AIN-2',type='Task',summary='[Sprint slice] Verify intake worker resilience and artifact lineage',owner='AIN-2',related=['AIN-87','AIN-15','AIN-16'],
 description='Required original AIN-2 acceptance is broader than its evidence/search children. For the configured pilot intake channels, test duplicate delivery, worker restart, cancellation, timeout, dead-letter/replay and persisted searchable lineage. Preserve existing ingestion packages. Backend integration evidence links to AIN-87; any changed UI needs executable stories. This is missing coverage, not a second ingestion engine.'),
'capacity-slice':dict(epic='AIN-9',type='Task',summary='[Sprint slice] Finish pending commitment expiry and capacity release',owner='AIN-36',related=['AIN-88'],
 description='Bounded early slice of AIN-36: pending acceptance/cancellation/expiry and exactly-once release of unconsumed capacity using current commitment receipts and commercial ledger. Verify concurrency, stale source and duplicate commands. No provider funding/custody/cash work is included in this slice; AIN-36 retains that later obligation. This slice unblocks AIN-88 without requiring funded-capital completion before binding.'),
'premium-slice':dict(epic='AIN-9',type='Task',summary='[Sprint slice] Implement premium and commission accrual contracts',owner='AIN-37',related=['AIN-89'],
 description='Bounded early slice of AIN-37: reviewed amount/rate/basis semantics, party/currency attribution, earned/payable rules and idempotent accrual/invoice posting. Known-answer gross-to-net and supported variable commission examples are required. Receipts/provider reconciliation/reversals and full AIN-89 acceptance remain in the following sprint.'),
'funding-slice':dict(epic='AIN-9',type='Task',summary='[Sprint slice] Verify persisted provider funding operations and receipts',owner='AIN-36',related=['AIN-90'],
 description='Bounded provider handoff slice of AIN-36: approved provider sandbox, persisted operation, signed event intake, call/receipt correlation, deduplication and timeout-after-success recovery. Use existing outbox/inbox. Actual sandbox evidence required; custody/collateral position reconciliation and release remain under AIN-36/90 in the following sprint.'),
'parametric':dict(epic='AIN-10',type='Story',summary='[Claims] Review authenticated parametric triggers and payout decisions',owner='AIN-10',related=['AIN-114','AIN-118'],
 description='As a claims reviewer, I want authenticated trigger observations tied to the approved contract and formula so I can verify parametric payout decisions and resolve disputes without duplicate payments. This preserves the original AIN-10 parametric scope, which lacked an explicit child. Pin observation/source/time, trigger/formula/contract versions; retain conflicting/late observations and independent review; show unavailable providers; calculate reproducible payout and use existing authorized payment/beneficiary workflow. LLM-extracted trigger wording is a review proposal, never authoritative observation or payout approval.'),
'integration-slice':dict(epic='AIN-1',type='Task',summary='[Sprint slice] Validate named pilot adapter mappings and first handoff',owner='AIN-119',related=['AIN-52'],
 description='Bounded first slice of AIN-119: record the supported named pilot systems, owners, API/schema versions and approved access; implement first concrete policy/claims/accounting exchange with semantic IDs and outbox/inbox. Verify actual vendor sandbox acknowledgement and duplicate/out-of-order handling. Remaining supported adapters and end-to-end reconciliation stay under AIN-119; do not claim all integrations from one connector or a mock.')
}

short_names=['Build/access','Model ownership','Integrity/CI','Schema contracts','Currency','Financial truth','Source evidence','Intake resilience','Evidence search','Generated forms','Regeneration','Projections','Readiness','Work queue','Identity adapters','Eligibility','Beneficiaries','Rating basis','Loss experience','Pricing review','Capacity','Authority','Accumulation','Delegation','Treaty terms','Binding','Disclosure','Quote comparison','Client approval','Issued documents','Client workspace','Market approaches','Handover/follow-up','Market discovery','Premium accruals','Premium receipts','Funding handoff','Collateral','Management metrics','Bordereaux','Layers','Endorsements','Claims','Cash reversals','Recoveries','Parametric','Retrocession','Stress scenarios','Renewals','Checkout','Billing','Adapter contracts','Integrations','Migrations','Restore','Finance gates','Pilot acceptance']
assert len(short_names)==len(sprints)
for s,short in zip(sprints,short_names):
 s['jira_name']=f"AIN S{s['number']:02d}: {short}"
 assert len(s['jira_name'])<30

assignment={}
for s in sprints:
 for key in s['issues']:
  assert key not in assignment,key
  assignment[key]=s['number']
openwork=[i for i in issues.values() if i['fields']['status']['statusCategory']['key']!='done' and i['fields']['issuetype']['name']!='Epic']
for i in openwork:
 if i['fields']['issuetype']['name']=='Subtask':
  assignment[i['key']]=assignment[i['fields']['parent']['key']]
assert set(i['key'] for i in openwork)<=set(assignment),set(i['key'] for i in openwork)-set(assignment)
for i in issues.values():
 for l in i['fields']['issuelinks']:
  if l['type']['name']=='Blocks' and 'outwardIssue'in l:
   a,b=i['key'],l['outwardIssue']['key']
   if a in assignment and b in assignment:assert assignment[a]<=assignment[b],(a,b,assignment[a],assignment[b])
epic_order=['AIN-1','AIN-47','AIN-2','AIN-3','AIN-7','AIN-4','AIN-5','AIN-6','AIN-86','AIN-8','AIN-9','AIN-10','AIN-11','AIN-12']
plan={'cadence':'One developer, two-week sprints','capacity':'Planning envelope: 6 implementation days + 2 integrated verification days + 1 review/refinement day + 1 contingency day; not measured velocity. One primary outcome in progress; at most two closely related workflow slices. Story/task pairs share effort, not double-counted work.',
 'commitment':'Existing active sprint remains active with original dates; only its goal/name and unfinished membership are reorganized. Every new sprint is future and undated. No fabricated story-point/time estimates or assignees. The ordered slots are a provisional work breakdown, not a fixed delivery forecast. Before activation, split any candidate exceeding six implementation days and verify reviewer/provider readiness; preserve all parent acceptance criteria.',
 'activeSprintId':36,'boardId':34,'sprints':sprints,'assignment':assignment,'extra':extra,'epic_order':epic_order,'completed_epics':['AIN-70','AIN-71','AIN-72'],
 'epic_dependency_rule':'Historical epic-level Blocks links remain intact as delivery/release constraints. Readiness for a child uses the named prerequisite milestone, not completion of every late child of a foundational epic. AIN-1 provides build/staging foundations early and full integration/restore late; AIN-47 contracts are early and legacy cutover late. No epic is closed at an early milestone.',
 'scope':'All 17 epics reviewed: 14 open epics sequenced; 3 Done Network epics preserved as reusable evidence. Every unfinished non-epic issue and subtask is assigned; no related work is silently excluded. Completed issues retain current sprint/history and status. Existing acceptance criteria and hierarchy remain unchanged.',
 'gates':['Each sprint must meet the affected issue AC/DoD, including executable Storybook action/payload assertions and isolated Docker integration where applicable.','Generated forms remain documentation-driven with evidence anchors, stable semantic/entity IDs, reviewed corrections and explicit activation; LLM output grants no authority.','Provider/vendor-dependent candidates cannot be activated as executable commitments until approved provider scope, sandbox access and reviewer availability are established. Work on mocks does not satisfy settlement/integration acceptance.','Migrations and operational readiness are verified incrementally per story and rehearsed globally before launch. No separate late testing phase substitutes for per-sprint verification.','Business/actuarial/compliance review is external to the one developer capacity; missing review is an explicit dependency, not invented sign-off.']}
(ROOT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
print(json.dumps({'sprintCandidates':len(sprints),'unfinishedExistingIssues':len(openwork),'extraScopeOrSliceIssues':len(extra),'allEpics':17,'existingNonEpicBlockEdges':'ordered'}))
