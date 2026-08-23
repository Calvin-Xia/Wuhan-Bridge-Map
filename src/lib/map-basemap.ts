import type { StyleSpecification } from "maplibre-gl";
import type { MapLayerTheme } from "./map-layer-spec";

/**
 * 底图瓦片工厂：天地图（WMTS 球面墨卡托 w 集）为主源，OSM 栅格为运行时兜底源。
 *
 * 图层组合（实测结论，2026-08）：
 * - 底图用 `img_w`（卫星影像）+ `cva_w`（注记）：两级在 z10-z14 均返回真内容。
 * - `vec_w`（矢量）仅低级别（z10）返回真内容，z12 及以上为 242 灰占位图
 *   （HTTP 200 + 103 字节纯色 PNG，非错误响应），故弃用矢量层。
 *
 * 注意：天地图 WMTS 是 TMS 行序（TILEROW 自下而上），必须在 raster 源上声明
 * `scheme: "tms"`，让 MapLibre 引擎自动翻转 {y}——实测 maplibre-gl 5.24 不替换
 * `{-y}` 占位符（会以字面量发送导致 400），且不能再叠加 `{-y}` 造成双重翻转。
 * （`map-basemap.test.ts` 对这个契约有测试。）
 *
 * 注意：天地图错误有两种形态——白名单不匹配为 403（code 301007，可被兜底捕获）；
 * 图层未授权/占位为「200 + 纯色占位图」（无错误事件，兜底无法感知，只能靠配置正确）。
 */

/** 天地图应用密钥（前端公开常量；天地图按配额 + 域名白名单控制，需在控制台配置）。 */
export const TIANDITU_TK = "7b42444517d4ce3a5f34f7219ec013a5";

export const BASEMAP_SOURCES = {
  tiandituBase: "tdt-base",
  tiandituAnnotation: "tdt-cva",
  osmFallback: "osm-raster",
} as const;

export const BASEMAP_LAYERS = {
  background: "map-background",
  tiandituBase: "tdt-base",
  tiandituAnnotation: "tdt-cva",
  osmFallback: "osm-raster",
} as const;

export const TDT_ATTRIBUTION =
  '<a href="https://www.tianditu.gov.cn" target="_blank" rel="noopener noreferrer">© 天地图</a>';
export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>';

/** 天地图多主机轮询（MapLibre 会在 tiles 数组之间分发请求）。 */
const TDT_HOSTS = ["t0", "t1", "t2", "t3", "t4"];
/** 天地图球面墨卡托影像/注记最大级别 18。 */
const TDT_MAXZOOM = 18;

/** Raster 图层的精确 paint 类型（避免 Record 索引签名与规范类型不兼容）。 */
type RasterPaintParams = {
  "raster-opacity"?: number;
  "raster-saturation": number;
  "raster-contrast"?: number;
  "raster-brightness-min"?: number;
  "raster-brightness-max"?: number;
};

/** 注记层主题参数：只做轻微降饱和，不做亮度压暗（暗色下保持白描边/黑字可读）。 */
export interface AnnotationTheme {
  saturation: number;
}

export const LIGHT_ANNOTATION_THEME: AnnotationTheme = { saturation: -0.12 };
export const DARK_ANNOTATION_THEME: AnnotationTheme = { saturation: -0.32 };

/** 天地图影像底图主题：更强的降饱和/压暗，突出覆盖层（路线、桥点、文字标签）。 */
export interface TiandituBasemapTheme {
  base: RasterPaintParams;
  annotation: AnnotationTheme;
}

export const LIGHT_TIANDITU_THEME: TiandituBasemapTheme = {
  base: {
    "raster-opacity": 0.92,
    "raster-saturation": -0.45,
    "raster-contrast": 0.05,
    "raster-brightness-min": 0.05,
    "raster-brightness-max": 0.98,
  },
  annotation: LIGHT_ANNOTATION_THEME,
};

export const DARK_TIANDITU_THEME: TiandituBasemapTheme = {
  base: {
    "raster-opacity": 0.88,
    "raster-saturation": -0.5,
    "raster-contrast": 0.08,
    "raster-brightness-min": 0.08,
    "raster-brightness-max": 0.62,
  },
  annotation: DARK_ANNOTATION_THEME,
};

/** 生成天地图某 WMTS 图层（img/cva）的瓦片 URL 数组（t0-t4 主机）。 */
export function createTiandituTileUrls(
  wmtsLayer: "img" | "cva",
  tk: string = TIANDITU_TK,
): string[] {
  const query = [
    "SERVICE=WMTS",
    "REQUEST=GetTile",
    "VERSION=1.0.0",
    `LAYER=${wmtsLayer}`,
    "STYLE=default",
    "TILEMATRIXSET=w",
    "FORMAT=tiles",
    "TILEMATRIX={z}",
    "TILEROW={y}",
    "TILECOL={x}",
    `tk=${encodeURIComponent(tk)}`,
  ].join("&");
  return TDT_HOSTS.map((host) => `https://${host}.tianditu.gov.cn/${wmtsLayer}_w/wmts?${query}`);
}

export function createTiandituSources(
  tk: string = TIANDITU_TK,
): Record<string, { type: "raster"; tiles: string[]; tileSize: number; minzoom: number; maxzoom: number; attribution: string; scheme: "tms" }> {
  const attribution = TDT_ATTRIBUTION;
  return {
    [BASEMAP_SOURCES.tiandituBase]: {
      type: "raster",
      tiles: createTiandituTileUrls("img", tk),
      tileSize: 256,
      minzoom: 0,
      maxzoom: TDT_MAXZOOM,
      attribution,
      scheme: "tms",
    },
    [BASEMAP_SOURCES.tiandituAnnotation]: {
      type: "raster",
      tiles: createTiandituTileUrls("cva", tk),
      tileSize: 256,
      minzoom: 0,
      maxzoom: TDT_MAXZOOM,
      attribution,
      scheme: "tms",
    },
  };
}

export function createOsmFallbackSource(): {
  type: "raster";
  tiles: string[];
  tileSize: number;
  minzoom: number;
  maxzoom: number;
  attribution: string;
} {
  return {
    type: "raster",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    tileSize: 256,
    minzoom: 0,
    maxzoom: 19,
    attribution: OSM_ATTRIBUTION,
  };
}

/** OSM 兜底层的主题参数（MapLayerTheme 的栅格参数本就是为 OSM 类底图设计）。 */
function osmRasterPaint(theme: MapLayerTheme): RasterPaintParams {
  return {
    "raster-opacity": theme.rasterOpacity,
    "raster-saturation": theme.rasterSaturation,
    "raster-contrast": theme.rasterContrast,
    "raster-brightness-min": theme.rasterBrightnessMin,
    "raster-brightness-max": theme.rasterBrightnessMax,
  };
}

/** StyleSpecification.layers 的元素类型（= LayerSpecification，含新版 color-relief 变体）。 */
type LayerSpecification = StyleSpecification["layers"][number];

export function createBasemapLayers(
  theme: MapLayerTheme,
  tianditu: TiandituBasemapTheme,
): LayerSpecification[] {
  return [
    {
      id: BASEMAP_LAYERS.background,
      type: "background",
      paint: { "background-color": theme.background },
    },
    {
      id: BASEMAP_LAYERS.tiandituBase,
      type: "raster",
      source: BASEMAP_SOURCES.tiandituBase,
      paint: tianditu.base,
    },
    {
      id: BASEMAP_LAYERS.tiandituAnnotation,
      type: "raster",
      source: BASEMAP_SOURCES.tiandituAnnotation,
      paint: { "raster-saturation": tianditu.annotation.saturation },
    },
  ];
}

export function createOsmFallbackLayer(theme: MapLayerTheme): LayerSpecification {
  return {
    id: BASEMAP_LAYERS.osmFallback,
    type: "raster",
    source: BASEMAP_SOURCES.osmFallback,
    paint: osmRasterPaint(theme),
  };
}

export function createTiandituStyle(
  theme: MapLayerTheme,
  tianditu: TiandituBasemapTheme,
  tk: string = TIANDITU_TK,
): StyleSpecification {
  return {
    version: 8,
    name: "Wuhan bridge study area · Tianditu WMTS raster",
    sources: createTiandituSources(tk),
    layers: createBasemapLayers(theme, tianditu),
  };
}

/** 主题参数 → 底图图层 paint 更新（applyMapTheme 按图层存在性应用）。 */
export interface BasemapPaintUpdate {
  layerId: string;
  paint: Record<string, string | number>;
}

export function createBasemapThemeUpdates(
  theme: MapLayerTheme,
  tianditu: TiandituBasemapTheme,
): BasemapPaintUpdate[] {
  return [
    { layerId: BASEMAP_LAYERS.background, paint: { "background-color": theme.background } },
    { layerId: BASEMAP_LAYERS.tiandituBase, paint: tianditu.base },
    { layerId: BASEMAP_LAYERS.tiandituAnnotation, paint: { "raster-saturation": tianditu.annotation.saturation } },
    { layerId: BASEMAP_LAYERS.osmFallback, paint: osmRasterPaint(theme) },
  ];
}

export interface MapTileErrorShape {
  url?: string;
  tile?: unknown;
  status?: number;
  message?: string;
}

/** 瓦片级错误（401/403/404、限流、网络失败）：error 带 url 或 tile 即算。 */
export function isTileError(error: MapTileErrorShape | undefined | null): boolean {
  if (!error) return false;
  return Boolean(error.url || error.tile);
}

/**
 * 连续瓦片错误计数器：达到阈值返回 true（触发切 OSM 兜底）。
 * 无逐瓦片成功事件，因此用"窗口内错误数"近似连续（超过 windowMs 无新错误则清零）。
 */
export class TileErrorTracker {
  constructor(
    private readonly threshold = 3,
    private readonly windowMs = 30_000,
  ) {}

  private count = 0;
  private lastErrorAt = 0;

  record(now: number, error: MapTileErrorShape | undefined | null): boolean {
    if (!isTileError(error)) return false;
    if (now - this.lastErrorAt > this.windowMs) this.count = 0;
    this.count += 1;
    this.lastErrorAt = now;
    return this.count >= this.threshold;
  }

  reset(): void {
    this.count = 0;
  }
}
