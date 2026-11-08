const fs = require('node:fs');
const {getSequelize,closeSequelize}=require('@simeoncalixte/ensured-pipeline-shared/config/database');
const {User,Organization}=require('@simeoncalixte/ensured-pipeline-shared/db/models/index');
const board=require('./src/pipeline/board/service');
const originalPopulate=board.populateSeededSubmissionPipeline;
board.populateSeededSubmissionPipeline=async(id,target,actor)=>{
 console.log(JSON.stringify({event:'pipeline-start',submissionId:id,targetStage:target,at:new Date().toISOString()}));
 const result=await originalPopulate(id,target,actor);
 console.log(JSON.stringify({event:'pipeline-finish',submissionId:id,...result,at:new Date().toISOString()}));
 return result;
};
const {PipelineSubmissionSeedService}=require('./src/services/PipelineSubmissionSeedService');
(async()=>{
 const sequelize=getSequelize(); await sequelize.authenticate();
 const user=await User.findByPk(8);
 if(!user||user.email!=='simeoncalixte@gmail.com'||user.role!=='admin'||!user.isActive) throw new Error('Expected active admin account was not found');
 if(!user.organizationId) await sequelize.transaction(async transaction=>{
   const organization=await Organization.create({name:'Ensured Admin Pipeline Testing',type:'admin'},{transaction});
   await user.update({organizationId:organization.id},{transaction});
 });
 console.log(JSON.stringify({event:'target',userId:user.id,email:user.email,organizationId:user.organizationId}));
 const result=await new PipelineSubmissionSeedService().seedForOrganization(user.organizationId,user.id,{distribution:'full-pipeline',count:42,attachDocuments:true,ensureSubscriptions:true});
 fs.writeFileSync('/tmp/admin-pipeline-seed-result.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({event:'summary',organizationId:result.organizationId,submissionsCreated:result.submissionsCreated,pipelineComplete:result.pipelineComplete,pipelineFailures:result.pipelineFailures}));
 await closeSequelize();
 process.exitCode=result.pipelineComplete?0:2;
})().catch(async error=>{console.error(JSON.stringify({error:error.message,databaseError:error.parent?.message,detail:error.parent?.detail}));console.error(error.stack);await closeSequelize();process.exitCode=1;});
