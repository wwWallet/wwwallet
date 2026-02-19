#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const walletCommonPath = path.join(root, 'lib', 'wallet-common');
const mode = process.argv[2];
const allowedModes = new Set(['local', 'default']);

if (!allowedModes.has(mode)) {
  console.error('Usage: node scripts/set-wallet-common-source.js <local|default>');
  process.exit(1);
}

if (!fs.existsSync(walletCommonPath)) {
  console.error(`wallet-common not found at ${walletCommonPath}`);
  process.exit(1);
}

function run(command, args, cwd) {
  childProcess.execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function runOptional(command, args, cwd) {
  try {
    run(command, args, cwd);
  } catch (error) {
    console.warn(`Skipping: ${command} ${args.join(' ')} in ${cwd}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findConsumers() {
  const ignore = new Set(['.git', 'lib', 'node_modules', 'scripts']);
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !ignore.has(entry.name) && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((dirName) => fs.existsSync(path.join(root, dirName, 'package.json')))
    .filter((dirName) => {
      const pkgPath = path.join(root, dirName, 'package.json');
      const pkg = readJson(pkgPath);
      const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
      const spec = deps['wallet-common'];
      if (!spec) {
        return false;
      }
      return !spec.startsWith('.') && !spec.startsWith('file:');
    });
}

const consumers = findConsumers();
if (consumers.length === 0) {
  console.log('No git-based wallet-common consumers found.');
  process.exit(0);
}

function isLinked(pkgName, cwd) {
  const pkgPath = path.join(cwd, 'node_modules', pkgName);

  try {
    return fs.lstatSync(pkgPath).isSymbolicLink();
  } catch {
    return false; // not installed or not linked
  }
}

if (mode === 'local') {
  run('yarn', ['install', '--frozen-lockfile'], walletCommonPath);
  run('yarn', ['build'], walletCommonPath);
  run('yarn', ['link'], walletCommonPath);
  for (const dir of consumers) {
    console.log(`Linked wallet-common path: ${path.join(root, dir)}`);
    run('yarn', ['link', 'wallet-common'], path.join(root, dir));
  }
  console.log(`Linked wallet-common into: ${consumers.join(', ')}`);
} else {
  for (const dir of consumers) {
    if (isLinked('wallet-common', path.join(root, dir))) {
      console.log(`Unlinking wallet-common for ${dir}`);
      runOptional('yarn', ['unlink', 'wallet-common'], path.join(root, dir));
    } else {
      console.log(`Skipping unlink wallet-common from ${dir} - not linked`);
    }
  }
  if (isLinked('wallet-common', walletCommonPath)) {
    runOptional('yarn', ['unlink'], walletCommonPath);
  } else {
      console.log(`Skipping unlink wallet-common from lib/wallet-common - not linked`);
  }
  for (const dir of consumers) {
    run('yarn', ['install', '--frozen-lockfile'], path.join(root, dir));
  }
  console.log(`Restored wallet-common from package.json in: ${consumers.join(', ')}`);
}
