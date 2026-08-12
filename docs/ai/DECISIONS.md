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
