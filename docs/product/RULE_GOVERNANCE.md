# 制度ルール運用 v0.2

## 1. 目的

税、社会保険、NISA、iDeCoの値を継続的に更新できる形で管理し、古い制度や誤った対象条件を黙って適用しない。

## 2. 情報源

制度値は原則として日本の公式一次資料を使用する。

- 国税庁
- 総務省または自治体の公式資料
- 厚生労働省
- 日本年金機構
- 協会けんぽ
- 金融庁
- iDeCo公式または制度運営主体の公式資料

民間記事は探索補助に限り、ruleの根拠へ単独使用しない。

## 3. metadata必須項目

各ruleに次を持たせる。

- rule ID
- domain
- jurisdiction
- effectiveFrom
- effectiveTo
- status
- publishedAt
- verifiedAt
- verifiedBy
- sourceTitle
- sourceUrl
- sourcePublisher
- sourceRetrievedAt
- notes

source URLが複数必要な場合は配列で保持する。確認日だけを更新して制度値変更と混同しない。

## 4. 有効期間

期間は開始日inclusive、終了日inclusiveとする。終了日なしはopen ended。

同一domain・同一適用contextで次を禁止する。

- 期間重複
- 意図しない期間空白
- effectiveFrom > effectiveTo
- scheduled ruleの施行日前適用

汎用`RuleResolver`が対象日とcontextから一意に選ぶ。特定年だけのif文を画面や計算関数へ追加しない。

## 5. 将来期間

登録ruleがない将来年月は計算を停止し、`missing-rule`を表示する。

利用者が「最新登録ruleが継続すると仮定」を明示的に有効化した場合だけ計算可能とし、結果へ次を残す。

- 仮定使用
- 代用したrule ID
- 本来の対象年月
- 最終確認日

設定は計画ごとに保持し、全体へ黙って適用しない。

## 6. 健康保険

入力時に保険種別を必須選択する。

- 協会けんぽ
- 保険料手入力
- 自動計算非対応

組合健保、共済等へ協会けんぽ料率を代用しない。非対応を選んだ場合は対象項目を未計算として表示するか、手入力へ誘導する。

協会けんぽruleは都道府県と適用年月をcontextに含める。

## 7. 更新責任

- repository owner: 制度データ更新の実施可否とreleaseの最終承認
- ChatGPT: 要件、公式source照合、採否、実装レビュー
- Codex: rule module、validator、test、更新差分の実装
- Claude: 指定時の独立批判的レビュー

誰か1名の記憶だけで制度値を変更しない。

## 8. 年次・臨時更新手順

1. 公式発表の有無を確認する。
2. 対象domain、適用開始日、対象者、経過措置を記録する。
3. 既存ruleを変更するか、新ruleを追加するか決定する。
4. sourceとmetadataを更新する。
5. 期間重複・空白validatorを実行する。
6. 施行日前日、施行日、施行翌日の境界テストを追加する。
7. 代表入力のgolden testを追加する。
8. 独立レビューが必要な変更か判定する。
9. release後、READMEまたはアプリ内の制度確認日を更新する。

最低でも年1回、各年度・税年の開始前、および公式改正公表時に確認する。

## 9. rule構成

```text
src/rules/jp/
├─ income-tax/
├─ withholding/
├─ resident-tax/
├─ social-insurance/
│  ├─ health-insurance/
│  ├─ pension/
│  └─ employment-insurance/
├─ nisa/
└─ ideco/
```

ファイル名は制度名だけでなく適用開始日を含める。

```text
rule-2026-04-01.ts
rule-2026-12-01.ts
```

## 10. 検証

CIで次を実行する。

- metadata schema
- source URL形式
- ID一意性
- 期間順序
- 重複
- 必須context網羅
- rule境界日
- 代表計算
- 未登録期間の明示的失敗

公式sourceが後日差し替えられる可能性があるため、source title、取得日、必要に応じて引用せず要約した根拠メモを残す。
