#!/usr/bin/env bash
# Security gate: makes Claude run the security-guardian agent on any change
# to security-sensitive files, without anyone having to ask. See
# docs/SECURITY.md ("How the protection is layered").
#
#   security-gate.sh stop   Stop hook: at the end of a turn, if sensitive
#                           files changed and that exact change hasn't been
#                           reviewed, tell Claude to review before finishing.
#   security-gate.sh push   PreToolUse hook: block `git push` (and GitHub MCP
#                           pushes) until the current change has been reviewed.
#   security-gate.sh mark   Record the current change as reviewed. Claude runs
#                           this after the guardian has reported and the owner
#                           has been told about anything it found.
#
# Generic: works in any git repo. Needs only bash, git and shasum/sha256sum.

set -u
mode="${1:-}"
input="$(cat 2>/dev/null || true)"

git rev-parse --git-dir >/dev/null 2>&1 || exit 0
gitdir="$(git rev-parse --git-dir)"
marker="$gitdir/security-reviewed"

# Files whose changes can open a security hole. Docs and styling don't,
# except the security tooling itself (agent, hooks, checklist): a worm in 2026
# planted a Claude Code hook, so changes there are always reviewed.
sensitive='(^|/)(api|auth|server|lib|middleware|proxy|webhooks?|supabase|migrations|prisma|db|actions|admin|intake|scripts|public)(/|\.|$)|next\.config|layout\.tsx$|(^|/)[a-z]+\.config\.(ts|js|mjs)$|(^|/)package(-lock)?\.json$|pnpm-lock\.yaml$|yarn\.lock$|vercel\.json$|^\.github/|(^|/)\.env|Dockerfile'
always='^\.claude/(agents|hooks)/|^\.claude/settings|^docs/SECURITY\.md$'

base=""
for ref in origin/HEAD origin/main origin/master; do
  if git rev-parse --verify -q "$ref" >/dev/null; then
    base="$(git merge-base HEAD "$ref" 2>/dev/null)"; break
  fi
done
[ -n "$base" ] || base="HEAD"

all="$( { git diff --name-only "$base" 2>/dev/null; git ls-files --others --exclude-standard; } | sort -u )"
changed="$( { echo "$all" | grep -E "$sensitive" | grep -vE '\.(md|mdx|txt|png|jpe?g|webp|avif|css)$'
  echo "$all" | grep -E "$always"; } | grep -v '^$' | sort -u )"

hash_cmd() { command -v sha256sum >/dev/null && sha256sum || shasum -a 256; }
current=""
if [ -n "$changed" ]; then
  # shellcheck disable=SC2086
  current="$( { git diff "$base" -- $changed 2>/dev/null; for f in $changed; do
      git ls-files --error-unmatch "$f" >/dev/null 2>&1 || cat "$f" 2>/dev/null; done; } | hash_cmd | cut -c1-64 )"
fi
reviewed="$(cat "$marker" 2>/dev/null || true)"

if [ "$mode" = "mark" ]; then
  [ -n "$current" ] && echo "$current" > "$marker"
  echo "security-gate: current change marked as reviewed"; exit 0
fi

# Nothing sensitive changed, or this exact change was already reviewed.
[ -z "$current" ] && exit 0
[ "$current" = "$reviewed" ] && exit 0

files="$(echo "$changed" | head -15 | tr '\n' ' ')"
msg="Security-sensitive files changed and this change has not had a security review: ${files}. Run the security-guardian agent on the diff (diff review), tell the owner about any Critical/High findings and fix them with their agreement, then run .claude/hooks/security-gate.sh mark."

json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

case "$mode" in
  stop)
    # Don't loop: if Claude is already continuing because of this hook, let it stop.
    echo "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0
    printf '{"decision":"block","reason":"%s"}\n' "$(json_escape "$msg")"
    ;;
  push)
    tool="$(echo "$input" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)"
    case "$tool" in
      *'"Bash"'*)
        # Decode the real command (handles quotes and newlines), then look for
        # `git ... push` as a command: at the start of a line or after && ; | (
        if command -v jq >/dev/null; then cmd="$(echo "$input" | jq -r '.tool_input.command // empty')"
        elif command -v node >/dev/null; then cmd="$(echo "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).tool_input.command||"")}catch{process.stdout.write(d)}})')"
        else cmd="$input"; fi
        echo "$cmd" | grep -qE '(^|[;&|(])[[:space:]]*((command|env|sudo|time)[[:space:]]+)?git([[:space:]]+-[^[:space:];&|]+([[:space:]]+[^-[:space:];&|][^[:space:];&|]*)?)*[[:space:]]+push([[:space:];&|)]|$)' || exit 0
        ;;
    esac
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' \
      "$(json_escape "Push blocked by the security gate. $msg")"
    ;;
esac
exit 0
