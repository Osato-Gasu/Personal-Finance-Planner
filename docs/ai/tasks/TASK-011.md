---
task_id: TASK-011
title: TASK-005監査identity修復
status: ready
route: TWO_SESSION_FAST
priority: high
spec_revision: 1
spec_status: accepted
current_phase: implementation
current_role_id: IMPLEMENTER
next_actor: Codex
next_role: IMPLEMENTER
assigned_model: 5.6 Sol
assigned_effort: high
session_mode: new
handoff_file: docs/ai/handoffs/TASK-011/CODEX_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: ChatGPT
browser_evidence_required: true
claude_design_review_recommendation: not_needed
claude_implementation_review_recommendation: not_needed
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_applicable
claude_implementation_review_status: not_applicable
base_commit: bc80f31c4283aa0031ae4a4aec1d23ca8780b1e0
base_tree: 9c736ddada11f10d16f6618e3137bd6b350cb887
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
accepted_product_sha256: E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29
review_stage: implementation
changes_requested_cycles: 0
implementation_review_attempt: 1
implementation_review_profile: standard
implementation_review_final: false
implementation_review_terminated: false
attempt_4_forbidden: false
audit_identity_source_commit: 89895a6c9188b5011766ef4b848822bfccb0c597
audit_identity_source_path: docs/ai/reports/TASK-005/USER_DECISION_APPROVAL_ATTEMPT_3.json
audit_identity_git_blob: d42192e7534ca5e2dced23955743a5815fec6c38
audit_identity_sha256: F56B8FE68C7CBEF3768CF492476DE1E9C17FFF04A719A305D5C760FF487AF5A3
audit_identity_bytes: 34370

updated_at: 2026-08-13
---

# TASK-011 — TASK-005監査identity修復

## Purpose

TASK-005 attempt 3の承認監査artifactについて、commit済みLF bytesを唯一のraw-byte identity基準としてactual SHA-256／bytes／Git blobを再確立し、currentな参照をそのidentityへ一致させる。元の34723-byte／SHA-256不一致はFINDING-005-R3-01の歴史的証跡として保持し、CRLFまたはpre-commit working bytesとGitにcommitされたnormalized LF bytesのidentity driftを再発防止する。TASK-005のNISA製品candidateは製品source・製品test behaviorを一切変更せずcarry-forwardし、TASK-011を独立した新しい承認・release経路とする。

## Scope

- TASK-011はTASK-005 attempt 4ではない独立TASKとし、implementation reviewはattempt 1／standard／changes_requested_cycles 0／final falseから開始する
- exact baseはtransition source branch codex/task-005-nisa-betaのcommit bc80f31c4283aa0031ae4a4aec1d23ca8780b1e0、tree 9c736ddada11f10d16f6618e3137bd6b350cb887とする。origin/mainから直接開始しない
- 対象branchはcodex/task-011-nisa-audit-identity-repairとし、このREQUIREMENTS_DEFINED relayをtransactional importするためにCodexが新規作成する。ChatGPTはbranchを作成しない
- transition commit workflow 31613387302 SUCCESSをbase gateとして保持する
- carry-forward NISA product candidate d127f26a78342ab3d7674ee99e6f50d87532e891、tree fa83cf0bc4f7de19adc1dff92b8fd538dba3d443を製品実装の正本candidateとして継承する。candidate workflow 31600217793 SUCCESSを履歴として保持する
- TASK-005 review handoff 89895a6c9188b5011766ef4b848822bfccb0c597、tree 994d382f534b27f0277bd16fcaa0ce9792bf7a3e、workflow 31600750849 SUCCESSとtermination commit 83dfe4aa5b7e5d90887fc7b8cd3b73ad04a71a58、tree 5cc3249b1c7ad03480db44e1f2d8d7317f8a6093、workflow 31604535408 SUCCESSを監査履歴として参照する
- 監査対象pathはdocs/ai/reports/TASK-005/USER_DECISION_APPROVAL_ATTEMPT_3.jsonであり、handoff HEADにおけるcommitted Git blob d42192e7534ca5e2dced23955743a5815fec6c38、committed bytes 34370を起点にactual SHA-256をbinary-safeに再計算する
- repository EOL policy * text=auto eol=lfによりGitへcommitされたnormalized LF blob bytesを唯一のidentity基準とする。working treeのpre-commit bytes、CRLF bytes、PowerShell text再構成結果をraw-byte identityの基準にしない
- actual committed SHA-256／bytes／Git blobをTASK-011のcurrent監査report、TASK、handoff、必要なcurrent canonical referencesへ記録し、すべてをexact一致させる
- 永続的なcurrent監査正本としてdocs/ai/AUDIT_IDENTITIES.jsonを追加し、TASK-005 attempt 3 approval artifactのsource commit/path、actual SHA-256／bytes／Git blobと、FINDING-005-R3-01のhistorical declared SHA-256／bytesを役割が混同されない別fieldで保持する。git_only completion後もvalidatorがこのregistryを検証できるようにする
- 旧claim SHA-256 0143D33D69C56705FFA74B5E73265A4594681FA7E8440B743EF7658F6829731E／34723 bytesはFINDING-005-R3-01のhistorical declared identityとしてのみ保持し、current approval identityとして使用しない
- git_only task history policyを維持し、inactive TASK-005のhandoff/report directoryをcurrent treeへ復活させない。歴史的証跡はexact commit／path／blob／旧宣言identityへの参照としてTASK-011 auditへ保持する
- project-owned validator tools/validate-audit-identities.ps1とnegative/positive regression test tools/test-audit-identity-normalization.ps1を追加し、tools/validate-project-overlay.ps1から永続registry検証と回帰testを実行する。Git commit/pathからblobを解決し、そのblob object bytesをbinary-safeに読み取ってSHA-256／bytesを検証する。docs/ai/generated/shared/**は直接編集しない
- negative validator testではCRLF/pre-normalized working bytesから得た旧identityを入力した場合に、同内容をtext=auto eol=lfでGitへstage/commitしたLF blob identityとの不一致を確実に検出してFAILする
- positive validator testでは同じfixtureのexact committed LF blob bytesから得たSHA-256／bytes／Git blobを入力しPASSする
- PowerShell 7とWindows PowerShell 5.1の双方でbyte identity検証が同じ結果になるよう、native stdoutの暗黙text encodingやOut-File/Set-Contentによる再エンコードを介さずbinary-safeなbyte streamを用いる
- TASK-005 carry-forward candidateとTASK-011 implementation candidateのsrc/**、tests/**、tools/test-portable-build.mjsのproduct-test behavior差分をゼロにする。NISA計算、UI、AppState、migration、rule、product testsを変更しない
- TASK-005をretroactive APPROVEDにせず、blocked／implementation review terminated／attempt 4 forbidden／candidate未承認・main未反映の履歴を維持する
- TASK-011 candidateのみを新しいimplementation review、将来のapproval／release経路とする

## Out of scope

- TASK-005 implementation review attempt 4
- TASK-005の再レビュー
- TASK-005のretroactive approval
- NISA計算、UI、AppState、migration、rule、product testの変更
- TASK-004またはTASK-010の再active化・再レビュー
- iDeCo
- TASK-007統合サマリー完成
- TASK-008問題修正
- distributionまたはrelease
- history rewrite
- force push
- reset、stash、clean、restore
- origin/mainへの直接実装またはmain merge、tag、release
- docs/ai/generated/shared/**の直接編集
- TASK外refactor

## Acceptance criteria

- REQUIREMENTS_DEFINED relayのname、SHA-256、bytes、schema、repository、branch、route_result、recipient actor/role、base commit/tree、shared candidateをwrite前にexact検証し、TASK-011、CODEX_HANDOFF、CURRENT_STATE、NEXT_ACTION、BACKLOG/Progress、canonical relay、relay import auditを同一transactionでimplementation/Codex/5.6 Sol/highへ同期する
- TASK-011で許可される実変更はdocs/aiのTASK-011 state/handoff/report、docs/ai/AUDIT_IDENTITIES.json、board/PROGRESS.html、tools/validate-project-overlay.ps1、tools/validate-audit-identities.ps1、tools/test-audit-identity-normalization.ps1、およびこれらを既存CI gateへ接続するために不可欠なgovernance-only変更に限定する
- TASK-011専用branch codex/task-011-nisa-audit-identity-repairをexact base bc80f31c4283aa0031ae4a4aec1d23ca8780b1e0／tree 9c736ddada11f10d16f6618e3137bd6b350cb887から新規作成する。origin/mainから直接開始しない
- transition source branch codex/task-005-nisa-betaがbase作成時にbc80f31c4283aa0031ae4a4aec1d23ca8780b1e0を指し、workflow 31613387302がSUCCESSであることをpreflightする
- REQUIREMENTS_DEFINED transactional importはTASK-011 activation/state同期だけの独立commitとして作成・pushし、そのexact GitHub Actions SUCCESSを確認してからaudit identity repairのvalidator/report実装へ進む。activation commitにsrc/**、tests/**、product behavior変更を含めない
- origin/mainが74599efd2afedfa8c1fba196aaab51459571913e／tree 25a0d8acd4910e562a816814affa61de92d4fdbfのままであることを確認し変更しない
- shared v0.12.20 commit 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e、manifest SHA-256 94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FEをexact確認する
- accepted product identity docs/ai/PRODUCT_IDENTITIES.yml#requirements_*がSHA-256 E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29へ一致する
- carry-forward product candidate d127f26a78342ab3d7674ee99e6f50d87532e891／tree fa83cf0bc4f7de19adc1dff92b8fd538dba3d443を履歴上の未承認candidateとして保持し、TASK-011 candidateとのsrc/**、tests/**、tools/test-portable-build.mjs差分をゼロにする
- historical handoff HEAD 89895a6c9188b5011766ef4b848822bfccb0c597のdocs/ai/reports/TASK-005/USER_DECISION_APPROVAL_ATTEMPT_3.jsonがGit blob d42192e7534ca5e2dced23955743a5815fec6c38、34370 bytesであることをexact確認する
- actual committed approval artifact SHA-256をGit blob d42192e7534ca5e2dced23955743a5815fec6c38のexact object bytesからbinary-safeに再計算し、actual SHA-256／34370 bytes／Git blobをTASK-011のcurrent audit identityとして記録する
- docs/ai/AUDIT_IDENTITIES.jsonのcurrent identity fieldsはactual SHA-256／34370 bytes／blob d42192e7534ca5e2dced23955743a5815fec6c38だけを保持し、source_commit 89895a6c9188b5011766ef4b848822bfccb0c597とsource pathをexactに結び付ける。旧identityはhistorical_mismatch配下等の明示的なhistory-only fieldに分離する
- currentな全参照は上記actual committed identityへexact一致させ、旧0143D33D69C56705FFA74B5E73265A4594681FA7E8440B743EF7658F6829731E／34723-byte identityをcurrent claimとして残さない
- 旧SHA-256／34723 bytes、旧RELAY_HANDOFFの宣言、原因としてのCRLF/pre-commit対committed LF identity drift、FINDING-005-R3-01をhistorical evidenceとして明示的に保持する。旧identityを削除・改竄して歴史を書き換えない
- validatorはworking tree上のpre-commit file bytesを正本にせず、exact commit/pathから解決したGit blob object bytesまたは同等にrepositoryで採用されたnormalized committed contractを検証する
- validatorのGit blob byte取得はPowerShell 7/5.1ともbinary-safeであり、native text pipeline、ReadAllText、Out-File、Set-Content等による改行・encoding再構成をraw-byte identity計算に使用しない
- negative validator testはCRLF/pre-normalized identityを入力し、text=auto eol=lfでGitへ取り込まれたLF blob identityと異なるため確実にFAILする
- positive validator testはexact committed LF blob identityを入力しPASSする
- negative/positive testはtemp Git repositoryまたは同等のisolated fixtureでactual Git normalizationを再現し、project repositoryのhistory、index、worktreeを汚染しない。reset/stash/clean/restoreを使用しない
- tools/validate-project-overlay.ps1がtools/validate-audit-identities.ps1とtools/test-audit-identity-normalization.ps1をproject-owned gateとして呼び出し、shared validate-project経由のPowerShell 7/5.1 governanceの双方で実行される。docs/ai/generated/shared/**を直接編集しない
- shared validator、project overlay、PowerShell 7 governance、PowerShell 7 product identity smoke、PowerShell 5.1 governance、PowerShell 5.1 product identity smokeがすべて成功する
- npm ci、npm run typecheck、npm run lint、npm run format:check、npm run test、npm run test:rules、npm run test:nisa、npm run build、npm run test:portableがすべて成功する
- 既存315 Vitest、69 take-home focused、68 NISA focused、168 portable checksを削除、skip、弱体化せず、TASK-011でproduct testを変更しない
- portable/browser evidenceでruntime request 0、console error 0、page error 0を維持する
- TASK-005のNISA rule、計算、UI、AppState、migration、storage/import behavior、product testsの挙動を一切変更しない
- TASK-005はblocked／implementation review terminated／attempt 4 forbidden／candidate未承認・main未反映のままとし、retroactive APPROVEDへ変更しない
- TASK-004、TASK-010をactive化せず、TASK-007統合サマリー、TASK-008、iDeCoへscopeを拡張しない
- TASK-011のimplementation_review_attempt=1、profile=standard、changes_requested_cycles=0、final=falseとして開始し、TASK-005のreview countersを継承しない
- implementation candidateを固定してpushし、そのcandidate exact GitHub ActionsがSUCCESSとなる前にimplementation review handoffを作成しない
- candidate exact CI SUCCESS後だけTASK-011 implementation review attempt 1／standard／cycles 0／final falseのreportとhandoffを作成し、handoff-only commitのexact GitHub Actions SUCCESSも確認する
- implementation report／review handoffにbase transition commit/tree、carry-forward candidate/tree、historical handoff/termination identity、actual committed SHA-256/bytes/blob、旧declared identity、validator test evidence、全test counts、portable evidence、workflow run ID、runtime/console/page error、未解決事項を記録する
- main merge、tag、release、distributionを行わず、TASK-011 candidate exact identityをChatGPTへimplementation review用に返す

## Tests

- FINDING-005-R3-01 historical source identity: handoff HEAD 89895a6c9188b5011766ef4b848822bfccb0c597のRELAY_HANDOFF旧claimとapproval artifact blob d42192e7534ca5e2dced23955743a5815fec6c38／34370 bytesをexact検証
- docs/ai/AUDIT_IDENTITIES.jsonのcurrent fieldsとhistorical_mismatch fieldsの分離、source commit/path/blob exact bindingを検証
- TASK-011 completion sync後にactive TASK report/handoffがgit_onlyで消えても、docs/ai/AUDIT_IDENTITIES.jsonとproject-owned validatorだけでhistorical committed blob identityを再検証できる契約test
- binary-safe committed blob SHA-256 calculationがPowerShell 7と5.1で同一の64-hex SHA-256と34370 bytesを返す
- CRLF working fixtureをtext=auto eol=lfのtemp Git repoへstage/commitし、pre-normalized SHA-256／bytesをexpectedにしたvalidatorがFAILするnegative test
- 同fixtureのcommitted LF Git blobから得たSHA-256／bytes／blobをexpectedにしたvalidatorがPASSするpositive test
- 旧0143D33D69C56705FFA74B5E73265A4594681FA7E8440B743EF7658F6829731E／34723 bytesはhistorical fieldsでのみ許可し、current identity fieldsでは拒否するtest
- TASK-011 candidateとd127f26a78342ab3d7674ee99e6f50d87532e891のsrc/**差分ゼロ
- TASK-011 candidateとd127f26a78342ab3d7674ee99e6f50d87532e891のtests/**およびtools/test-portable-build.mjs差分ゼロ
- PowerShell 7: tools/validate-ai-governance.ps1、tools/test-requirements-defined-smoke.ps1、およびTASK-011 audit identity validator test
- PowerShell 5.1: tools/validate-ai-governance.ps1、tools/test-requirements-defined-smoke.ps1、およびTASK-011 audit identity validator test
- npm ci
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test: 315 Vitest baselineを下回らず既存test削除/skip/弱体化なし
- npm run test:rules: 69 take-home focused baselineを下回らず既存test削除/skip/弱体化なし
- npm run test:nisa: 68 NISA focused baselineを下回らず既存test削除/skip/弱体化なし
- npm run build
- npm run test:portable: 168 portable checksを下回らずruntime request 0、console error 0、page error 0
- TASK-011 activation/import-only commit exact GitHub Actions SUCCESS before audit identity implementation
- implementation candidate exact GitHub Actions SUCCESS
- implementation review handoff-only commit exact GitHub Actions SUCCESS

## Build

- pwsh -NoProfile -File tools/validate-ai-governance.ps1
- pwsh -NoProfile -File tools/test-requirements-defined-smoke.ps1
- pwsh -NoProfile -File tools/validate-audit-identities.ps1
- pwsh -NoProfile -File tools/test-audit-identity-normalization.ps1
- powershell -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1
- powershell -NoProfile -ExecutionPolicy Bypass -File tools/test-requirements-defined-smoke.ps1
- powershell -NoProfile -ExecutionPolicy Bypass -File tools/validate-audit-identities.ps1
- powershell -NoProfile -ExecutionPolicy Bypass -File tools/test-audit-identity-normalization.ps1
- TASK-011 activation/import-only commit exact GitHub Actions SUCCESS before audit identity implementation
- npm ci
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test
- npm run test:rules
- npm run test:nisa
- npm run build
- npm run test:portable
- implementation candidate exact GitHub Actions SUCCESS
- implementation review handoff-only commit exact GitHub Actions SUCCESS

## Rollback

relay importまたはvalidator失敗時はshared transactional importerのbyte-exact rollbackで今回transactionの変更だけを元へ戻す。reset/stash/clean/restore、history rewrite、force pushは使用しない。実装を破棄する場合はisolated TASK-011 branch/worktreeだけを安全に廃棄し、origin/main、transition source branch、TASK-005履歴を変更しない。

## Forbidden changes

- TASK-005 attempt 4の作成
- TASK-005の再レビューまたはretroactive approval
- TASK-005をactiveへ戻すこと
- carry-forward NISA product candidateのsrc/**変更
- NISA計算、UI、AppState、migration、rule、storage/import behaviorの変更
- tests/**またはtools/test-portable-build.mjsのproduct-test変更、削除、skip、assertion弱体化
- TASK-004またはTASK-010の再active化・再レビュー
- iDeCo実装
- TASK-007統合サマリー完成
- TASK-008問題修正
- origin/mainからTASK-011を直接開始すること
- origin/mainへの直接実装、main merge、tag、release、distribution
- history rewriteまたはforce push
- reset、stash、clean、restore
- docs/ai/generated/shared/**の直接編集
- Git blob identityの代わりにworking treeのpre-commit/CRLF bytesをcurrent identity正本とすること
- Git blob bytesをPowerShell textとして再構成してraw-byte SHA-256/bytesを計算すること
- 旧0143D33D69C56705FFA74B5E73265A4594681FA7E8440B743EF7658F6829731E／34723 bytesをcurrent valid identityとして残すこと
- 歴史的mismatch証跡を削除・改竄すること
- TASK外refactor
- TASK-011完了後にdocs/ai/AUDIT_IDENTITIES.jsonまたはaudit identity validator/testを削除して再発防止gateを失わせること
