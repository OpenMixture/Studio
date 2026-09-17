// Independent Player consumes exact Studio-saved bytes from detached native data.
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { platform, release, arch } from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { serveStatic } from './static-server.mjs';
const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('Usage: node scripts/verify-studio.mjs <native-reference> <new-output>');
const root=resolve(input), out=resolve(output), raw=await readFile(join(root,'manifest.json')), manifest=JSON.parse(raw);
assert.equal(manifest.schemaVersion,1); assert.equal(manifest.cases.length,7);
await mkdir(out);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(manifest.archiveSha256,sha(await readFile('vendor/openmixture-runtime-0.1.0-alpha.0.tgz')));
const expectedBuild=JSON.parse(await readFile('vendor/runtime-build.json','utf8'));
assert.equal(manifest.archiveSha256,expectedBuild.sha256);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
assert.equal(git('status','--porcelain'),'','Commit before recording Player provenance');
const args=['--enable-unsafe-webgpu','--ignore-gpu-blocklist',...JSON.parse(process.env.MIXTURE_BROWSER_ARGS??'[]')];
const server=await serveStatic(); let browser;
const base = `http://127.0.0.1:${server.address().port}/player/`;
try {
 browser=await chromium.launch({channel:'chromium',args});
 const page=await browser.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const contract=await browser.newPage();await contract.goto(`${base}tests/contract.html`);
 const build=await contract.evaluate(async()=>{window.runtime=await window.mixtureContract.loadRuntime();return window.runtime.getBuildInfo();});
 assert.equal(build.engineRevision,manifest.runtimeRevision);
 for(const key of ['runtimeVersion','apiSchemaVersion','engineVersion','engineRevision','engineDirty','buildId'])assert.deepEqual(build[key],expectedBuild[key],`Wrong runtime ${key}`);
 const receipt={schemaVersion:1,manifestSha256:sha(raw),archiveSha256:manifest.archiveSha256,lockSha256:sha(await readFile('package-lock.json')),productRevision:git('rev-parse','HEAD'),authoredProductRevision:manifest.productRevision,clean:true,browser:browser.version(),os:platform(),osRelease:release(),arch:arch(),node:process.version,args,build,cases:[]};
 await page.goto(base);await expect(page.locator('#status')).toContainText('Checker loaded');
 await page.locator('#width').fill('1024');await page.locator('#height').fill('1024');
 await page.locator('#initialize').click();await expect(page.locator('#status')).toContainText('WebGPU ready');
 receipt.context=JSON.parse(await page.locator('#details').textContent()).context;
 for(const item of manifest.cases){
  assert.match(item.material,/^[a-z-]+$/);assert.match(item.id,/^[a-z-]+$/);
  const source=Buffer.from(item.sourceBase64,'base64');assert.equal(sha(source),item.sourceSha256);
  const folder=join(out,item.material,item.id);await mkdir(folder,{recursive:true});
  const plan=await contract.evaluate(async item=>window.runtime.inspect(Uint8Array.from(atob(item.sourceBase64),c=>c.charCodeAt(0)),{size:[1024,1024],channels:['baseColor','normal','roughness','height']}).plan,item);
  assert.equal(plan.hash,item.plan.hash);
  await page.locator('#file').setInputFiles({name:`${item.material}-${item.id}.mix`,mimeType:'application/json',buffer:source});
  await expect(page.locator('#source-name')).toContainText(`${item.material}-${item.id}.mix`);
  await expect(page.locator('#status')).toHaveText('Render complete.');
  assert.equal(await page.locator('#source-text').textContent(),source.toString());
  const channels=[];
  for(const channel of ['baseColor','normal','roughness','height']){
   await page.locator('#channels').selectOption(channel);
   await expect(page.locator('#status')).toHaveText('Render complete.');
   const detail=JSON.parse(await page.locator('#details').textContent());
   assert.equal(detail.plan.hash,item.channelPlans[channel].hash);
   const pending=page.waitForEvent('download');await page.locator('#download').click();const bytes=await readFile(await (await pending).path());
   await writeFile(join(folder,`${channel}.png`),bytes);
   channels.push({channel,pngSha256:sha(bytes),plan:detail.plan,report:detail.report});
  }
  const result=JSON.parse(JSON.stringify({sourceSha256:sha(source),plan,channels},(_,v)=>typeof v==='bigint'?v.toString():v));
  await writeFile(join(folder,'result.json'),JSON.stringify(result,null,2));
  await page.screenshot({path:join(folder,'player.png'),fullPage:true});
  receipt.cases.push({material:item.material,id:item.id,sourceSha256:sha(source),planHash:plan.hash});
  console.log(item.material,item.id,'Player PNGs saved');
 }
 await page.locator('#dispose').click();await expect(page.locator('#status')).toContainText('GPU disposed');
 assert.deepEqual(errors,[]);receipt.completedAt=new Date().toISOString();
 await writeFile(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
