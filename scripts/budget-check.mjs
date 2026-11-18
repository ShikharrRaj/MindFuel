#!/usr/bin/env node
// budget-check.mjs — fails CI if any always-loaded artifact exceeds its residency budget.
// Enforces the residency rule (docs/engineering-os-standard.md §4): depth is unlimited on-demand,
// but always-loaded surface is capped. Body = lines after YAML frontmatter.
// Run from repo root:  node scripts/budget-check.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();

// [ dir, recurse, filter, limit, mode ]  mode: 'total' | 'body'
const RULES = [
  { dir: '.claude', recurse: false, match: (f) => f === 'CLAUDE.md', limit: 120, mode: 'total', label: 'CLAUDE.md' },
  { dir: '.claude/agents', recurse: true, match: (f, p) => extname(f) === '.md' && !p.includes('_role-assets'), limit: 180, mode: 'body', label: 'role body' },
  { dir: 'Knowledge', recurse: false, match: (f) => extname(f) === '.md', limit: 200, mode: 'total', label: 'Knowledge file' },
  { dir: '.claude/skills', recurse: true, match: (f) => f === 'SKILL.md', limit: 400, mode: 'body', label: 'SKILL.md body' },
];

function walk(dir, recurse) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  const out = [];
  for (const name of readdirSync(abs)) {
    const full = join(abs, name);
    const rel = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (recurse) out.push(...walk(rel, true));
    } else {
      out.push({ name, rel, full });
    }
  }
  return out;
}

function bodyLineCount(text) {
  const lines = text.split('\n');
  if (lines[0].trim() === '---') {
    const end = lines.indexOf('---', 1);
    if (end !== -1) return lines.length - (end + 1);
  }
  return lines.length;
}

// A file may declare itself GENERATED (machine-produced data with a source of truth elsewhere,
// e.g. a component catalog emitted from code). The line budget exists to keep hand-authored
// *prose standards* citable and scannable — it does not apply to generated data, which is
// consumed programmatically. Exemptions are REPORTED, never silent, so they can't be abused.
// Declare with either marker in the first 15 lines:
//     <!-- budget-exempt: <reason> -->      or      **GENERATED FILE — ...**
function exemptReason(text) {
  const head = text.split('\n').slice(0, 15).join('\n');
  const explicit = head.match(/<!--\s*budget-exempt:?\s*(.*?)\s*-->/i);
  if (explicit) return explicit[1] || 'declared budget-exempt';
  if (/GENERATED FILE/i.test(head)) return 'generated file (source of truth elsewhere)';
  return null;
}

let violations = 0;
let checked = 0;
const exempted = [];
for (const rule of RULES) {
  for (const file of walk(rule.dir, rule.recurse)) {
    if (!rule.match(file.name, file.rel)) continue;
    const text = readFileSync(file.full, 'utf8');
    const count = rule.mode === 'body' ? bodyLineCount(text) : text.split('\n').length;
    checked++;
    if (count <= rule.limit) continue;

    const reason = exemptReason(text);
    if (reason) {
      exempted.push({ rel: file.rel, count, reason });
      continue;
    }
    violations++;
    console.error(`✗ ${file.rel} — ${rule.label} ${count} lines > ${rule.limit} budget`);
  }
}

for (const e of exempted) {
  console.log(`  ⓘ exempt: ${e.rel} (${e.count} lines) — ${e.reason}`);
}

if (violations === 0) {
  const suffix = exempted.length ? `, ${exempted.length} exempt` : '';
  console.log(`✓ budget-check: ${checked} always-loaded files, all within budget${suffix}`);
  process.exit(0);
}
console.error(`\n✗ budget-check: ${violations} file(s) over budget`);
process.exit(1);
