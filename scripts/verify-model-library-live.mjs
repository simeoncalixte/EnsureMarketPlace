import jwt from '../EnsuredAPI/node_modules/jsonwebtoken/index.js';
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
const stories=Object.values(index.entries).filter(s=>s.type==='story'&&s.title==='Pages/Settings/Model Library Live');
if(stories.length!==2)throw new Error('Expected two live model library/settings stories');
const browser=await chromium.launch({headless:true}),results=[];
try{for(const story of stories){const page=await browser.newPage({viewport:{width:375,height:900}});const errors=[];
 await page.addInitScript(()=>{window.__partyStoryEvents=[];let channel;Object.defineProperty(window,'__STORYBOOK_ADDONS_CHANNEL__',{configurable:true,get:()=>channel,set:value=>{channel=value;for(const event of ['storyFinished','playFunctionThrewException','storyErrored','storyThrewException'])value.on(event,payload=>window.__partyStoryEvents.push({event,payload}));}});});
 await page.addInitScript(value=>window.__MODEL_TEST_API=value,process.env.MODEL_TEST_API);
 page.on('pageerror',e=>errors.push(e.message));
 // Fixtures must never reach any application server.
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===process.env.MODEL_TEST_API){const req=route.request();const assertion=jwt.sign({sub:'library-1',method:req.method(),path:url.pathname},process.env.MODEL_TEST_GATEWAY_SECRET,{issuer:'ensured-auth-gateway',audience:'ensured-marketplace',expiresIn:30});return route.continue({headers:{...req.headers(),'x-ensured-identity':assertion}});}
 if(url.origin!==base&&!['data:','blob:'].includes(url.protocol))return route.abort();return route.continue();});
 await page.goto(`${base}/iframe.html?id=${story.id}&viewMode=story`);
 let outcome;try{await page.waitForFunction(()=>window.__partyStoryEvents?.some(e=>['storyFinished','playFunctionThrewException','storyErrored','storyThrewException'].includes(e.event)),{},{timeout:45000});outcome=await page.evaluate(()=>window.__partyStoryEvents);}catch(e){outcome=[{event:'timeout',payload:(await page.locator('body').innerText()).slice(0,2000)}];}
 const passed=outcome.some(e=>e.event==='storyFinished'&&e.payload.status==='success')&&!errors.length&&!outcome.some(e=>e.event!=='storyFinished');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
 if(overflow)errors.push('Narrow-screen overflow');
 results.push({id:story.id,passed:passed&&!overflow,outcome,errors});console.log(passed?'PASS':'FAIL',story.id,passed?'':JSON.stringify({outcome,errors}).slice(0,2500));await page.close();
 }}finally{await browser.close();server?.close();await mkdir('output/model-library-2026-11-06/live-storybook',{recursive:true});await writeFile('output/model-library-2026-11-06/live-storybook/results.json',JSON.stringify(results,null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
