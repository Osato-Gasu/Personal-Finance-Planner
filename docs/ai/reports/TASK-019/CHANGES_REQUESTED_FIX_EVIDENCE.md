# TASK-019 CHANGES_REQUESTED Fix Evidence

## Result

- Correction result: `COMPLETED`
- Started: `2026-08-25 20:08:52 JST`
- Finished: `2026-08-25 20:48:01 JST`
- Formal decision received: `CHANGES_REQUESTED`
- Accepted findings resolved: `TASK-019-IR-01` (MAJOR), `TASK-019-IR-02` (MINOR)
- Final approval authority remains ChatGPT. This return does not approve, integrate, release, or complete the TASK.

## Formal fix package

- ZIP: `TASK-019_CODEX_FIX_PACKAGE.zip`
- Bytes: `15210`
- SHA-256: `970B1EE0486B17C323FFC06DCA52300DAFDDEB1859202F3AE5CE5610E42A243D`
- The package was treated as the formal correction authority supplied by the user. Its document instructions were distinguished from the user request.
- Rejected reviewed candidate: `f5eb7dacce356e0b0067a2f5f91948ec7aa14fd9`
- Rejected candidate tree: `8c72f7d7167e7642ab468c7799ac9feb9f9356ac`
- Correction start/evidence HEAD: `9696f1cf13576920817153294ede6394d9991592`
- Required original baseline: `f343c5cade743aff6e75feb7f852da1cfd82d47b`

## Successor candidate identity

- Repository: `Osato-Gasu/Personal-Finance-Planner`
- Branch: `codex/task-019-take-home-simplification`
- Candidate commit: `ab694bbf2a236b38fc8b52b09b3f9f368ba93f8c`
- Candidate tree: `c4d12f999f1ea1f8cd31b048b707df69881f0754`
- Candidate parent: `9696f1cf13576920817153294ede6394d9991592`
- The remote branch resolved to the exact candidate before VERIFY.

Correction paths changed from the candidate parent:

- `Personal-Finance-Planner.html`
- `src/domain/linked-value.ts`
- `src/domain/state.ts`
- `src/domain/take-home-current-context.ts`
- `src/rules/jp/take-home/resident-tax-salary-income-2025.ts`
- `tests/task-019-explicit-link.test.ts`
- `tests/task-019-resident-tax-rule-year.test.ts`
- `tools/test-portable-build.mjs`

## Finding resolutions

### TASK-019-IR-01

- Added one shared read-only link resolver. Self/current-year/calculated sources use the exact persisted `resolveCurrentTakeHomeContext` result only when its plan ID matches the link source.
- Active explicit link resolution, `add-link` / `link-budget-income-to-take-home-plan` validation, and `unlink-income` current-value validation now use that same result.
- A persisted `unsupported-uncomputed` resident-tax byte remains explicit-linkable when the current-context estimate is complete.
- A stale assessment-year manual resident-tax value is preserved but excluded from current-year Budget income.
- Manual resident tax can be turned off while linked; the estimate remains complete and the exact estimated value can be safely unlinked before deactivate/delete.
- Partner, legacy-manual, and out-of-current-year paths retain strict calculation semantics. No view-time repair, rebind, or write was added.

### TASK-019-IR-02

- The bounded 2026 cash-year resident-tax fallback now uses a dedicated 2025 salary-income conversion, not the 2026 income-tax helper.
- Boundary proof: gross salary `1,500,000` yen -> 2025 salary income `850,000` yen -> taxable base `420,000` yen after the existing `430,000` yen basic deduction -> bounded estimate `42,000` yen.
- Existing `salaryIncomeYen2026(1_500_000) === 760_000` remains unchanged.
- The helper is isolated to the bounded fallback; no municipality engine, equal-per-capita amount, credits, spouse/dependent rule, or new Take-home rule year was added.

## Tests, build, and browser evidence

- Focused affected regression matrix: `12` files, `232/232` passed during Main integration.
- Final full Vitest: `27` files, `603/603` passed.
- Separated VERIFY focused TASK-019: `4` files, `29/29` passed.
- `npm run typecheck`, `npm run lint`, `npm run format:check`: passed.
- Rule suites: Take-home `69/69`, NISA `68/68`, iDeCo `86/86`, Overview `28/28` passed.
- Production build and launcher freshness: passed.
- Root launcher: `316608` bytes, SHA-256 `FF3D3E43B2595D335BF79E5AED476CD2F519FCF46D9B0D83A0482C293B3C6B56`.
- Project overlay, governance, product-identity relay smoke: passed under PowerShell 7 and Windows PowerShell 5.1.
- Completion safety simulation: `34/34` cases passed under PowerShell 7 and Windows PowerShell 5.1; fixture-only, with no real completion action.
- Portable standalone `file://` browser test exited `0`. It exercised transient zero-write, confirmation cancel/atomic persistence, explicit link creation, manual resident-tax ON/OFF, safe unlink, Budget/Overview consistency, reload, unsupported-year zero-write, and 360 px layout. Runtime requests, console errors, and page errors were all `0`.
- Existing desktop/mobile visual screenshots remain applicable because the correction did not change UI structure or styling.

## Exact GitHub CI

- Workflow: `Governance CI`
- Run ID: `32842694638`
- URL: `https://github.com/Osato-Gasu/Personal-Finance-Planner/actions/runs/32842694638`
- Event: `push`
- Head branch: `codex/task-019-take-home-simplification`
- Head SHA: `ab694bbf2a236b38fc8b52b09b3f9f368ba93f8c`
- Conclusion: `success`
- The exact run passed both PowerShell governance/smoke/completion matrices, all Node/test/build/launcher gates, and the standalone browser gate.

## Separated high-risk VERIFY

- Result: `PASS`
- Exact commit: `ab694bbf2a236b38fc8b52b09b3f9f368ba93f8c`
- Exact tree: `c4d12f999f1ea1f8cd31b048b707df69881f0754`
- VERIFY independently confirmed both accepted findings, `603/603` full tests, focused `29/29`, byte-identical launcher, portable exit `0`, governance/smoke/completion matrices, exact GitHub CI identity, clean worktree, and no repository changes.

## Official source evidence

- National Tax Agency No.1410, salary-income deduction for 2025 and later: `https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm`
- Mito City, 2026 municipal-tax changes based on 2025 income: `https://www.city.mito.lg.jp/page/110293.html`
- National Tax Agency, 2026 income-tax reform information retained as a separate rule year: `https://www.nta.go.jp/users/gensen/2026kiso/index.htm`

These primary sources support the rule-year correction only. The existing bounded approximation disclosures and out-of-scope omissions remain in force.

## Execution records

| Role | Scope/result | Requested model/effort | Actual model/effort | Runtime evidence |
|---|---|---|---|---|
| Codex Main | Package/preflight, integration review, test correction, portable evidence, candidate/CI/evidence ownership | Sol / XHigh | unconfirmed | Sole commit/push writer; exact identities and gates above |
| Worker `task019_domain` | IR-01 resolver/state/tests; no commit/push | Luna / XHigh | unconfirmed | Reported focused `101/101`, typecheck/lint/format/diff checks passed; Main independently expanded and reran the matrix |
| Worker `task019_ui` | IR-02 bounded 2025 primitive/tests; no commit/push | Luna / XHigh | unconfirmed | Reported boundary `3/3`, TASK-019 domain `14/14`, typecheck/lint/format/diff checks passed |
| VERIFY `task019_verify` | Read-only high-risk review of exact successor | Sol / XHigh | unconfirmed | PASS; `603/603`, focused `29/29`, launcher/portable/governance/CI identity; repository unchanged |

Worker count: `2`. The scopes were non-overlapping, and Main was the only integration writer.

## Clean status, remaining risk, and prohibitions

- Material unresolved risk within the accepted correction scope: none found.
- Remaining product limitations are the already disclosed resident-tax proxy omissions, annual/12 averaging, and 2026-only Take-home support.
- Canonical main remained clean at required baseline `f343c5cade743aff6e75feb7f852da1cfd82d47b` and was not integrated.
- No rebase, amend, squash, force push, shared-governance edit, tag, GitHub Release, Distribution, Pages publish, deployment, or real completion action occurred.
- The TASK worktree and branch remain available for ChatGPT to arrange independent implementation review attempt 2.
