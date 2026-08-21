# データモデル v0.2

## 1. 基本型

```ts
type Yen = number;          // 0以上の安全な整数
type SignedYen = number;    // 手残り等、負数を許可する安全な整数
type BasisPoints = number;  // 0..10000
type ISODate = string;      // YYYY-MM-DD
type YearMonth = string;    // YYYY-MM
type EntityId = string;
```

小数円を永続化しない。割合50.0%は`5000`として保存する。運用計算の内部小数は結果確定時に円へ丸める。

## 2. AppState

```ts
interface AppState {
  schemaVersion: 8;
  activeRoute: RouteId;
  members: HouseholdMember[];
  payrollPlans: PayrollPlan[];
  takeHomePlans: TakeHomePlan[];
  takeHomeCompensationBindings: TakeHomeCompensationBinding[];
  incomeTargets: IncomeTarget[];
  budgetIncomePolicies: BudgetIncomePolicy[];
  links: LinkDefinition[];
  budget: BudgetState;
  contributionSources: ContributionSource[];
  nisaPlans: NisaPlan[];
  investmentScenarios: InvestmentScenario[];
  idecoPlans: IdecoPlan[];
  backup: BackupMetadata;
  lifePlan: LifePlanState;
}
```

current正本はschemaVersion 8とする。schema v7はrouteを含む旧shapeをそのまま凍結し、v7→v8では3つの空top-level配列と`life-plan`→`overview` route写像だけを追加する。既存v1～v7 migrationの意味を変更しない。

### 2.1 TASK-016追加shape

```ts
interface PayrollPlan {
  id: string;
  memberId: string;
  targetYear: number;
  active: boolean;
  baseMonthlyYen: Yen;
  taxableAllowanceMonthlyYen: Yen;
  averageMonthlyOvertimeMinutes: number;
  scheduledMonthlyMinutes: number;
  overtimeRateBasisPoints: number;
  monthlyNonTaxableCommutingYen: Yen;
  bonuses: BonusPayment[];
}

interface TakeHomeCompensationBinding {
  takeHomePlanId: string;
  payrollPlanId: string;
  active: boolean;
}

interface BudgetIncomePolicy {
  targetId: string;
  mode: 'auto-take-home' | 'legacy';
}
```

同一人物・対象年のactive`PayrollPlan`は最大1件、計算手取りのactive bindingは最大1件、policyの`targetId`は配列内で一意とする。bindingは同一人物・対象年の既存recordだけを参照し、policyは既存`IncomeTarget`だけを参照する。派生給与集計と`InvestmentFundingContext`は永続化しない。

新規`createInitialState()`は本人・相手の既定IncomeTargetそれぞれに`auto-take-home` policyを作る。新しい計算`TakeHomePlan`を追加するStore遷移は、同一人物・対象年のactive給与計画がexact 1件の場合だけbindingも同じnext stateへ追加する。0件または複数では追加しない。これらは新規通常フローのdefaultであり、v7→v8 migrationは引き続き`takeHomeCompensationBindings: []`と`budgetIncomePolicies: []`を生成してlegacy bytes/authorityを保つ。

## 3. ライフプラン

```ts
interface LifePlanState {
  baseReferenceDate: ISODate | null;
  projectionStartYear: number | null;
  startingLiquidAssetsYen: Yen;
  projectionYears: number; // 1..60
  events: LifePlanEvent[];
}

interface LifePlanEvent {
  id: EntityId;
  name: string; // trim済み1..80
  kind: 'income' | 'expense';
  startYear: number; // 1..9999
  endYear: number; // startYear..9999
  annualAmountYen: Yen;
  memo: string; // 0..500
  active: boolean;
}
```

`baseReferenceDate`は上流の投資後手残りを計算する固定日、`projectionStartYear`は`startingLiquidAssetsYen`が1月1日に属する暦年であり、別の時間anchorとして保存する。derivedな月額・年額・年次行は永続化しない。

TASK-015の投資年次値、人物別小計、拠出整合性finding、warning、金融資産合計もruntime derivedであり、`LifePlanState`またはbackupへ保存しない。投資年次値は`domain`、`memberId`、`sourceId`、正確な`endpointMonth`、authority status、残高・元本・運用損益を持つ。未設定だけが残高0円を持ち、active計画の`complete`以外はnullとする。年末現預金が負、拠出不一致・判定不能、投資残高非authoritativeまたは安全整数加算失敗の場合、金融資産合計はnullとする。

## 4. 人物

```ts
interface HouseholdMember {
  id: EntityId;
  role: 'self' | 'partner';
  displayName: string;
  birthDate?: ISODate;
  residencePrefecture?: string;
  active: boolean;
}
```

`self`は常に1件。`partner`は最大1件。同棲モード解除時もpartnerデータを削除せずinactiveにできる。

schema v1由来のotherwise-validな`displayName`はLF、CR、CRLF、前後空白、50文字超を含み得る。migrationと通常表示では文字列をlosslessに保持し、UIのsingle-line編集bufferとpersisted valueを区別する。明示的な編集・保存時だけ新しい入力制約を適用する。

## 5. 手取り計画

```ts
interface IncomePlan {
  id: EntityId;
  memberId: EntityId;
  targetPeriod: YearMonth;
  inputMode: 'annual' | 'monthly';
  annualSalaryYen?: Yen;
  monthlySalaryYen?: Yen;
  bonuses: BonusInput[];
  nonTaxableCommutingAllowanceYen: Yen;
  previousYearIncomeYen?: Yen;
  deductionSettings: DeductionSettings;
  socialInsuranceSettings: SocialInsuranceSettings;
}
```

```ts
interface SocialInsuranceSettings {
  healthInsuranceMode:
    | 'kyokai-kenpo'
    | 'manual'
    | 'unsupported-uncomputed';
  prefecture?: string;
  manualAnnualPremiumYen?: Yen;
  employmentCategory?: string;
}
```

組合健保・共済等を`kyokai-kenpo`として保存してはならない。

## 6. 家計

```ts
interface BudgetState {
  mode: 'detailed' | 'simple';
  globalSelfShareBasisPoints: BasisPoints;
  simpleMonthlyExpenseYen?: Yen;
  categories: BudgetCategory[];
  items: ExpenseItem[];
  incomeLinks: MemberIncomeLink[];
}
```

```ts
interface BudgetCategory {
  id: EntityId;
  name: string;
  description?: string;
  shareMode: 'inherit' | 'custom';
  selfShareBasisPoints?: BasisPoints;
  sortOrder: number;
  active: boolean;
}
```

```ts
interface ExpenseItem {
  id: EntityId;
  categoryId?: EntityId;
  purpose: string;
  kind: 'living-expense' | 'asset-contribution';
  scope: 'shared' | 'self' | 'partner';
  amountYen: Yen;
  cycleValue: number;
  cycleUnit: 'day' | 'week' | 'month' | 'year';
  occurrencesPerCycle: number;
  shareMode: 'inherit' | 'custom';
  selfShareBasisPoints?: BasisPoints;
  source: ValueSource;
  memo?: string;
  active: boolean;
}
```

`asset-contribution`は通常のカテゴリCRUDから手入力できない。NISA・iDeCo計画から導出する表示専用項目とする。

## 7. 資産形成

```ts
interface InvestmentPlan {
  id: EntityId;
  memberId: EntityId;
  startMonth: YearMonth;
  targetMonth: YearMonth;
  nisa: NisaPlan;
  ideco: IdecoPlan;
  activeScenarioId: EntityId;
}
```

```ts
interface NisaPlan {
  currentBalanceYen: Yen;
  currentBookValueYen: Yen;
  usedLimitYen: Yen;
  usedGrowthLimitYen: Yen;
  monthlyTsumitateYen: Yen;
  monthlyGrowthYen: Yen;
  additionalPurchases: ScheduledContribution[];
}
```

```ts
interface IdecoPlan {
  participantCategory: string;
  employerPensionType?: string;
  employerDcContributionYen?: Yen;
  otherPensionEquivalentYen?: Yen;
  monthlyContributionYen: Yen;
  currentBalanceYen: Yen;
  currentContributionTotalYen: Yen;
  monthlyFeeYen: Yen;
  receiptStartAge?: number;
}
```

制度区分はUI文言ではなくrule packageが認識できる安定キーで保存する。

## 8. 連携

```ts
type ValueSource =
  | { type: 'manual' }
  | {
      type: 'linked';
      sourceType:
        | 'take-home-result'
        | 'nisa-contribution'
        | 'ideco-contribution';
      sourceId: EntityId;
      field: string;
    };
```

```ts
interface LinkDefinition {
  id: EntityId;
  targetType: string;
  targetId: EntityId;
  sourceType: string;
  sourceId: EntityId;
  field: string;
  active: boolean;
}
```

同一`targetType + targetId`にactive linkは1件まで。同一の資産形成`sourceType + sourceId`から導出するactive contributionも1件まで。

## 9. 制度ルール

```ts
interface RuleMetadata {
  id: string;
  domain: RuleDomain;
  jurisdiction: 'JP';
  effectiveFrom: ISODate;
  effectiveTo: ISODate | null;
  status: 'current' | 'scheduled' | 'retired';
  publishedAt?: ISODate;
  verifiedAt: ISODate;
  verifiedBy: string;
  sourceTitle: string;
  sourceUrl: string;
  sourcePublisher: string;
  sourceRetrievedAt: ISODate;
  notes?: string;
}
```

Rule本体はmetadataと値を分離しない。同じversioned moduleからexportする。

## 10. バックアップ

```ts
interface BackupMetadata {
  lastSuccessfulSaveAt?: string;
  lastExportedAt?: string;
  reminderIntervalDays: number;
  reminderDismissedUntil?: ISODate;
}
```

`lastExportedAt`はダウンロード開始ではなく、JSON生成とブラウザへの引渡しが成功した時点で更新する。

`reminderDismissedUntil`は期限付き表示抑制だけを表し、`lastExportedAt`を更新しない。backup metadataは金融計算へ影響せず、warningは注入可能なreference dateから導出する。

## 11. 不変条件

- entity IDは一度発行したら名称変更で変えない。
- 参照先の存在しないactive linkを保存しない。
- `self`は1件だけ。
- active partnerは最大1件。
- Yen入力は0以上の安全な整数。
- `cycleValue`と`occurrencesPerCycle`は1以上の整数。
- BasisPointsは0から10000。
- custom shareには割合が必須。
- shared費の本人額と相手額の合計は全体額と一致する。
- 同じsourceの資産形成拠出を重複保存しない。
- rule期間の重複を許可しない。
- schema migration失敗時に元データを変更しない。
- migrationはdeterministicかつidempotentで、legacy/current storage bytesをcommit前に変更しない。
- corrupt currentをlegacyでsilent fallback/overwriteしない。
- importはschema・全invariant検証とユーザー確認後だけAppState全体をatomic replacementする。
- legacy表示名のCR/LFをDOM正規化だけでpersisted valueへ書き戻さない。
- ライフプランの基準日はnullまたは実在するISO日付、開始年はnullまたは1..9999、投影終了年は9999以下とする。
- ライフイベントIDは一意かつ更新で不変とし、存在しない更新・有効切替・削除を拒否する。
- ライフプラン設定の4項目は一括検証し、不正時にState publishまたはstorage writeを行わない。
- 年次投資観測点、拠出整合性、金融資産合計をAppStateへ追加せず、TASK-016のschemaVersion 8でもruntime derivedのまま維持する。
