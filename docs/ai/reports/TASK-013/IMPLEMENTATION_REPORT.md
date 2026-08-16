# TASK-013 Implementation report

## Identity

- task: `TASK-013`
- spec revision: `1`
- branch: `codex/task-013-public-audit-stable-id`
- activation commit／tree: `184d4da3f79443416f0570aec2b029d4c2c72202`／`86b0f2d9e9ded5618c80d2062ae1602b0f907e1c`
- transition commit／tree: `30cc57b05ac49dc6afa587f9d70ade571e526d9c`／`2b3039cdd499b37f7ed2f8bace9bec7d43195a60`
- activation CI: run `31947743040`／attempt `1`／job `95166339042`／`SUCCESS`
- shared version／commit: `0.12.25`／`f07571d3e8745b9a49a28b1ac77e211c210146a3`
- started: `2026-08-16 22:29:43 JST`
- implementation bytes finished: `2026-08-16 22:45:01 JST`
- final handoff synchronization: pending candidate exact CI

TASK-009 remains terminated at cycles 3／attempt 3／terminal／final. Attempt 4 is forbidden. Candidate `03825e58f61f95d2364f09246f202744e4617ba5`／tree `934892b96eff8e5b66ddf67e71eefd29353a86a0` remains unapproved and unreleased and is not reused as a TASK-013 approval or release identity.

## Implementation

- Canonical positive integer validation accepts only positive safe integer numbers and canonical positive decimal strings for Actions run／job／artifact IDs.
- Stable keys are run ID, run ID plus job ID, and artifact ID. Mutable metadata is encoded separately in fixed field order with explicit type, null, and undefined representations.
- Identical stable-ID repetition is rejected as duplicate／pagination overlap. Different metadata for the same stable ID is rejected as an explicit conflict. No deduplication, overwrite, or merge occurs.
- Existing `actions_*_set_sha256` fields now mean sorted stable-key set hashes. `actions_*_record_set_sha256` fields and `actions_inventory_identity_version: stable-id-v1` bind deterministic metadata records.
- Inventory, retrieval, scan, report counts, stable-key hashes, and record-set hashes derive from the same validated unique inventory. Duplicate／conflict is rejected before job-log or artifact retrieval and before report creation.
- Artifact evidence paths use only canonical artifact IDs, so mutable names are not copied into report paths or error messages.

## Tests

- Canonical ID PASS／reject matrix covers number, decimal string, null, undefined, boolean, object, array, empty, zero, negative, decimal, exponent, plus sign, whitespace, leading zero, and unsafe number inputs.
- Run／job／artifact duplicate and conflicting metadata cases are independently rejected without exposing raw metadata.
- Page-1 100-record／page-2 overlap simulations reject identical and conflicting run／job／artifact stable IDs before content retrieval or report creation.
- Stable-key and record-set hashes are order-independent; metadata-only changes preserve the stable-key hash and change the record-set hash.
- Missing record-set hashes and wrong inventory identity version are rejected with `side_effects: 0`.
- Existing HTTP, archive, history, redaction, release staging, proof-transfer, and completeness tests remain enabled.
- full Vitest: `604` tests／`21` files
- focused rules／NISA／iDeCo／overview: `69`／`68`／`86`／`28`
- distribution contract／public exposure audit: `77`／`65`
- audit normalization／completion simulation: PowerShell 7 and 5.1 each `21`／`34`
- clean isolated requirements／product-identity smoke: PowerShell 7 and 5.1 both PASS
- portable browser: `284` checks／`5` routes／360px／runtime requests `0`／console errors `0`／page errors `0`
- staged HTTP distribution: `5` files／`5` routes／360px／runtime requests `0`／console errors `0`／page errors `0`
- `npm ci`, typecheck, lint, format check, build, and launcher freshness: PASS; vulnerabilities `0`

## Working-tree public exposure audit

- path: `C:\Users\owner\Development\personal\audit\TASK-013-stable-id-20260816-223814\working-tree-audit.json`
- target／phase: `184d4da3f79443416f0570aec2b029d4c2c72202`／`candidate_ci`
- bytes／SHA-256: `2990`／`F75A78251CD440E318FB8E9B2BB402A3DB40C141AED769BAB962D8A4972B8B8E`
- result／findings: `PASS`／`0`
- Actions inventory／retrieval／scan: runs `128`; jobs `128`／required logs `128`／retrieved `128`／scanned `128`; artifacts `0`／`0`／`0`
- run stable-key／record hashes: `44E3A11558635D75332EEFC7EF04B9726136762A632F73269AC1A6E45E203952`／`A29636F4F46F29E52FCC74251B318DB128CE91ED3251B55A5AD008CCA08FCFB2`
- job stable-key／record hashes: `68403B4A0833145DD0DCAEBE34F79C4B3E989EF533F82824CE3BB6A32B62A8E1`／`DDFE6397467DA6D1A1845678E6CE63111FF39108E55AB1C1F496AE3115C4D571`
- artifact stable-key／record hashes: `01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B`／`01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B`

## Candidate and CI

- candidate commit／tree: resolved by the single candidate commit after all local gates
- candidate audit: generated for the exact local candidate before push and recorded in the handoff-only descendant
- candidate Governance CI: required exact push run; pending candidate creation
- handoff Governance CI: pending candidate success and handoff-only transition

## Non-regression and public state

- allowed implementation paths: public exposure audit CLI, library, test, and this report only
- product `src` tree: `9106f855abf2f7534b6fbdff8da303fe986e0b53`
- `package.json`／lock／launcher blobs: `13148c93b14e84fa633bbfe265e557f57e0c90eb`／`0d7b8ba0ff954d08174ff26207fbc21b3d1b6408`／`87dcb821f73ecce65f8970db812012fc2a870bad`
- `docs/product/**` and `docs/ai/generated/shared/**`: unchanged
- origin/main: `0dbc4fb102c92a6df12331540c6cc11010258f54`
- repository: public; tags `0`; Releases `0`; Pages not configured; deployments `0`; workflow dispatch runs `0`; open PRs `0`
- distribution／release side effects: `0`
