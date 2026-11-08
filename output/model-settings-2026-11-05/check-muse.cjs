// One synthetic document request; never print provider bodies or credentials.
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const apiRequire=createRequire(path.resolve('EnsuredAPI/package.json'));
const env=apiRequire('dotenv').parse(fs.readFileSync('EnsuredAPI/.env'));
const {createLlmChat}=apiRequire('@simeoncalixte/ensured-pipeline-shared/pipeline/agents/llm');
const {withTokenUsage,summarizeTokenUsage}=apiRequire('@simeoncalixte/ensured-pipeline-shared/pipeline/agents/tokenUsage');
(async()=>{
 const schema={type:'object',properties:{insuredName:{type:'string',const:'Synthetic Example'},currency:{type:'string',const:'USD'}},required:['insuredName','currency'],additionalProperties:false};
 const calls=[],result={provider:'muse',model:env.MUSE_MODEL,endpoint:'https://api.meta.ai/v1',synthetic:true,startedAt:new Date().toISOString()};
 try{
  const client=await createLlmChat({...env,LLM_PROVIDER:'muse',MUSE_TIMEOUT_MS:'60000'},{jsonSchema:schema});
  const response=await withTokenUsage(calls,()=>client.invoke('Synthetic document for integration verification only: insuredName is Synthetic Example and currency is USD. Return those two fields.'));
  const data=JSON.parse(response.content);if(data.insuredName!=='Synthetic Example'||data.currency!=='USD')throw Error('Synthetic facts failed validation');
  result.ok=true;result.factsValidated=true;result.usage=summarizeTokenUsage(calls);
 }catch(error){result.ok=false;result.error=error.message;result.usage=summarizeTokenUsage(calls);process.exitCode=1;}
 fs.writeFileSync('output/model-settings-2026-11-05/muse-provider-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(()=>{console.log('Muse check could not start');process.exitCode=1;});
