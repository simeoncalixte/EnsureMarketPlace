import {chromium} from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import {expect} from '../EnsuredNetwork/node_modules/@playwright/test/index.mjs';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/relationships/relationship/agreements',route=>route.fulfill({json:{data:[],nextCursor:null}}));
 await page.goto('http://127.0.0.1:3015/test/facilityTerms.html');
 await expect(page.getByRole('heading',{name:'Eligible Risk Classes & Lines of Business'})).toBeVisible();
 await page.getByRole('button',{name:'Review Marine Cargo eligibility'}).click();await expect(page.locator('.ft-expanded')).toBeVisible();
 await page.getByRole('button',{name:'Review Marine Cargo eligibility'}).click();await expect(page.locator('.ft-expanded')).toHaveCount(0);
 await page.getByRole('button',{name:'Review governance'}).click();expect(await page.evaluate(()=>window.__navigation)).toBe('approvals');
 await page.getByRole('button',{name:'Review documents →'}).click();expect(await page.evaluate(()=>window.__navigation)).toBe('documents');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:/Export reviewed terms/}).click();expect((await download).suggestedFilename()).toContain('terms.json');
 await page.getByRole('button',{name:'Create new terms version'}).click();await expect(page.getByRole('heading',{name:'Create a new terms version'})).toBeVisible();
 await page.getByRole('button',{name:'Close amendment editor'}).click();
 await mkdir('output/facility-terms',{recursive:true});await page.screenshot({path:'output/facility-terms/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'output/facility-terms/mobile.png',fullPage:true});
 await page.goto('http://127.0.0.1:3015/test/facilityTerms.html?mode=history');await expect(page.getByRole('button',{name:'Create new terms version'})).toHaveCount(0);
 expect(errors).toEqual([]);console.log('Passed eligibility expansion, governance/document navigation, export, amendment access, historical read-only view, and mobile overflow checks.');
}finally{await browser.close();}
