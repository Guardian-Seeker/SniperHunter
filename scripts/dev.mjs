import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'web');
const angularCli = path.join(web, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');

if (!fs.existsSync(angularCli)) {
  if (!process.env.npm_execpath) throw new Error('Run npm install and npm ci --prefix web first.');
  const install = spawnSync(process.execPath, [process.env.npm_execpath, 'ci', '--prefix', web], { cwd: root, stdio: 'inherit' });
  if (install.status !== 0) throw new Error('Angular dependency installation failed.');
}

const initial = spawnSync(process.execPath, [angularCli, 'build', '--configuration', 'development'], { cwd: web, stdio: 'inherit' });
if (initial.status !== 0) throw new Error('Initial Angular build failed.');

const watcher = spawn(process.execPath, [angularCli, 'build', '--watch', '--configuration', 'development'], { cwd: web, stdio: 'inherit' });
const server = spawn(process.execPath, [path.join(root, 'server', 'index.cjs'), ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, SNIPER_HUNTER_DEV: '1' },
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  watcher.kill();
  server.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop(130));
process.on('SIGTERM', () => stop(143));
watcher.on('exit', code => stop(code || 1));
server.on('exit', code => stop(code || 1));
watcher.on('error', error => { console.error(error); stop(1); });
server.on('error', error => { console.error(error); stop(1); });
