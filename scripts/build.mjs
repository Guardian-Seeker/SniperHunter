import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { rcedit } from 'rcedit';

if (process.platform !== 'win32') throw new Error('The release executable must be built on Windows.');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'web');
const output = path.join(root, 'release');
const scratch = path.join(root, 'work');
const angularCli = path.join(web, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
if (!fs.existsSync(angularCli)) {
  if (!process.env.npm_execpath) throw new Error('Angular dependencies are missing. Run npm ci --prefix web first.');
  const install = spawnSync(process.execPath, [process.env.npm_execpath, 'ci', '--prefix', web], { cwd: root, stdio: 'inherit' });
  if (install.status !== 0) throw new Error('Angular dependency installation failed.');
}

const build = spawnSync(process.execPath, [angularCli, 'build'], { cwd: web, stdio: 'inherit' });
if (build.status !== 0) throw new Error('Angular build failed.');

const browser = path.join(web, 'dist', 'web', 'browser');
const assets = {};
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(file);
    else {
      const key = path.relative(browser, file).replaceAll('\\', '/');
      if (!key.startsWith('assets/skins/')) assets[key] = file;
    }
  }
}
collect(browser);
assets['release-config.json'] = path.join(root, 'release-config.json');
assets['tray.ps1'] = path.join(root, 'server', 'tray.ps1');
assets['replay-import.cjs'] = path.join(root, 'server', 'replay-import.cjs');
assets['map-timeline.cjs'] = path.join(root, 'server', 'map-timeline.cjs');
assets['player-cache.cjs'] = path.join(root, 'server', 'player-cache.cjs');
assets['replay-work.cjs'] = path.join(root, 'server', 'replay-work.cjs');
if (!assets['index.html']) throw new Error('Angular index.html is missing.');

fs.mkdirSync(output, { recursive: true });
// Older releases wrote tray resources beside the executable. They are embedded now.
for (const name of ['tray.ico', 'tray.ps1']) fs.rmSync(path.join(output, name), { force: true });
const skinOutput = path.join(output, 'skins');
fs.mkdirSync(skinOutput, { recursive: true });
console.log(`Release skins: ${fs.readdirSync(skinOutput).filter(name => name.toLowerCase().endsWith('.png')).length} icons (kept outside the executable).`);
fs.mkdirSync(scratch, { recursive: true });
const blob = path.join(scratch, 'sniper-hunter.blob');
const config = path.join(scratch, 'sea-config.json');
const exe = path.join(output, 'SniperHunter.exe');
fs.writeFileSync(config, JSON.stringify({
  main: path.join(root, 'server', 'index.cjs'),
  output: blob,
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
  assets,
}, null, 2));

const prepare = spawnSync(process.execPath, ['--experimental-sea-config', config], { stdio: 'inherit' });
if (prepare.status !== 0) throw new Error('Node executable preparation failed.');
fs.copyFileSync(process.execPath, exe);
await rcedit(exe, {
  'requested-execution-level': 'asInvoker',
  icon: path.join(web, 'public', 'assets', 'icon.ico'),
  'version-string': { ProductName: 'Sniper Hunter', FileDescription: 'Sniper Hunter' },
});
const postject = path.join(root, 'node_modules', 'postject', 'dist', 'cli.js');
const inject = spawnSync(process.execPath, [postject, exe, 'NODE_SEA_BLOB', blob,
  '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'], { stdio: 'inherit' });
if (inject.status !== 0) throw new Error('Node executable injection failed.');
// A GUI subsystem keeps the packaged server running without opening a terminal.
// The Windows PE optional header stores the subsystem at offset 68.
const handle = fs.openSync(exe, 'r+');
try {
  const header = Buffer.alloc(4);
  fs.readSync(handle, header, 0, 4, 0x3c);
  const peOffset = header.readUInt32LE(0);
  fs.readSync(handle, header, 0, 4, peOffset);
  if (header.toString('ascii') !== 'PE\0\0') throw new Error('Built executable has no PE header.');
  const subsystemOffset = peOffset + 24 + 68;
  const subsystem = Buffer.alloc(2);
  fs.readSync(handle, subsystem, 0, 2, subsystemOffset);
  if (subsystem.readUInt16LE(0) !== 3) throw new Error('Built executable is not a Windows console program.');
  subsystem.writeUInt16LE(2);
  fs.writeSync(handle, subsystem, 0, 2, subsystemOffset);
} finally { fs.closeSync(handle); }
console.log(`Built ${exe}`);
