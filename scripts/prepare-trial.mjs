// Deploy only the exact registry installation covered by npm Alpha acceptance.
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadRuntime } from '@openmixture/runtime';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const archiveSha256 = sha(await readFile('vendor/openmixture-runtime-0.1.0-alpha.0.tgz'));
const accepted = JSON.parse(await readFile('docs/evidence/npm-alpha/windows-install.json', 'utf8'));
assert.equal(accepted.ok, true);
assert.equal(archiveSha256, accepted.archiveSha256, 'Trial runtime change requires registry qualification');
const runtime = JSON.parse(await readFile('vendor/runtime-build.json', 'utf8'));
assert.equal(runtime.sha256, archiveSha256);
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const registry = lock.packages['node_modules/@openmixture/runtime'];
assert.equal(manifest.dependencies['@openmixture/runtime'], accepted.runtime.version);
assert.equal(lock.packages[''].dependencies['@openmixture/runtime'], accepted.runtime.version);
for (const key of ['version', 'resolved', 'integrity']) assert.equal(registry[key], accepted.runtime[key], `Unqualified registry ${key}`);
for (const [file, digest] of Object.entries(accepted.fileHashes)) {
  assert.equal(sha(await readFile(`node_modules/@openmixture/runtime/${file}`)), digest, `Installed runtime differs: ${file}`);
}
const module = await loadRuntime({ wasm: new Uint8Array(await readFile('node_modules/@openmixture/runtime/wasm/mixture_wasm_bg.wasm')) });
const actualBuild = module.getBuildInfo();
for (const key of ['runtimeVersion', 'apiSchemaVersion', 'engineVersion', 'engineRevision', 'engineDirty', 'buildId']) assert.deepEqual(actualBuild[key], runtime[key], `Runtime identity differs: ${key}`);
await assert.rejects(access('dist/tests/contract.html'), { code: 'ENOENT' });
for (const html of ['index.html', 'studio.html']) {
  assert.match(await readFile(`dist/${html}`, 'utf8'), /src="\/Studio\/assets\//);
}
const assets = {};
async function collect(directory = '') {
  for (const item of await readdir(`dist/${directory}`, { withFileTypes: true })) {
    const path = `${directory}${item.name}`;
    if (item.isDirectory()) await collect(`${path}/`);
    else if (path !== 'trial.json') assets[path] = sha(await readFile(`dist/${path}`));
  }
}
await collect();
const wasm = Object.entries(assets).filter(([path]) => path.endsWith('.wasm'));
assert.equal(wasm.length, 1);
assert.equal(wasm[0][1], accepted.fileHashes['wasm/mixture_wasm_bg.wasm'], 'Built WASM differs from accepted npm package');
const productRevision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const clean = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim() === '';
await writeFile('dist/trial.json', JSON.stringify({ schemaVersion: 2, scope: 'External trial of accepted npm Alpha; human feedback pending',
  productRevision, clean, builtAt: new Date().toISOString(), base: '/Studio/', archiveSha256,
  lockSha256: sha(await readFile('package-lock.json')),
  lockGitSha256: sha(execFileSync('git', ['show', 'HEAD:package-lock.json'])), registry, actualBuild, runtime, assets }, null, 2) + '\n');
