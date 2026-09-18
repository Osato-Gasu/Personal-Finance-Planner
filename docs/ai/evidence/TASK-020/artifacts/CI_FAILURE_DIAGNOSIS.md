# Actual candidate CI failure (not infrastructure pending)

[Formal run 35313195554](https://github.com/Osato-Gasu/Personal-Finance-Planner/actions/runs/35313195554)
is a completed `failure` on exact subject
`5f5252db3eb99357638400de3706bd267a43aa60`, `workflow_dispatch`, fixed
`no-ci/task-020-rc-5f5252db3eb9`. Windows job `105499270009` executed on
`GitHub Actions 1000002318`. Exact-SHA guard, PS7 gates and PS5.1 governance /
governance-contract steps passed. The next step, PS5.1 TASK HTML contract, failed
at the unknown-tracking assertion; later product steps did not run.

Scoped job log at 2026-09-18T06:03:58.1887474Z:

```text
FAIL: legacy and unknown tracking are explicit
tools/test-task-html-contract.ps1:10 char:83
Process completed with exit code 1
```

The test script used non-ASCII Japanese literals in UTF8-without-BOM PowerShell
source. Local PS5.1 passed, but hosted legacy ANSI source decoding can change
those literals. Production generator already constructs the unknown marker from
Unicode code points and reads data using explicit UTF8. Apply the same existing
pattern to the fixture/assertion; keep the meaningful unknown-tracking check.
This is a bounded test-harness correction, not a product or financial change.

The failed platform record is preserved by this direct run link and TASK current
CI fields. Emission of the normative minimal completed-run event remains pending
GPT clarification of SPEC-020-CI-EVENT-ENVELOPE; no incompatible event was appended.
