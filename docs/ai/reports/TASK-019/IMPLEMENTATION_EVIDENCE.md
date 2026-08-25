# TASK-019 Implementation Evidence

## Result

- Implementation-phase result: `COMPLETED`
- Started: `2026-08-25 17:37:23 JST`
- Finished: `2026-08-25 19:03:42 JST`
- Final approval authority: ChatGPT
- Lifecycle state: implementation remains active; no completion sync or TASK artifact deletion was performed.

## Start package and baseline identity

- Formal ZIP: `TASK-019_IMPLEMENTATION_START_PACKAGE.zip`
- ZIP bytes: `200042`
- ZIP SHA-256: `49F58AF7560353619CC2EE24B9EA731FF6652678463611E90951FA2715AA5E1A`
- Relay bundle bytes: `9577`
- Relay bundle SHA-256: `F0F4F6F06A481A76CF7FA82F0B3B0220E4928FB8E3A3FC658647029016B0C41E`
- The ZIP pointer used a non-canonical name/media-type form and the canonical router rejected the missing `relay_bundle_name`. It was not edited or bypassed. The exact verified `RELAY_BUNDLE.json` was imported through the supported bundle-only route.
- Required baseline commit: `f343c5cade743aff6e75feb7f852da1cfd82d47b`
- Required baseline tree: `026338605739bc907c748bcd81cfcdef4e0e25cc`
- Preflight confirmed `origin/main` and the clean canonical main worktree at that exact identity.
- TASK activation/import commit: `e6d253efd48cd12f4a34ebbdb9ae025203af284c`
- TASK activation/import tree: `a474fa06d970cf10b2bd6a917d7f2ac79e0502fa`

## Candidate identity

- Branch: `codex/task-019-take-home-simplification`
- Dedicated worktree: `C:\Users\satoshi-sugaya.dh\Development\personal\TASK-019-implementation\Personal-Finance-Planner`
- Implementation candidate: `f5eb7dacce356e0b0067a2f5f91948ec7aa14fd9`
- Candidate tree: `8c72f7d7167e7642ab468c7799ac9feb9f9356ac`
- Candidate parent: `bc6ea408c0516df933babf943ec5f766d374de52`
- Baseline ancestor: `f343c5cade743aff6e75feb7f852da1cfd82d47b`
- Remote branch resolved to the exact candidate after push, and the worktree was clean for VERIFY.

Exact paths changed from baseline through the candidate:

- `Personal-Finance-Planner.html`
- `board/PROGRESS.html`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/NEXT_ACTION.yml`
- `docs/ai/handoffs/TASK-019/CODEX_HANDOFF.md`
- `docs/ai/reports/TASK-019/RELAY_BUNDLE.json`
- `docs/ai/reports/TASK-019/RELAY_IMPORT.md`
- `docs/ai/reports/TASK-019/evidence/take-home-desktop-1440x1000.png`
- `docs/ai/reports/TASK-019/evidence/take-home-mobile-390x1200.png`
- `docs/ai/tasks/TASK-019.md`
- `src/domain/linked-value.ts`
- `src/domain/overview.ts`
- `src/domain/state.ts`
- `src/domain/take-home-current-context.ts`
- `src/modules/take-home/take-home-view.ts`
- `src/styles.css`
- `tests/life-plan-assets.test.ts`
- `tests/task-016.test.ts`
- `tests/task-019-domain.test.ts`
- `tests/task-019-node-fs.d.ts`
- `tests/task-019-ui.test.ts`
- `tools/test-portable-build.mjs`

## Implemented behavior

- Added a pure, read-only self/current-year context resolver with unique active Payroll transient preview and unsupported-year fail-closed behavior.
- Preserved existing calculated direct/unbound, valid linked, legacy manual, disabled, and stale-binding authority without render-time repair or writes.
- Added one atomic Store transition for explicit first plan-plus-Payroll-binding persistence. Confirmation cancellation and storage failure publish neither side.
- Kept Payroll statutory compensation authoritative and excluded gas-adjusted practical income from tax/social-insurance calculation.
- Applied employer-prefecture residence fallback only to a calculation clone; explicit normal-view selection remains visibly unsaved until confirmation.
- Added the bounded current-year resident-tax cash-flow estimate with matching assessment-year manual precedence, stale-year preservation, proxy/omission warnings, safe-integer validation, 430,000-yen basic deduction, and 10% income-rate approximation.
- Unified Budget and Overview self/current-year downstream selectors on the same resolver so derived resident-tax estimates are referenced rather than copied into persisted state.
- Simplified normal Take-home UI to the current context, compact provenance, salary-source summary, age/profile state, optional employer correction, three primary results, annual/12 and spouse/dependent disclosures, and collapsed technical/legacy details.
- Added scoped compact controls and stable two-column desktop / stacked mobile layout.

## Test and build evidence

- Focused TASK-019 domain/UI: `19/19` passed.
- TASK-019 plus Overview focused regression: `47/47` passed.
- Full Vitest: `25` files, `593/593` passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run build`: passed.
- `npm run verify:launcher`: passed; committed launcher SHA-256 `E546562D94326B5DEEF6871FC629802676F6C12D64FE5A89BDFF578152B95C48`.
- `npm run test:portable`: exit `0`; six routes, transient zero-write, confirmation cancel, atomic persistence, reload preservation, Budget/Overview downstream consistency, 2027 zero-write, 360 px layout, runtime requests `0`, console errors `0`, page errors `0`.
- Project overlay and AI governance validation: passed.
- Product-identity relay smoke: passed under PowerShell 7 and 5.1.
- Completion safety simulation: `34/34` cases passed under PowerShell 7 and 5.1; fixture-only, no real completion action.

The first candidate `bc6ea408c0516df933babf943ec5f766d374de52` exposed a stale pre-TASK-019 portable UI scenario and was rejected by CI/VERIFY. Main updated the test to the approved transient/confirmation flow, fixed the downstream resolver inconsistency it exposed, committed a new candidate, reran all gates, and obtained a new separated VERIFY PASS.

## Browser evidence

- Desktop: `docs/ai/reports/TASK-019/evidence/take-home-desktop-1440x1000.png`
  - SHA-256: `974C3C6ADBF9FB2A1CE11E94B5D78394C2D84AEFD526314AE971B4AEC7994BAD`
  - Two columns at 1440 px; no horizontal overflow.
- Mobile: `docs/ai/reports/TASK-019/evidence/take-home-mobile-390x1200.png`
  - SHA-256: `35DB102BA65BC575FDB7389BFF926741521E4A10E0D6A607D9D6F64FF6D2DFC5`
  - One stacked column at 390 px; no horizontal overflow.
- Browser fixture source summary: monthly salary `300,000円`, annual gross `3,700,000円`, monthly commute `0円`.
- Complete three-result display: average monthly `246,214円`, annual `2,954,575円`, tax/social insurance total `745,425円`.
- Reload before explicit save preserved zero Take-home plans/bindings. The final standalone browser gate exercised both dialog dismissal and acceptance, then verified atomic save and downstream values.
- Material console warnings/errors: `0`; page errors: `0`.

## Official rule-source check

- Mito City resident-tax guidance confirms prior-year-income taxation and the standard 10% income rate split (municipal 6%, prefectural 4%): `https://www.city.mito.lg.jp/page/3326.html`.
- Mito City deduction guidance lists the ordinary resident-tax basic deduction as 430,000 yen: `https://www.city.mito.lg.jp/page/3323.html`.
- These sources support the bounded approximation only; exact municipality calculations, equal-per-capita amounts, credits, and spouse/dependent rules remain explicitly out of scope and disclosed.

## CI and separated VERIFY

- Exact-candidate GitHub workflow: `Governance CI`
- Run ID: `32834399222`
- URL: `https://github.com/Osato-Gasu/Personal-Finance-Planner/actions/runs/32834399222`
- Event: `push`
- Head SHA: `f5eb7dacce356e0b0067a2f5f91948ec7aa14fd9`
- Conclusion: `success`; all workflow steps including both PowerShell governance/smoke/completion matrices and standalone file build passed.
- Separated high-risk VERIFY result: `PASS`.
- VERIFY exact identity: commit `f5eb7dacce356e0b0067a2f5f91948ec7aa14fd9`, tree `8c72f7d7167e7642ab468c7799ac9feb9f9356ac`.
- VERIFY confirmed `593/593`, launcher byte identity, portable exit `0`, source authority, statutory/practical firewall, resident-tax year identity, stale/manual preservation, atomicity, and downstream resolver consistency.

## Execution records

| Role | Scope/result | Requested model/effort | Actual model/effort | Runtime/identity evidence |
|---|---|---|---|---|
| Codex Main | Preflight, integration, fixes, tests, browser evidence, candidate/CI/evidence ownership | Sol / XHigh | unconfirmed | Dedicated worktree and Git candidate identities above; runtime did not expose a reliable model/effort value |
| Build worker `task019_domain` | Resolver, atomic state action, domain tests; integrated after Main review | Main dispatch: Luna / XHigh; worker report carried `5.6 Sol / high` label | unconfirmed | Shared TASK worktree/branch; no worker commit/push; worker reported focused `78/78`, typecheck/lint/format pass |
| Build worker `task019_ui` | Take-home view and scoped styles; integrated and revised by Main | Main dispatch: Luna / XHigh | unconfirmed | Shared TASK worktree/branch; no worker commit/push; worker reported 69 Take-home tests, typecheck/format/build pass |
| VERIFY worker `task019_verify` | Read-only high-risk review of exact candidate | Sol / XHigh | unconfirmed | PASS on candidate/tree above; repository remained clean and unchanged |

Worker count: `2`. Both scopes were bounded and non-overlapping at dispatch; Main was the only commit/push/integration writer.

## Remaining risk and prohibited actions

- Unresolved material risk within the accepted TASK-019 scope: none.
- Explicit approximation limits remain visible: resident-tax proxy inputs, omitted equal-per-capita/credits/dependent deductions, annual/12 rather than paycheck simulation, and 2026-only Take-home rules.
- Canonical main remained at baseline and was not integrated.
- No rebase, amend, squash, force push, destructive recovery, shared-governance edit, tag, GitHub Release, distribution, Pages publish, or deployment occurred.
- The dedicated worktree/branch is retained pending ChatGPT final authorization.
