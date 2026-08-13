---
task_id: TASK-008
title: データ保全・UX完成
status: ready
route: TWO_SESSION_FAST
priority: normal
spec_revision: 1
spec_status: accepted
current_phase: implementation
current_role_id: IMPLEMENTER
next_actor: Codex
next_role: IMPLEMENTER
assigned_model: 5.6 Sol
assigned_effort: high
session_mode: new
handoff_file: docs/ai/handoffs/TASK-008/CODEX_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: ChatGPT
browser_evidence_required: true
claude_design_review_recommendation: optional
claude_implementation_review_recommendation: optional
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_requested
claude_implementation_review_status: not_requested
base_commit: c3cf916048d59867e016b2979e6d0875fb563c82
base_tree: cf40250e338056abdb486408a32c7fda560d2039
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
accepted_product_sha256: FC4483E4705C32908B72BA1E23F23E1F76FC31AD52F0527C41663852E58264DF

updated_at: 2026-08-13
---

# TASK-008 — データ保全・UX完成

## Purpose

既存の家計・手取り・NISA・iDeCo・統合サマリーの計算結果を変更せず、localStorageデータの安全な保存・migration、JSON backup/export/import、backup reminder、schema v1互換データのlossless preservation、settings・error state・responsive・keyboard/focus/label等のUX完成、常設main folder直下のPersonal-Finance-Planner.htmlダブルクリック起動、TASK完了後の常設main checkout同期、完了TASK worktreeの安全な削除までを完成させる。TASK-008ではデータを失わないことを最優先の非緩和条件とする。

## Scope

- TASK-008はspec revision 1、implementation review attempt 1、standard、changes_requested_cycles 0、final false、terminated false、attempt 4 forbidden falseから開始する。
- exact baselineはorigin/main commit c3cf916048d59867e016b2979e6d0875fb563c82、tree cf40250e338056abdb486408a32c7fda560d2039、Governance CI workflow 31693464952 SUCCESSとし、専用branch codex/task-008-data-preservation-uxをこのexact baseから作成する。parent 398f0dae73a12050fa2781445aab8a793c758137はTASK-007 release headでありTASK-008 baselineには使用しない。開始直前にorigin/mainをfetchし、commit/treeが一致しなければ自己更新せずrepositoryを変更しないでGPTへBLOCKEDとする。
- baseline stateはactive_tasks=[]、next_action='ChatGPT defines TASK-008 requirements from the permanent handoff and BACKLOG'、TASK-007 completed、TASK-008 queued/requirements、TASK-009 queued/requirements。sharedはversion 0.12.20、commit 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e、manifest SHA-256 94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FE。
- 要件materialize時はdocs/ai/handoffs/PROJECT_REQUIREMENTS.md、docs/ai/BACKLOG.md、docs/ai/CURRENT_STATE.md、docs/product/REQUIREMENTS.md、ARCHITECTURE.md、DATA_MODEL.md、DELIVERY_PLAN.md、REVIEW_POLICY.md、docs/ai/PROJECT_RULES.md、WORKFLOW.md、PROJECT_ADAPTER.psd1、PRODUCT_IDENTITIES関連正本を読み、矛盾なくTASK-008 spec revision 1を作成する。
- TASK-003 carry-forwardは必須・非緩和。schema v1 HouseholdMember.displayNameにはLF、CR、CRLFを含むotherwise-valid既存値が存在し得る。migrationだけを理由にrejectせず、migration後内部値をlosslessに保持し、legacy storage bytesをbyte-exactに維持する。settingsを開くだけ、rerender、route切替、reload、partner active切替、backup設定等の名前と無関係な保存で変更しない。single-line inputのDOM正規化値をStateへ自動write-backせず、legacy compatibility valueとUI edit bufferを区別する。ユーザーが明示的に表示名を編集・保存した場合だけ変更し、silent trim/truncate/newline除去をしない。新規入力へsingle-line制約を課す場合はvalidation errorとして明示し既存legacy値を自動修復しない。import previewでもlosslessに保持し、cancel/reject時にcurrent Stateを変更しない。必須fixturesは「本人\n旧名」「本人\r旧名」「本人\r\n旧名」、前後空白、50文字超legacy名、日本語・記号。
- Data preservation/migration: current AppState schemaVersion 5を開始正本とし、永続化shape変更が必要な場合だけ次schemaへの一方向migrationを設計する。v1～v5/currentをcurrentへmigration可能、migration前legacy bytesを削除・上書きしない、migration失敗時legacy/current bytes不変、corrupt currentが存在する場合にvalid legacyへ黙ってfallbackして上書きしない、unknown key blind merge禁止、migration/import後はschema validationと全invariant validation後だけcommit、unsafe integer/broken active link/member mismatch等を拒否、deterministic、currentへの再migration idempotent。
- JSON backup/export: settingsからcurrent AppState正本だけをUTF-8 JSONとしてexportしschemaVersionを含む。derived overview等を重複保存しない。export前validate。JSON生成またはbrowser file handoff失敗時は成功表示しない。成功時だけlastExportedAt更新し最終backup日時を表示。backup metadata追加でschema変更が必要なら正式migration。exportで金額・計画・リンク等の既存値を変更せず外部network送信禁止。
- JSON import: read bytes→size limit→JSON parse→schema判定→in-memory migration→schema validation→invariant validation→preview→user confirmation→atomic replacementの順序に固定。preview前/confirmation前write 0。parse/migration/validation failure、cancel/reject時にcurrent State/storage bytes不変。成功時のみatomic replacement。broken active link、member mismatch、unsafe amount等を拒否。prototype pollutionにつながるblind merge禁止。有限size limitを設け定数・理由を文書化。v1～currentを受理しlegacy newline displayNameをlosslessにpreview/migrate。成功後reloadで同一state復元。
- Backup reminder: BackupMetadataのlastSuccessfulSaveAt、lastExportedAt、reminderIntervalDays、reminderDismissedUntilを扱う。backup未実施または設定期間超過時だけwarning。金融計算へ影響させない。dismissは期限付きでlastExportedAtを偽装しない。export成功時だけlastExportedAt更新。clock/reference dateはtest可能に注入。overview backup warningもBackupMetadataから導出し固定warning禁止。
- Settings/UX: #/settingsを完成させ、人物設定、backup/export、import、backup reminder設定、保存状態、schema/version、data preservation注意、file://保存領域注意を扱う。360pxで常態的横scrollなし、keyboard-only主要操作、visible focus、label/input関連、適切なfieldset/legend、色だけに依存しないstatus。errorは操作付近、expected errorでwhole-page crashしない。destructive importにはconfirmation。user textはtextContent等。error時に既存Stateを0/defaultへ置換しない。
- Root launcher: 常設main folder Personal-Finance-Planner直下にGit管理対象Personal-Finance-Planner.htmlを置き、end userがダブルクリックだけでfile://起動できる。HTTP server/Node.js/npm不要、runtime外部通信0、JavaScript/CSS/asset inline、HTML単体を別folderへコピーしても起動、空白・日本語path対応、hash routing、same-path localStorage reload維持。dist/index.htmlは内部build artifactとして維持可。root launcherは手編集する第二正本にせずstandalone buildから決定的に生成・同期し、staleならCI失敗。通常利用pathはPersonal-Finance-Planner/Personal-Finance-Planner.htmlで固定しTASKごとにfilenameを変えない。移動/renameでbrowser保存領域が変わる可能性をREADME/settingsへ明示し移動前backupを案内。
- TASK completion local-main flow: 常設main checkout=Personal-Finance-Planner、TASK用worktree=専用branch別folder。remote main統合だけでは完了扱いにせず、implementation review APPROVED、release/completion state origin/main統合、origin/main exact CI SUCCESS、local main worktree一意特定、folder名Personal-Finance-Planner、clean、fetch+ff-only同期、local main HEAD==origin/main、root launcher最新版、launcher portable smoke PASS、TASK worktree clean、完成commit origin/main reachable、安全なworktree remove、git worktree prune、cleanup後状態確認、completion sync正本更新までをcompletion条件とする。main worktreeを通常TASK実装に使用しない。
- main同期安全: reset --hard、stash、git clean、restoreによるユーザー差分破棄、rebase、history rewrite、force push禁止。tracked/untrackedユーザー差分あり、ff不能、判別不能なら自動解決せずBLOCKED。
- TASK worktree cleanup: 削除前にmain worktreeでない、完了対象TASK、clean、untracked user fileなし、merge/rebase/cherry-pick未解決なし、完成commitがorigin/main reachable、origin/main exact CI SUCCESS、local main同期済み、launcher検証済みを確認。条件成立時だけgit worktree remove、その後git worktree prune。filesystem強制削除を先にしない。dirty/unknownはBLOCKED。task branch削除は必須でない。Git history/audit evidenceは保持。
- completion automation: 後続実装でtools/complete-task-local.ps1または同等toolを追加。git worktree list --porcelain等からworktree解決しabsolute path hardcode禁止。main folder名、branch/HEAD、clean/untracked、origin/main、ff-only、launcher freshness、launcher portable smoke、commit reachability、TASK worktree safe remove、pruneを検証。failure時non-zero。destructive operation前に全precondition検証しuser dataを破棄しない。
- Product/governance source updates: requirements materialize時にdocs/product/REQUIREMENTS.md、ARCHITECTURE.md、DATA_MODEL.md、DELIVERY_PLAN.mdと必要なPRODUCT_IDENTITIESを更新する。TASK-008へbackup、reminder、migration、v1 newline compatibility、settings UX、root launcher、completion safety contractの製品関連部分を含める。TASK-009へGitHub Release、distribution automation、static deployment、release checklist、配布version管理を残す。docs/ai/PROJECT_RULES.md、WORKFLOW.md、PROJECT_REQUIREMENTS.md、必要ならPROJECT_ADAPTER.psd1へcompletion flowを恒久反映。docs/ai/generated/shared/**直接編集禁止。PRODUCT_IDENTITIESはrepository-native toolingで再計算・同期。
- REQUIREMENTS_DEFINED Validate/Import後、TASK-008、CODEX_HANDOFF、CURRENT_STATE、NEXT_ACTION、BACKLOG、Progress、canonical RELAY_BUNDLE、RELAY_IMPORTを同一transactionへ同期しTASK-008をactive化する。requirements activation-only commitは製品実装を含めずpushしexact GitHub Actions SUCCESS確認まで行う。
- 今回のCodex実行範囲は、1 exact origin/main fetch、2 baseline commit確認、3 tree確認、4 workflow 31693464952 SUCCESS確認、5 clean worktree、6 target branch作成、7 TASK-008 spec revision 1、8 docs/ai/tasks/TASK-008.md、9 docs/ai/handoffs/TASK-008/CODEX_HANDOFF.md、10 canonical requirements relay/report、11 CURRENT_STATE同期、12 NEXT_ACTIONをCodex implementation ready stateへ同期、13 BACKLOGからTASK-008 queued row除去、14 board/PROGRESS生成、15 docs/product正本更新、16 PRODUCT_IDENTITIES再計算・同期、17 PROJECT_RULES/WORKFLOW/permanent handoffへcompletion flow、18 shared/generated直接編集なし確認、19 validator、20 PowerShell 7、21 Windows PowerShell 5.1、22 requirements activation-only commit、23 push、24 exact GitHub Actions SUCCESS、25 STOP、26 GPTへ返却。activation exact CI SUCCESS前にsrc/**、tests/**、package、workflow、launcher生成、backup/import/export/migration/settings/completion tool実装を開始しない。

## Out of scope

- 税・社会保険・NISA・iDeCo制度値、rule期間、金額計算式、既存Domain calculation behaviorの変更。
- TASK-004/TASK-005再レビュー、attempt 4、retroactive approval、active化。TASK-006/TASK-007再レビュー・再active化。
- cloud sync、login、backend、銀行・証券API、複数端末自動同期。
- GitHub Release、static deployment、installer、distribution automation、release checklist、配布version管理等TASK-009実装。
- financial recommendation、task branch強制削除、dirty/unknown worktree強制削除。
- requirements activation exact CI SUCCESS前の製品実装。

## Acceptance criteria

- REQUIREMENTS_DEFINED import後、TASK-008、CODEX_HANDOFF、CURRENT_STATE、NEXT_ACTION、BACKLOG、Progress、canonical relay/reportがspec revision 1、branch、phase、actor、model/effortへ同期し、active TASKがTASK-008だけになる。
- exact base commit c3cf916048d59867e016b2979e6d0875fb563c82、tree cf40250e338056abdb486408a32c7fda560d2039、workflow 31693464952 SUCCESSとbranch baseが一致する。
- activation-only commitは製品実装差分を含まず、必要なdocs/product要件正本、PRODUCT_IDENTITIES、project governance、TASK packet/state同期だけを含む。
- shared v0.12.20 identityを維持し、変更したdocs/productのPRODUCT_IDENTITIES accepted identityをrepository-native toolingで再計算・同期する。
- v1～current migration lossless、migration failure non-destructive、corrupt currentをlegacyでsilent overwriteしない。
- v1 CR/LF/CRLF displayNameがmigration、settings表示、無関係保存、rerender/route/reload、export/importを通じsilent mutationしない。intentional edit/saveのみ変更可能。
- invalid import、preview、confirmation前、cancel、parse/migration/validation failureでcurrent storage bytes不変。successful importだけatomic replacement。
- export成功時だけlastExportedAt更新し、backup reminder dismissとlastExportedAtを混同しない。
- settings UXがkeyboard-only、visible focus、semantic labels、360px、非色依存status、安全なtext描画を満たす。
- root Personal-Finance-Planner.htmlをダブルクリックしてfile://起動でき、HTTP server/Node.js/npm不要、runtime requests 0、console errors 0、page errors 0。
- root launcher単体を空白・日本語pathへコピーして5 routes、history、reload、same-path localStorageが動作し、standalone buildとのfreshnessを検証してstale launcherをCIで検出する。
- dirty/untracked mainではcompletion拒否し、main同期はfetch+ff-onlyのみ。ff不能はBLOCKED。
- dirty/untracked/未解決operation/main worktree/unreachable commitのTASK worktree cleanupを拒否し、clean/reachableかつmain同期・exact CI・launcher検証済みだけgit worktree remove+pruneできる。
- completion automationはabsolute path hardcodeなし、destructive前全precondition検証、failure non-zero、user data自動破棄なし。
- 既存money/rule/source selection/double-count/data semanticsに回帰なし。
- baseline 429 Vitest、69 take-home、68 NISA、86 iDeCo、28 overview、262 portableを削減・skip・弱体化しない。
- requirements activation exact GitHub Actions SUCCESS確認後にSTOPし、製品実装へ進まずGPTへ返す。

## Tests

- PowerShell 7: validate-ai-governance、test-requirements-defined-smoke、validate-audit-identities、test-audit-identity-normalization、project overlay validator。
- Windows PowerShell 5.1: 同等governance/requirements/audit/project validation。
- requirements activation-only commit exact GitHub Actions SUCCESS。
- 実装時 migration: v1 LF/CR/CRLF、whitespace、50文字超legacy名、日本語・記号、unrelated save、reload、failure byte preservation、corrupt-current/no-fallback-overwrite、idempotence。
- 実装時 import/export: valid export、export failure、lastExportedAt success-only、current import、v1 import、invalid JSON、oversize、unknown/malicious object、broken active link、unsafe number、preview no-write、cancel no-write、failed migration no-write、successful atomic commit。
- 実装時 UX: settings keyboard-only、visible focus、labels、360px、error states、import confirmation、malicious displayName safe rendering。
- 実装時 launcher: freshness、single-file、空白・日本語path、direct open、5 routes、history、reload、localStorage、runtime requests 0、console errors 0、page errors 0。
- 実装時 completion tool: main worktree detection、folder validation、dirty main rejection、dirty task rejection、untracked rejection、main removal rejection、unreachable commit rejection、ff-only、successful safe remove、prune。
- npm ci、npm run typecheck、npm run lint、npm run format:check、npm run test、npm run test:rules、npm run test:nisa、npm run test:ideco、npm run test:overview、npm run build、npm run test:portable。
- baseline countsは429 Vitest、69 take-home、68 NISA、86 iDeCo、28 overview、262 portableを下回らず、TASK-008追加後の最終countをreportする。
- implementation candidate exact GitHub Actions SUCCESS後だけattempt 1/standard handoffを作り、handoff-only commit exact CI SUCCESSを確認する。

## Build

- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-requirements-defined-smoke.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-audit-identities.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-audit-identity-normalization.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test-requirements-defined-smoke.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/validate-audit-identities.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test-audit-identity-normalization.ps1
- npm ci
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test
- npm run test:rules
- npm run test:nisa
- npm run test:ideco
- npm run test:overview
- npm run build
- npm run test:portable
- requirements activation/import-only commit exact GitHub Actions SUCCESS
- implementation candidate exact GitHub Actions SUCCESS
- implementation review handoff-only commit exact GitHub Actions SUCCESS

## Rollback

relay import、generator、validator、requirements materialize、実装またはtest失敗時はtransactional byte-exact rollbackまたは意図したTASK-008変更だけの通常修正commitを用いる。reset、stash、clean、restore、rebase、amend、squash、history rewrite、force pushは使わず、origin/main、他TASK branch、ユーザー所有差分を変更しない。

## Forbidden changes

- activation exact CI SUCCESS前のsrc/**、tests/**、package.json、package-lock.json、.github/workflows/**変更。
- activation phaseでlauncher生成実装、backup/import/export実装、migration code変更、settings実装、completion tool実装。
- docs/ai/generated/shared/**直接編集。
- root Personal-Finance-Planner.htmlを手編集して第二正本化。
- corrupt currentをlegacyでsilent fallback/overwrite。
- legacy CR/LF/CRLF displayNameのsilent normalize/trim/truncate/newline除去/自動write-back。
- invalid import、preview/confirmation/cancel時のState/storage mutation。
- backup reminder dismissをlastExportedAtまたはbackup成功として扱うこと。
- runtime外部API/fetch/CDN/外部script/stylesheet依存追加。
- main worktree通常実装、TASK未完了worktree削除、dirty/unknown worktree強制削除、git clean、stash、reset --hard、restoreによる差分破棄、rebase、amend、squash、history rewrite、force push。
- origin/mainへ反映しただけでlocal main folderを古い状態のまま完了扱い。
- TASK-009配布実装の前倒し。
- 税・社会保険・NISA・iDeCo制度値、金額計算、rule period、double-counting behaviorの目的外変更。
- existing tests削除/skip/assertion弱体化/baseline count低下。
- TASK-004/TASK-005 attempt 4、retroactive approval、TASK-006/TASK-007再レビュー。
- baseline mismatch、relay SHA/bytes mismatch、validator/CI failureを無視して継続。
