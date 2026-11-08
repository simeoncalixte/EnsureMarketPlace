import {chromium} from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
const root=resolve('EnsuredUI/storybook-static');
let server,base=process.env.PARTY_STORYBOOK_URL;
if(!base){
 server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+sep))throw new Error('Invalid path');const data=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));server.unref();base=`http://127.0.0.1:${server.address().port}`;
}

const index=await (await fetch(base+'/index.json')).json();
const stories=Object.values(index.entries).filter(s=>s.type==='story'&&s.title==='Pages/Parties/Workflows');
const coverage=JSON.parse(await readFile('EnsuredUI/src/Pages/Parties/partyStoryCoverage.json','utf8'));
const expected=coverage.flatMap(t=>t.stories.map(name=>'pages-parties-workflows--'+name.replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase()));
if(expected.length!==stories.length||expected.some(id=>!stories.some(s=>s.id===id)))throw new Error('Storybook index and Jira coverage manifest differ');
const browser=await chromium.launch({headless:true}),results=[];
try{for(const story of stories){const page=await browser.newPage();const errors=[];
 await page.addInitScript(()=>{window.__partyStoryEvents=[];let channel;Object.defineProperty(window,'__STORYBOOK_ADDONS_CHANNEL__',{configurable:true,get:()=>channel,set:value=>{channel=value;for(const event of ['storyFinished','playFunctionThrewException','storyErrored','storyThrewException'])value.on(event,payload=>window.__partyStoryEvents.push({event,payload}));}});});
 page.on('pageerror',e=>errors.push(e.message));
 // Fixtures must never reach any application server.
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==base&&!['data:','blob:'].includes(url.protocol))return route.abort();return route.continue();});
 await page.goto(`${base}/iframe.html?id=${story.id}&viewMode=story`);
 let outcome;try{await page.waitForFunction(()=>window.__partyStoryEvents?.some(e=>['storyFinished','playFunctionThrewException','storyErrored','storyThrewException'].includes(e.event)),{},{timeout:45000});outcome=await page.evaluate(()=>window.__partyStoryEvents);}catch(e){outcome=[{event:'timeout',payload:(await page.locator('body').innerText()).slice(0,2000)}];}
 const passed=outcome.some(e=>e.event==='storyFinished'&&e.payload.status==='success')&&!errors.length&&!outcome.some(e=>e.event!=='storyFinished');
 results.push({id:story.id,passed,outcome,errors});console.log(passed?'PASS':'FAIL',story.id,passed?'':JSON.stringify({outcome,errors}).slice(0,2500));await page.close();
 }}finally{await browser.close();server?.close();await mkdir('output/party-storybook',{recursive:true});await writeFile('output/party-storybook/results.json',JSON.stringify(results,null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
