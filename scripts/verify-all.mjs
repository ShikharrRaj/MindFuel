#!/usr/bin/env node
// verify-all.mjs — the single gate. Runs every Engineering OS integrity check and exits
// non-zero if ANY fails. This is what CI and the pre-commit hook call, so boundary rules
// are mechanically enforced rather than periodically remembered.
//
// Usage:  node scripts/verify-all.mjs [--quick]
//   --quick  skip the hook-wiring simulation (used by the pre-commit hook for speed)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const quick = process.argv.includes('--quick');

const CHECKS = [
  { name: 'budget-check',         script: 'budget-check.mjs',         why: 'always-loaded files within their line budget' },
  { name: 'lint-role-boundaries', script: 'lint-role-boundaries.mjs', why: 'no role owns another role’s paths (incl. nested)' },
  { name: 'lint-handoff-chain',   script: 'lint-handoff-chain.mjs',   why: 'every consumed artifact has a producer' },
  { name: 'simulate-hooks',       script: 'simulate-hooks.mjs',       why: 'the write-scope wall actually fires', slow: true },
];

let failed = 0;
const results = [];

console.log(`\nEngineering OS — integrity checks${quick ? ' (quick)' : ''}\n${'─'.repeat(52)}`);

for (const c of CHECKS) {
  if (quick && c.slow) {
    results.push({ ...c, status: 'skipped' });
    console.log(`○ ${c.name.padEnd(22)} skipped (--quick)`);
    continue;
  }
  const path = join(ROOT, 'scripts', c.script);
  if (!existsSync(path)) {
    failed++;
    results.push({ ...c, status: 'missing' });
    console.log(`✗ ${c.name.padEnd(22)} MISSING: scripts/${c.script}`);
    continue;
  }
  const r = spawnSync(process.execPath, [path], { encoding: 'utf8' });
  const ok = r.status === 0;
  if (!ok) failed++;
  results.push({ ...c, status: ok ? 'pass' : 'fail', output: (r.stdout || '') + (r.stderr || '') });
  console.log(`${ok ? '✓' : '✗'} ${c.name.padEnd(22)} ${c.why}`);
  if (!ok) {
    const lines = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
    for (const l of lines) console.log(`    ${l}`);
  }
}

console.log('─'.repeat(52));
if (failed === 0) {
  const ran = results.filter((r) => r.status === 'pass').length;
  console.log(`✓ All ${ran} check(s) passed.\n`);
  process.exit(0);
}
console.log(`✗ ${failed} check(s) FAILED — boundary/budget integrity is broken.`);
console.log(`  Fix the reported issue, or if a rule genuinely needs to change, update`);
console.log(`  .claude/role-matrix.json (and declare shared/nested domains) deliberately.\n`);
process.exit(1);
