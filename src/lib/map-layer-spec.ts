/**
 * 地图视觉契约（与引擎无关的纯调色板）。
 *
 * 底图由高德引擎（JS API v2）提供：明暗主题切 `amap://styles/normal` /
 * `amap://styles/darkblue`（见 `map-app.ts`）；本文件只负责我们自己的覆盖层
 * （路线/桥链/桥点）在明暗主题下的颜色与调研状态配色。
 */

export interface MapLayerTheme {
  /** 串联线双线描边（halo）色。 */
  chainHalo: string;
  /** 桥点外圈 halo 色。 */
  pointHalo: string;
  /** 桥点描边色。 */
  pointStroke: string;
}

export const LIGHT_MAP_THEME: MapLayerTheme = {
  chainHalo: "#edf1ed",
  pointHalo: "#edf1ed",
  pointStroke: "#0f1a17",
};

export const DARK_MAP_THEME: MapLayerTheme = {
  chainHalo: "#17231f",
  pointHalo: "#17231f",
  pointStroke: "#edf4ef",
};

/** 桥点调研状态配色（与旧 maplibre 图层 match 一致）。 */
export const RESEARCH_STATUS_FILLS = {
  "已实地调研": "#cf6245",
  "待实地核验": "#9f7741",
  fallback: "#08768d",
} as const;

export function researchStatusFill(status: string): string {
  return (RESEARCH_STATUS_FILLS as Record<string, string>)[status] ?? RESEARCH_STATUS_FILLS.fallback;
}
