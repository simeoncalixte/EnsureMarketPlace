const fs=require('fs');
const {getSequelize,closeSequelize}=require('@simeoncalixte/ensured-pipeline-shared/config/database');
const {Submission,StageExecution}=require('@simeoncalixte/ensured-pipeline-shared/db/models/index');
const {PIPELINE_STAGE_CATALOG,populateSeededSubmissionPipeline}=require('./src/pipeline/board/service');
(async()=>{
 getSequelize();
 const rows=await Submission.findAll({where:{tenantId:19,submittedByUserId:8},order:[['id','ASC']]});
 if(rows.length!==42||rows[0].id!==14||rows.at(-1).id!==55)throw new Error('Seed batch identity mismatch');
 const results=[]; let next=0;
 const save=()=>fs.writeFileSync('/tmp/admin-pipeline-seed-repair29.json',JSON.stringify(results,null,2));
 async function work(){for(;;){const repairIds=[29];const cursor=next++;if(cursor>=repairIds.length)return;const index=repairIds[cursor]-14;const row=rows[index];const target=PIPELINE_STAGE_CATALOG[Math.floor(index/3)].key;const status=['submitted','quoted','bound'][index%3];
  console.log(JSON.stringify({event:'start',id:row.id,target,at:new Date().toISOString()}));
  const existing=await StageExecution.findOne({where:{submissionId:row.id,tenantId:19,stageKey:target,status:'completed'}});
  let progress;
  if(false) progress={ok:true,stageKey:target,alreadyCompleted:true};
  else progress=await populateSeededSubmissionPipeline(row.id,target,8);
  await Submission.update({status},{where:{id:row.id,tenantId:19}});
  const result={submissionId:row.id,target,status,...progress};results.push(result);save();
  console.log(JSON.stringify({event:'finish',...result,at:new Date().toISOString()}));
 }}
 await Promise.all([work()]);
 console.log(JSON.stringify({event:'summary',total:results.length,complete:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok)}));
 await closeSequelize();process.exitCode=results.some(r=>!r.ok)?2:0;
})().catch(async e=>{console.error(JSON.stringify({error:e.message,databaseError:e.parent?.message}));await closeSequelize();process.exitCode=1});
