---
name: writing-skills
description: House rules for creating, editing, reviewing, pruning or auditing Claude skills (SKILL.md files and their reference files). Use whenever a skill is created or changed in any way — new skill, trigger/description fix, adding or removing a rule, splitting or merging skills, or mapping an external system (Notion, a CRM, a database) into a skill.
---

# Writing and maintaining skills

A skill exists to give a capable model what it can't work out for itself on a
recurring task: the goal, the context it lacks, and what done looks like.
Everything else is noise that competes with the actual task for attention, and
every repeated fact is a future contradiction. Write the smallest skill that
lets a fresh session do the task well.

## Done looks like

- The description triggers the skill on the requests it should, and not others.
- Every fact in the skill lives only there, or is a link to its one home.
- The skill states the goal, the context, and what done looks like; any rigid
  rule carries its reason.
- The skill's test prompts (`evals.md` beside it) pass in a fresh session.
- The change is shipped like any other repo change (see the Ship flow in
  CLAUDE.md).

Stop and ask the user only when where a piece of information should live is
genuinely unclear, or before removing a guardrail that protects an
irreversible or client-facing action. Everything else is a judgment call to
make and mention.

## 1. Every piece of information has one home

Before writing anything, search the skills, CLAUDE.md and docs/ for it. If it
already exists, link to it; if it exists in several places, consolidate it
into one and replace the others with links.

| Kind of information | Its home |
|---|---|
| Facts about the system: config values, fees, schema, counts | The code or docs/ — link, never copy (copied values go stale) |
| What every task needs before any skill has triggered | CLAUDE.md, kept short |
| How to carry out a recurring task | A skill |
| How a complex external system is organised | Its own system skill (section 3) |

Give information its own skill when it has its own trigger (someone would ask
for it on its own) or when two or more skills need it; otherwise it belongs as
a section of the skill that uses it. Link to another skill by name ("see the
`db-migrate` skill") or relative path.

The `description` is the one allowed overlap: it is the only part of a skill
the model sees before choosing it, so it has to summarise the skill on its own.

## 2. Write for an intelligent reader

Lead with the goal, the context, and what done looks like, then trust the
model to find the route. Give numbered steps only where order genuinely
matters. Match how prescriptive you are to how fragile the task is: exact
commands for a production migration, a sentence of intent for a code review.

Add a rigid rule only when there is evidence it is needed (an observed
failure), or when the action is irreversible or reaches outside the repo —
client email, the production database, merging to main. Follow every rule
with its reason. *Why: a rule with a reason generalises to cases the author
didn't foresee; a bare rule gets followed too literally or not at all.* Keep
the evidence to a clause and link to where the incident is written up.

- **Define the stops, both ways.** Say when the task is finished and name the
  points where the model should stop for the user (nothing can move without
  them). If a skill is prone to stopping early — ending on a summary that
  announces the next step instead of taking it — name that pattern.
- **Name specifics.** "Avoid generic design" swaps one default for another;
  naming the actual pattern to avoid works. Prefer a short example of good
  output over a list of don'ts.
- **State the scope.** Current models tend to widen a task; say what is in
  and out of it.
- **Leave out** instructions to think carefully, think step by step,
  double-check or verify your work, and emphasis in capitals (ALWAYS, NEVER,
  MUST). *Why: current models decide how much to reason on their own, verify
  their work unprompted — extra instructions cause wasted re-checking — and
  over-apply shouted rules. Calm wording plus a reason works better.*

## 3. Map complex external systems into their own skill

When tasks touch a system with many objects, relations and conventions that
can't be understood from one screen — a Notion workspace, a CRM, a database
schema — give that system its own skill describing its structure: what
objects exist, how they relate, naming and filing conventions, IDs worth
knowing, and gotchas. Every skill that works in the system links to that map
instead of describing the system itself. Simple systems (Google Drive, Gmail,
Slack) don't need a map.

A map records structure, which is stable, not contents, which change daily.
If the structure is already documented somewhere (for this repo's Supabase
database: docs/DB-REVIEW.md and supabase/migrations/), the map links there
rather than restating it.

Whatever the system, any skill that sends the model into an outside system
tells it to look around before changing anything: list the top-level
structure (databases, folders, labels, tables), open one or two existing
examples of the thing it's about to create or change, and follow the
conventions it finds. *Why: the information a
task depends on often sits somewhere the request doesn't mention, and
Anthropic's testing found an explore-first instruction made agents noticeably
more accurate.* If exploring shows a system is complex and has no map, propose
creating one; if it shows an existing map is wrong, fix the map in the same
change.

## 4. Keep it lean and findable

- **Description**: third person, what the skill does plus when to use it,
  using the words a user would actually type. Most skill failures are trigger
  failures. Limit 1,024 characters.
- **Name**: lowercase and hyphens, consistent with its neighbours.
- **Length**: keep SKILL.md short (the hard ceiling is 500 lines). Move detail
  into reference files linked directly from SKILL.md, one level deep. Put
  exact, repeatable operations in scripts, and say whether to run or read them.
- **Time**: no dates or "currently" facts that will quietly go wrong. History
  appears only as the reason for a rule.
- **Terms**: pick one word for each thing and use it throughout.

## Maintaining skills

Review a skill when a new model generation arrives, when it contradicts the
code or docs, or when someone sees it fail. Age alone isn't a reason.

Periodically try removing rules: delete one, run the skill's test prompts in
a fresh session, and leave it out if nothing gets worse. More capable models
need fewer rules. Guardrails on irreversible or client-facing actions are
tested in a dry run, never by removing them in real use.

Each skill keeps 2–3 realistic test prompts in an `evals.md` beside it, each
with a line on what a good result looks like. Without them, pruning is guesswork.

When editing a skill, bring the lines you touch up to these rules and list
other problems you notice rather than rewriting the whole skill unasked.

For eval harnesses and description tuning, use Anthropic's `skill-creator`
skill instead of repeating its mechanics here.
