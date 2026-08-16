# PROJECT REQUIREMENTS HANDOFF

- actor: ChatGPT
- role: ORCHESTRATOR_AND_REVIEWER
- source: `docs/ai/CURRENT_STATE.md`, `docs/ai/BACKLOG.md`, `docs/product/`, user request
- purpose: active TASKがない状態から次TASKの目的、scope、受入条件、禁止変更、test/build、review、model/effortを確定する
- repository: Osato-Gasu/Personal-Finance-Planner
- branch_policy: 原則mainの固定baselineから専用branchを作る。TASK-011とTASK-013はユーザー承認済みcarry-forwardのため各transition exact commitをbaseとする
- product_source: docs/product/
- next_candidate: TASK-013
- resolved_carry_forward_TASK_002: TASK-002のactive link整合性問題はTASK-003で検証を実装済み
- accepted_unresolved_issue: TASK-003でユーザー受容済みのschema v1改行表示名の単一行input保存互換性問題を、TASK-008の要件と受入条件へ引き継ぐ
- blocked_predecessor: TASK-004はattempt 3最終レビューで打ち切り、candidate 0f7ae95e296caa741ab3fdde03b9180c3bea122eは未承認・main未反映のまま維持する
- resolved_carry_forward_TASK_004: FINDING-004-R2-09-REMAINDERはTASK-010 approved candidate aa3d7275de00ce3bfe900741750e642c780904adで解消し、main baseline 74599efd2afedfa8c1fba196aaab51459571913eへ統合済み
- completed_successor: TASK-010はTASK-004 attempt 4ではなく独立TASKとしてattempt 2／standardでAPPROVEDとなり、main統合・git_only completion sync済み
- blocked_predecessor_TASK_005: TASK-005はattempt 3／relaxed／finalで打ち切り、candidate d127f26a78342ab3d7674ee99e6f50d87532e891（tree fa83cf0bc4f7de19adc1dff92b8fd538dba3d443）は未承認・main未反映、attempt 4禁止のまま維持する
- required_carry_forward_TASK_005: FINDING-005-R3-01（attempt 3開始承認artifactの宣言SHA-256／bytesとcommit済みLF bytesのidentity不一致）をTASK-011の唯一の修復対象として要件・受入条件・testへ含める
- successor_policy_TASK_011: TASK-011はTASK-005 attempt 4ではなく独立TASKとしてreview attempt 1／standard／cycles 0から開始し、TASK-005をretroactive APPROVEDにしない
- carry_forward_candidate_TASK_011: TASK-005 product candidate d127f26a78342ab3d7674ee99e6f50d87532e891／tree fa83cf0bc4f7de19adc1dff92b8fd538dba3d443を製品source無変更で継承し、TASK-011の新しい承認・release経路とする
- completed_successor_TASK_011: TASK-011はTASK-005 attempt 4ではなく独立TASKとしてattempt 2／standard、cycles 1、findings 0でAPPROVEDとなり、release-handoff commit 51548c913cb83bd42b88f76abc294e8f4331d5be（tree 55d3684f9330162f90135bcc2ad223bec3085375）をmainへfast-forward統合済み
- completed_candidate_TASK_011: approved candidate b2418d1da55a6cdde00079caf89960f82701077f（tree 06f96ac682162552ff8b21b24b4b81cecad7e960）、candidate workflow 31622832014、review handoff b9609708480d2bbfd3e62a810defefebef7707d2／workflow 31623798289、release-handoff workflow 31630363364、main integration workflow 31632682684はすべてSUCCESS
- resolved_finding_TASK_011: FINDING-011-R1-01は解消済み。current identityはcommit 89895a6c9188b5011766ef4b848822bfccb0c597／path docs/ai/reports/TASK-005/USER_DECISION_APPROVAL_ATTEMPT_3.json／blob d42192e7534ca5e2dced23955743a5815fec6c38／SHA-256 F56B8FE68C7CBEF3768CF492476DE1E9C17FFF04A719A305D5C760FF487AF5A3／34370 bytes
- historical_identity_TASK_011: historical declarationはcommit 89895a6c9188b5011766ef4b848822bfccb0c597／path docs/ai/handoffs/TASK-005/RELAY_HANDOFF.md／blob 0f60e90764e81d4e7b02efa62c8a8900305d025b／SHA-256 0143D33D69C56705FFA74B5E73265A4594681FA7E8440B743EF7658F6829731E／34723 bytesとしてhistory-onlyで保持
- completion_evidence_TASK_011: PowerShell 7／5.1、21 source-binding checks、315 Vitest、69 take-home focused、68 NISA focused、168 portable、runtime requests 0、console errors 0、page errors 0をPASSし、src/**、tests/**、tools/test-portable-build.mjsはcarry-forward candidateと差分ゼロ
- task_history_TASK_011: active TASK/handoff/report packetはrelease-handoff commit 51548c913cb83bd42b88f76abc294e8f4331d5beのGit履歴で保持し、git_only completion sync後のcurrent treeには残さない
- completed_TASK_006: TASK-006 spec revision 1はimplementation review attempt 2／standard、findings 0でAPPROVEDとなり、release head 2655beee4d2d9970dff54a57e1935a44741c7a0b（tree 13c887a5c2e55d549992e85e3f28d79fc26a255b）をmainへfast-forward統合済み
- completed_candidate_TASK_006: approved candidate 2d72860abfa342ee800b183ec5dbc8bb4be51c3b（tree fe16d3e402da524863c2a5fde7ce3b2da82dbd82）／workflow 31647525559、review handoff c1faac7f31df24a8957a531d393a6d3d2fe1546e（tree 6a8769ffc1d8d2dc3837535ca997281a0b1bb423）／workflow 31648422117、APPROVED release head workflow 31650601125、main integration workflow 31651737269はすべてSUCCESS
- resolved_findings_TASK_006: FINDING-006-R1-01～03は解消済み。attempt 3とattempt 4は作成せず、tag、GitHub Release、distributionも行っていない
- task_history_TASK_006: active TASK/handoff/report packetはrelease head 2655beee4d2d9970dff54a57e1935a44741c7a0bのGit履歴で保持し、git_only completion sync後のcurrent treeには残さない
- completed_TASK_007: TASK-007 spec revision 1はimplementation review attempt 2／standard、findings 0でAPPROVEDとなり、release head 398f0dae73a12050fa2781445aab8a793c758137（tree 24ef70353b5491b4fb57b7b716c20348c0ff5667）をmainへfast-forward統合済み
- completed_candidate_TASK_007: approved candidate 5df7eb8ff64a212e70d0982c83d664d7b979a5ae（tree 0112d447cf98a28ace8d976afd4315c351d8a8b6）／workflow 31686352635、review handoff 9137ccc4cf95a0b2e4a81e2f066460f754a0adeb／workflow 31686923314、release head workflow 31688961835、main integration workflow 31692284846はすべてSUCCESS
- resolved_findings_TASK_007: FINDING-007-R1-01、FINDING-007-R1-02、FINDING-007-R1-03は解消済み。attempt 3とattempt 4は作成せず、tag、GitHub Release、distributionも行っていない
- completion_evidence_TASK_007: PowerShell 7／5.1 governance、429 Vitest、69 take-home focused、68 NISA focused、86 iDeCo focused、28 overview focused、262 portable checks、runtime requests 0、console errors 0、page errors 0をPASSし、candidate以後の製品source／test差分は0件
- task_history_TASK_007: active TASK/handoff/report packetはrelease head 398f0dae73a12050fa2781445aab8a793c758137のGit履歴で完全に追跡可能で、git_only completion sync後のcurrent treeには残さない
- next_requirements_TASK_008: ChatGPTがpermanent handoff、BACKLOG、docs/product/**からTASK-008「データ保全・UX完成」の正式要件を定義し、TASK-003から引き継いだschema v1改行表示名の保存互換性問題を要件・受入条件へ保持する
- transition_artifact_TASK_011: project-user-decision-separate-task-transition-v1／BBB9C4FC832FF3BAB7A99D39EAB25E051C8CF01FE7727ED40370F110485E22C8／11691 bytes
- implementation_gate: TASK、handoff、CURRENT_STATE、NEXT_ACTION、Progressを同じstateへ更新するまで製品実装を開始しない
- write_capability: state transition前にrepository write accessを実測する
- write_available: project正本一式を更新してvalidatorを実行する
- write_unavailable: 正本更新を主張せずUSER_RELAY_REQUIRED portable bundleを返す
- review_policy: implementation review最大3回、第3回のみ限定緩和、第3回不通過でNEEDS_USER_DECISION
- return_to: user or Codex through verified relay
- active_requirements_TASK_008: TASK-008 spec revision 1はexact baseline c3cf916048d59867e016b2979e6d0875fb563c82から開始し、schema v1 CR/LF/CRLF表示名保存互換性、lossless migration、atomic backup/import、settings UX、root launcher、local main同期、worktree安全cleanupを必須・非緩和要件として保持する
- completion_flow: remote main統合だけで完了とせず、origin/main exact CI、cleanな常設mainのfetch+ff-only同期、root launcher freshness/portable smoke、完成commit reachability、cleanなTASK worktreeの安全remove/prune、git_only completion syncまでを恒久条件とする
- completion_blocked_conditions: dirty/untracked/ambiguous worktree、non-fast-forward、unreachable commit、CIまたはlauncher gate失敗では破壊的回避を行わずBLOCKEDとする
- approved_predecessor_TASK_008: TASK-008 attempt 3／relaxed／finalはAPPROVED。release head 74b6f47b2e11dfe622f956de2fb3ba2640413552／tree 0ea6a788d90c5d66d68e1d15981b033399866cfcをorigin/mainへFF統合済みで、Governance CI 31734131847 attempt 2はmain／push／SUCCESS
- completed_local_completion_TASK_008: TASK-008 local completionはexact main CI `31756479657`、completion commit `74b6f47b2e11dfe622f956de2fb3ba2640413552`、fresh launcher、portable 284 checksを通過し、指定worktreeを安全にremove/pruneした
- completed_TASK_012: TASK-012 spec revision 1はimplementation review attempt 2／standard、cycles 1、findings 0でAPPROVEDとなり、release head `4e217b8d47cc955f3b3e3da54d97ead811346381`（tree `d10df82e04b3c634849e19c70ce471af2be75eb8`）をmainへfast-forward統合済み
- completed_candidate_TASK_012: approved candidate `c70cfabee1c1909660e9ed242d93ecd953f4f709`（tree `251ed1c33de68e64116059d1b07025ea08452e7f`）／candidate workflow `31751171064`、review handoff `ddae5547f211a9f16b0b81c43fe01a68dbc4a12b`／workflow `31752066301` attempt 2、release workflow `31755772429`、main integration workflow `31756479657` attempt 2はすべてSUCCESS
- resolved_findings_TASK_012: FINDING-012-R1-01、FINDING-012-R1-02は解消済み。attempt 3とattempt 4は作成せず、tag、GitHub Release、distributionも行っていない
- completion_evidence_TASK_012: PowerShell 7／5.1 completion各34 cases、462 Vitest、69 take-home、68 NISA、86 iDeCo、28 overview、284 portable checks、runtime requests 0、console errors 0、page errors 0をPASS
- task_history_TASK_012: active TASK/handoff/report packetはrelease head `4e217b8d47cc955f3b3e3da54d97ead811346381`のGit履歴で完全に追跡可能で、git_only completion sync後のcurrent treeには残さない
- blocked_predecessor_TASK_009: TASK-009 spec revision 2はattempt 3／terminal／final、cycles 3で打ち切り、candidate 03825e58f61f95d2364f09246f202744e4617ba5（tree 934892b96eff8e5b66ddf67e71eefd29353a86a0）は未承認・未release、attempt 4禁止のまま維持する
- required_carry_forward_TASK_009: FINDING-009-V2-R1-02（Actions run／job／artifact inventoryのstable IDとmutable metadataが分離されず、duplicate completenessを証明できない問題）をTASK-013の唯一の修復対象として要件・受入条件・testへ含める
- successor_policy_TASK_013: TASK-013はTASK-009 attempt 4ではなく独立TASKとしてreview attempt 1／standard／cycles 0から開始し、TASK-009をretroactive APPROVEDまたはreleasedにしない
- carry_forward_candidate_TASK_013: TASK-009 product candidate 03825e58f61f95d2364f09246f202744e4617ba5／tree 934892b96eff8e5b66ddf67e71eefd29353a86a0を未承認product baselineとして継承し、TASK-013で新candidate・handoff・reviewを作成する
- transition_artifact_TASK_013: project-user-decision-separate-task-transition-v1／557C4E1B26F153025D04B8403F68D3594D647AF994FA458C17ADB4892A4CD23C／14795 bytes
- user_decision_TASK_013: option A／CREATE_SEPARATE_TASK／approval USER-DECISION-TASK-009-REMEDIATION-20260816-202947。TASK-009はterminated、candidate unapproved／unreleased、attempt 4 forbiddenのまま保持する
- next_requirements_TASK_013: ChatGPTがpermanent handoff、transition artifact、TASK-009 Git履歴からTASK-013「TASK-009公開監査stable ID修復」の正式要件を定義する

## TASK-011 requirements draft (lossless user-decision carry-forward)

### Purpose

- Repair TASK-005 attempt-3 approval raw-byte audit identity without changing the carried-forward NISA product implementation, and add a reproducible guard against declared-vs-committed identity drift.

### Scope

- Use the post-transition commit as TASK-011 exact base, not origin/main.
- Carry forward TASK-005 product candidate d127f26a78342ab3d7674ee99e6f50d87532e891 unchanged at product-source level.
- Compute actual SHA-256/bytes from exact committed LF bytes and make all current references match.
- Record Git blob identity together with SHA-256/bytes.
- Add deterministic governance validation for EOL-normalization identity drift.
- Preserve original mismatch as historical evidence; never retroactively approve TASK-005.
- TASK-011 review starts attempt 1 / standard / cycles 0.
- TASK-011 approval, not TASK-005 retroactive approval, becomes the new release path carrying the unchanged NISA product.

### Out of scope

- TASK-005 attempt 4 or any further TASK-005 review.
- NISA calculation/UI/AppState/migration/rule/product-test changes.
- TASK-004/TASK-010 reopening.
- iDeCo, integrated summary, TASK-008 display-name work, distribution.
- main merge/tag/release during implementation.
- history rewrite/force push/reset/stash/clean/restore.

### Acceptance criteria

- No src/** or product-test behavior diff from TASK-005 candidate d127f26a78342ab3d7674ee99e6f50d87532e891.
- Actual committed approval artifact SHA-256/bytes are recomputed from exact LF bytes and recorded with Git blob.
- All current references match actual committed identity; stale 34723-byte identity is not retained as a current claim.
- Historical mismatch remains traceable as FINDING-005-R3-01 cause.
- Negative test fails for pre-normalized/CRLF identity when committed LF bytes differ.
- Positive test passes for exact committed identity.
- All shared/project/PowerShell 7/5.1 gates pass.
- Existing 315 Vitest, 69 take-home focused, 68 NISA focused, 168 portable checks are not reduced; runtime/console/page errors remain 0.
- Candidate exact GitHub Actions SUCCESS precedes review handoff.
- TASK-011 implementation review starts attempt 1 standard, cycles 0, final false.
- No main merge/tag/release or TASK-005 attempt 4.

## TASK-013 requirements draft (lossless TASK-009 remediation carry-forward)

### Purpose

- Repair the public exposure audit Actions inventory identity model by separating canonical stable keys from mutable metadata, while carrying forward the unapproved TASK-009 product candidate without changing unrelated product behavior.

### Scope

- Use the post-transition commit as TASK-013 exact base, not origin/main.
- Carry forward TASK-009 candidate `03825e58f61f95d2364f09246f202744e4617ba5`／tree `934892b96eff8e5b66ddf67e71eefd29353a86a0` as an unapproved product baseline only.
- Use `run.id` as the canonical run stable key, `run.id + job.id`（or a formally justified globally unique `job.id`）as the job stable key, and `artifact.id` as the artifact stable key.
- Require stable IDs to be valid non-empty integers and reject duplicate stable keys whether metadata is identical or conflicting.
- Keep metadata outside the stable key and bind canonical metadata records to a separate deterministic record-set SHA-256.
- Reject pagination overlap, duplicate API records, and conflicting metadata; do not silently deduplicate them.
- Bind inventory, retrieval, scan, report counts and stable-key／record-set hashes to the same exact unique object set.
- Add independent negative tests for duplicate `run.id`, `run.id/job.id`, `artifact.id`, identical-metadata duplicates, and conflicting-metadata duplicates.
- Preserve HTTP fail-closed behavior, full reachable history／path-sensitive scanning, unsafe archive rejection, secret redaction, proof transfer, asset mutation gates, and canonical approval proof.
- Create a new TASK-013 implementation candidate and attempt-1 standard review; TASK-009 is never retroactively approved or released.

### Out of scope

- TASK-009 attempt 4 or reopening TASK-009 review convergence.
- Release or public distribution before TASK-013 approval.
- AppState, migration, storage, backup/import/export, financial calculations, rule data, verifiedAt, or unrelated product behavior changes.
- CI-lightening changes; Governance CI optimization remains a separate task candidate.
- History rewrite, force push, reset, stash, clean, restore, rebase, amend, or squash.

### Acceptance criteria

- Duplicate canonical stable keys are rejected regardless of metadata equality.
- Conflicting metadata for a stable key is `BLOCKED` without raw secret／PII disclosure.
- All counts and set hashes are derived from the same canonical unique object set.
- Pagination overlap cannot produce `actions_scan_complete=true` or a PASS report.
- Existing public exposure audit, distribution, browser, governance, and non-regression gates are not reduced.
- TASK-013 produces a new candidate, handoff, and attempt-1 standard review.
- No release or public distribution side effect occurs before approval.

### Tests

- Duplicate `run.id` with identical metadata: reject.
- Duplicate `run.id` with different metadata: reject as conflict.
- Duplicate `run.id/job.id` with identical and different status／conclusion: reject.
- Duplicate `artifact.id` with identical and different name／expired／head SHA: reject.
- Pagination overlap across pages: reject rather than silently deduplicate.
- Count or set-hash mismatch: reject.
- HTTP／archive fail-closed, full-history／path scan, secret redaction, proof transfer, asset gates, and exact-published no-op remain passing.
- PowerShell 7／5.1 governance and existing Node／browser counts are not reduced.
