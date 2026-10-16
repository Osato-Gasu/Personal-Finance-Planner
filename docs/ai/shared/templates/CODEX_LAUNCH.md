# 実働の起動（頭脳が出す。ユーザーは貼るだけ）

RULES §8の19の2。GitHubに置けるProjectで、TASKファイルを実働が読めるbranchへpush済みのときに使う。依頼の中身と定型（独立レビュー・CI・最終メッセージ）はTASKの「実働への指示（定型）」にあり、ここへ書き写さない。ユーザー操作欄は「この一言をCodexへ貼る」。

```
<Project> の <TASK-NNN> を実行してください。branch <work/TASK-NNN>（先頭 <40桁SHA>。checkout後にSHA一致を確認）。TASKの「実働への指示（定型）」と AGENTS.md に従い、完了・失敗・返却時に docs/ai/reports/TASK-NNN/REPORT.md をこのbranchへpushしてください。最終メッセージは、Project／TASK／branch／対象SHA／結論／報告ファイルのパスを書いた短い1ブロックにし、実行表と渡し先はブロックの外に書いてください。
```

- pushできない・GitHubに置けないProjectは、`templates/LOCAL_CODEX_REQUEST.md` の貼付形式を使う。
- ローカルCodexが必要な操作（ユーザーの端末でしかできないこと）は、手順が長ければファイルにしてpushし、起動の一言で指す。
