# RELAY HANDOFF — TASK-009

- relay_schema: 2
- task_id: TASK-009
- decision: REQUIREMENTS_DEFINED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-009-distribution
- reviewed_candidate: none
- candidate_commit: none
- reviewed_handoff_head: none
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: connector_read_only
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-009-distribution
- resolved_commit: 0dbc4fb102c92a6df12331540c6cc11010258f54
- next_action_blob: 3d418ad5b082c4963ddcf2f5bfafa8f95fc9a5ff
- handoff_blob: 66e5e20f97430ee8bd560579aacc458f5cb832d0
- adapter_blob: 3f9dd1a4e2e981fc58ddfd476c45e2f3d1748054
- review_stage: implementation

## Purpose

既存の金融計算・制度rule・保存dataを変えず、単一HTMLの初回版0.1.0を一意な正本から生成し、exact reviewed artifactをprivate repository内GitHub Releaseとallowlist済みpublic GitHub Pagesへ、手動・監査可能・再実行安全に配布する。

## Scope

- R01 Baseline／activation: origin/main commit 0dbc4fb102c92a6df12331540c6cc11010258f54、tree 12bc199fdc1f76ab187c1604838ad9b475afc71e、Governance CI 31758459149 SUCCESSを開始時にexact確認し、専用branch codex/task-009-distributionでspec revision 1をactivationする。zero-active、tag 0、Release 0、Pages未構成から外れる場合は変更せずBLOCKEDとする。
- R02 Version: 初回versionは0.1.0、tagはv0.1.0、Release titleはPersonal Finance Planner v0.1.0、classificationはprerelease。package.jsonを唯一のversion正本とし、package-lock、UI、manifest、tag、titleをderived／validatorでexact一致させる。
- R03 App information: settingsにread-onlyでversionと制度確認日（手取り2026-08-12、NISA 2026-08-12、iDeCo 2026-08-13）を既存rule metadataから表示する。AppState、migration、localStorage、backup/import/exportへ保存せず、表示だけでwriteしない。
- R04 Artifact: root Personal-Finance-Planner.htmlを唯一の配布HTML正本とし、Release asset、Pages index.html、Pages download HTMLをtarget commitのroot launcherとbyte-exact同一にする。release-manifest.jsonとSHA256SUMS.txtはdeterministic UTF-8 no BOM／LF／末尾LF1でversion、tag、commit、SHA-256、bytes、制度確認日を記録する。
- R05 Allowlist: Pages stagingはindex.html、Personal-Finance-Planner.html、release-manifest.json、SHA256SUMS.txt、.nojekyllだけを許可し、source、test、docs、node_modules、repository/TASK/user data、secret、source map、symlink／hard link／junction、想定外pathを拒否する。
- R06 Publication surface: repository visibilityはprivateのまま、GitHub Pagesをpublic user-facing surface、private repository内GitHub Releaseをversioned audit/download surfaceとする。custom domain、別public repository、第三者hosting、CDN、analytics、telemetry、backend、runtime external fetchを追加しない。
- R07 Workflow security: 配布workflowはworkflow_dispatch専用、同一version concurrency付き、GitHub公式actionだけを実装時点のstable majorに対応するimmutable full commit SHAへpinする。job-level least privilegeとし、build=contents:read、CI照合=actions:read、release/tag jobのみcontents:write、Pages jobのみcontents:read/pages:write/id-token:write、github-pages environmentとneedsを用いる。
- R08 Preflight: side effect前にversion、target SHA=current origin/main、exact main push Governance CI SUCCESS、launcher freshness、全test、allowlist、manifest/checksum、tag/Release不存在、Pages inputを検証する。APPROVED release headのmain統合とexact main CI前、またはpreflight失敗時はtag、Release、Pagesを作成しない。
- R09 Release order: 全preflight PASS後、v0.1.0 tagをexact targetへ作成し、draft prereleaseとassetを準備し、Pages deploy、deployment URLのraw-byte/live browser検証、最後にRelease publishの順で進める。draft時点やworkflow開始だけでは公開完了としない。
- R10 Idempotency／failure: 既存tag、Release、asset、Pagesを上書き・移動・削除しない。rerunは全identityがexpected exactな場合だけ不足工程を再開し、相違時はBLOCKED。partial failureでは自動rollback／unpublishをせず、作成済みobjectと停止工程を監査記録してGPTへ返す。
- R11 Documentation／evidence: README、release notes、docs/product/RELEASE_CHECKLIST.md、settingsへversion、commit/hash、制度確認日、concept-only disclaimer、offline/no-backend、backupと同一path置換、file://とPagesの別origin/storage、既知制約、partial failure手順を整合記載する。browser evidenceは主要route、reload、360px、keyboard/focus、storage、backup/export/import、console/page error 0、unexpected runtime request 0を必須とする。
- R12 Lifecycle: implementation candidateではworkflow/tool/UI/docs/testsまで完成させるが公開side effect 0。candidate exact CI後にhandoff-only commitを作りproduction diff 0でレビューし、APPROVED import→release branch CI→main fast-forward→exact main CI→distribution→local completion→canonical completion sync→final main CIの順を守る。
- R13 Governance: shared v0.12.20／commit 10cd1466b10f814f1bd2aab2c5f6ba6465c5899eとaccepted delivery-plan identityを維持し、docs/ai/generated/shared/**を直接編集しない。activationではTASK packet/state/product要件/affected PRODUCT_IDENTITIESだけを同期し、製品実装を開始しない。
- R14 Non-regression: 税・社会保険・手取り・NISA・iDeCo・overviewの計算、rule値/期間/source selection、AppState schema、migration、storage key、backup/import/export semantics、既存user bytesを変更しない。standalone file://、offline、hash route、runtime external requests 0を維持する。
- R15 TASK-012 directory: 残存空directoryはnon-blocking。registered worktreeでない、empty、unlock済みを確認できる場合だけ通常削除し、force削除や内容／lock不明時の削除を行わない。削除不能でもTASK-009を継続する。

## Out of scope

- 金融制度値・計算・保存data contractの変更、financial recommendation化、制度再確認なしのverifiedAt更新。
- repository公開化、別public repository、custom domain、installer/desktop app、backend/login/cloud sync、銀行・証券API、第三者配布基盤。
- 完了TASKの再active化／再レビュー、TASK-004/005 attempt 4、v0.1.0以外の公開、stable 1.0宣言。
- activation exact CI前の製品実装、APPROVED・exact main CI前のtag／Release／Pages／distribution。

## Required changes

- none

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- AC01 R01/R13: import後はTASK-009だけがactiveとなり、TASK、CODEX_HANDOFF、CURRENT_STATE、NEXT_ACTION、BACKLOG、Progress、canonical relay/report、docs/productとaffected identitiesがrevision 1へ同期する。activation commitは許可された要件正本だけを含み、exact branch Governance CI SUCCESS後にSTOPする。
- AC02 R02/R03/R14: 0.1.0と制度確認日が正本から一致表示され、State/storage/backup bytes、migration、金融計算、rule値・期間への目的外diffが0。
- AC03 R04/R05: root/Release/Pages HTMLのSHA-256とbytesが一致し、manifest/checksumは2回生成で同一、allowlist外file/link/secret/path traversalを拒否する。
- AC04 R06/R07: repositoryはprivateのまま、Pagesはallowlistだけを公開し、workflow_dispatch only、official full-SHA actions、job-level least privilege、concurrency、github-pages environment/needsを静的検証できる。
- AC05 R08: wrong version/SHA/main/CI、stale launcher、digest/allowlist不一致、conflicting tag/Release、Pages未準備を公開side effect 0で拒否する。Pages初期設定はAPPROVED main CI後だけGitHub Actions sourceとして実施し、権限不足は迂回せずBLOCKEDとする。
- AC06 R09/R10: tag→draft asset→Pages→live検証→prerelease publishのidentityを監査でき、exact partial stateからのみ再開し、相違や失敗時に既存objectを自動変更しない。
- AC07 R11: release docsとsettingsが必須注意事項を整合表示し、file:// portable smokeとPages live browser evidenceがconsole/page error 0、unexpected runtime request 0でPASSする。
- AC08 R12: candidate→handoff production diff 0、review attempt 1/standard/cycles 0から開始し、APPROVED release/main/distribution/local completion/final CI identityがGit履歴から追跡可能。
- AC09 R15: TASK-012 directoryはempty/unregistered/unlocked確認後の通常削除だけを許し、force操作0。残存してもactivation/implementationを停止しない。
- AC10 完了時はtag v0.1.0がapproved targetを指し、prerelease assets/manifest/checksum/Pages bytesが一致し、local main==origin/main、main clean、TASK-009 worktree安全削除、active_tasks=[]、final main Governance CI SUCCESSとなる。

## Tests

- T01 Activation/governance: PowerShell 7とWindows PowerShell 5.1でgovernance、REQUIREMENTS_DEFINED smoke、audit identity/normalization、overlay、completion matrixをPASSし、startup contextは65536 bytes以下（目標61440以下）。
- T02 Regression/build: npm ci、typecheck、lint、format:check、全Vitestとrules/nisa/ideco/overview、build、verify:launcher、portableを既存count非減少でPASS。
- T03 Metadata/state: version source consistency、rule-date source binding、settings read-only、AppState/storage/export/migration/financial result不変を検証。
- T04 Artifact: deterministic staging、HTML byte identity、manifest/checksum encoding、allowlistとextra file/link/secret/path traversal negative casesを検証。
- T05 Workflow: trigger/action pin/permissions/concurrency/environment/needsのstatic testと、wrong input/CI/conflict/Pages未構成をside effect 0で拒否するpreflight test。
- T06 Recovery: tag only、draft、assets、Pages deployed、publishedのpartial-state simulationでexactなら再開、mismatchならBLOCKEDかつ自動削除0。
- T07 Browser: staged HTTPとfile://（別folder、日本語/空白path）、公開Pagesで主要route、reload、responsive、keyboard、settings、storage、backup/export/import、download/hash、network/error evidenceを検証。
- T08 Gates: activation/candidate/handoff/release branch/main/final Governance CI、manual distribution workflow、live downloaded SHA/bytes、local completionを各exact identityで確認。

## Forbidden changes

- F01 R03/R14に反するState/schema/migration/storage/backup/import/export、金融計算、rule値/期間/verifiedAt、user data bytesの変更。
- F02 repository visibility変更、allowlist外公開、custom domain/別repository/第三者host、runtime dependency、analytics/telemetry/backend、secret/PAT保存・出力。
- F03 push/PR/schedule/release自動配布、write-all、不要権限、unpinned/第三者action、exact main CIまたはAPPROVED前の公開side effect、CI/validator/browser gate迂回。
- F04 tag move/delete/recreate、Release asset overwrite/自動削除、Pages自動unpublish、identity不一致rerun、partial failureのSUCCESS扱い。
- F05 root/Release/Pages HTMLの別々の手編集、docs/ai/generated/shared/**直接編集、PRODUCT_IDENTITIES不整合、完了TASK再active化／不正なreview attempt。
- F06 existing test削除/skip/assertion弱体化/count低下、browser/network/error evidence省略。
- F07 reset --hard、stash、git clean、restoreによる差分破棄、rebase、amend、squash、history rewrite、force push、filesystem force削除。
- F08 TASK-012 directoryのforce削除、内容/registration/lock不明時の削除、または残存だけを理由にBLOCKED／ユーザーrouteすること。

Validated full bundle: docs/ai/reports/TASK-009/RELAY_BUNDLE.json
