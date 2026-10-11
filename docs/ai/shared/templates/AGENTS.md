# Project bootstrap

1. `docs/ai/SHARED_RULES.lock.yml` が指す版の共通ルールを読む: `docs/ai/shared/RULES.md`（毎回）と `ROLES.md`。手順は `.claude/skills/` から必要なときだけ。
2. このProject固有の恒久条件は `docs/ai/PROJECT.md`（前半のfront matterが値）。Sharedより厳しくしてよいが、緩めない。
3. 作業は TASK 単位（軽い依頼はTASKなしでもよい）: `pwsh docs/ai/shared/tools/shared.ps1 task start -Root . -Id TASK-n -Title "..." -Kind fix`。
4. 決定はユーザー。迷ったら「状況・選択肢・推奨・止まる影響」を短く聞く。

このファイルは入口であり、規則の所有者ではない。
