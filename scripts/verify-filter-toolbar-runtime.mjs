// Read-only local smoke test with the existing synthetic demo account.
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import {expect} from '../EnsuredNetwork/node_modules/@playwright/test/index.mjs';
const output='output/filter-button-delivery-2026-11-09';
const {accounts}=JSON.parse(await readFile('output/network-seed/v1/credentials.json','utf8'));
const account=accounts.find(a=>a.key==='cedent');
const browser=await chromium.launch({headless:true});const results=[];
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const login=await context.request.post('http://localhost:3000/identity/sign-in/email',{headers:{Origin:'http://localhost:3000'},data:{email:account.email,password:account.password}});
 expect(login.ok(),'Synthetic account sign-in').toBeTruthy();
 const page=await context.newPage();
 await page.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin!=='http://localhost:3000'||!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
  return route.continue();
 });
 const check=async(route,label,tab)=>{
  await page.goto('http://localhost:3000'+route);
  if(tab)await page.getByRole('tab',{name:tab,exact:true}).click();
  const trigger=page.getByRole('button',{name:label,exact:true});await expect(trigger).toBeVisible({timeout:20000});
  for(const width of [1440,375]){
   await page.setViewportSize({width,height:1000});await expect(async()=>{await expect(trigger).toBeVisible();await trigger.scrollIntoViewIfNeeded();}).toPass({timeout:10000});
   const bounds=await trigger.boundingBox();expect(bounds.height).toBeGreaterThanOrEqual(44);expect(bounds.height).toBeLessThanOrEqual(60);expect(bounds.width).toBeLessThan(260);
   expect(await trigger.evaluate(e=>!!e.closest('[data-filter-toolbar]'))).toBe(true);
   await trigger.click();await expect(page.getByRole('dialog',{name:label,exact:true})).toBeVisible();
   await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   results.push({route:route.replace(/facilities\/[^/]+\/[^/]+/,'facilities/[relationship]/[record]'),tab,label,width,passed:true,trigger:bounds});
  }
 };
 for(const [route,label] of [['/marketplace','Marketplace filters'],['/network/explore','Discovery filters'],['/network/facilities','Facility filters'],['/network/retrocession','Treaty filters'],['/network/facility-discovery','Shared facility filters'],['/network/parties','Party filters'],['/network/parties/finance','Financial party filters']])await check(route,label);
 const list=await context.request.get('http://localhost:3000/api/relationships/facilities');expect(list.ok()).toBeTruthy();
 const records=(await list.json()).data;expect(records.length).toBeGreaterThan(0);
 const record=records[0],route=`/network/facilities/${record.relationshipId}/${record.id}`;
 for(const [tab,label] of [['Approvals','Approval filters'],['Activity','Audit filters']])await check(route,label,tab);
 let requestChecked=false;
 for(const role of ['cedent','reinsurer']) {
 const owner=accounts.find(a=>a.key===role);
 await context.clearCookies();
 const signed=await context.request.post('http://localhost:3000/identity/sign-in/email',{headers:{Origin:'http://localhost:3000'},data:{email:owner.email,password:owner.password}});
 expect(signed.ok()).toBeTruthy();
 const ownedResponse=await context.request.get('http://localhost:3000/api/relationships/facilities');
 const ownedRecords=(await ownedResponse.json()).data;
 for(const record of ownedRecords){
  const response=await context.request.get(`http://localhost:3000/api/relationships/${record.relationshipId}/facilities/${record.id}`);
  if(!response.ok())continue;const detail=await response.json();
  if(!detail.permissions?.operate)continue;
  await page.goto(`http://localhost:3000/network/facilities/${record.relationshipId}/${record.id}`);
  await expect(page.getByRole('tablist',{name:'Record sections'})).toBeVisible();
  if(await page.getByRole('tab',{name:'Requests',exact:true}).count()){
   await check(`/network/facilities/${record.relationshipId}/${record.id}`,'Request filters','Requests');requestChecked=true;break;
  }
 }
 if(requestChecked)break;
 }
 expect(requestChecked,'Synthetic account has an owned facility request inbox').toBe(true);
} finally {await browser.close();await writeFile(output+'/runtime-journeys.json',JSON.stringify(results,null,2));}
console.log(`Passed ${results.length} read-only local route/viewport checks`);
