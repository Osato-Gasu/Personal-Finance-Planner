# Personal Finance Planner — 開発の入口

Codexデスクトップ（Windowsローカル）とクラウドのClaudeで開発する。共通ルールは Shared（`docs/ai/SHARED_RULES.lock.yml` が版を固定し、`docs/ai/shared/` にその複製がある）。

1. `docs/ai/shared/RULES.md`（毎回）と `ROLES.md` を読む。手順は `.claude/skills/<名前>/SKILL.md` から必要なときだけ（proposal / task-authoring / orchestrate / verify / independent-review / ci / shared-maintenance）。
2. `docs/ai/PROJECT.md`（この製品の恒久規則。前半の front matter が値）を読む。製品の要件・設計・計算は `docs/product/**` が正本。
3. 割り当てられたTASK（`docs/ai/tasks/TASK-NNN.md`）を読み、`orchestrate` の「作業の準備」を最初に実行する: `pwsh docs/ai/shared/tools/shared.ps1 task start -Root . -Id TASK-NNN -Title "…" -Kind fix`（作業ブランチは `work/TASK-NNN`）。TASK無しの小さな依頼は、依頼文に書かれた受入条件に従う。
4. 現在状態の正本はTASKファイル。生成物や古い表示（`docs/ai/TASKS.html` など）は止まる理由にならない。ひな形は `docs/ai/shared/templates/`。
5. 旧運用（Shared 2.x）の文書 `docs/ai/evidence/`・`handoffs/`・`tasks/TASK-020`・`CURRENT_STATE.md`・`BACKLOG.md`・`DECISIONS.md` などは履歴として読めるが、変更しない（新しいTASKは 4.x 形式）。
