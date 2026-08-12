import type { Store } from "../../app/store";
import {
  calculateIdecoPlan,
  createIdecoPlan,
  type IdecoPlan,
  type IdecoProjectionResult,
} from "../../domain/ideco";
import type { InvestmentScenario, ScenarioKind } from "../../domain/nisa";
import { calculateTakeHomeFromState } from "../../domain/take-home-linked-calculator";

interface Options {
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

function lastCompletedPaymentMonth(referenceDate: string): string {
  const date = new Date(`${referenceDate}T00:00:00Z`);
  if (Number(referenceDate.slice(8, 10)) < 26)
    date.setUTCMonth(date.getUTCMonth() - 1);
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function nullableNumber(
  document: Document,
  labelText: string,
  value: number | null,
  onChange: (value: number | null) => void,
  testId?: string,
): HTMLLabelElement {
  const label = node(document, "label", labelText);
  const input = node(document, "input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = value === null ? "" : String(value);
  input.placeholder = "空欄と0円を区別します";
  if (testId) input.dataset.testid = testId;
  input.addEventListener("change", () =>
    onChange(input.value === "" ? null : Number(input.value)),
  );
  label.append(input);
  return label;
}

function nullableBoolean(
  document: Document,
  labelText: string,
  value: boolean | null,
  onChange: (value: boolean | null) => void,
  testId?: string,
): HTMLLabelElement {
  const label = node(document, "label", labelText);
  const select = node(document, "select");
  select.append(
    new Option("未入力", ""),
    new Option("なし", "false"),
    new Option("あり", "true"),
  );
  select.value = value === null ? "" : String(value);
  if (testId) select.dataset.testid = testId;
  select.addEventListener("change", () =>
    onChange(select.value === "" ? null : select.value === "true"),
  );
  label.append(select);
  return label;
}

function resultView(
  document: Document,
  result: IdecoProjectionResult,
  incomeTaxBenefitYen: number | null,
  referenceDate: string,
): HTMLElement {
  const section = node(document, "section");
  section.className = `ideco-result status-${result.status}`;
  section.dataset.testid = "ideco-result";
  section.append(node(document, "h4", `iDeCo試算状態: ${result.status}`));
  section.append(node(document, "p", `税計算基準日: ${referenceDate}`));
  const dl = node(document, "dl");
  for (const [label, value] of [
    ["実効月額上限", result.allowedContributionYen],
    ["入力月額掛金", result.enteredContributionYen],
    ["超過額", result.exceededByYen],
    ["税年の実払込掛金", result.annualPaidContributionYen],
    ["将来元本", result.projectedPrincipalYen],
    ["想定残高", result.projectedBalanceYen],
    ["想定損益", result.projectedGainYen],
    ["実質価値", result.realValueYen],
    ["所得税軽減額", incomeTaxBenefitYen],
    ["住民税軽減額", result.residentTaxBenefitFromIdecoYen],
    ["総税軽減額", result.totalTaxBenefitYen],
    ["実質年間iDeCo費用", result.effectiveAnnualIdecoCostYen],
  ] as const)
    dl.append(node(document, "dt", label), node(document, "dd", yen(value)));
  section.append(dl);
  if (result.affectedMonth)
    section.append(node(document, "p", `判定対象月: ${result.affectedMonth}`));
  if (result.rule) {
    const details = node(document, "details");
    details.append(node(document, "summary", "適用ruleと公式根拠"));
    details.append(
      node(
        document,
        "p",
        `${result.rule.metadata.id}／${result.rule.metadata.status}／${result.rule.metadata.effectiveFrom}〜${result.rule.metadata.effectiveTo ?? "継続"}`,
      ),
      node(
        document,
        "p",
        `${result.rule.metadata.sourcePublisher}「${result.rule.metadata.sourceTitle}」／確認 ${result.rule.metadata.verifiedAt}／取得 ${result.rule.metadata.sourceRetrievedAt}`,
      ),
    );
    for (const url of result.rule.metadata.sourceUrls) {
      const link = node(document, "a", url);
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      details.append(link, node(document, "br"));
    }
    section.append(details);
  }
  if (result.messages.length || result.assumptions.length) {
    const alert = node(document, "ul");
    alert.setAttribute("role", "alert");
    for (const message of [...result.messages, ...result.assumptions])
      alert.append(node(document, "li", message));
    section.append(alert);
  }
  return section;
}

export function createIdecoRenderer(
  options: Options,
): (main: HTMLElement) => void {
  const { document, store } = options;
  let selectedMemberId: string | null = null;
  let lastError: string | null = null;

  const dispatch = (action: Parameters<Store["dispatch"]>[0]): boolean => {
    try {
      store.dispatch(action);
      lastError = null;
      options.requestRender();
      return true;
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "保存できませんでした";
      options.requestRender();
      return false;
    }
  };

  const updatePlan = (
    plan: IdecoPlan,
    mutate: (draft: IdecoPlan) => void,
  ): void => {
    const draft = structuredClone(plan);
    mutate(draft);
    dispatch({ type: "update-ideco-plan", planId: plan.id, plan: draft });
  };

  const updateScenario = (
    scenario: InvestmentScenario,
    mutate: (draft: InvestmentScenario) => void,
  ): void => {
    const draft = structuredClone(scenario);
    mutate(draft);
    dispatch({
      type: "update-investment-scenario",
      scenarioId: scenario.id,
      scenario: draft,
    });
  };

  const createPlan = (memberId: string): void => {
    const existing = store
      .getState()
      .investmentScenarios.filter((scenario) => scenario.memberId === memberId);
    const ids: Record<ScenarioKind, string> = {
      bear:
        existing.find((scenario) => scenario.kind === "bear")?.id ??
        options.createId(),
      standard:
        existing.find((scenario) => scenario.kind === "standard")?.id ??
        options.createId(),
      bull:
        existing.find((scenario) => scenario.kind === "bull")?.id ??
        options.createId(),
    };
    for (const kind of ["bear", "standard", "bull"] as const) {
      if (existing.some((scenario) => scenario.kind === kind)) continue;
      if (
        !dispatch({
          type: "add-investment-scenario",
          scenario: {
            id: ids[kind],
            memberId,
            kind,
            annualReturnBasisPoints: null,
            annualFeeBasisPoints: null,
            annualInflationBasisPoints: null,
          },
        })
      )
        return;
    }
    dispatch({
      type: "add-ideco-plan",
      plan: createIdecoPlan({
        id: options.createId(),
        memberId,
        activeScenarioId: ids.standard,
      }),
    });
  };

  return (main: HTMLElement): void => {
    const state = store.getState();
    const container = node(document, "section");
    container.className = "ideco-section";
    container.append(node(document, "h3", "iDeCoベータ"));
    container.append(
      node(
        document,
        "p",
        "毎月定額の本人掛金と将来資産を試算します。月別指定（年単位）拠出、iDeCo+、商品・金融機関・利回りの推奨、受取資格・受取税額は計算しません。",
      ),
    );
    if (lastError) {
      const alert = node(document, "p", `保存できませんでした: ${lastError}`);
      alert.setAttribute("role", "alert");
      container.append(alert);
    }
    if (
      selectedMemberId === null ||
      !state.members.some((member) => member.id === selectedMemberId)
    )
      selectedMemberId =
        state.members.find((member) => member.role === "self")?.id ?? null;
    const memberLabel = node(document, "label", "iDeCo計画の対象人物");
    const memberSelect = node(document, "select");
    memberSelect.dataset.testid = "ideco-member-select";
    for (const member of state.members)
      memberSelect.append(
        new Option(
          `${member.displayName}${member.active ? "" : "（無効）"}`,
          member.id,
        ),
      );
    memberSelect.value = selectedMemberId ?? "";
    memberSelect.addEventListener("change", () => {
      selectedMemberId = memberSelect.value;
      options.requestRender();
    });
    memberLabel.append(memberSelect);
    container.append(memberLabel);

    const member = state.members.find((item) => item.id === selectedMemberId);
    if (!member) {
      main.append(container);
      return;
    }
    const plans = state.idecoPlans.filter(
      (plan) => plan.memberId === member.id,
    );
    if (plans.length === 0 || !plans.some((plan) => plan.active)) {
      const create = node(document, "button", "iDeCo計画を作成");
      create.type = "button";
      create.disabled = !member.active;
      create.dataset.testid = `ideco-create-${member.id}`;
      create.addEventListener("click", () => createPlan(member.id));
      container.append(create);
    }

    for (const plan of plans) {
      const card = node(document, "section");
      card.className = "entity-card ideco-card";
      card.dataset.memberId = member.id;
      card.append(node(document, "h4", `${member.displayName}のiDeCo計画`));
      const form = node(document, "div");
      form.className = "form-grid ideco-form";
      const category = node(document, "label", "加入区分");
      const categorySelect = node(document, "select");
      categorySelect.dataset.testid = "ideco-participant-category";
      categorySelect.append(new Option("未入力", ""));
      for (const value of [
        "category1",
        "category2",
        "category3",
        "category4",
        "category5",
      ])
        categorySelect.append(
          new Option(value.replace("category", "第") + "号", value),
        );
      categorySelect.value = plan.participantCategory ?? "";
      categorySelect.addEventListener("change", () =>
        updatePlan(plan, (draft) => {
          draft.participantCategory =
            (categorySelect.value as IdecoPlan["participantCategory"]) || null;
        }),
      );
      category.append(categorySelect);
      const confirmed = node(document, "label");
      const confirmedInput = node(document, "input");
      confirmedInput.type = "checkbox";
      confirmedInput.checked = plan.participantCategoryConfirmed;
      confirmedInput.dataset.testid = "ideco-category-confirmed";
      confirmedInput.addEventListener("change", () =>
        updatePlan(plan, (draft) => {
          draft.participantCategoryConfirmed = confirmedInput.checked;
        }),
      );
      confirmed.append(
        confirmedInput,
        document.createTextNode("公式制度上の加入区分を確認済み"),
      );
      const pension = node(document, "label", "企業年金区分");
      const pensionSelect = node(document, "select");
      pensionSelect.append(
        new Option("未入力", ""),
        new Option("企業年金なし", "none"),
        new Option("企業型DC", "corporate-dc"),
        new Option("DB等", "db-or-other"),
        new Option("企業型DCとDB等", "corporate-dc-and-db-or-other"),
      );
      pensionSelect.value = plan.employerPensionType ?? "";
      pensionSelect.addEventListener("change", () =>
        updatePlan(plan, (draft) => {
          draft.employerPensionType =
            (pensionSelect.value as IdecoPlan["employerPensionType"]) || null;
        }),
      );
      pension.append(pensionSelect);
      form.append(
        category,
        confirmed,
        pension,
        nullableNumber(
          document,
          "企業型DC事業主掛金（月額）",
          plan.employerDcContributionYen,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.employerDcContributionYen = value;
            }),
        ),
        nullableNumber(
          document,
          "他制度掛金相当額（月額）",
          plan.otherPensionEquivalentYen,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.otherPensionEquivalentYen = value;
            }),
        ),
        nullableNumber(
          document,
          "国民年金基金掛金（月額）",
          plan.nationalPensionFundContributionYen,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.nationalPensionFundContributionYen = value;
            }),
        ),
        nullableNumber(
          document,
          "国民年金付加保険料（月額）",
          plan.nationalPensionAdditionalPremiumYen,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.nationalPensionAdditionalPremiumYen = value;
            }),
        ),
        nullableBoolean(
          document,
          "マッチング拠出",
          plan.matchingContributionActive,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.matchingContributionActive = value;
            }),
        ),
        nullableBoolean(
          document,
          "iDeCo+",
          plan.idecoPlusActive,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.idecoPlusActive = value;
            }),
          "ideco-plus",
        ),
        nullableBoolean(
          document,
          "月別指定（年単位）拠出を利用",
          plan.annualUnitContributionActive,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.annualUnitContributionActive = value;
            }),
          "ideco-annual-unit",
        ),
      );
      const start = node(document, "label", "開始年月");
      const startInput = node(document, "input");
      startInput.type = "month";
      startInput.value = plan.startMonth;
      startInput.dataset.testid = "ideco-start-month";
      startInput.addEventListener("change", () =>
        updatePlan(plan, (draft) => {
          draft.startMonth = startInput.value;
        }),
      );
      start.append(startInput);
      form.append(
        start,
        nullableNumber(
          document,
          "本人の月額掛金",
          plan.monthlyContributionYen,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.monthlyContributionYen = value;
            }),
          "ideco-monthly-contribution",
        ),
        nullableNumber(
          document,
          "現在残高（時価）",
          plan.currentBalanceYen,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.currentBalanceYen = value;
            }),
          "ideco-current-balance",
        ),
        nullableNumber(
          document,
          "開始月直前までの本人拠出元本累計",
          plan.currentContributionTotalYen,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.currentContributionTotalYen = value;
            }),
        ),
        nullableNumber(
          document,
          "固定月額費用",
          plan.monthlyFeeYen,
          (value) =>
            updatePlan(plan, (draft) => {
              draft.monthlyFeeYen = value;
            }),
          "ideco-monthly-fee",
        ),
      );
      const targetType = node(document, "label", "目標の指定方法");
      const targetTypeSelect = node(document, "select");
      targetTypeSelect.append(
        new Option("年月", "month"),
        new Option("受取年齢（試算用）", "receipt-age"),
      );
      targetTypeSelect.value = plan.projectionTarget.type;
      targetTypeSelect.addEventListener("change", () =>
        updatePlan(plan, (draft) => {
          draft.projectionTarget =
            targetTypeSelect.value === "month"
              ? { type: "month", month: plan.startMonth }
              : { type: "receipt-age", age: 65 };
        }),
      );
      targetType.append(targetTypeSelect);
      form.append(targetType);
      if (plan.projectionTarget.type === "month") {
        const target = node(document, "label", "目標年月");
        const targetInput = node(document, "input");
        targetInput.type = "month";
        targetInput.value = plan.projectionTarget.month;
        targetInput.addEventListener("change", () =>
          updatePlan(plan, (draft) => {
            draft.projectionTarget = {
              type: "month",
              month: targetInput.value,
            };
          }),
        );
        target.append(targetInput);
        form.append(target);
      } else {
        form.append(
          nullableNumber(
            document,
            "試算上の受取年齢",
            plan.projectionTarget.age,
            (value) =>
              updatePlan(plan, (draft) => {
                draft.projectionTarget = {
                  type: "receipt-age",
                  age: value ?? 0,
                };
              }),
          ),
        );
      }
      const timing = node(document, "label", "掛金の運用開始タイミング");
      const timingSelect = node(document, "select");
      timingSelect.append(
        new Option("月初", "beginning"),
        new Option("月末", "end"),
      );
      timingSelect.value = plan.contributionTiming;
      timingSelect.addEventListener("change", () =>
        updatePlan(plan, (draft) => {
          draft.contributionTiming =
            timingSelect.value as typeof draft.contributionTiming;
        }),
      );
      timing.append(timingSelect);
      form.append(timing);
      card.append(form);

      const snapshots = node(document, "section");
      snapshots.append(node(document, "h5", "税年の実払込スナップショット"));
      for (const snapshot of plan.taxContributionSnapshots) {
        const row = node(document, "div");
        row.className = "inline-form";
        row.append(
          nullableNumber(document, "税年", snapshot.taxYear, (value) =>
            updatePlan(plan, (draft) => {
              const target = draft.taxContributionSnapshots.find(
                (item) => item.taxYear === snapshot.taxYear,
              );
              if (target) target.taxYear = value ?? 0;
            }),
          ),
        );
        const paidThrough = node(document, "label", "実際の払込済み月");
        const paidThroughInput = node(document, "input");
        paidThroughInput.type = "month";
        paidThroughInput.value = snapshot.paidThroughMonth;
        paidThroughInput.addEventListener("change", () =>
          updatePlan(plan, (draft) => {
            const target = draft.taxContributionSnapshots.find(
              (item) => item.taxYear === snapshot.taxYear,
            );
            if (target) target.paidThroughMonth = paidThroughInput.value;
          }),
        );
        paidThrough.append(paidThroughInput);
        row.append(
          paidThrough,
          nullableNumber(
            document,
            "税年に実際に払込済みの本人掛金",
            snapshot.paidYen,
            (value) =>
              updatePlan(plan, (draft) => {
                const target = draft.taxContributionSnapshots.find(
                  (item) => item.taxYear === snapshot.taxYear,
                );
                if (target) target.paidYen = value ?? 0;
              }),
          ),
        );
        const remove = node(document, "button", "削除");
        remove.type = "button";
        remove.addEventListener("click", () =>
          updatePlan(plan, (draft) => {
            draft.taxContributionSnapshots =
              draft.taxContributionSnapshots.filter(
                (item) => item.taxYear !== snapshot.taxYear,
              );
          }),
        );
        row.append(remove);
        snapshots.append(row);
      }
      const addSnapshot = node(
        document,
        "button",
        "基準年のスナップショットを追加",
      );
      addSnapshot.type = "button";
      addSnapshot.addEventListener("click", () =>
        updatePlan(plan, (draft) => {
          const referenceDate = options.getReferenceDate();
          const paidThroughMonth = lastCompletedPaymentMonth(referenceDate);
          const taxYear = Number(paidThroughMonth.slice(0, 4));
          draft.taxContributionSnapshots.push({
            taxYear,
            paidThroughMonth,
            paidYen: 0,
          });
        }),
      );
      snapshots.append(addSnapshot);
      card.append(snapshots);

      const memberScenarios = state.investmentScenarios.filter(
        (scenario) => scenario.memberId === member.id,
      );
      const scenarioSection = node(document, "section");
      scenarioSection.append(
        node(document, "h5", "運用シナリオ（推奨値なし）"),
      );
      const scenarioSelect = node(document, "select");
      scenarioSelect.dataset.testid = "ideco-scenario-select";
      for (const scenario of memberScenarios)
        scenarioSelect.append(new Option(scenario.kind, scenario.id));
      scenarioSelect.value = plan.activeScenarioId;
      scenarioSelect.addEventListener("change", () =>
        updatePlan(plan, (draft) => {
          draft.activeScenarioId = scenarioSelect.value;
        }),
      );
      scenarioSection.append(scenarioSelect);
      const selectedScenario = memberScenarios.find(
        (scenario) => scenario.id === plan.activeScenarioId,
      );
      if (selectedScenario)
        scenarioSection.append(
          nullableNumber(
            document,
            "年率（basis points）",
            selectedScenario.annualReturnBasisPoints,
            (value) =>
              updateScenario(selectedScenario, (draft) => {
                draft.annualReturnBasisPoints = value;
              }),
          ),
          nullableNumber(
            document,
            "運用商品の年間比率費用（basis points）",
            selectedScenario.annualFeeBasisPoints,
            (value) =>
              updateScenario(selectedScenario, (draft) => {
                draft.annualFeeBasisPoints = value;
              }),
          ),
          nullableNumber(
            document,
            "年間インフレ率（basis points）",
            selectedScenario.annualInflationBasisPoints,
            (value) =>
              updateScenario(selectedScenario, (draft) => {
                draft.annualInflationBasisPoints = value;
              }),
          ),
        );
      card.append(scenarioSection);
      const referenceDate = options.getReferenceDate();
      const result = calculateIdecoPlan(plan, selectedScenario, member, {
        taxYear: Number(referenceDate.slice(0, 4)),
        referenceDate,
      });
      const linkedTakeHome = state.takeHomePlans.find(
        (candidate) =>
          candidate.mode === "calculated" &&
          candidate.memberId === plan.memberId &&
          candidate.deductions.idecoContributionMode === "linked" &&
          candidate.deductions.linkedIdecoPlanId === plan.id,
      );
      const incomeTaxBenefit = linkedTakeHome
        ? calculateTakeHomeFromState(
            state,
            linkedTakeHome,
            member,
            referenceDate,
          ).incomeTaxBenefitFromIdecoYen
        : null;
      card.append(
        resultView(document, result, incomeTaxBenefit, referenceDate),
      );
      const actions = node(document, "div");
      actions.className = "button-row";
      const toggle = node(
        document,
        "button",
        plan.active ? "iDeCo計画を無効化" : "iDeCo計画を有効化",
      );
      toggle.type = "button";
      toggle.addEventListener("click", () =>
        updatePlan(plan, (draft) => {
          draft.active = !draft.active;
        }),
      );
      const remove = node(document, "button", "iDeCo計画を削除");
      remove.type = "button";
      remove.addEventListener("click", () =>
        dispatch({ type: "delete-ideco-plan", planId: plan.id }),
      );
      actions.append(toggle, remove);
      card.append(actions);
      container.append(card);
    }
    main.append(container);
  };
}
