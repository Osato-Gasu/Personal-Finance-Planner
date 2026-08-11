import type { Store } from "../../app/store";
import {
  calculateBudgetSummary,
  formatFrequency,
  monthlyExpenseYen,
} from "../../domain/budget";
import { resolveIncomeTarget } from "../../domain/linked-value";
import type {
  AppAction,
  BudgetCategory,
  CycleUnit,
  ExpenseItem,
  ExpenseScope,
  ShareMode,
} from "../../domain/state";

export type EntityIdFactory = () => string;

interface BudgetUiState {
  error: string | null;
  search: string;
  categoryFilter: string;
  scopeFilter: "all" | ExpenseScope;
  activeFilter: "all" | "active" | "inactive";
  sort: "purpose" | "category" | "monthly";
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

function required<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}

function labeledInput(
  document: Document,
  labelText: string,
  options: {
    type?: string;
    value?: string;
    min?: string;
    max?: string;
    step?: string;
    required?: boolean;
    readOnly?: boolean;
    name: string;
  },
): { wrapper: HTMLLabelElement; input: HTMLInputElement } {
  const wrapper = node(document, "label");
  wrapper.append(node(document, "span", labelText));
  const input = node(document, "input");
  input.name = options.name;
  input.type = options.type ?? "text";
  input.value = options.value ?? "";
  if (options.min !== undefined) input.min = options.min;
  if (options.max !== undefined) input.max = options.max;
  if (options.step !== undefined) input.step = options.step;
  input.required = options.required ?? false;
  input.readOnly = options.readOnly ?? false;
  wrapper.append(input);
  return { wrapper, input };
}

function labeledSelect<T extends string>(
  document: Document,
  labelText: string,
  name: string,
  value: T,
  options: readonly [T, string][],
): { wrapper: HTMLLabelElement; select: HTMLSelectElement } {
  const wrapper = node(document, "label");
  wrapper.append(node(document, "span", labelText));
  const select = node(document, "select");
  select.name = name;
  for (const [optionValue, optionLabel] of options) {
    const option = node(document, "option", optionLabel);
    option.value = optionValue;
    option.selected = optionValue === value;
    select.append(option);
  }
  wrapper.append(select);
  return { wrapper, select };
}

function yen(value: number | null): string {
  return value === null ? "未計算" : `${value.toLocaleString("ja-JP")}円`;
}

function numberValue(input: HTMLInputElement, label: string): number {
  if (input.value.trim() === "") throw new Error(`${label}を入力してください`);
  const value = Number(input.value);
  if (!Number.isFinite(value)) throw new Error(`${label}が不正です`);
  return value;
}

function integerValue(input: HTMLInputElement, label: string): number {
  const value = numberValue(input, label);
  if (!Number.isSafeInteger(value))
    throw new Error(`${label}は整数で入力してください`);
  return value;
}

function basisPoints(input: HTMLInputElement, label: string): number {
  return Math.round(numberValue(input, label) * 100);
}

function shareFields(
  document: Document,
  prefix: string,
  shareMode: ShareMode,
  selfShareBasisPoints: number | undefined,
): {
  fragment: DocumentFragment;
  mode: HTMLSelectElement;
  percentage: HTMLInputElement;
} {
  const fragment = document.createDocumentFragment();
  const select = labeledSelect(
    document,
    `${prefix}負担設定`,
    `${prefix}-share-mode`,
    shareMode,
    [
      ["inherit", "上位設定を継承"],
      ["custom", "個別設定"],
    ],
  );
  const percentage = labeledInput(document, `${prefix}本人割合（%）`, {
    name: `${prefix}-self-share`,
    type: "number",
    value: String((selfShareBasisPoints ?? 5000) / 100),
    min: "0",
    max: "100",
    step: "0.1",
  });
  fragment.append(select.wrapper, percentage.wrapper);
  return { fragment, mode: select.select, percentage: percentage.input };
}

export function createBudgetRenderer(options: {
  browserWindow: Window;
  document: Document;
  store: Store;
  createId: EntityIdFactory;
  requestRender: () => void;
}): (main: HTMLElement) => void {
  const ui: BudgetUiState = {
    error: null,
    search: "",
    categoryFilter: "all",
    scopeFilter: "all",
    activeFilter: "all",
    sort: "purpose",
  };
  const perform = (action: AppAction): void => {
    ui.error = null;
    try {
      options.store.dispatch(action);
    } catch (error) {
      ui.error = error instanceof Error ? error.message : "操作に失敗しました";
      options.requestRender();
    }
  };

  return (main: HTMLElement): void => {
    const state = options.store.getState();
    const summary = calculateBudgetSummary(state);
    main.classList.add("budget-page");
    const introduction = node(
      options.document,
      "p",
      "月ごとの生活費を平準化し、本人と相手の負担・手残りを確認できます。",
    );
    main.append(introduction);
    const status = node(options.document, "div");
    status.className = "operation-status";
    status.setAttribute("role", ui.error ? "alert" : "status");
    status.textContent =
      ui.error ?? "入力はこの端末のlocalStorageへ自動保存されます。";
    main.append(status);
    renderSummary(main, summary);
    renderHousehold(main, perform);
    renderMode(main, perform);
    renderCategories(main, perform);
    renderExpenses(main, perform);
  };

  function renderSummary(
    main: HTMLElement,
    summary: ReturnType<typeof calculateBudgetSummary>,
  ): void {
    const section = node(options.document, "section");
    section.append(node(options.document, "h3", "家計サマリー"));
    const grid = node(options.document, "div");
    grid.className = "summary-grid";
    const cards: [string, string, string][] = [
      ["世帯手取り", yen(summary.householdIncomeYen), "household-income"],
      ["生活費合計", yen(summary.householdExpenseYen), "household-expense"],
      ["世帯手残り", yen(summary.householdRemainingYen), "household-remaining"],
      [
        "集計モード",
        summary.mode === "detailed" ? "詳細集計" : "簡易集計",
        "budget-mode",
      ],
      [
        "支出率",
        summary.spendingRatePercent === null
          ? "未計算"
          : `${summary.spendingRatePercent.toFixed(1)}%`,
        "spending-rate",
      ],
      [
        "支出状態",
        summary.overspent === null
          ? "未計算"
          : summary.overspent
            ? "支出超過"
            : "範囲内",
        "spending-status",
      ],
    ];
    for (const [label, value, testId] of cards) {
      const card = node(options.document, "article");
      card.className = "summary-card";
      card.dataset.testid = testId;
      card.append(
        node(options.document, "h4", label),
        node(options.document, "p", value),
      );
      if (label.includes("手残り") && value.startsWith("-"))
        card.append(node(options.document, "strong", "支出超過"));
      grid.append(card);
    }
    for (const member of [summary.self, summary.partner]) {
      const card = node(options.document, "article");
      card.className = "summary-card member-summary";
      card.dataset.testid =
        member === summary.self ? "self-summary" : "partner-summary";
      card.append(
        node(
          options.document,
          "h4",
          `${member.displayName}${member.active ? "" : "（inactive）"}`,
        ),
      );
      card.append(
        node(options.document, "p", `手取り ${yen(member.incomeYen)}`),
      );
      card.append(
        node(options.document, "p", `負担額 ${yen(member.expenseYen)}`),
      );
      card.append(
        node(options.document, "p", `手残り ${yen(member.remainingYen)}`),
      );
      if (member.remainingYen !== null && member.remainingYen < 0)
        card.append(node(options.document, "strong", "支出超過"));
      if (member.unresolvedIncome)
        card.append(
          node(options.document, "strong", "連携値を解決できないため未計算"),
        );
      grid.append(card);
    }
    section.append(grid);
    if (summary.mode === "detailed" && summary.categories.length > 0) {
      const table = node(options.document, "table");
      table.className = "summary-table";
      const caption = node(options.document, "caption", "カテゴリ別内訳");
      const head = node(options.document, "thead");
      const row = node(options.document, "tr");
      for (const label of ["カテゴリ", "月換算", "本人", "相手", "構成比"])
        row.append(node(options.document, "th", label));
      head.append(row);
      const body = node(options.document, "tbody");
      for (const category of summary.categories) {
        const categoryRow = node(options.document, "tr");
        for (const value of [
          category.name,
          yen(category.householdExpenseYen),
          yen(category.selfExpenseYen),
          yen(category.partnerExpenseYen),
          `${category.householdSharePercent.toFixed(1)}%`,
        ])
          categoryRow.append(node(options.document, "td", value));
        body.append(categoryRow);
      }
      table.append(caption, head, body);
      section.append(table);
    }
    main.append(section);
  }

  function renderHousehold(
    main: HTMLElement,
    performAction: (action: AppAction) => void,
  ): void {
    const state = options.store.getState();
    const self = required(
      state.members.find((member) => member.role === "self"),
      "self is missing",
    );
    const partner = required(
      state.members.find((member) => member.role === "partner"),
      "partner is missing",
    );
    const selfTarget = required(
      state.incomeTargets.find((target) => target.memberId === self.id),
      "self income target is missing",
    );
    const partnerTarget = required(
      state.incomeTargets.find((target) => target.memberId === partner.id),
      "partner income target is missing",
    );
    const selfResolved = resolveIncomeTarget(state, selfTarget.id);
    const partnerResolved = resolveIncomeTarget(state, partnerTarget.id);
    const selfLinked =
      selfResolved.status === "selected" ||
      selfResolved.status === "broken-link";
    const partnerLinked =
      partnerResolved.status === "selected" ||
      partnerResolved.status === "broken-link";
    const section = node(options.document, "section");
    section.append(node(options.document, "h3", "世帯・手取り設定"));
    const form = node(options.document, "form");
    form.className = "form-grid";
    const selfName = labeledInput(options.document, "本人表示名", {
      name: "self-name",
      value: self.displayName,
      required: true,
    });
    const selfIncome = labeledInput(options.document, "本人の月間手取り", {
      name: "self-income",
      type: "number",
      value: String(
        selfResolved.status === "selected"
          ? selfResolved.valueYen
          : selfTarget.manualYen,
      ),
      min: "0",
      step: "1",
      required: true,
      readOnly: selfLinked,
    });
    const partnerMode = node(options.document, "label");
    const partnerCheckbox = node(options.document, "input");
    partnerCheckbox.type = "checkbox";
    partnerCheckbox.name = "partner-active";
    partnerCheckbox.checked = partner.active;
    partnerMode.append(
      partnerCheckbox,
      node(options.document, "span", "同棲モード"),
    );
    const partnerName = labeledInput(options.document, "相手表示名", {
      name: "partner-name",
      value: partner.displayName,
      required: true,
    });
    const partnerIncome = labeledInput(options.document, "相手の月間手取り", {
      name: "partner-income",
      type: "number",
      value: String(
        partnerResolved.status === "selected"
          ? partnerResolved.valueYen
          : partnerTarget.manualYen,
      ),
      min: "0",
      step: "1",
      required: true,
      readOnly: partnerLinked,
    });
    const globalShare = labeledInput(
      options.document,
      "本人の既定負担割合（%）",
      {
        name: "global-share",
        type: "number",
        value: String(state.budget.globalSelfShareBasisPoints / 100),
        min: "0",
        max: "100",
        step: "0.1",
        required: true,
      },
    );
    form.append(
      selfName.wrapper,
      selfIncome.wrapper,
      partnerMode,
      partnerName.wrapper,
      partnerIncome.wrapper,
      globalShare.wrapper,
    );
    if (selfLinked)
      form.append(
        node(
          options.document,
          "p",
          selfResolved.status === "selected"
            ? "本人手取りは連携値のためread-onlyです。"
            : "本人手取りの連携を解決できません。",
        ),
      );
    if (selfResolved.status === "selected") {
      const unlinkSelf = node(
        options.document,
        "button",
        "本人手取りの連携を解除",
      );
      unlinkSelf.type = "button";
      unlinkSelf.addEventListener("click", () =>
        performAction({
          type: "unlink-income",
          targetId: selfTarget.id,
          manualYen: selfResolved.valueYen,
        }),
      );
      form.append(unlinkSelf);
    }
    if (partnerLinked)
      form.append(
        node(
          options.document,
          "p",
          partnerResolved.status === "selected"
            ? "相手手取りは連携値のためread-onlyです。"
            : "相手手取りの連携を解決できません。",
        ),
      );
    if (partnerResolved.status === "selected") {
      const unlinkPartner = node(
        options.document,
        "button",
        "相手手取りの連携を解除",
      );
      unlinkPartner.type = "button";
      unlinkPartner.addEventListener("click", () =>
        performAction({
          type: "unlink-income",
          targetId: partnerTarget.id,
          manualYen: partnerResolved.valueYen,
        }),
      );
      form.append(unlinkPartner);
    }
    const submit = node(options.document, "button", "世帯設定を保存");
    submit.type = "submit";
    form.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      performAction({
        type: "update-household",
        selfName: selfName.input.value,
        partnerName: partnerName.input.value,
        partnerActive: partnerCheckbox.checked,
        selfManualYen: selfLinked
          ? undefined
          : integerValue(selfIncome.input, "本人の月間手取り"),
        partnerManualYen: partnerLinked
          ? undefined
          : integerValue(partnerIncome.input, "相手の月間手取り"),
        globalSelfShareBasisPoints: basisPoints(
          globalShare.input,
          "本人の既定負担割合",
        ),
      });
    });
    section.append(form);
    main.append(section);
  }

  function renderMode(
    main: HTMLElement,
    performAction: (action: AppAction) => void,
  ): void {
    const state = options.store.getState();
    const section = node(options.document, "section");
    section.append(node(options.document, "h3", "集計モード"));
    const fieldset = node(options.document, "fieldset");
    fieldset.append(node(options.document, "legend", "詳細／簡易モード"));
    for (const [value, label] of [
      ["detailed", "詳細集計"],
      ["simple", "簡易集計"],
    ] as const) {
      const wrapper = node(options.document, "label");
      const radio = node(options.document, "input");
      radio.type = "radio";
      radio.name = "budget-mode";
      radio.value = value;
      radio.checked = state.budget.mode === value;
      radio.addEventListener("change", () =>
        performAction({ type: "set-budget-mode", mode: value }),
      );
      wrapper.append(radio, node(options.document, "span", label));
      fieldset.append(wrapper);
    }
    section.append(fieldset);
    const simpleForm = node(options.document, "form");
    simpleForm.className = "inline-form";
    const simple = labeledInput(options.document, "月間世帯生活費", {
      name: "simple-expense",
      type: "number",
      value: String(state.budget.simpleMonthlyExpenseYen),
      min: "0",
      step: "1",
      required: true,
    });
    simpleForm.append(simple.wrapper);
    const button = node(options.document, "button", "簡易生活費を保存");
    button.type = "submit";
    simpleForm.append(button);
    simpleForm.addEventListener("submit", (event) => {
      event.preventDefault();
      performAction({
        type: "set-simple-expense",
        amountYen: integerValue(simple.input, "月間世帯生活費"),
      });
    });
    section.append(simpleForm);
    main.append(section);
  }

  function renderCategories(
    main: HTMLElement,
    performAction: (action: AppAction) => void,
  ): void {
    const state = options.store.getState();
    const section = node(options.document, "section");
    section.append(node(options.document, "h3", "カテゴリ管理"));
    const form = node(options.document, "form");
    form.className = "form-grid";
    const name = labeledInput(options.document, "カテゴリ名", {
      name: "category-name",
      required: true,
    });
    const description = labeledInput(options.document, "カテゴリ説明", {
      name: "category-description",
    });
    const share = shareFields(
      options.document,
      "カテゴリ",
      "inherit",
      undefined,
    );
    form.append(name.wrapper, description.wrapper, share.fragment);
    const add = node(options.document, "button", "カテゴリを追加");
    add.type = "submit";
    form.append(add);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const mode = share.mode.value as ShareMode;
      const category: BudgetCategory = {
        id: options.createId(),
        name: name.input.value,
        description: description.input.value,
        shareMode: mode,
        sortOrder: state.budget.categories.filter(
          (candidate) => candidate.active,
        ).length,
        active: true,
      };
      if (mode === "custom")
        category.selfShareBasisPoints = basisPoints(
          share.percentage,
          "カテゴリ本人割合",
        );
      performAction({ type: "add-category", category });
    });
    section.append(form);
    const list = node(options.document, "div");
    list.className = "entity-list";
    const categories = [...state.budget.categories].sort(
      (a, b) =>
        Number(b.active) - Number(a.active) || a.sortOrder - b.sortOrder,
    );
    if (categories.length === 0)
      list.append(
        node(options.document, "p", "最初にカテゴリを追加してください。"),
      );
    for (const category of categories)
      list.append(renderCategoryCard(category, performAction));
    section.append(list);
    main.append(section);
  }

  function renderCategoryCard(
    category: Readonly<BudgetCategory>,
    performAction: (action: AppAction) => void,
  ): HTMLElement {
    const state = options.store.getState();
    const article = node(options.document, "article");
    article.className = "entity-card";
    article.append(node(options.document, "h4", category.name));
    article.append(
      node(options.document, "p", category.description || "説明なし"),
    );
    article.append(
      node(
        options.document,
        "p",
        category.active ? "状態：有効" : "状態：無効",
      ),
    );
    const actions = node(options.document, "div");
    actions.className = "button-row";
    const up = node(options.document, "button", `${category.name}を上へ`);
    up.disabled = !category.active || category.sortOrder === 0;
    up.addEventListener("click", () =>
      performAction({
        type: "move-category",
        categoryId: category.id,
        direction: "up",
      }),
    );
    const down = node(options.document, "button", `${category.name}を下へ`);
    down.disabled =
      !category.active ||
      category.sortOrder ===
        state.budget.categories.filter((candidate) => candidate.active).length -
          1;
    down.addEventListener("click", () =>
      performAction({
        type: "move-category",
        categoryId: category.id,
        direction: "down",
      }),
    );
    const toggle = node(
      options.document,
      "button",
      `${category.name}を${category.active ? "無効化" : "有効化"}`,
    );
    toggle.addEventListener("click", () =>
      performAction({
        type: "set-category-active",
        categoryId: category.id,
        active: !category.active,
      }),
    );
    actions.append(up, down, toggle);
    article.append(actions);
    const details = node(options.document, "details");
    details.append(node(options.document, "summary", "編集"));
    const edit = node(options.document, "form");
    edit.className = "form-grid compact";
    const name = labeledInput(options.document, `${category.name}の名前`, {
      name: "edit-category-name",
      value: category.name,
      required: true,
    });
    const description = labeledInput(
      options.document,
      `${category.name}の説明`,
      { name: "edit-category-description", value: category.description },
    );
    const share = shareFields(
      options.document,
      `${category.name}カテゴリ`,
      category.shareMode,
      category.selfShareBasisPoints,
    );
    const save = node(options.document, "button", "カテゴリ編集を保存");
    save.type = "submit";
    edit.append(name.wrapper, description.wrapper, share.fragment, save);
    edit.addEventListener("submit", (event) => {
      event.preventDefault();
      const mode = share.mode.value as ShareMode;
      performAction({
        type: "update-category",
        categoryId: category.id,
        changes: {
          name: name.input.value,
          description: description.input.value,
          shareMode: mode,
          selfShareBasisPoints:
            mode === "custom"
              ? basisPoints(share.percentage, "カテゴリ本人割合")
              : undefined,
        },
      });
    });
    details.append(edit);
    article.append(details);
    const hasItems = state.budget.items.some(
      (item) => item.categoryId === category.id,
    );
    const moveTargets = state.budget.categories.filter(
      (candidate) => candidate.active && candidate.id !== category.id,
    );
    let moveTargetSelect: HTMLSelectElement | undefined;
    if (hasItems && moveTargets.length > 0) {
      const moveTarget = labeledSelect(
        options.document,
        `${category.name}削除時の費目移動先`,
        "category-delete-target",
        required(moveTargets[0], "move target is missing").id,
        moveTargets.map(
          (target) => [target.id, target.name] as [string, string],
        ),
      );
      moveTargetSelect = moveTarget.select;
      article.append(moveTarget.wrapper);
    }
    const deleteButton = node(
      options.document,
      "button",
      `${category.name}を削除`,
    );
    deleteButton.addEventListener("click", () => {
      if (!options.browserWindow.confirm(`${category.name}を削除しますか？`))
        return;
      let moveToCategoryId: string | undefined;
      if (hasItems) {
        if (!moveTargetSelect) {
          ui.error = "費目があるカテゴリにはactiveな移動先が必要です";
          options.requestRender();
          return;
        }
        moveToCategoryId = moveTargetSelect.value;
      }
      performAction({
        type: "delete-category",
        categoryId: category.id,
        moveToCategoryId,
      });
    });
    article.append(deleteButton);
    return article;
  }

  function renderExpenses(
    main: HTMLElement,
    performAction: (action: AppAction) => void,
  ): void {
    const state = options.store.getState();
    const section = node(options.document, "section");
    section.append(node(options.document, "h3", "費目管理"));
    const activeCategories = state.budget.categories
      .filter((category) => category.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (activeCategories.length > 0)
      section.append(renderExpenseForm(activeCategories, performAction));
    else
      section.append(
        node(
          options.document,
          "p",
          "費目を追加するにはactiveなカテゴリが必要です。",
        ),
      );
    section.append(renderExpenseFilters());
    const categories = new Map(
      state.budget.categories.map((category) => [category.id, category]),
    );
    let items = state.budget.items.filter((item) => {
      const matchesSearch = item.purpose
        .toLocaleLowerCase("ja")
        .includes(ui.search.toLocaleLowerCase("ja"));
      const matchesCategory =
        ui.categoryFilter === "all" || item.categoryId === ui.categoryFilter;
      const matchesScope =
        ui.scopeFilter === "all" || item.scope === ui.scopeFilter;
      const matchesActive =
        ui.activeFilter === "all" ||
        item.active === (ui.activeFilter === "active");
      return matchesSearch && matchesCategory && matchesScope && matchesActive;
    });
    items = [...items].sort((left, right) => {
      if (ui.sort === "monthly")
        return monthlyExpenseYen(left) - monthlyExpenseYen(right);
      if (ui.sort === "category")
        return (categories.get(left.categoryId)?.name ?? "").localeCompare(
          categories.get(right.categoryId)?.name ?? "",
          "ja",
        );
      return left.purpose.localeCompare(right.purpose, "ja");
    });
    const list = node(options.document, "div");
    list.className = "entity-list expense-list";
    if (items.length === 0)
      list.append(
        node(
          options.document,
          "p",
          state.budget.items.length === 0
            ? "費目はまだありません。"
            : "条件に一致する費目はありません。",
        ),
      );
    for (const item of items)
      list.append(
        renderExpenseCard(
          item,
          required(
            categories.get(item.categoryId),
            "expense category is missing",
          ),
          activeCategories,
          performAction,
        ),
      );
    section.append(list);
    main.append(section);
  }

  function renderExpenseForm(
    activeCategories: readonly Readonly<BudgetCategory>[],
    performAction: (action: AppAction) => void,
  ): HTMLFormElement {
    const form = node(options.document, "form");
    form.className = "form-grid expense-form";
    const category = labeledSelect(
      options.document,
      "費目カテゴリ",
      "expense-category",
      required(activeCategories[0], "active category is missing").id,
      activeCategories.map((item) => [item.id, item.name] as [string, string]),
    );
    const purpose = labeledInput(options.document, "用途", {
      name: "expense-purpose",
      required: true,
    });
    const amount = labeledInput(options.document, "1回あたり出費", {
      name: "expense-amount",
      type: "number",
      min: "1",
      step: "1",
      required: true,
    });
    const cycle = labeledInput(options.document, "周期値", {
      name: "expense-cycle",
      type: "number",
      value: "1",
      min: "1",
      step: "1",
      required: true,
    });
    const unit = labeledSelect<CycleUnit>(
      options.document,
      "周期単位",
      "expense-unit",
      "month",
      [
        ["day", "日"],
        ["week", "週"],
        ["month", "月"],
        ["year", "年"],
      ],
    );
    const occurrences = labeledInput(options.document, "周期内回数", {
      name: "expense-occurrences",
      type: "number",
      value: "1",
      min: "1",
      step: "1",
      required: true,
    });
    const scope = labeledSelect<ExpenseScope>(
      options.document,
      "費目範囲",
      "expense-scope",
      "shared",
      [
        ["shared", "共同"],
        ["self", "本人"],
        ["partner", "相手"],
      ],
    );
    const share = shareFields(options.document, "費目", "inherit", undefined);
    const memo = labeledInput(options.document, "メモ", {
      name: "expense-memo",
    });
    form.append(
      category.wrapper,
      purpose.wrapper,
      amount.wrapper,
      cycle.wrapper,
      unit.wrapper,
      occurrences.wrapper,
      scope.wrapper,
      share.fragment,
      memo.wrapper,
    );
    const add = node(options.document, "button", "費目を追加");
    add.type = "submit";
    form.append(add);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selectedScope = scope.select.value as ExpenseScope;
      const selectedShare =
        selectedScope === "shared"
          ? (share.mode.value as ShareMode)
          : "inherit";
      const item: ExpenseItem = {
        id: options.createId(),
        categoryId: category.select.value,
        purpose: purpose.input.value,
        kind: "living-expense",
        scope: selectedScope,
        amountYen: integerValue(amount.input, "1回あたり出費"),
        cycleValue: integerValue(cycle.input, "周期値"),
        cycleUnit: unit.select.value as CycleUnit,
        occurrencesPerCycle: integerValue(occurrences.input, "周期内回数"),
        shareMode: selectedShare,
        source: { type: "manual" },
        memo: memo.input.value,
        active: true,
      };
      if (selectedShare === "custom")
        item.selfShareBasisPoints = basisPoints(
          share.percentage,
          "費目本人割合",
        );
      performAction({ type: "add-expense", item });
    });
    return form;
  }

  function renderExpenseFilters(): HTMLElement {
    const controls = node(options.document, "div");
    controls.className = "filter-grid";
    const search = labeledInput(options.document, "用途検索", {
      name: "expense-search",
      value: ui.search,
    });
    const categoryOptions: [string, string][] = [["all", "すべて"]];
    for (const category of options.store.getState().budget.categories)
      categoryOptions.push([category.id, category.name]);
    const category = labeledSelect(
      options.document,
      "カテゴリ絞り込み",
      "category-filter",
      ui.categoryFilter,
      categoryOptions,
    );
    const scope = labeledSelect(
      options.document,
      "scope絞り込み",
      "scope-filter",
      ui.scopeFilter,
      [
        ["all", "すべて"],
        ["shared", "共同"],
        ["self", "本人"],
        ["partner", "相手"],
      ],
    );
    const active = labeledSelect(
      options.document,
      "状態絞り込み",
      "active-filter",
      ui.activeFilter,
      [
        ["all", "すべて"],
        ["active", "有効"],
        ["inactive", "無効"],
      ],
    );
    const sort = labeledSelect(
      options.document,
      "並び替え",
      "expense-sort",
      ui.sort,
      [
        ["purpose", "用途"],
        ["category", "カテゴリ"],
        ["monthly", "月換算額"],
      ],
    );
    const captureSearchAndRender = (): void => {
      const selectionStart = search.input.selectionStart;
      const selectionEnd = search.input.selectionEnd;
      const selectionDirection = search.input.selectionDirection;
      ui.search = search.input.value;
      options.requestRender();
      const restored = options.document.querySelector<HTMLInputElement>(
        'input[name="expense-search"]',
      );
      if (!restored) return;
      restored.focus();
      if (selectionStart !== null && selectionEnd !== null) {
        restored.setSelectionRange(
          selectionStart,
          selectionEnd,
          selectionDirection ?? undefined,
        );
      }
    };
    let composing = false;
    search.input.addEventListener("compositionstart", () => {
      composing = true;
    });
    search.input.addEventListener("compositionend", () => {
      composing = false;
      captureSearchAndRender();
    });
    search.input.addEventListener("input", () => {
      ui.search = search.input.value;
      if (!composing) captureSearchAndRender();
    });
    const updateFilters = (): void => {
      ui.categoryFilter = category.select.value;
      ui.scopeFilter = scope.select.value as BudgetUiState["scopeFilter"];
      ui.activeFilter = active.select.value as BudgetUiState["activeFilter"];
      ui.sort = sort.select.value as BudgetUiState["sort"];
      options.requestRender();
    };
    category.select.addEventListener("change", updateFilters);
    scope.select.addEventListener("change", updateFilters);
    active.select.addEventListener("change", updateFilters);
    sort.select.addEventListener("change", updateFilters);
    controls.append(
      search.wrapper,
      category.wrapper,
      scope.wrapper,
      active.wrapper,
      sort.wrapper,
    );
    return controls;
  }

  function renderExpenseCard(
    item: Readonly<ExpenseItem>,
    category: Readonly<BudgetCategory>,
    activeCategories: readonly Readonly<BudgetCategory>[],
    performAction: (action: AppAction) => void,
  ): HTMLElement {
    const article = node(options.document, "article");
    article.className = "entity-card";
    article.append(node(options.document, "h4", item.purpose));
    article.append(node(options.document, "p", `カテゴリ：${category.name}`));
    article.append(
      node(options.document, "p", `頻度：${formatFrequency(item)}`),
    );
    article.append(
      node(
        options.document,
        "p",
        `月換算：${yen(Math.round(monthlyExpenseYen(item)))}`,
      ),
    );
    article.append(
      node(
        options.document,
        "p",
        `範囲：${item.scope}／状態：${item.active ? "有効" : "無効"}`,
      ),
    );
    const row = node(options.document, "div");
    row.className = "button-row";
    const duplicate = node(options.document, "button", `${item.purpose}を複製`);
    duplicate.addEventListener("click", () =>
      performAction({
        type: "duplicate-expense",
        itemId: item.id,
        newId: options.createId(),
      }),
    );
    const toggle = node(
      options.document,
      "button",
      `${item.purpose}を${item.active ? "無効化" : "有効化"}`,
    );
    toggle.addEventListener("click", () =>
      performAction({
        type: "set-expense-active",
        itemId: item.id,
        active: !item.active,
      }),
    );
    const remove = node(options.document, "button", `${item.purpose}を削除`);
    remove.addEventListener("click", () => {
      if (options.browserWindow.confirm(`${item.purpose}を削除しますか？`))
        performAction({ type: "delete-expense", itemId: item.id });
    });
    row.append(duplicate, toggle, remove);
    article.append(row);
    const details = node(options.document, "details");
    details.append(node(options.document, "summary", "編集"));
    const edit = renderExpenseForm(activeCategories, () => undefined);
    const replacement = edit.cloneNode(true) as HTMLFormElement;
    required(
      replacement.querySelector<HTMLSelectElement>('[name="expense-category"]'),
      "category control is missing",
    ).value = item.categoryId;
    required(
      replacement.querySelector<HTMLInputElement>('[name="expense-purpose"]'),
      "purpose control is missing",
    ).value = item.purpose;
    required(
      replacement.querySelector<HTMLInputElement>('[name="expense-amount"]'),
      "amount control is missing",
    ).value = String(item.amountYen);
    required(
      replacement.querySelector<HTMLInputElement>('[name="expense-cycle"]'),
      "cycle control is missing",
    ).value = String(item.cycleValue);
    required(
      replacement.querySelector<HTMLSelectElement>('[name="expense-unit"]'),
      "unit control is missing",
    ).value = item.cycleUnit;
    required(
      replacement.querySelector<HTMLInputElement>(
        '[name="expense-occurrences"]',
      ),
      "occurrences control is missing",
    ).value = String(item.occurrencesPerCycle);
    required(
      replacement.querySelector<HTMLSelectElement>('[name="expense-scope"]'),
      "scope control is missing",
    ).value = item.scope;
    required(
      replacement.querySelector<HTMLSelectElement>('[name="費目-share-mode"]'),
      "share control is missing",
    ).value = item.shareMode;
    required(
      replacement.querySelector<HTMLInputElement>('[name="費目-self-share"]'),
      "share percentage is missing",
    ).value = String((item.selfShareBasisPoints ?? 5000) / 100);
    required(
      replacement.querySelector<HTMLInputElement>('[name="expense-memo"]'),
      "memo control is missing",
    ).value = item.memo;
    required(
      replacement.querySelector("button"),
      "edit submit is missing",
    ).textContent = "費目編集を保存";
    replacement.addEventListener("submit", (event) => {
      event.preventDefault();
      const categoryId = required(
        replacement.querySelector<HTMLSelectElement>(
          '[name="expense-category"]',
        ),
        "category control is missing",
      ).value;
      const purpose = required(
        replacement.querySelector<HTMLInputElement>('[name="expense-purpose"]'),
        "purpose control is missing",
      ).value;
      const amountYen = integerValue(
        required(
          replacement.querySelector<HTMLInputElement>(
            '[name="expense-amount"]',
          ),
          "amount control is missing",
        ),
        "1回あたり出費",
      );
      const cycleValue = integerValue(
        required(
          replacement.querySelector<HTMLInputElement>('[name="expense-cycle"]'),
          "cycle control is missing",
        ),
        "周期値",
      );
      const cycleUnit = required(
        replacement.querySelector<HTMLSelectElement>('[name="expense-unit"]'),
        "unit control is missing",
      ).value as CycleUnit;
      const occurrencesPerCycle = integerValue(
        required(
          replacement.querySelector<HTMLInputElement>(
            '[name="expense-occurrences"]',
          ),
          "occurrences control is missing",
        ),
        "周期内回数",
      );
      const scope = required(
        replacement.querySelector<HTMLSelectElement>('[name="expense-scope"]'),
        "scope control is missing",
      ).value as ExpenseScope;
      const shareMode =
        scope === "shared"
          ? (required(
              replacement.querySelector<HTMLSelectElement>(
                '[name="費目-share-mode"]',
              ),
              "share control is missing",
            ).value as ShareMode)
          : "inherit";
      const selfShareBasisPoints =
        shareMode === "custom"
          ? basisPoints(
              required(
                replacement.querySelector<HTMLInputElement>(
                  '[name="費目-self-share"]',
                ),
                "share percentage is missing",
              ),
              "費目本人割合",
            )
          : undefined;
      const memo = required(
        replacement.querySelector<HTMLInputElement>('[name="expense-memo"]'),
        "memo control is missing",
      ).value;
      performAction({
        type: "update-expense",
        itemId: item.id,
        changes: {
          categoryId,
          purpose,
          scope,
          amountYen,
          cycleValue,
          cycleUnit,
          occurrencesPerCycle,
          shareMode,
          selfShareBasisPoints,
          memo,
          active: item.active,
        },
      });
    });
    details.append(replacement);
    article.append(details);
    return article;
  }
}
