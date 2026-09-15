import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { serveStatic } from './static-server.mjs';
import { decodePng } from '../tests/helpers/png.ts';
const args=['--enable-unsafe-webgpu','--ignore-gpu-blocklist',...JSON.parse(process.env.MIXTURE_BROWSER_ARGS??'[]')];
await mkdir('test-results/deployment',{recursive:true});
const server=await serveStatic();let browser;
try {
 browser=await chromium.launch({channel:'chromium',args});
 const page=await browser.newPage(),assets=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>assets.push({url:r.url(),status:r.status(),type:r.headers()['content-type']}));
 await page.goto('http://127.0.0.1:4173/player/');
 await expect(page.locator('#status')).toHaveText('Checker loaded. Initialize WebGPU to render.');
 await page.locator('#width').fill('65');await page.locator('#height').fill('3');
 await page.locator('#initialize').click();
 await expect(page.locator('#status')).toHaveText('WebGPU ready. Render when ready.');
 await page.locator('#render').click();await expect(page.locator('#status')).toHaveText('Render complete.');
 const downloaded=page.waitForEvent('download');await page.locator('#download').click();
 const file=await downloaded,bytes=await readFile(await file.path()),png=decodePng(bytes);
 expect([png.width,png.height,png.gamma,png.srgb]).toEqual([65,3,45455,0]);
 expect(new Set(png.pixels)).toEqual(new Set([0,255]));
 expect(assets.some(a=>a.url.endsWith('.wasm')&&a.status===200&&a.type==='application/wasm')).toBe(true);
 const harness=await page.request.get('http://127.0.0.1:4173/player/tests/contract.html');expect(harness.status()).toBe(404);
 expect(errors).toEqual([]);
 await page.locator('#dispose').click();await expect(page.locator('#status')).toContainText('GPU disposed.');
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 await writeFile('test-results/deployment/checker.png',bytes);
 await page.screenshot({path:'test-results/deployment/player.png',fullPage:true});
 await writeFile('test-results/deployment/receipt.json',JSON.stringify({browser:browser.version(),args,assets,
  archiveSha256:sha(await readFile('vendor/openmixture-runtime-0.1.0-alpha.0.tgz')),htmlSha256:sha(await readFile('dist/index.html')),pngSha256:sha(bytes),testHarnessAbsent:true,result:'passed'},null,2));
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
