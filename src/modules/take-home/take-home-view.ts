import type { Store } from "../../app/store";
import { calculateTakeHome } from "../../domain/take-home-calculator";
import {
  createCalculatedTakeHomePlan,
  type CalculatedTakeHomePlan,
  type TakeHomeResult,
} from "../../domain/take-home-plan";
import { prefectures } from "../../rules/jp/take-home/social-insurance/rules-2026";

interface Options {
  browserWindow: Window;
  document: Document;
  store: Store;
  createId: () => string;
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

function yen(value: number | null): string {
  return value === null ? "未計算" : `${value.toLocaleString("ja-JP")}円`;
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

function resultTable(document: Document, result: TakeHomeResult): HTMLElement {
  const section = node(document, "section");
  section.className = `take-home-result status-${result.status}`;
  section.append(node(document, "h4", `概算結果: ${result.status}`));
  const dl = node(document, "dl");
  const rows: [string, number | null][] = [
    ["年間総支給", result.annualGrossYen],
    ["給与所得", result.salaryIncomeYen],
    ["課税所得", result.taxableIncomeYen],
    ["所得税", result.nationalIncomeTaxYen],
    ["復興特別所得税", result.reconstructionIncomeTaxYen],
    ["住民税", result.residentTaxYen],
    ["健康保険", result.healthInsuranceYen],
    ["介護保険", result.careInsuranceYen],
    ["子ども・子育て支援金", result.additionalInsuranceYen],
    ["厚生年金", result.pensionYen],
    ["雇用保険", result.employmentInsuranceYen],
    ["年間手取り", result.annualTakeHomeYen],
    ["平均月間手取り", result.averageMonthlyTakeHomeYen],
    ["iDeCo所得税軽減額", result.incomeTaxBenefitFromIdecoYen],
  ];
  for (const [label, value] of rows)
    dl.append(node(document, "dt", label), node(document, "dd", yen(value)));
  section.append(dl);
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
    section.append(evidence);
  }
  if (result.warnings.length > 0) {
    const alert = node(document, "ul");
    alert.setAttribute("role", "alert");
    for (const warning of result.warnings)
      alert.append(node(document, "li", warning));
    section.append(alert);
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
    section.append(details);
  }
  return section;
}

export function createTakeHomeRenderer(
  options: Options,
): (main: HTMLElement) => void {
  const { document, store } = options;
  let lastError: string | null = null;
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
    const intro = node(
      document,
      "p",
      "2026年の日本の給与所得者向けベータです。税・社会保険の結果は公式資料を固定ルール化した概算で、住民税は手入力です。",
    );
    main.append(intro);
    for (const member of state.members.filter((item) => item.active)) {
      const card = node(document, "section");
      card.className = "entity-card take-home-card";
      card.append(node(document, "h3", member.displayName));
      const profile = node(document, "div");
      profile.className = "form-grid";
      const birth = node(document, "label", "生年月日");
      const birthInput = node(document, "input");
      birthInput.type = "date";
      birthInput.value = member.birthDate ?? "";
      birthInput.addEventListener("change", () =>
        dispatch({
          type: "update-member-profile",
          memberId: member.id,
          birthDate: birthInput.value || undefined,
          residencePrefecture: member.residencePrefecture,
        }),
      );
      birth.append(birthInput);
      const residence = node(document, "label", "居住都道府県（表示用）");
      const residenceSelect = node(document, "select");
      residenceSelect.append(new Option("選択してください", ""));
      for (const [code, name] of prefectures)
        residenceSelect.append(new Option(name, code));
      residenceSelect.value = member.residencePrefecture ?? "";
      residenceSelect.addEventListener("change", () =>
        dispatch({
          type: "update-member-profile",
          memberId: member.id,
          birthDate: member.birthDate,
          residencePrefecture: residenceSelect.value || undefined,
        }),
      );
      residence.append(residenceSelect);
      profile.append(birth, residence);
      card.append(profile);
      const plans = state.takeHomePlans.filter(
        (plan) => plan.memberId === member.id,
      );
      if (plans.length === 0) {
        const create = node(document, "button", "2026年計算プランを作成");
        create.type = "button";
        create.addEventListener("click", () =>
          dispatch({
            type: "add-take-home-plan",
            plan: createCalculatedTakeHomePlan({
              id: options.createId(),
              memberId: member.id,
            }),
          }),
        );
        card.append(create);
      }
      for (const plan of plans) {
        if (plan.mode === "legacy-manual") {
          const legacy = node(
            document,
            "p",
            `移行済み手入力値: ${yen(plan.manualAverageMonthlyTakeHomeYen)}`,
          );
          card.append(
            legacy,
            resultTable(document, calculateTakeHome(plan, member)),
          );
          continue;
        }
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
        card.append(planActions);
        const form = node(document, "div");
        form.className = "form-grid take-home-form";
        form.append(
          numberInput(document, "対象年", plan.targetYear, (value) =>
            update(plan, (draft) => {
              draft.targetYear = value;
              draft.residentTax.assessmentYear = value + 1;
            }),
          ),
        );
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
        form.append(
          employmentCategory,
          numberInput(
            document,
            "雇用保険対象賃金年額override",
            plan.compensation.employmentInsuranceWageOverrideYen ?? 0,
            (value) =>
              update(plan, (draft) => {
                draft.compensation.employmentInsuranceWageOverrideYen =
                  value === 0 ? null : value;
              }),
          ),
        );
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
            ["その他法定控除年額", "annualOtherStatutoryDeductionYen"],
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
        form.append(
          numberInput(
            document,
            "年間iDeCo掛金",
            plan.deductions.annualIdecoContributionYen,
            (value) =>
              update(plan, (draft) => {
                draft.deductions.annualIdecoContributionYen = value;
              }),
          ),
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
        card.append(form);
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
        const result = calculateTakeHome(plan, member);
        card.append(bonuses, resultTable(document, result));
        const target = state.incomeTargets.find(
          (item) => item.memberId === member.id,
        );
        const activeLink = target
          ? state.links.find(
              (link) => link.targetId === target.id && link.active,
            )
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
            }),
          );
          card.append(link);
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
            }),
          );
          card.append(unlink);
        }
      }
      main.append(card);
    }
  };
}
