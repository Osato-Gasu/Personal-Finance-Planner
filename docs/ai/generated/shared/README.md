# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

# AI Development Governance

AI協業開発で使うGO、役割、TASK、ファイルhandoff、review、browser evidence、Progressの共通契約です。

## 正本と作業tree

- GitHub正本: private repository `Osato-Gasu/shared`
- remote URL: `https://github.com/Osato-Gasu/shared.git`
- default branch: `main`
- remote名: `origin`
- local clone/worktree: `C:\Users\satoshi-sugaya.dh\Development\_shared\ai-development-governance`

local repositoryだけを完了状態にしません。既存commit履歴を維持し、force pushは行いません。初回push前は`git fetch origin --prune`と`git ls-remote origin`でremoteが空であることを確認します。想定外のremote commitが見つかった場合は統合せず`BLOCKED`とします。承認済みshared governanceだけを`main`へ反映します。

raw-byte manifest identityをWindowsでも再現するため、repository rootの`.gitattributes`をversioned checkout policyとし、textをLFへ固定します。machine-localの`core.autocrlf`変更やvalidator内での改行正規化は代用しません。このpolicy fileはshared repository自身だけに適用し、manifest payloadおよびproject snapshotへは配布しません。

`manifest.yml`は全entryを`payload_type: text`として宣言します。`.gitattributes`、`manifest.yml`、`VERSION`、全manifest payloadのraw bytesはUTF-8 without BOM、CR 0、末尾LF exactly 1、TAB／LF以外のUnicode control characterなしを必須とします。shared validatorとsource-present syncはstaged／unstaged／untrackedを含むclean worktreeを要求し、各working raw blobを同じHEAD commitのblobへexact照合します。version、commit、manifest SHA、payloadはこの単一commitから導出し、provenance検証が終わるまでprojectへ書き込みません。source-less `-Check`は固定済みsnapshot／lockだけでnetworkなしに引き続き実行できます。

## 導入

1. `tools/validate-shared.ps1`でshared repositoryを検証します。
2. project rootを指定して`tools/sync-project.ps1 -ProjectRoot <path>`を実行します。
3. projectでは`AGENTS.md`から`docs/ai/generated/shared/START.md`を読みます。
4. project CIはshared repositoryへのnetwork accessを必要としません。sourceなしでもsnapshotとlockを使い、`tools/sync-project.ps1 -ProjectRoot <path> -Check`で整合を検証できます。

PowerShellとGitだけを使用します。runtime dependency、symlink、junction、submoduleは作成しません。project固有のBACKLOG列、status、risk、phase、role、product identity、追加validatorは`docs/ai/PROJECT_ADAPTER.psd1`で解決します。

write不能時は完全情報を保持するportable JSON relay bundleをrepository外artifactとして渡し、chatはbundle name、SHA-256、bytes、formatだけを追加します。local shellを持つCodex／Claude Codeは`tools/route-go.ps1 -RoutingMode local_script`を実行します。connector-only ChatGPT／Claudeはremote branch/tagをexact commitへ一度だけresolveし、同じcommitからPROJECT_ADAPTER、NEXT_ACTION、handoffを読みます。route resultとportable bundleはrepository、requested ref、resolved commit、3 blobを保持し、handoffのtask／phase／actor／role／model／effort／candidate／shared candidateをexact照合します。connectorはlocal shell／clean／writer／writeを主張せずread-only reviewとportable bundle作成だけを行います。actor mismatch時は、`USER_RELAY_REQUIRED`のbundle identityとrecipient actor／roleが現在sessionへexact一致した場合だけ、local_script modeで`tools/relay-bundle.ps1`へ渡します。同toolはrepository、branch、clean worktree、spec、canonical exact candidate、candidate commit／ancestor、handoff HEAD、shared candidate、phase、assignment、connector route identity、全findingまたは完全requirementsをpreflightしてからproject正本へtransactional importします。途中FAILはproject overlayのnew failureを含めbyte-exact rollbackし、正規化済みbundle全文をreport配下へ保存します。artifactも作れない場合だけ完全bundleをchat fallbackします。

relay bundle schema 2は`relay_recipient`と`result_return_to`を分離し、`APPROVED`、`CHANGES_REQUESTED`、`BLOCKED`、`NEEDS_USER_DECISION`、`REQUIREMENTS_DEFINED`、`INDEPENDENT_REVIEW_REQUESTED`、`INDEPENDENT_REVIEW_COMPLETED`のstate tableを持ちます。4つのChatGPT判定は`review_stage`を必須とし、design／implementation別にcandidateと遷移先を解決します。`REQUIREMENTS_DEFINED`はtitle、repository/branch、現在HEADと一致するbase commit/tree、priority、allowlist済みproduct identity reference、browser evidence、Claude review契約、build、rollback、handoff mode、project固有TASK metadataを明示し、unsafe defaultで補いません。frontmatterへ入るscalarはsingle-lineかつadapterの値域内に限定します。

`INDEPENDENT_REVIEW_REQUESTED`はdesign／implementation checkpointを`INDEPENDENT_REVIEWER`へrouteします。Claudeを優先し、`preferred_fallback`だけが別ChatGPTへの`Claude_to_ChatGPT`代替を許可し、`strict`は代替を拒否します。request時はkind、candidate、spec revision、preferred／actual executor、review role／status、reviewer model／effort、session context、開始時刻をcanonical LF区切り文字列にし、そのUTF-8 SHA-256を大文字64桁の`request_id`として固定します。`INDEPENDENT_REVIEW_COMPLETED`はrequest handoff、TASK、NEXT_ACTION、canonical request bundleからIDを再計算し、resultとexact比較してChatGPTへ戻します。request/result object presenceはdecision/current review stateごとに一意とし、unexpected objectをwrite前に拒否します。その後の正式判定前にもcurrent canonical result bundleのidentity、audit、finding全文をcanonical JSONで比較します。ChatGPTは各findingをaccepted／rejected／deferred／needs_user_decisionへ採否し、acceptedだけを次担当へ渡しつつ全件を監査欄に残します。独立review resultはChatGPTの正式判定を代替しません。

project adapterはshared lifecycleの必須phaseをすべて定義し、project固有phaseを追加できます。単一product identityが必要なprojectではadapterへ値を複製せず、projectが指定する1つのidentity sourceから読取ります。

completed TASK fileの既定policyは`git_only`です。`TaskHistory`未定義時も同じ既定として扱い、inactiveな`docs/ai/tasks/TASK-*.md`を現行treeへ残さず、完了履歴はGitだけに保持します。検証済みのcompleted TASK fileを現行treeにも保持するprojectは、project adapterで明示的にopt-inします。

```powershell
TaskHistory = @{
    CompletedTaskFilePolicy = 'retain_validated'
    RetainedTaskStates = @(
        @{ Status='completed'; Phase='complete' }
    )
}
```

`retain_validated`はinactive TASK fileのfrontmatterにある`task_id`、`status`、`current_phase`を読み、filenameとtask ID、および`RetainedTaskStates`のexact status／phase pairが一致するfileだけを許可します。active TASKとして数え直すことはありません。inactiveな`docs/ai/handoffs/TASK-*/`と`docs/ai/reports/TASK-*/`は対象外で、従来どおりFAILです。portable relay importのpreflight、生成後の共通validation／overlay validation、失敗時のbyte-exact rollbackは`git_only`と`retain_validated`の両policyで維持されます。

## 共通ルール更新手順

1. `Osato-Gasu/shared`で変更branchを作成する。
2. shared validatorとsimulationを実行し、`core.autocrlf=true`をcheckout前に設定したrepository外fresh cloneでvalidator、simulation、全manifest raw-byte identity、project sourceありsnapshot checkを確認する。このportability gateはshared／projectの`main`を動かす前に完了する。
3. review後に承認済み変更をshared `main`へ反映する。
4. sharedのversionとcommitを固定する。
5. 各projectで同期専用branchを作成する。
6. generated snapshotと`SHARED_RULES.lock.yml`だけを同期更新する。
7. project固有overlayとの整合を確認する。
8. projectごとにreviewとreleaseを行う。

進行中TASKがあるprojectへ自動同期しません。重大な安全修正を除き、active TASKの完了後に同期します。projectはsharedのversion、commit、source repositoryをlockへ固定し、project固有overlayと組み合わせて利用します。
