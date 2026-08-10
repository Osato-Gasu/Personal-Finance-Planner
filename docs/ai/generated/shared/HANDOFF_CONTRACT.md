# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

# Handoff contract

handoffは`docs/ai/handoffs/<TASK-ID>/`に保存し、会話履歴なしで次担当が開始できる内容にします。最低限、TASK-ID、機能、phase、actor、role、model、effort、repository、branch、baseline、candidate、目的、scope、対象外、AC、変更禁止、test/build、browser evidence、commit方針、停止条件、返却先を記録します。

active TASK 0件ではproject-level requirements handoffを恒久的に保持します。`NEXT_ACTION.yml`が唯一の次工程routerです。

## Write-unavailable relay

ChatGPTがrepositoryへ書けない場合は正本を更新済みと扱いません。`templates/RELAY_BUNDLE.json`と同じschemaのportable bundleをrepository外の1ファイルへ保存し、通常chatには`templates/USER_RELAY_REQUIRED.yml`のbundle name、SHA-256、bytes、formatだけを追加します。bundleはrecipient actorとroleを明示します。handoff全文やfinding全文は通常chatへ出しません。

schema 2 bundleはreviewed identity、shared candidate、repository、branch、connectorのrequested ref／resolved commit／PROJECT_ADAPTER・NEXT_ACTION・handoff blob、decision、route、全finding、AC、tests、forbidden changes、`relay_recipient`、`relay_recipient_role`、`result_return_to`、作成時刻を保持します。`REQUIREMENTS_DEFINED`は現在HEADと一致するbaseline、priority、allowlist済みproduct identity reference、browser evidence、review契約、build、rollback、project固有TASK metadataを含む完全なTASK設計、`CHANGES_REQUESTED`は全findingと修正完了条件を保持します。`INDEPENDENT_REVIEW_REQUESTED`はreview kind、candidate、spec revision、正規化request ID、review role、execution mode、repository access、review status、reviewer model／effort、preferred／actual executor、provider substitution、executor policy、開始時刻を保持します。`INDEPENDENT_REVIEW_COMPLETED`はrequest IDとrequest-time identity全体を再掲し、result、完了時刻、finding件数／IDを保持してChatGPTへ戻します。TASK、NEXT_ACTION、request handoff、canonical request bundle、result bundleからrequest IDを再計算してexact一致させます。decision別object matrixに従い、非該当request／result objectはnullにします。post-review正式判定は元finding全文と各IDの`finding_dispositions`を保持し、accepted findingだけを次担当のRequired changesへ出します。design／implementationのrequest、result、4判定はいずれもproject adapterのstage別candidate mappingで解決し、対象fieldはexact 1件だけを許可します。artifact作成も不能な場合だけ、完全なbundleを長文chat fallbackで返します。未保存情報を1行summaryへ圧縮しません。

GO routerはbundle/pointer identityとrecipient actor/roleを検証し、Codexはrepository、branch、clean worktree、spec、canonical exact candidate、candidate commit／handoff HEAD ancestor、handoff HEAD、shared candidate、phase、assignment、connector routeのcommit／blob identityをpreflightしてからreview report、TASK、CURRENT_STATE、NEXT_ACTION、Progress、次handoff、validated bundle全文をtransactionalに正本化します。result import前はcanonical request、post-review decision前はcanonical resultのidentity、audit、finding全文をproperty順序非依存・array順序維持でread-only検証します。project overlayの既知failure集合を前後比較し、new failureを含む任意FAILはbyte-exact rollbackします。handoffはcanonical bundleの実repository-relative pathを記録します。
