// Package an explicitly scoped historical-runtime trial, never the upgrade draft.
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const archiveSha256 = sha(await readFile('vendor/openmixture-runtime-0.1.0-alpha.0.tgz'));
assert.equal(archiveSha256, '9e245578de160cee1050259ef34358c3fcd3353a21bbb1672d29701bc1ac8084', 'Trial runtime change requires a new qualification/scope decision');
const runtime = JSON.parse(await readFile('vendor/runtime-build.json', 'utf8'));
assert.equal(runtime.sha256, archiveSha256);
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
const productRevision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const clean = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim() === '';
await writeFile('dist/trial.json', JSON.stringify({ schemaVersion: 1, scope: 'Exploratory historical-runtime trial; not Alpha candidate acceptance',
  productRevision, clean, builtAt: new Date().toISOString(), base: '/Studio/', archiveSha256,
  lockSha256: sha(await readFile('package-lock.json')),
  lockGitSha256: sha(execFileSync('git', ['show', 'HEAD:package-lock.json'])), runtime, assets }, null, 2) + '\n');
