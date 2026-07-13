import * as echarts from "echarts/core";
import { BarChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ECharts } from "echarts/core";
import type { SurveyMetric, SurveySummary } from "../lib/data-validation";
import {
  createBarChartOption,
  createPieChartOption,
  type ChartTheme,
} from "../lib/chart-options";
import { THEME_CHANGE_EVENT } from "../lib/theme-preferences";

echarts.use([BarChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

void initCharts();

async function initCharts() {
  const survey = await fetchJson<SurveySummary>("/data/survey-summary.json");
  const theme = readTheme();
  const charts = [
    mountBarChart("chart-familiar", survey.familiarBridges, "accent", theme),
    mountPieChart("chart-sources", survey.cognitionSources, theme),
    mountBarChart("chart-understanding", survey.developmentUnderstanding, "evidence", theme),
  ].filter((chart): chart is ChartBinding => Boolean(chart));

  window.addEventListener("resize", () => {
    for (const binding of charts) {
      binding.chart.resize();
    }
  });

  window.addEventListener(THEME_CHANGE_EVENT, () => {
    const nextTheme = readTheme();
    for (const binding of charts) {
      binding.chart.setOption(binding.getOption(nextTheme), true);
    }
  });
}

type ChartBinding = {
  chart: ECharts;
  getOption: (theme: ChartTheme) => ReturnType<typeof createBarChartOption>;
};

type BarTone = "accent" | "evidence";

function mountBarChart(id: string, data: SurveyMetric[], tone: BarTone, theme: ChartTheme): ChartBinding | null {
  const element = document.getElementById(id);
  if (!element) return null;

  const chart = echarts.init(element);
  const getOption = (nextTheme: ChartTheme) =>
    createBarChartOption(data, tone === "accent" ? nextTheme.accent : nextTheme.evidence, nextTheme);

  chart.setOption(getOption(theme));
  return { chart, getOption };
}

function mountPieChart(id: string, data: SurveyMetric[], theme: ChartTheme): ChartBinding | null {
  const element = document.getElementById(id);
  if (!element) return null;

  const chart = echarts.init(element);
  const getOption = (nextTheme: ChartTheme) => createPieChartOption(data, nextTheme);

  chart.setOption(getOption(theme));
  return { chart, getOption };
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
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
