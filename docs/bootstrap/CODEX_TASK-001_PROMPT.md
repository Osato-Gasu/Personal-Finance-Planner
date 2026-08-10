`Osato-Gasu/Personal-Finance-Planner`のTASK-001を実行してください。

## 固定情報

- repository: `Osato-Gasu/Personal-Finance-Planner`
- remote: `https://github.com/Osato-Gasu/Personal-Finance-Planner.git`
- local root: `C:\Users\owner\Development\personal\Personal-Finance-Planner`
- branch: `codex/task-001-shared-governance-adoption`
- product baseline: `171a1879416e6454a837c12fd465eb3eab111c35`
- product baseline tree: `f9f91d1d7cf40d78f401ee3791eb5544b0b30514`
- task specification: `docs/bootstrap/TASK-001.md`

shared正本:

- repository: `Osato-Gasu/shared`
- branch: `main`
- version: `0.12.20`
- commit: `10cd1466b10f814f1bd2aab2c5f6ba6465c5899e`
- expected local root: `C:\Users\owner\Development\_shared\ai-development-governance`

## 最初に行うこと

1. 指定project folderが空なら、そのfolder内へrepositoryをcloneする。
2. 既存内容がある場合は`git status -sb`、remote、HEAD、untrackedを確認する。
3. 想定外内容またはユーザー所有差分があれば変更せず`BLOCKED`で終了する。
4. remote branch `codex/task-001-shared-governance-adoption`をcheckoutする。
5. product baseline commit・treeがancestorとして一致することを確認する。
6. `docs/bootstrap/TASK-001.md`を全文読み、その要件を正本として実装する。

clone例はfolderが空の場合だけ使用してください。

```powershell
Set-Location 'C:\Users\owner\Development\personal\Personal-Finance-Planner'
git clone 'https://github.com/Osato-Gasu/Personal-Finance-Planner.git' .
git fetch origin --prune
git switch --track 'origin/codex/task-001-shared-governance-adoption'
```

shared folderが存在しない場合は親folderを作りcloneしてください。存在する場合は別用途の差分を消さず、remoteとclean stateを確認してください。floating mainではなく固定commitへcheckoutしてください。

## 実装目的

共通AI開発基盤v0.12.20をこのprojectへ安全に導入し、generated snapshot、lock、project adapter、overlay、NEXT_ACTION、Progress、permanent handoff、validator、governance CIを整備してください。

製品実装は行いません。`README.md`、`.gitattributes`、`.gitignore`、`docs/product/**`はbaselineからbyte-exact不変にしてください。

## 禁止

- reset / stash / clean / restore
- force push
- main merge
- tag / release
- shared repositoryの変更
- package.json、src、tests、制度rule、製品機能の追加
- generated snapshotの直接編集
- 想定外差分の上書き

## 検証

shared validator、sync `-Check`、project validator、CI相当コマンドを実行してください。失敗時は原因を隠さず、破壊的回避をせず`BLOCKED`で戻してください。

## 終了条件

意図した変更だけをcommitし、指定branchへpushしてください。mainは変更しません。

最終回答は次だけを簡潔に報告してください。

- 結果: COMPLETED / BLOCKED
- branch
- baseline commit / tree
- final commit / tree
- shared version / commit / manifest SHA-256
- 変更ファイル
- 実行した検証と結果
- BLOCKEDまたは残課題
