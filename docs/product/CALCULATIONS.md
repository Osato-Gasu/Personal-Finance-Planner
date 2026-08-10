# 計算仕様 v0.2

## 1. 共通

- 入力金額は円単位整数
- 計算途中の小数はDomain内部だけで保持
- 制度ごとの法定端数処理をrule側で明示
- UI表示だけの丸めで永続値を変更しない
- 同じ入力・同じrule IDでは決定的な結果を返す

## 2. 費用平準化

```text
A = 1回あたりの出費
C = 周期値
N = 周期内回数
Y = 年間換算額
```

平均年を365.2425日とする。

```text
日:   年間周期数 = 365.2425 / C
週:   年間周期数 = 365.2425 / 7 / C
月:   年間周期数 = 12 / C
年:   年間周期数 = 1 / C

Y = A × N × 年間周期数
日換算 = Y / 365.2425
週換算 = Y / (365.2425 / 7)
月換算 = Y / 12
年換算 = Y
```

表示は四捨五入した円。合計は各費目の未丸め換算値を加算してから表示時に丸める。

基準例:

- 4,500円、2か月に1回 -> 月2,250円
- 120,000円、3年に1回 -> 月約3,333円
- 500円、1週間に3回 -> 月約6,522円

## 3. 負担割合

実効割合:

```text
費目custom
else カテゴリcustom
else 世帯global
```

```text
本人暫定額 = round(total × selfBasisPoints / 10000)
相手額 = total - 本人暫定額
```

これにより2名の合計を必ずtotalへ一致させる。個人費は対象人物100%、他方0%。資産形成拠出は名義人100%。

## 4. 手取り

概念式:

```text
法定控除後手取り
= 課税・非課税区分を反映した額面収入
- 所得税等
- 住民税
- 健康保険料
- 介護保険料
- 厚生年金保険料
- 雇用保険料
- その他明示した法定控除
```

実装は制度ruleの順序、課税標準、控除、上限、端数処理を使用する。単一の固定率計算へ簡略化しない。

住民税に必要な前年情報がない場合、既定で今年と同額とは仮定しない。利用者が簡易仮定を選んだ場合だけ警告付きで計算する。

## 5. iDeCo税負担軽減額

掛金に固定税率を掛けない。

```text
軽減額
= iDeCo控除なしで計算した税額
- iDeCo控除ありで計算した税額
```

所得税・住民税を別々に算出し、合計を表示する。

```text
iDeCo拠出後手残り
= iDeCo控除を反映した法定控除後手取り
- 生活費
- iDeCo掛金
- NISA拠出
```

控除効果を収入へ加算したうえで掛金を再度控除する等の二重反映を禁止する。

## 6. 3段階手残り

```text
takeHomeYen
= grossYen - statutoryDeductionsYen

afterLivingYen
= takeHomeYen - allocatedLivingExpensesYen

afterInvestmentYen
= afterLivingYen
- nisaContributionYen
- idecoContributionYen
```

世帯全体と人物別の両方を計算する。

## 7. NISA上限

年間枠、枠種別、保有限度等をruleから受け取る。計算コードへ特定年度の数値を直書きしない。

```text
annualRemaining
= rule.annualLimit - currentYearContributions

lifetimeRemaining
= rule.lifetimeLimit - usedLimit
```

超過時は入力を失わず、計画をinvalidとして超過額を表示する。MVPでは売却枠再利用を計算しない。

## 8. iDeCo上限

対象年月、加入区分、企業年金等の条件をruleへ渡し、上限を一意に解決する。

```text
allowedContribution
= resolveIdecoLimit(rule, participantContext)
```

条件不足時は0円と推測せず`incomplete`を返す。施行日前後の境界日テストを必須とする。

## 9. 将来資産

月次シミュレーションを正本とする。

```text
monthlyReturn = (1 + annualReturn)^(1/12) - 1
monthlyFee = (1 + annualFee)^(1/12) - 1
netMonthlyFactor = (1 + monthlyReturn) / (1 + monthlyFee)
```

各月について、月初拠出または月末拠出の設定順に残高へ反映する。一括の閉形式より、制度上限・臨時拠出・手数料に対応できる反復計算を優先する。

```text
realValue
= nominalValue / (1 + annualInflation)^years
```

利回り、費用率、インフレ率は仮定として結果に併記する。負の利回りを許容し、残高が0円を下回らないようにする。

## 10. 課税口座比較

実装する場合はruleで税率と対象年月を管理し、「最終時点に一括売却」等の比較前提を明示する。損益通算、配当、売却順序を扱わない簡易比較であることを表示する。

## 11. 必須テスト

- 平準化の基準例
- 端数を含む負担割合の合計一致
- 本人費・相手費・共同費の分離
- 連携値更新後の再計算
- 資産形成拠出の二重計上拒否
- iDeCo控除あり・なしの差額
- rule有効期間の開始日・終了日
- rule欠落・重複
- NISA/iDeCo上限直前・一致・1円超過
- 0%、負利回り、長期積立
- import失敗時のState不変
