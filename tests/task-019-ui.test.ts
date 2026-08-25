import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import viewSource from "../src/modules/take-home/take-home-view.ts?raw";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("TASK-019 compact Take-home UI contract", () => {
  it("uses an automatic self/current-year context and a two-column work layout", () => {
    expect(viewSource).toContain("本人 / ${String(year)}年（自動）");
    expect(viewSource).toContain("work-tab-layout take-home-layout");
    expect(viewSource).not.toContain("人物を選択");
    expect(viewSource).not.toContain("対象年を入力");
  });

  it("shows only the three primary KPIs with the annualized-average disclosure", () => {
    expect(viewSource).toContain("平均月間手取り（概算）");
    expect(viewSource).toContain("年間手取り（概算）");
    expect(viewSource).toContain("税・社会保険合計");
    expect(viewSource).toContain(
      "平均月間手取りは年間手取りを12分割した平均です。",
    );
    expect(viewSource).toContain("実際の各月の振込額ではありません");
    expect(viewSource).toContain("配偶者・扶養控除はモデル化していません");
  });

  it("keeps statutory Payroll amounts visible and practical income outside the tax source", () => {
    expect(viewSource).toContain("月収（給与計算から）");
    expect(viewSource).toContain("年間総支給（賞与込）");
    expect(viewSource).toContain("通勤手当（月）");
    expect(viewSource).toContain(
      "ガソリン差引後の実質月収は税・社会保険計算に使用しません",
    );
  });

  it("requires explicit one-time confirmation before atomic preview persistence", () => {
    const confirmation = viewSource.indexOf("browserWindow.confirm");
    const persistence = viewSource.indexOf(
      "createTakeHomePreviewPersistenceAction",
      confirmation,
    );
    expect(confirmation).toBeGreaterThan(0);
    expect(persistence).toBeGreaterThan(confirmation);
    expect(viewSource).toContain("1社勤務・通年在籍・給与所得のみ");
    expect(viewSource).toContain("雇用保険事業区分は「一般」");
  });

  it("keeps technical controls collapsed and checkbox/layout CSS scoped", () => {
    expect(viewSource).toContain('node(document, "details")');
    expect(viewSource).toContain("詳細計算設定（保存済みの値・例外設定）");
    expect(viewSource).not.toContain("advanced.open = true");
    expect(styles).toContain('.take-home-card input[type="checkbox"]');
    expect(styles).toContain("inline-size: 1rem");
    expect(styles).toMatch(
      /@media \(max-width: 40rem\)[\s\S]*?\.take-home-primary-results/,
    );
  });
});
