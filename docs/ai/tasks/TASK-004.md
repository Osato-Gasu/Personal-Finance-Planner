---
task_id: TASK-004
title: 手取り計算ベータ
status: review_requested
route: TWO_SESSION_FAST
priority: high
spec_revision: 1
spec_status: accepted
current_phase: implementation_review
current_role_id: ORCHESTRATOR_AND_REVIEWER
next_actor: ChatGPT
next_role: ORCHESTRATOR_AND_REVIEWER
assigned_model: 5.6 Sol
assigned_effort: high
session_mode: existing
handoff_file: docs/ai/handoffs/TASK-004/IMPLEMENTATION_REVIEW_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: Codex
browser_evidence_required: true
claude_design_review_recommendation: optional
claude_implementation_review_recommendation: optional
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_requested
claude_implementation_review_status: not_requested
base_commit: bfb64e6cc6edf5e2e6a1fd43bff670db2e3de054
base_tree: c375ef6c3b817fa1b733ebb7010ff03e365dbdfc
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
accepted_product_sha256: E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29
implementation_candidate: 106868ea12ebd6766cfa89499e6b12f9b341e08e
review_stage: implementation
changes_requested_cycles: 0
implementation_review_attempt: 1
implementation_review_profile: standard
implementation_review_final: false
implementation_review_terminated: false
review_kind: implementation
review_role: ORCHESTRATOR_AND_REVIEWER
execution_mode: separate_session
repository_access: true
review_status: requested
request_review_status: requested
review_model: 5.6 Sol
review_effort: high
reviewed_candidate: 106868ea12ebd6766cfa89499e6b12f9b341e08e
reviewed_spec_revision: 1
review_request_id: none
review_started_at: none
review_completed_at: none
review_result: none
review_findings_count: 0
review_finding_ids: none
actual_executor: ChatGPT
provider_substitution: none

updated_at: 2026-08-12
---

# TASK-004 — 手取り計算ベータ

## Purpose

2026年の日本国内給与所得者を対象に、本人とactiveな相手の年間法定控除後手取りを公式一次資料に基づく期間付きruleで安全に概算し、家計へ参照連携できる手取り計算ベータを提供する。

## Scope

- AppState schema version 3とschema version 1・2からの非破壊migration
- calculated planと既存link互換用legacy manual planの人物別管理
- 年収または月給・賞与、非課税通勤手当、所得控除、iDeCo掛金の入力
- 2026年分給与所得控除、基礎控除、累進所得税、復興特別所得税の年間概算
- 協会けんぽ健康保険、介護保険、2026年追加保険料、厚生年金、雇用保険のemployee負担概算
- 住民税manual annualまたはunsupported-uncomputedの明示
- 公式一次資料metadata、47都道府県coverage、期間境界、rule validatorとgolden test
- complete・incomplete・unsupported・missing-ruleを区別する純粋TakeHome Domain
- TakeHomePlanを正本とするbudget linked valueとstale copy防止
- #/take-homeのresponsive・keyboard対応UI、適用rule・一次資料・warning表示
- Store action、Repository transaction、overflowのpre-write拒否と無効action副作用なし
- standalone single HTMLのfile起動、portable browser、runtime request 0

## Out of scope

- 複数事業所、年途中就退職、特殊給与区分、給与所得以外、確定申告・年末調整書類・月次源泉徴収再現
- 住宅ローン控除等の税額控除、扶養等の個別自動控除、iDeCo上限判定
- 組合健保・共済の自動料率、全国自治体住民税自動計算、2027年以降の自動計算
- NISA・iDeCo計画完成、外部連携、backend、deployment、tag、release
- TASK-003で受容済みのschema v1改行表示名問題の修正

## Acceptance criteria

- TASK-004 governance正本一式が同期しTWO_SESSION_FASTのimplementationへ遷移する
- schema v1・v2を元bytesとID・link月額を維持してv3へ冪等migrationでき、corrupt v3や保存失敗でfallback・部分更新しない
- TakeHomeResultを永続化せずplan・member・ruleから決定的に導出する
- 本人と相手のplanを分離し同一人物・対象年のactive calculated plan重複を拒否する
- 2026年給与所得控除・基礎控除・累進所得税・復興特別所得税を単一固定率なしで正しい境界と端数処理により算出する
- iDeCoあり・なしを再計算して所得税差額を求め、住民税効果は未計算と明示する
- 協会けんぽを事業所都道府県・対象期間で解決し47都道府県を網羅する
- 健康・介護・追加保険料・厚生年金・雇用保険を給与・賞与と期間ごとに分離しemployee負担だけを控除する
- 組合健保等へ協会けんぽを代用せずmanual・unsupported社会保険を扱う
- 住民税manual・uncomputedを区別し未計算を0円で完成扱いしない
- annual gross、各控除、年間・月平均手取り、控除率、status、warning、unsupported、applied ruleを表示する
- 公式一次資料だけをrule根拠にしsource URL・期間・確認日を表示する
- rule validatorがmetadata・期間・coverage・等級・階層・missing・overlap・future yearを検証する
- plan更新をbudget linked値へ即時反映しincomplete等を0円化せず人物不一致と重複linkを拒否する
- 無効action・migration・save・import失敗時にState・bytes・writer・listenerを不変にする
- 金額overflowをwriter前に拒否し既存計算範囲外Stateは非破壊で未計算表示する
- 既存家計MVP、146 tests、Store、Repository、RuleResolver、検索、routing、portable behaviorを後退させない
- #/take-homeが360px幅・keyboard操作可能な実用画面で、自動保存失敗と未対応条件を文字表示する
- standalone dist/index.html単体のfile起動、5 route、history、reload、same-path localStorage、runtime request 0が成立する
- PowerShell 5.1・7、typecheck、lint、format、全test、build、portable、rule golden、schema migration、candidate exact CIが成功する
- docs/productとgenerated shared snapshot、main、tag、releaseを変更せず意図したfileだけをcommitする

## Tests

- 所得税ruleの給与所得控除・基礎控除・税率階層・復興税・iDeCo差額の独立golden boundary tests
- 社会保険ruleの47都道府県、rate期間、介護年齢、標準報酬・賞与、厚生年金、雇用保険区分・端数・manual・unsupported tests
- rule validatorのmetadata、publisher、https、期間、coverage、missing、overlap、future year negative fixtures
- schema v3 invariant、v1・v2 migration、legacy link、Repository load/save/import transaction tests
- TakeHome calculation、complete/incomplete/unsupported/missing-rule、overflow、人物分離 tests
- Store actionsとlinked valueの正常系・拒否系・副作用なし tests
- system EdgeまたはChromeのstandalone file portable scenario 36項目と既存budget scenario
- PowerShell 5.1・7 governance/product identity smokeとnpm typecheck/lint/format/test/build/test:portable

## Build

- npm ci
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test
- npm run build
- npm run test:portable

## Rollback

discard the isolated TASK-004 branch and preserve main at the fixed baseline

## Forbidden changes

- main、tag、release、source branch削除、force push、reset、stash、clean、restoreを行わない
- ユーザー所有差分、既存clone、他TASK worktreeを読み取り・変更・削除しない
- generated shared snapshotとdocs/productを変更しない
- runtime CDN・外部API・backend・dist commitを追加しない
- 非公式または出典不明の制度値、将来rule自動延長、全国一律住民税、組合健保への協会けんぽ代用を行わない
- test削除・skip・成功条件弱体化・TASK外refactorを行わない
- ユーザー判断が必要な場合にCodexから直接依頼せずNEEDS_USER_DECISIONでChatGPTへ返す
