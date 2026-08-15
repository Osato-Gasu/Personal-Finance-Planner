# Release checklist — v0.1.0

このchecklistはimplementation review APPROVED後の実配布担当者向けである。candidate／review中はtag、Release、Pages設定、deployment、distribution dispatchを行わない。

RepositoryとGitHub Releaseはpublicであり、全tracked source／commit history、branch metadata、公開対象Actions run／log、Release metadata／assetは閲覧可能となる。第三者forkは作成・存続し得る。公開承認は`USER-APPROVAL-TASK-009-PUBLIC-20260816-022215`、revision 1 immutable audit identityはcandidate `49a70b1500420320c566501505d6e70be044ef7c`／handoff `95562d46da80eddb04985a934fe0dd6c5ad4384f`である。

## 固定identity

- version: `0.1.0`（`package.json`正本、package-lock/UI/manifestとexact一致）
- tag: `v0.1.0`
- Release title: `Personal Finance Planner v0.1.0`
- classification: prerelease
- target commit: dispatch時のapproved `origin/main` full 40-hex SHA
- primary SHA-256／bytes: target commitのroot `Personal-Finance-Planner.html`からbuilderが算出し、manifest・release notes・監査artifactへ記録
- 制度確認日: 手取り`2026-08-12`、NISA`2026-08-12`、iDeCo`2026-08-13`

## 承認・main・CI preflight

- [ ] implementation reviewがAPPROVEDで、reviewed candidateとrelease headをexact確認した
- [ ] target commit自身の`RELAY_BUNDLE.json`、TASK-009 release state、`RELEASE_HANDOFF.md`からdecision=APPROVED／reviewed candidate／handoff／release phaseを検証した（callerのSHA自己一致だけでは通過しない）
- [ ] approved release headがcurrent `origin/main`へ統合済みである
- [ ] supplied main CI runはtarget SHA／branch `main`／event `push`／name `Governance CI`／conclusion `success`がexact一致する
- [ ] repository visibilityはpublicであり、GitHub Releaseもpublicとして扱う
- [ ] candidate作成前に、全reachable commit／tree／blob、全branch／tag、LFS pointer、submodule、公開可能なActions log／artifactのsecurity/privacy auditを実行し、high-confidence credential、private key、live token、PII、private financial export、unintended user-owned fileが0である
- [ ] release side effect直前に同じ全履歴auditを再実行し、1件でも検出した場合はtag／Release／Pages／distribution writeを0のまま停止する
- [ ] version、tag、title、target SHA、launcher freshness、全required test/buildを確認した
- [ ] staging pathは`.nojekyll`、`Personal-Finance-Planner.html`、`SHA256SUMS.txt`、`index.html`、`release-manifest.json`だけである
- [ ] root／Release／Pages 2 HTMLのraw bytes、SHA-256、bytesが一致する
- [ ] manifestとchecksumはUTF-8 no BOM／LF／末尾LF 1個である
- [ ] `SHA256SUMS.txt`は不可能な自己参照だけを除外し、allowlist内の他4fileを各1回記録する

## Pages setup

1. `GITHUB_TOKEN`をprocess環境だけへ渡し、repository／fileへ保存しない。
2. `node tools/configure-pages.mjs --repository Osato-Gasu/Personal-Finance-Planner --target-sha <TARGET_FULL_SHA> --main-ci-run-id <EXACT_RUN_ID> --approved-release-head <TARGET_FULL_SHA>`を実行する。Pages setupはtarget SHAのgit treeに保存されたcanonical APPROVED proofも読み、既定dry-runの`create_actions_pages_site`または`already_exact`だけを確認する。
3. 未構成の場合だけ同じexact引数へ`--apply`を追加する。sourceはGitHub Actions、custom domainなし、repository public維持とする。
4. 403、admin権限不足、main/CI/approval/audit mismatchでは設定を変更せず停止する。visibility変更や別hostで迂回しない。

## Manual distribution dispatch

GitHub Actionsの`Distribution`を手動実行し、次を入力する。

- `version`: `0.1.0`
- `target_sha`: approved current `origin/main` full SHA
- `main_ci_run_id`: 上記exact SUCCESS run ID
- `publish_confirmation`: `PUBLISH_v0.1.0`

workflow triggerは`workflow_dispatch`だけである。順序はtag → draft prerelease → assets → Pages deploy → live raw-byte verification → live browser verification → Release publishで、開始・tag・draftだけをSUCCESS扱いしない。

最初のasset write前に、current asset全体がexpected allowlist内で一意かつexpected assetsのexact subsetであり、既存assetのSHA-256／bytesがexactであることを検証する。upload後もRelease publishのPATCH前にtag、Release metadata、全expected asset集合を再取得し、full setがexactであることを確認する。extra／missing／duplicate／wrong digest／wrong bytesが1件でもあればupload／PATCHは0とする。

## Live evidence

- [ ] Pagesの`index.html`、download HTML、manifest、checksums、`.nojekyll`（0 bytes）がstaging bytesとexact一致する。live auditには5 pathすべてのbytes／SHA-256が残る
- [ ] overview／budget／take-home／investments／settings、hash navigation、reloadがPASSする
- [ ] 360px、keyboard-only主要操作、visible focus、label、既存error stateがPASSする
- [ ] versionと3制度確認日が表示される
- [ ] same-origin localStorage persistence、JSON backup export、import preview、cancel不変、successful importがPASSする
- [ ] runtime external requests 0、console errors 0、page errors 0である
- [ ] `file://`版も空白・日本語pathでportable smokeがPASSする

## Partial failure／再開

各side-effect jobの監査artifactでtag target、draft/prerelease/title、asset SHA-256/bytes、Pages target/manifest、停止工程を確認する。既存objectがexpected exactで、不足工程だけが明確な場合に限りrerunする。1項目でも異なる場合は`conflicting`として停止し、GPTへactual identityを返す。

自動rollbackは行わない。tagを削除・移動・再作成せず、Release／assetを削除・上書きせず、Pagesをunpublish／rollbackせず、deploymentを削除しない。公開後の訂正は新しい承認済み手順として扱う。

high-confidence credential、private key、live token、PII、private financial export、unintended user-owned fileを検出した場合は、値をlog／reportへ複製せずincident responseへ移管し、配布を停止する。completion前にも全履歴auditを再実行する。

## 利用者向け注意

本アプリはconcept／概算確認用で、financial adviceではない。standalone、offline、no backend、runtime external request 0である。更新前にJSON backupを推奨する。同じpathのHTML置換を基本とし、file／folder移動で保存領域が変わる可能性を明示する。`file://`版とPages版は別origin／別localStorageであり、checksum確認とJSON移行が必要である。known limitationsはrelease notesとREADMEに一致させる。
