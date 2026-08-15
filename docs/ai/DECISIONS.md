# Governance decisions

## GOV-001 Shared governance pin

- Shared repository: `Osato-Gasu/shared`
- Version: `0.12.20`
- Commit: `10cd1466b10f814f1bd2aab2c5f6ba6465c5899e`
- Snapshot updates are performed only by the shared sync tool.

## GOV-002 Completed TASK history

- Completed TASK files use `git_only`; inactive TASK artifacts are not retained in the current tree.
- TASK-001 remains documented in `docs/bootstrap/` as bootstrap provenance, not as an active governance TASK.

## GOV-003 Zero-active routing

- With no active TASK, `NEXT_ACTION.yml` routes ChatGPT to `docs/ai/handoffs/PROJECT_REQUIREMENTS.md`.
- Product implementation begins only after a new TASK and its handoff are defined and validated.

## GOV-004 Review limit

- Implementation review is limited to three attempts.
- Only the third attempt, after two failures, may defer limited non-required presentation or optional optimization findings.
- A third failure routes to `NEEDS_USER_DECISION` and ends review.

## GOV-005 TASK-002 completion and carry-forward

- TASK-002 spec revision 2 is approved and completed with implementation candidate `0443acc4289c1f134fe3c42ee1b41d6ad10a52f4` (tree `d28414370618267d0be4bf5b12947d1f020b7219`).
- Candidate workflow `31485104093` and review handoff workflow `31485440279` completed successfully.
- The active link integrity issue accepted by the user in spec revision 1 remains unresolved by decision and must be included in the requirements and acceptance criteria of the next applicable product TASK, beginning with TASK-003.

## GOV-006 TASK-003 review termination, user acceptance, and completion

- TASK-003 implementation review attempt 3 used the relaxed final profile and returned `CHANGES_REQUESTED`. This consumed cycle 3, set review termination, and prohibits attempt 4.
- The user explicitly accepts implementation candidate `42f61931139922569e6761a553fd01bf637731f8` (tree `59d6f75d3176bb3cdfff69966a3e7784b3cd0d6d`) for completion and main integration despite the unresolved issue below. Candidate workflow `31506155390` completed successfully.
- Accepted unresolved issue: a baseline-valid schema v1 display name containing a newline may lose that newline or prevent an unrelated household-settings save after being represented by the single-line budget input.
- The accepted unresolved issue is not fixed in TASK-003 and must be included in the requirements and acceptance criteria of TASK-008, データ保全・UX完成.
- The TASK-002 active-link carry-forward was addressed by TASK-003 active-link validation and is no longer an unresolved carry-forward.
- The active TASK-003 task, handoff, and report packet is preserved in Git through handoff HEAD `7d11cc20964732b3dd04c74632e41173728160a5`; canonical `git_only` completion sync removes it from the current tree.

## GOV-007 TASK-004 review termination and option C transition

- TASK-004 spec revision 2 implementation review attempt 3 used the relaxed final profile for candidate `0f7ae95e296caa741ab3fdde03b9180c3bea122e` (tree `e139244d9cd538e3177dc35c176fa161910f12ee`) and handoff HEAD `fc2f8d274e9ec76356bb122124fbf12ea8bc73dd` (tree `159e46fd363c41ffc0ab7edcbaf1aacd27d8550c`). Candidate workflow `31536781347` and handoff workflow `31537172662` succeeded.
- Final review result is `NEEDS_USER_DECISION`; implementation review is terminated, attempt 4 is forbidden, the candidate is not user-accepted, and main integration is not approved.
- The user selected option C: TASK-004 remains blocked and unmerged, and completion responsibility moves to the new TASK-010. TASK-010 is a separate TASK beginning with review attempt 1, not TASK-004 attempt 4.
- Unresolved `FINDING-004-R2-09-REMAINDER`: a plan already age 65 through 74 at the start of 2026 can complete without calculating or requiring manual input for the first-category care-insurance premium.
- The unresolved finding and candidate are carried forward to TASK-010, `65～74歳介護保険未計算安全化`; the candidate is a historical carry-forward base and is not approved.
- User-decision transition artifact: schema `project-user-decision-separate-task-transition-v1`, SHA-256 `E464A16F48C9798411717A73BB0C18936B25C93CC925C50C9A3A1AB9818BF4E6`, 8349 bytes.
- Final-review source artifact: SHA-256 `D8ABA8BBEB8A62FC7F1E7B963E538EE364C4FB215890A04EFD84A13B156CD153`, 16611 bytes.
- The TASK-004 task, handoff, and report packet remains traceable through Git history at handoff HEAD `fc2f8d274e9ec76356bb122124fbf12ea8bc73dd`; canonical `git_only` transition removes it from the current tree.

## GOV-008 TASK-010 approval and completion

- TASK-010 spec revision 1 implementation candidate `aa3d7275de00ce3bfe900741750e642c780904ad` (tree `d68adbb2018843229345d1d40740e5d0e35be0d3`) was approved in implementation review attempt 2／standard with 0 findings. No attempt 3 was created.
- Candidate workflow `31546445080`, review handoff workflow `31546720643`, and approved-relay workflow `31548025166` completed successfully.
- TASK-010 resolves `FINDING-004-R2-09-REMAINDER` by keeping 65～74歳 kyokai-auto plans unsupported until complete manual social-insurance amounts are provided; it does not infer or zero-fill the first-category care-insurance premium.
- Completion release gates passed with 247 Vitest tests, 69 focused rule tests, 128 portable browser checks, runtime requests 0, console errors 0, and page errors 0 on PowerShell 5.1／7 governance and product identity validation.
- Product source, rules, and tests remained byte-identical to the approved candidate during approval and completion governance changes.
- The active TASK-010 packet remains traceable through approved-relay commit `ba73c421aa8910807bd775be0ebb72e19e1592d1`; canonical `git_only` completion sync removes it from the current tree. Main integration requires separate explicit approval.

## GOV-009 TASK-005 review termination and TASK-011 transition

- TASK-005 spec revision 1 implementation review attempt 3 used the relaxed final profile for candidate `d127f26a78342ab3d7674ee99e6f50d87532e891` (tree `fa83cf0bc4f7de19adc1dff92b8fd538dba3d443`) and handoff HEAD `89895a6c9188b5011766ef4b848822bfccb0c597` (tree `994d382f534b27f0277bd16fcaa0ce9792bf7a3e`). Candidate workflow `31600217793`, handoff workflow `31600750849`, and termination workflow `31604535408` succeeded.
- Final review result is `NEEDS_USER_DECISION`; `changes_requested_cycles=2`, attempt 3 is final and terminated, attempt 4 is forbidden, the candidate is not approved, and main integration is not authorized.
- The user selected `CREATE_SEPARATE_TASK`: TASK-005 remains blocked and inactive, while completion responsibility moves to separate TASK-011, `TASK-005監査identity修復`. TASK-011 is not TASK-005 attempt 4 and will begin at review attempt 1／standard／cycles 0 after formal requirements are defined.
- Unresolved `FINDING-005-R3-01`: `RELAY_HANDOFF.md` declares approval artifact SHA-256 `0143D33D69C56705FFA74B5E73265A4594681FA7E8440B743EF7658F6829731E` and 34723 bytes, while the committed artifact is Git blob `d42192e7534ca5e2dced23955743a5815fec6c38` and 34370 bytes under the repository LF policy. TASK-011 must repair current references from exact committed LF bytes while retaining this mismatch as historical evidence.
- The unchanged NISA product candidate and its product source/tests are carried forward to TASK-011 without retroactively approving TASK-005. TASK-011 approval will be the new release path.
- User-decision transition artifact: schema `project-user-decision-separate-task-transition-v1`, type `PORTABLE_USER_DECISION_SEPARATE_TASK_TRANSITION`, SHA-256 `BBB9C4FC832FF3BAB7A99D39EAB25E051C8CF01FE7727ED40370F110485E22C8`, 11691 bytes.
- The TASK-005 task, handoff, report, approval artifacts, canonical final-review relay, and unresolved finding remain traceable through termination commit `83dfe4aa5b7e5d90887fc7b8cd3b73ad04a71a58` (tree `5cc3249b1c7ad03480db44e1f2d8d7317f8a6093`); canonical `git_only` transition removes the inactive packet from the current tree without rewriting history.

## GOV-010 TASK-011 approval, main integration, and completion

- TASK-011 spec revision 1 implementation candidate `b2418d1da55a6cdde00079caf89960f82701077f` (tree `06f96ac682162552ff8b21b24b4b81cecad7e960`) was approved in implementation review attempt 2／standard with `changes_requested_cycles=1` and 0 findings. Candidate workflow `31622832014` and review-handoff workflow `31623798289` succeeded.
- Approval/release-handoff commit `51548c913cb83bd42b88f76abc294e8f4331d5be` (tree `55d3684f9330162f90135bcc2ad223bec3085375`) and workflow `31630363364` succeeded. Main was fast-forwarded from `74599efd2afedfa8c1fba196aaab51459571913e` to that exact commit, and main integration workflow `31632682684` succeeded.
- `FINDING-011-R1-01` is resolved. The permanent current audit identity is source commit `89895a6c9188b5011766ef4b848822bfccb0c597`, path `docs/ai/reports/TASK-005/USER_DECISION_APPROVAL_ATTEMPT_3.json`, blob `d42192e7534ca5e2dced23955743a5815fec6c38`, SHA-256 `F56B8FE68C7CBEF3768CF492476DE1E9C17FFF04A719A305D5C760FF487AF5A3`, 34370 bytes.
- The historical declaration remains evidence only at commit `89895a6c9188b5011766ef4b848822bfccb0c597`, path `docs/ai/handoffs/TASK-005/RELAY_HANDOFF.md`, blob `0f60e90764e81d4e7b02efa62c8a8900305d025b`, SHA-256 `0143D33D69C56705FFA74B5E73265A4594681FA7E8440B743EF7658F6829731E`, 34723 bytes.
- Permanent gates passed in PowerShell 7 and 5.1 with 21 historical source-binding checks. Product evidence remained 315 Vitest, 69 take-home focused, 68 NISA focused, 168 portable checks, runtime requests 0, console errors 0, page errors 0, and zero carry-forward diff for `src/**`, `tests/**`, and `tools/test-portable-build.mjs`.
- TASK-005 remains terminated and unapproved as TASK-005; attempt 4 remains forbidden and there is no retroactive TASK-005 approval. TASK-011 is the approved successor release path.
- TASK-011 active TASK/handoff/report artifacts remain traceable at release-handoff commit `51548c913cb83bd42b88f76abc294e8f4331d5be`; canonical `git_only` completion sync removes them from the current tree. No tag or GitHub Release was created.

## GOV-011 TASK-006 approval, main integration, and completion

- TASK-006 spec revision 1 implementation candidate `2d72860abfa342ee800b183ec5dbc8bb4be51c3b` (tree `fe16d3e402da524863c2a5fde7ce3b2da82dbd82`) was approved in implementation review attempt 2／standard with 0 findings. Candidate workflow `31647525559` and review-handoff workflow `31648422117` succeeded; attempts 3 and 4 were not created.
- APPROVED release head `2655beee4d2d9970dff54a57e1935a44741c7a0b` (tree `13c887a5c2e55d549992e85e3f28d79fc26a255b`) and workflow `31650601125` succeeded. Main was fast-forwarded from `b8f4c27544534c8ed00a92493307ac37ed7649d3` to that exact release head, and main integration workflow `31651737269` succeeded.
- `FINDING-006-R1-01`, `FINDING-006-R1-02`, and `FINDING-006-R1-03` are resolved. The approved implementation remains traceable through the candidate, review handoff, and release-head identities above.
- TASK-006 active TASK/handoff/report artifacts remain traceable at release head `2655beee4d2d9970dff54a57e1935a44741c7a0b`; canonical `git_only` completion sync removes them from the current tree. No tag, GitHub Release, or distribution was created.

## GOV-012 TASK-007 approval, main integration, and completion

- TASK-007 spec revision 1 implementation candidate `5df7eb8ff64a212e70d0982c83d664d7b979a5ae` (tree `0112d447cf98a28ace8d976afd4315c351d8a8b6`) was approved in implementation review attempt 2／standard with 0 findings. Candidate workflow `31686352635` and review-handoff workflow `31686923314` succeeded; attempts 3 and 4 were not created.
- APPROVED release head `398f0dae73a12050fa2781445aab8a793c758137` (tree `24ef70353b5491b4fb57b7b716c20348c0ff5667`) and workflow `31688961835` succeeded. Main was fast-forwarded from `02e223ad04574ee7a8772eaf7a9833f80935f3a8` to that exact release head, and main integration exact workflow `31692284846` succeeded.
- `FINDING-007-R1-01`, `FINDING-007-R1-02`, and `FINDING-007-R1-03` are resolved. Candidate以後の製品source／test差分は0件で、approved implementationはcandidate、review handoff、release-head identitiesから追跡できる。
- TASK-007 active TASK/handoff/report artifacts are removed from the current tree by canonical `git_only` completion sync and remain fully auditable at release head `398f0dae73a12050fa2781445aab8a793c758137`. No tag, GitHub Release, or distribution was created.

## GOV-013 TASK-012 approval, main integration, and completion

- TASK-012 spec revision 1 implementation candidate `c70cfabee1c1909660e9ed242d93ecd953f4f709` (tree `251ed1c33de68e64116059d1b07025ea08452e7f`) was approved in implementation review attempt 2／standard with `changes_requested_cycles=1` and 0 findings. Candidate workflow `31751171064` and review-handoff workflow `31752066301` attempt 2 succeeded; attempts 3 and 4 were not created.
- APPROVED release head `4e217b8d47cc955f3b3e3da54d97ead811346381` (tree `d10df82e04b3c634849e19c70ce471af2be75eb8`) and release workflow `31755772429` succeeded. Main was fast-forwarded from `74b6f47b2e11dfe622f956de2fb3ba2640413552` to that exact release head, and main integration workflow `31756479657` attempt 2 succeeded after a transient attempt 1 portable migration assertion failure.
- `FINDING-012-R1-01` and `FINDING-012-R1-02` are resolved. PowerShell 7／5.1 completion matrices retained 34 cases each; product evidence remained 462 Vitest, 69 take-home, 68 NISA, 86 iDeCo, 28 overview, and 284 portable checks with runtime requests 0, console errors 0, and page errors 0.
- TASK-008 local completion used exact completion commit `74b6f47b2e11dfe622f956de2fb3ba2640413552` and main CI `31756479657`; TASK-012 local completion used exact completion commit `4e217b8d47cc955f3b3e3da54d97ead811346381` and the same exact main CI. Each registered TASK worktree was clean, reachable, operation-free, and removed/pruned without touching the separate user-owned same-name worktree.
- TASK-012 active TASK/handoff/report artifacts are removed from the current tree under the project adapter's `git_only` policy and remain fully auditable at release head `4e217b8d47cc955f3b3e3da54d97ead811346381`. No tag, GitHub Release, static deployment, distribution, or user-owned worktree/manifest change was made. The next requirements candidate is TASK-009.

## GOV-014 TASK-009 review-convergence governance recovery

- Shared v0.12.21 was rejected because its clean-source simulation was self-inconsistent; the intermediate assertion-fix commit was also rejected because it was not the final manifest-consistent source.
- The critical recovery pins final manifest-consistent shared main v0.12.24 at commit `34d9727fbc3ed8fe7dfa39c91ca6683b11dc04fb` and migrates TASK-009 attempt 2 from the historical `standard` label to canonical `narrowed` without reexecuting review.
- Attempt 3 is `terminal`; only a third `CHANGES_REQUESTED` routes to `NEEDS_USER_DECISION`, and attempt 4 is forbidden.
- Product requirements, implementation candidate, review decision, and finding contents are unchanged. The previous exact inverse rollback audit remains immutable.
- The incompatible FAD bundle is superseded. GPT generates a new bundle only after the governance recovery commit and exact Governance CI succeed; broader release, distribution, and completion work remains separate.
- Governance recovery commit `e6b0563402448c8408480db3d7ace215cc45df3f` retains run `31807878297` attempt 1 as FAILURE and adopts attempt 2／job `94799343402` as the exact SUCCESS for that commit.
- Before any new formal relay Import, `CURRENT_STATE.md` and the existing `RELAY_IMPORT.md` audit record are normalized to the same five-source convergence values without reexecuting review or changing the decision, findings, product, or canonical relay bundle.
- GPT may generate the replacement CHANGES_REQUESTED bundle only after the normalization commit's own exact Governance CI succeeds; the old FAD bundle remains forbidden.

## GOV-015 TASK-009 finding-ID parser compatibility recovery

- Shared v0.12.24 could not reload canonical review-cycle finding IDs from the TASK open registry and handoff sections. Shared v0.12.25 candidate `f07571d3e8745b9a49a28b1ac77e211c210146a3` passed independent exact review with `APPROVED` and was fast-forwarded to shared main without source changes.
- Personal-Finance-Planner synchronizes only the v0.12.25 governance snapshot while retaining attempt 3／terminal／final as `review_requested`, `changes_requested_cycles=2`, `implementation_review_terminated=false`, and open registry `FINDING-009-R2-01, FINDING-009-R2-02`.
- Product requirements, implementation candidate, and terminal substantive non-pass result remain unchanged. `FINDING-009-R3-01` is preserved as pending formal relay evidence and will be materialized only by a later terminal source `CHANGES_REQUESTED` relay Import.
- Attempt 4 remains forbidden. Product diff and public side effects remain 0.

## GOV-016 TASK-009 spec revision 2 reset and public distribution requirements

- The user explicitly approved repository visibility `private` → `public` and TASK-009 spec revision 2 under approval `USER-APPROVAL-TASK-009-PUBLIC-20260816-022215`; approval evidence SHA-256 is `781A6207DC4031E36A6771048386981D13120CF35C6CDC421819ABFA697089D5`.
- Before visibility changed, a full-history security/privacy audit covered all reachable objects and refs plus retrievable GitHub Actions logs and passed with high-confidence credential、private key、live token、private financial export、unintended user-owned file all 0. The immutable evidence remains outside the repository at `C:\Users\owner\Development\personal\audit\TASK-009-public-visibility-20260816-022215`.
- Revision 1's private-visibility requirement is superseded. Revision 2 requires a public repository and public GitHub Release, recognizes commit history／branch metadata／Actions logs／forkability exposure, and repeats the exposure audit before candidate creation, release side effects, and completion.
- The approved reset bundle `TASK-009_SPEC_REVISION_2_RESET_RELAY_91ED20651DE1.json` (17845 bytes, SHA-256 `91ED20651DE1B6F3C4ECC2A8B1595E4B609C0A3430CF0E4824935F29A1E7D5BA`) was imported at commit `df5b53d3608dc59b74f34ea4cd9ed85ece6265d2`／tree `eefa6dbb315753c625ebb65ee6e9fc82d637a48b`; exact Governance CI `31902724613` attempt 1／job `95055833945` succeeded.
- Review convergence resets to cycles 0／attempt 1／standard／terminated false with no open findings. Attempt 4 was not created, and the terminal relay／cycles 3／NEEDS_USER_DECISION state was not materialized.
- Revision 1 candidate `49a70b1500420320c566501505d6e70be044ef7c`, handoff `95562d46da80eddb04985a934fe0dd6c5ad4384f`, terminal non-pass, and `FINDING-009-R3-01` remain immutable audit evidence. The candidate must not be reused; the finding is incorporated without relaxation into revision 2 R10／AC06／T06／F04 as the stage-before-write exact-subset and pre-publish full-set asset mutation gate.
- Product implementation is not part of reset or requirements activation and has not started. Tag、Release、Pages、deployment、Distribution dispatch、main integration、completion remain forbidden until later lifecycle authorization.
