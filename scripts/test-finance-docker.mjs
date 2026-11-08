import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdirSync} from 'node:fs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const project=`ensured-finance-test-${randomBytes(6).toString('hex')}`;
const env={...process.env,FINANCE_TEST_PASSWORD:randomBytes(24).toString('hex')};
const compose=['compose','-p',project,'-f',path.join(root,'docker-compose.finance-test.yml')];
function docker(args,capture=false){
 const r=spawnSync('docker',[...compose,...args],{cwd:root,env,encoding:'utf8',stdio:capture?'pipe':'inherit'});
 if(r.error)throw r.error;if(r.status!==0)throw new Error(`Docker test command failed (${r.status})`);return r.stdout;
}
let result=1;
try{
 docker(['up','-d','--wait','--wait-timeout','45']);
 const port=Number(docker(['port','postgres','5432'],true).trim().split(':').at(-1));
 if(!Number.isSafeInteger(port)||port<1)throw new Error('Test database port not resolved');
 mkdirSync(path.join(root,'output/finance-tests'),{recursive:true});
 const r=spawnSync(process.execPath,['./node_modules/jest/bin/jest.js','--config','jest.relationships.config.cjs','--runInBand','--json','--outputFile',path.join(root,'output/finance-tests/results.json'),...process.argv.slice(2)],{
  cwd:path.join(root,'EnsuredAPI'),stdio:'inherit',env:{...process.env,DB_HOST:'127.0.0.1',DB_PORT:String(port),DB_USER:'postgres',DB_PASSWORD:env.FINANCE_TEST_PASSWORD,RELATIONSHIPS_TEST_DB:'ensured_finance_test',RELATIONSHIPS_DB_TEST:'1'},
 });
 if(r.error)throw r.error;result=r.status??1;
}finally{
 // This random project owns only disposable test resources.
 docker(['down','--volumes','--remove-orphans']);
}
process.exitCode=result;
