# tools — 核道具

`pwsh tools/shared.ps1 <check|task|push|recover|pin>` と `tools/lib/`。GitHub Actions も別のGitHubユーザーも要らず、単独で動く（`tools/gate/` が無くても動く）。
規則そのものは [RULES.md](../RULES.md)。ここは**機械が守る保証**と、その実現・限界・終了コードを持つ。各保証には対応するテストを置く（`# covers: Ix` の有無を `shared.ps1 check` が検査する。十分性までは検査しない）。
gate道具（`gate` / `merge` / `release` / `authority` / `evidence`）は [gate/README.md](gate/README.md)。無い checkout では `GATE_NOT_INSTALLED`（exit 2）で止まる。

## 保証

### I1 履歴・ユーザーデータの保護
toolsが実行するgitは**許可リスト**（コマンドとフラグの有限集合）だけで、force push・履歴改変・破壊的コマンド・`+`/`:` refspec・option注入は拒否する（`GIT_FORBIDDEN`）。toolsは `main`/`master`、`policy.json` の `base_branch`/`protected_branches`、**remoteの実際のdefault branch**（`ls-remote --symref`）へ直接書かない（`REF_PROTECTED`、大文字小文字を区別しない）。書込みは設定済みremoteの**実効URL**（`url.*.insteadOf`・`pushurl` 適用後）がGitHubの期待repositoryであるときだけ（`REMOTE_IDENTITY`）。toolsのgitは置換object・graft・commit-graph・追加alternates・注入configを無効にした単一の起動点を通り、祖先判定とpushが同じ実commitを見る。作業ツリーに未コミット変更があれば `TREE_DIRTY` で止まり、一切触れない。mainへの書込みはPR経由のみ。
*実現*: `Assert-SafeGitArgs`（許可リスト）、`Assert-CleanTree`。*USER設定*: mainのbranch protection（tools/gate/README.md「動作要件とGitHub側の設定」）。

### I2 exact SHA
承認・CI・Evidence・pinは40桁の完全なSHAにだけ結びつく。省略形・branch名・大文字は拒否。headが動けばACCEPTとCIは無効になる（`STALE`）。

### I3 競合書込みの防止
claimはbranchの排他作成。remote書込みは **fast-forward/作成のみ・期待値付き（CAS）**。期待値と違えば `REMOTE_MOVED`（exit 4）で、上書きせず、何も送らない。toolsは、remoteのURL書換え（`insteadOf`・`pushInsteadOf`・`pushurl`）のどれか一つでも曖昧、またはGitHub以外・別repositoryへ届き得るときは、pushを拒否する（`REMOTE_IDENTITY`）。
*実現*: 送信は必ず `--force-with-lease=refs/heads/<ref>:<期待値>`（空=存在しないこと）＋`<40hex>:refs/heads/<ref>`。期待値はサーバ側（receive-pack）が ref lock 下で照合する。ただし lease だけでは non-fast-forward を拒否**しない**（Git仕様: 期待値が一致すれば許可される）ので、fast-forwardは全toolsが通る唯一のディスパッチャ `Invoke-Git` が送信直前に「期待値が送るcommitの祖先であること」を証明し、巻戻し・分岐・不明objectは `NOT_FAST_FORWARD`（exit 4）で何も送らない。lease無し・移動する名前（`HEAD`/branch名）をsourceにするpushは `GIT_FORBIDDEN`。*限界*: toolsを介さず手でgitを実行する経路（シェルを持つ主体）はこの保証の外にあり、allowlistは境界ではなく衛生。そこはmainのbranch protection等（USER設定、I12）が守る。

### I4 未知結果は安全停止
remote書込みは、送信前に意図をjournal（`.git/shared/journal.jsonl`）へ記録し、送信後に**必ず読み戻す**。応答が失われても読み戻しで `APPLIED`/`NOT_APPLIED` を確定する。読み戻せなければ `OUTCOME_UNKNOWN`（exit 3）で**停止**し、自動再送しない。`shared.ps1 recover` が読み戻しだけで確定する。journalは1つのcheckoutの `.git/shared` にしか無く、コンテナが破棄されると消える。**journalの消失は「何も送っていない」の証拠ではない**: `recover -Branch <name> -Sha <公開しようとしたcommit> [-Expect <期待値>]` がremoteだけを読んで `APPLIED`/`NOT_APPLIED`/`CONFLICT`/`UNKNOWN` を確定する（書込みはしない）。

### I8 下流Projectのpin保護
Projectは `docs/ai/SHARED_RULES.lock.yml`（`source_repository`/`source_version`/`source_commit`）でexact commitを固定する。Sharedは**Projectへ書かない**。pin変更は Project側で `shared.ps1 pin plan|apply` を使い、(a) 既存pinが真実か（commit実在・VERSION一致・Shared mainに統合済み）を `pin check` が検査し `pin plan` が問題として表示する、(b) 対象がShared mainにあり、`apply` は40桁のexact commitだけを受け付ける、(c) 進行中TASKは自分のpinを保つ、(d) majorや起動文書の参照切れは `MIGRATION_REQUIRED`、(e) 書くのはlockの2行だけ、を機械が確認する。旧pin（2.x）は永久に有効なまま。

### I9 履歴の凍結
Shared自身の 2.x の履歴（`docs/ai/` の evidence・tasks・design・handoffs・reports・audit・runbooks と旧集約ファイル）は**凍結**: 追加は可、変更・削除・改名は不可（`check -Base`）。どの `EVENTS.jsonl` も追記のみ（gitの比較で検出）。凍結は**Shared自身の履歴にだけ**適用し、Projectの報告・TASKは凍結しない（Projectは自分の registry の `extra.frozen_paths` で独自に凍結できる）。EVENTSの hash chain（`v:3`、`seq`、`prev`）は gate道具のもの（`tools/gate/README.md`）。

### I10 秘密情報
credentialは環境変数/GitHub Appにだけ置く。リポジトリ・ログ・出力に出さない（`check` が代表的なtoken形式を検出）。credentialと権限設定の変更はUSER専決で、toolsにその操作は無い。

## 終了コードと復旧

| exit | 意味 | Claudeの動き |
| --- | --- | --- |
| 0 | OK | 続行 |
| 1 | FAIL（検査失敗・安全に再試行可） | 原因を直して再実行 |
| 2 | BLOCKED（決定・権限・クリーンな作業ツリーが必要） | 決定を依頼し、他の作業を進める。回避しない |
| 3 | UNKNOWN（書込み結果が不明） | **停止**。`recover` で読み戻し、確定後に再開 |
| 4 | CONFLICT（remoteが動いた/claim済み/`recover` が競合を検出） | fetchして調停。上書きしない |

CI赤・conflictは、Claudeが修復して再pushする（履歴は書き換えず追加commit）。同じ原因で3回直せないときだけUSERへ一行で報告する。

## 動作要件

- PowerShell 7.4+、git 2.30+。Linux/Windows両対応。UTF-8・LF。Windows PowerShell 5.1 は拒否される（意図的）。
- 検査: `pwsh tests/run-all.ps1`（全体の周回と、gate道具を読み込まない核のみの周回）、`pwsh tools/shared.ps1 check -Base origin/main`。
- CIは既定で走らない（RULES.md）。依頼されたときだけ `ci.yml` を `workflow_dispatch` で実行する。
