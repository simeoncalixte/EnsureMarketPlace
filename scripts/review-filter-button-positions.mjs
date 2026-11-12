// Capture synthetic UI evidence; external requests are blocked.
import {chromium} from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
const output=resolve(process.env.REVIEW_OUTPUT || 'output/filter-button-review-2026-11-09');const phase=process.env.REVIEW_PHASE || 'before';await mkdir(output,{recursive:true});
const sets=[
 ['EnsuredMarketplace/storybook-static',[['marketplace','marketplace-experience--taxonomy-interaction']]],
 ['EnsuredNetwork/frontend/storybook-static',[['network','network-fixtures--discovery-filters']]],
 ['EnsuredLogistics/storybook-static',[['logistics','logistics-collaboration--search-and-filter']]],
 ['EnsuredUI/storybook-static',[
 ['facilities','pages-commercial-palette-regression--listing'],['facility-documents','pages-commercial-palette-regression--documents'],['approvals','pages-commercial-palette-regression--approvals'],['activity','pages-commercial-palette-regression--activity'],['requests','pages-commercial-palette-regression--requests'],['treaties','pages-filters-commercial--treaty-search'],['facility-discovery','pages-filters-commercial--shared-facility-search'],['email','pages-insurer-dashboard-email-inbox--inbox-layout'],['submission-documents','pages-insurer-dashboard-submission-documents--multiple-documents'],['models','pages-settings-model-library--search-pagination'],['parties','pages-parties-workflows--directory-search'],['financial-parties','pages-parties-workflows--financial-directory']
 ]]
];
const browser=await chromium.launch({headless:true});const selected=process.env.REVIEW_SURFACES?.split(',');const records=selected?JSON.parse(await readFile(resolve(output,'captures.json'),'utf8').catch(()=>'[]')).filter(r=>!selected.includes(r.surface)):[];
try {for(const [directory,stories] of sets){const root=resolve(directory);
 const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{for(const [surface,id] of stories){if(selected&&!selected.includes(surface))continue;for(const width of [1440,375]){const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1});const errors=[];
 await page.addInitScript(()=>{localStorage.setItem('ensured-xds-theme','dark');window.__reviewEvents=[];let channel;Object.defineProperty(window,'__STORYBOOK_ADDONS_CHANNEL__',{configurable:true,get:()=>channel,set:value=>{channel=value;for(const event of ['storyFinished','playFunctionThrewException','storyErrored','storyThrewException'])value.on(event,payload=>window.__reviewEvents.push({event,payload}));}});});
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
 await page.waitForFunction(()=>window.__reviewEvents.some(e=>['storyFinished','playFunctionThrewException','storyErrored','storyThrewException'].includes(e.event)),{},{timeout:45000});
 const events=await page.evaluate(()=>window.__reviewEvents);if(!events.some(e=>e.event==='storyFinished'&&e.payload.status==='success'))errors.push('Story did not finish successfully');
 if(surface==='parties')await page.getByRole('link',{name:'← All parties',exact:true}).click();
 if(surface==='financial-parties')await page.getByRole('link',{name:'All financial parties',exact:true}).click();
 if(['parties','financial-parties'].includes(surface))await page.locator('button[aria-controls]').filter({hasText:/filters/i}).waitFor();
 await page.keyboard.press('Escape');await page.evaluate(()=>window.scrollTo(0,0));
 const triggers=await page.locator('button[aria-controls]').filter({hasText:/filters/i}).evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {label:n.textContent,rect:{x:b.x,y:b.y,width:b.width,height:b.height},parent:n.parentElement.tagName,parentClass:n.parentElement.className};}));
 const name=`${phase}-${surface}-${width}x1000-closed.png`;await page.screenshot({path:resolve(output,name),fullPage:true});
 let openName=null;const trigger=page.locator('button[aria-controls]').filter({hasText:/filters/i}).first();if(await trigger.count()) {await trigger.click();openName=`${phase}-${surface}-${width}x1000-open.png`;await page.screenshot({path:resolve(output,openName),fullPage:false});}
 records.push({surface,storyId:id,source:directory,viewport:{width,height:1000},theme:'dark',zoom:'100%',deviceScaleFactor:1,scroll:{x:0,y:0},state:'Synthetic fixture after its play function; panel dismissed with Escape for closed view. Full-page closed screenshot; viewport open screenshot.',[phase]:name,[phase==='before'?'openBefore':'openAfter']:openName,triggers,errors});console.log(surface,width,JSON.stringify(triggers));await page.close();
 }}}finally{server.close();}
 }}finally{await browser.close();await writeFile(resolve(output,'captures.json'),JSON.stringify(records,null,2));}
if(records.some(r=>r.errors.length))process.exitCode=1;
