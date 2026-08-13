---
task_id: TASK-012
title: completion main worktree選択修正
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
session_mode: new
handoff_file: docs/ai/handoffs/TASK-012/IMPLEMENTATION_REVIEW_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: Codex
browser_evidence_required: false
claude_design_review_recommendation: not_needed
claude_implementation_review_recommendation: optional
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_requested
claude_implementation_review_status: not_requested
base_commit: d46c87a5e97484c4621065967faca579452fda1e
base_tree: c467caa363ea22716ba3a3ea1eee4f5c41f2bd39
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
accepted_product_sha256: FC4483E4705C32908B72BA1E23F23E1F76FC31AD52F0527C41663852E58264DF
review_stage: implementation
changes_requested_cycles: 1
implementation_review_attempt: 2
implementation_review_profile: standard
implementation_review_final: false
implementation_review_terminated: false
attempt_4_forbidden: false
implementation_candidate: c70cfabee1c1909660e9ed242d93ecd953f4f709
review_kind: implementation
review_role: ORCHESTRATOR_AND_REVIEWER
execution_mode: separate_session
repository_access: true
review_status: requested
request_review_status: requested
review_model: 5.6 Sol
review_effort: high
reviewed_candidate: c70cfabee1c1909660e9ed242d93ecd953f4f709
reviewed_spec_revision: 1
review_request_id: none
review_started_at: none
review_completed_at: none
review_result: none
review_findings_count: 0
review_finding_ids: none
actual_executor: ChatGPT
provider_substitution: none

shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
updated_at: 2026-08-14
---

# TASK-012 — completion main worktree選択修正

## Purpose

completion toolのmain選択条件をrepository全体でbasename Personal-Finance-Plannerがexactly oneという条件から、branch refs/heads/mainのworktreeがexactly one存在し、その一意なmain worktreeのbasenameがPersonal-Finance-Plannerであるという条件へ修正する。別branchの同名worktreeはmain選択から除外し、clean／untracked／unfinished operation／同期／変更／削除／pruneの対象にしない。

## Scope

- branch codex/task-012-main-worktree-selectionはorigin/main exact baseline 74b6f47b2e11dfe622f956de2fb3ba2640413552／tree 0ea6a788d90c5d66d68e1d15981b033399866cfcから通常作成し、Governance CI 31734131847 attempt 2のheadSha、headBranch main、event push、workflow name Governance CI、conclusion successを開始identityとして固定する
- TASK-008 packetをgit_only履歴へ移してTASK-012をqueueしたtransition commit d46c87a5e97484c4621065967faca579452fda1e／tree c467caa363ea22716ba3a3ea1eee4f5c41f2bd39をREQUIREMENTS_DEFINED importのexact baseとする。TASK-008 local completion toolは実行せず、TASK-008 worktreeを変更・削除しない
- shared governanceはversion 0.12.20、commit 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e、source manifest SHA-256 94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FEを維持する
- production変更対象はtools/complete-task-local.ps1とtools/test-complete-task-local.ps1に限定する。TASK-012 packet、handoff、report、CURRENT_STATE、NEXT_ACTION、BACKLOG、board/PROGRESS.htmlはgovernance同期に必要な範囲だけ変更する
- recordsからBranchがrefs/heads/mainにexact一致するrecordだけを抽出し、main branch recordがexactly oneでなければexactly one main branch worktree is requiredとして拒否する
- 一意なmain recordのPath basenameがPersonal-Finance-Plannerでなければmain branch worktree must be named Personal-Finance-Plannerとして拒否する
- RepositoryPathをcanonical resolveしたpathが一意なmain record pathとSame-Path一致しなければRepositoryPath must identify the unique main worktreeとして拒否する
- 別branchのbasename Personal-Finance-Planner worktreeはmain selectionから除外し、存在を許容する。その別branch worktreeへAssert-Clean、unfinished operation確認、fetch、merge、worktree remove、prune対象判定を行わない
- TASK worktreeはTaskWorktree absolute path、ExpectedTaskBranch、TaskId prefix、registered record exactly one、branch ref、CompletionCommit resolved commit、record HEAD identityを従来どおりexact検証する
- C:\Users\owner\Development\personal\Personal-Finance-Plannerとmanifest.ymlはimmutable user-owned worktreeとして、内容変更、削除、移動、rename、stage、commit、ignore/exclude追加、tracked化、clean、stash、reset、restore、branch変更、checkout、detach、worktree move/remove、ownership変更、file copyを一切行わない
- 境界testは実repositoryのuser-owned worktreeをfixtureとして使わず、isolated temporary repository内に別branchの同名worktreeを作る。そのworktreeをtracked dirty、untracked manifest.yml、unfinished operation状態にしても一意なmainを選択でき、対象外worktreeの全bytes、status、branch、HEAD、worktree登録が不変であることをPS7とWindows PowerShell 5.1で検証する
- 既存completion matrixを削除、skip、弱体化せず、main branch record 0件、複数、main wrong basename、RepositoryPath mismatch、TASK branch／HEAD identity mismatchの拒否を維持する
- implementation candidate commitをpushしexact GitHub Actions SUCCESS確認後だけimplementation review attempt 1／standard handoffを別commitで作成し、handoff HEADのexact CI SUCCESSも確認する

## Out of scope

- src/**、製品tests/**、package.json、package-lock.json、.github/workflows/**、Personal-Finance-Planner.html、docs/product/**の変更
- docs/ai/PRODUCT_IDENTITIES.yml、docs/ai/AUDIT_IDENTITIES.yml、docs/ai/generated/shared/**の変更
- main merge、tag、GitHub Release、distribution、TASK-008 local completion、TASK-008またはuser-owned worktreeのremove/prune
- completion toolのCI identity、launcher gate、ff-only、reachability、TASK identity、clean/unfinished operation安全条件の緩和
- reset --hard、stash、git clean、restore、rebase、amend、squash、history rewrite、force push

## Acceptance criteria

- production main selectionはmainBranchRecords = records filtered by Branch == refs/heads/main、Count == 1、main basename == Personal-Finance-Planner、RepositoryPath canonical matchの順で判定する
- 別branchの同名Personal-Finance-Planner worktreeが存在しても一意なmain branch worktreeが正しく選択される
- 別branchの同名worktreeがtracked dirty、untracked manifest.yml、unfinished Git operationを含んでもcompletion preconditionとして拒否せず、そのworktreeのbytes、status、branch、HEAD、登録情報を変更しない
- main branch worktree 0件または複数件を拒否し、main branch worktree basenameがPersonal-Finance-Planner以外なら拒否する
- RepositoryPathが一意なmain worktreeとcanonical一致しない場合を拒否する
- TASK worktreeのabsolute path、TaskId／ExpectedTaskBranch prefix、registered record、branch ref、CompletionCommit、HEAD identity mismatchを従来どおり拒否する
- 別branchの同名worktreeへclean/untracked/unfinished operationの解消を要求せず、fetch、sync、merge、remove、prune対象にしない
- existing completion casesを削減せず、追加境界testをPowerShell 7とWindows PowerShell 5.1の共通matrixでPASSする
- PowerShell 7／5.1 governance、requirements smoke、audit validator、audit normalization、project overlay、completion matrix、git diff --checkがPASSする
- baseline 74b6f47b2e11dfe622f956de2fb3ba2640413552からsrc/**、tests/**、package、workflow、launcher、docs/product、PRODUCT_IDENTITIES、AUDIT_IDENTITIES、generated sharedの差分が0件である
- implementation candidate exact GitHub Actions SUCCESS後だけimplementation review handoffを作成し、candidate commit/tree、handoff HEAD/tree、workflow run、PowerShell test counts、user-owned root/manifest不変identity、残課題をhandoff/reportへ記録する

## Tests

- PowerShell 7: tools/validate-ai-governance.ps1、tools/test-requirements-defined-smoke.ps1、tools/validate-audit-identities.ps1、tools/test-audit-identity-normalization.ps1、tools/validate-project-overlay.ps1
- Windows PowerShell 5.1: 同じgovernance／requirements／audit／overlay suite
- PowerShell 7および5.1: tools/test-complete-task-local.ps1の既存matrix＋別branch同名dirty/untracked/unfinished非対象境界
- completion negative: main record 0、main record複数、main wrong basename、RepositoryPath mismatch、TASK wrong TaskId branch、TASK actual branch mismatch、TASK HEAD mismatch
- completion preservation: 対象外の別branch同名worktreeのtracked bytes、untracked bytes、status、branch、HEAD、worktree registrationが成功／失敗pathの前後で一致
- git diff --checkとgit diff 74b6f47b2e11dfe622f956de2fb3ba2640413552 -- forbidden pathsが0件
- implementation candidate exact GitHub Actions SUCCESS、implementation review handoff exact GitHub Actions SUCCESS

## Build

- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-requirements-defined-smoke.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-audit-identities.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-audit-identity-normalization.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-project-overlay.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-complete-task-local.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test-requirements-defined-smoke.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/validate-audit-identities.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test-audit-identity-normalization.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/validate-project-overlay.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test-complete-task-local.ps1
- git diff --check
- implementation candidate exact GitHub Actions SUCCESS
- implementation review handoff exact GitHub Actions SUCCESS

## Rollback

TASK-012 branch内の通常修正commitで正本を復元する。user-owned worktree、origin/main、TASK-008 worktreeを変更せず、reset、stash、clean、restore、rebase、amend、history rewrite、force pushを使用しない。

## Forbidden changes

- C:\Users\owner\Development\personal\Personal-Finance-Plannerまたはそのmanifest.ymlへの書込み、削除、移動、rename、stage、commit、ignore/exclude、tracked化、clean、stash、reset、restore、branch/HEAD/worktree metadata変更、file copy
- 別branchの同名worktreeをmain ambiguityとして拒否する既存basename exactly-one条件の維持
- 別branchの同名worktreeへAssert-Cleanまたはunfinished operation解消を要求すること
- main record 0／複数、wrong basename、RepositoryPath mismatch、TASK identity mismatchの拒否を削除または弱体化すること
- 既存completion testの削除、skip、assertion弱体化、case数削減
- src/**、tests/**、package.json、package-lock.json、.github/workflows/**、Personal-Finance-Planner.html、docs/product/**、PRODUCT_IDENTITIES、AUDIT_IDENTITIES、generated sharedの変更
- main merge、tag、release、TASK-008 completion tool実行、実worktree remove/prune、force push、history rewrite
