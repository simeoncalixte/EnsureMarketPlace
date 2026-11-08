import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import {expect} from '../EnsuredNetwork/node_modules/@playwright/test/index.mjs';
const credentials=JSON.parse(await readFile('output/network-seed/v1/credentials.json','utf8'));
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
 const account=credentials.accounts.find(a=>a.key==='cedent');
 const login=await context.request.post('http://localhost:3000/identity/sign-in/email',{headers:{Origin:'http://localhost:3000'},data:{email:account.email,password:account.password}});
 expect(login.ok()).toBe(true);
 const discovery=await context.request.get('http://localhost:3000/api/relationships/facility-discovery');
 const offers=(await discovery.json()).data;
 const facility=offers.find(o=>o.id==='2b8d5b5b-6668-439a-bd7a-fb86d8b78f8d');
 expect(facility).toBeTruthy();
 const list=await context.request.get('http://localhost:3000/api/relationships');
 const relationships=(await list.json()).data;
 let endpoint,inbox;
 for(const r of relationships){const e=`/api/relationships/${r.id}/facilities/${facility.id}`;const response=await context.request.get('http://localhost:3000'+e+'/requests');if(response.ok()){endpoint=e;inbox=await response.json();break;}}
 expect(inbox.data.length).toBe(3);
 await page.goto('http://localhost:3000/network/facilities/'+endpoint.split('/')[3]+'/'+facility.id);
 await page.getByRole('tab',{name:'Requests',exact:true}).click();
 await expect(page.locator('.fr-request')).toHaveCount(inbox.data.length);
 for(const request of inbox.data)await expect(page.getByRole('heading',{name:request.message.split('\n')[0],exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Open \/ Review/}).click();await expect(page.locator('.fr-request')).toHaveCount(inbox.data.filter(r=>r.state==='pending').length);
 await page.getByRole('button',{name:/All requests/}).click();await page.getByLabel('Search requests').fill('Panamax');await expect(page.locator('.fr-request')).toHaveCount(1);
 await page.getByLabel('Search requests').fill('no-match-xyz');await expect(page.getByRole('heading',{name:'No matching requests'})).toBeVisible();
 await page.getByLabel('Search requests').fill('');await page.getByLabel('Request order').selectOption('amount');
 await expect(page.locator('.fr-request').first()).toContainText('Containerized medical');
 await mkdir('output/facility-requests',{recursive:true});await page.screenshot({path:'output/facility-requests/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'output/facility-requests/mobile.png',fullPage:true});
 await page.reload();await page.getByRole('tab',{name:'Requests',exact:true}).click();await expect(page.locator('.fr-request')).toHaveCount(3);
 console.log('Verified authenticated database API records, rendered titles, filters, search, sorting, reload persistence, and mobile layout.');
}finally{await browser.close();}
