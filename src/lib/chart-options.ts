import type { ComposeOption } from "echarts/core";
import type { BarSeriesOption } from "echarts/charts";
import type {
  AriaComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import type { SurveyMetric } from "./data-validation";

export type ChartOption = ComposeOption<
  BarSeriesOption | GridComponentOption | TooltipComponentOption | AriaComponentOption
>;

export interface ChartTheme {
  accent: string;
  evidence: string;
  ink: string;
  line: string;
  muted: string;
  surface: string;
}

export interface BarChartConfig {
  /** Horizontal bars (multi-select distributions read better sideways). */
  horizontal?: boolean;
  /** Color the top-ranked item with the evidence tone. */
  highlightTop?: boolean;
  /** Render the percent (or value) next to each bar. */
  showValueLabels?: boolean;
}

const VERTICAL_LABEL_ROTATE = 30;
const VERTICAL_GRID_BOTTOM = 78;
const HORIZONTAL_GRID_LEFT = 128;

export function createBarChartOption(
  data: SurveyMetric[],
  color: string,
  theme: ChartTheme,
  config: BarChartConfig = {},
): ChartOption {
  const topValue = Math.max(...data.map((item) => item.value));
  const barItems = data.map((item) => ({
    value: item.value,
    name: item.label,
    percent: item.percent,
    mean: item.mean,
    detail: item.detail,
    itemStyle: {
      color: config.highlightTop && item.value === topValue ? theme.evidence : color,
      borderRadius: config.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
    },
  }));

  return {
    animation: false,
    aria: {
      enabled: true,
    },
    color: [color],
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      backgroundColor: theme.surface,
      borderColor: theme.line,
      textStyle: {
        color: theme.ink,
      },
      formatter: createMetricTooltip(),
    },
    grid: config.horizontal
      ? {
          top: 12,
          right: 44,
          bottom: 28,
          left: HORIZONTAL_GRID_LEFT,
        }
      : {
          top: 28,
          right: 12,
          bottom: VERTICAL_GRID_BOTTOM,
          left: 40,
        },
    xAxis: config.horizontal
      ? {
          type: "value",
          axisLabel: {
            color: theme.muted,
          },
          splitLine: {
            lineStyle: {
              color: theme.line,
            },
          },
        }
      : {
          type: "category",
          data: data.map((item) => item.label),
          axisLabel: {
            interval: 0,
            rotate: VERTICAL_LABEL_ROTATE,
            margin: 12,
            color: theme.muted,
          },
          axisTick: {
            alignWithLabel: true,
          },
        },
    yAxis: config.horizontal
      ? {
          type: "category",
          data: data.map((item) => item.label),
          inverse: true,
          axisLabel: {
            width: HORIZONTAL_GRID_LEFT - 12,
            overflow: "truncate",
            color: theme.muted,
          },
          axisTick: {
            alignWithLabel: true,
          },
        }
      : {
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
        data: barItems,
        barMaxWidth: 34,
        label: {
          show: Boolean(config.showValueLabels),
          position: config.horizontal ? "right" : "top",
          distance: 6,
          color: theme.ink,
          fontSize: 11,
          fontWeight: 600,
          formatter: (params) => {
            const item = params.data as SurveyMetric | undefined;
            return item?.percent !== undefined ? formatPercent(item.percent) : String(params.value);
          },
        },
        emphasis: {
          focus: "series",
        },
      },
    ],
  };
}

function createMetricTooltip(): NonNullable<TooltipComponentOption["formatter"]> {
  return (params) => {
    const list = Array.isArray(params) ? params : [params];

    return list
      .map((entry) => {
        const item = entry.data as SurveyMetric | undefined;
        const name = item?.detail ?? String(entry.name);
        const lines = [`<strong>${escapeHtml(name)}</strong>`];

        if (item) {
          lines.push(`人数：${item.value}`);
          if (item.percent !== undefined) {
            lines.push(`占比：${formatPercent(item.percent)}`);
          }
          if (item.mean !== undefined) {
            lines.push(`有效评分均值：${item.mean.toFixed(2)}（1—5 分）`);
          }
        }

        return lines.join("<br/>");
      })
      .join("<br/>—————<br/>");
  };
}

function formatPercent(percent: number): string {
  const text = String(percent);
  return text.includes(".") ? `${text.replace(/\.?0+$/, "")}%` : `${text}%`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
