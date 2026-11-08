import {chromium} from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import {expect} from '../EnsuredNetwork/node_modules/@playwright/test/index.mjs';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1534,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3015/test/facilityOverview.html');
 await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 await expect(page.getByText('Published to approved audience',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:/Governing agreement 1/})).toHaveAttribute('href','/network/agreements/relationship/agreement?revision=1');
 await page.getByRole('button',{name:/View history/}).click();expect(await page.evaluate(()=>window.__navigation)).toBe('activity');
 await page.getByRole('button',{name:/Terms approval state/}).click();expect(await page.evaluate(()=>window.__navigation)).toBe('approvals');
 await page.getByLabel('Facility overview version').selectOption('2');expect(await page.evaluate(()=>window.__version)).toBe(2);
 const approve=page.getByRole('button',{name:'Approve publication to Network and Marketplace'});await expect(approve).toBeDisabled();
 await page.getByLabel('I reviewed the active summary').check();await approve.click();expect(await page.evaluate(()=>window.__lastAction.payload.share)).toBe(true);
 await page.getByRole('button',{name:'Withdraw publication approval'}).click();expect(await page.evaluate(()=>window.__lastAction.payload.share)).toBe(false);
 await mkdir('output/facility-overview',{recursive:true});await page.screenshot({path:'output/facility-overview/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'output/facility-overview/mobile.png',fullPage:true});
 await page.goto('http://127.0.0.1:3015/test/facilityOverview.html?mode=history');await expect(page.getByText('Review active version',{exact:true})).toBeVisible();await expect(approve).toHaveCount(0);
 await page.goto('http://127.0.0.1:3015/test/facilityOverview.html?mode=draft');await expect(page.getByText('Activate a facility version before approving its discovery summary.')).toBeVisible();await expect(approve).toHaveCount(0);
 expect(errors).toEqual([]);console.log('Passed overview navigation, pinned agreement links, version selection, publication consent/actions, historical/draft states, and mobile overflow checks.');
}finally{await browser.close();}
