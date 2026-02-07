#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.warn('No commit message file provided');
  process.exit(1);
}

let msg = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const replacements = {
  feat: '✨ feat',
  fix: '🐛 fix',
  docs: '📚 docs',
  style: '💎 style',
  refactor: '📦 refactor',
  perf: '⚡ perf',
  test: '🚨 test',
  build: '🛠 build',
  ci: '⚙️ ci',
  chore: '♻️ chore',
  revert: '🗑 revert',
};

for (const [type, emoji] of Object.entries(replacements)) {
  const re = new RegExp(String.raw`^${type}\b`, 'm');
  msg = msg.replace(re, emoji);
}

writeFileSync(file, msg);
