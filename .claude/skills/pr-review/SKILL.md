---
name: pr-review
description: Reviews a GitHub pull request end-to-end — fetches the PR, derives which Engineering OS reviewers apply from the changed paths, runs them in parallel, and assembles one consolidated review with a verdict. Posts to GitHub ONLY on explicit instruction. Use when asked to review a PR by number or URL. Follows Knowledge/coding-standards.md#CS-06.
when_to_use: review PR, review pull request, look at PR #, review this github PR, pre-merge review of a pull request, what's wrong with this PR
allowed-tools: Read, Grep, Glob, Bash, Task
---

## Purpose & Preconditions
Bring the factory's reviewers to a GitHub PR. This skill owns the GitHub mechanics and the routing;
the actual judgement is done by the existing read-only reviewer roles — it does not re-implement review.

Preconditions:
- `gh` CLI installed AND authenticated (`gh auth status`). If not authenticated, STOP and tell the
  user to run `gh auth login` themselves — never attempt to authenticate on their behalf.
- The repo has a GitHub remote and Engineering OS installed (`.claude/role-matrix.json` present).

## Inputs / Outputs (contract)
Inputs: a PR number or URL. Optional: a scope hint (e.g. "security only").
Outputs: a consolidated PR review returned in the Output Contract as `review-findings`.
**Posting to GitHub is NOT part of the default output** — see Step 6.

## Steps (deterministic)

1. **Fetch the PR.** Read metadata and the diff; never guess at contents.
   ```bash
   gh pr view <N> --json number,title,body,author,baseRefName,headRefName,additions,deletions,files
   gh pr diff <N>
   ```
   If `gh auth status` fails → STOP, report the exact command the user must run. Do not proceed.

2. **Derive the reviewer set** from what actually changed (deterministic, not guessed):
   ```bash
   gh pr diff <N> --name-only | node scripts/pr-review-scope.mjs --stdin --json
   ```
   This maps each changed path to its owning role via `role-matrix.json` and returns the reviewers
   that apply, each with the reason it was summoned. Report the scope to the user before reviewing.

3. **Validate upstream (WF-09).** Check the PR itself before reviewing its code:
   - Does the description say WHAT changed and WHY? A PR with no rationale is a finding.
   - Is it one logical concern (per CS-21)? A PR mixing a refactor + a feature + a fix is a finding —
     recommend splitting rather than reviewing a tangle.
   - Are tests included for behavior changes (per CS-09)? If not, that is a finding on its own.

4. **Dispatch reviewers in parallel.** Spawn each reviewer from step 2 as a subagent (Task tool),
   giving each: the diff, the changed-file list, and its own domain focus. Reviewers are read-only —
   they return findings and cannot edit the branch. Run them concurrently, not one at a time.
   If a summoned role is NOT read-only (e.g. `qa-automation`, `devops`, `documentation` can appear in
   scope), instruct it explicitly: **findings only for this task; do not modify any file.**

5. **Consolidate.** Merge every reviewer's findings into ONE review:
   - Deduplicate: the same line flagged by two reviewers becomes one finding with both lenses.
   - Rank: correctness/security bugs first, then perf/a11y, then style/maintainability.
   - Format each: `[SEVERITY] file:line — what's wrong · why it matters · suggested fix · cited rule ID`.
   - Drop anything the linter/formatter already enforces (noise, per code-reviewer's own rules).
   - Verdict: **REQUEST CHANGES** if any blocker (correctness, security, missing tests on behavior
     change); **COMMENT** if only non-blocking findings; **APPROVE** only if genuinely clean.

6. **Deliver — posting requires EXPLICIT permission.**
   Default: return the consolidated review in the Output Contract. **Do not post it.**
   Only if the user explicitly asked to post it to GitHub in this task, then:
   ```bash
   # summary review (verdict + body)
   gh pr review <N> --comment  --body-file <file>     # or --request-changes / --approve
   # optional line-level comments
   gh api repos/{owner}/{repo}/pulls/<N>/reviews -f event=COMMENT \
     -F 'comments[][path]=src/x.ts' -F 'comments[][line]=42' -F 'comments[][body]=…'
   ```
   Show the user the exact review text BEFORE posting. Posting is public and hard to undo.
   Never post an APPROVE verdict automatically — approval is a human decision.

## Decision Points
- **Not authenticated** → stop and hand the user `gh auth login`. Never handle their credentials.
- **Huge PR** (>~50 files or >2000 lines): review the highest-risk paths first (security/auth, data,
  contracts), say explicitly which files you did NOT review — never imply full coverage you didn't do.
- **Zero reviewers returned** (e.g. docs-only PR): say so plainly and do a light editorial pass; do not
  manufacture findings to look busy.
- **Generated files in the diff** (marked `GENERATED FILE`): review the generator/source, not the output.
- **A finding you are not sure about**: verify it against the actual file before flagging (per
  `code-review-pass`), or label it explicitly as a question rather than a defect.

## Quality Gate (inline — before returning)
- [ ] Scope was derived mechanically from changed paths, and reported to the user.
- [ ] Every summoned reviewer actually ran (or its absence is explained).
- [ ] Every finding: severity + file:line + why + suggested fix + cited rule ID where one applies.
- [ ] Findings deduplicated across reviewers; ranked blockers-first.
- [ ] Verdict stated explicitly, with the blockers that drive it listed.
- [ ] Coverage stated honestly — any file skipped is named.
- [ ] Nothing was posted to GitHub unless the user explicitly asked in this task.

## References
Routing: `scripts/pr-review-scope.mjs` · reviewer depth: `code-review-pass`, `security-threat-model`,
`wcag-audit` skills. Standards cited by ID (CS-*, AR-*, UI-*, AI-*) — never inlined (EF-01).
