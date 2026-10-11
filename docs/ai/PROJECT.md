---
schema: 1
commands: {"install": "npm ci", "build": "npm run build", "test": "npm test", "lint": "npm run lint", "typecheck": "npm run typecheck", "format_check": "npm run format:check", "verify_launcher": "npm run verify:launcher", "portable": "npm run test:portable"}
merge_check: ["npm run typecheck", "npm run lint", "npm run format:check", "npm test", "npm run verify:launcher", "git diff --check"]
ci_recommend_paths: ["src/**", "tests/**", "index.html", "Personal-Finance-Planner.html", "package.json", "package-lock.json", "vite.config.ts", "tsconfig.json", "eslint.config.js", "tools/**", ".github/workflows/**"]
ci_skip_paths: ["docs/**", "README.md", "AGENTS.md", "CLAUDE.md", ".claude/**"]
ci_workflow: ".github/workflows/ci.yml"
risk_paths: ["src/domain/**", "src/rules/**", "src/data/**", "docs/product/**", "Personal-Finance-Planner.html", "package.json", "package-lock.json", ".github/**"]
strict_when: ["計算式・端数処理・制度ルール（適用期間と出典）を変える", "保存形式・移行・インポート／エクスポートを変える", "配布・公開（Pages等）を扱う"]
verify_capabilities: {"cloud": ["npm ci / typecheck / lint / format:check / test / test:rules / test:nisa / test:ideco / test:overview", "npm run verify:launcher（root launcherの鮮度）", "git diff --check"], "local": ["npm run test:portable（Edge/Chromeでfile://を実行。Windows）"], "user_only": ["ブラウザでの画面操作・見た目の確認", "JSONバックアップの保存と復元の実操作"]}
roles: {"orchestrator": {"agent": "Codex デスクトップ", "model": "6.1 Sol", "effort": "medium"}, "implement": {"agent": "Codex サブエージェント", "model": "6.0 Luna", "effort": "xhigh"}, "verify": {"agent": "Codex サブエージェント", "model": "6.0 Luna"}, "review": {"agent": "Codex サブエージェント", "model": "6.1 Sol", "effort": "medium"}}
profiles: {"saving": {"roles": {}, "loop_on": ""}, "normal": {"roles": {}, "loop_on": ""}, "rich": {"roles": {}, "loop_on": ""}}
---
# PROJECT — 暮らしと資産プランナー

`Osato-Gasu/Personal-Finance-Planner` 固有の恒久条件の正本（前半の front matter が値）。共通の規則・役割・手順は Shared の `docs/ai/shared/RULES.md`・`ROLES.md`・`.claude/skills/`（`docs/ai/SHARED_RULES.lock.yml` が版を固定）で、ここに繰り返さない。このrepositoryは公開なので、個人情報・実データ・ローカルの絶対パスを書かない。

## 目的
- 個人利用の資金計画（給与・手取り・家計・NISA・iDeCo・将来資産）をブラウザ内で試算するローカルファーストWebアプリ。バックエンドなし。
- 要件・設計・計算・制度ルールデータの正本は `docs/product/**`（`REQUIREMENTS`・`ARCHITECTURE`・`DATA_MODEL`・`CALCULATIONS`・`RULE_GOVERNANCE`・`REVIEW_POLICY` など）。ここへ写さない。

## 技術構成
- Vite / TypeScript / Vanilla DOM / Vitest / ESLint / Prettier。Node.js 24（`.nvmrc`）。
- 配布物はrootの単一HTML `Personal-Finance-Planner.html`（`npm run build` が生成・同期。HTTP server・Node・外部通信なしで動く）。
- 位置づけ: `src/domain`（計算）・`src/rules`（制度ルール）・`src/data`（保存・インポート）・`src/modules`（画面）・`src/app`。

## 製品不変条件（どのTASKでも緩めない）
1. 金額計算と端数処理の意味を変えない。
2. 制度ルールの適用期間と出典（source identity）を保つ。
3. 二重計上を防ぐ。連動値の正本は一つ。
4. データ保全: 移行・インポート・エクスポートは無損失。検証失敗や取消で既存データを変えない。ユーザー保有データを守る。
5. 古い値（stale）を表示しない。合計の整合を保つ。未対応の条件は黙らず明示する。
6. XSS等の基本的なセキュリティ。
7. 製品の要件・必須受入条件は `docs/product/REVIEW_POLICY.md` が正本で、その必須項目はそのまま有効。製品の意味・制度ルール・パッケージ版・保存形式の変更は、governanceの作業に混ぜない。変更時は該当の個別suite（`test:rules`・`test:nisa`・`test:ideco`・`test:overview`）と全体suiteを通す。

## 完了と公開
- 個人利用の製品。配布・Pages公開・releaseは通常の完了操作ではない。必要になったら、ユーザーの新しい依頼とTASKで行う（RELEASE.md が要る時に作る）。
- root launcher `Personal-Finance-Planner.html` はsrc変更と一致していること（`npm run verify:launcher`）。launcherを守る。
- ローカル完了の補助: `tools/complete-task-local.ps1`（Windows、PowerShell 7／5.1互換）。

## 実機確認が必要な範囲（USER）
- ブラウザでの画面操作・見た目、JSONバックアップの保存と復元。`npm run test:portable` はWindows＋Edge/Chromeが要る（クラウドでは「未検証」）。

## 決定（日付つき）
- 2026-10-11: Shared 4.0 で再始動した（`AGENTS.md`・`CLAUDE.md`・この文書・`docs/ai/shared/`・`.claude/skills/`）。
- 2026-10-11 開発の経路: クラウドのClaudeセッション（頭脳）がユーザーとの窓口、ローカルのCodexデスクトップ版が実装の責任者（Shared RULES §8）。
- 2026-10-11 棚卸し（旧PROJECT.mdを振り分けた）:
  - 削除（Sharedに同じ内容）: 破棄・履歴書換え・強制削除をしない等の安全操作（RULES §2）、BLOCKED扱い、worktree掃除の条件の細則、TASK-xxxの正本の扱い。
  - 退役（Shared 2.xの語彙・仕組み）: `next_actor`・`GPT_ORCHESTRATOR`・authority・pointer／claim、`TASKS.html`生成、SharedSync自動登録（`DOWNSTREAMS`）、`PROJECT_ADAPTER.psd1` のShared2向け項目、REVIEW_POLICYの「同一TASK最大3回レビュー」と役割・routingの仕組み（Shared 4.0のモードとRULES §14が代わる。REVIEW_POLICYの必須条件は残る）。
  - 履歴へ: TASK-020、`CURRENT_STATE.md`・`BACKLOG.md`・`DECISIONS.md`・`PRODUCT_IDENTITIES.yml`・evidence・handoffs は変更せず履歴として残す。
  - 値へ移動: コマンド・CI・リスクパス・検証範囲・モデル割当は front matter。
  - 本文に残した: 製品不変条件、公開と配布の扱い、launcher。
  - Sharedへの昇格提案: なし。
