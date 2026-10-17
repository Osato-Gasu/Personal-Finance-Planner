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
roles: {"brain": {"agent": "Claude Code Cloud", "model": "Sonnet", "effort": "medium（ユーザーが毎回選べる。これは既定）"}, "orchestrator": {"agent": "Codex Cloud", "model": "6.1 Sol", "effort": "medium"}, "implement": {"agent": "大きな実装・修正はMainが呼ぶサブ（別の実行）。小さな修正（目安: 1〜2ファイル・数十行以内で、手元の検査ですぐ確かめられるもの）だけMainが直接", "model": "6.0 Luna", "effort": "high（難しい部分は負荷を上げ、足りなければ6.1 Solのサブ）"}, "investigate": {"agent": "サブ（別の実行）（範囲が広く判断の幅が小さい調査だけ。着手前の調査は基本Main）", "model": "6.0 Luna", "effort": "medium"}, "verify": {"agent": "Codex Cloud（別の実行）", "model": "6.0 Luna", "effort": "xhigh"}, "review": {"agent": "Codex Cloud（別の実行）", "model": "6.1 Sol", "effort": "medium"}, "top": {"model": "6.0 Astra", "use_when": "Solの高負荷で検討しても残る、証拠のそろった難問の診断だけ。修正・検証・PASS判定には使わない", "effort": "medium（必要ならhigh）", "max_per_issue": "2"}, "claude_implements_when": ["UI/UX刷新のTASK", "Sharedの改修に付随する規則整合性の確認", "週制限枠が余ったとき"], "claude_models": {"sol_equivalent": "Sonnet 5.5", "luna_equivalent": "Haiku 5.5"}}
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

## 返却メッセージの形
- **返却メッセージの形**: Shared ROLES「表示」に従う。コピペ用ブロックには受け手のAIが使う内容だけを書き、実行表・渡し先・ユーザー向けの一言はブロックの外に置く。このProjectでは、ブロックの根拠に確認した検証コマンドと結果を、残課題に未実施・未確認の事項を含める。

## Codex Cloud の注意
2026-10-11 に観測した事実。
1. Cloudの既定のローカルブランチ名は `work` で、`task start` 後に作る `work/TASK-NNN` と衝突する。先に `git branch -m work cloud-work-saved` で改名する（削除しない）。
2. `pwsh` はPATHに無い。ポータブルのPowerShell 7を、起動するプロセスのPATHにだけ足して使う。
3. 環境のホストはallowlistで制限されている。GitHubのfetchと `work/*` のpushは通る。
4. リポジトリの外への書込みは拒否される。出力はリポジトリ内とGitHubの作業ブランチに置く。

## 決定（日付つき）
- 2026-10-11: Shared 4.0 で再始動した（`AGENTS.md`・`CLAUDE.md`・この文書・`docs/ai/shared/`・`.claude/skills/`）。
- 2026-10-11 開発の経路と実行環境（ユーザー決定）: クラウドのClaudeセッション（頭脳）が窓口で、必要に応じてChatGPT（Pro）の設計レビューを使う（ユーザーが運ぶ）。Codex（Cloud）がオーケストレーター・実装・検証・独立レビューの4役を別の実行で担い（4役の分担は 2026-10-16 の決定で置換）、ユーザーが動作確認できる状態になるまで自律で進める。Claudeが実装を担当するのは、UI/UXの刷新TASKと、Sharedの改修に付随する規則整合性の確認に限る。ゲーム等の実機が要らないため、CodexはCloudを使う。ただしWindows／Edge／Chromeが要る確認（`verify:launcher`、`test:portable`）はCodex Cloudでは行えず、「ユーザー確認待ち」として残す。Codex Cloudの具体的な使い方（TASKの渡し方、ネットワーク、sandbox）は、最初のTASKで確認して、ここへ反映する。
- 2026-10-11 棚卸し（旧PROJECT.mdを振り分けた）:
  - 削除（Sharedに同じ内容）: 破棄・履歴書換え・強制削除をしない等の安全操作（RULES §2）、BLOCKED扱い、worktree掃除の条件の細則、TASK-xxxの正本の扱い。
  - 退役（Shared 2.xの語彙・仕組み）: `next_actor`・`GPT_ORCHESTRATOR`・authority・pointer／claim、`TASKS.html`生成、SharedSync自動登録（`DOWNSTREAMS`）、`PROJECT_ADAPTER.psd1` のShared2向け項目、REVIEW_POLICYの「同一TASK最大3回レビュー」と役割・routingの仕組み（Shared 4.0のモードとRULES §14が代わる。REVIEW_POLICYの必須条件は残る）。
  - 履歴へ: TASK-020、`CURRENT_STATE.md`・`BACKLOG.md`・`DECISIONS.md`・`PRODUCT_IDENTITIES.yml`・evidence・handoffs は変更せず履歴として残す。
  - 値へ移動: コマンド・CI・リスクパス・検証範囲・モデル割当は front matter。
  - 本文に残した: 製品不変条件、公開と配布の扱い、launcher。
  - Sharedへの昇格提案: なし。
- 2026-10-16 担当の分け方（ユーザー決定。Shared 76a85b4 の RULES §4の9・§5の14・ROLES に合わせる）: オーケストレーター（Main）が実装・修正を兼ね、量の多い定型作業や切り出せる調査だけをサブ（別の実行）へ分ける。検証と独立レビューは実装に関わらない別の実行が行い、Mainは代行しない。検証の負荷は内容で選ぶ（リスクhigh以上は最低high）。同じ問題で5回失敗したら（その間は負荷・モデルを強めてよい）頭脳へ返す。最上位モデル（`roles.top`）は証拠のそろった難問の診断だけに使い、同じ問題に2回まで。これは 2026-10-11 の「4役を別の実行で」を置き換える。
- 2026-10-17 担当とモデル・負荷の更新（ユーザー決定。Shared 6137fac の ROLES に合わせる）: 大きな実装・修正は、オーケストレーター（Main）が呼ぶ Luna のサブ（high）に任せ、Main（Sol・medium）は着手前の調査・採否・統合の判断と、小さな修正（目安: 1〜2ファイル・数十行以内で、手元の検査ですぐ確かめられるもの）だけを行う。直行は小さなTASKだけ。検証は Luna・xhigh、リスクhigh以上は Sol・high。独立レビューは Sol・medium。調査のサブ（範囲が広く判断の幅が小さいときだけ）は Luna・medium。頭脳は Sonnet・medium が既定（ユーザーが毎回選べる）。これは 2026-10-16 の「Mainが実装・修正を兼ねる」を更新する。
- 2026-10-17 訂正（ユーザー決定。Shared 1fc78ba の ROLES・RULES に合わせる）: 検証はリスクが高くても Luna・xhigh のままにする（`roles.verify` の `high_risk_*` を削除）。厳格モードでは Sol・medium の独立レビューが上位モデルの別の目になる。検証を強めるのは、INCONCLUSIVE が続く、同じ問題で詰まるときだけ。直行は変更目的全体の累積規模が小さな修正の目安に収まる TASK だけ。TASK の risk が high 以上なら標準以上、critical なら厳格。完了時の実行表は廃止した。上の「リスクhigh以上は Sol・high」は取り消す。
- 2026-10-17 Claudeで回すときの規則（ユーザー決定。Shared 3fd6da1 に合わせる）: Claudeが実装する場面（UI/UX刷新、Sharedの改修に付随する規則整合性の確認、週制限枠が余ったとき）では、頭脳を担当しているセッションがそのままオーケストレーター（窓口を兼ねる）になり、実装まで行う。規則はCodexと同じで、モデルは Sol 相当=Sonnet 5.5、Luna 相当=Haiku 5.5。検証と独立レビューは実装に関わらない別の実行。診断モデルは 6.0 Astra と版を明記した。
