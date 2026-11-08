const fs=require('fs'),path=require('path'),vm=require('vm');
const root=process.cwd(),ts=require(path.join(root,'node_modules/typescript'));
const cache={};
function load(file,overrides={},append=''){
 const full=path.join(root,file),key=full+append;
 if(cache[key])return cache[key];
 const mod={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(full,'utf8')+'\n'+append,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const req=n=>{
  if(n in overrides)return overrides[n];
  if(n==='@simeoncalixte/ensured-pipeline-shared/db/models/index')return models;
  if(n==='./submissionSources')return {validateSourceSelections(){throw Error('Not exercised');}};
  if(n.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(full),n))+'.ts',overrides);
  return require(require.resolve(n,{paths:[path.join(root,'EnsuredAPI'),root]}));
 };
 vm.runInNewContext('(function(require,module,exports,process){'+source+'\n})',{console,Intl,Date,Buffer,URL,setTimeout})(req,mod,mod.exports,{env:{NODE_ENV:'production'}});
 cache[key]=mod.exports;return mod.exports;
}
const models={User:{findByPk:async()=>({role:'investor',investorProfile:{id:1}})},Tranche:{findAll:async()=>[{id:1,dealId:1,name:'T',capitalRequired:'1000',expectedReturn:'0.1',deal:{id:1,name:'D',status:'active'},subscriptions:[{investorProfileId:1,status:'pending',committedAmount:'100',deployedAmount:'0'}]}]}};
(async()=>{
 const results=[];
 const {InvestorDealsService}=load('EnsuredAPI/src/services/InvestorDealsService.ts');const svc=new InvestorDealsService();
 results.push({case:'Pending commitment reported as funded/invested',actual:await svc.getDashboardForInvestor(1),expected:'Committed 100; funded/deployed 0; do not report 100 invested.'});
 const base={status:'active',investorCommittedAmount:100,expectedReturnPct:10,pendingAmount:0};
 results.push({case:'Unowned opportunity changes portfolio return',actual:svc.buildDashboardSummary([base,{status:'available',investorCommittedAmount:0,expectedReturnPct:90,pendingAmount:1000}]),expected:'Owned-position return remains 10%; no cash-flow IRR is calculated.'});
 const plans=load('EnsuredAPI/src/billing/plans.ts');const billing=load('EnsuredAPI/src/billing/stripe.service.ts');
 results.push({case:'Production missing Stripe key',actual:await billing.createSubscription({plan:plans.SUBSCRIPTION_PLANS.find(p=>p.pricing.monthly>0),interval:'monthly',paymentMethodId:'anything',customer:{email:'fixture@example.invalid',userId:1}}),expected:'Reject paid checkout in production; never simulate active paid subscription.'});
 const checkout=load('EnsuredAPI/src/routes/subscriptions.ts',{'../auth/gateway':{authenticatedUser:()=>({id:1})},'@simeoncalixte/ensured-pipeline-shared/db/models/index':{User:{findByPk:async()=>({id:1,role:'investor',email:'fixture@example.invalid'})},Subscription:{findOne:async()=>null,create:async x=>({id:1,...x})}},'../billing/stripe.service':billing});
 const handlers={};await checkout.subscriptionsRoute({get:(p,f)=>handlers[p]=f,post:(p,f)=>handlers[p]=f});let sent;
 await handlers['/subscriptions/checkout']({body:{role:'admin'}},{code(){return this},send(x){sent=x;return x}});
 results.push({case:'Ordinary investor selects admin subscription',actual:sent,expected:'Server checks eligible plans against authenticated participant; rejects free admin plan for ordinary investor. Does not prove privilege escalation.'});
 // Expose the unchanged private pure helper only; stub imports, never call the compute orchestration.
 const computeFile='EnsuredPipelineRiskCompute/src/pipeline/compute/service.ts';
 const imports=[...fs.readFileSync(path.join(root,computeFile),'utf8').matchAll(/from ['"]([^'"]+)['"]/g)].map(x=>x[1]);
 const overrides=Object.fromEntries(imports.map(n=>[n,{}]));
 const compute=load(computeFile,overrides,'export const auditDeriveExposure=deriveExposure;');
 results.push({case:'Revenue basis selects TIV',actual:compute.auditDeriveExposure({'financials.tiv':1000000,'financials.revenue':100000},'revenue'),expected:{exposureBase:100000,exposureBasis:'revenue'}});
 const assemble=load('EnsuredPipelineRiskCompute/src/pipeline/compute/assemble.ts');
 results.push({case:'Unmodelable price persisted as zero',actual:assemble.mapToPersistence({}, {technicalPremium:null},{value:null},null,null),expected:'Unavailable price remains unavailable rather than becoming a numerical zero premium.'});
 fs.writeFileSync('output/finance-audit-2026-11-01/reproductions.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
