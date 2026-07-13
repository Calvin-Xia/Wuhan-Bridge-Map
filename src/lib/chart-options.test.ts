import { describe, expect, it } from "vitest";
import {
  createBarChartOption,
  createPieSeriesOption,
  type ChartTheme,
} from "./chart-options";

const theme: ChartTheme = {
  accent: "#cf6245",
  chartTones: ["#cf6245", "#08768d", "#9f7741"],
  evidence: "#08768d",
  ink: "#0f1a17",
  line: "#d4ddd8",
  muted: "#65736e",
};

const metrics = [
  { label: "熟悉", value: 6 },
  { label: "听说过", value: 4 },
];

describe("chart option factories", () => {
  it("keeps pie annotations outside the ring and emphasizes the hovered slice", () => {
    const pie = createPieSeriesOption(metrics, theme);

    expect(pie.type).toBe("pie");
    expect(pie.radius).toEqual(["39%", "63%"]);
    expect(pie.center).toEqual(["37%", "43%"]);
    expect(pie.avoidLabelOverlap).toBe(true);
    expect(pie.label).toMatchObject({
      show: true,
      position: "outside",
      alignTo: "edge",
      edgeDistance: 8,
      bleedMargin: 4,
      color: theme.ink,
      fontSize: 12,
      lineHeight: 18,
    });
    expect(pie.labelLine).toMatchObject({
      show: true,
      length: 10,
      length2: 8,
      lineStyle: { color: theme.line },
    });
    expect(pie.labelLayout).toEqual({ hideOverlap: false });
    expect(pie.emphasis).toMatchObject({
      scale: true,
      scaleSize: 7,
      itemStyle: {
        shadowBlur: 12,
        shadowColor: "rgba(15, 26, 23, 0.22)",
      },
      label: { fontWeight: 800 },
    });
    expect(pie.data).toEqual([
      { name: "熟悉", value: 6 },
      { name: "听说过", value: 4 },
    ]);

    const formatter = pie.label?.formatter;
    expect(typeof formatter).toBe("function");
    if (typeof formatter === "function") {
      expect(formatter({ name: "熟悉", percent: 60 } as never)).toBe("熟悉\n60%");
    }
  });

  it("leaves enough bottom room for rotated bar labels", () => {
    const bar = createBarChartOption(metrics, theme.accent, theme);

    expect(bar.grid).toMatchObject({ bottom: 68 });
    expect(bar.xAxis).toMatchObject({
      axisLabel: {
        margin: 12,
      },
    });
  });
});
