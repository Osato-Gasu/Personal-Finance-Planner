import type { Store } from "../../app/store";
import { selectLifePlan } from "../../domain/life-plan";
import type { LifePlanEvent } from "../../domain/state";

interface Options {
  document: Document;
  store: Store;
  createId: () => string;
  getSuggestedReferenceDate: () => string;
  requestRender: () => void;
}

function node<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  text?: string,
): HTMLElementTagNameMap[K] {
  const value = document.createElement(tag);
  if (text !== undefined) value.textContent = text;
  return value;
}

function field(
  document: Document,
  labelText: string,
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): HTMLLabelElement {
  const label = node(document, "label");
  label.append(node(document, "span", labelText), input);
  return label;
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

function parseInteger(value: string, label: string): number {
  if (!/^\d+$/.test(value))
    throw new Error(`${label}は0以上の整数で入力してください。`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed))
    throw new Error(`${label}が入力可能な範囲を超えています。`);
  return parsed;
}

function parsePositiveInteger(value: string, label: string): number {
  const parsed = parseInteger(value, label);
  if (parsed < 1) throw new Error(`${label}は1以上で入力してください。`);
  return parsed;
}

function setStatus(target: HTMLElement, message: string, error = false): void {
  target.textContent = message;
  target.setAttribute("role", error ? "alert" : "status");
}

function yen(value: number | null, signed = false): string {
  if (value === null) return "未計算";
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${value.toLocaleString("ja-JP")}円`;
}

function eventFields(
  document: Document,
  initial?: Readonly<LifePlanEvent>,
): {
  root: HTMLDivElement;
  read: () => Omit<LifePlanEvent, "id">;
} {
  const root = node(document, "div");
  root.className = "form-grid";
  const name = input(document, "text", initial?.name ?? "");
  name.maxLength = 80;
  const kind = node(document, "select");
  [
    ["income", "収入"],
    ["expense", "支出"],
  ].forEach(([value, label]) => {
    const option = node(document, "option", label);
    option.value = value ?? "";
    kind.append(option);
  });
  kind.value = initial?.kind ?? "expense";
  const start = input(
    document,
    "number",
    String(initial?.startYear ?? new Date().getFullYear()),
  );
  start.min = "1";
  start.max = "9999";
  const end = input(
    document,
    "number",
    String(initial?.endYear ?? new Date().getFullYear()),
  );
  end.min = "1";
  end.max = "9999";
  const amount = input(
    document,
    "number",
    String(initial?.annualAmountYen ?? 0),
  );
  amount.min = "0";
  amount.step = "1";
  const memo = node(document, "textarea");
  memo.value = initial?.memo ?? "";
  memo.maxLength = 500;
  const active = input(document, "checkbox", "");
  active.checked = initial?.active ?? true;
  root.append(
    field(document, "イベント名", name),
    field(document, "種類", kind),
    field(document, "開始年", start),
    field(document, "終了年", end),
    field(document, "年間金額（円）", amount),
    field(document, "メモ", memo),
    field(document, "有効", active),
  );
  return {
    root,
    read: () => ({
      name: name.value.trim(),
      kind: kind.value as LifePlanEvent["kind"],
      startYear: parsePositiveInteger(start.value, "開始年"),
      endYear: parsePositiveInteger(end.value, "終了年"),
      annualAmountYen: parseInteger(amount.value, "年間金額"),
      memo: memo.value,
      active: active.checked,
    }),
  };
}

export function createLifePlanRenderer(
  options: Options,
): (container: HTMLElement) => void {
  let editingEventId: string | null = null;
  return (container) => {
    const { document, store } = options;
    const state = store.getState();
    const status = node(document, "p");
    status.className = "operation-status";
    status.dataset.testid = "life-plan-operation-status";

    const disclosure = node(document, "section");
    disclosure.className = "life-plan-disclosure";
    disclosure.dataset.testid = "life-plan-disclosure";
    disclosure.append(node(document, "h3", "この投影の前提"));
    const disclosureList = node(document, "ul");
    [
      "保存した基準日の投資後手残りを、将来も固定して使用します。",
      "給与・税・社会保険・生活費・投資額の将来変化は自動反映しません。",
      "開始時現預金は、保存した投影開始年の1月1日期首残高として使用します。",
      "最初の投影行も完全な1暦年です。",
      "経過月による按分は行いません。",
      "ブラウザーの年越しでは、保存済みの基準日と開始年は変わりません。",
      "ライフイベントだけを各暦年に加減算します。",
      "将来の制度や運用成果を予測するものではありません。",
    ].forEach((text) => disclosureList.append(node(document, "li", text)));
    disclosure.append(disclosureList);
    container.append(disclosure);

    const settings = node(document, "section");
    settings.append(node(document, "h3", "投影設定"));
    const settingsForm = node(document, "form");
    settingsForm.className = "form-grid";
    settingsForm.dataset.testid = "life-plan-settings-form";
    const baseDate = input(
      document,
      "date",
      state.lifePlan.baseReferenceDate ?? options.getSuggestedReferenceDate(),
    );
    const startYear = input(
      document,
      "number",
      state.lifePlan.projectionStartYear === null
        ? ""
        : String(state.lifePlan.projectionStartYear),
    );
    startYear.min = "1";
    startYear.max = "9999";
    const startingAssets = input(
      document,
      "number",
      String(state.lifePlan.startingLiquidAssetsYen),
    );
    startingAssets.min = "0";
    startingAssets.step = "1";
    const years = input(
      document,
      "number",
      String(state.lifePlan.projectionYears),
    );
    years.min = "1";
    years.max = "60";
    const saveSettings = node(document, "button", "設定を保存");
    saveSettings.type = "submit";
    settingsForm.append(
      field(document, "手残り計算の基準日", baseDate),
      field(document, "投影開始年（1月1日時点）", startYear),
      field(document, "開始年1月1日の現預金残高（円）", startingAssets),
      field(document, "投影年数（1～60年）", years),
      saveSettings,
    );
    settingsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        store.dispatch({
          type: "update-life-plan-settings",
          baseReferenceDate: baseDate.value === "" ? null : baseDate.value,
          projectionStartYear:
            startYear.value === ""
              ? null
              : parsePositiveInteger(startYear.value, "投影開始年"),
          startingLiquidAssetsYen: parseInteger(
            startingAssets.value,
            "開始時現預金残高",
          ),
          projectionYears: parsePositiveInteger(years.value, "投影年数"),
        });
      } catch (error) {
        setStatus(
          status,
          error instanceof Error ? error.message : "設定を保存できません。",
          true,
        );
      }
    });
    settings.append(settingsForm);
    container.append(settings);

    const eventsSection = node(document, "section");
    eventsSection.append(node(document, "h3", "ライフイベント"));
    const addForm = node(document, "form");
    addForm.dataset.testid = "life-plan-add-event-form";
    const addFields = eventFields(document);
    const addButton = node(document, "button", "イベントを追加");
    addButton.type = "submit";
    addForm.append(addFields.root, addButton);
    addForm.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        store.dispatch({
          type: "add-life-plan-event",
          event: { id: options.createId(), ...addFields.read() },
        });
      } catch (error) {
        setStatus(
          status,
          error instanceof Error ? error.message : "イベントを追加できません。",
          true,
        );
      }
    });
    eventsSection.append(addForm);

    const eventList = node(document, "div");
    eventList.className = "entity-list";
    for (const item of state.lifePlan.events) {
      const card = node(document, "article");
      card.className = "entity-card life-plan-event";
      if (!item.active) card.classList.add("inactive-event");
      card.dataset.eventId = item.id;
      card.append(
        node(document, "h4", item.name),
        node(
          document,
          "p",
          `${item.kind === "income" ? "収入" : "支出"}／${String(item.startYear)}～${String(item.endYear)}年／${yen(item.annualAmountYen)}／${item.active ? "有効" : "無効"}`,
        ),
      );
      if (item.memo !== "") card.append(node(document, "p", item.memo));
      if (editingEventId === item.id) {
        const editForm = node(document, "form");
        const editFields = eventFields(document, item);
        const save = node(document, "button", "変更を保存");
        save.type = "submit";
        const cancel = node(document, "button", "編集をキャンセル");
        cancel.type = "button";
        cancel.addEventListener("click", () => {
          editingEventId = null;
          options.requestRender();
        });
        editForm.append(editFields.root, save, cancel);
        editForm.addEventListener("submit", (event) => {
          event.preventDefault();
          try {
            store.dispatch({
              type: "update-life-plan-event",
              eventId: item.id,
              event: editFields.read(),
            });
            editingEventId = null;
          } catch (error) {
            setStatus(
              status,
              error instanceof Error
                ? error.message
                : "イベントを更新できません。",
              true,
            );
          }
        });
        card.append(editForm);
      } else {
        const buttons = node(document, "div");
        buttons.className = "button-row";
        const edit = node(document, "button", "編集");
        edit.type = "button";
        edit.addEventListener("click", () => {
          editingEventId = item.id;
          options.requestRender();
        });
        const toggle = node(
          document,
          "button",
          item.active ? "無効にする" : "有効にする",
        );
        toggle.type = "button";
        toggle.addEventListener("click", () => {
          try {
            store.dispatch({
              type: "set-life-plan-event-active",
              eventId: item.id,
              active: !item.active,
            });
          } catch (error) {
            setStatus(
              status,
              error instanceof Error ? error.message : "状態を変更できません。",
              true,
            );
          }
        });
        const remove = node(document, "button", "削除");
        remove.type = "button";
        remove.addEventListener("click", () => {
          try {
            store.dispatch({
              type: "delete-life-plan-event",
              eventId: item.id,
            });
          } catch (error) {
            setStatus(
              status,
              error instanceof Error ? error.message : "削除できません。",
              true,
            );
          }
        });
        buttons.append(edit, toggle, remove);
        card.append(buttons);
      }
      eventList.append(card);
    }
    if (state.lifePlan.events.length === 0)
      eventList.append(node(document, "p", "登録済みイベントはありません。"));
    eventsSection.append(eventList);
    container.append(eventsSection);

    const resultSection = node(document, "section");
    resultSection.dataset.testid = "life-plan-result";
    resultSection.append(node(document, "h3", "年間キャッシュフロー"));
    try {
      const result = selectLifePlan(state);
      resultSection.append(
        node(document, "p", `状態: ${result.status}`),
        node(document, "p", `基準日: ${result.baseReferenceDate ?? "未設定"}`),
        node(
          document,
          "p",
          `月間投資後手残り: ${yen(result.baseMonthlyCashflowYen, true)}`,
        ),
        node(
          document,
          "p",
          `年間固定キャッシュフロー: ${yen(result.baseAnnualCashflowYen, true)}`,
        ),
      );
      if (result.warnings.length > 0) {
        const warnings = node(document, "ul");
        warnings.className = "life-plan-warnings";
        result.warnings.forEach((warning) =>
          warnings.append(node(document, "li", warning.message)),
        );
        resultSection.append(warnings);
      }
      if (result.years.length > 0) {
        const wrapper = node(document, "div");
        wrapper.className = "overview-table-wrapper";
        const table = node(document, "table");
        table.className = "summary-table life-plan-table";
        table.append(node(document, "caption", "暦年ごとの現預金残高投影"));
        const head = node(document, "thead");
        const headRow = node(document, "tr");
        [
          "年",
          "期首残高",
          "固定CF",
          "イベント収入",
          "イベント支出",
          "期末残高",
        ].forEach((label) => {
          const cell = node(document, "th", label);
          cell.setAttribute("scope", "col");
          headRow.append(cell);
        });
        head.append(headRow);
        const body = node(document, "tbody");
        result.years.forEach((row) => {
          const tableRow = node(document, "tr");
          if (row.closingLiquidAssetsYen < 0)
            tableRow.className = "negative-balance";
          const values = [
            String(row.year),
            yen(row.openingLiquidAssetsYen),
            yen(row.baseAnnualCashflowYen, true),
            yen(row.eventIncomeYen, true),
            yen(-row.eventExpenseYen, true),
            `${row.closingLiquidAssetsYen < 0 ? "残高不足: " : ""}${yen(row.closingLiquidAssetsYen)}`,
          ];
          values.forEach((value, index) => {
            const cell = node(document, index === 0 ? "th" : "td", value);
            if (index === 0) cell.setAttribute("scope", "row");
            cell.setAttribute(
              "data-label",
              [
                "年",
                "期首残高",
                "固定CF",
                "イベント収入",
                "イベント支出",
                "期末残高",
              ][index] ?? "",
            );
            tableRow.append(cell);
          });
          body.append(tableRow);
        });
        table.append(head, body);
        wrapper.append(table);
        resultSection.append(wrapper);
      }
    } catch (error) {
      setStatus(
        status,
        error instanceof Error ? error.message : "投影を表示できません。",
        true,
      );
    }
    container.append(resultSection, status);
  };
}
