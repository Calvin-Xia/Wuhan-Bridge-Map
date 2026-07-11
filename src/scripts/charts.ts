import * as echarts from "echarts/core";
import { BarChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  type TooltipComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ComposeOption, ECharts } from "echarts/core";
import type { BarSeriesOption, PieSeriesOption } from "echarts/charts";
import type { GridComponentOption, LegendComponentOption } from "echarts/components";
import type { SurveyMetric, SurveySummary } from "../lib/data-validation";

type ChartOption = ComposeOption<
  BarSeriesOption | PieSeriesOption | GridComponentOption | LegendComponentOption | TooltipComponentOption
>;

echarts.use([BarChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

void initCharts();

async function initCharts() {
  const survey = await fetchJson<SurveySummary>("/data/survey-summary.json");
  const theme = readTheme();
  const charts = [
    mountBarChart("chart-familiar", survey.familiarBridges, theme.accent),
    mountPieChart("chart-sources", survey.cognitionSources, theme),
    mountBarChart("chart-understanding", survey.developmentUnderstanding, theme.evidence),
  ].filter((chart): chart is ECharts => Boolean(chart));

  window.addEventListener("resize", () => {
    for (const chart of charts) {
      chart.resize();
    }
  });
}

function mountBarChart(id: string, data: SurveyMetric[], color: string): ECharts | null {
  const element = document.getElementById(id);
  if (!element) return null;

  const chart = echarts.init(element);
  const theme = readTheme();
  const option: ChartOption = {
    animation: false,
    color: [color],
    tooltip: {
      trigger: "axis",
    },
    grid: {
      top: 22,
      right: 10,
      bottom: 56,
      left: 36,
    },
    xAxis: {
      type: "category",
      data: data.map((item) => item.label),
      axisLabel: {
        interval: 0,
        rotate: 28,
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

  chart.setOption(option);
  return chart;
}

function mountPieChart(id: string, data: SurveyMetric[], theme: ChartTheme): ECharts | null {
  const element = document.getElementById(id);
  if (!element) return null;

  const chart = echarts.init(element);
  const option: ChartOption = {
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
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "43%"],
        avoidLabelOverlap: true,
        label: {
          formatter: "{b}\n{d}%",
          color: theme.ink,
        },
        data: data.map((item) => ({
          name: item.label,
          value: item.value,
        })),
      },
    ],
  };

  chart.setOption(option);
  return chart;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

interface ChartTheme {
  accent: string;
  chartTones: string[];
  evidence: string;
  ink: string;
  line: string;
  muted: string;
}

function readTheme(): ChartTheme {
  const styles = getComputedStyle(document.documentElement);

  return {
    accent: readCssVar(styles, "--accent"),
    chartTones: [
      readCssVar(styles, "--chart-tone-1"),
      readCssVar(styles, "--chart-tone-2"),
      readCssVar(styles, "--chart-tone-3"),
      readCssVar(styles, "--chart-tone-4"),
      readCssVar(styles, "--evidence"),
    ],
    evidence: readCssVar(styles, "--evidence"),
    ink: readCssVar(styles, "--text"),
    line: readCssVar(styles, "--border"),
    muted: readCssVar(styles, "--text-secondary"),
  };
}

function readCssVar(styles: CSSStyleDeclaration, name: string): string {
  return styles.getPropertyValue(name).trim();
}
