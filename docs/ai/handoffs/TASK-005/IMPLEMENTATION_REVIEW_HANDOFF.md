# IMPLEMENTATION REVIEW HANDOFF — TASK-005

## Identity

- task_id: TASK-005
- feature: NISAベータ
- phase: implementation_review
- status: review_requested
- actor: ChatGPT
- role: ORCHESTRATOR_AND_REVIEWER
- model: 5.6 Sol
- effort: high
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-005-nisa-beta
- baseline_commit: 74599efd2afedfa8c1fba196aaab51459571913e
- baseline_tree: 25a0d8acd4910e562a816814affa61de92d4fdbf
- previous_reviewed_candidate: bcae11d634ffbac6d76abd26638814eb8f4ddb27
- previous_reviewed_tree: 70beaac8d897cc024bfde457c922775b96b12e1b
- implementation_candidate: d127f26a78342ab3d7674ee99e6f50d87532e891
- candidate_commit: d127f26a78342ab3d7674ee99e6f50d87532e891
- candidate_tree: fa83cf0bc4f7de19adc1dff92b8fd538dba3d443
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- shared_manifest_sha256: 94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FE
- product_identity: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
- product_sha256: E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29
- spec_revision: 1
- review_stage: implementation
- changes_requested_cycles: 2
- implementation_review_attempt: 3
- implementation_review_profile: relaxed
- implementation_review_terminated: false
- review_attempt: 3
- review_profile: relaxed
- final_review: true

## Assignment / result

- purpose: 成人NISAの制度上限をruleで検証し、人物別拠出計画・残枠・将来資産を安全に試算するNISAベータを提供する
- scope: AppState v4、v3 migration、成人NISA rule、暦年枠、総枠、scenario、standalone investments UI
- out_of_scope: iDeCo、旧NISA、売却枠再利用、未成年向け2027年rule、商品適格性・推奨、統合サマリー、main反映、release
- acceptance_criteria: docs/ai/tasks/TASK-005.mdのAcceptance criteria全件
- forbidden_changes: docs/product/**、generated shared snapshot、main、tag、release、推奨利回り、商品適格性推測
- tests_and_build: PowerShell 5.1/7 governance and product identity smoke PASS; npm ci/typecheck/lint/format/test/test:rules/test:nisa/build/test:portable PASS; 315 Vitest tests, 69 focused take-home rule tests, 68 focused NISA tests, 168 portable browser checks PASS
- browser_evidence: system Edge file:// PASS; 1月2日成人境界、空欄null、明示0円、年別上限・残枠、総枠到達状態、rule-owned labels、1円超過invalid、scenario、reload、臨時拠出CRUD、360px、keyboard、focus、console/page errors 0、runtime requests 0
- commit_policy: implementation candidateを変更せずexact reviewする
- stop_conditions: 制度上限・計算・data preservation・migration/import・validator・required test・security・backward compatibility・portability・candidate identityの失敗
- return_to: Codex
- report: docs/ai/reports/TASK-005/IMPLEMENTATION_REPORT.md
- execution_started_at: 2026-08-12 21:52:11 JST
- workflow_run_id: 31600217793
- workflow_head_sha: d127f26a78342ab3d7674ee99e6f50d87532e891
- workflow_conclusion: success
- execution_finished_at: 2026-08-12 22:15:48 JST

## Primary sources and rule metadata

- 金融庁「NISAを知る」: 成人NISAの年間枠、非課税保有限度額、簿価残高方式を確認
- 国税庁「No.1535 NISA制度」: 対象年1月1日時点18歳以上、年間枠、総枠、旧NISA外枠を照合
- 金融庁「令和8（2026）年度税制改正について」: 2027年からの0～17歳向け拡充を成人ruleの対象外とする根拠を確認
- 金融庁「アクセスFSA第273号」: 指定資料を確認し、成人NISA制度値の根拠には使用しない
- 日本証券業協会「NISAのよくある質問 Q3・Q48」: 年齢計算に関する法律により1月2日生まれを当年の対象へ含める境界を確認
- source_urls: https://www.fsa.go.jp/policy/nisa2/know/index.html ; https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1535.htm ; https://www.fsa.go.jp/news/r7/sonota/20251226-2/01.pdf ; https://www.fsa.go.jp/access/r7/273.html ; https://www.jsda.or.jp/nisa/faq/
- rule_id: jp-nisa-adult-2024-01-01
- effective_period: 2024-01-01 onward
- verified_at: 2026-08-12

## Review policy

- attempt 1 and attempt 2 use the mandatory standard profile.
- only attempt 3 after two failures uses the relaxed final profile; attempt 4 is forbidden.
- money calculation, rule period, data preservation, rollback, validator, required tests, release gates, security, and backward compatibility are never relaxable.

## Evidence focus

- 年間つみたて120万円、成長240万円、合計360万円、総枠1800万円、成長内数1200万円の-1／一致／+1境界をrule由来で検証する。
- 暦年resetと総枠累積、簿価と時価の分離、旧NISA外枠、売却枠非推測、未成年unsupportedを検証する。
- 月初／月末拠出、0%／負利回り、費用率、インフレ率、元本・運用益・実質価値を検証する。
- v3→v4 migration、v1/v2/v3 import、preview/rollback、prototype pollution、overflow、参照整合性、副作用なしを検証する。
- FINDING-005-R1-01 resolved: 2026年は2008-01-01／01-02をadult、01-03をunsupportedとし、実在日・閏日境界を検証した。
- FINDING-005-R1-02 resolved: rule由来の年別上限・使用・残枠と、総枠／成長内数の開始時到達・到達年月・未到達・未計算をderived表示する。
- FINDING-005-R1-03 resolved: 6金額項目と臨時拠出額をnullable正本とし、空欄nullと明示0円をsave／reload／import／portableで区別する。
- FINDING-005-R1-04 resolved: 全必須metadata、18歳、HTTPS、実在ISO日、期間順序・重複・ID、resolver target dateをstrict検証する。
- FINDING-005-R2-01 resolved: inflation factor／実質価値とmonthly derived factorの有限性を検証し、Infinity・0 underflowをout-of-rangeとしてStore／importのpre-writeで副作用なく拒否する。
- FINDING-005-R2-02 resolved: top-level sourceUrlとsources[].urlをURL parseし、absolute HTTPS・非空hostnameをstrict検証する。
- FINDING-005-R2-03 resolved: 最低年齢メッセージをrule.minimumAgeOnJanuaryFirst由来にし、総枠到達ラベルから法定数値の重複直書きを除去する。
- candidate exact workflow 31600217793はhead SHA d127f26a78342ab3d7674ee99e6f50d87532e891でSUCCESSした。
- attempt 3 is relaxed/final, but FINDING-005-R2-01 through FINDING-005-R2-03 remain non-relaxable; attempt 4 is forbidden.
