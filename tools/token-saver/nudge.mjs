#!/usr/bin/env node
// The background nudger. Claude Code calls it (as a "hook") at three moments:
//   stop    - after Claude finishes a reply: checks how full the context is
//   prompt  - when you send a message: spots an obvious switch to a new task
//   session - when a session starts or is compacted: resets "already told you"
// It only ever shows YOU a one-line tip (via "systemMessage", which is not added
// to Claude's context, so the tips cost no tokens). It never blocks, never
// changes anything, and exits quietly on any error.

import { loadConfig, readStdinJson, readState, writeState, pruneOldState, contextFromTranscript, windowSizeFor, fmtTokens } from './lib.mjs';

const say = (msg) => process.stdout.write(JSON.stringify({ systemMessage: `💡 token-saver: ${msg}` }));

function currentContext(input, cfg, st) {
  const t = contextFromTranscript(input.transcript_path);
  if (!t) return null;
  const size = windowSizeFor(t.model, cfg, st.windowSize);
  return { tokens: t.tokens, pct: Math.round((t.tokens / size) * 100) };
}

// ---- after each reply: the 60% / 85% nudges ----
function onStop(input, cfg) {
  if (!cfg.contextNudges) return;
  const st = readState(input.session_id);
  st.shown = st.shown || {};
  const ctx = currentContext(input, cfg, st);
  if (!ctx) return;
  const amount = `${ctx.pct}% full (${fmtTokens(ctx.tokens)} tokens)`;
  if (ctx.pct >= cfg.freshSessionAtPercent && !st.shown.fresh) {
    st.shown.fresh = st.shown.compact = true;
    writeState(input.session_id, st);
    say(`context is ${amount}. A fresh start is cheaper: type /handoff for a short summary, then /clear and paste it in.`);
  } else if (ctx.pct >= cfg.compactAtPercent && !st.shown.compact && !st.shown.fresh) {
    st.shown.compact = true;
    writeState(input.session_id, st);
    say(`context is ${amount}. Running /compact would shrink it while keeping the gist.`);
  }
}

// ---- when you send a message: has the conversation moved to a new task? ----
const STOP_WORDS = new Set(
  'that this with from have what when where which there their they them then than into about would could should will just like make some your yours also been were want need please thanks thank okay sure lets more most very really dont does here only over each every other these those after before because while again still well good great'.split(' '),
);
const SHIFT_PHRASES =
  /\b(new task|different task|another task|something (else|different)|unrelated|switch(ing)? (gears|topics?|tasks?)|change of (topic|subject)|moving on to|different project|on another note|separate (question|thing|issue|task))\b/i;

function keywords(text) {
  return new Set(
    String(text)
      .toLowerCase()
      .match(/[a-z][a-z0-9_.-]{3,}/g)
      ?.filter((w) => !STOP_WORDS.has(w)) || [],
  );
}

function onPrompt(input, cfg) {
  const st = readState(input.session_id);
  st.shown = st.shown || {};
  const words = keywords(input.prompt || '');
  const history = new Set(st.recentWords || []);

  let shifted = false;
  if (SHIFT_PHRASES.test(input.prompt || '')) shifted = true;
  else if (words.size >= 6 && history.size >= 15) {
    let shared = 0;
    for (const w of words) if (history.has(w)) shared++;
    shifted = shared / words.size < 0.1;
  }

  // Keep a rolling bag of recent topic words (local file only, never sent anywhere).
  st.recentWords = [...words, ...(st.recentWords || [])].slice(0, 200);

  if (cfg.contextNudges && cfg.topicShiftNudges && shifted && !st.shown.topic && !st.shown.fresh) {
    const ctx = currentContext(input, cfg, st);
    if (ctx && ctx.pct >= cfg.topicShiftMinPercent) {
      st.shown.topic = true;
      say(
        `this looks like a new task, and the chat already holds ${ctx.pct}% (${fmtTokens(ctx.tokens)}). ` +
          `Cheaper: /handoff, then /clear and paste the summary.`,
      );
    }
  }
  writeState(input.session_id, st);
}

// ---- session start / after /compact ----
function onSession(input, cfg) {
  pruneOldState();
  if (input.source === 'compact' && cfg.renudgeAfterCompact) {
    const st = readState(input.session_id);
    st.shown = {};
    writeState(input.session_id, st);
  }
}

try {
  const cfg = loadConfig();
  const input = readStdinJson();
  const event = process.argv[2];
  if (event === 'stop') onStop(input, cfg);
  else if (event === 'prompt') onPrompt(input, cfg);
  else if (event === 'session') onSession(input, cfg);
} catch {
  // Stay silent - a helper must never get in the way of your work.
}
process.exit(0);
