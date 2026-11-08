import { chromium } from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
const outputDir=process.env.PALETTE_OUTPUT || 'output/palette-2026-11-07';
const browser=await chromium.launch({headless:true});const results=[];
try {
 for(const [name,url,themes] of [['host','http://localhost:3000/',['dark','light']],['submission','http://localhost:30025/',['dark','light']],['services','http://localhost:3010/',['dark']]]){
  for(const theme of themes){const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(theme=>localStorage.setItem('ensured-xds-theme',theme),theme);
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--xds-background').trim().length>0);
   if(name!=='services')await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);
   await page.screenshot({path:`${outputDir}/runtime-${name}-${theme}.png`,fullPage:true});
   if(name==='host'){const pipeline=await (await page.request.get(url+'src/Pages/InsurerDashboard/PipelineProcesses.tsx')).text();if(pipeline.includes('/.vite/deps/@ensured_xds'))errors.push('XDS must not use immutable optimized bundles');}
   const state=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,background:getComputedStyle(document.documentElement).getPropertyValue('--xds-background').trim(),primary:getComputedStyle(document.documentElement).getPropertyValue('--xds-primary').trim(),heading:document.querySelector('h1')?.textContent,availabilityMessage:document.body.innerText.includes('Unable to check registration') ? 'Auth registration check unavailable' : undefined}));
   const passed=response.status()===200&&!state.availabilityMessage&&!errors.length&&state.background.toLowerCase()===(theme==='dark'?'#17191d':'#f3f1ea');
   results.push({name,url,requestedTheme:theme,status:response.status(),state,errors,passed});console.log(passed?'PASS':'FAIL',name,theme,JSON.stringify({state,errors}));await page.close();
  }
 }
 for(const [name,url] of [['services-css','http://localhost:3010/xds-colors.generated.css'],['auth-css','http://localhost:3002/auth/xds-colors.generated.css']]){try{const response=await fetch(url.replace('localhost','127.0.0.1'), {signal:AbortSignal.timeout(5000)});const body=await response.text();results.push({name,status:response.status,passed:response.ok&&body.includes('--xds-palette-obsidian: #17191D')});console.log(name,response.status);}catch(error){results.push({name,error:String(error),passed:false});}}
}finally{await browser.close();await writeFile(`${outputDir}/runtime.json`,JSON.stringify(results,null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
