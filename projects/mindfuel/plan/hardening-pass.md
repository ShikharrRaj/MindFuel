# MindFuel web hardening pass: delivery plan

> engineering-manager · 2026-11-11 · Implementer: operator

## Owners and sign-off

| #           | Owner                                                  | Sign-off                                          |
| ----------- | ------------------------------------------------------ | ------------------------------------------------- |
| 1           | backend-lead (`api/**` is closed to ai-platform-lead)  | code-reviewer, ai-evaluation                      |
| 2           | backend-lead (`api/_lib/`, `devApi.ts`)                | security-reviewer, performance                    |
| 3           | devops                                                 | security-reviewer                                 |
| 4a endpoint | backend-lead (after 2)                                 | security-reviewer                                 |
| 4b client   | frontend-lead (after 4a)                               | security-reviewer                                 |
| 5           | frontend-lead                                          | security-reviewer, accessibility, design-guardian |
| 6           | frontend-lead                                          | security-reviewer                                 |
| 7           | frontend-lead                                          | seo                                               |
| 8           | frontend-lead (`ActivityPlayer`/`HelpNow`, `Tabs.tsx`) | **security-reviewer (rule 3)**, accessibility     |

Everything not marked "after" runs in parallel. code-reviewer reviews all items. Avoid new dependencies (call Upstash REST with `fetch`).

## Release gate

- Rule 8 and `scripts/verify-all.mjs` pass.
- Tests show:
  - a crisis entry on an exhausted bucket still returns helplines;
  - each cap rejects oversized input;
  - import rejects malformed keys and anything that is not `mindfuel.*`;
  - arrow keys move between tabs.
- Preview deploy shows zero CSP violations across every tab, SOS, audio and chat.
- No raw IPs and no journal text appear in logs. The consent key is registered in `ALL_KEYS`.
- New-model eval passes the schema and severity checks.
- No open P0/P1 findings.

## Missing

**Code**

- `api/chat.ts:121` swallows mid-stream errors: add an error marker and a retry in the UI, plus a timeout and a fallback model.
- Reject forged `assistant` turns and check `exam` against the allowed values.
- Hindi/Hinglish crisis detection plus a recall eval as a CI gate (ai-platform-lead, ai-evaluation).
- Self-host fonts, since the Google CDN leaks user IPs. Add a favicon (`public/` is empty).
- HSTS, COOP.
- Playwright smoke test (qa-automation). Add `npm audit` to CI and pin Node with `.nvmrc`, which has no owner, so it goes to devops.
- Pending ADRs: `arch/adr/` does not exist (staff-architect).
- Runbook: env vars, rollback, safety-incident contact (documentation).
- Commit the uncommitted Calm Toolkit first (git-operations).

**Human/CEO**

- Paid Gemini tier, because free-tier terms allow training on prompts. Restrict the key and set a budget alert.
- Provision Upstash and set Vercel env vars: the in-memory limiter only works within one isolate. Set up the domain.
- Decision #2: the age line is not parental consent.
- Lawyer review of the policy and terms; name the legal entity and a grievance contact.
- Clinical review; re-verify helplines.
- Analytics (TS-36): choose a tool or waive it. Release approval.
