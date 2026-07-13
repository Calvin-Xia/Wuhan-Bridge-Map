import type { ComposeOption } from "echarts/core";
import type { BarSeriesOption, PieSeriesOption } from "echarts/charts";
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import type { SurveyMetric } from "./data-validation";

export type ChartOption = ComposeOption<
  | BarSeriesOption
  | PieSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
>;

export interface ChartTheme {
  accent: string;
  chartTones: string[];
  evidence: string;
  ink: string;
  line: string;
  muted: string;
}

export function createBarChartOption(data: SurveyMetric[], color: string, theme: ChartTheme): ChartOption {
  return {
    animation: false,
    color: [color],
    tooltip: {
      trigger: "axis",
    },
    grid: {
      top: 22,
      right: 10,
      bottom: 68,
      left: 36,
    },
    xAxis: {
      type: "category",
      data: data.map((item) => item.label),
      axisLabel: {
        interval: 0,
        rotate: 28,
        margin: 12,
        color: theme.muted,
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: theme.muted,
      },
      splitLine: {
        lineStyle: {
          color: theme.line,
        },
      },
    },
    series: [
      {
        type: "bar",
        data: data.map((item) => item.value),
        barMaxWidth: 34,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
}

export function createPieChartOption(data: SurveyMetric[], theme: ChartTheme): ChartOption {
  return {
    animation: false,
    color: theme.chartTones,
    tooltip: {
      trigger: "item",
    },
    legend: {
      bottom: 0,
      left: "center",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        color: theme.muted,
      },
    },
    series: [createPieSeriesOption(data, theme)],
  };
}

export function createPieSeriesOption(data: SurveyMetric[], theme: ChartTheme): PieSeriesOption {
  return {
    type: "pie",
    radius: ["39%", "63%"],
    center: ["37%", "43%"],
    avoidLabelOverlap: true,
    label: {
      show: true,
      position: "outside",
      alignTo: "edge",
      edgeDistance: 8,
      bleedMargin: 4,
      color: theme.ink,
      fontSize: 12,
      lineHeight: 18,
      formatter: (params) => `${params.name}\n${params.percent}%`,
    },
    labelLine: {
      show: true,
      length: 10,
      length2: 8,
      lineStyle: {
        color: theme.line,
      },
    },
    labelLayout: {
      hideOverlap: false,
    },
    emphasis: {
      scale: true,
      scaleSize: 7,
      itemStyle: {
        shadowBlur: 12,
        shadowColor: "rgba(15, 26, 23, 0.22)",
      },
      label: {
        fontWeight: 800,
      },
    },
    data: data.map((item) => ({
      name: item.label,
      value: item.value,
    })),
  };
}
