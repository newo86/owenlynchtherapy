#!/usr/bin/env node
// Self-test: installs into a throwaway folder (never your real ~/.claude),
// feeds the scripts realistic inputs, checks what they print, then uninstalls
// and checks your pretend settings came back exactly as they were.
// Run:  node tools/token-saver/test.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'token-saver-test-'));
const env = { ...process.env, CLAUDE_CONFIG_DIR: TMP };
const HOME = path.join(TMP, 'token-saver');
let failed = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : '  ' + detail}`);
  if (!cond) failed++;
};
const run = (script, args = [], input = '') =>
  execFileSync('node', [script, ...args], { env, input, encoding: 'utf8' });
const plain = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

// A pretend settings file with something of "yours" in it that must survive.
const original = {
  theme: 'dark',
  hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo my-own-hook' }] }] },
};
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify(original, null, 2));

// ---- install ----
run(path.join(SRC, 'install.mjs'));
const s = JSON.parse(fs.readFileSync(path.join(TMP, 'settings.json'), 'utf8'));
check('install adds the status line', s.statusLine?.command.includes('token-saver/statusline.mjs'));
check('install keeps your own Stop hook', JSON.stringify(s.hooks.Stop).includes('my-own-hook'));
check('install adds 3 hooks', ['Stop', 'UserPromptSubmit', 'SessionStart'].every((e) => JSON.stringify(s.hooks[e]).includes('nudge.mjs')));
check('install keeps your other settings', s.theme === 'dark');
check('/handoff command installed', fs.existsSync(path.join(TMP, 'skills', 'handoff', 'SKILL.md')));
run(path.join(SRC, 'install.mjs'));
const s2 = JSON.parse(fs.readFileSync(path.join(TMP, 'settings.json'), 'utf8'));
check('re-running install does not duplicate hooks', s2.hooks.Stop.length === 2 && s2.hooks.SessionStart.length === 1);

// ---- status line ----
const SL = path.join(HOME, 'statusline.mjs');
const slInput = (used, size = 200000) =>
  JSON.stringify({
    session_id: 'test-session',
    model: { id: 'claude-opus-5-5', display_name: 'Opus 5.5' },
    context_window: {
      context_window_size: size,
      used_percentage: (used / size) * 100,
      current_usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: used - 10, output_tokens: 50 },
    },
  });
let out = run(SL, [], slInput(84000));
check('status line shows % and tokens', plain(out) === 'Opus 5.5 · context 42% · 84k/200k', JSON.stringify(plain(out)));
check('status line is green under 60%', out.includes('\x1b[32m'));
check('status line is yellow at 65%', run(SL, [], slInput(130000)).includes('\x1b[33m'));
check('status line is red at 90%', run(SL, [], slInput(180000)).includes('\x1b[31m'));
check('status line copes with 1M windows', plain(run(SL, [], slInput(250000, 1000000))).includes('25% · 250k/1.0M'));
out = run(SL, [], JSON.stringify({ model: { display_name: 'Opus 5.5' }, context_window: { current_usage: null } }));
check('status line before first reply', plain(out) === 'Opus 5.5 · context –', JSON.stringify(plain(out)));
check('status line survives garbage input', run(SL, [], 'not json').length > 0);

// ---- nudges ----
const NUDGE = path.join(HOME, 'nudge.mjs');
const transcript = path.join(TMP, 'transcript.jsonl');
const writeTranscript = (tokens, extra = []) => {
  const lines = [
    { type: 'user', message: { content: 'hi' } },
    { type: 'assistant', isSidechain: true, message: { usage: { input_tokens: 999999 } } },
    { type: 'assistant', isSidechain: false, message: { model: 'claude-opus-5-5', usage: { input_tokens: 5, cache_creation_input_tokens: 1000, cache_read_input_tokens: tokens - 1005, output_tokens: 300 } } },
    ...extra,
  ];
  fs.writeFileSync(transcript, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
};
const hook = (event, extra = {}) => run(NUDGE, [event], JSON.stringify({ session_id: 'nudge-session', transcript_path: transcript, ...extra }));

writeTranscript(80000);
check('no nudge at 40%', hook('stop') === '');
writeTranscript(124000);
out = hook('stop');
check('compact nudge at 62%', out.includes('/compact') && out.includes('62%'), out);
check('nudge is a user-only systemMessage', Object.keys(JSON.parse(out)).join() === 'systemMessage');
check('compact nudge not repeated', hook('stop') === '');
writeTranscript(172000);
out = hook('stop');
check('fresh-session nudge at 86%', out.includes('/clear') && out.includes('/handoff'), out);
check('fresh-session nudge not repeated', hook('stop') === '');
hook('session', { source: 'compact' });
writeTranscript(124000);
check('after /compact, nudges can return', hook('stop').includes('/compact'));
writeTranscript(150000, [{ type: 'system', subtype: 'compact_boundary' }]);
check('no stale nudge right after compaction', hook('stop', { session_id: 'other' }) === '');
writeTranscript(20000, [{ type: 'assistant', isSidechain: true, message: { usage: { input_tokens: 190000 } } }]);
check('sub-agent usage is ignored', hook('stop', { session_id: 'third' }) === '');

// topic shift
writeTranscript(90000);
const topic = (prompt) => hook('prompt', { session_id: 'topic-session', prompt });
topic('Fix the booking form validation on the contact page so phone numbers accept spaces');
topic('The contact page form still rejects international phone numbers with plus signs');
topic('Also check the booking form error message wording on the contact page');
out = topic('Write a cron script that summarises database backups and emails invoices monthly');
check('topic-shift nudge when subject changes', out.includes('new task'), out);
check('topic-shift nudge not repeated', topic('New task: something unrelated entirely') === '');
check('short follow-ups never trigger', hook('prompt', { session_id: 'short', prompt: 'yes do it' }) === '');
writeTranscript(20000);
check('no topic nudge in a small chat', hook('prompt', { session_id: 'small', prompt: 'new task: rename files' }) === '');

// switches
const cfg = path.join(HOME, 'config.json');
fs.writeFileSync(cfg, JSON.stringify({ ...JSON.parse(fs.readFileSync(cfg, 'utf8')), contextNudges: false }));
writeTranscript(180000);
check('contextNudges:false silences nudges', hook('stop', { session_id: 'off' }) === '');
check('broken hook input stays silent', run(NUDGE, ['stop'], '{{{') === '');

// ---- uninstall ----
run(path.join(HOME, 'uninstall.mjs'), ['--yes']);
const after = JSON.parse(fs.readFileSync(path.join(TMP, 'settings.json'), 'utf8'));
check('uninstall restores settings exactly', JSON.stringify(after) === JSON.stringify(original), JSON.stringify(after));
check('uninstall removes the folder', !fs.existsSync(HOME));
check('uninstall removes /handoff', !fs.existsSync(path.join(TMP, 'skills', 'handoff')));

fs.rmSync(TMP, { recursive: true, force: true });
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
