// Shared helpers for the token saver: where files live, reading the config,
// remembering what you've already been told this session, and measuring how
// full the context window is. Everything here is local - no network calls.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Claude Code keeps its files in ~/.claude unless CLAUDE_CONFIG_DIR says otherwise.
export const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
export const HOME_DIR = path.join(CLAUDE_DIR, 'token-saver');
const STATE_DIR = path.join(HOME_DIR, 'state');

export const DEFAULTS = {
  statusLine: true,
  contextNudges: true,
  compactAtPercent: 60,
  freshSessionAtPercent: 85,
  topicShiftNudges: true,
  topicShiftMinPercent: 30,
  renudgeAfterCompact: true,
  defaultContextWindow: 200000,
};

export function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(HOME_DIR, 'config.json'), 'utf8'));
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

// ---- per-session memory (so a suggestion is shown once, not every turn) ----

function statePath(sessionId) {
  const safe = String(sessionId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(STATE_DIR, `${safe}.json`);
}

export function readState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionId), 'utf8'));
  } catch {
    return { shown: {} };
  }
}

export function writeState(sessionId, state) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(statePath(sessionId), JSON.stringify(state));
  } catch {
    // Never let bookkeeping get in the way.
  }
}

// Tidy away memory files for sessions untouched for 14+ days. Cheap, occasional.
export function pruneOldState() {
  try {
    const cutoff = Date.now() - 14 * 86400000;
    for (const f of fs.readdirSync(STATE_DIR)) {
      const p = path.join(STATE_DIR, f);
      if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p);
    }
  } catch {
    // ignore
  }
}

// ---- measuring the context window ----

// Reads only the tail of a transcript (they can be many MB) and finds the most
// recent main-conversation reply. Its token usage = how full the context is.
// Returns null if unknown (e.g. new session, or just after /compact).
export function contextFromTranscript(transcriptPath) {
  if (!transcriptPath) return null;
  let text;
  try {
    const fd = fs.openSync(transcriptPath, 'r');
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, 2 * 1024 * 1024);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    fs.closeSync(fd);
    text = buf.toString('utf8');
  } catch {
    return null;
  }
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // first line may be cut in half
    }
    // A compaction after the last reply means the old numbers no longer apply.
    if (entry.type === 'system' && entry.subtype === 'compact_boundary') return null;
    if (entry.isCompactSummary) return null;
    if (entry.type !== 'assistant' || entry.isSidechain) continue;
    const u = entry.message && entry.message.usage;
    if (!u) continue;
    const tokens =
      (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    return { tokens, model: entry.message.model || null };
  }
  return null;
}

export function windowSizeFor(modelId, cfg, remembered) {
  if (remembered) return remembered;
  if (modelId && /\[1m\]/i.test(modelId)) return 1000000;
  return cfg.defaultContextWindow;
}

export function fmtTokens(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
