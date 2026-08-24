import type { Store } from "../../app/store";
import {
  adaptAnnualBonuses,
  annualBonusYen,
  calculatePayroll,
  calculatePayrollPracticalResult,
  EMPTY_COMMUTING_FUEL_ESTIMATE,
  requiresAnnualBonusReplacementConfirmation,
  selectPayrollPlanForContext,
  type CommutingFuelEstimateInput,
  type PayrollPlan,
} from "../../domain/payroll";
import {
  DEFAULT_TAKE_HOME_SUPPORTED_YEAR,
  isTakeHomeSupportedYear,
} from "../../domain/take-home-support";

interface Options {
  document: Document;
  store: Store;
  createId: () => string;
  getReferenceDate: () => string;
  requestRender: () => void;
  confirmBonusReplacement?: (message: string) => boolean;
}

function node<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  text?: string,
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  return result;
}

function input(
  document: Document,
  type: string,
  value: string,
): HTMLInputElement {
  const result = node(document, "input");
  result.type = type;
  result.value = value;
  return result;
}

function bindHelpInteractions(
  document: Document,
  trigger: HTMLButtonElement,
  panel: HTMLElement,
): void {
  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  };
  let pointerFocus = false;
  trigger.addEventListener("pointerdown", () => {
    pointerFocus = true;
  });
  trigger.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") setOpen(true);
  });
  trigger.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && document.activeElement !== trigger)
      setOpen(false);
  });
  trigger.addEventListener("focus", () => {
    if (!pointerFocus) setOpen(true);
  });
  trigger.addEventListener("blur", () => {
    pointerFocus = false;
    setOpen(false);
  });
  trigger.addEventListener("click", () => {
    setOpen(panel.hidden !== false);
    pointerFocus = false;
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setOpen(false);
  });
}

function help(
  document: Document,
  id: string,
  label: string,
  description: string,
): HTMLSpanElement {
  const wrapper = node(document, "span");
  wrapper.className = "payroll-help";
  const trigger = node(document, "button", "?");
  trigger.type = "button";
  trigger.className = "payroll-help-trigger";
  trigger.setAttribute("aria-label", `${label}の説明`);
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", id);
  trigger.setAttribute("aria-describedby", id);
  const panel = node(document, "span", description);
  panel.id = id;
  panel.className = "payroll-help-panel";
  panel.setAttribute("role", "tooltip");
  panel.hidden = true;
  bindHelpInteractions(document, trigger, panel);
  wrapper.append(trigger, panel);
  return wrapper;
}

function resultHelp(options: {
  document: Document;
  id: string;
  label: string;
  description: string;
  breakdown: readonly [string, string][];
}): HTMLDivElement {
  const wrapper = node(options.document, "div");
  wrapper.className = "payroll-help payroll-result-help";
  const trigger = node(options.document, "button", options.label);
  trigger.type = "button";
  trigger.className = "payroll-help-trigger payroll-result-label-trigger";
  trigger.setAttribute("aria-label", `${options.label}の詳細`);
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", options.id);
  trigger.setAttribute("aria-describedby", options.id);
  const panel = node(options.document, "div");
  panel.id = options.id;
  panel.className = "payroll-help-panel payroll-result-help-panel";
  panel.setAttribute("role", "tooltip");
  panel.hidden = true;
  const description = node(options.document, "p", options.description);
  description.className = "payroll-result-description";
  const breakdown = node(options.document, "dl");
  breakdown.className = "payroll-result-breakdown";
  for (const [label, value] of options.breakdown) {
    breakdown.append(
      node(options.document, "dt", label),
      node(options.document, "dd", value),
    );
  }
  panel.append(description, breakdown);
  bindHelpInteractions(options.document, trigger, panel);
  wrapper.append(trigger, panel);
  return wrapper;
}

function field(
  document: Document,
  id: string,
  labelText: string,
  description: string,
  control: HTMLInputElement,
): HTMLDivElement {
  const result = node(document, "div");
  result.className = "payroll-field";
  const heading = node(document, "div");
  heading.className = "payroll-field-heading";
  const label = node(document, "label", labelText);
  label.htmlFor = id;
  control.id = id;
  heading.append(label, help(document, `${id}-help`, labelText, description));
  result.append(heading, control);
  return result;
}

function nonNegativeInteger(value: string, label: string): number {
  if (!/^\d+$/u.test(value))
    throw new Error(`${label}は0以上の整数で入力してください。`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed))
    throw new Error(`${label}が入力範囲を超えています。`);
  return parsed;
}

function nullableNonNegativeInteger(
  value: string,
  label: string,
): number | null {
  return value === "" ? null : nonNegativeInteger(value, label);
}

function decimalTenths(value: string, label: string): number | null {
  if (value === "") return null;
  const match = /^(\d+)(?:\.(\d))?$/u.exec(value);
  if (!match) throw new Error(`${label}は0.1単位で入力してください。`);
  const whole = BigInt(match[1] ?? "0");
  const fraction = BigInt(match[2] ?? "0");
  const tenths = whole * 10n + fraction;
  if (tenths > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error(`${label}が入力範囲を超えています。`);
  return Number(tenths);
}

function tenthsInput(value: number | null): string {
  if (value === null) return "";
  return `${String(Math.floor(value / 10))}.${String(value % 10)}`;
}

function hoursToMinutes(value: string, label: string): number {
  const hours = Number(value);
  const minutes = hours * 60;
  if (!Number.isFinite(hours) || hours < 0 || !Number.isSafeInteger(minutes))
    throw new Error(`${label}は分に換算できる0以上の時間で入力してください。`);
  return minutes;
}

function basisPoints(value: string, label: string): number {
  if (!/^\d+(?:\.\d{1,4})?$/u.test(value))
    throw new Error(`${label}は0以上、小数4桁以内で入力してください。`);
  const result = Math.round(Number(value) * 10_000);
  if (!Number.isSafeInteger(result))
    throw new Error(`${label}が入力範囲を超えています。`);
  return result;
}

function yen(value: number): string {
  return `${value.toLocaleString("ja-JP")}円`;
}

function displayYen(value: number | null): string {
  return value === null ? "未計算" : yen(value);
}

function resultCard(options: {
  document: Document;
  id: string;
  label: string;
  value: number | null;
  description: string;
  breakdown: readonly [string, string][];
}): HTMLElement {
  const card = node(options.document, "article");
  card.className = "summary-card payroll-primary-result";
  card.dataset.testid = "payroll-primary-result";
  card.dataset.resultKind = options.id;
  const heading = node(options.document, "div");
  heading.className = "payroll-result-heading";
  heading.append(
    resultHelp({
      document: options.document,
      id: `payroll-result-${options.id}-help`,
      label: options.label,
      description: options.description,
      breakdown: options.breakdown,
    }),
  );
  card.append(
    heading,
    node(options.document, "strong", displayYen(options.value)),
  );
  return card;
}

function fuelInput(
  selected: Readonly<PayrollPlan> | undefined,
): Readonly<CommutingFuelEstimateInput> {
  return selected?.commutingFuelEstimate ?? EMPTY_COMMUTING_FUEL_ESTIMATE;
}

export function createPayrollRenderer(
  options: Options,
): (container: HTMLElement) => void {
  let selectedPlanId: string | null = null;
  return (container) => {
    const { document, store } = options;
    const state = store.getState();
    const selfMembers = state.members.filter(
      (member) => member.role === "self",
    );
    const self = selfMembers[0];
    const layout = node(document, "div");
    layout.className = "work-tab-layout payroll-layout";
    if (selfMembers.length !== 1 || !self) {
      const alert = node(document, "p", "本人情報を一意に解決できません。");
      alert.setAttribute("role", "alert");
      layout.append(alert);
      container.append(layout);
      return;
    }
    const referenceDate = options.getReferenceDate();
    const currentYear = Number(referenceDate.slice(0, 4));
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(referenceDate) || currentYear < 1) {
      const alert = node(document, "p", "基準日を解決できません。");
      alert.setAttribute("role", "alert");
      layout.append(alert);
      container.append(layout);
      return;
    }
    const selected = selectPayrollPlanForContext(
      state.payrollPlans,
      self.id,
      currentYear,
      selectedPlanId,
    );
    selectedPlanId = selected?.id ?? null;

    const inputCard = node(document, "section");
    inputCard.className = "dashboard-card input-card";
    inputCard.dataset.area = "input";
    inputCard.append(node(document, "h3", "給与条件を入力"));
    const context = node(
      document,
      "p",
      `${self.displayName} / ${String(currentYear)}年（自動）`,
    );
    context.className = "payroll-context";
    context.dataset.testid = "payroll-context";
    inputCard.append(context);

    const form = node(document, "form");
    form.className = "form-grid payroll-form";
    const base = input(
      document,
      "number",
      String(selected?.baseMonthlyYen ?? 0),
    );
    base.min = "0";
    base.step = "1";
    const allowance = input(
      document,
      "number",
      String(selected?.taxableAllowanceMonthlyYen ?? 0),
    );
    allowance.min = "0";
    allowance.step = "1";
    const overtime = input(
      document,
      "number",
      String((selected?.averageMonthlyOvertimeMinutes ?? 0) / 60),
    );
    overtime.min = "0";
    overtime.step = "0.016666666666666666";
    const commuting = input(
      document,
      "number",
      String(selected?.monthlyNonTaxableCommutingYen ?? 0),
    );
    commuting.min = "0";
    commuting.step = "1";
    const workdays = input(
      document,
      "number",
      tenthsInput(fuelInput(selected).averageWorkdaysPerMonthTenths),
    );
    workdays.min = "0";
    workdays.step = "0.1";
    const annualBonus = input(
      document,
      "number",
      String(selected ? annualBonusYen(selected.bonuses) : 0),
    );
    annualBonus.min = "0";
    annualBonus.step = "1";
    form.append(
      field(
        document,
        "payroll-base",
        "基本給（月）",
        "1か月の基本給。残業単価の基礎です。",
        base,
      ),
      field(
        document,
        "payroll-allowance",
        "手当（月）",
        "毎月の課税固定手当。残業単価の基礎には含めません。",
        allowance,
      ),
      field(
        document,
        "payroll-overtime",
        "残業（月平均）",
        "1か月あたりの平均残業時間。",
        overtime,
      ),
      field(
        document,
        "payroll-commuting",
        "通勤手当（月・非課税）",
        "給与として支給される非課税通勤手当。ガソリン代見積とは別で、法定計算値を直接減らしません。",
        commuting,
      ),
      field(
        document,
        "payroll-workdays",
        "出勤日数（月平均）",
        "月間通勤距離を見積もるための平均出勤日数。",
        workdays,
      ),
      field(
        document,
        "payroll-annual-bonus",
        "賞与（年）",
        "既存賞与明細の合計。新規1件は現在日付支給として概算し、既存明細の支給日・対象区分は無断変更しません。",
        annualBonus,
      ),
    );

    const advanced = node(document, "details");
    advanced.className = "payroll-details";
    advanced.append(node(document, "summary", "詳細"));
    const advancedGrid = node(document, "div");
    advancedGrid.className = "payroll-details-grid";
    const scheduled = input(
      document,
      "number",
      String((selected?.scheduledMonthlyMinutes ?? 9_600) / 60),
    );
    scheduled.min = "0.016666666666666666";
    scheduled.step = "0.016666666666666666";
    const rate = input(
      document,
      "number",
      String((selected?.overtimeRateBasisPoints ?? 12_500) / 10_000),
    );
    rate.min = "0";
    rate.step = "0.0001";
    const price = input(
      document,
      "number",
      fuelInput(selected).gasolinePriceYenPerLiter?.toString() ?? "",
    );
    price.min = "0";
    price.step = "1";
    const distance = input(
      document,
      "number",
      tenthsInput(fuelInput(selected).roundTripDistanceKmTenths),
    );
    distance.min = "0";
    distance.step = "0.1";
    const efficiency = input(
      document,
      "number",
      tenthsInput(fuelInput(selected).fuelEfficiencyKmPerLiterTenths),
    );
    efficiency.min = "0.1";
    efficiency.step = "0.1";
    advancedGrid.append(
      field(
        document,
        "payroll-scheduled",
        "所定労働時間（月）",
        "残業単価の算定に使う月平均所定労働時間。",
        scheduled,
      ),
      field(
        document,
        "payroll-rate",
        "時間外倍率",
        "残業代へ掛ける倍率。",
        rate,
      ),
      field(
        document,
        "payroll-gasoline-price",
        "ガソリン単価（1L）",
        "1リットルあたりの想定価格。",
        price,
      ),
      field(
        document,
        "payroll-distance",
        "往復距離（日）",
        "1出勤日の往復通勤距離。",
        distance,
      ),
      field(
        document,
        "payroll-efficiency",
        "燃費",
        "1リットルで走行できる距離。",
        efficiency,
      ),
    );
    advanced.append(advancedGrid);
    form.append(advanced);

    const showLegacyBonusDetails =
      selected !== undefined &&
      (selected.bonuses.length > 1 ||
        selected.bonuses.some(
          (bonus) =>
            !bonus.socialInsuranceEligible ||
            !bonus.employmentInsuranceEligible,
        ));
    if (showLegacyBonusDetails) {
      const details = node(document, "details");
      details.className = "payroll-legacy-bonuses";
      details.append(node(document, "summary", "賞与明細（既存データ）"));
      const list = node(document, "div");
      list.className = "payroll-legacy-bonus-list";
      for (const bonus of selected.bonuses) {
        const row = node(document, "dl");
        row.className = "payroll-legacy-bonus-row";
        for (const [label, value] of [
          ["支給日", bonus.paymentDate],
          ["金額", yen(bonus.grossYen)],
          ["社会保険", bonus.socialInsuranceEligible ? "対象" : "対象外"],
          ["雇用保険", bonus.employmentInsuranceEligible ? "対象" : "対象外"],
        ]) {
          row.append(node(document, "dt", label), node(document, "dd", value));
        }
        list.append(row);
      }
      details.append(list);
      form.append(details);
    }

    const status = node(document, "p");
    status.className = "operation-status";
    if (selected && !selected.active) {
      const activate = node(document, "button", "有効化");
      activate.type = "button";
      activate.className = "payroll-activate";
      activate.addEventListener("click", () => {
        try {
          store.dispatch({
            type: "set-payroll-plan-active",
            planId: selected.id,
            active: true,
          });
        } catch (error) {
          status.textContent =
            error instanceof Error ? error.message : "有効化できません。";
          status.setAttribute("role", "alert");
        }
      });
      form.append(activate);
    }
    const submit = node(
      document,
      "button",
      selected ? "給与計画を更新" : "給与計画を保存",
    );
    submit.type = "submit";
    submit.className = "payroll-submit";
    form.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        const nextAnnualBonus = nonNegativeInteger(
          annualBonus.value,
          "賞与（年）",
        );
        const needsConfirmation =
          selected !== undefined &&
          requiresAnnualBonusReplacementConfirmation(
            selected.bonuses,
            nextAnnualBonus,
          );
        let allowMultipleReplacement = false;
        if (needsConfirmation) {
          const confirm =
            options.confirmBonusReplacement ??
            ((message: string) =>
              document.defaultView?.confirm(message) ?? false);
          allowMultipleReplacement = confirm(
            "賞与（年）を変更すると、既存の複数明細を現在日の1件へ置換し、支給日・保険対象区分を失います。置換しますか？",
          );
          if (!allowMultipleReplacement) {
            status.textContent =
              "賞与明細の置換を取り消しました。保存内容は変更していません。";
            status.removeAttribute("role");
            return;
          }
        }
        const bonuses = adaptAnnualBonuses({
          bonuses: selected?.bonuses ?? [],
          annualBonusYen: nextAnnualBonus,
          referenceDate,
          createId: options.createId,
          allowMultipleReplacement,
        });
        const commutingFuelEstimate: CommutingFuelEstimateInput = {
          averageWorkdaysPerMonthTenths: decimalTenths(
            workdays.value,
            "出勤日数（月平均）",
          ),
          roundTripDistanceKmTenths: decimalTenths(
            distance.value,
            "往復距離（日）",
          ),
          fuelEfficiencyKmPerLiterTenths: decimalTenths(
            efficiency.value,
            "燃費",
          ),
          gasolinePriceYenPerLiter: nullableNonNegativeInteger(
            price.value,
            "ガソリン単価（1L）",
          ),
        };
        const plan: PayrollPlan = {
          id: selected?.id ?? options.createId(),
          memberId: self.id,
          targetYear: currentYear,
          active: selected?.active ?? true,
          baseMonthlyYen: nonNegativeInteger(base.value, "基本給（月）"),
          taxableAllowanceMonthlyYen: nonNegativeInteger(
            allowance.value,
            "手当（月）",
          ),
          averageMonthlyOvertimeMinutes: hoursToMinutes(
            overtime.value,
            "残業（月平均）",
          ),
          scheduledMonthlyMinutes: hoursToMinutes(
            scheduled.value,
            "所定労働時間（月）",
          ),
          overtimeRateBasisPoints: basisPoints(rate.value, "時間外倍率"),
          monthlyNonTaxableCommutingYen: nonNegativeInteger(
            commuting.value,
            "通勤手当（月・非課税）",
          ),
          commutingFuelEstimate,
          bonuses,
        };
        store.dispatch(
          selected
            ? { type: "update-payroll-plan", planId: selected.id, plan }
            : { type: "add-payroll-plan", plan },
        );
        selectedPlanId = plan.id;
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : "給与計画を保存できません。";
        status.setAttribute("role", "alert");
      }
    });
    inputCard.append(form, status);

    const output = node(document, "section");
    output.className = "dashboard-card result-card";
    output.dataset.area = "result";
    output.append(node(document, "h3", "給与計算結果"));
    if (!selected) {
      output.append(
        node(document, "p", "給与条件を保存すると結果を表示します。"),
      );
    } else {
      const supported = isTakeHomeSupportedYear(selected.targetYear);
      const linkability = node(
        document,
        "p",
        supported
          ? `${String(selected.targetYear)}年の給与計画は手取り自動連携に対応しています。`
          : `この年は給与総支給のみ計算できます。手取り自動連携は${String(DEFAULT_TAKE_HOME_SUPPORTED_YEAR)}年のみ対応しています。`,
      );
      linkability.setAttribute("role", "status");
      linkability.dataset.testid = "payroll-take-home-linkability";
      linkability.dataset.linkability = supported ? "supported" : "gross-only";
      output.append(linkability);
      try {
        const statutory = calculatePayroll(selected);
        const practical = calculatePayrollPracticalResult(selected);
        const grid = node(document, "div");
        grid.className = "kpi-grid payroll-primary-results";
        grid.append(
          resultCard({
            document,
            id: "monthly-income",
            label: "月収",
            value: practical.monthlyIncomeYen,
            description:
              "基本給 + 手当 + 残業代 + 通勤手当。賞与、税、社会保険控除前です。手当は残業単価の基礎に含めません。",
            breakdown: [
              ["基本給", yen(selected.baseMonthlyYen)],
              ["手当", yen(selected.taxableAllowanceMonthlyYen)],
              ["残業代", yen(statutory.overtimeMonthlyYen)],
              ["通勤手当", yen(selected.monthlyNonTaxableCommutingYen)],
            ],
          }),
          resultCard({
            document,
            id: "practical-monthly-income",
            label: "実質月収",
            value: practical.practicalMonthlyIncomeYen,
            description:
              "月収から推定ガソリン代を差し引いた生活試算です。税引後手取りではなく、税・社会保険計算値も変更しません。",
            breakdown: [
              ["月収", yen(practical.monthlyIncomeYen)],
              ["通勤手当", yen(selected.monthlyNonTaxableCommutingYen)],
              ["推定ガソリン代", displayYen(practical.estimatedGasolineYen)],
              ["通勤収支", displayYen(practical.commutingBalanceYen)],
              ["実質月収", displayYen(practical.practicalMonthlyIncomeYen)],
            ],
          }),
          resultCard({
            document,
            id: "practical-annual-income",
            label: "年収",
            value: practical.practicalAnnualIncomeYen,
            description:
              "実質月収 × 12 + 賞与（年）。ガソリン代見積を差し引く税引前の生活試算で、税務上の年収・年間総支給ではありません。",
            breakdown: [
              [
                "実質月収 × 12",
                practical.practicalMonthlyIncomeYen === null
                  ? "未計算"
                  : yen(practical.practicalMonthlyIncomeYen * 12),
              ],
              ["賞与（年）", yen(practical.annualBonusYen)],
              ["年収", displayYen(practical.practicalAnnualIncomeYen)],
            ],
          }),
        );
        output.append(grid);
        const note = node(
          document,
          "p",
          "すべて税・社会保険控除前です。実質月収・年収はガソリン代を反映した生活試算です。税・社会保険の計算には使いません。",
        );
        note.className = "payroll-practical-note";
        note.dataset.testid = "payroll-practical-note";
        output.append(note);
      } catch (error) {
        const alert = node(
          document,
          "p",
          error instanceof Error ? error.message : "計算できません。",
        );
        alert.setAttribute("role", "alert");
        output.append(alert);
      }
    }
    const disclosure = node(document, "details");
    disclosure.className = "calculation-disclosure";
    disclosure.append(node(document, "summary", "給与計算の前提"));
    const list = node(document, "ul");
    [
      "平均残業時間を12か月すべてに繰り返す概算です。",
      "残業単価の基礎は基本給のみで、課税手当を含めません。",
      "所定労働時間と時間外倍率は編集可能な便宜上の初期値で、法的な保証ではありません。",
      "深夜・法定休日・月60時間超の割増区分は自動計算しません。",
      "実際の勤務先の給与計算規程と異なる場合があります。",
    ].forEach((text) => list.append(node(document, "li", text)));
    disclosure.append(list);
    output.append(disclosure);
    layout.append(inputCard, output);
    container.append(layout);
  };
}
