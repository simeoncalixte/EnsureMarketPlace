import {chromium} from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import {expect} from '../EnsuredNetwork/node_modules/@playwright/test/index.mjs';
import {unzipSync,strFromU8} from '../EnsuredUI/node_modules/fflate/esm/index.mjs';
import {mkdir,readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/documents/*/content',route=>{requests.push(route.request().url());return route.fulfill({body:'Authorized document fixture',contentType:'text/plain'});});
 await page.goto('http://127.0.0.1:3015/test/facilityDocuments.html');
 await expect(page.getByRole('heading',{name:'Facility Agreements & Terms'})).toBeVisible();await expect(page.locator('tbody tr')).toHaveCount(3);
 await page.getByRole('button',{name:/Marine Loss History.txt/}).first().click();await expect(page.locator('.fd-checksum code')).toHaveText('c'.repeat(64));
 await page.getByLabel('Document inclusion status').selectOption('included');await expect(page.locator('tbody tr')).toHaveCount(2);
 await page.getByLabel('Document inclusion status').selectOption('all');await page.getByLabel('Document upload version').selectOption('2');await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.getByLabel('Document upload version').selectOption('all');await page.getByLabel('Search facility documents').fill('no matching file');await expect(page.getByRole('heading',{name:'No matching documents'})).toBeVisible();await page.getByRole('button',{name:'Reset filters'}).click();
 const zipDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download all (.ZIP)'}).click();const zip=await zipDownload;const files=unzipSync(new Uint8Array(await readFile(await zip.path())));expect(Object.keys(files)).toHaveLength(3);expect(strFromU8(Object.values(files)[0])).toBe('Authorized document fixture');expect(requests).toHaveLength(3);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download selected document'}).click();expect((await download).suggestedFilename()).toBe('Marine Loss History.txt');
 await page.getByRole('button',{name:'Upload Document',exact:false}).click();await page.getByLabel('Choose document').setInputFiles({name:'review.txt',mimeType:'text/plain',buffer:Buffer.from('Reviewed facility terms')});await page.getByRole('button',{name:'Upload immutable document'}).click();await expect.poll(()=>page.evaluate(()=>window.__upload?.fileName)).toBe('review.txt');expect(await page.evaluate(()=>window.__upload.content)).toBe(Buffer.from('Reviewed facility terms').toString('base64'));await page.getByRole('button',{name:'Close upload'}).click();
 await page.getByRole('button',{name:'View authorized activity'}).click();expect(await page.evaluate(()=>window.__navigation)).toBe('activity');
 await mkdir('output/facility-documents',{recursive:true});await page.screenshot({path:'output/facility-documents/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'output/facility-documents/mobile.png',fullPage:true});
 await page.goto('http://127.0.0.1:3015/test/facilityDocuments.html?mode=history');await expect(page.getByRole('button',{name:'Upload Document',exact:false})).toHaveCount(0);
 await page.goto('http://127.0.0.1:3015/test/facilityDocuments.html?mode=empty');await expect(page.getByRole('heading',{name:'No documents uploaded'})).toBeVisible();expect(errors).toEqual([]);
 console.log('Passed document filtering/selection, authorized ZIP content, individual download, upload payload, activity navigation, read-only/empty states, and mobile overflow checks.');
}finally{await browser.close();}
