// Explicit local development staging only; does not publish registry packages or
// change manifests/lockfiles. npm install/ci replaces these installed artifacts.
import {spawnSync} from 'node:child_process';
import {cpSync,existsSync,mkdtempSync,readFileSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const backup=mkdtempSync(path.join(tmpdir(),'ensured-finance-packages-'));
for(const directory of ['EnsuredPipelineShared','EnsuredPipelineRiskCompute']){
 const source=path.join(root,directory),metadata=JSON.parse(readFileSync(path.join(source,'package.json'),'utf8'));
 const installed=path.join(root,'node_modules',metadata.name);
 if(!existsSync(path.join(installed,'package.json')))throw new Error(`Install ${metadata.name} before local staging.`);
 const build=spawnSync('npm',['run','build'],{cwd:source,stdio:'inherit'});if(build.status!==0)throw new Error(`Build failed: ${directory}`);
 if(realpathSync(path.join(source,'dist'))===realpathSync(path.join(installed,'dist'))){console.log(`${metadata.name} already resolves to the local built artifact.`);continue;}
 cpSync(path.join(installed,'dist'),path.join(backup,directory),{recursive:true});
 cpSync(path.join(source,'dist'),path.join(installed,'dist'),{recursive:true});
 console.log(`Staged local ${metadata.name}; previous dist retained at ${path.join(backup,directory)}`);
}
