import { describe, expect, it } from "vitest";
import { createBarChartOption, type ChartTheme } from "./chart-options";
import type { SurveyMetric } from "./data-validation";

const theme: ChartTheme = {
  accent: "#08768d",
  evidence: "#cf6245",
  ink: "#0f1a17",
  line: "#d4ddd8",
  muted: "#65736e",
  surface: "#f7f8f4",
};

const metrics: SurveyMetric[] = [
  { label: "熟悉", value: 6, percent: 60, detail: "最熟悉的桥梁" },
  { label: "听说过", value: 4, percent: 40 },
];

describe("createBarChartOption", () => {
  it("renders vertical bars with rotated labels and enough bottom room", () => {
    const option = createBarChartOption(metrics, theme.accent, theme);

    expect(option.grid).toMatchObject({ bottom: 78 });
    expect((option.xAxis as { type: string }).type).toBe("category");
    expect((option.xAxis as { axisLabel: { rotate: number } }).axisLabel.rotate).toBe(30);
    expect((option.series as { type: string }[])[0].type).toBe("bar");
  });

  it("lays out horizontal bars with truncated side labels", () => {
    const option = createBarChartOption(metrics, theme.accent, theme, { horizontal: true });

    expect(option.grid).toMatchObject({ left: 128 });
    expect(option.yAxis).toMatchObject({ type: "category", inverse: true });
  });

  it("highlights the top item with the evidence tone", () => {
    const option = createBarChartOption(metrics, theme.accent, theme, { highlightTop: true });
    const series = (option.series as { data: { itemStyle: { color: string } }[] }[])[0];

    expect(series.data[0].itemStyle.color).toBe(theme.evidence);
    expect(series.data[1].itemStyle.color).toBe(theme.accent);
  });

  it("formats percent labels without trailing zeros", () => {
    const option = createBarChartOption(
      [{ label: "a", value: 1, percent: 41.67 }],
      theme.accent,
      theme,
      { showValueLabels: true },
    );
    const formatter = (
      (option.series as { label: { formatter: (params: { data?: SurveyMetric; value: number }) => string } }[])[0]
        .label.formatter
    );

    expect(formatter({ data: { label: "a", value: 1, percent: 41.67 }, value: 1 })).toBe("41.67%");
    expect(formatter({ data: { label: "a", value: 1, percent: 60 }, value: 1 })).toBe("60%");
  });

  it("builds a rich tooltip from metric detail, count, percent and mean", () => {
    const option = createBarChartOption(
      [{ label: "x", value: 6, percent: 60, mean: 4.24, detail: "完整题项" }],
      theme.accent,
      theme,
    );
    const formatter = (
      option.tooltip as unknown as {
        formatter: (params: { name: string; data?: SurveyMetric }) => string;
      }
    ).formatter;

    const html = formatter({
      name: "x",
      data: { label: "x", value: 6, percent: 60, mean: 4.24, detail: "完整题项" },
    });

    expect(html).toContain("完整题项");
    expect(html).toContain("人数：6");
    expect(html).toContain("占比：60%");
    expect(html).toContain("均值：4.24");
  });

  it("plots percent on a pinned 0–100 axis when percentScale is on", () => {
    const option = createBarChartOption(metrics, theme.accent, theme, {
      percentScale: true,
      showValueLabels: true,
    });
    const series = (option.series as { data: { value: number; count: number }[] }[])[0];
    const yAxis = option.yAxis as { max: number; axisLabel: { formatter: (value: number) => string } };

    expect(series.data.map((item) => item.value)).toEqual([60, 40]);
    expect(series.data.map((item) => item.count)).toEqual([6, 4]);
    expect(yAxis.max).toBe(100);
    expect(yAxis.axisLabel.formatter(50)).toBe("50%");
  });

  it("keeps the headcount (not the percent) in the tooltip under percentScale", () => {
    const option = createBarChartOption(
      [{ label: "城市形象与记忆", value: 207, percent: 84.06, mean: 4.237, detail: "完整题项" }],
      theme.accent,
      theme,
      { percentScale: true },
    );
    const formatter = (
      option.tooltip as unknown as {
        formatter: (params: { name: string; data?: object }) => string;
      }
    ).formatter;

    const html = formatter({ name: "城市形象与记忆", data: { count: 207 } });

    expect(html).toContain("人数：207");
    expect(html).not.toContain("人数：84.06");
  });
});
