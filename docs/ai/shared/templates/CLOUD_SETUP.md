# Codex Cloud の環境（ひな形）

Codex Cloud（クラウドの実行）でProjectを進めるための、確認済みの事実と設定の型。Projectの`PROJECT.md`に、実測した値（Node／SDKの版、許可ホスト）を書く。規則ではない（権限は RULES.md）。

## 確認済みの事実
- GitHubからのfetchと、`work/*`ブランチへのpushはできる。mainへの直pushはしない（RULES §2）。
- `pwsh`は標準ではPATHに無い。Shared道具（`docs/ai/shared/tools/shared.ps1`）にはPowerShell 7が要る。
- ネットワークは許可ホスト制。依存の取得先（npm／NuGetなど）はallowlistに入れる。
- リポジトリの外には書けない。
- 既定のローカルブランチ名が`work`のことがあり、`work/TASK-NNN`と衝突する（Gitは`work`と`work/…`を両立できない）。

## セットアップスクリプトの型
```
# PowerShell 7
curl -sSL -o /tmp/pwsh.tgz https://github.com/PowerShell/PowerShell/releases/download/v7.4.6/powershell-7.4.6-linux-x64.tar.gz
mkdir -p ~/pwsh && tar -xzf /tmp/pwsh.tgz -C ~/pwsh && chmod +x ~/pwsh/pwsh && ln -sf ~/pwsh/pwsh /usr/local/bin/pwsh
# ローカルの work ブランチを退避（work/TASK-NNN との衝突回避）
git branch -m work cloud-work-saved 2>/dev/null || true
# Project固有: 依存の導入（例: npm ci / pnpm install --frozen-lockfile / dotnet restore）
```
版は固定し、実際に動いた版を`PROJECT.md`へ記録する。

## 最初のTASK（Cloud動作確認）で確かめること
1. `pwsh docs/ai/shared/tools/shared.ps1 check -Root .`（`-Base`を付けると浅いcloneは`HISTORY_INCOMPLETE`（FAIL）で止まる。先に`git fetch --unshallow`する。`-Base`なしなら出ない）。
2. `PROJECT.md`の`verify_capabilities.cloud`のコマンドを実行し、結果表（コマンド｜結果｜所要｜備考）を作る。mainで既に失敗するものは分けて書く。実行できないものは「未検証」。
3. 許可ホストの一覧と、Cloudでは行えないこと（ローカルGUI、実機、Windows）を`PROJECT.md`へ。

## 返却の形
完了・失敗・返却時の最終メッセージは、窓口へそのまま貼れる1つのコードブロック。実行表・渡し先など人が見る情報はブロックの外に置く（ROLES.md「表示」）。
