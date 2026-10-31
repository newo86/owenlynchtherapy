#!/usr/bin/env node
// Removes the token saver completely: its status line and hooks from your
// settings (restoring any status line you had before), the /handoff command,
// and the ~/.claude/token-saver folder. It shows you the list and asks first.
// Your settings are backed up to settings.json.bak before being edited.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { CLAUDE_DIR, HOME_DIR } from './lib.mjs';

const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
const SKILL_DIR = path.join(CLAUDE_DIR, 'skills', 'handoff');
const isOurs = (cmd) => typeof cmd === 'string' && cmd.replace(/\\/g, '/').includes('/token-saver/');
const KEEP = ['archive']; // sessions you chose to archive are yours - never removed here

async function main() {
  let settings = null;
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  } catch {
    // no settings file, or unreadable - leave it alone
  }

  const plan = [];
  if (settings) {
    if (settings.statusLine && isOurs(settings.statusLine.command)) plan.push(`status line entry in ${SETTINGS}`);
    for (const [ev, groups] of Object.entries(settings.hooks || {}))
      if (groups.some((g) => (g.hooks || []).some((h) => isOurs(h.command)))) plan.push(`${ev} hook in ${SETTINGS}`);
  }
  const skillFile = path.join(SKILL_DIR, 'SKILL.md');
  const ownSkill = fs.existsSync(skillFile) && fs.readFileSync(skillFile, 'utf8').includes('(token-saver)');
  if (ownSkill) plan.push(`${SKILL_DIR} (the /handoff command)`);
  if (fs.existsSync(HOME_DIR)) plan.push(`${HOME_DIR} (program files, config, notes)`);

  if (!plan.length) return console.log('Nothing to remove - the token saver is not installed.');
  console.log('This will remove:\n' + plan.map((p) => `  - ${p}`).join('\n'));

  let ok = process.argv.includes('--yes');
  if (!ok && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    ok = /^y(es)?$/i.test((await rl.question('Go ahead? [y/N] ')).trim());
    rl.close();
  }
  if (!ok) return console.log('Cancelled. Nothing was changed.');

  if (settings) {
    fs.copyFileSync(SETTINGS, SETTINGS + '.bak');
    if (settings.statusLine && isOurs(settings.statusLine.command)) {
      const prev = path.join(HOME_DIR, 'previous-statusline.json');
      if (fs.existsSync(prev)) settings.statusLine = JSON.parse(fs.readFileSync(prev, 'utf8'));
      else delete settings.statusLine;
    }
    for (const [ev, groups] of Object.entries(settings.hooks || {})) {
      const left = groups
        .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !isOurs(h.command)) }))
        .filter((g) => g.hooks.length);
      if (left.length) settings.hooks[ev] = left;
      else delete settings.hooks[ev];
    }
    if (settings.hooks && !Object.keys(settings.hooks).length) delete settings.hooks;
    fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');
  }

  if (ownSkill) fs.rmSync(SKILL_DIR, { recursive: true, force: true });

  if (fs.existsSync(HOME_DIR)) {
    for (const f of fs.readdirSync(HOME_DIR)) {
      if (!KEEP.includes(f)) fs.rmSync(path.join(HOME_DIR, f), { recursive: true, force: true });
    }
    const left = fs.readdirSync(HOME_DIR);
    if (left.length) console.log(`Kept your archived sessions in ${path.join(HOME_DIR, 'archive')} - delete that folder yourself if you no longer want them.`);
    else fs.rmdirSync(HOME_DIR);
  }

  console.log(`✓ Token saver removed. Previous settings saved as ${SETTINGS}.bak`);
  console.log('  Restart Claude Code sessions for the change to take effect.');
}

main().catch((e) => {
  console.error('Uninstall stopped:', e.message);
  process.exit(1);
});
