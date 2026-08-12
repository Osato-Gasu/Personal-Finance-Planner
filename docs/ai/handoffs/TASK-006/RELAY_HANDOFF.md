# RELAY HANDOFF — TASK-006

- relay_schema: 2
- task_id: TASK-006
- decision: CHANGES_REQUESTED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-006-ideco-beta
- reviewed_candidate: a5d28e3f9e1518743f6daa940bba684f6fb00b76
- candidate_commit: a5d28e3f9e1518743f6daa940bba684f6fb00b76
- reviewed_handoff_head: 9c0a7cba017826d5d828d9ddd44f168150761827
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: local_script
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-006-ideco-beta
- resolved_commit: 9c0a7cba017826d5d828d9ddd44f168150761827
- next_action_blob: dfc1ed61c5af7746ad91ce922f929bdadf0dbb0b
- handoff_blob: c81c696fd5c6fa89e38d0811a91506823595f8f0
- adapter_blob: 3f9dd1a4e2e981fc58ddfd476c45e2f3d1748054
- review_stage: implementation
- changes_requested_cycles: 1
- implementation_review_attempt: 2
- implementation_review_profile: standard
- implementation_review_final: false
- implementation_review_terminated: false
- review_result: changes_requested
- review_findings_count: 3
- review_finding_ids: FINDING-006-R1-01,FINDING-006-R1-02,FINDING-006-R1-03
- implementation_candidate: a5d28e3f9e1518743f6daa940bba684f6fb00b76

## Purpose

TASK-006 implementation review attempt 1／standardのCHANGES_REQUESTEDを正規importし、3件の非緩和findingを修正してattempt 2／standardのexact candidateを作成する。

## Scope

- FINDING-006-R1-01を修正し、inactive iDeCo planをtake-home linked deductionの有効sourceとして扱わず、manual値または0円へfallbackしない。
- FINDING-006-R1-02を修正し、税年払込額のpast/future境界から2026-08固定を除去して明示的reference date/month contractを導入し、future snapshotをconfirmed扱いしない。
- FINDING-006-R1-03を修正し、linked IdecoPlanのout-of-range状態についてmanual/0 fallbackなしをfocused testで固定する。
- 修正後はchanges_requested_cycles=1、implementation_review_attempt=2、implementation_review_profile=standard、final=false、terminated=falseとして次candidateとreview handoffを作成する。
- 既存iDeCo法定上限matrix、AppState v5、migration/import、NISA behavior、TASK-011 audit identity/gates、portable file:// behaviorを維持する。

## Out of scope

- TASK-005 attempt 4、TASK-005再レビュー、retroactive approval、active化。
- TASK-011再active化、再レビュー。
- iDeCo法定上限matrixの要件変更、住民税自動計算、年単位拠出実装、iDeCo+自動計算、TASK-007統合サマリー完成。
- main merge、tag、GitHub Release、distribution、history rewrite、force push。

## Required changes

- FINDING-006-R1-01 [MAJOR] src/domain/take-home-linked-calculator.ts; src/domain/state.ts; src/modules/take-home/take-home-view.ts; tests/ideco-state.test.ts; tools/test-portable-build.mjs: inactive化されたIdecoPlanがtake-homeのlinked iDeCo控除元として引き続き利用できる。 Evidence: calculateTakeHomeFromStateはlinkedIdecoPlanIdとmemberIdだけでsourceを解決しactiveを確認しない。validateAppStateもlinked sourceのactiveを要求せず、take-home UIもsame-memberのinactive planをlink候補から除外しない。 Impact: 無効化済みplanの掛金が所得控除へ入り、所得税軽減額・年間手取りを変更できるためlinked source-of-truthとmoney calculationがstale sourceに依存する。 Required: inactive IdecoPlanをlinked deductionの有効sourceにせずtake-homeをincomplete/uncomputedへ遷移させ、manual/0 fallbackとlinked値copyを禁止する。新規link候補からinactive planを除外し、inactive→未計算、再active→再計算のunit/portable testを追加する。
- FINDING-006-R1-02 [MAJOR] src/domain/ideco.ts; src/modules/investments/ideco-view.ts; tests/ideco-rules.test.ts; tests/ideco-state.test.ts: 税年払込額の実払込済みと未来予定の境界が2026-08へ固定され、paidThroughMonthが計算基準時点より未来でもconfirmed snapshotとして受理できる。 Evidence: calculateIdecoAnnualPaidContributionのasOfMonth既定値とcalculateIdecoPlanからの呼出しが2026-08固定で、snapshot paidThroughMonthとreference時点の前後関係を検証していない。 Impact: 時間経過後に過去の未払・引落不能を予定どおり払込済みと誤認したり、未来払込をconfirmedとして所得控除へ算入し、税額計算を誤る可能性がある。 Required: pure-domainを維持してreference date/monthを明示注入し、2026-08固定を除去する。future paidThroughMonthを拒否し、過去paymentにsnapshot不足ならincomplete、snapshot後かつreferenceより未来の予定納付だけをfuture計算し、重複と過去自動補完を禁止する。2026-08/09/12、年末年始境界をtestする。
- FINDING-006-R1-03 [MAJOR] tests/ideco-state.test.ts: linked IdecoPlanのrequired no-fallback testがinvalid/incomplete/unsupported/missing-ruleの4状態だけでout-of-rangeを欠いている。 Evidence: TASK-006 Acceptance criteriaはinvalid、incomplete、unsupported、missing-rule、out-of-rangeの全状態を必須とするが、focused parameterized testにout-of-range caseが存在しない。 Impact: projection overflowやnon-finite等のout-of-range sourceが将来manual値または0円へfallbackする回帰をCIで検出できない。 Required: out-of-range linked IdecoPlanを明示的に発生させ、take-home status=out-of-range、income-tax結果null、manual/0 fallbackなし、linked値copyなし、不要なState/storage mutationなしを検証するtestを追加し既存4状態testも維持する。

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- inactive linked IdecoPlanはtake-home税計算を継続せずincomplete/uncomputedとなり、manual annualIdecoContributionYenまたは0円へfallbackしない。inactive planは新規link候補に出さず、再active化で参照再計算できる。
- iDeCo税年払込計算は明示的reference date/monthにより決定的で、2026-08固定を持たず、future snapshotをconfirmed扱いせず、過去の未確認払込を予定値で自動補完しない。
- linked sourceのinvalid/incomplete/unsupported/missing-rule/out-of-range全状態でno-fallback testがPASSする。
- 394 Vitest、69 take-home focused、68 NISA focused、79 iDeCo focused、208 portableの既存baselineを下回らず、新規test追加分を含む最終countをreportする。
- PowerShell 7/5.1 governance、product identity smoke、audit validator、21-check normalization、npm ci/typecheck/lint/format/test/test:rules/test:nisa/test:ideco/build/test:portableがすべてPASSする。
- candidate exact CI SUCCESS後だけattempt 2／standardのreview handoff-only commitを作成し、そのexact CIもSUCCESSとする。origin/main、tag、releaseは変更しない。

## Tests

- inactive linked source: active complete -> inactive incomplete/uncomputed -> re-active recalculation; no manual/0 fallback; inactive plan excluded from new UI link candidates; inactive partner data preserved。
- temporal tax snapshot: explicit reference 2026-08/2026-09/2026-12、future paidThroughMonth rejection、past payment without snapshot incomplete、snapshot後futureのみ加算、payment-month/tax-year年末年始境界。
- out-of-range linked source: take-home status out-of-range、incomeTaxAfterIdecoYen/incomeTaxBenefitFromIdecoYen null、manual/0 fallbackなし、linked値copyなし。
- npm run test、npm run test:rules、npm run test:nisa、npm run test:ideco、npm run build、npm run test:portable。
- PowerShell 7/5.1のvalidate-ai-governance、test-requirements-defined-smoke、validate-audit-identities、test-audit-identity-normalization。

## Forbidden changes

- FINDING-006-R1-01/FINDING-006-R1-02/FINDING-006-R1-03をdeferred、accepted risk、relaxableとして扱うこと。
- inactive iDeCo sourceによる税控除継続、2026-08 as-of固定維持、future paid snapshotのconfirmed扱い、out-of-range no-fallback test省略。
- TASK-005 attempt 4、TASK-005再レビュー・retroactive approval・active化、TASK-011再active化・再レビュー。
- docs/product/**、docs/ai/generated/shared/**、AUDIT_IDENTITIESまたはaudit validator/test、NISA statutory behaviorの変更。
- test削除・skip・assertion弱体化、main直接実装・merge、tag、release、distribution、reset、stash、clean、restore、rebase、history rewrite、force push。

Validated full bundle: docs/ai/reports/TASK-006/RELAY_BUNDLE.json
