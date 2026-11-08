import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import {expect} from '../EnsuredNetwork/node_modules/@playwright/test/index.mjs';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('../output/network-seed/v1',import.meta.url));
const credentials=JSON.parse(await readFile(directory+'/credentials.json','utf8')),report=JSON.parse(await readFile(directory+'/report.json','utf8'));
const browser=await chromium.launch({headless:true}),context=await browser.newContext(),page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 const account=credentials.accounts.find(a=>a.key==='reinsurer');const login=await context.request.post('http://localhost:3000/identity/sign-in/email',{headers:{Origin:'http://localhost:3000'},data:{email:account.email,password:account.password}});if(!login.ok())throw Error('Demo sign-in failed: '+login.status());
 for(const route of ['','explore','following','introductions','notifications','bookmarks','preferences','relationships','agreements','facilities','commitments','ledger','retrocession','servicing','facility-discovery']){
  await page.goto('http://localhost:3000/network'+(route?'/'+route:''),{waitUntil:'domcontentloaded'});
  await expect(page.locator('#application-sidebar').getByRole('link',{name:'Servicing',exact:true})).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  console.log('Network page loaded: '+(route||'feed'));
 }
 const projection=await (await context.request.get('http://localhost:3000/api/network/context')).json();
 await page.goto(`http://localhost:3000/network/people/${projection.viewer.userId}`);await expect(page.getByRole('heading',{name:account.name,exact:true})).toBeVisible();
 const organization=projection.viewer.actorGrants.find(grant=>grant.actor.kind==='organization');if(!organization)throw Error('Demo organization publishing grant missing');await page.goto(`http://localhost:3000/network/organizations/${organization.actor.id}`);await expect(page.getByRole('alert')).toHaveCount(0);
 for(const link of report.links){await page.goto(link.url);await expect(page.locator('#application-sidebar').getByRole('link',{name:'Servicing',exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);}
 const opportunities=report.commercial.opportunityPublishing?.entries;
 if(!opportunities)throw Error('Submission-backed publishing seed missing; rerun --apply');
 const market=await context.request.get('http://localhost:3000/api/relationships/retrocession-opportunities?q=funding%20opportunity');
 if(!market.ok())throw Error('Published opportunity discovery failed');
 const listings=(await market.json()).data;
 for(const [name,entry] of Object.entries(opportunities)){
  const visible=listings.some(item=>item.id===entry.id),expected=['open','in_discussions'].includes(entry.target);
  if(visible!==expected)throw Error(`Unexpected initial seed visibility: ${name}`);
 }
 for(const surface of ['network','marketplace']){
  await page.goto(`http://localhost:3000/${surface}`);
  if(surface==='network') await page.getByRole('button',{name:'All market insights',exact:true}).click();
  await expect(page.getByRole('region',{name:'Funded retrocession opportunities'})).toHaveCount(0);
  const board=page;
  await expect(board.getByRole('heading',{name:/Submission funding opportunity$/})).toBeVisible();
  await expect(board.getByRole('heading',{name:/Tranche funding opportunity$/})).toBeVisible();
  await expect(board.getByRole('heading',{name:/Grouped funding opportunity$/})).toHaveCount(0);
  await expect(board.getByRole('heading',{name:/Closed funding opportunity$/})).toHaveCount(0);
  await page.screenshot({path:directory+`/funded-retrocession-${surface}.png`,fullPage:true});
 }
 await page.goto(report.links.find(link=>link.name==='Servicing').url);await expect(page.getByText('Recoverable: USD 10000.00',{exact:true})).toBeVisible();await page.screenshot({path:directory+'/servicing.png',fullPage:true});
 const moderator=credentials.accounts.find(a=>a.key==='cedent');await context.clearCookies();const mod=await context.request.post('http://localhost:3000/identity/sign-in/email',{headers:{Origin:'http://localhost:3000'},data:{email:moderator.email,password:moderator.password}});if(!mod.ok())throw Error('Demo moderator sign-in failed');await page.goto('http://localhost:3000/network/moderation');await expect(page.getByText('Synthetic moderation example.',{exact:false})).toBeVisible();
 if(errors.length)throw Error(errors.join('; '));await writeFile(directory+'/browser-verification.json',JSON.stringify({passed:true,pages:17,recordPages:report.links.length,moderation:true,errors},null,2),{mode:0o600});console.log('Seeded pages and normal sign-in verified with demo identities.');
}finally{await browser.close();}
