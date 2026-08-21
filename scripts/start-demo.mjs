/* global process */

import { spawn } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const demoEnvironment = {
  ...process.env,
  CPF_DEMO_MODE: 'true',
  CPF_API_BASE_URL: 'http://127.0.0.1:3000',
  CPF_ALLOWED_ORIGIN: 'http://127.0.0.1:4300',
  HOST: '127.0.0.1',
  PORT: '3000',
};

const services = [
  spawn(
    process.execPath,
    [
      path.join(root, 'apps/server/node_modules/tsx/dist/cli.mjs'),
      path.join(root, 'apps/server/src/index.ts'),
    ],
    { cwd: root, env: demoEnvironment, stdio: 'inherit' },
  ),
  spawn(
    process.execPath,
    [
      path.join(root, 'apps/web/node_modules/next/dist/bin/next'),
      'start',
      path.join(root, 'apps/web'),
      '-p',
      '4300',
    ],
    { cwd: root, env: demoEnvironment, stdio: 'inherit' },
  ),
];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const service of services) {
    if (service.exitCode === null) service.kill('SIGTERM');
  }
  process.exitCode = exitCode;
}

for (const service of services) {
  service.on('exit', (code, signal) => {
    if (stopping) return;
    const failed = code !== 0 && signal === null;
    if (failed) process.stderr.write(`CPF demo service exited with code ${String(code)}.\n`);
    stop(failed ? 1 : 0);
  });
  service.on('error', (error) => {
    process.stderr.write(`CPF demo service failed to start: ${error.message}\n`);
    stop(1);
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
