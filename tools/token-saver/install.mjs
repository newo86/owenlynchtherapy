#!/usr/bin/env node
// One-time setup. Copies the token saver into ~/.claude/token-saver and adds
// its status line + hooks to your user settings (~/.claude/settings.json), so
// it works in every project. Safe to re-run: it updates its own entries and
// never touches anything else. A backup of your settings is saved first.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { CLAUDE_DIR, HOME_DIR } from './lib.mjs';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
const SKILL_DIR = path.join(CLAUDE_DIR, 'skills', 'handoff');
const FILES = ['lib.mjs', 'statusline.mjs', 'nudge.mjs', 'uninstall.mjs', 'README.md'];
const MARK = 'token-saver'; // how we recognise our own entries later

const q = (p) => `"${p}"`;
const STATUS_CMD = `node ${q(path.join(HOME_DIR, 'statusline.mjs'))}`;
const HOOKS = {
  Stop: `node ${q(path.join(HOME_DIR, 'nudge.mjs'))} stop`,
  UserPromptSubmit: `node ${q(path.join(HOME_DIR, 'nudge.mjs'))} prompt`,
  SessionStart: `node ${q(path.join(HOME_DIR, 'nudge.mjs'))} session`,
};
const isOurs = (cmd) => typeof cmd === 'string' && cmd.replace(/\\/g, '/').includes(`/${MARK}/`);

async function ask(question) {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = await rl.question(`${question} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(a.trim());
}

async function main() {
  // 1. Read current settings - stop if they can't be read safely.
  let settings = {};
  if (fs.existsSync(SETTINGS)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    } catch {
      console.error(`Could not read ${SETTINGS} (is it valid JSON?). Nothing was changed.`);
      process.exit(1);
    }
  }

  // 2. Copy the program files.
  fs.mkdirSync(path.join(HOME_DIR, 'backups'), { recursive: true });
  for (const f of FILES) fs.copyFileSync(path.join(SRC, f), path.join(HOME_DIR, f));

  // Config: keep your edits, only add settings that are new in this version.
  const cfgPath = path.join(HOME_DIR, 'config.json');
  const defaults = JSON.parse(fs.readFileSync(path.join(SRC, 'config.json'), 'utf8'));
  let mine = {};
  try {
    mine = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch {
    // first install
  }
  fs.writeFileSync(cfgPath, JSON.stringify({ ...defaults, ...mine }, null, 2) + '\n');

  // 3. The /handoff command (skipped if you already have your own /handoff).
  const skillFile = path.join(SKILL_DIR, 'SKILL.md');
  if (fs.existsSync(skillFile) && !fs.readFileSync(skillFile, 'utf8').includes('(token-saver)')) {
    console.log(`! You already have a /handoff skill, so it was left alone.`);
  } else {
    fs.mkdirSync(SKILL_DIR, { recursive: true });
    fs.copyFileSync(path.join(SRC, 'skills', 'handoff', 'SKILL.md'), skillFile);
  }

  // 4. Settings: back up, then add our status line and hooks.
  if (fs.existsSync(SETTINGS)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(SETTINGS, path.join(HOME_DIR, 'backups', `settings-${stamp}.json`));
  }

  const current = settings.statusLine && settings.statusLine.command;
  if (!current || isOurs(current)) {
    settings.statusLine = { type: 'command', command: STATUS_CMD, padding: 0 };
  } else if (await ask(`You already have a status line (${current}).\nReplace it? (It will be restored if you uninstall.)`)) {
    fs.writeFileSync(path.join(HOME_DIR, 'previous-statusline.json'), JSON.stringify(settings.statusLine, null, 2));
    settings.statusLine = { type: 'command', command: STATUS_CMD, padding: 0 };
  } else {
    console.log('! Kept your existing status line. The context % display is off; the nudges still work.');
  }

  settings.hooks = settings.hooks || {};
  for (const [event, command] of Object.entries(HOOKS)) {
    const groups = (settings.hooks[event] || [])
      .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !isOurs(h.command)) }))
      .filter((g) => g.hooks.length);
    groups.push({ hooks: [{ type: 'command', command, timeout: 10 }] });
    settings.hooks[event] = groups;
  }

  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');

  console.log(`✓ Token saver installed in ${HOME_DIR}`);
  console.log(`  Settings to tweak: ${cfgPath}`);
  console.log('  Start a new Claude Code session (or restart the current one) to see it.');
}

main().catch((e) => {
  console.error('Install failed, nothing further was changed:', e.message);
  process.exit(1);
});
