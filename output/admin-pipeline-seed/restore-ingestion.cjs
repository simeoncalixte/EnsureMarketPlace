const {getSequelize,closeSequelize}=require('@simeoncalixte/ensured-pipeline-shared/config/database');
const {Submission,IngestionEvent,StageExecution,PipelineArtifact,PipelineRun}=require('@simeoncalixte/ensured-pipeline-shared/db/models/index');
const {Op}=require('sequelize');
const {populateSeededSubmissionPipeline}=require('./src/pipeline/board/service');
(async()=>{const db=getSequelize();await db.transaction(async transaction=>{
 const scope={submissionId:[14,15],tenantId:19};
 await IngestionEvent.destroy({where:{...scope,stage:{[Op.notIn]:['received','ingestion']}},transaction});
 await StageExecution.destroy({where:{...scope,stageKey:{[Op.ne]:'ingestion'}},transaction});
 await PipelineArtifact.destroy({where:{...scope,stageKey:{[Op.ne]:'ingestion'}},transaction});
 await PipelineRun.update({toStage:'ingestion',status:'running',finishedAt:null},{where:scope,transaction});
 await StageExecution.update({status:'failed',finishedAt:new Date(),errorMessage:'Initial seed process stopped because OCR language data was unavailable; successfully retried.'},{where:{submissionId:17,tenantId:19,status:'running'},transaction});
});for(const id of [14,15]){const result=await populateSeededSubmissionPipeline(id,'ingestion',8);if(!result.ok)throw new Error(result.error);await Submission.update({status:id===14?'submitted':'quoted'},{where:{id,tenantId:19}});console.log(JSON.stringify({id,...result}));}await closeSequelize()})().catch(async e=>{console.error(JSON.stringify({error:e.message,databaseError:e.parent?.message}));await closeSequelize();process.exitCode=1});
