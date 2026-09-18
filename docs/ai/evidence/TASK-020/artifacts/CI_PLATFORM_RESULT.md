# Actual formal-CI platform readback (raw evidence)

This artifact preserves observed platform facts, not another current-state or
durable-history owner. TASK current CI fields remain authoritative. Normative
completed-run EVENTS records are explicitly not emitted pending
SPEC-020-CI-EVENT-ENVELOPE disposition; this artifact does not claim that gate done.

## Replacement exact candidate — SUCCESS

[Run 35314250383](https://github.com/Osato-Gasu/Personal-Finance-Planner/actions/runs/35314250383)
was dispatched once after separated I09 PASS, using workflow_dispatch with
candidate_sha `e019f737f52e8e499126478ae46dba4e7cf82166` and immutable ref
`no-ci/task-020-rc-e019f737f52e`; API acknowledged HTTP200 and this run ID.
Final authenticated platform readback: status completed, conclusion success,
head_sha `e019f737f52e8e499126478ae46dba4e7cf82166`, event workflow_dispatch,
workflow `.github/workflows/ci.yml`, ci_mode extended.
Job `105502413648`, runner `GitHub Actions 1000002319`, GitHub-hosted Windows.

Required steps passed: exact candidate SHA guard; governance, governance contract,
TASK HTML contract, bootstrap smoke and SharedSync under PowerShell7 and5.1;
Node24 install; typecheck/lint/format; product tests; fixed2026 rules, NISA, iDeCo,
integrated overview; build; committed root launcher freshness; completion automation
in both shells; standalone portable file build. The historical TASK001-only
boundary step was correctly skipped for this TASK020 ref. No required step skipped.

## Prior exact candidate — FAILURE retained

[Run 35313195554](https://github.com/Osato-Gasu/Personal-Finance-Planner/actions/runs/35313195554)
completed failure on `5f5252db3eb99357638400de3706bd267a43aa60` with immutable
ref `no-ci/task-020-rc-5f5252db3eb9`. Hosted PS5.1 TASK HTML unknown-tracking
assertion failed before product suites. This actual failure and its original
candidate/ref remain history; the replacement success does not rewrite them.
See CI_FAILURE_DIAGNOSIS.md and VERIFY_RESULT_I09.md.

No main CI, released-main state, downstream integration, local-main completion
or actual TASK cleanup is claimed by either candidate run.
