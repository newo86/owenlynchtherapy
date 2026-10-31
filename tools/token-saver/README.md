# Token saver for Claude Code

A quiet helper that shows how full Claude's memory ("context window") is and
gives you one-line tips to save tokens. It runs on your own machine only, never
sends data anywhere, never changes anything by itself, and never blocks you.
Its tips are shown to you but are **not** added to Claude's context, so the
helper itself costs no tokens.

## What you get (step 1 of 4)

- **Status line** at the bottom of Claude Code, e.g. `Opus 5.5 · context 42% · 84k/200k`.
  Green under 60%, yellow from 60%, red from 85%.
- **A nudge at ~60%:** "context is 62% full… Running /compact would shrink it."
- **A nudge at ~85%:** suggests a fresh session: type `/handoff` (Claude writes a
  2–3 line summary), then `/clear`, then paste the summary in.
- **New-task nudge:** if you clearly switch to a different task while the chat is
  already 30%+ full, it suggests the same fresh start.
- Each tip is shown **once per session** (after a `/compact` the counter resets,
  since the context has been emptied).

Coming next: model suggestions, a history report, and a CLAUDE.md check.

## Install

You need Node.js (you already have it if you run `npm`). From this repo folder:

```bash
node tools/token-saver/install.mjs
```

Then start a new Claude Code session. If you already have your own status line
it asks before replacing it (and puts yours back if you uninstall).

## The files

| File | What it does |
|---|---|
| `install.mjs` | One-time setup: copies the helper to `~/.claude/token-saver/` and adds it to your user settings so it works in every project. Backs up your settings first. |
| `uninstall.mjs` | Removes everything the installer added, after showing you the list and asking. |
| `config.json` | Your switches and thresholds (installed copy: `~/.claude/token-saver/config.json`). |
| `statusline.mjs` | Prints the status line. Claude Code runs it after each reply. |
| `nudge.mjs` | The background "hook": checks the context after each reply and when you send a message, and shows a one-line tip when one applies. |
| `lib.mjs` | Shared bits used by the others (reading config, measuring context). |
| `skills/handoff/SKILL.md` | The `/handoff` command: asks Claude for a 2–3 line summary to paste after `/clear`. |
| `test.mjs` | Self-test in a throwaway folder: `node tools/token-saver/test.mjs`. |

## Settings (`~/.claude/token-saver/config.json`)

| Setting | Default | Meaning |
|---|---|---|
| `statusLine` | `true` | Show the context % in the status line. |
| `contextNudges` | `true` | Master switch for all context tips. |
| `compactAtPercent` | `60` | When to suggest `/compact`. |
| `freshSessionAtPercent` | `85` | When to suggest `/handoff` + `/clear`. |
| `topicShiftNudges` | `true` | Tip when you seem to switch to a new task. |
| `topicShiftMinPercent` | `30` | Only give the new-task tip if the chat is at least this full. |
| `renudgeAfterCompact` | `true` | Allow the tips again after you `/compact`. |
| `defaultContextWindow` | `200000` | Used only if Claude Code doesn't report the window size. |

Edits apply straight away; no restart needed.

## Turn off / uninstall

- Turn a part off: set its switch to `false` in the config file above.
- Remove everything:

```bash
node ~/.claude/token-saver/uninstall.mjs
```

## Honest limits

- The percentage comes from Claude Code itself; it reflects the last reply, so
  it can lag one message behind (`/context` gives a live breakdown).
- "New task" detection is a simple word-overlap guess. It will sometimes miss,
  and occasionally fire when you haven't really switched. It shows at most
  once per session.
- Nothing can switch models or run `/compact` for you. Only you can, and that's
  deliberate.
