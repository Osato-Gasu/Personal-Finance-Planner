# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

# Review contract

## Bounded review policy

A review is bounded by the accepted acceptance criteria, the actual candidate diff,
test/build evidence, and candidate identity.  An observed review reports only an
observable finding or a regression introduced after the reviewed candidate.

- Only a new user-safety, data-integrity, security, or release-gate violation may
  be `BLOCKER` or `MAJOR`.
- A known/pre-existing behavior, a current edge case, or a non-regression is
  `MINOR` or `QUESTION`; it is recorded as a bounded TASK or BACKLOG follow-up.
- `CHANGES_REQUESTED` and `NEEDS_USER_DECISION` must not silently expand the
  active TASK scope.  Their handoff names the accepted requirement that is
  affected and the minimal next action.
- A normal first review contains no more than two findings.  A later review may
  report only a newly observed regression against the reviewed candidate.
- An implementation subagent may not be created merely to enlarge review scope.
  A review has one assigned executor and returns its findings to the orchestrator.

The reviewer reports evidence, severity, and the minimal required change.  A
reviewer does not implement a finding, rewrite the candidate, or substitute a
new task design for the accepted scope.

reviewerは報告だけでなくTASK、正本、original baselineからexact candidateまでのactual diff、test/build evidence、product identityをread-onlyで確認します。

判定は`APPROVED`、`CHANGES_REQUESTED`、`BLOCKED`、`NEEDS_USER_DECISION`です。未確認やpartialをPASSにしません。independent reviewのfindingは`BLOCKER`、`MAJOR`、`MINOR`、`QUESTION`で記録し、最終採否は`ORCHESTRATOR_AND_REVIEWER`が決めます。

ChatGPTは判定後、repository write capabilityを実測します。write可能なら通常どおり正本を更新します。write不能ならschema 2 portable bundleと`USER_RELAY_REQUIRED`を返し、NEXT_ACTION更新済みとは記録しません。GO routerがrecipient actor/roleとbundle identityを検証した後、Codexが7 decision state tableに従い、validated bundle全文、review report、TASK、CURRENT_STATE、NEXT_ACTION、Progressをtransactionalに同期します。独立review requestではcandidate、spec revision、正規化request ID、review role、separate session、repository access、review status、preferred／actual executor、provider substitution、strict／fallback policy、開始時刻をlosslessに保持します。完了resultはTASK、NEXT_ACTION、request handoff、result bundleのrequest identityとexecutor contextを再検証し、result、完了時刻、finding件数／IDを監査可能に保存してChatGPTへ返します。Claude実行だけをprovider固有statusへ`requested`／`completed`として記録し、別ChatGPT fallbackをClaude完了として扱いません。

result fieldは存在、型、enum、finding ID形式／一意性まで検証します。request-time preferred executor、review role／status、reviewer model／effortもresultへ反復し、保存済み4正本からrequest IDを再計算します。`NO_BLOCKING_FINDINGS`はBLOCKER/MAJORを含めず、`CHANGES_RECOMMENDED`はfinding 1件以上、`BLOCKED`と`FAILED`はBLOCKER 1件以上を必要とします。completed auditのpersistent検査は直後のChatGPT return route検査と分離し、後続decision前にcurrent canonical result bundleをfinding全文までsemantic比較します。元findingは欠落・改変せず、正式判定の`finding_dispositions`が各IDをexact 1件で採否します。`CHANGES_REQUESTED`はaccepted 1件以上、`BLOCKED`はaccepted BLOCKER 1件以上、`NEEDS_USER_DECISION`は該当status 1件以上を必須にし、`APPROVED`はaccepted／needs_user_decisionを禁止します。

ChatGPTの正式判定は`review_stage: design | implementation`を必須とします。designとimplementationでcandidate fieldと遷移先を分離し、独立review resultそのものを最終承認として扱いません。
