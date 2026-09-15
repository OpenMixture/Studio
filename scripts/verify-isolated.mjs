// macOS acceptance recipe: archive committed product sources, deny both working
// checkouts to child processes, remove Rust from PATH, then consume the real package.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

if (platform() !== 'darwin' || !process.argv[2]) {
  throw new Error('Usage on macOS: node scripts/verify-isolated.mjs /absolute/engine/checkout');
}
const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const producer = realpathSync(resolve(process.argv[2]));
if (!readFileSync(join(producer, 'Cargo.toml'), 'utf8').includes('mixture-core')) {
  throw new Error('The denied producer must be the OpenMixture engine checkout');
}
const git = (...args) => execFileSync('/usr/bin/git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
if (git('status', '--porcelain')) throw new Error('Commit product changes before isolated acceptance');
const revision = git('rev-parse', 'HEAD');
const work = realpathSync(mkdtempSync(join(tmpdir(), 'mixture-browser-consumer-')));
const consumer = join(work, 'consumer');
mkdirSync(consumer);
execFileSync('/usr/bin/git', ['-C', root, 'archive', '--format=tar', `--output=${join(work, 'source.tar')}`, revision]);
execFileSync('/usr/bin/tar', ['-xf', join(work, 'source.tar'), '-C', consumer]);
// Sandbox profile quoting is deliberately restricted to ordinary local paths.
if ([root, producer].some(path => /["\\\n\r]/.test(path))) throw new Error('Unsupported sandbox path');
const policy = `(version 1)(allow default)(deny file-read* (subpath "${root}") (subpath "${producer}"))`;
const env = { ...process.env, PATH: `${dirname(realpathSync(process.execPath))}:/usr/bin:/bin:/usr/sbin:/sbin` };
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const receipt = { schemaVersion: 1, productRevision: revision, clean: true, producerDenied: producer,
  productCheckoutDenied: root, sourceArchiveSha256: sha256(join(work, 'source.tar')),
  lockSha256: sha256(join(consumer, 'package-lock.json')),
  archiveSha256: sha256(join(consumer, 'vendor/openmixture-runtime-0.1.0-alpha.0.tgz')),
  fixtureSha256: sha256(join(consumer, 'public/samples/checker.mix')),
  node: process.version, startedAt: new Date().toISOString(), consumer, checks: [] };
const provenance = JSON.parse(readFileSync(join(consumer, 'vendor/runtime-build.json'), 'utf8'));
if (receipt.archiveSha256 !== provenance.sha256) throw new Error('Archive does not match its build receipt');
console.log(`Isolated consumer: ${consumer}`);
function run(label, command, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync('/usr/bin/sandbox-exec', ['-p', policy, command, ...args], {
    cwd: consumer, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  writeFileSync(join(work, `${label}.log`), (result.stdout ?? '') + (result.stderr ?? ''));
  receipt.checks.push({ label, command: [command, ...args], startedAt, endedAt: new Date().toISOString(),
    exitCode: result.status, error: result.error?.message ?? null });
  writeFileSync(join(work, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(`${label}: ${result.status}`);
  if (result.status !== 0) throw new Error(`${label} failed; inspect ${work}/${label}.log`);
}
run('isolation', process.execPath, ['--input-type=module', '-e', `
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const path of ${JSON.stringify([join(root, 'package.json'), join(producer, 'Cargo.toml')])}) {
  let denied = false;
  try { readFileSync(path); } catch (error) { denied = ['EPERM', 'EACCES'].includes(error.code); }
  if (!denied) throw new Error('Checkout access was not denied: ' + path);
}
for (const tool of ['cargo', 'rustc']) {
  if (spawnSync(tool, ['--version']).error?.code !== 'ENOENT') throw new Error(tool + ' is available');
}
console.log('Both working checkouts denied; cargo and rustc absent from PATH');
`]);
run('install', '/usr/bin/env', ['npm', 'ci']);
run('check', '/usr/bin/env', ['npm', 'run', 'check']);
run('browser', '/usr/bin/env', ['npm', 'run', 'test:browser']);
run('deployment', '/usr/bin/env', ['npm', 'run', 'test:deployment']);
if (process.argv[3]) {
  const reference = join(work, 'native-reference');
  cpSync(resolve(process.argv[3]), reference, { recursive: true, errorOnExist: true, force: false });
  receipt.nativeManifestSha256 = sha256(join(reference, 'manifest.json'));
  run('materials', '/usr/bin/env', ['npm', 'run', 'test:materials', '--', reference, join(work, 'browser-materials')]);
}

console.log(`Passed; receipt and logs: ${work}`);
