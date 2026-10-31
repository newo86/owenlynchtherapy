#!/usr/bin/env node
// The status line. Claude Code runs this after each reply and passes in live
// session details; it prints one short line such as
//   Opus 5.5 · context 42% · 84k/200k
// coloured green / yellow / red as the window fills. Read-only, costs no tokens.

import { loadConfig, readStdinJson, readState, writeState, fmtTokens, contextFromTranscript, windowSizeFor } from './lib.mjs';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

try {
  const cfg = loadConfig();
  const input = readStdinJson();
  const model = (input.model && input.model.display_name) || (input.model && input.model.id) || 'Claude';
  if (!cfg.statusLine) {
    process.stdout.write(model);
    process.exit(0);
  }

  const cw = input.context_window || {};
  const u = cw.current_usage;
  let size = cw.context_window_size || null;
  let tokens = null;
  if (u) tokens = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  let pct = typeof cw.used_percentage === 'number' ? cw.used_percentage : null;

  // Older Claude Code versions don't send context_window - fall back to the transcript.
  if (tokens === null && !('current_usage' in cw)) {
    const t = contextFromTranscript(input.transcript_path);
    if (t) tokens = t.tokens;
  }
  size = size || windowSizeFor(input.model && input.model.id, cfg, null);
  if (pct === null && tokens !== null) pct = (tokens / size) * 100;

  // Remember window size + model so the background nudges can use them.
  if (input.session_id) {
    const st = readState(input.session_id);
    st.windowSize = size;
    st.modelId = input.model && input.model.id;
    st.modelName = model;
    writeState(input.session_id, st);
  }

  let line;
  if (pct === null) {
    line = `${model} ${DIM}· context –${RESET}`;
  } else {
    const p = Math.round(pct);
    const colour = p >= cfg.freshSessionAtPercent ? RED : p >= cfg.compactAtPercent ? YELLOW : GREEN;
    const count = tokens !== null ? ` · ${fmtTokens(tokens)}/${fmtTokens(size)}` : '';
    line = `${model} · ${colour}context ${p}%${RESET}${DIM}${count}${RESET}`;
  }
  process.stdout.write(line);
} catch {
  process.stdout.write('token-saver: status unavailable');
}
