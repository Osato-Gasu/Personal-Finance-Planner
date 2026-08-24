import type { BonusPayment } from "./take-home-plan";

export interface CommutingFuelEstimateInput {
  averageWorkdaysPerMonthTenths: number | null;
  roundTripDistanceKmTenths: number | null;
  fuelEfficiencyKmPerLiterTenths: number | null;
  gasolinePriceYenPerLiter: number | null;
}

export const EMPTY_COMMUTING_FUEL_ESTIMATE: Readonly<CommutingFuelEstimateInput> =
  Object.freeze({
    averageWorkdaysPerMonthTenths: null,
    roundTripDistanceKmTenths: null,
    fuelEfficiencyKmPerLiterTenths: null,
    gasolinePriceYenPerLiter: null,
  });

export interface PayrollPlan {
  id: string;
  memberId: string;
  targetYear: number;
  active: boolean;
  baseMonthlyYen: number;
  taxableAllowanceMonthlyYen: number;
  averageMonthlyOvertimeMinutes: number;
  scheduledMonthlyMinutes: number;
  overtimeRateBasisPoints: number;
  monthlyNonTaxableCommutingYen: number;
  commutingFuelEstimate: CommutingFuelEstimateInput;
  bonuses: BonusPayment[];
}

export type SchemaVersion8PayrollPlan = Omit<
  PayrollPlan,
  "commutingFuelEstimate"
>;

export interface PayrollResult {
  payrollPlanId: string;
  memberId: string;
  targetYear: number;
  overtimeMonthlyYen: number;
  monthlyTaxableSalaryYen: number;
  monthlyNonTaxableCommutingYen: number;
  monthlyGrossYen: number;
  annualTaxableSalaryYen: number;
  annualNonTaxableCommutingYen: number;
  annualGrossYen: number;
}

export interface PayrollPracticalResult {
  monthlyIncomeYen: number;
  estimatedGasolineYen: number | null;
  commutingBalanceYen: number | null;
  practicalMonthlyIncomeYen: number | null;
  annualBonusYen: number;
  practicalAnnualIncomeYen: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: Record<string, unknown>, key: string): string {
  const item = value[key];
  if (typeof item !== "string" || item.length === 0)
    throw new Error(`${key} must be a non-empty string`);
  return item;
}

function requireBoolean(value: Record<string, unknown>, key: string): boolean {
  const item = value[key];
  if (typeof item !== "boolean") throw new Error(`${key} must be boolean`);
  return item;
}

function requireNonNegativeInteger(
  value: Record<string, unknown>,
  key: string,
): number {
  const item = value[key];
  if (!Number.isSafeInteger(item) || (item as number) < 0)
    throw new Error(`${key} must be a non-negative safe integer`);
  return item as number;
}

function requirePositiveInteger(
  value: Record<string, unknown>,
  key: string,
): number {
  const item = requireNonNegativeInteger(value, key);
  if (item === 0) throw new Error(`${key} must be positive`);
  return item;
}

function requireNullableNonNegativeInteger(
  value: Record<string, unknown>,
  key: string,
): number | null {
  const item = value[key];
  if (item === null) return null;
  if (!Number.isSafeInteger(item) || (item as number) < 0)
    throw new Error(`${key} must be null or a non-negative safe integer`);
  return item as number;
}

function parseCommutingFuelEstimate(
  value: unknown,
): CommutingFuelEstimateInput {
  if (!isRecord(value))
    throw new Error("commutingFuelEstimate must be an object");
  const result: CommutingFuelEstimateInput = {
    averageWorkdaysPerMonthTenths: requireNullableNonNegativeInteger(
      value,
      "averageWorkdaysPerMonthTenths",
    ),
    roundTripDistanceKmTenths: requireNullableNonNegativeInteger(
      value,
      "roundTripDistanceKmTenths",
    ),
    fuelEfficiencyKmPerLiterTenths: requireNullableNonNegativeInteger(
      value,
      "fuelEfficiencyKmPerLiterTenths",
    ),
    gasolinePriceYenPerLiter: requireNullableNonNegativeInteger(
      value,
      "gasolinePriceYenPerLiter",
    ),
  };
  validateCommutingFuelEstimate(result);
  return result;
}

function parseBonus(value: unknown): BonusPayment {
  if (!isRecord(value)) throw new Error("payroll bonus must be an object");
  const paymentDate = requireString(value, "paymentDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate))
    throw new Error("payroll bonus paymentDate must be YYYY-MM-DD");
  return {
    id: requireString(value, "id"),
    paymentDate,
    grossYen: requireNonNegativeInteger(value, "grossYen"),
    socialInsuranceEligible: requireBoolean(value, "socialInsuranceEligible"),
    employmentInsuranceEligible: requireBoolean(
      value,
      "employmentInsuranceEligible",
    ),
  };
}

function validatePayrollPlanFields(plan: Readonly<PayrollPlan>): void {
  if (!plan.id || !plan.memberId)
    throw new Error("payroll plan id and memberId are required");
  if (
    !Number.isInteger(plan.targetYear) ||
    plan.targetYear < 1 ||
    plan.targetYear > 9999
  )
    throw new Error("payroll targetYear must be 1..9999");
  if (typeof plan.active !== "boolean")
    throw new Error("payroll active must be boolean");
  for (const [field, value] of [
    ["baseMonthlyYen", plan.baseMonthlyYen],
    ["taxableAllowanceMonthlyYen", plan.taxableAllowanceMonthlyYen],
    ["averageMonthlyOvertimeMinutes", plan.averageMonthlyOvertimeMinutes],
    ["monthlyNonTaxableCommutingYen", plan.monthlyNonTaxableCommutingYen],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error(`${field} must be a non-negative safe integer`);
  }
  if (
    !Number.isSafeInteger(plan.scheduledMonthlyMinutes) ||
    plan.scheduledMonthlyMinutes < 1
  )
    throw new Error("scheduledMonthlyMinutes must be a positive safe integer");
  if (
    !Number.isSafeInteger(plan.overtimeRateBasisPoints) ||
    plan.overtimeRateBasisPoints < 0
  )
    throw new Error(
      "overtimeRateBasisPoints must be a non-negative safe integer",
    );
  validateCommutingFuelEstimate(plan.commutingFuelEstimate);
  const bonusIds = new Set<string>();
  for (const bonus of plan.bonuses) {
    if (!bonus.id || bonusIds.has(bonus.id))
      throw new Error("payroll bonus IDs must be unique");
    bonusIds.add(bonus.id);
    if (!Number.isSafeInteger(bonus.grossYen) || bonus.grossYen < 0)
      throw new Error(
        "payroll bonus grossYen must be a non-negative safe integer",
      );
    const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bonus.paymentDate);
    const year = Number(date?.[1]);
    const month = Number(date?.[2]);
    const day = Number(date?.[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (
      !date ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > (days[month - 1] ?? 0) ||
      year !== plan.targetYear
    )
      throw new Error("payroll bonus paymentDate must match targetYear");
    if (
      typeof bonus.socialInsuranceEligible !== "boolean" ||
      typeof bonus.employmentInsuranceEligible !== "boolean"
    )
      throw new Error("payroll bonus eligibility must be boolean");
  }
}

export function validatePayrollPlan(plan: Readonly<PayrollPlan>): void {
  validatePayrollPlanFields(plan);
  calculatePayrollUnchecked(plan);
}

export function parsePayrollPlan(value: unknown): PayrollPlan {
  if (!isRecord(value)) throw new Error("payroll plan must be an object");
  if (!Array.isArray(value.bonuses))
    throw new Error("payroll bonuses must be an array");
  const plan: PayrollPlan = {
    id: requireString(value, "id"),
    memberId: requireString(value, "memberId"),
    targetYear: requirePositiveInteger(value, "targetYear"),
    active: requireBoolean(value, "active"),
    baseMonthlyYen: requireNonNegativeInteger(value, "baseMonthlyYen"),
    taxableAllowanceMonthlyYen: requireNonNegativeInteger(
      value,
      "taxableAllowanceMonthlyYen",
    ),
    averageMonthlyOvertimeMinutes: requireNonNegativeInteger(
      value,
      "averageMonthlyOvertimeMinutes",
    ),
    scheduledMonthlyMinutes: requirePositiveInteger(
      value,
      "scheduledMonthlyMinutes",
    ),
    overtimeRateBasisPoints: requireNonNegativeInteger(
      value,
      "overtimeRateBasisPoints",
    ),
    monthlyNonTaxableCommutingYen: requireNonNegativeInteger(
      value,
      "monthlyNonTaxableCommutingYen",
    ),
    commutingFuelEstimate: parseCommutingFuelEstimate(
      value.commutingFuelEstimate,
    ),
    bonuses: value.bonuses.map(parseBonus),
  };
  validatePayrollPlan(plan);
  return plan;
}

export function parseSchemaVersion8PayrollPlan(
  value: unknown,
): SchemaVersion8PayrollPlan {
  if (!isRecord(value)) throw new Error("payroll plan must be an object");
  const parsed = parsePayrollPlan({
    ...value,
    commutingFuelEstimate: EMPTY_COMMUTING_FUEL_ESTIMATE,
  });
  const legacy = structuredClone(parsed) as Partial<PayrollPlan>;
  Reflect.deleteProperty(legacy, "commutingFuelEstimate");
  return legacy as SchemaVersion8PayrollPlan;
}

function safeNumber(value: bigint, field: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error(`${field} exceeds the supported range`);
  return Number(value);
}

function safeSignedNumber(value: bigint, field: string): number {
  const limit = BigInt(Number.MAX_SAFE_INTEGER);
  if (value < -limit || value > limit)
    throw new Error(`${field} exceeds the supported range`);
  return Number(value);
}

function halfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n)
    throw new Error("rounding denominator must be positive");
  return (numerator * 2n + denominator) / (denominator * 2n);
}

export function validateCommutingFuelEstimate(
  input: Readonly<CommutingFuelEstimateInput>,
): void {
  for (const [field, value] of [
    ["averageWorkdaysPerMonthTenths", input.averageWorkdaysPerMonthTenths],
    ["roundTripDistanceKmTenths", input.roundTripDistanceKmTenths],
    ["fuelEfficiencyKmPerLiterTenths", input.fuelEfficiencyKmPerLiterTenths],
    ["gasolinePriceYenPerLiter", input.gasolinePriceYenPerLiter],
  ] as const) {
    if (value !== null && (!Number.isSafeInteger(value) || value < 0))
      throw new Error(`${field} must be null or a non-negative safe integer`);
  }
  if (input.fuelEfficiencyKmPerLiterTenths === 0)
    throw new Error("fuelEfficiencyKmPerLiterTenths must be positive when set");
}

export function calculateEstimatedGasolineYen(
  input: Readonly<CommutingFuelEstimateInput>,
): number | null {
  validateCommutingFuelEstimate(input);
  const { averageWorkdaysPerMonthTenths: workdays } = input;
  const { roundTripDistanceKmTenths: distance } = input;
  const { fuelEfficiencyKmPerLiterTenths: efficiency } = input;
  const { gasolinePriceYenPerLiter: price } = input;
  if (
    workdays === null ||
    distance === null ||
    efficiency === null ||
    price === null
  )
    return null;
  const rounded = halfUp(
    BigInt(distance) * BigInt(workdays) * BigInt(price),
    10n * BigInt(efficiency),
  );
  return safeNumber(rounded, "estimated monthly gasoline cost");
}

export function annualBonusYen(
  bonuses: readonly Readonly<BonusPayment>[],
): number {
  return safeNumber(
    bonuses.reduce((sum, bonus) => sum + BigInt(bonus.grossYen), 0n),
    "annual bonus",
  );
}

export function requiresAnnualBonusReplacementConfirmation(
  bonuses: readonly Readonly<BonusPayment>[],
  nextAnnualBonusYen: number,
): boolean {
  return bonuses.length > 1 && annualBonusYen(bonuses) !== nextAnnualBonusYen;
}

export function adaptAnnualBonuses(options: {
  bonuses: readonly Readonly<BonusPayment>[];
  annualBonusYen: number;
  referenceDate: string;
  createId: () => string;
  allowMultipleReplacement: boolean;
}): BonusPayment[] {
  if (
    !Number.isSafeInteger(options.annualBonusYen) ||
    options.annualBonusYen < 0
  )
    throw new Error("annual bonus must be a non-negative safe integer");
  const current = annualBonusYen(options.bonuses);
  if (current === options.annualBonusYen)
    return structuredClone(options.bonuses) as BonusPayment[];
  if (options.bonuses.length > 1 && !options.allowMultipleReplacement)
    throw new Error("multiple bonus replacement requires confirmation");
  if (options.bonuses.length === 1) {
    const existing = options.bonuses[0];
    if (!existing) throw new Error("existing bonus is missing");
    return [{ ...structuredClone(existing), grossYen: options.annualBonusYen }];
  }
  if (options.annualBonusYen === 0) return [];
  return [
    {
      id: options.createId(),
      paymentDate: options.referenceDate,
      grossYen: options.annualBonusYen,
      socialInsuranceEligible: true,
      employmentInsuranceEligible: true,
    },
  ];
}

export function selectPayrollPlanForContext(
  plans: readonly Readonly<PayrollPlan>[],
  selfMemberId: string,
  currentYear: number,
  selectedPlanId: string | null,
): Readonly<PayrollPlan> | undefined {
  const candidates = plans.filter(
    (plan) => plan.memberId === selfMemberId && plan.targetYear === currentYear,
  );
  return (
    candidates.find((plan) => plan.id === selectedPlanId) ??
    candidates.find((plan) => plan.active) ??
    candidates[0]
  );
}

export function calculatePayrollPracticalResult(
  plan: Readonly<PayrollPlan>,
): PayrollPracticalResult {
  const statutory = calculatePayroll(plan);
  const estimatedGasolineYen = calculateEstimatedGasolineYen(
    plan.commutingFuelEstimate,
  );
  const bonuses = annualBonusYen(plan.bonuses);
  if (estimatedGasolineYen === null) {
    return {
      monthlyIncomeYen: statutory.monthlyGrossYen,
      estimatedGasolineYen: null,
      commutingBalanceYen: null,
      practicalMonthlyIncomeYen: null,
      annualBonusYen: bonuses,
      practicalAnnualIncomeYen: null,
    };
  }
  const practicalMonthly =
    BigInt(statutory.monthlyGrossYen) - BigInt(estimatedGasolineYen);
  return {
    monthlyIncomeYen: statutory.monthlyGrossYen,
    estimatedGasolineYen,
    commutingBalanceYen: safeSignedNumber(
      BigInt(plan.monthlyNonTaxableCommutingYen) - BigInt(estimatedGasolineYen),
      "commuting balance",
    ),
    practicalMonthlyIncomeYen: safeSignedNumber(
      practicalMonthly,
      "practical monthly income",
    ),
    annualBonusYen: bonuses,
    practicalAnnualIncomeYen: safeSignedNumber(
      practicalMonthly * 12n + BigInt(bonuses),
      "practical annual income",
    ),
  };
}

function calculatePayrollUnchecked(plan: Readonly<PayrollPlan>): PayrollResult {
  const overtime = halfUp(
    BigInt(plan.baseMonthlyYen) *
      BigInt(plan.averageMonthlyOvertimeMinutes) *
      BigInt(plan.overtimeRateBasisPoints),
    BigInt(plan.scheduledMonthlyMinutes) * 10_000n,
  );
  const monthlyTaxable =
    BigInt(plan.baseMonthlyYen) +
    BigInt(plan.taxableAllowanceMonthlyYen) +
    overtime;
  const monthlyNonTaxable = BigInt(plan.monthlyNonTaxableCommutingYen);
  const bonusTotal = plan.bonuses.reduce(
    (sum, bonus) => sum + BigInt(bonus.grossYen),
    0n,
  );
  const annualTaxable = monthlyTaxable * 12n + bonusTotal;
  const annualNonTaxable = monthlyNonTaxable * 12n;
  return {
    payrollPlanId: plan.id,
    memberId: plan.memberId,
    targetYear: plan.targetYear,
    overtimeMonthlyYen: safeNumber(overtime, "monthly overtime pay"),
    monthlyTaxableSalaryYen: safeNumber(monthlyTaxable, "monthly taxable pay"),
    monthlyNonTaxableCommutingYen: plan.monthlyNonTaxableCommutingYen,
    monthlyGrossYen: safeNumber(
      monthlyTaxable + monthlyNonTaxable,
      "monthly gross pay",
    ),
    annualTaxableSalaryYen: safeNumber(annualTaxable, "annual taxable pay"),
    annualNonTaxableCommutingYen: safeNumber(
      annualNonTaxable,
      "annual non-taxable commuting pay",
    ),
    annualGrossYen: safeNumber(
      annualTaxable + annualNonTaxable,
      "annual gross pay",
    ),
  };
}

export function calculatePayroll(plan: Readonly<PayrollPlan>): PayrollResult {
  validatePayrollPlanFields(plan);
  return calculatePayrollUnchecked(plan);
}
