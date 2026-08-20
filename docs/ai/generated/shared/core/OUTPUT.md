# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

# Output

This file is the canonical `global` / `OUTPUT` owner. It defines the public
human-readable output boundary. Internal IDs remain machine-readable and are
not replaced by translated display labels.

## Normal chat grammar

`POLICY.Output` owns the exact ten fields, punctuation, line-feed counts,
marker, payload boundary, and missing values. The readable serialization is:

```text
TASK-ID：<value>
機能：<value>
フェーズ：<value>
依頼先：<value>
渡すセッション：<value>
モデル：<value>
負荷：<value>
実行終了時刻：<value>
特筆事項：<value>
依頼先へのコピペプロンプト：
【以下指示内容】
<payload>
```

The first nine fields are `label + FieldSuffix + value + LF`. The tenth
heading has no inline value. Its next bytes are the marker and one LF; the
complete reusable payload begins immediately after that LF. The output is
UTF-8 without BOM, CR-free, LF-only, and ends with exactly one LF. Missing
values use the policy value `なし`.

`POLICY.Output` supplies the shared Japanese phase derivation, role labels,
and effort labels. A project adapter may add only direct phase extensions; it
cannot replace shared labels. Machine IDs remain in the handoff and report.
Normal `依頼先` is ChatGPT or Codex. For idle/completed output, the assignee is
ChatGPT while session and payload use `なし`. A blocked or user-decision
payload carries the blocker, resume condition, exact candidate identity,
command, findings, and STOP condition.

## Evidence display boundary

The execution-end time is displayed in its required field and full execution
timestamps remain recorded in the report and handoff as
`YYYY-MM-DD HH:mm:ss JST`. A portable relay artifact is represented in the
payload by its bundle name, uppercase SHA-256, byte count, and format. If no
artifact can be created, the complete bundle is returned without lossy
summarization.
