# TASK-013 Implementation report

## Spec Revision 3 implementation

### Authority and topology

- specification／design: `Spec Revision 3／Auditor Self-Exclusion Design Revision 2`
- user approval: `USER-APPROVAL-TASK-013-SPEC-REV3-20260819-094900`
- independent design re-review: `PASS`／findings `0`
- adoption commit／tree: `55ca1d89d74e63d45baa06ee8f9da67a53c389f5`／`5e4c20a971bd5bfde21ebf9b222860f6d32683f8`
- adoption parent: `ffee8284704bd2d8e19b7a5ae85d5e772a39977c`
- adoption push: intentionally deferred; the adoption and implementation candidate form the approved two-commit bootstrap push chain
- failed Governance CI run `32119217442`／attempt `1`／job `95655572235`: permanent `FAILURE`; not rerun, relabeled, or treated as success
- implementation authority／release authority: `true／false`
- allowed implementation paths: audit CLI／library／tests, Governance CI workflow, Distribution workflow, and this report only

### Implemented exact-current-run self-exclusion

- audit proof schema is atomically advanced to `2`; new candidate／handoff／main／release proofs require `exact-auditor-self-exclusion-v1` topology fields and legacy topology-free proofs cannot authorize them
- only `candidate_ci` at `.github/workflows/ci.yml`／`push` and `release_preflight` at `.github/workflows/distribution.yml`／`workflow_dispatch` may self-exclude
- workflows pass exact `${{ github.run_id }}` and `${{ github.run_attempt }}`; the producer requires exact equality with `GITHUB_RUN_ID`, `GITHUB_RUN_ATTEMPT`, `GITHUB_REPOSITORY`, and `GITHUB_EVENT_NAME`
- the producer fetches the exact run endpoint and binds canonical run ID／attempt, repository, target SHA, `in_progress`／null status, workflow ID, path, event, and head branch
- workflow identity is bound to the exact regular Git blob resolved from `target_sha:<workflow_path>`; missing, non-blob, malformed, or mismatched identities fail closed
- the complete paginated `filter=all` inventory is partitioned into exactly one auditor run and every other auditee run; all jobs of the auditor run are the atomic exclusion set and at least one must be non-completed
- every auditee job remains subject to the prior strict completed/log/artifact/historical-exception rules; an unrelated non-completed run or job remains BLOCKED
- proof includes canonical auditor run/job records, auditee stable IDs and canonical records, partition counts, set hashes, complete inventory stable-ID hashes, and complete inventory record hashes
- proof validation reconstructs auditor／auditee／complete run and job memberships, hashes, counts, job evidence equations, and the prior Spec Revision 2 historical static/runtime contract
- consumer validation independently refetches the exact auditor run and re-resolves the exact target workflow blob; a recomputed proof set hash cannot substitute for authoritative workflow ID or blob equality
- self-audited proof truth is fixed at `actions_scan_complete=false`; `actions_evidence_gate_pass=true` is accepted only after topology, authoritative identity, auditee evidence, historical exception, count, and hash validation all pass
- prior completed auditor runs and permanent failed run `32119217442` are ordinary auditees in the next audit, closing the temporary phase-local exclusion chain
- Governance CI performs the candidate public audit only for `push`; pull-request CI continues all non-self-audited checks without inventing an unauthorized runtime identity

### Test and build evidence before candidate commit

- public exposure audit contract: `198` PASS, increased from `160` while retaining every Spec Revision 2／Design Revision 3 regression
- Spec Revision 3 Design Revision 2 section 14: all `38` categories covered, including both eligible phases, caller／authoritative identity mismatches, missing／malformed workflow ID, exact blob resolution and non-blob failures, proof mutation with recomputed set hash, duplicate／second／unrelated exclusions, partition/hash/truth contradictions, legacy rejection, and closure-chain scans
- full Vitest: `737` tests／`21` files PASS
- distribution contract: `77` PASS
- npm ci／typecheck／lint／format: PASS／vulnerabilities `0`
- launcher freshness: PASS／`216828` bytes
- portable browser: `284` checks／`5` routes／360px／runtime requests `0`／console errors `0`／page errors `0`
- staged HTTP distribution: `5` files／`5` routes／360px／runtime requests `0`／console errors `0`／page errors `0`
- PowerShell 7 shared sync and AI governance: PASS; startup context `61400` bytes (`<=65536`, target `<=61440`)
- clean-worktree-only governance simulations: pending exact candidate commit
- candidate commit／tree, repository-external exact candidate audit, independent high-risk VERIFY, candidate exact CI, handoff-only commit, and handoff exact CI: pending
- release／tag／Pages／deployment／workflow-dispatch side effects: `0`

## Spec Revision 2 implementation

### Authority and identity

- spec revision／design revision: `2／3`
- user approval: `USER-APPROVAL-TASK-013-SPEC-REV2-20260818-151500`／option 3
- implementation authority／release authority: `true／false`
- adoption commit／tree: `592676371d8a3117e1cdd9cda96fd8c1955d6e95`／`4ed56b253c2d75b0a316d4393d4a0c8a5906623e`
- adoption parent: terminal transition `dc8f87c319ff4fe5162854b9d12f1a6f3cf4a008`
- adoption Governance CI: run `32113761565`／attempt `1`／job `95638623309`／SUCCESS／29 steps／failed `0`
- requested Main model／effort: `Sol／XHigh`
- actual Main model／effort: `未確認／未確認`
- implementation scope: `tools/public-exposure-audit.mjs`, `tools/public-exposure-audit-lib.mjs`, `tests/public-exposure-audit.test.mjs`, and this report only

### Implemented evidence policy

- Actions jobs inventory now requests `filter=all` and binds each job to its own `run_attempt`; the run endpoint's latest-attempt value is not substituted for an older job attempt.
- Every canonical job must be completed. A non-completed job remains BLOCKED.
- All normal required logs remain mandatory and fail closed on request, redirect, status, or body failure.
- Only exact policy `task-013-spec-rev2-exact-v1` may produce `APPROVED_HISTORICAL_UNAVAILABLE`: repository `Osato-Gasu/Personal-Finance-Planner`, run `31887544173`, attempt `1`, job `95018938492`, head `25be0b48699ef350bd72a60e3b564b7dd8c1d2a4`, completed/failure.
- Exception use always performs a fresh direct-log request with manual redirect observation. Acceptance requires initial `302`, final `404`, exact `application/xml`, parsed `BlobNotFound`, and a non-empty body. 410, 403, 5xx, 200, request/redirect/body failures, MIME/error-code mismatch, and empty body are BLOCKED.
- The immutable static policy record and fresh runtime observation record have separate exact field orders, UTF-8 no BOM／LF／final-LF serialization, canonical scalar validation, direct-concatenation set hashes, and the exact empty-set SHA-256 `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855`.
- Proof fields use only `actions_historical_unavailable_count` and `actions_historical_runtime_observation_count`; an independent legacy alias is rejected. Static/runtime counts must match and cannot exceed one.
- Exception truth is explicit: `actions_scan_complete=false`; `actions_evidence_gate_pass=true` only after the static identity, runtime contract, canonical hashes, and all inventory/retrieval/scan count equations pass.
- Proof consumers reconstruct both records and hashes. High-risk verification can read a separate regular non-link raw runtime response and compare its exact SHA-256／bytes to the candidate proof.
- The raw runtime XML is written only beside the repository-external audit output. It is not copied into repository reports.
- A release/preflight proof consumer validates the exact candidate audit proof and does not replace its bound runtime observation with a later observation.

### Test matrix

- public exposure audit contract suite: `160` tests PASS, increased from `82` without deleting or weakening existing tests
- covers the accepted Design Revision 3 44-category matrix, including exact happy path, mandatory observation failures, 302/404 mutations, 410/403/5xx, MIME／BlobNotFound／body failures, static/runtime identity and set-hash mutation, raw SHA/bytes binding, count equations, second/non-allowlisted/post-adoption exception rejection, non-completed job rejection, empty/one-record hashes, field order／EOL／final-LF／scalar／extra/omitted field rejection, truth contradictions, legacy alias rejection, and all prior regressions
- full Vitest: `699` tests／`21` files PASS
- focused rules／NISA／iDeCo／overview: `69／68／86／28` PASS
- distribution contract／public exposure audit: `77／160` PASS
- npm ci／typecheck／lint／format check: PASS／vulnerabilities `0`
- build app／launcher freshness: PASS／`216828` bytes
- portable browser: `284` checks／`5` routes／360px／runtime requests `0`／console errors `0`／page errors `0`
- staged HTTP distribution: `5` files／`5` routes／360px／runtime requests `0`／console errors `0`／page errors `0`
- audit identity normalization／completion simulation: PowerShell 7 and 5.1 each `21／34` PASS
- shared sync／AI governance／audit identity／project overlay／NEXT_ACTION／Progress: PowerShell 7 and 5.1 PASS
- startup context: `58593` bytes (`<=65536`, target `<=61440`)

### Working-tree public exposure audit

- repository-external report: `C:\Users\owner\Development\personal\_evidence\TASK-013-spec-rev2-20260818-164834\working-tree-audit-final.json`
- report bytes／SHA-256: `5668`／`F4F3D2E6AAE4B30C713A8CF21BB5D43734ED0E494EF764D3886E35BA5714A8F4`
- result／findings: `PASS／0`
- Actions runs: `136`
- Actions jobs inventory／required／retrieved／scanned／historical unavailable／runtime observations: `142／142／141／141／1／1`
- `actions_scan_complete／actions_evidence_gate_pass`: `false／true`
- static canonical record/set SHA-256: `08794AC59619ECD91E9E5AA81441222D8EDB2248BB6CFA9098D20DDA4E8F887B`
- runtime canonical record/set SHA-256: `F285FD6AF90632C64DC9FE03538AD7EE38B8ADE9B62604F1605704BCC6DA0A1C`
- raw runtime response: repository-external `working-tree-audit-final.json.actions-job-95018938492-runtime-response.xml`
- raw runtime response bytes／SHA-256: `215`／`42446269EB14E2CC48BA06AF9E51EB635F69DB343EAB00ACBECFAF9034A9B22A`
- raw runtime response vs proof identity: PASS
- preserved static 2026-08-18 response bytes／SHA-256: `215`／`1CCCE68DDD68C8BD055419F893169F9C311D4F242CC957F9DC9F2CB1447C9C21`
- static and fresh runtime body SHA-256 values intentionally differ; the independent proof contracts both pass

### Candidate, high-risk VERIFY, and handoff

- first implementation candidate: `fde8a1a14785af6576604deb2cadd944f7160a2a`／tree `d7ec7c401c707978111a7a7d85606515f15e6a5d`; not pushed
- first high-risk read-only VERIFY: `FAIL`; requested／actual `Sol／XHigh`; no edits, push, or public-state mutation
- first VERIFY finding: the job attempt parser used `job.run_attempt ?? runEntry.run.run_attempt`, so a missing job-specific attempt could incorrectly inherit the run endpoint's attempt and become eligible for the historical exception
- correction: require `job.run_attempt` directly; normal fixtures now carry the per-job field; missing per-job attempt and wrong per-job attempt each have an explicit fail-closed regression
- corrected pre-commit audit: repository-external `corrected-precommit-audit.json`／`5668` bytes／SHA-256 `CAC2DF36E666A3F859CC02808CC65020CF3C9B7B79E3375592DD317A00B34AB2`／PASS／finding `0`
- corrected audit Actions jobs inventory／required／retrieved／scanned／historical unavailable／runtime observations: `142／142／141／141／1／1`; scan complete／evidence gate `false／true`
- corrected audit static/runtime set SHA-256: `08794AC59619ECD91E9E5AA81441222D8EDB2248BB6CFA9098D20DDA4E8F887B`／`6E0B3586224D0EC27C3925AAC275FB4469C661CAE73D6B630A72ABD4EC0C2A41`
- corrected raw runtime response: `215` bytes／SHA-256 `E6B8CA3D042D46AEEF5F260D38F5B9B1FD85190A8A0D033040BE6C9DB840657E`
- corrected implementation candidate: pending; created as a descendant commit without amend or history rewrite
- corrected high-risk read-only VERIFY: pending; requested `Sol／XHigh`
- candidate exact Governance CI: pending
- implementation-review handoff-only commit and exact CI: pending
- release/public distribution side effects: `0`

## Revision 1 historical identity

- task: `TASK-013`
- spec revision: `1`
- branch: `codex/task-013-public-audit-stable-id`
- activation commit／tree: `184d4da3f79443416f0570aec2b029d4c2c72202`／`86b0f2d9e9ded5618c80d2062ae1602b0f907e1c`
- transition commit／tree: `30cc57b05ac49dc6afa587f9d70ade571e526d9c`／`2b3039cdd499b37f7ed2f8bace9bec7d43195a60`
- attempt 1 review import commit／tree: `a0f8738396e9dfd1e6aefed5154f1d7e6732434e`／`f819b3f808711afecc3b03f70febf7e257a97c24`
- activation CI: run `31947743040`／attempt `1`／job `95166339042`／`SUCCESS`
- attempt 1 review import CI: run `31954202991`／attempt `1`／job `95182201338`／`SUCCESS`
- shared version／commit: `0.12.25`／`f07571d3e8745b9a49a28b1ac77e211c210146a3`
- started: `2026-08-16 22:29:43 JST`
- implementation bytes finished: `2026-08-17 00:13:39 JST`
- final handoff synchronization: candidate exact CI confirmed; attempt 2 review handoff prepared

TASK-009 remains terminated at cycles 3／attempt 3／terminal／final. Attempt 4 is forbidden. Candidate `03825e58f61f95d2364f09246f202744e4617ba5`／tree `934892b96eff8e5b66ddf67e71eefd29353a86a0` remains unapproved and unreleased and is not reused as a TASK-013 approval or release identity.

## Implementation

- Canonical positive integer validation accepts only positive safe integer numbers and canonical positive decimal strings for Actions run／job／artifact IDs.
- Stable keys are run ID, run ID plus job ID, and artifact ID. Mutable metadata is encoded separately in fixed field order with explicit type, null, and undefined representations.
- Identical stable-ID repetition is rejected as duplicate／pagination overlap. Different metadata for the same stable ID is rejected as an explicit conflict. No deduplication, overwrite, or merge occurs.
- Existing `actions_*_set_sha256` fields now mean sorted stable-key set hashes. `actions_*_record_set_sha256` fields and `actions_inventory_identity_version: stable-id-v1` bind deterministic metadata records.
- Inventory, retrieval, scan, report counts, stable-key hashes, and record-set hashes derive from the same validated unique inventory. Duplicate／conflict is rejected before job-log or artifact retrieval and before report creation.
- Artifact evidence paths use only canonical artifact IDs, so mutable names are not copied into report paths or error messages.
- Actions list pagination now requires every response to be an object containing the target array and a nonnegative safe-integer `total_count`. The declared total must remain identical across pages, cumulative records may not exceed it, and completion requires an exact cumulative match.
- Global run／artifact totals and each run-specific job total are validated before any job-log or artifact-content retrieval and before report creation. Missing, malformed, oversized, undersized, or page-changing totals fail closed without exposing raw metadata.

## Tests

- Canonical ID PASS／reject matrix covers number, decimal string, null, undefined, boolean, object, array, empty, zero, negative, decimal, exponent, plus sign, whitespace, leading zero, and unsafe number inputs.
- Run／job／artifact duplicate and conflicting metadata cases are independently rejected without exposing raw metadata.
- Page-1 100-record／page-2 overlap simulations reject identical and conflicting run／job／artifact stable IDs before content retrieval or report creation.
- Stable-key and record-set hashes are order-independent; metadata-only changes preserve the stable-key hash and change the record-set hash.
- Missing record-set hashes and wrong inventory identity version are rejected with `side_effects: 0`.
- Run response-shape and run／job／artifact `total_count` negative matrices cover missing, malformed, negative, non-integer, unsafe, oversized, undersized, and page-changing values. All pagination failures reject before content retrieval and report creation.
- Existing HTTP, archive, history, redaction, release staging, proof-transfer, and completeness tests remain enabled.
- full Vitest: `621` tests／`21` files
- focused rules／NISA／iDeCo／overview: `69`／`68`／`86`／`28`
- distribution contract／public exposure audit: `77`／`82`
- audit normalization／completion simulation: PowerShell 7 and 5.1 each `21`／`34`
- clean isolated requirements／product-identity smoke: PowerShell 7 and 5.1 both PASS
- portable browser: `284` checks／`5` routes／360px／runtime requests `0`／console errors `0`／page errors `0`
- staged HTTP distribution: `5` files／`5` routes／360px／runtime requests `0`／console errors `0`／page errors `0`
- `npm ci`, typecheck, lint, format check, build, and launcher freshness: PASS; vulnerabilities `0`

## Working-tree public exposure audit

- path: `C:\Users\owner\Development\personal\audit\TASK-013-stable-id-20260816-223814\attempt-2-final-working-tree-audit.json`
- target／phase: `a0f8738396e9dfd1e6aefed5154f1d7e6732434e`／`candidate_ci`
- bytes／SHA-256: `2990`／`E16976E492A0CAC763CBA64ACFAC230BD79DB0713F9C77DE0B0F19DD7057C6E3`
- result／findings: `PASS`／`0`
- Actions inventory／retrieval／scan: runs `131`; jobs `131`／required logs `131`／retrieved `131`／scanned `131`; artifacts `0`／`0`／`0`
- run stable-key／record hashes: `F6A4FD091ACCA034218EBE51BDB7827F9B0658DAD7374D24D3E242A00D7206A5`／`47F8D2FC807651CC6ABBA9ADD7E03EB2CD7E7007BFB0ED749A4324D2FEC262DF`
- job stable-key／record hashes: `4FC94B73D4C39137FF1557D39C8DD8ED25EDC5A8424719D117C8D6562ED140D8`／`E0732047DAD8EE3A5472B3A3A6A56564364CC4F7C51EC4F8B7BD1FEB69294665`
- artifact stable-key／record hashes: `01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B`／`01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B`

## Candidate and CI

- candidate commit／tree: `b38d0182d62053a25e17c6a32853d1112d9084eb`／`57eaf1f4a9a088f37bd3cf39c5ededa29e670a2f`
- candidate parent: attempt 1 review import `a0f8738396e9dfd1e6aefed5154f1d7e6732434e`
- candidate audit: `C:\Users\owner\Development\personal\audit\TASK-013-stable-id-20260816-223814\attempt-2-candidate-audit.json`／`2990` bytes／SHA-256 `7D15B62E6BA688EC8E77B3C16E267278E4BA0E2F01CC7E55D7748414B441950C`／finding `0`／PASS
- candidate Governance CI: run `31955360058`／attempt `1`／job `95185062836`／SUCCESS; all workflow steps succeeded
- handoff Governance CI: required exact push run after the governance-only handoff commit

## Non-regression and public state

- allowed implementation paths: public exposure audit CLI, library, test, and this report only
- product `src` tree: `9106f855abf2f7534b6fbdff8da303fe986e0b53`
- `package.json`／lock／launcher blobs: `13148c93b14e84fa633bbfe265e557f57e0c90eb`／`0d7b8ba0ff954d08174ff26207fbc21b3d1b6408`／`87dcb821f73ecce65f8970db812012fc2a870bad`
- `docs/product/**` and `docs/ai/generated/shared/**`: unchanged
- origin/main: `0dbc4fb102c92a6df12331540c6cc11010258f54`
- repository: public; tags `0`; Releases `0`; Pages not configured; deployments `0`; workflow dispatch runs `0`; open PRs `0`
- distribution／release side effects: `0`
