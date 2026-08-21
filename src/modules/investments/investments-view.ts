import type { Store } from "../../app/store";
import {
  calculateNisaPlan,
  type InvestmentScenario,
  type NisaPlan,
  type NisaProjectionResult,
  type ScenarioKind,
} from "../../domain/nisa";
import { selectInvestmentFundingContext } from "../../domain/investment-funding";
import { nisaRuleSources } from "../../rules/jp/nisa/rules-2024";
import { createIdecoRenderer } from "./ideco-view";

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

function numberField(
  document: Document,
  text: string,
  value: number | null,
  onChange: (value: number | null) => void,
  testId?: string,
): HTMLLabelElement {
  const label = node(document, "label", text);
  const input = node(document, "input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = value === null ? "" : String(value);
  input.placeholder = "明示入力が必要（0円も入力）";
  if (testId) input.dataset.testid = testId;
  input.addEventListener("change", () =>
    onChange(input.value === "" ? null : Number(input.value)),
  );
  label.append(input);
  return label;
}

function assumptionField(
  document: Document,
  text: string,
  value: number | null,
  onChange: (value: number | null) => void,
  testId: string,
): HTMLLabelElement {
  const label = node(document, "label", text);
  const input = node(document, "input");
  input.type = "number";
  input.step = "1";
  input.value = value === null ? "" : String(value);
  input.placeholder = "明示入力が必要";
  input.dataset.testid = testId;
  input.addEventListener("change", () =>
    onChange(input.value === "" ? null : Number(input.value)),
  );
  label.append(input);
  return label;
}

function resultView(
  document: Document,
  result: NisaProjectionResult,
): HTMLElement {
  const section = node(document, "section");
  section.className = `nisa-result status-${result.status}`;
  section.dataset.area = "result";
  section.dataset.testid = "nisa-result";
  section.append(node(document, "h4", `試算状態: ${result.status}`));
  if (result.assumptions) {
    section.append(
      node(
        document,
        "p",
        `仮定値: 年率 ${String(result.assumptions.annualReturnBasisPoints)}bp／費用率 ${String(result.assumptions.annualFeeBasisPoints)}bp／インフレ率 ${String(result.assumptions.annualInflationBasisPoints)}bp`,
      ),
    );
  }
  const dl = node(document, "dl");
  const reachText = (
    reach: NisaProjectionResult["lifetimeLimitReach"],
  ): string => {
    if (reach.status === "uncomputed") return "未計算";
    if (reach.status === "starting-reached")
      return "開始時点ですでに一致または超過";
    if (reach.status === "not-reached") return "計画期間内に到達しない";
    return `${reach.month ?? "未計算"}に最初に到達`;
  };
  for (const [label, value] of [
    ["将来拠出額", result.futureContributionsYen],
    ["将来元本", result.projectedPrincipalYen],
    ["想定残高", result.projectedBalanceYen],
    ["想定運用益", result.projectedGainYen],
    ["実質価値", result.realValueYen],
    ["非課税保有限度額の残枠", result.lifetimeRemainingYen],
    ["成長投資枠内数の残枠", result.lifetimeGrowthRemainingYen],
  ] as const) {
    dl.append(node(document, "dt", label), node(document, "dd", yen(value)));
  }
  section.append(dl);
  const reach = node(document, "dl");
  reach.append(
    node(document, "dt", "非課税保有限度額への到達"),
    node(document, "dd", reachText(result.lifetimeLimitReach)),
    node(document, "dt", "成長投資枠内数への到達"),
    node(document, "dd", reachText(result.lifetimeGrowthLimitReach)),
  );
  reach.dataset.testid = "nisa-limit-reach";
  section.append(reach);
  const years = node(document, "section");
  years.append(node(document, "h5", "暦年別の取得価額"));
  for (const [year, value] of Object.entries(result.annualContributions)) {
    years.append(
      node(
        document,
        "p",
        `${year}年: つみたて投資枠 上限 ${yen(value.tsumitateLimitYen)}／使用 ${yen(value.tsumitateYen)}／残枠 ${yen(value.tsumitateRemainingYen)}、成長投資枠 上限 ${yen(value.growthLimitYen)}／使用 ${yen(value.growthYen)}／残枠 ${yen(value.growthRemainingYen)}、年間合計 上限 ${yen(value.combinedLimitYen)}／使用 ${yen(value.combinedYen)}／残枠 ${yen(value.combinedRemainingYen)}`,
      ),
    );
  }
  section.append(years);
  if (result.issues.length > 0 || result.messages.length > 0) {
    const alert = node(document, "ul");
    alert.setAttribute("role", "alert");
    alert.dataset.testid = "nisa-issues";
    for (const issue of result.issues) {
      alert.append(
        node(
          document,
          "li",
          `${issue.year === null ? "総枠" : `${String(issue.year)}年`} ${issue.code}: ${yen(issue.exceededByYen)}超過`,
        ),
      );
    }
    for (const message of result.messages)
      alert.append(node(document, "li", message));
    section.append(alert);
  }
  if (result.rule) {
    const details = node(document, "details");
    details.append(node(document, "summary", "適用ruleと公式根拠"));
    details.append(
      node(
        document,
        "p",
        `${result.rule.metadata.id}（${result.rule.metadata.effectiveFrom}以降、確認日 ${result.rule.metadata.verifiedAt}）`,
      ),
    );
    for (const source of result.rule.metadata.sources) {
      const paragraph = node(
        document,
        "p",
        `${source.publisher}「${source.title}」: `,
      );
      const link = node(document, "a", "公式資料");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      paragraph.append(link);
      details.append(paragraph);
    }
    section.append(details);
  }
  return section;
}

export function createInvestmentsRenderer(
  options: Options,
): (main: HTMLElement) => void {
  const { document, store } = options;
  let lastError: string | null = null;
  let selectedMemberId: string | null = null;
  const idecoRenderer = createIdecoRenderer(options);

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
    plan: NisaPlan,
    mutate: (draft: NisaPlan) => void,
  ): void => {
    const draft = structuredClone(plan);
    mutate(draft);
    dispatch({ type: "update-nisa-plan", planId: plan.id, plan: draft });
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
    const ids = {
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
      type: "add-nisa-plan",
      plan: {
        id: options.createId(),
        memberId,
        japanResidentConfirmed: false,
        startMonth: "2026-01",
        targetMonth: "2035-12",
        currentBalanceYen: null,
        currentBookValueYen: null,
        usedLimitYen: null,
        usedGrowthLimitYen: null,
        monthlyTsumitateYen: null,
        monthlyGrowthYen: null,
        additionalPurchases: [],
        contributionTiming: "end",
        activeScenarioId: ids.standard,
        active: true,
      },
    });
  };

  return (main: HTMLElement): void => {
    const state = store.getState();
    if (lastError) {
      const alert = node(document, "p", `保存できませんでした: ${lastError}`);
      alert.setAttribute("role", "alert");
      alert.className = "form-error";
      main.append(alert);
    }
    const fundingSection = node(document, "section");
    fundingSection.className = "dashboard-card funding-context";
    fundingSection.dataset.area = "result";
    fundingSection.append(node(document, "h3", "家計簿から自動連携"));
    try {
      const funding = selectInvestmentFundingContext(
        state,
        options.getReferenceDate(),
      );
      const grid = node(document, "div");
      grid.className = "summary-grid";
      [
        ["投資可能額", funding.household.availableYen],
        ["NISA月額", funding.household.nisaContributionYen],
        ["iDeCo月額", funding.household.idecoContributionYen],
        ["投資後残額", funding.household.remainingAfterInvestmentYen],
      ].forEach(([label, value]) => {
        const card = node(document, "article");
        card.className = "summary-card";
        card.append(
          node(document, "h4", String(label)),
          node(
            document,
            "strong",
            typeof value === "number"
              ? `${value.toLocaleString("ja-JP")}円`
              : "未計算",
          ),
        );
        grid.append(card);
      });
      fundingSection.append(grid);
      if (funding.household.oversubscribed) {
        const warning = node(
          document,
          "p",
          `投資額が投資可能額を${(
            funding.household.shortfallYen ?? 0
          ).toLocaleString(
            "ja-JP",
          )}円超過しています。設定額は自動変更しません。`,
        );
        warning.className = "warning-message";
        warning.setAttribute("role", "status");
        fundingSection.append(warning);
      } else if (funding.status !== "available") {
        const warning = node(
          document,
          "p",
          "家計または現在の拠出額を確定できないため、投資後残額は未計算です。",
        );
        warning.className = "warning-message";
        warning.setAttribute("role", "status");
        fundingSection.append(warning);
      }
    } catch (error) {
      const warning = node(
        document,
        "p",
        `家計連携を表示できません。${error instanceof Error ? ` ${error.message}` : ""}`,
      );
      warning.setAttribute("role", "alert");
      fundingSection.append(warning);
    }
    main.append(fundingSection);
    main.append(
      node(
        document,
        "p",
        "成人向けNISAの金額計画ベータです。2023年までの旧NISAは2024年以降の使用額へ含めません。商品適格性、商品・利回りの推奨、売却による枠の復活は計算しません。2027年からの0～17歳向け制度は対象外です。",
      ),
    );
    if (
      selectedMemberId === null ||
      !state.members.some((member) => member.id === selectedMemberId)
    ) {
      selectedMemberId =
        state.members.find((member) => member.role === "self")?.id ??
        state.members[0]?.id ??
        null;
    }
    const memberLabel = node(document, "label", "NISA計画の対象人物");
    memberLabel.dataset.area = "input";
    const memberSelect = node(document, "select");
    memberSelect.dataset.testid = "nisa-member-select";
    for (const member of state.members) {
      memberSelect.append(
        new Option(
          `${member.displayName}${member.active ? "" : "（無効）"}`,
          member.id,
        ),
      );
    }
    memberSelect.value = selectedMemberId ?? "";
    memberSelect.addEventListener("change", () => {
      selectedMemberId = memberSelect.value;
      options.requestRender();
    });
    memberLabel.append(memberSelect);
    main.append(memberLabel);

    for (const member of state.members.filter(
      (item) => item.id === selectedMemberId,
    )) {
      const card = node(document, "section");
      card.className = "entity-card nisa-card";
      card.dataset.memberId = member.id;
      card.append(
        node(
          document,
          "h3",
          `${member.displayName}${member.active ? "" : "（無効）"}`,
        ),
      );
      const birth = node(document, "label", "生年月日");
      const birthInput = node(document, "input");
      birthInput.type = "date";
      birthInput.value = member.birthDate ?? "";
      birthInput.dataset.testid = `nisa-birth-${member.id}`;
      birthInput.addEventListener("change", () =>
        dispatch({
          type: "update-member-profile",
          memberId: member.id,
          birthDate: birthInput.value || undefined,
          residencePrefecture: member.residencePrefecture,
        }),
      );
      birth.append(birthInput);
      card.append(birth);
      const plans = state.nisaPlans.filter(
        (item) => item.memberId === member.id,
      );
      if (plans.length === 0 || !plans.some((plan) => plan.active)) {
        const create = node(
          document,
          "button",
          plans.length === 0 ? "NISA計画を作成" : "新しいNISA計画を作成",
        );
        create.type = "button";
        create.dataset.testid = `nisa-create-${member.id}`;
        create.disabled = !member.active;
        create.addEventListener("click", () => createPlan(member.id));
        card.append(create);
      }

      for (const plan of plans) {
        const planActions = node(document, "div");
        planActions.className = "button-row";
        const toggle = node(
          document,
          "button",
          plan.active ? "NISA計画を無効化" : "NISA計画を有効化",
        );
        toggle.type = "button";
        toggle.addEventListener("click", () =>
          updatePlan(plan, (draft) => {
            draft.active = !draft.active;
          }),
        );
        planActions.append(toggle);
        card.append(planActions);
        const form = node(document, "div");
        form.className = "form-grid nisa-form";
        form.dataset.area = "input";
        const resident = node(document, "label");
        resident.className = "nisa-checkbox";
        const residentInput = node(document, "input");
        residentInput.type = "checkbox";
        residentInput.checked = plan.japanResidentConfirmed;
        residentInput.dataset.testid = "nisa-resident-confirmed";
        residentInput.addEventListener("change", () =>
          updatePlan(plan, (draft) => {
            draft.japanResidentConfirmed = residentInput.checked;
          }),
        );
        resident.append(
          residentInput,
          document.createTextNode("日本国内の居住者であることを確認"),
        );
        form.append(resident);
        for (const [label, field] of [
          ["開始年月", "startMonth"],
          ["目標年月", "targetMonth"],
        ] as const) {
          const fieldLabel = node(document, "label", label);
          const input = node(document, "input");
          input.type = "month";
          input.value = plan[field];
          input.dataset.testid = `nisa-${field}`;
          input.addEventListener("change", () =>
            updatePlan(plan, (draft) => {
              draft[field] = input.value;
            }),
          );
          fieldLabel.append(input);
          form.append(fieldLabel);
        }
        form.append(
          numberField(
            document,
            "現在残高（時価）",
            plan.currentBalanceYen,
            (value) =>
              updatePlan(plan, (draft) => {
                draft.currentBalanceYen = value;
              }),
            "nisa-current-balance",
          ),
          numberField(
            document,
            "現在簿価",
            plan.currentBookValueYen,
            (value) =>
              updatePlan(plan, (draft) => {
                draft.currentBookValueYen = value;
              }),
            "nisa-current-book-value",
          ),
          numberField(
            document,
            "2024年以降NISAの総枠使用額",
            plan.usedLimitYen,
            (value) =>
              updatePlan(plan, (draft) => {
                draft.usedLimitYen = value;
              }),
            "nisa-used-limit",
          ),
          numberField(
            document,
            "成長投資枠の使用額",
            plan.usedGrowthLimitYen,
            (value) =>
              updatePlan(plan, (draft) => {
                draft.usedGrowthLimitYen = value;
              }),
            "nisa-used-growth-limit",
          ),
          numberField(
            document,
            "毎月つみたて投資枠額",
            plan.monthlyTsumitateYen,
            (value) =>
              updatePlan(plan, (draft) => {
                draft.monthlyTsumitateYen = value;
              }),
            "nisa-monthly-tsumitate",
          ),
          numberField(
            document,
            "毎月成長投資枠額",
            plan.monthlyGrowthYen,
            (value) =>
              updatePlan(plan, (draft) => {
                draft.monthlyGrowthYen = value;
              }),
            "nisa-monthly-growth",
          ),
        );
        const timing = node(document, "label", "拠出タイミング");
        const timingSelect = node(document, "select");
        timingSelect.append(
          new Option("月初", "beginning"),
          new Option("月末", "end"),
        );
        timingSelect.value = plan.contributionTiming;
        timingSelect.addEventListener("change", () =>
          updatePlan(plan, (draft) => {
            draft.contributionTiming =
              timingSelect.value as NisaPlan["contributionTiming"];
          }),
        );
        timing.append(timingSelect);
        form.append(timing);
        card.append(form);

        const purchases = node(document, "section");
        purchases.append(node(document, "h4", "臨時拠出"));
        for (const purchase of plan.additionalPurchases) {
          const row = node(document, "div");
          row.className = "inline-form";
          const month = node(document, "label", "年月");
          const monthInput = node(document, "input");
          monthInput.type = "month";
          monthInput.value = purchase.month;
          monthInput.addEventListener("change", () =>
            updatePlan(plan, (draft) => {
              const target = draft.additionalPurchases.find(
                (item) => item.id === purchase.id,
              );
              if (target) target.month = monthInput.value;
            }),
          );
          month.append(monthInput);
          const bucket = node(document, "label", "枠");
          const bucketSelect = node(document, "select");
          bucketSelect.append(
            new Option("つみたて投資枠", "tsumitate"),
            new Option("成長投資枠", "growth"),
          );
          bucketSelect.value = purchase.bucket;
          bucketSelect.addEventListener("change", () =>
            updatePlan(plan, (draft) => {
              const target = draft.additionalPurchases.find(
                (item) => item.id === purchase.id,
              );
              if (target)
                target.bucket = bucketSelect.value as typeof target.bucket;
            }),
          );
          bucket.append(bucketSelect);
          const amount = numberField(
            document,
            "金額",
            purchase.amountYen,
            (value) =>
              updatePlan(plan, (draft) => {
                const target = draft.additionalPurchases.find(
                  (item) => item.id === purchase.id,
                );
                if (target) target.amountYen = value;
              }),
          );
          const remove = node(document, "button", "臨時拠出を削除");
          remove.type = "button";
          remove.addEventListener("click", () =>
            updatePlan(plan, (draft) => {
              draft.additionalPurchases = draft.additionalPurchases.filter(
                (item) => item.id !== purchase.id,
              );
            }),
          );
          row.append(month, bucket, amount, remove);
          purchases.append(row);
        }
        const addPurchase = node(document, "button", "臨時拠出を追加");
        addPurchase.type = "button";
        addPurchase.dataset.testid = "nisa-add-purchase";
        addPurchase.addEventListener("click", () =>
          updatePlan(plan, (draft) => {
            draft.additionalPurchases.push({
              id: options.createId(),
              month: draft.startMonth,
              bucket: "tsumitate",
              amountYen: null,
            });
          }),
        );
        purchases.append(addPurchase);
        card.append(purchases);

        const memberScenarios = state.investmentScenarios.filter(
          (item) => item.memberId === member.id,
        );
        const scenarioSection = node(document, "section");
        scenarioSection.append(
          node(document, "h4", "運用シナリオ（推奨値なし）"),
        );
        const selectLabel = node(document, "label", "利用するシナリオ");
        const select = node(document, "select");
        select.dataset.testid = "nisa-scenario-select";
        const scenarioLabels: Record<ScenarioKind, string> = {
          bear: "弱気",
          standard: "標準",
          bull: "強気",
        };
        for (const item of memberScenarios)
          select.append(new Option(scenarioLabels[item.kind], item.id));
        select.value = plan.activeScenarioId;
        select.addEventListener("change", () =>
          updatePlan(plan, (draft) => {
            draft.activeScenarioId = select.value;
          }),
        );
        selectLabel.append(select);
        scenarioSection.append(selectLabel);
        const selected = memberScenarios.find(
          (item) => item.id === plan.activeScenarioId,
        );
        if (selected) {
          const scenarioForm = node(document, "div");
          scenarioForm.className = "form-grid";
          scenarioForm.append(
            assumptionField(
              document,
              "年率（basis points、-10000以上）",
              selected.annualReturnBasisPoints,
              (value) =>
                updateScenario(selected, (draft) => {
                  draft.annualReturnBasisPoints = value;
                }),
              "nisa-return-bp",
            ),
            assumptionField(
              document,
              "年間費用率（basis points）",
              selected.annualFeeBasisPoints,
              (value) =>
                updateScenario(selected, (draft) => {
                  draft.annualFeeBasisPoints = value;
                }),
              "nisa-fee-bp",
            ),
            assumptionField(
              document,
              "年間インフレ率（basis points）",
              selected.annualInflationBasisPoints,
              (value) =>
                updateScenario(selected, (draft) => {
                  draft.annualInflationBasisPoints = value;
                }),
              "nisa-inflation-bp",
            ),
          );
          scenarioSection.append(scenarioForm);
        }
        card.append(scenarioSection);
        card.append(
          resultView(document, calculateNisaPlan(plan, selected, member)),
        );
        const deletePlan = node(document, "button", "NISA計画を削除");
        deletePlan.type = "button";
        deletePlan.addEventListener("click", () =>
          dispatch({ type: "delete-nisa-plan", planId: plan.id }),
        );
        card.append(deletePlan);
      }
      main.append(card);
    }

    const official = node(document, "details");
    official.append(node(document, "summary", "確認済み公式資料"));
    for (const source of nisaRuleSources) {
      const paragraph = node(document, "p", `${source.publisher}: `);
      const link = node(document, "a", source.title);
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      paragraph.append(link);
      official.append(paragraph);
    }
    main.append(official);
    idecoRenderer(main);
    void options.browserWindow;
  };
}
