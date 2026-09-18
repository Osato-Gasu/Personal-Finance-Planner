---
task_id: TASK-020
summary: Shared 2.0.8 governance migration and automatic SharedSync enrollment
status: COMPLETED
phase: Completion
risk: high
definition_state: DESIGNED
implementation_state: IMPLEMENTED
static_verification_state: PASS
runtime_verification_state: PASS
hold_state: NONE
hold_reason: null
progress: Release and Completion main FF complete; both exact main push CIs PASS; final real Plan CURRENT; final launcher/portable PASS; canonical local main clean and synchronized; TASK worktree registration/local branch removed non-force; empty path residue retained because Windows reports another process using it
next_action: NONE; TASK complete. Retain required remote transport/candidate refs; empty unregistered directory may be removed non-force only after its external process lock is released
next_actor: NONE
handoff_ref: docs/ai/handoffs/TASK-020_GPT_COMPLETION_ACCEPTED.md
authority_condition: GPT_APPROVED_FINALIZATION
verify_state: PASS
current_candidate: 2853db2763d8f339d606a3c9664f350cafd878cc
ci_mode: extended
ci_mode_reason: legacy_shared_schema1_to_shared2_governance_migration_sharedsync_enrollment_ci_trust_boundary
formal_ci_state: PASS
formal_ci_subject_sha: 2853db2763d8f339d606a3c9664f350cafd878cc
frozen_remote_ref: no-ci/task-020-rc-2853db2763d8
formal_ci_workflow: .github/workflows/ci.yml
formal_ci_run_id: 35341533054
target_shared_version: 2.0.8
target_shared_sha: a306ba59f33b156c1e801618bdfa892c411ce7d0
baseline_main_sha: e7de34d7b36b7f6ec514d321a0b66381cc810fa2
release_commit: 92ac0fed7246d460cdeb6e7676c75731e474bda1
release_main_ci_state: PASS
release_main_ci_run_id: 35343524375
downstream_plan_state: CURRENT
local_completion_preflight_state: PASS
completion_commit: 2f2f011689be893b0168e732dcd2c5358211e23f
final_main_sha: 2f2f011689be893b0168e732dcd2c5358211e23f
final_main_ci_state: PASS
final_main_ci_run_id: 35344212726
canonical_local_main_sync_state: PASS
task_worktree_registration_state: REMOVED
task_local_branch_state: DELETED
task_directory_cleanup_state: EMPTY_PATH_RETAINED_PROCESS_LOCK
task_remote_branch_cleanup_state: RETAINED_REQUIRED_COORDINATION_REFERENCE
legacy_shared_version: 0.12.20
legacy_shared_sha: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
---

# TASK-020 — Personal-Finance-Planner Shared 2.0.8移行・自動同期登録

## Goal

Personal-Finance-Plannerをlegacy Shared 0.12.20 / lock schema 1 / adapter schema 1から
現行Shared 2.0.8へ安全に移行し、恒久的なSharedSync自動同期へ登録する。

このTASKはgovernance migrationのみ。金融計算・rule package・AppState・product UI・保存データ・
product docs・過去TASKの承認状態を変更しない。

Target Shared:
- repository: `Osato-Gasu/shared`
- version: `2.0.8`
- commit: `a306ba59f33b156c1e801618bdfa892c411ce7d0`

## Requirements

1. 新規TASK-020として実施し、TASK-001〜019の歴史的意味・承認/retired/blocked状態を改変しない。
2. legacy governance owner群を先にinventoryする。
   `PROJECT_RULES.md`, `WORKFLOW.md`, `CURRENT_STATE.md`, `PROJECT_ADAPTER.psd1`,
   `BACKLOG.md`, `PRODUCT_IDENTITIES.yml`, `PROJECT_REQUIREMENTS.md`, existing validators/tools/CIを確認する。
3. 明示的にShared 2.0.7へ置換するlegacy routing/snapshot/relay/review-attempt機構以外の
   Project固有契約を失わない。
4. 特に以下はnon-relaxableとして恒久Project ownerへ保持する。
   - monetary calculations
   - effective rule periods
   - double counting防止
   - data preservation / lossless migration
   - product requirements / required acceptance criteria
   - security / baseline-candidate identity
5. 旧「implementation review最大3回・第3回のみ限定緩和・4回目禁止」はlegacy orchestrationとして
   Shared 2.0.8のMain→BUILD→VERIFY自律修正ループに置換する。
   ただし上記financial non-relaxable categoriesは一切弱めない。
6. `docs/ai/SHARED_RULES.lock.yml`をschema 2のexact Shared 2.0.8 identityへ更新する。
7. root `AGENTS.md`をShared 2.0.8のsmall Project bootstrapへ移行する。
8. `docs/ai/PROJECT.md`を新設し、Personal-Finance-Planner固有恒久ルールのsole human-readable ownerとする。
   `docs/product/**`をproduct source of truthとして維持する。
9. `PRODUCT_IDENTITIES.yml`はproduct-document integrityとして有用なら維持可能。
   Shared共通routingのためだけに削除/改変しない。不要化する場合は意味が別ownerへ保存済みであることを証明する。
10. `PROJECT_ADAPTER.psd1`をschema 2へ移行し、必要なProject paths/commandsを保持する。
    `Paths.TaskHtml='docs/ai/TASKS.html'` と deterministic update/check commandsを追加する。
11. SharedSyncをexact contractでopt-inする:
    - Enabled=true
    - LockPath=`docs/ai/SHARED_RULES.lock.yml`
    - Project-owned ApplyScript
    - 1つ以上のProject-owned SmokeScript
    - AllowedPaths=exact lock pathのみ
    - AutoIntegrate=true
    - SharedSyncCiMode=`none`
12. apply hookは3 identity envだけを入力としexact lock以外を変更しない。
    malformed/wrong repository/version/SHAをfail closedで拒否する。
13. smoke hookはtarget identity、Project bootstrap、adapter、TASK HTMLをfail closedで確認し、
    private Shared fetchやsecretをCI必須条件にしない。
14. Adapter CI policyをShared downstream syncが判定可能にし、future exact lock-onlyは`none`、
    governance/workflow/hook変更は`extended`、product sourceはnoneへ落とさない。
    ReleasedMainGateはfuture lock-only auto integrationを妨げない`identity_only`を基本とする。
15. 既存CIのpush/pull_request、read-only permission、Windows/PowerShell互換、Node setup、
    typecheck/lint/format/test、rules/NISA/iDeCo/overview/build/portable/completion checksを弱めない。
    exact candidate formal run用のworkflow_dispatch + candidate_sha fail-closed guardを最小追加してよい。
16. legacy generated Shared snapshot、main上の旧NEXT_ACTION、snapshot sync/progress/relay系toolは
    Shared 2.0.8と重複するものだけ退役可能。削除前にProject固有情報が別ownerへ保存済みか証明する。
17. `CURRENT_STATE.md`のcurrent routing二重ownerは解消するが、以下の現役固有情報を失わない:
    - TASK-019 accepted product candidate/tree
    - TASK-004/TASK-005 historical unapproved/terminated status
    - TASK-009 retired / personal-use distribution decision
    - planned product backlog 0
    - no tag/release/deployment facts
18. `BACKLOG.md`の「計画済み製品TASK 0件」とhistorical carry-forward/retirement意味を保持し、
    migrationを理由に製品TASKを自動着手しない。
19. legacy `git_only` completion policyはfuture Shared 2.0.8 TASK trackingと競合するため、
    TASK-020以降はcanonical TASK fileをcurrent treeに保持する方式へ置換する。
    過去TASK-001〜019の欠落fileを復元・捏造しない。
20. `docs/ai/TASKS.html`はTASK-001〜020を人間向けに表示する。
    legacy fileがcurrent treeに存在しないIDは、current sources/Git historyで確実に分かる範囲だけ表示し、
    不明trackingは`未記録`。過去PASSやtitleを推測しない。
21. root launcher `Personal-Finance-Planner.html` と既存local-main/launcher completion safetyは
    Project固有契約として保持する。
    ただしUSER/local環境が必要な確認はruntime trackingでPENDINGとして扱い、他Projectの安全なmigrationを停止させない。
22. product source、financial calculations/rules、AppState、testsのproduct semantics、
    package/dependency versions、`docs/product/**`、root launcher内容を変更しない。
23. data migration/import/export/localStorageの動作を変更せず、ユーザーデータへ操作を行わない。
24. focused governance/adapter/lock/SharedSync/TASK HTML/CI contract/semantic preservation/diff safetyを実行する。
25. product source/package scriptsがbyte-identicalなら、governance migrationだけを理由に全product suiteの重複実行を無制限に要求しない。
    ただしfinancial non-relaxable safetyを弱める変更、product/quality command semantic変更があれば関連suiteを必ず実行する。
26. exact candidateをfreeze/pushし、separated read-only `Luna Max` VERIFYを必須とする。
27. Actionsに既知billing/spending/quota障害があり復旧証拠がなければpoll目的でretryしない。
    local PASS + VERIFY PASS後はexact debtを保持して`PENDING_REMOTE_CI`でGPT統括へ返せる。
28. main統合はGPT統括の明示承認後のみ。同じMainがlive guardsを再確認し通常fast-forwardで実施する。
29. approved integration後、released Shared 2.0.8 real downstream Planで
    `CURRENT / Enrolled=true / Lock VALID / Adapter VALID`を確認する。
    repository setting mismatchがあれば勝手に変更せずsafe failureを返す。
30. ルール改修回帰は変更周辺の必要十分な範囲で行う。
    任意改善・無関係refactor・理想的全面整理を完了条件へ追加しない。

## Scope

- `AGENTS.md`
- `docs/ai/SHARED_RULES.lock.yml`
- `docs/ai/PROJECT.md`
- `docs/ai/PROJECT_ADAPTER.psd1`
- legacy governance owners/state filesの必要最小整理
- legacy generated Shared snapshot/routing/relay/progress toolsの必要最小整理
- Project governance validators / focused tests
- minimal SharedSync apply/smoke scripts
- TASK HTML generator/wrapper + `docs/ai/TASKS.html`
- `.github/workflows/ci.yml` governance/exact-candidate interfaceのみ必要最小変更
- TASK-020 / Evidence / handoff
- `no-ci/orchestration` pointer

## Explicitly preserved / out of scope

- `src/**` / product behavior
- financial formula/rule semantics
- product data/storage/migrations/import/export
- `docs/product/**`
- dependency upgrades
- root launcher product content
- historical TASK approval/retired states
- new product feature/TASK
- distribution/tag/release/deployment
- other downstream Projects

## Design / Decisions

- Baseline main: `e7de34d7b36b7f6ec514d321a0b66381cc810fa2`.
- legacy Shared: 0.12.20 / `10cd1466b10f814f1bd2aab2c5f6ba6465c5899e`.
- TASK-020はhigh-risk governance migrationとしてextended扱い。
- legacy owner数が多いためsemantic inventoryを必須にする。
- released SharedSync mechanismのProject adoptionなので独立設計確認は繰り返さない。
- exact-candidate Luna Max VERIFYをmandatory gateとする。
- BUILDはLuna XHighを基本。必要なら最大2workerへ非重複分割。
- old implementation-review attempt frameworkはretireするが、financial non-relaxable safetyはProject ruleとして残す。
- old local-main/launcher completion safetyはProject-specific runtime contractとして保持し、runtime PENDINGを他Project開発の停止理由にしない。
- Actions障害は開発停止理由にしない。

## Acceptance Criteria

1. lock schema2 = Shared 2.0.8 exact identity。
2. AGENTSがShared 2.0.8 small bootstrap。
3. PROJECT.mdがfinance固有恒久rule owner。
4. monetary/rule-period/double-count/data-preservation等non-relaxable safety保持。
5. legacy 3-attempt review routingはShared 2.0.8 loopへ置換され、financial safetyは弱まらない。
6. adapter schema2 parse PASS、必要paths/commands保持。
7. TaskHtml contract PASS。
8. SharedSync exact contract PASS、AllowedPathsはlockのみ。
9. future lock-only effective CI=none、governance/hook=extended相当、product!=none。
10. apply/smoke positive/negative PASS。
11. existing CI product-quality/security/PowerShell compatibilityを弱めない。
12. exact candidate formal dispatch fail-closed contract PASS。
13. old snapshot/routing二重owner解消。
14. CURRENT_STATEの現役固有情報を保持。
15. BACKLOG/planned product task 0 / retired decisions保持。
16. future git_only deletion policyをretireし、legacy missing historyを捏造しない。
17. TASKS.htmlがTASK-001〜020を表示し、unknown trackingは未記録、freshness PASS。
18. PRODUCT_IDENTITIES/product docs integrity semanticsを保持。
19. root launcher/local-main completion safety保持。
20. product source/financial rules/data/dependency/product docs/launcher content変更なし。
21. required focused/local regression PASS。
22. exact candidate push + clean worktree。
23. separated read-only Luna Max VERIFY PASS。
24. Actions unavailable時formal CI=PENDING_REMOTE_CI、PASSではない。
25. main統合はGPT明示承認後のみ。
26. integration後real downstream Plan CURRENT/Enrolled=true/VALID、またはsafe concrete failure。
27. GitHub-native returnとTASK/EVENTS/TASKS.html/pointer整合PASS。

## Spec Change Resolution — Shared 2.0.7

- Shared TASK-183 resolved the formal-CI minimal record / orchestration envelope contradiction and released Shared 2.0.7 at `ba478e518e895e89aaa56156d5d713f5ebb11fe6`.
- Prior candidate `e019f737f52e8e499126478ae46dba4e7cf82166` remains historical evidence only. Its local checks, separated VERIFY and formal CI SUCCESS are preserved but do not satisfy the new 2.0.7 lock candidate.
- The only required product-side spec delta is the Shared target identity from 2.0.6 to 2.0.7. All finance/product preservation requirements and Acceptance Criteria otherwise remain unchanged.
- Same Codex Main resumes with a bounded lock rebase, affected validation, new candidate, separated VERIFY and exact CI.
- main integration still requires a new explicit GPT approval for the new candidate.

## Reader Compatibility Resolution — Shared 2.0.8

- Shared TASK-184 resolved the 2.0.7 historical ordinary-event misclassification and released Shared 2.0.8 at `a306ba59f33b156c1e801618bdfa892c411ce7d0`.
- The exact TASK-020 E0011 `actions_availability_observation` fixture is accepted as an ordinary event, and the current history resolves E0040 uniquely.
- The failed 2.0.7 resume remains preserved as a zero-write/claim-not-acquired event; no historical rewrite is required.
- The active migration target is now Shared 2.0.8. All finance/product preservation requirements and Acceptance Criteria otherwise remain unchanged.
- Same Codex Main resumes only for bounded 2.0.8 lock update, affected validation, new candidate, separated VERIFY and exact CI.
- main integration still requires a new explicit GPT approval for the new candidate.

## Current State

- Open blocking findings: none.
- The Shared 2.0.7 reader blocker is resolved by released Shared 2.0.8.
- Bounded 2.0.8 lock update and affected checks PASS; exact candidate 2853db2763d8f339d606a3c9664f350cafd878cc separated I12 VERIFY PASS and formal CI 35341533054 SUCCESS.
- GPT final Acceptance and conditional Completion authority: approved by E0058/E0061 for exact candidate 2853db2763d8f339d606a3c9664f350cafd878cc.
- Release commit/main: 92ac0fed7246d460cdeb6e7676c75731e474bda1; exact Governance CI main push run 35343524375 completed/success.
- Real released Shared2.0.8 downstream Plan on that main: CURRENT / Enrolled=true / Lock VALID / Adapter VALID, no downstream writes.
- Real local completion preflight on that exact main: launcher freshness PASS (316608 bytes), portable file:// Edge PASS (6 routes; storage preserved; runtimeRequests/consoleErrors/pageErrors=0), isolated gate clone clean/removed. WhatIf performed neither synchronization nor cleanup. Completion safety regression37 passed in both shells.
- Canonical clean local main was separately synchronized by fetch plus FF-only to Release main; user-owned changes were not erased.
- Completion commit/final main: 2f2f011689be893b0168e732dcd2c5358211e23f; exact Governance CI main push run35344212726 completed/success, all required steps passed. Redundant automatically generated run35344212596 was cancelled, not treated as PASS.
- Final-main production released Shared2.0.8 Plan: CURRENT / Enrolled=true / Lock VALID / Adapter VALID, no writes.
- Final local launcher freshness and portable file:// msedge gates PASS on exact final main. The first portable attempt read stale payroll content immediately after a route click and failed; a single bounded full unmodified-tool rerun passed all assertions. Failure is retained in EVENTS/raw evidence, not reclassified as infrastructure or erased. No source changes or waived gates.
- Production tool then synchronized canonical main by fetch/FF-only: clean main HEAD==origin/main==2f2f011689be893b0168e732dcd2c5358211e23f. It removed TASK files and Git worktree registration but returned Permission denied deleting the last empty root directory. Independent non-recursive non-force removal confirmed another process uses that path. Worktree prune and local branch deletion by git branch -d succeeded. Empty unregistered path residue is the exact safe-cleanup exception allowed by approval item12/completion conditions; no force/process termination/user-diff deletion.
- Cleanup scope: remove the clean, integrated TASK worktree and its local development branch non-forced after exact final-main CI and launcher/portable gates. Preserve the remote TASK transport branch while NEXT_ACTION/handoff need it, all immutable candidate refs, the original 9fbd3e candidate/ref and the unrelated TASK-015 worktree. Remote transport deletion would lose the required current coordination reference and is therefore not safe under approval item 12.
- Final exact-main CI/local synchronization/cleanup facts will be published as metadata-only GitHub-native return on the retained remote TASK transport; they do not create another product/main integration cycle.
- Original9fbd3e/ref, all historical/current immutable candidate refs and unrelated TASK015 worktree remain unchanged. No tag/GitHub Release/deployment/settings/data operations. Required source/product/main gates have no outstanding debt; only the disclosed empty-directory residue and required remote coordination reference remain.
- Next actor: GPT_ORCHESTRATOR.
