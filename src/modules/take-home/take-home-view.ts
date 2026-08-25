import type { Store } from "../../app/store";
import {
  createTakeHomePreviewPersistenceAction,
  resolveCurrentTakeHomeContext,
} from "../../domain/take-home-current-context";
import { calculateTakeHomeFromState } from "../../domain/take-home-linked-calculator";
import {
  type CalculatedTakeHomePlan,
  type TakeHomeResult,
} from "../../domain/take-home-plan";
import { calculatePayroll, type PayrollPlan } from "../../domain/payroll";
import { isTakeHomeSupportedYear } from "../../domain/take-home-support";
import {
  prefectures,
  type PrefectureCode,
} from "../../rules/jp/take-home/social-insurance/rules-2026";

interface Options {
  browserWindow: Window;
  document: Document;
  store: Store;
  createId: () => string;
  requestRender: () => void;
  getReferenceDate: () => string;
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

function yen(value: number | null): string {
  return value === null ? "未計算" : `${value.toLocaleString("ja-JP")}円`;
}

function percent(value: number | null): string {
  return value === null ? "未計算" : `${value.toLocaleString("ja-JP")}%`;
}

function numberInput(
  document: Document,
  labelText: string,
  value: number,
  onChange: (value: number) => void,
): HTMLLabelElement {
  const label = node(document, "label", labelText);
  const input = node(document, "input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = String(value);
  input.addEventListener("change", () => onChange(Number(input.value)));
  label.append(input);
  return label;
}

function nullableNumberInput(
  document: Document,
  labelText: string,
  value: number | null,
  onChange: (value: number | null) => void,
): HTMLLabelElement {
  const label = node(document, "label", labelText);
  const input = node(document, "input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = value === null ? "" : String(value);
  input.addEventListener("change", () =>
    onChange(input.value === "" ? null : Number(input.value)),
  );
  label.append(input);
  return label;
}

function checkInput(
  document: Document,
  labelText: string,
  checked: boolean,
  onChange: (value: boolean) => void,
): HTMLLabelElement {
  const label = node(document, "label");
  const input = node(document, "input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  label.append(input, document.createTextNode(labelText));
  return label;
}

function currentYear(referenceDate: string): number | null {
  const year = Number(referenceDate.slice(0, 4));
  return Number.isSafeInteger(year) && year >= 1 ? year : null;
}

function taxAndInsuranceTotal(result: TakeHomeResult): number | null {
  return result.statutoryDeductionsYen;
}

function payrollSourceSummary(
  document: Document,
  payrollPlan: Readonly<PayrollPlan>,
): HTMLElement {
  const payroll = calculatePayroll(payrollPlan);
  const summary = node(document, "dl");
  summary.className = "take-home-payroll-summary";
  for (const [label, value] of [
    ["月収（給与計算から）", payroll.monthlyGrossYen],
    ["年間総支給（賞与込）", payroll.annualGrossYen],
    ["通勤手当（月）", payroll.monthlyNonTaxableCommutingYen],
  ] as const)
    summary.append(
      node(document, "dt", label),
      node(document, "dd", yen(value)),
    );
  return summary;
}

function resultTable(document: Document, result: TakeHomeResult): HTMLElement {
  const section = node(document, "section");
  section.className = `take-home-result status-${result.status}`;
  section.dataset.area = "result";
  section.append(node(document, "h4", `概算結果: ${result.status}`));
  const primary = node(document, "div");
  primary.className = "take-home-primary-results";
  for (const [label, value, testid] of [
    [
      "平均月間手取り（概算）",
      result.averageMonthlyTakeHomeYen,
      "average-monthly",
    ],
    ["年間手取り（概算）", result.annualTakeHomeYen, "annual"],
    ["税・社会保険合計", taxAndInsuranceTotal(result), "tax-insurance-total"],
  ] as const) {
    const item = node(document, "div");
    item.className = "take-home-primary-result";
    item.dataset.testid = `take-home-result-${testid}`;
    item.append(
      node(document, "span", label),
      node(document, "strong", yen(value)),
    );
    primary.append(item);
  }
  section.append(primary);
  section.append(
    node(
      document,
      "p",
      "平均月間手取りは年間手取りを12分割した平均です。賞与や年額の税・社会保険を均等化した値で、実際の各月の振込額ではありません。",
    ),
  );
  section.append(
    node(
      document,
      "p",
      "配偶者・扶養控除はモデル化していません。該当する場合は実際の税額と異なります。",
    ),
  );
  const breakdown = node(document, "details");
  breakdown.className = "take-home-result-details";
  breakdown.append(node(document, "summary", "税・社会保険の内訳と計算根拠"));
  const dl = node(document, "dl");
  const rows: [string, number | null, "yen" | "percent"][] = [
    ["年間総支給", result.annualGrossYen, "yen"],
    ["給与所得", result.salaryIncomeYen, "yen"],
    ["課税所得", result.taxableIncomeYen, "yen"],
    ["所得税", result.nationalIncomeTaxYen, "yen"],
    ["復興特別所得税", result.reconstructionIncomeTaxYen, "yen"],
    ["住民税", result.residentTaxYen, "yen"],
    ["健康保険", result.healthInsuranceYen, "yen"],
    ["介護保険", result.careInsuranceYen, "yen"],
    ["子ども・子育て支援金", result.additionalInsuranceYen, "yen"],
    ["厚生年金", result.pensionYen, "yen"],
    ["雇用保険", result.employmentInsuranceYen, "yen"],
    ["その他法定控除", result.otherStatutoryDeductionYen, "yen"],
    ["法定控除合計", result.statutoryDeductionsYen, "yen"],
    ["控除率", result.deductionRatePercent, "percent"],
    ["年間手取り", result.annualTakeHomeYen, "yen"],
    ["平均月間手取り", result.averageMonthlyTakeHomeYen, "yen"],
    ["iDeCoによる所得税等差額", result.incomeTaxBenefitFromIdecoYen, "yen"],
    ["iDeCo控除なし課税所得", result.taxableIncomeBeforeIdecoYen, "yen"],
    ["iDeCo控除あり課税所得", result.taxableIncomeAfterIdecoYen, "yen"],
    ["iDeCo控除なし基準所得税", result.nationalIncomeTaxBeforeIdecoYen, "yen"],
    ["iDeCo控除あり基準所得税", result.nationalIncomeTaxAfterIdecoYen, "yen"],
    [
      "iDeCo控除なし復興特別所得税",
      result.reconstructionIncomeTaxBeforeIdecoYen,
      "yen",
    ],
    [
      "iDeCo控除あり復興特別所得税",
      result.reconstructionIncomeTaxAfterIdecoYen,
      "yen",
    ],
    [
      "iDeCo控除なし所得税等（100円未満切捨て前）",
      result.incomeTaxBeforeIdecoPreRoundedYen,
      "yen",
    ],
    [
      "iDeCo控除あり所得税等（100円未満切捨て前）",
      result.incomeTaxAfterIdecoPreRoundedYen,
      "yen",
    ],
    ["iDeCo控除なし所得税等総額", result.incomeTaxBeforeIdecoYen, "yen"],
    ["iDeCo控除あり所得税等総額", result.incomeTaxAfterIdecoYen, "yen"],
  ];
  for (const [label, value, format] of rows)
    dl.append(
      node(document, "dt", label),
      node(document, "dd", format === "percent" ? percent(value) : yen(value)),
    );
  breakdown.append(dl);
  const basis = result.socialInsuranceBasis;
  if (basis.employerPrefecture !== null) {
    const prefectureName = prefectures.find(
      ([code]) => code === basis.employerPrefecture,
    )?.[1];
    const evidence = node(document, "section");
    evidence.className = "calculation-evidence";
    evidence.append(node(document, "h5", "社会保険の計算根拠"));
    evidence.append(
      node(
        document,
        "p",
        `事業所都道府県: ${prefectureName ?? basis.employerPrefecture} (${basis.employerPrefecture})`,
      ),
      node(
        document,
        "p",
        `健康保険標準報酬月額: ${yen(basis.healthStandardMonthlyRemunerationYen)}`,
      ),
      node(
        document,
        "p",
        `厚生年金標準報酬月額: ${yen(basis.pensionStandardMonthlyRemunerationYen)}`,
      ),
    );
    for (const bonus of basis.bonuses) {
      evidence.append(
        node(
          document,
          "p",
          `標準賞与額 ${bonus.paymentDate}: 健康保険 ${yen(bonus.healthStandardBonusYen)}／厚生年金 ${yen(bonus.pensionStandardBonusYen)}`,
        ),
      );
    }
    breakdown.append(evidence);
  }
  if (result.warnings.length > 0) {
    const alert = node(document, "ul");
    alert.setAttribute("role", "alert");
    for (const warning of result.warnings)
      alert.append(node(document, "li", warning));
    section.append(alert);
  }
  if (result.unsupportedConditions.length > 0) {
    const unsupported = node(document, "section");
    unsupported.className = "unsupported-conditions";
    unsupported.append(node(document, "h5", "未対応条件"));
    const list = node(document, "ul");
    for (const condition of result.unsupportedConditions) {
      list.append(node(document, "li", condition));
    }
    unsupported.append(list);
    section.append(unsupported);
  }
  if (result.appliedRules.length > 0) {
    const details = node(document, "details");
    details.append(node(document, "summary", "適用ルールと公式根拠"));
    for (const rule of result.appliedRules) {
      const paragraph = node(
        document,
        "p",
        `${rule.sourceTitle} [${rule.id}] (${rule.effectiveFrom}〜${rule.effectiveTo}; ${rule.effectiveBasis}; 確認日 ${rule.verifiedAt}; ${rule.sourcePublisher}) `,
      );
      for (const url of rule.sourceUrls) {
        const link = node(document, "a", "公式資料");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        paragraph.append(link, document.createTextNode(" "));
      }
      details.append(paragraph);
    }
    breakdown.append(details);
  }
  section.append(breakdown);
  if (result.assumptions.length > 0) {
    const assumptions = node(document, "aside");
    assumptions.className = "take-home-assumptions";
    assumptions.append(node(document, "h5", "この概算の前提"));
    const list = node(document, "ul");
    for (const assumption of result.assumptions)
      list.append(node(document, "li", assumption));
    assumptions.append(list);
    section.append(assumptions);
  }
  return section;
}

export function createTakeHomeRenderer(
  options: Options,
): (main: HTMLElement) => void {
  const { document, store } = options;
  let lastError: string | null = null;
  let transientEmployerPrefecture: PrefectureCode | null = null;
  let transientPrefectureContextKey: string | null = null;
  const dispatch = (action: Parameters<Store["dispatch"]>[0]): void => {
    try {
      store.dispatch(action);
      lastError = null;
      options.requestRender();
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "保存できませんでした";
      options.requestRender();
    }
  };

  function update(
    plan: CalculatedTakeHomePlan,
    mutate: (draft: CalculatedTakeHomePlan) => void,
  ): void {
    const draft = structuredClone(plan);
    mutate(draft);
    dispatch({ type: "update-take-home-plan", planId: plan.id, plan: draft });
  }

  return (main: HTMLElement): void => {
    const state = store.getState();
    if (lastError) {
      const error = node(document, "p", `保存できませんでした: ${lastError}`);
      error.setAttribute("role", "alert");
      error.className = "form-error";
      main.append(error);
    }
    const referenceDate = options.getReferenceDate();
    const year = currentYear(referenceDate);
    const intro = node(
      document,
      "p",
      year === null
        ? "手取りは給与計算を正本にした概算です。基準日から対象年を判定できないため、保存や自動連携は行いません。"
        : `${String(year)}年の手取りを、給与計算の正式給与から概算します。表示・再表示だけでは保存データを変更しません。`,
    );
    intro.className = "take-home-intro";
    main.append(intro);
    const member = state.members.find(
      (item) => item.active && item.role === "self",
    );
    if (!member) {
      main.append(
        node(
          document,
          "p",
          "本人プロフィールが見つかりません。設定で本人を有効にしてください。",
        ),
      );
      return;
    }
    const layout = node(document, "div");
    layout.className = "work-tab-layout take-home-layout";
    const card = node(document, "section");
    card.className = "dashboard-card input-card take-home-card";
    const output = node(document, "section");
    output.className = "dashboard-card output-card take-home-output";
    output.dataset.area = "result";
    card.append(node(document, "h3", "計算条件"));
    output.append(node(document, "h3", "概算結果"));
    const heading = node(document, "div");
    heading.className = "take-home-heading";
    heading.append(
      node(document, "p", member.displayName),
      node(
        document,
        "span",
        year === null ? "対象年未確定" : `本人 / ${String(year)}年（自動）`,
      ),
    );
    card.append(heading);
    const profile = node(document, "div");
    profile.className = "take-home-profile-summary";
    profile.dataset.area = "input";
    const age = member.birthDate
      ? (() => {
          if (year === null) return "年齢は基準日待ち";
          const birthYear = Number(member.birthDate.slice(0, 4));
          const birthMonth = Number(member.birthDate.slice(5, 7));
          const birthDay = Number(member.birthDate.slice(8, 10));
          const refYear = Number(referenceDate.slice(0, 4));
          const refMonth = Number(referenceDate.slice(5, 7));
          const refDay = Number(referenceDate.slice(8, 10));
          return `${String(refYear - birthYear - (refMonth * 100 + refDay < birthMonth * 100 + birthDay ? 1 : 0))}歳`;
        })()
      : "生年月日未登録";
    profile.append(
      node(document, "span", `プロフィール: ${age}`),
      node(
        document,
        "span",
        member.residencePrefecture
          ? `居住地: ${member.residencePrefecture}`
          : "居住地未登録",
      ),
    );
    card.append(profile);
    if (!member.birthDate) {
      const correction = node(
        document,
        "label",
        "生年月日を登録（計算に必要）",
      );
      correction.className = "take-home-identity-correction";
      const correctionInput = node(document, "input");
      correctionInput.type = "date";
      correctionInput.addEventListener("change", () =>
        dispatch({
          type: "update-member-profile",
          memberId: member.id,
          birthDate: correctionInput.value || undefined,
          residencePrefecture: member.residencePrefecture,
        }),
      );
      correction.append(correctionInput);
      card.append(correction);
    }
    const contextKey = `${member.id}:${year === null ? "unknown" : String(year)}`;
    if (transientPrefectureContextKey !== contextKey) {
      transientPrefectureContextKey = contextKey;
      transientEmployerPrefecture = null;
    }
    const context = resolveCurrentTakeHomeContext(state, referenceDate, {
      transientEmployerPrefecture,
    });
    const plans =
      context.status !== "transient-preview" && context.plan
        ? [context.plan]
        : [];
    const otherPlans = state.takeHomePlans.filter(
      (plan) =>
        plan.memberId === member.id &&
        !plans.some((item) => item.id === plan.id),
    );
    const calculatedContextPlan =
      context.plan?.mode === "calculated" ? context.plan : null;

    const provenance = node(document, "ul");
    provenance.className = "take-home-provenance";
    provenance.append(
      node(
        document,
        "li",
        context.provenance.salary === "payroll-statutory"
          ? "給与: 給与計算から取得"
          : context.provenance.salary === "persisted-direct"
            ? "給与: 既存の手取り計算入力"
            : "給与: 未解決",
      ),
      node(
        document,
        "li",
        context.provenance.employment === "assumed"
          ? "就業前提: 概算のため仮定"
          : context.provenance.employment === "persisted"
            ? "就業前提: 保存済み"
            : "就業前提: 対象外",
      ),
      node(
        document,
        "li",
        calculatedContextPlan?.socialInsurance.mode === "manual"
          ? "社会保険: 保存済み手入力"
          : calculatedContextPlan?.socialInsurance.mode ===
              "unsupported-uncomputed"
            ? "社会保険: 未計算"
            : "社会保険: 自動概算",
      ),
      node(
        document,
        "li",
        context.provenance.residentTax === "current-year-manual"
          ? `住民税: 手入力（${String(year)}年度）`
          : context.provenance.residentTax === "current-year-estimate" ||
              context.provenance.residentTax === "stale-manual-estimate"
            ? `住民税: ${String(year)}年支払額を自動概算`
            : "住民税: 未解決",
      ),
    );
    card.append(provenance);
    if (context.provenance.employerPrefecture === "member-residence-estimate") {
      const prefectureName = prefectures.find(
        ([code]) => code === member.residencePrefecture,
      )?.[1];
      const estimate = node(
        document,
        "p",
        `勤務先都道府県（健康保険用）: ${prefectureName ?? member.residencePrefecture ?? "未設定"}（居住地から仮設定・保存されません）`,
      );
      estimate.className = "take-home-prefecture-estimate";
      card.append(estimate);
    } else if (
      context.provenance.employerPrefecture === "transient-explicit" &&
      calculatedContextPlan?.socialInsurance.employerPrefecture
    ) {
      const prefectureName = prefectures.find(
        ([code]) =>
          code === calculatedContextPlan.socialInsurance.employerPrefecture,
      )?.[1];
      card.append(
        node(
          document,
          "p",
          `勤務先都道府県（健康保険用）: ${prefectureName ?? calculatedContextPlan.socialInsurance.employerPrefecture}（今回の入力・保存前）`,
        ),
      );
    } else if (
      context.provenance.employerPrefecture === "persisted" &&
      calculatedContextPlan?.socialInsurance.employerPrefecture
    ) {
      const prefectureName = prefectures.find(
        ([code]) =>
          code === calculatedContextPlan.socialInsurance.employerPrefecture,
      )?.[1];
      card.append(
        node(
          document,
          "p",
          `勤務先都道府県（健康保険用）: ${prefectureName ?? calculatedContextPlan.socialInsurance.employerPrefecture}（保存済み）`,
        ),
      );
    }
    if (
      (context.status === "transient-preview" || calculatedContextPlan) &&
      context.provenance.employerPrefecture === "none"
    ) {
      const prefectureCorrection = node(
        document,
        "label",
        "事業所都道府県（計算に必要）",
      );
      prefectureCorrection.className = "take-home-prefecture-correction";
      const prefectureSelect = node(document, "select");
      prefectureSelect.append(new Option("選択してください", ""));
      for (const [code, name] of prefectures)
        prefectureSelect.append(new Option(name, code));
      prefectureSelect.value =
        calculatedContextPlan?.socialInsurance.employerPrefecture ??
        transientEmployerPrefecture ??
        "";
      prefectureSelect.addEventListener("change", () => {
        const selected = prefectureSelect.value
          ? (prefectureSelect.value as PrefectureCode)
          : null;
        if (context.status === "transient-preview") {
          transientEmployerPrefecture = selected;
          options.requestRender();
          return;
        }
        if (calculatedContextPlan)
          update(calculatedContextPlan, (draft) => {
            draft.socialInsurance.employerPrefecture = selected;
          });
      });
      prefectureCorrection.append(prefectureSelect);
      card.append(prefectureCorrection);
    }
    if (context.status === "transient-preview") {
      const sourceSummary = node(document, "p");
      sourceSummary.className = "take-home-source-summary";
      const payroll = state.payrollPlans.find(
        (candidate) => candidate.id === context.payrollPlanId,
      );
      sourceSummary.textContent = `給与計算 ${String(context.currentYear)}年（正式給与）を一時的なプレビュー入力元として表示中。ガソリン差引後の実質月収は税・社会保険計算に使用しません。`;
      output.append(sourceSummary);
      if (payroll) output.append(payrollSourceSummary(document, payroll));
      output.append(resultTable(document, context.result));
      if (context.result.status === "complete") {
        const persist = node(document, "button", "この給与連携を保存");
        persist.type = "button";
        persist.className = "take-home-primary-action";
        persist.addEventListener("click", () => {
          const confirmed = options.browserWindow.confirm(
            `${String(context.currentYear)}年は1社勤務・通年在籍・給与所得のみで、雇用保険事業区分は「一般」です。この前提と給与連携を保存しますか？`,
          );
          if (!confirmed) return;
          dispatch(
            createTakeHomePreviewPersistenceAction({
              ...context,
              plan: { ...context.plan, id: options.createId() },
            }),
          );
        });
        card.append(
          node(
            document,
            "p",
            "保存するまで、このプレビューは計画・連携として保存されません。雇用条件などの前提は保存前に確認してください。",
          ),
          persist,
        );
      }
    } else if (context.status !== "persisted" && plans.length === 0) {
      const message = node(document, "p", context.message);
      message.setAttribute("role", "alert");
      output.append(message);
    }
    for (const plan of plans) {
      if (plan.mode === "legacy-manual") {
        const legacy = node(
          document,
          "p",
          `移行済み手入力値: ${yen(plan.manualAverageMonthlyTakeHomeYen)}`,
        );
        output.append(
          legacy,
          resultTable(
            document,
            calculateTakeHomeFromState(
              state,
              plan,
              member,
              options.getReferenceDate(),
            ),
          ),
        );
        const legacyDetails = node(document, "details");
        legacyDetails.className = "take-home-details";
        legacyDetails.append(
          node(document, "summary", "既存データ / 上級者"),
          node(
            document,
            "p",
            "移行済み手入力値を保持しています。閲覧だけで給与計算へ置換しません。",
          ),
        );
        const disableLegacy = node(
          document,
          "button",
          plan.active ? "手入力値を無効化" : "手入力値を有効化",
        );
        disableLegacy.type = "button";
        disableLegacy.addEventListener("click", () =>
          dispatch({
            type: "set-take-home-plan-active",
            planId: plan.id,
            active: !plan.active,
          }),
        );
        legacyDetails.append(disableLegacy);
        card.append(legacyDetails);
        continue;
      }
      if ("message" in context) {
        const message = node(document, "p", context.message);
        message.setAttribute("role", "alert");
        output.append(message);
      }
      const advanced = node(document, "details");
      advanced.className = "take-home-details";
      advanced.append(
        node(document, "summary", "詳細計算設定（保存済みの値・例外設定）"),
      );
      const planActions = node(document, "div");
      planActions.className = "button-row";
      const togglePlan = node(
        document,
        "button",
        plan.active ? "計算プランを無効化" : "計算プランを有効化",
      );
      togglePlan.type = "button";
      togglePlan.addEventListener("click", () =>
        dispatch({
          type: "set-take-home-plan-active",
          planId: plan.id,
          active: !plan.active,
        }),
      );
      const deletePlan = node(document, "button", "計算プランを削除");
      deletePlan.type = "button";
      deletePlan.addEventListener("click", () =>
        dispatch({ type: "delete-take-home-plan", planId: plan.id }),
      );
      planActions.append(togglePlan, deletePlan);
      advanced.append(planActions);
      const payrollBinding = node(document, "label", "給与情報の入力元");
      const payrollBindingSelect = node(document, "select");
      payrollBindingSelect.append(new Option("手取り画面で直接入力", ""));
      for (const payroll of state.payrollPlans.filter(
        (candidate) =>
          candidate.active &&
          candidate.memberId === plan.memberId &&
          candidate.targetYear === plan.targetYear &&
          isTakeHomeSupportedYear(plan.targetYear),
      ))
        payrollBindingSelect.append(
          new Option(`給与計算 ${String(payroll.targetYear)}年`, payroll.id),
        );
      const activePayrollBinding = state.takeHomeCompensationBindings.find(
        (binding) => binding.active && binding.takeHomePlanId === plan.id,
      );
      payrollBindingSelect.value = activePayrollBinding?.payrollPlanId ?? "";
      payrollBindingSelect.addEventListener("change", () =>
        dispatch({
          type: "set-take-home-compensation-binding",
          takeHomePlanId: plan.id,
          payrollPlanId: payrollBindingSelect.value || null,
        }),
      );
      payrollBinding.append(payrollBindingSelect);
      advanced.append(payrollBinding);
      const form = node(document, "div");
      form.className = "form-grid take-home-form";
      form.dataset.area = "input";
      const planBirth = node(document, "label", "計算プランの生年月日");
      const planBirthInput = node(document, "input");
      planBirthInput.type = "date";
      planBirthInput.value = plan.birthDate ?? "";
      planBirthInput.addEventListener("change", () =>
        update(plan, (draft) => {
          draft.birthDate = planBirthInput.value || null;
        }),
      );
      planBirth.append(planBirthInput);
      const planResidence = node(document, "label", "計算プランの居住都道府県");
      const planResidenceSelect = node(document, "select");
      planResidenceSelect.append(new Option("選択してください", ""));
      for (const [code, name] of prefectures)
        planResidenceSelect.append(new Option(name, code));
      planResidenceSelect.value = plan.residencePrefecture ?? "";
      planResidenceSelect.addEventListener("change", () =>
        update(plan, (draft) => {
          draft.residencePrefecture = planResidenceSelect.value
            ? (planResidenceSelect.value as typeof draft.residencePrefecture)
            : null;
        }),
      );
      planResidence.append(planResidenceSelect);
      form.append(planBirth, planResidence);
      const targetYear = node(
        document,
        "p",
        `対象年: ${String(plan.targetYear)}年（保存済み。基準日から自動変更しません）`,
      );
      targetYear.className = "take-home-readonly-context";
      form.append(targetYear);
      const annualMode = checkInput(
        document,
        "年収入力を使用",
        plan.inputMode === "annual",
        (checked) =>
          update(plan, (draft) => {
            draft.inputMode = checked ? "annual" : "monthly";
          }),
      );
      form.append(annualMode);
      if (plan.inputMode === "annual") {
        form.append(
          numberInput(
            document,
            "年間課税給与（賞与を含む）",
            plan.compensation.annualTaxableSalaryYen,
            (value) =>
              update(plan, (draft) => {
                draft.compensation.annualTaxableSalaryYen = value;
              }),
          ),
        );
        form.append(
          numberInput(
            document,
            "年間非課税通勤手当",
            plan.compensation.annualNonTaxableCommutingYen,
            (value) =>
              update(plan, (draft) => {
                draft.compensation.annualNonTaxableCommutingYen = value;
              }),
          ),
        );
      } else {
        form.append(
          numberInput(
            document,
            "月額課税給与",
            plan.compensation.monthlyTaxableSalaryYen,
            (value) =>
              update(plan, (draft) => {
                draft.compensation.monthlyTaxableSalaryYen = value;
              }),
          ),
        );
        form.append(
          numberInput(
            document,
            "月額非課税通勤手当",
            plan.compensation.monthlyNonTaxableCommutingYen,
            (value) =>
              update(plan, (draft) => {
                draft.compensation.monthlyNonTaxableCommutingYen = value;
              }),
          ),
        );
      }
      form.append(
        checkInput(
          document,
          "単一勤務先・通年在籍を確認",
          plan.employment.oneEmployerFullYearConfirmed,
          (value) =>
            update(plan, (draft) => {
              draft.employment.oneEmployerFullYearConfirmed = value;
            }),
        ),
        checkInput(
          document,
          "給与所得のみを確認",
          plan.employment.salaryIncomeOnlyConfirmed,
          (value) =>
            update(plan, (draft) => {
              draft.employment.salaryIncomeOnlyConfirmed = value;
            }),
        ),
      );
      const employmentCategory = node(document, "label", "雇用保険事業区分");
      const employmentCategorySelect = node(document, "select");
      employmentCategorySelect.append(
        new Option("一般", "general"),
        new Option("農林水産・清酒製造", "agriculture-forestry-fishery-sake"),
        new Option("建設", "construction"),
      );
      employmentCategorySelect.value =
        plan.employment.employmentInsuranceCategory;
      employmentCategorySelect.addEventListener("change", () =>
        update(plan, (draft) => {
          draft.employment.employmentInsuranceCategory =
            employmentCategorySelect.value as typeof draft.employment.employmentInsuranceCategory;
        }),
      );
      employmentCategory.append(employmentCategorySelect);
      form.append(employmentCategory);
      if (
        plan.inputMode === "annual" ||
        plan.compensation.annualOtherTaxableSalaryYen > 0
      ) {
        for (let month = 1; month <= 12; month += 1) {
          form.append(
            nullableNumberInput(
              document,
              `${String(month)}月の雇用保険対象賃金（賞与除く）`,
              plan.compensation.monthlyEmploymentInsuranceWagesYen?.[
                month - 1
              ] ?? null,
              (value) =>
                update(plan, (draft) => {
                  const wages =
                    draft.compensation.monthlyEmploymentInsuranceWagesYen ??
                    Array.from({ length: 12 }, () => null as number | null);
                  wages[month - 1] = value;
                  draft.compensation.monthlyEmploymentInsuranceWagesYen = wages;
                }),
            ),
          );
        }
      }
      const insuranceMode = node(document, "label", "社会保険計算方法");
      const insuranceModeSelect = node(document, "select");
      insuranceModeSelect.append(
        new Option("協会けんぽ自動計算", "kyokai-auto"),
        new Option("年額を手入力", "manual"),
        new Option("未計算", "unsupported-uncomputed"),
      );
      insuranceModeSelect.value = plan.socialInsurance.mode;
      insuranceModeSelect.addEventListener("change", () =>
        update(plan, (draft) => {
          draft.socialInsurance.mode =
            insuranceModeSelect.value as typeof draft.socialInsurance.mode;
          draft.socialInsurance.standardRemunerationMode =
            insuranceModeSelect.value === "manual"
              ? "manual-total"
              : insuranceModeSelect.value === "kyokai-auto"
                ? "estimate-from-remuneration"
                : "unsupported-uncomputed";
        }),
      );
      insuranceMode.append(insuranceModeSelect);
      form.append(insuranceMode);
      if (plan.socialInsurance.mode === "kyokai-auto") {
        const standardMode = node(document, "label", "標準報酬の入力方法");
        const standardModeSelect = node(document, "select");
        standardModeSelect.append(
          new Option("報酬月額から概算", "estimate-from-remuneration"),
          new Option("標準報酬月額を直接入力", "exact-standard-remuneration"),
        );
        standardModeSelect.value =
          plan.socialInsurance.standardRemunerationMode;
        standardModeSelect.addEventListener("change", () =>
          update(plan, (draft) => {
            draft.socialInsurance.standardRemunerationMode =
              standardModeSelect.value as typeof draft.socialInsurance.standardRemunerationMode;
          }),
        );
        standardMode.append(standardModeSelect);
        form.append(
          standardMode,
          numberInput(
            document,
            "前年4〜12月の健康保険標準賞与累計",
            plan.socialInsurance.healthBonusPriorFiscalYearCumulativeYen,
            (value) =>
              update(plan, (draft) => {
                draft.socialInsurance.healthBonusPriorFiscalYearCumulativeYen =
                  value;
              }),
          ),
        );
      }
      const prefecture = node(document, "label", "事業所都道府県");
      const select = node(document, "select");
      select.append(new Option("選択してください", ""));
      for (const [code, name] of prefectures)
        select.append(new Option(name, code));
      select.value = plan.socialInsurance.employerPrefecture ?? "";
      select.addEventListener("change", () =>
        update(plan, (draft) => {
          draft.socialInsurance.employerPrefecture = select.value
            ? (select.value as typeof draft.socialInsurance.employerPrefecture)
            : null;
        }),
      );
      prefecture.append(select);
      form.append(prefecture);
      form.append(
        numberInput(
          document,
          plan.socialInsurance.standardRemunerationMode ===
            "exact-standard-remuneration"
            ? "標準報酬月額"
            : "月額報酬（標準報酬推定用）",
          plan.socialInsurance.standardRemunerationMode ===
            "exact-standard-remuneration"
            ? (plan.socialInsurance.standardMonthlyRemunerationYen ?? 0)
            : (plan.socialInsurance.monthlyRemunerationYen ?? 0),
          (value) =>
            update(plan, (draft) => {
              if (
                draft.socialInsurance.standardRemunerationMode ===
                "exact-standard-remuneration"
              )
                draft.socialInsurance.standardMonthlyRemunerationYen = value;
              else draft.socialInsurance.monthlyRemunerationYen = value;
            }),
        ),
      );
      if (plan.socialInsurance.mode === "manual") {
        for (const [label, field] of [
          ["健康保険年額", "annualHealthInsuranceYen"],
          ["介護保険年額", "annualCareInsuranceYen"],
          ["子ども・子育て支援金年額", "annualAdditionalInsuranceYen"],
          ["厚生年金年額", "annualPensionYen"],
          ["雇用保険年額", "annualEmploymentInsuranceYen"],
        ] as const) {
          form.append(
            numberInput(
              document,
              label,
              plan.socialInsurance.manual[field] ?? 0,
              (value) =>
                update(plan, (draft) => {
                  draft.socialInsurance.manual[field] = value;
                }),
            ),
          );
        }
      }
      form.append(
        numberInput(
          document,
          "その他法定控除年額",
          plan.socialInsurance.manual.annualOtherStatutoryDeductionYen,
          (value) =>
            update(plan, (draft) => {
              draft.socialInsurance.manual.annualOtherStatutoryDeductionYen =
                value;
            }),
        ),
      );
      const residentMode = checkInput(
        document,
        "住民税年額を入力する",
        plan.residentTax.mode === "manual-annual",
        (value) =>
          update(plan, (draft) => {
            draft.residentTax.mode = value
              ? "manual-annual"
              : "unsupported-uncomputed";
          }),
      );
      form.append(residentMode);
      if (plan.residentTax.mode === "manual-annual") {
        form.append(
          numberInput(
            document,
            "住民税の年度",
            plan.residentTax.assessmentYear,
            (value) =>
              update(plan, (draft) => {
                draft.residentTax.assessmentYear = value;
              }),
          ),
        );
        form.append(
          numberInput(
            document,
            "住民税年額",
            plan.residentTax.annualResidentTaxYen ?? 0,
            (value) =>
              update(plan, (draft) => {
                draft.residentTax.annualResidentTaxYen = value;
              }),
          ),
        );
        form.append(
          checkInput(
            document,
            "住民税0円を確認",
            plan.residentTax.zeroYenConfirmed,
            (value) =>
              update(plan, (draft) => {
                draft.residentTax.zeroYenConfirmed = value;
              }),
          ),
        );
      }
      const idecoMode = node(document, "label", "iDeCo控除の入力方法");
      const idecoModeSelect = node(document, "select");
      idecoModeSelect.append(
        new Option("手入力", "manual"),
        new Option("iDeCo計画から連携", "linked"),
      );
      idecoModeSelect.value = plan.deductions.idecoContributionMode;
      idecoModeSelect.dataset.testid = "take-home-ideco-mode";
      idecoModeSelect.addEventListener("change", () =>
        update(plan, (draft) => {
          draft.deductions.idecoContributionMode =
            idecoModeSelect.value as typeof draft.deductions.idecoContributionMode;
          draft.deductions.linkedIdecoPlanId =
            idecoModeSelect.value === "linked"
              ? (state.idecoPlans.find(
                  (candidate) =>
                    candidate.memberId === plan.memberId && candidate.active,
                )?.id ?? null)
              : null;
        }),
      );
      idecoMode.append(idecoModeSelect);
      form.append(idecoMode);
      if (plan.deductions.idecoContributionMode === "manual") {
        form.append(
          numberInput(
            document,
            "年間iDeCo掛金（手入力）",
            plan.deductions.annualIdecoContributionYen,
            (value) =>
              update(plan, (draft) => {
                draft.deductions.annualIdecoContributionYen = value;
              }),
          ),
        );
      } else {
        const linkedPlan = node(document, "label", "連携するiDeCo計画");
        const linkedPlanSelect = node(document, "select");
        linkedPlanSelect.dataset.testid = "take-home-linked-ideco-plan";
        linkedPlanSelect.append(new Option("選択してください", ""));
        for (const candidate of state.idecoPlans.filter(
          (item) => item.memberId === plan.memberId && item.active,
        ))
          linkedPlanSelect.append(new Option(candidate.id, candidate.id));
        linkedPlanSelect.value = plan.deductions.linkedIdecoPlanId ?? "";
        linkedPlanSelect.addEventListener("change", () =>
          update(plan, (draft) => {
            draft.deductions.linkedIdecoPlanId = linkedPlanSelect.value || null;
          }),
        );
        linkedPlan.append(linkedPlanSelect);
        form.append(linkedPlan);
      }
      form.append(
        numberInput(
          document,
          "その他所得控除年額",
          plan.deductions.annualOtherIncomeDeductionsYen,
          (value) =>
            update(plan, (draft) => {
              draft.deductions.annualOtherIncomeDeductionsYen = value;
            }),
        ),
      );
      advanced.append(form);
      const bonuses = node(document, "section");
      bonuses.append(node(document, "h4", "賞与"));
      for (const bonus of plan.compensation.bonuses) {
        const row = node(document, "div");
        row.className = "inline-form";
        const dateLabel = node(document, "label", "賞与支給日");
        const dateInput = node(document, "input");
        dateInput.type = "date";
        dateInput.value = bonus.paymentDate;
        dateInput.addEventListener("change", () =>
          dispatch({
            type: "update-bonus",
            planId: plan.id,
            bonusId: bonus.id,
            bonus: { ...bonus, paymentDate: dateInput.value },
          }),
        );
        dateLabel.append(dateInput);
        row.append(
          dateLabel,
          numberInput(document, "賞与額", bonus.grossYen, (value) =>
            dispatch({
              type: "update-bonus",
              planId: plan.id,
              bonusId: bonus.id,
              bonus: { ...bonus, grossYen: value },
            }),
          ),
        );
        const remove = node(document, "button", "削除");
        remove.type = "button";
        remove.addEventListener("click", () =>
          dispatch({
            type: "delete-bonus",
            planId: plan.id,
            bonusId: bonus.id,
          }),
        );
        row.append(remove);
        bonuses.append(row);
      }
      const addBonus = node(document, "button", "賞与を追加");
      addBonus.type = "button";
      addBonus.addEventListener("click", () =>
        dispatch({
          type: "add-bonus",
          planId: plan.id,
          bonus: {
            id: options.createId(),
            paymentDate: "2026-06-30",
            grossYen: 0,
            socialInsuranceEligible: true,
            employmentInsuranceEligible: true,
          },
        }),
      );
      bonuses.append(addBonus);
      advanced.append(bonuses);
      const result =
        context.plan?.id === plan.id && context.result
          ? context.result
          : calculateTakeHomeFromState(state, plan, member, referenceDate);
      const sourceSummary = node(document, "p");
      sourceSummary.className = "take-home-source-summary";
      const sourcePayroll = activePayrollBinding
        ? state.payrollPlans.find(
            (candidate) => candidate.id === activePayrollBinding.payrollPlanId,
          )
        : undefined;
      const sourceIsValid =
        sourcePayroll?.active === true &&
        sourcePayroll.memberId === plan.memberId &&
        sourcePayroll.targetYear === plan.targetYear;
      sourceSummary.textContent = sourceIsValid
        ? `給与計算 ${String(sourcePayroll.targetYear)}年（保存済み連携）を入力元として使用しています。税計算は正式給与のみを参照し、実質月収は使用しません。`
        : activePayrollBinding
          ? "保存済みの給与連携元を解決できません。既存の連携状態を変更せず、詳細で確認してください。"
          : "手取り画面で直接入力（保存済み）を入力元として使用しています。表示だけでは給与連携へ変更しません。";
      output.append(sourceSummary);
      if (sourceIsValid)
        output.append(payrollSourceSummary(document, sourcePayroll));
      output.append(resultTable(document, result));
      card.append(advanced);
      const target = state.incomeTargets.find(
        (item) => item.memberId === member.id,
      );
      const activeLink = target
        ? state.links.find((link) => link.targetId === target.id && link.active)
        : undefined;
      if (
        target &&
        plan.active &&
        result.status === "complete" &&
        result.averageMonthlyTakeHomeYen !== null &&
        !activeLink
      ) {
        const link = node(document, "button", "家計の月間手取りへ連携");
        link.type = "button";
        link.addEventListener("click", () =>
          dispatch({
            type: "link-budget-income-to-take-home-plan",
            link: {
              id: options.createId(),
              targetId: target.id,
              sourceType: "take-home-result",
              sourceId: plan.id,
              field: "averageMonthlyTakeHomeYen",
              active: true,
            },
            referenceDate: options.getReferenceDate(),
          }),
        );
        advanced.append(link);
      } else if (
        target &&
        activeLink?.sourceId === plan.id &&
        result.averageMonthlyTakeHomeYen !== null
      ) {
        const unlink = node(document, "button", "家計連携を解除");
        unlink.type = "button";
        unlink.addEventListener("click", () =>
          dispatch({
            type: "unlink-income",
            targetId: target.id,
            manualYen: result.averageMonthlyTakeHomeYen ?? 0,
            referenceDate: options.getReferenceDate(),
          }),
        );
        advanced.append(unlink);
      }
    }
    if (otherPlans.length > 0) {
      const existing = node(document, "details");
      existing.className = "take-home-details take-home-existing-data";
      existing.append(node(document, "summary", "既存データ / 上級者"));
      const list = node(document, "ul");
      for (const plan of otherPlans) {
        const item = node(
          document,
          "li",
          `${plan.mode === "legacy-manual" ? "移行済み手入力" : "計算プラン"} / 対象年 ${plan.targetYear === null ? "未設定" : String(plan.targetYear)} / ${plan.active ? "有効" : "無効"}（保持中） `,
        );
        const toggle = node(
          document,
          "button",
          plan.active ? "無効化" : "有効化",
        );
        toggle.type = "button";
        toggle.addEventListener("click", () =>
          dispatch({
            type: "set-take-home-plan-active",
            planId: plan.id,
            active: !plan.active,
          }),
        );
        const remove = node(document, "button", "削除");
        remove.type = "button";
        remove.addEventListener("click", () =>
          dispatch({ type: "delete-take-home-plan", planId: plan.id }),
        );
        item.append(toggle, remove);
        list.append(item);
      }
      existing.append(
        list,
        node(
          document,
          "p",
          "現在年の通常結果には混在させません。保存済みデータは削除・変更していません。",
        ),
      );
      card.append(existing);
    }
    layout.append(card, output);
    main.append(layout);
  };
}
