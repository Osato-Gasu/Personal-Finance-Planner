---
task_id: TASK-020
repository: Osato-Gasu/Personal-Finance-Planner
from_actor: GPT_ORCHESTRATOR
next_actor: CODEX_MAIN
authority: GPT_APPROVED
approved_by: GPT_ORCHESTRATOR
decision: IMPLEMENTATION_AUTHORIZED
target_shared_version: 2.0.6
target_shared_sha: e384d21a43fcda1195556d4ef6fa382bede48da8
---

# TASK-020 GPT統括 handoff — Shared 2.0.6 governance migration

`docs/ai/tasks/TASK-020.md`を正式仕様・完了条件として扱う。
新しい専用Codex Mainで完了まで自律的に進める。

## Main運用

- MainはSol / XHighを原則。USER明示設定があれば優先。
- BUILDはLuna XHighを基本。最大2、scope/file重複禁止、integration writerはMain。
- exact candidate separated VERIFYはLuna Max。
- released SharedSync contractのProject adoptionなので独立設計確認は今回は不要。
- routine test / VERIFY FAILは同じMain内で修正→新candidate→再VERIFY。
- 中央GPTへ戻すのは COMPLETED / SPEC_CHANGE_REQUIRED / USER_DECISION_REQUIRED / BLOCKED の正式条件のみ。
- main/release/tag/repository setting変更は明示authorityなしで行わない。
- user-owned diff消去、reset/clean/restore/stash、rebase/amend/squash/force pushは禁止。
- GitHub-native returnが標準。手動ファイル転送を要求しない。

## 本TASK固有

単純lock updateではない。legacy Shared 0.12.20とfinance固有review/completion contractがある。
最初にsemantic inventoryを作り、Shared共通routingとfinance固有安全を分離する。

必ず残す:
- monetary calculations
- effective rule periods
- double-count prevention
- data preservation/lossless migration
- product source `docs/product/**`
- root launcher/local-main completion safety
- historical TASK-004/005 unapproved、TASK-009 retired、TASK-019 accepted state
- planned product backlog 0

置換対象:
- legacy Shared snapshot/relay/routing
- old implementation-review 3-attempt orchestration
- future git_only TASK deletion policy

製品source/rules/dataを変更しない。
新製品TASKを開始しない。

Actions復旧証拠がなければpoll目的でretryしない。
local PASS + exact VERIFY PASSならPENDING_REMOTE_CIで中央GPTへ返せる。

## 暫定vNext Chat表示

終了Chatは日本語中心で必要最小限。
12工程を毎回全件表示し、EVENTSから工程突入回数を示す。
初期回数:
要望整理1 / 要件定義1 / 設計1 / 独立確認0 / 仕様確定1 / 実装1 / その他0。

Chat ledgerは:
`番号 | 役割 | 呼出モデル / 負荷 | 結果`
のみ。actual model/effortや長いscope/identityはrepository Evidenceへ保持。

formal return時はTASK/EVENTS/TASKS.htmlを同期し、
NEXT_ACTIONを中央GPTへ遷移、claim解放、readback確認する。
