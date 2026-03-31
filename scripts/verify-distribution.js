/**
 * Verifies the published-style artifact: build → npm pack → clean consumer install from .tgz.
 * Run from repo root: npm run verify-dist
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgDir = path.join(root, 'vidnavigator');
const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
const version = pkg.version;
const tarballName = `vidnavigator-${version}.tgz`;
const tarballAbs = path.join(pkgDir, tarballName);
const verifyDir = path.join(root, 'dist-verify');

console.log('--- 1. Build (tsc) ---');
execSync('npm run build', { cwd: pkgDir, stdio: 'inherit' });

console.log('\n--- 2. npm pack ---');
execSync('npm pack', { cwd: pkgDir, stdio: 'inherit' });

if (!fs.existsSync(tarballAbs)) {
  console.error('Tarball missing:', tarballAbs);
  process.exit(1);
}

const fileRef = path.relative(verifyDir, tarballAbs).split(path.sep).join('/');
fs.mkdirSync(verifyDir, { recursive: true });

fs.writeFileSync(
  path.join(verifyDir, 'package.json'),
  JSON.stringify(
    {
      name: 'vidnavigator-dist-verify',
      private: true,
      dependencies: {
        vidnavigator: `file:${fileRef}`,
        dotenv: '^17.2.0',
      },
    },
    null,
    2
  )
);

const smokePath = path.join(verifyDir, 'verify-smoke.js');
fs.writeFileSync(
  smokePath,
  `
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const vn = require('vidnavigator');
const installed = require('./node_modules/vidnavigator/package.json');

console.log('');
console.log('--- 3. Consumer smoke test ---');
console.log('Installed package version:', installed.version);
console.log('SDK_VERSION export:', vn.SDK_VERSION);

const checks = [
  ['VidNavigatorClient', typeof vn.VidNavigatorClient === 'function'],
  ['getYouTubeTranscript', typeof vn.VidNavigatorClient.prototype.getYouTubeTranscript === 'function'],
  ['extractVideoData', typeof vn.VidNavigatorClient.prototype.extractVideoData === 'function'],
  ['extractFileData', typeof vn.VidNavigatorClient.prototype.extractFileData === 'function'],
  ['getNamespaces', typeof vn.VidNavigatorClient.prototype.getNamespaces === 'function'],
  ['uploadFile', typeof vn.VidNavigatorClient.prototype.uploadFile === 'function'],
];
let allOk = vn.SDK_VERSION === installed.version;
for (const [label, pass] of checks) {
  console.log(pass ? '  OK' : '  FAIL', label);
  if (!pass) allOk = false;
}

const key = process.env.VIDNAVIGATOR_API_KEY;
if (key) {
  const client = new vn.VidNavigatorClient({ apiKey: key });
  client
    .healthCheck()
    .then((h) => {
      console.log('  OK healthCheck', h.status, h.version);
      process.exit(allOk ? 0 : 1);
    })
    .catch((e) => {
      console.error('  FAIL healthCheck', e.message);
      process.exit(1);
    });
} else {
  console.log('  (No VIDNAVIGATOR_API_KEY in parent .env — skipped live healthCheck)');
  process.exit(allOk ? 0 : 1);
}
`.trimStart()
);

console.log('\n--- 3. npm install (consumer, from tarball) ---');
try {
  fs.rmSync(path.join(verifyDir, 'node_modules'), { recursive: true, force: true });
  fs.rmSync(path.join(verifyDir, 'package-lock.json'), { force: true });
} catch (_) {
  /* ignore */
}
execSync('npm install', { cwd: verifyDir, stdio: 'inherit' });

console.log('\n--- 4. Smoke (consumer cwd, tarball install) ---');
execSync('node verify-smoke.js', { cwd: verifyDir, stdio: 'inherit' });

const nodeModulesConsumer = path.join(verifyDir, 'node_modules');
const testEnv = {
  ...process.env,
  VIDNAVIGATOR_TEST_PACK: '1',
  NODE_PATH: [nodeModulesConsumer, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
};

console.log('\n--- 5. Unit tests against packed install ---');
console.log('    NODE_PATH includes:', nodeModulesConsumer);
execSync('node tests/unit.test.js', { cwd: root, env: testEnv, stdio: 'inherit' });

console.log('\n--- 6. Integration tests against packed install ---');
execSync('node tests/integration.test.js', { cwd: root, env: testEnv, stdio: 'inherit' });

console.log('\nDistribution verify completed successfully.');
console.log('Tarball:', tarballAbs);
console.log('Size:', fs.statSync(tarballAbs).size, 'bytes');
