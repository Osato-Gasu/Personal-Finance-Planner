import type { Store } from "../../app/store";
import { calculatePayroll } from "../../domain/payroll";
import { selectInvestmentFundingContext } from "../../domain/investment-funding";
import {
  selectOverview,
  type OverviewMemberResult,
  type OverviewResult,
  type OverviewStatus,
} from "../../domain/overview";

interface Options {
  document: Document;
  store: Store;
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

const statusLabels: Record<OverviewStatus, string> = {
  "not-configured": "未設定",
  complete: "計算済み",
  invalid: "入力不正",
  incomplete: "入力不足",
  unsupported: "対象外",
  "missing-rule": "ルール未登録",
  "out-of-range": "計算範囲外",
};

function card(
  document: Document,
  label: string,
  value: number | null,
): HTMLElement {
  const result = node(document, "article");
  result.className = "summary-card";
  result.append(
    node(document, "h4", label),
    node(document, "strong", yen(value)),
  );
  return result;
}

function detailRows(
  document: Document,
  member: OverviewMemberResult,
): HTMLTableRowElement {
  const row = node(document, "tr");
  const values = [
    member.displayName,
    yen(member.grossMonthlyYen),
    yen(member.takeHomeMonthlyYen),
    yen(member.livingExpenseMonthlyYen),
    yen(member.afterLivingExpenseYen),
    yen(member.nisa.currentMonthContributionYen),
    yen(member.ideco.currentMonthContributionYen),
    yen(member.afterInvestmentYen),
  ];
  values.forEach((value, index) => {
    const cell = node(document, index === 0 ? "th" : "td", value);
    if (index === 0) cell.setAttribute("scope", "row");
    if (index > 0)
      cell.setAttribute(
        "data-label",
        [
          "",
          "月間総支給",
          "月間手取り",
          "月間生活費",
          "生活費差引後",
          "NISA",
          "iDeCo",
          "投資差引後",
        ][index] ?? "",
      );
    row.append(cell);
  });
  return row;
}

function statusList(document: Document, result: OverviewResult): HTMLElement {
  const section = node(document, "section");
  section.append(node(document, "h3", "人物別の計算状態"));
  const list = node(document, "ul");
  for (const member of result.members) {
    list.append(
      node(
        document,
        "li",
        `${member.displayName}: 手取り ${statusLabels[member.takeHomeStatus]}／NISA ${statusLabels[member.nisa.status]}／iDeCo ${statusLabels[member.ideco.status]}`,
      ),
    );
  }
  section.append(list);
  return section;
}

function renderOverview(
  document: Document,
  result: OverviewResult,
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const intro = node(document, "p", `基準年月: ${result.referenceMonth}`);
  intro.dataset.testid = "overview-reference-month";
  fragment.append(intro);

  const household = node(document, "section");
  household.dataset.testid = "overview-household";
  household.append(node(document, "h3", "世帯サマリー"));
  const grid = node(document, "div");
  grid.className = "summary-grid";
  grid.append(
    card(document, "月間総支給", result.household.grossMonthlyYen),
    card(document, "月間手取り", result.household.takeHomeMonthlyYen),
    card(document, "月間生活費", result.household.livingExpenseMonthlyYen),
    card(document, "生活費差引後", result.household.afterLivingExpenseYen),
    card(document, "月間NISA拠出", result.household.nisaContributionYen),
    card(document, "月間iDeCo掛金", result.household.idecoContributionYen),
    card(document, "月間投資額", result.household.investmentContributionYen),
    card(document, "投資差引後", result.household.afterInvestmentYen),
    card(document, "想定元本", result.household.projectedPrincipalYen),
    card(document, "想定残高", result.household.projectedBalanceYen),
    card(document, "想定運用益", result.household.projectedGainYen),
    card(document, "実質価値", result.household.realValueYen),
  );
  household.append(grid);
  fragment.append(household);

  const details = node(document, "section");
  details.append(node(document, "h3", "人物別サマリー"));
  const wrapper = node(document, "div");
  wrapper.className = "overview-table-wrapper";
  const table = node(document, "table");
  table.className = "summary-table overview-table";
  const caption = node(document, "caption", "月間の収支と投資");
  const head = node(document, "thead");
  const headRow = node(document, "tr");
  [
    "人物",
    "月間総支給",
    "月間手取り",
    "月間生活費",
    "生活費差引後",
    "NISA",
    "iDeCo",
    "投資差引後",
  ].forEach((label) => headRow.append(node(document, "th", label)));
  head.append(headRow);
  const body = node(document, "tbody");
  result.members.forEach((member) => body.append(detailRows(document, member)));
  table.append(caption, head, body);
  wrapper.append(table);
  details.append(wrapper);
  fragment.append(details, statusList(document, result));

  const assets = node(document, "section");
  assets.append(node(document, "h3", "人物別資産形成"));
  const assetWrapper = node(document, "div");
  assetWrapper.className = "overview-table-wrapper";
  const assetTable = node(document, "table");
  assetTable.className = "summary-table overview-table";
  assetTable.append(node(document, "caption", "NISA・iDeCoの既存投影結果"));
  const assetHead = node(document, "thead");
  const assetHeadRow = node(document, "tr");
  [
    "人物",
    "NISA想定残高",
    "iDeCo想定残高",
    "想定元本合計",
    "想定残高合計",
    "想定運用益合計",
    "実質価値合計",
  ].forEach((label) => assetHeadRow.append(node(document, "th", label)));
  assetHead.append(assetHeadRow);
  const assetBody = node(document, "tbody");
  for (const member of result.members) {
    const row = node(document, "tr");
    const values = [
      member.displayName,
      yen(member.nisa.projectedBalanceYen),
      yen(member.ideco.projectedBalanceYen),
      yen(member.projectedPrincipalYen),
      yen(member.projectedBalanceYen),
      yen(member.projectedGainYen),
      yen(member.realValueYen),
    ];
    const labels = [
      "",
      "NISA想定残高",
      "iDeCo想定残高",
      "想定元本合計",
      "想定残高合計",
      "想定運用益合計",
      "実質価値合計",
    ];
    values.forEach((value, index) => {
      const cell = node(document, index === 0 ? "th" : "td", value);
      if (index === 0) cell.setAttribute("scope", "row");
      else cell.setAttribute("data-label", labels[index] ?? "");
      row.append(cell);
    });
    assetBody.append(row);
  }
  assetTable.append(assetHead, assetBody);
  assetWrapper.append(assetTable);
  assets.append(assetWrapper);
  fragment.append(assets);

  const remediation = node(document, "p");
  remediation.className = "overview-remediation";
  remediation.append(
    node(document, "span", "未設定・入力不足は各画面で確認してください: "),
  );
  [
    ["家計・生活費", "#/budget", "家計入力へ"],
    ["手取り計算", "#/take-home", "手取り入力へ"],
    ["NISA・iDeCo", "#/investments", "投資入力へ"],
  ].forEach(([label, href, ariaLabel], index) => {
    if (index > 0) remediation.append(document.createTextNode(" / "));
    const link = node(document, "a", label);
    link.href = href ?? "#/overview";
    link.setAttribute("aria-label", ariaLabel ?? label ?? "入力画面へ");
    remediation.append(link);
  });
  fragment.append(remediation);

  const warnings = node(document, "section");
  warnings.dataset.testid = "overview-warnings";
  warnings.append(node(document, "h3", "警告・前提"));
  if (result.warnings.length === 0) {
    warnings.append(node(document, "p", "警告はありません。"));
  } else {
    const list = node(document, "ul");
    result.warnings.forEach((item) => {
      const entry = node(document, "li", `[${item.category}] ${item.message}`);
      entry.dataset.warningKey = item.key;
      list.append(entry);
    });
    warnings.append(list);
  }
  fragment.append(warnings);

  const evidence = node(document, "section");
  evidence.dataset.testid = "overview-rules";
  evidence.append(node(document, "h3", "適用ルールと根拠"));
  if (result.rules.length === 0) {
    evidence.append(node(document, "p", "適用済みルールはありません。"));
  } else {
    for (const rule of result.rules) {
      const article = node(document, "article");
      article.className = "overview-rule";
      article.append(
        node(document, "h4", `${rule.domain}: ${rule.id}`),
        node(
          document,
          "p",
          `適用期間: ${rule.effectiveFrom}～${rule.effectiveTo ?? "継続中"}／状態: ${rule.status}／確認日: ${rule.verifiedAt}`,
        ),
      );
      const list = node(document, "ul");
      rule.sources.forEach((source) => {
        const item = node(document, "li");
        const link = node(
          document,
          "a",
          `${source.title}（${source.publisher}）`,
        );
        link.href = source.url;
        link.rel = "noreferrer";
        item.append(link);
        list.append(item);
      });
      article.append(list);
      evidence.append(article);
    }
  }
  fragment.append(evidence);
  return fragment;
}

export function createOverviewRenderer(
  options: Options,
): (container: HTMLElement) => void {
  return (container) => {
    try {
      const state = options.store.getState();
      const referenceDate = options.getReferenceDate();
      const result = selectOverview(state, referenceDate);
      const pipeline = node(options.document, "section");
      pipeline.className = "pipeline-overview";
      pipeline.append(node(options.document, "h3", "お金の流れ"));
      const steps = node(options.document, "ol");
      steps.className = "pipeline-steps";
      const currentYear = Number(referenceDate.slice(0, 4));
      const activePayroll = state.payrollPlans.filter(
        (plan) => plan.active && plan.targetYear === currentYear,
      );
      const funding = selectInvestmentFundingContext(state, referenceDate);
      const statuses = [
        [
          "給与計算",
          "#/payroll",
          activePayroll.length > 0 ? "設定済み" : "未設定",
        ],
        [
          "手取り計算",
          "#/take-home",
          result.members.some((member) => member.takeHomeStatus === "complete")
            ? "計算済み"
            : "未計算",
        ],
        [
          "家計簿",
          "#/budget",
          funding.household.availableYen === null ? "未計算" : "計算済み",
        ],
        [
          "NISA+iDeCo",
          "#/investments",
          funding.status === "available" ? "確認済み" : "未計算",
        ],
      ] as const;
      statuses.forEach(([label, href, status]) => {
        const item = node(options.document, "li");
        const link = node(options.document, "a", label);
        link.href = href;
        link.setAttribute("aria-label", `${label}へ移動`);
        item.append(link, node(options.document, "span", status));
        steps.append(item);
      });
      pipeline.append(steps);
      if (activePayroll.length > 0) {
        try {
          const payrollResults = activePayroll.map(calculatePayroll);
          const sum = (
            key: "monthlyGrossYen" | "annualGrossYen",
          ): number | null => {
            const value = payrollResults.reduce(
              (total, item) => total + BigInt(item[key]),
              0n,
            );
            return value <= BigInt(Number.MAX_SAFE_INTEGER)
              ? Number(value)
              : null;
          };
          const grid = node(options.document, "div");
          grid.className = "summary-grid";
          grid.append(
            card(
              options.document,
              "月間総支給（給与計算）",
              sum("monthlyGrossYen"),
            ),
            card(
              options.document,
              "年間総支給（給与計算）",
              sum("annualGrossYen"),
            ),
            card(
              options.document,
              "家計簿後の残額（投資可能額）",
              funding.household.availableYen,
            ),
            card(
              options.document,
              "現在のNISA+iDeCo",
              funding.household.totalContributionYen,
            ),
            card(
              options.document,
              "投資後残額",
              funding.household.remainingAfterInvestmentYen,
            ),
          );
          pipeline.append(grid);
        } catch {
          pipeline.append(
            node(
              options.document,
              "p",
              "給与計算KPIは入力を確認してください。",
            ),
          );
        }
      }
      container.append(pipeline, renderOverview(options.document, result));
    } catch (error) {
      const alert = node(
        options.document,
        "p",
        `統合サマリーを表示できません。${error instanceof Error ? ` ${error.message}` : ""}`,
      );
      alert.setAttribute("role", "alert");
      container.append(alert);
    }
  };
}
