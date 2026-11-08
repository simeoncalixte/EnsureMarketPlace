import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import {expect} from '../EnsuredNetwork/node_modules/@playwright/test/index.mjs';
const {accounts}=JSON.parse(await readFile(new URL('../output/network-seed/v1/credentials.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:1600,height:1100}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const login=async(ctx,key)=>{const a=accounts.find(a=>a.key===key);const r=await ctx.request.post('http://localhost:3000/identity/sign-in/email',{headers:{Origin:'http://localhost:3000'},data:{email:a.email,password:a.password}});expect(r.ok()).toBeTruthy();};
 await login(context,'cedent');
 await page.goto('http://localhost:3000/network/facilities');
 await expect(page.getByRole('heading',{name:'Facilities',exact:true})).toBeVisible();
 await expect(page.locator('.facility-table article').first()).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
 const all=await (await context.request.get('http://localhost:3000/api/relationships/facilities')).json();
 const own=await (await context.request.get('http://localhost:3000/api/relationships/context')).json();
 const candidate=all.data.find(i=>i.ownerOrganizationId===own.organization.id && i.publicationStatus==='published' && /Network demo v1/.test(i.title));
 if(!candidate)throw Error('No published owned demo facility available');
 const endpoint=`/api/relationships/${candidate.relationshipId}/facilities/${candidate.id}`;
 await page.getByLabel('Search facilities',{exact:true}).fill(candidate.reference);
 await expect(page.locator('.facility-table article')).toHaveCount(1);
 await page.getByRole('button',{name:'Reset filters',exact:false}).click();
 await expect(page.locator('.facility-table article').first()).toBeVisible();
 await mkdir(new URL('../output/facilities-redesign/',import.meta.url),{recursive:true});
 await page.screenshot({path:new URL('../output/facilities-redesign/desktop.png',import.meta.url).pathname,fullPage:true});
 await page.goto(`http://localhost:3000/network/facilities/${candidate.relationshipId}/${candidate.id}`);
 await page.getByRole('tab',{name:'Requests',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Capacity requests',exact:true})).toBeVisible();
 await expect(page.getByLabel('Accept capacity requests')).toBeVisible();
 // Only the dedicated local demo facility is configured; real user facilities are untouched.
 const initial=await (await context.request.get('http://localhost:3000'+endpoint+'/requests')).json();
 if(!initial.settings.enabled){
  await page.getByLabel('Accept capacity requests').check();
  await page.getByLabel('Minimum request',{exact:false}).fill('100.00');
  await page.getByLabel('Maximum per requester',{exact:false}).fill('1000.00');
  await page.getByLabel('Allow requests from individual members').check();
  await page.getByLabel('Requester instructions').fill('Demo: describe your proposed risk and requested share. Requests are reviewed by the facility manager.');
  await page.getByRole('button',{name:'Save request settings'}).click();
  await expect(page.getByLabel('Accept capacity requests')).toBeChecked();
 }
 const requester=await browser.newContext({viewport:{width:1440,height:1100}});await login(requester,'broker');
 const requestPage=await requester.newPage();
 await requestPage.goto(`http://localhost:3000/network/facility-discovery?id=${candidate.id}`);
 await expect(requestPage.getByRole('heading',{name:'Request a share of this facility',exact:true})).toBeVisible();
 const prior=await (await requester.request.get(`http://localhost:3000/api/relationships/facility-discovery/${candidate.id}/requests`)).json();
 if(!prior.data.some(r=>['pending','approved'].includes(r.state) && r.requesterKind==='organization')){
  await requestPage.getByLabel('Requested amount',{exact:false}).fill('500.00');
  await requestPage.getByLabel('Purpose and risk details').fill('Synthetic local demo request for a share of facility capacity; no insurance coverage is bound.');
  await requestPage.getByRole('button',{name:'Request capacity',exact:true}).click();
  await expect(requestPage.getByRole('status').filter({hasText:/request is pending/})).toBeVisible();
 }
 await page.reload();await page.getByRole('tab',{name:'Requests',exact:true}).click();
 await expect(page.getByText('Synthetic local demo request for a share of facility capacity; no insurance coverage is bound.',{exact:true})).toBeVisible();
 await page.screenshot({path:new URL('../output/facilities-redesign/requests.png',import.meta.url).pathname,fullPage:true});
 await page.goto('http://localhost:3000/network/facilities');await page.setViewportSize({width:390,height:844});
 await expect(page.locator('.facility-table article').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:new URL('../output/facilities-redesign/mobile.png',import.meta.url).pathname,fullPage:true});
 expect(errors).toEqual([]);await requester.close();
 console.log('Verified facilities dashboard, search, desktop/mobile layout, manager configuration, and a persisted pending demo request.');
}finally{await browser.close();}
