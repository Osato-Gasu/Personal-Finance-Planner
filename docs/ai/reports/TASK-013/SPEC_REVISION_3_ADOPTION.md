# TASK-013 Spec Revision 3 adoption audit

## Authority

- task／revision／design: `TASK-013`／`3`／`2`
- user approval: `USER-APPROVAL-TASK-013-SPEC-REV3-20260819-094900`／`APPROVED`／`2026-08-19 09:49:00 JST`
- independent re-review: `PASS`／findings `0`／`FINDING-013-R3-IDR-01` resolved
- final disposition: `APPROVED_FOR_FORMAL_ADOPTION_AND_IMPLEMENTATION`／`2026-08-19 09:52:00 JST`
- implementation／new candidate／one bootstrap push authority: `true／true／true`
- main integration／Distribution／final release authority: `false／false／false`
- adoption recorded at: `2026-08-19 10:04:32 JST`

## Raw external identities

Exact originals were measured before repository writes and copied byte-for-byte to repository-external evidence `C:\Users\satoshi-sugaya.dh\Development\personal\_evidence\TASK-013-spec-rev3-20260819-100353`. Machine-readable measurements are in `SPEC_REVISION_3_SOURCE_IDENTITIES.json`.

- upload ZIP: 17358 bytes／SHA-256 `DBDDEB3F7A5D48BE14A46E192E2983C6B2A3966C86F6B1C82E895CC3A681998A`
- design: 16989 bytes／SHA-256 `622C4D8348437ECDC5479BD701A60B9962B2E9EF3F052CE9ECC0ED0F741603BA`
- user approval: 1877 bytes／SHA-256 `760D6B3716EDBC580BEA7591545B22AFCE4520D0DF7F78E26E1B633973CCD3E3`
- independent result: 8388 bytes／SHA-256 `B346E474E0F528A87EA2631541A0CAF02D0964FB827BEA1B3E03A13579B761E1`
- final disposition: 1590 bytes／SHA-256 `59BA003C113EC3052E5952D38148431B3FBA44C40BF51630B5A9EFE1FE63955D`
- implementation prompt: 15083 bytes／SHA-256 `A791A9D398E578816E05CBB93E40E9EC4B9514EAEDE42248A9DAA38533BD378F`

All five entries are regular, non-link, UTF-8 no BOM, LF-only, and have a trailing LF. The ZIP had no duplicate or unsafe path entries.

## Preconditions

- branch／local HEAD／remote tip: `codex/task-013-public-audit-stable-id`／`ffee8284704bd2d8e19b7a5ae85d5e772a39977c`／same
- current tree: `d19d6894fcac264ae8c95e164fad485f9c1438ec`
- origin/main: `0dbc4fb102c92a6df12331540c6cc11010258f54`
- worktree／index／untracked／unfinished operation: clean／clean／0／0
- failed exact CI: run `32119217442`／attempt `1`／job `95655572235`／`FAILURE`; one run only; no rerun
- repository: public; tags／Releases／deployments／workflow_dispatch／open PRs `0／0／0／0／0`; Pages `404`
- public distribution side effects: `0`
- shared: version `0.12.25`／commit `f07571d3e8745b9a49a28b1ac77e211c210146a3`

## Adopted lifecycle

- status／phase／actor／role: `ready／implementation／Codex／IMPLEMENTER`
- cycles／attempt／profile／final／terminated: `0／1／standard／false／false`
- implementation candidate／open findings／user confirmation: `none／none／false`
- release authority: `false`
- Revision 1 attempt 4 remains forbidden. Spec Revision 2 candidate, VERIFY, exact failed CI and historical 404 evidence remain immutable history and active lower-layer requirements.

## Exact auditor self-exclusion

- Complete `filter=all` inventory remains mandatory. Only the exact currently executing auditor workflow run may be partitioned out, in `candidate_ci` or `release_preflight` only.
- Caller ID／attempt must equal GitHub runtime context and authoritative run metadata. Repository、event、head SHA、status、conclusion、workflow path and positive canonical workflow ID must match exactly.
- The workflow blob must be the exact regular Git blob resolved from `target_sha:<workflow_path>`. Latest／branch-tip／working-tree inference is forbidden.
- Producer and consumer compare authoritative workflow ID and blob SHA field-by-field; recomputed hashes are never substitutes.
- Exactly one auditor run and a non-empty auditor job set are excluded. Every other non-completed job remains BLOCKED.
- Canonical topology/run/job records, set hashes and count equations are mandatory. Self-exclusion truthfully sets `actions_scan_complete=false` and permits evidence-gate PASS only after every topology、auditee、historical、count、hash and authoritative check.
- Failed run `32119217442` is a normal completed auditee in the next audit. Each successful prior auditor run is scanned normally by the next audit, closing the chain.

## Bootstrap boundary

This governance-only adoption commit is created locally as the direct child of `ffee8284704bd2d8e19b7a5ae85d5e772a39977c` and is not pushed alone. Its direct-child implementation candidate may be pushed with it exactly once only after full local gates and separated read-only high-risk VERIFY PASS. Failed run `32119217442` is never rerun or relabeled.

No product/security source, workflow, financial product code, package, product documentation, or generated shared file is changed by this adoption commit.
