---
task_id: TASK-020
summary: Shared 2.0.6 governance migration and automatic SharedSync enrollment
status: ACTIVE
phase: Implementation
risk: high
definition_state: DESIGNED
implementation_state: NOT_IMPLEMENTED
static_verification_state: NOT_RUN
runtime_verification_state: NOT_REQUIRED
hold_state: NONE
hold_reason: null
progress: GPT統括 applied a BOM-only pre-bootstrap compatibility repair to the legacy adapter; migration implementation remains authorized and not yet started
next_action: Same Codex Main re-runs the canonical Shared 2.0.6 bootstrap, acquires the claim only after PASS, then executes the already-authorized bounded migration
next_actor: CODEX_MAIN
handoff_ref: docs/ai/handoffs/TASK-020_GPT_BOOTSTRAP_REPAIR_APPLIED.md
verify_state: NOT_RUN
current_candidate: null
ci_mode: extended
ci_mode_reason: legacy_shared_schema1_to_shared2_governance_migration_sharedsync_enrollment_ci_trust_boundary
formal_ci_state: NOT_RUN
formal_ci_subject_sha: null
target_shared_version: 2.0.6
target_shared_sha: e384d21a43fcda1195556d4ef6fa382bede48da8
baseline_main_sha: e7de34d7b36b7f6ec514d321a0b66381cc810fa2
legacy_shared_version: 0.12.20
legacy_shared_sha: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
---

# TASK-020 — Personal-Finance-Planner Shared 2.0.6移行・自動同期登録

## Goal

Personal-Finance-Plannerをlegacy Shared 0.12.20 / lock schema 1 / adapter schema 1から
現行Shared 2.0.6へ安全に移行し、恒久的なSharedSync自動同期へ登録する。

このTASKはgovernance migrationのみ。金融計算・rule package・AppState・product UI・保存データ・
product docs・過去TASKの承認状態を変更しない。

Target Shared:
- repository: `Osato-Gasu/shared`
- version: `2.0.6`
- commit: `e384d21a43fcda1195556d4ef6fa382bede48da8`

## Requirements

1. 新規TASK-020として実施し、TASK-001〜019の歴史的意味・承認/retired/blocked状態を改変しない。
2. legacy governance owner群を先にinventoryする。
   `PROJECT_RULES.md`, `WORKFLOW.md`, `CURRENT_STATE.md`, `PROJECT_ADAPTER.psd1`,
   `BACKLOG.md`, `PRODUCT_IDENTITIES.yml`, `PROJECT_REQUIREMENTS.md`, existing validators/tools/CIを確認する。
3. 明示的にShared 2.0.6へ置換するlegacy routing/snapshot/relay/review-attempt機構以外の
   Project固有契約を失わない。
4. 特に以下はnon-relaxableとして恒久Project ownerへ保持する。
   - monetary calculations
   - effective rule periods
   - double counting防止
   - data preservation / lossless migration
   - product requirements / required acceptance criteria
   - security / baseline-candidate identity
5. 旧「implementation review最大3回・第3回のみ限定緩和・4回目禁止」はlegacy orchestrationとして
   Shared 2.0.6のMain→BUILD→VERIFY自律修正ループに置換する。
   ただし上記financial non-relaxable categoriesは一切弱めない。
6. `docs/ai/SHARED_RULES.lock.yml`をschema 2のexact Shared 2.0.6 identityへ更新する。
7. root `AGENTS.md`をShared 2.0.6のsmall Project bootstrapへ移行する。
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
    Shared 2.0.6と重複するものだけ退役可能。削除前にProject固有情報が別ownerへ保存済みか証明する。
17. `CURRENT_STATE.md`のcurrent routing二重ownerは解消するが、以下の現役固有情報を失わない:
    - TASK-019 accepted product candidate/tree
    - TASK-004/TASK-005 historical unapproved/terminated status
    - TASK-009 retired / personal-use distribution decision
    - planned product backlog 0
    - no tag/release/deployment facts
18. `BACKLOG.md`の「計画済み製品TASK 0件」とhistorical carry-forward/retirement意味を保持し、
    migrationを理由に製品TASKを自動着手しない。
19. legacy `git_only` completion policyはfuture Shared 2.0.6 TASK trackingと競合するため、
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
29. approved integration後、released Shared 2.0.6 real downstream Planで
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

1. lock schema2 = Shared 2.0.6 exact identity。
2. AGENTSがShared 2.0.6 small bootstrap。
3. PROJECT.mdがfinance固有恒久rule owner。
4. monetary/rule-period/double-count/data-preservation等non-relaxable safety保持。
5. legacy 3-attempt review routingはShared 2.0.6 loopへ置換され、financial safetyは弱まらない。
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

## Current State

- Open blocking findings: none.
- Implementation authorized.
- Next actor: CODEX_MAIN.
