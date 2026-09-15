import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { platform, release, arch } from 'node:os';
import assert from 'node:assert/strict';
import { serveStatic } from './static-server.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node scripts/verify-materials.mjs <native-reference-bundle> <new-output-directory>');
const root=resolve(input), out=resolve(output), manifestBytes=await readFile(join(root,'manifest.json'));
const manifest=JSON.parse(manifestBytes);
assert.equal(manifest.schemaVersion,1);assert.equal(manifest.cases.length,11);
await mkdir(out); // Fresh output: never accidentally accept stale files.
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const args=['--enable-unsafe-webgpu','--ignore-gpu-blocklist',...JSON.parse(process.env.MIXTURE_BROWSER_ARGS??'[]')];
const server=await serveStatic();let browser;
try {
 browser=await chromium.launch({channel:'chromium',args});
 const page=await browser.newPage(),failures=[];page.on('pageerror',e=>{failures.push(e.message);console.error('Browser error:',e.message);});
 page.on('console',message=>{if(message.type()==='error')console.error('Browser console:',message.text());});
 const responses=[];page.on('response',response=>responses.push({url:response.url(),status:response.status(),type:response.headers()['content-type']}));
 await page.goto('http://127.0.0.1:4173/player/tests/contract.html');
 const contextText=await page.evaluate(async()=>{
  window.runtime=await window.mixtureContract.loadRuntime();window.gpu=await window.runtime.createGpu();
  return JSON.stringify({build:window.runtime.getBuildInfo(),context:window.gpu.context},(_,v)=>typeof v==='bigint'?v.toString():v);
 });
 assert.equal(typeof contextText,'string',`Browser initialization returned no context: ${failures.join('; ')}`);
 const context=JSON.parse(contextText);
 assert.equal(context.build.engineRevision,manifest.runtimeRevision);
 const receipt={schemaVersion:1,archiveSha256:sha(await readFile('vendor/openmixture-runtime-0.1.0-alpha.0.tgz')),lockSha256:sha(await readFile('package-lock.json')),runnerImage:process.env.ImageVersion??null,startedAt:new Date().toISOString(),manifestSha256:sha(manifestBytes),browser:browser.version(),os:platform(),osRelease:release(),arch:arch(),node:process.version,args,...context,cases:[]};
 for(const item of manifest.cases){
  assert.match(item.material,/^[a-z-]+$/);assert.match(item.id,/^[a-z-]+$/);
  assert.equal(sha(Buffer.from(item.sourceBase64,'base64')),item.sourceSha256);
  const result=await page.evaluate(async item=>{
   const source=Uint8Array.from(atob(item.sourceBase64),c=>c.charCodeAt(0));
   const result=await window.gpu.render(source,{size:[1024,1024],channels:['baseColor','normal','roughness','height'],overrides:item.overrides});
   const channels=[];
   for(const c of result.channels){
    const png=new Uint8Array(await (await window.mixtureContract.encodePng(c)).arrayBuffer());
    let binary='';for(let i=0;i<png.length;i+=8192)binary+=String.fromCharCode(...png.subarray(i,i+8192));
    channels.push({channel:c.channel,encoding:c.encoding,base64:btoa(binary)});
   }
   return JSON.parse(JSON.stringify({plan:result.plan,report:result.report,channels},(_,v)=>typeof v==='bigint'?v.toString():v));
  },item);
  assert.equal(result.plan.hash,item.plan.hash);
  const folder=join(out,item.material,item.id);await mkdir(folder,{recursive:true});
  for(const channel of result.channels){assert.match(channel.channel,/^[a-zA-Z]+$/);await writeFile(join(folder,`${channel.channel}.png`),Buffer.from(channel.base64,'base64'));delete channel.base64;}
  await writeFile(join(folder,'result.json'),JSON.stringify(result,null,2));
  receipt.cases.push({material:item.material,id:item.id,planHash:result.plan.hash});
  console.log(item.material,item.id,'rendered');
 }
 await page.evaluate(()=>window.gpu.destroy());
 receipt.stress=await page.evaluate(async cases=>{
  const rows=[];
  for(let cycle=0;cycle<4;cycle++){
   const runtime=await window.mixtureContract.loadRuntime();const gpu=await runtime.createGpu();
   let retained, initialHash;
   try {
    for(const item of cases){
     const source=Uint8Array.from(atob(item.sourceBase64),c=>c.charCodeAt(0));
     const result=await gpu.render(source,{size:[1024,1024],channels:['baseColor','normal','roughness','height'],overrides:item.overrides});
     if(result.report.allocations.liveBytes!==0n || result.report.pipelineCache.entries>9n)throw new Error('Material stress retained state exceeded bounds');
     if(!retained){retained=result.channels[0].pixels;initialHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',retained))).join(',');}
     rows.push({cycle,material:item.material,planHash:result.plan.hash,peakBytes:String(result.report.allocations.peakBytes),liveBytes:String(result.report.allocations.liveBytes),pipelines:String(result.report.pipelineCache.entries)});
    }
   } finally {await gpu.destroy();}
   const finalHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',retained))).join(',');
   if(finalHash!==initialHash)throw new Error('Retained pixels changed after later renders or destruction');
  }
  return {cycles:4,renders:rows.length,size:[1024,1024],retainedChannelsPerCycle:1,retainedBytes:4194304,physicalGpuMemoryMeasured:false,rows};
 },manifest.cases.filter(item=>item.id==='default'));

 assert.deepEqual(failures,[]);
 assert.ok(responses.some(r=>r.url.endsWith('.wasm')&&r.status===200&&r.type==='application/wasm'));
 receipt.responses=responses;receipt.completedAt=new Date().toISOString();
 await writeFile(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
