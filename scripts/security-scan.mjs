#!/usr/bin/env node
// Mechanical security checks: the parts of docs/SECURITY.md a script can
// verify without judgment. Runs in CI (.github/workflows/security.yml) and is
// the first step of the security-guardian agent. Zero dependencies, so it
// works in any Node project: copy it as-is.
//
// Exit code 1 on any ERROR (CI fails); WARNs are printed for review only.
// Usage: node scripts/security-scan.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const findings = [];
const add = (level, file, msg) => findings.push({ level, file, msg });

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const read = (f) => {
  try {
    return readFileSync(f, 'utf8');
  } catch {
    return '';
  }
};
const isCode = (f) => /\.(m?[jt]sx?|cjs|html|json|ya?ml)$/.test(f);
// Secrets can hide in any text file, not just code.
const isText = (f) => isCode(f) || /\.(sql|md|mdx|sh|toml|txt|env\.example)$/.test(f);
const isTest = (f) => /\.(test|spec)\.[jt]sx?$|__tests__\//.test(f);
const SELF = 'scripts/security-scan.mjs';

// 1. Files that should never be committed (#2, secrets).
const secretFile =
  /(^|\/)\.env(\.|$)(?!example|sample|template)|\.(pem|key|p12|pfx)$|(^|\/)id_(rsa|ed25519)$|\.(sql|dump|bak)\.gz$/;
for (const f of tracked) {
  if (secretFile.test(f)) add('ERROR', f, 'secret-looking file is committed to git');
  if (/^public\/.*(\.map$|\.env|\/\.git\/|\.sql$|\.bak$)/.test(f))
    add('ERROR', f, 'file in public/ would be served to anyone');
}

// 2. Hard-coded credentials in source.
const keyPatterns = [
  [/sk_live_[0-9a-zA-Z]{16,}/, 'Stripe live secret key'],
  [/rk_live_[0-9a-zA-Z]{16,}/, 'Stripe restricted key'],
  [/whsec_[0-9a-zA-Z]{20,}/, 'Stripe webhook secret'],
  [/\bre_[0-9a-zA-Z]{8,}_[0-9a-zA-Z]{16,}/, 'Resend API key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/gh[pousr]_[0-9a-zA-Z]{36}/, 'GitHub token'],
  [/sk-ant-[0-9a-zA-Z_-]{20,}/, 'Anthropic API key'],
  [/sb_secret_[0-9a-zA-Z_-]{20,}/, 'Supabase secret key'],
  [/GOCSPX-[0-9a-zA-Z_-]{20,}/, 'Google OAuth client secret'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/sk-[A-Za-z0-9]{32,}/, 'OpenAI-style API key'],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/, 'Supabase service-role JWT'],
];
for (const f of tracked.filter((f) => isText(f) && f !== SELF && f !== 'package-lock.json')) {
  const src = read(f);
  for (const [re, name] of keyPatterns)
    if (re.test(src)) add('ERROR', f, `looks like a hard-coded ${name}`);
}

// 3. Secrets exposed to the browser via NEXT_PUBLIC_ (#10).
const publicOk = /PUBLISHABLE|ANON|SITE_KEY|_URL$|GA_|GTM|MEASUREMENT/;
for (const f of tracked.filter(isCode)) {
  for (const m of read(f).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) {
    const name = m[0];
    if (/SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|TOKEN|_KEY$/.test(name) && !publicOk.test(name))
      add('ERROR', f, `${name} is bundled into the browser; secrets must not use NEXT_PUBLIC_`);
  }
}

// 4. Client components importing server-only modules (service-role key etc.).
const serverOnly =
  /from\s+['"](@\/lib\/(supabase|stripe|resend|googleOAuth|signingKeys|adminAuth|adminMfa|totp)|stripe|resend|googleapis)['"]/;
for (const f of tracked.filter((f) => /\.(t|j)sx?$/.test(f) && !isTest(f))) {
  const src = read(f);
  if (/^\s*['"]use client['"]/.test(src) && serverOnly.test(src))
    add('ERROR', f, "'use client' file imports a server-only module (would leak keys or fail)");
}

// 5. Supply-chain script hosts (#7) and production source maps (#17).
const badHosts = /(polyfill\.io|polyfill\.com|bootcdn\.net|bootcss\.com|staticfile\.org|staticfile\.net|unionadjs)/;
for (const f of tracked.filter((f) => isCode(f) && f !== SELF)) {
  const src = read(f);
  if (badHosts.test(src)) add('ERROR', f, 'references a known-compromised script CDN');
  if (/productionBrowserSourceMaps\s*:\s*true/.test(src))
    add('ERROR', f, 'production source maps expose server code and comments');
}

// 6. Things worth a human look (WARN only).
for (const f of tracked.filter((f) => /\.(t|j)sx?$/.test(f) && !isTest(f) && f !== SELF)) {
  const src = read(f);
  // Judge each use on its own line, so one safe JSON-LD block can't hide another.
  // (the use plus the next 3 lines, since JSX often wraps the __html value).
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    const use = lines.slice(i, i + 4).join(' ');
    if (/dangerouslySetInnerHTML/.test(line) && !/JSON\.stringify|sanitis|sanitiz|escape/i.test(use))
      add('WARN', `${f}:${i + 1}`, 'dangerouslySetInnerHTML without visible sanitising or JSON.stringify');
  });
  if (/\beval\(|new Function\(/.test(src)) add('WARN', f, 'eval / new Function');
  if (/headers(\(\))?\)?\.get\(\s*['"](x-forwarded-host|host)['"]\s*\)/i.test(src))
    add('WARN', f, 'reads Host header: links built from it can be poisoned (#16)');
  if (/(redirect|NextResponse\.redirect)\([^)]*searchParams\.get\(/.test(src))
    add('WARN', f, 'redirect target taken from a query parameter: possible open redirect (#19)');
  if (/\.(or|filter)\(\s*`[^`]*\$\{/.test(src))
    add('WARN', f, 'Supabase filter built with a template string: possible filter injection');
}
if (!existsSync('package-lock.json') && existsSync('package.json'))
  add('WARN', 'package.json', 'no package-lock.json: installs are not reproducible');

// Report.
const errors = findings.filter((x) => x.level === 'ERROR');
for (const x of findings) console.log(`${x.level.padEnd(5)} ${x.file}: ${x.msg}`);
console.log(
  `\nsecurity-scan: ${errors.length} error(s), ${findings.length - errors.length} warning(s)` +
    (findings.length ? '' : ' (clean)'),
);
process.exit(errors.length ? 1 : 0);
