import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited with code ${child.exitCode}`);
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not become healthy in time');
}

export async function startTestServer(port) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mediq-test-'));
  copyDir(path.join(serverRoot, 'src'), path.join(tmpRoot, 'src'));
  fs.copyFileSync(path.join(serverRoot, 'package.json'), path.join(tmpRoot, 'package.json'));
  fs.symlinkSync(path.join(serverRoot, 'node_modules'), path.join(tmpRoot, 'node_modules'), 'dir');
  const dataDir = path.join(tmpRoot, 'data');
  fs.mkdirSync(dataDir);

  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: tmpRoot,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      DATA_DIR: dataDir,
      DB_PATH: path.join(dataDir, 'mediq.sqlite')
    },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForHealth(baseUrl, child);
  } catch (err) {
    child.kill('SIGKILL');
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    throw new Error(`${err.message}\n${stderr}`);
  }

  return {
    baseUrl,
    stop: async () => {
      if (child.exitCode === null) {
        child.kill('SIGTERM');
        await new Promise((resolve) => {
          const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 3000);
          child.once('exit', () => { clearTimeout(timer); resolve(); });
        });
      }
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  };
}
