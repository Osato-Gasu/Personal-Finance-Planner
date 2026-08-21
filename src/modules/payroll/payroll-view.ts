import type { Store } from "../../app/store";
import { calculatePayroll, type PayrollPlan } from "../../domain/payroll";

interface Options {
  document: Document;
  store: Store;
  createId: () => string;
  getReferenceDate: () => string;
  requestRender: () => void;
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

function field(
  document: Document,
  label: string,
  control: HTMLInputElement | HTMLSelectElement,
): HTMLLabelElement {
  const result = node(document, "label");
  result.append(node(document, "span", label), control);
  return result;
}

function nonNegativeInteger(value: string, label: string): number {
  if (!/^\d+$/.test(value))
    throw new Error(`${label}は0以上の整数で入力してください。`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed))
    throw new Error(`${label}が入力範囲を超えています。`);
  return parsed;
}

function hoursToMinutes(value: string, label: string): number {
  const hours = Number(value);
  const minutes = hours * 60;
  if (!Number.isFinite(hours) || hours < 0 || !Number.isSafeInteger(minutes))
    throw new Error(`${label}は分に換算できる0以上の時間で入力してください。`);
  return minutes;
}

function yen(value: number): string {
  return `${value.toLocaleString("ja-JP")}円`;
}

export function createPayrollRenderer(
  options: Options,
): (container: HTMLElement) => void {
  let selectedPlanId: string | null = null;
  return (container) => {
    const { document, store } = options;
    const state = store.getState();
    const selected =
      state.payrollPlans.find((plan) => plan.id === selectedPlanId) ??
      state.payrollPlans.find((plan) => plan.active) ??
      state.payrollPlans[0];
    selectedPlanId = selected?.id ?? null;
    const layout = node(document, "div");
    layout.className = "work-tab-layout";

    const inputCard = node(document, "section");
    inputCard.className = "dashboard-card input-card";
    inputCard.dataset.area = "input";
    inputCard.append(node(document, "h3", "給与条件を入力"));
    const form = node(document, "form");
    form.className = "form-grid";
    const member = node(document, "select");
    state.members.forEach((item) => {
      const option = node(document, "option", item.displayName);
      option.value = item.id;
      member.append(option);
    });
    member.value = selected?.memberId ?? state.members[0]?.id ?? "";
    const year = input(
      document,
      "number",
      String(
        selected?.targetYear ?? Number(options.getReferenceDate().slice(0, 4)),
      ),
    );
    year.min = "1";
    year.max = "9999";
    const base = input(
      document,
      "number",
      String(selected?.baseMonthlyYen ?? 0),
    );
    base.min = "0";
    base.step = "1";
    const overtime = input(
      document,
      "number",
      String((selected?.averageMonthlyOvertimeMinutes ?? 0) / 60),
    );
    overtime.min = "0";
    overtime.step = "0.016666666666666666";
    const allowance = input(
      document,
      "number",
      String(selected?.taxableAllowanceMonthlyYen ?? 0),
    );
    allowance.min = "0";
    allowance.step = "1";
    form.append(
      field(document, "人物", member),
      field(document, "対象年", year),
      field(document, "基本給（月額）", base),
      field(document, "月平均残業時間", overtime),
      field(document, "固定手当（月額・課税）", allowance),
    );

    const advanced = node(document, "details");
    advanced.append(node(document, "summary", "詳細設定"));
    const advancedGrid = node(document, "div");
    advancedGrid.className = "form-grid";
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
    const commuting = input(
      document,
      "number",
      String(selected?.monthlyNonTaxableCommutingYen ?? 0),
    );
    commuting.min = "0";
    commuting.step = "1";
    advancedGrid.append(
      field(document, "月平均所定労働時間", scheduled),
      field(document, "時間外倍率", rate),
      field(document, "非課税通勤手当（月額）", commuting),
    );
    advanced.append(advancedGrid);
    form.append(advanced);

    const bonusDetails = node(document, "details");
    bonusDetails.append(node(document, "summary", "賞与（任意）"));
    const bonusGrid = node(document, "div");
    bonusGrid.className = "payroll-bonus-list";
    type BonusReader = {
      id: string;
      persisted: boolean;
      row: HTMLDivElement;
      date: HTMLInputElement;
      gross: HTMLInputElement;
      socialEligible: HTMLInputElement;
      employmentEligible: HTMLInputElement;
    };
    const bonusReaders: BonusReader[] = [];
    const appendBonusRow = (
      bonus: PayrollPlan["bonuses"][number],
      persisted: boolean,
    ) => {
      const row = node(document, "div");
      row.className = "form-grid payroll-bonus-row";
      const bonusDate = input(document, "date", bonus.paymentDate);
      const bonusGross = input(document, "number", String(bonus.grossYen));
      bonusGross.min = "0";
      bonusGross.step = "1";
      const socialEligible = input(document, "checkbox", "");
      socialEligible.checked = bonus.socialInsuranceEligible;
      const employmentEligible = input(document, "checkbox", "");
      employmentEligible.checked = bonus.employmentInsuranceEligible;
      row.append(
        field(document, "支給日", bonusDate),
        field(document, "賞与総額", bonusGross),
        field(document, "社会保険対象", socialEligible),
        field(document, "雇用保険対象", employmentEligible),
      );
      const reader: BonusReader = {
        id: bonus.id,
        persisted,
        row,
        date: bonusDate,
        gross: bonusGross,
        socialEligible,
        employmentEligible,
      };
      const remove = node(document, "button", "この賞与を削除");
      remove.type = "button";
      remove.addEventListener("click", () => {
        const index = bonusReaders.indexOf(reader);
        if (index >= 0) bonusReaders.splice(index, 1);
        row.remove();
      });
      row.append(remove);
      bonusReaders.push(reader);
      bonusGrid.append(row);
    };
    const displayedBonuses =
      selected && selected.bonuses.length > 0
        ? selected.bonuses
        : [
            {
              id: "",
              paymentDate: `${year.value}-06-30`,
              grossYen: 0,
              socialInsuranceEligible: true,
              employmentInsuranceEligible: true,
            },
          ];
    for (const bonus of displayedBonuses) {
      appendBonusRow(
        bonus,
        selected?.bonuses.some((item) => item.id === bonus.id) ?? false,
      );
    }
    const addBonus = node(document, "button", "+ 賞与を追加");
    addBonus.type = "button";
    addBonus.addEventListener("click", () => {
      appendBonusRow(
        {
          id: options.createId(),
          paymentDate: `${year.value.padStart(4, "0")}-06-30`,
          grossYen: 0,
          socialInsuranceEligible: true,
          employmentInsuranceEligible: true,
        },
        false,
      );
    });
    bonusDetails.append(bonusGrid, addBonus);
    form.append(bonusDetails);
    const active = input(document, "checkbox", "");
    active.checked = selected?.active ?? true;
    form.append(field(document, "この給与計画を有効にする", active));
    const submit = node(
      document,
      "button",
      selected ? "給与計画を更新" : "給与計画を保存",
    );
    submit.type = "submit";
    form.append(submit);
    const status = node(document, "p");
    status.className = "operation-status";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        const targetYear = nonNegativeInteger(year.value, "対象年");
        const bonuses = bonusReaders.flatMap((reader) => {
          const grossYen = nonNegativeInteger(reader.gross.value, "賞与総額");
          if (!reader.persisted && grossYen === 0) return [];
          return [
            {
              id: reader.id || options.createId(),
              paymentDate: reader.date.value,
              grossYen,
              socialInsuranceEligible: reader.socialEligible.checked,
              employmentInsuranceEligible: reader.employmentEligible.checked,
            },
          ];
        });
        const plan: PayrollPlan = {
          id: selected?.id ?? options.createId(),
          memberId: member.value,
          targetYear,
          active: active.checked,
          baseMonthlyYen: nonNegativeInteger(base.value, "基本給"),
          taxableAllowanceMonthlyYen: nonNegativeInteger(
            allowance.value,
            "固定手当",
          ),
          averageMonthlyOvertimeMinutes: hoursToMinutes(
            overtime.value,
            "月平均残業時間",
          ),
          scheduledMonthlyMinutes: hoursToMinutes(
            scheduled.value,
            "月平均所定労働時間",
          ),
          overtimeRateBasisPoints: Math.round(Number(rate.value) * 10_000),
          monthlyNonTaxableCommutingYen: nonNegativeInteger(
            commuting.value,
            "非課税通勤手当",
          ),
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

    const resultCard = node(document, "section");
    resultCard.className = "dashboard-card result-card";
    resultCard.dataset.area = "result";
    resultCard.append(node(document, "h3", "給与計算結果"));
    if (!selected) {
      resultCard.append(
        node(document, "p", "給与条件を保存すると結果を表示します。"),
      );
    } else {
      try {
        const result = calculatePayroll(selected);
        const grid = node(document, "div");
        grid.className = "kpi-grid";
        [
          ["月間残業代", result.overtimeMonthlyYen],
          ["月間課税支給", result.monthlyTaxableSalaryYen],
          ["月間総支給", result.monthlyGrossYen],
          ["年間課税支給", result.annualTaxableSalaryYen],
          ["年間非課税通勤", result.annualNonTaxableCommutingYen],
          ["年間総支給", result.annualGrossYen],
        ].forEach(([label, value]) => {
          const card = node(document, "article");
          card.className = "summary-card";
          card.append(
            node(document, "span", String(label)),
            node(document, "strong", yen(Number(value))),
          );
          grid.append(card);
        });
        resultCard.append(grid);
      } catch (error) {
        const alert = node(
          document,
          "p",
          error instanceof Error ? error.message : "計算できません。",
        );
        alert.setAttribute("role", "alert");
        resultCard.append(alert);
      }
    }
    const disclosure = node(document, "details");
    disclosure.className = "calculation-disclosure";
    disclosure.append(node(document, "summary", "給与計算の前提"));
    const list = node(document, "ul");
    [
      "平均残業時間を12か月すべてに繰り返す概算です。",
      "残業単価の基礎は基本給のみで、固定課税手当を含めません。",
      "160時間と1.25倍は編集可能な便宜上の初期値で、法的な保証ではありません。",
      "深夜・法定休日・月60時間超の割増区分は自動計算しません。",
      "実際の勤務先の給与計算規程と異なる場合があります。",
    ].forEach((text) => list.append(node(document, "li", text)));
    disclosure.append(list);
    resultCard.append(disclosure);
    layout.append(inputCard, resultCard);
    container.append(layout);
  };
}
