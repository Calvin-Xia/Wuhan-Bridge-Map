import type { StyleSpecification } from "maplibre-gl";
import type { MapLayerTheme } from "./map-layer-spec";

/**
 * 底图瓦片工厂：高德在线底图瓦片为唯一主源（官方文档"官方底图瓦片"一节提供的
 * URL，无需 key），OSM 栅格为运行时兜底源。
 *
 * - 矢量地图 URL（style=8，矢量路网+注记，数据较新）：
 *   `https://webrd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`
 *   （{1-4} 为负载均衡服务器编号；标准 XYZ 网格，无需 TMS 翻转、无需 {-y}）。
 * - 为何不用 style=7（wprd 官方示例）：实测同一瓦片位置 style=7 的矢量快照
 *   缺 2019 年通车的杨泗港长江大桥（124B 纯水），style=8 有完整桥梁且带注记
 *   （5066B，"杨泗港大桥"字样可见）。
 * - 坐标系：高德瓦片为 **GCJ-02（火星坐标系）**，与项目数据（WGS-84，OSM 口径）
 *   存在约 300-500 m 的系统性偏移（武汉）；数据坐标转换暂未实施（已知并接受）。
 * - 高德 key + 安全密钥仅用于官方 JS API / Web 服务 API，第三方引擎取瓦片用不到。
 * - 错误形态：限流/非授权端点可能返回 403（可被兜底捕获）；个别返回 200 + 占位图
 *   （无错误事件，兜底无法感知），配置与网络层面的可用性仍需实测确认。
 */

export const BASEMAP_SOURCES = {
  amapVector: "amap-vector",
  osmFallback: "osm-raster",
} as const;

export const BASEMAP_LAYERS = {
  background: "map-background",
  amapVector: "amap-vector",
  osmFallback: "osm-raster",
} as const;

export const AMAP_ATTRIBUTION =
  '<a href="https://www.amap.com" target="_blank" rel="noopener noreferrer">© 高德地图</a>';
export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>';

/** 高德矢量瓦片负载均衡主机（官方示例 {1-4}）。 */
const AMAP_HOSTS = ["01", "02", "03", "04"];
/** 高德矢量瓦片最大级别 18（地图侧 maxZoom 17 不受影响）。 */
const AMAP_MAXZOOM = 18;

/** Raster 图层的精确 paint 类型（避免 Record 索引签名与规范类型不兼容）。 */
type RasterPaintParams = {
  "raster-opacity"?: number;
  "raster-saturation": number;
  "raster-contrast"?: number;
  "raster-brightness-min"?: number;
  "raster-brightness-max"?: number;
};

/** 生成高德矢量瓦片 URL 数组（webrd01-04 主机，style=8 矢量+注记）。 */
export function createAmapTileUrls(): string[] {
  const query = `lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`;
  return AMAP_HOSTS.map((host) => `https://webrd${host}.is.autonavi.com/appmaptile?${query}`);
}

export function createAmapSource(): {
  type: "raster";
  tiles: string[];
  tileSize: number;
  minzoom: number;
  maxzoom: number;
  attribution: string;
} {
  return {
    type: "raster",
    tiles: createAmapTileUrls(),
    tileSize: 256,
    minzoom: 0,
    maxzoom: AMAP_MAXZOOM,
    attribution: AMAP_ATTRIBUTION,
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

/** 主源与 OSM 兜底共用同一套主题栅格参数（MapLayerTheme 为浅色系底图设计）。 */
function baseRasterPaint(theme: MapLayerTheme): RasterPaintParams {
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

export function createBasemapLayers(theme: MapLayerTheme): LayerSpecification[] {
  return [
    {
      id: BASEMAP_LAYERS.background,
      type: "background",
      paint: { "background-color": theme.background },
    },
    {
      id: BASEMAP_LAYERS.amapVector,
      type: "raster",
      source: BASEMAP_SOURCES.amapVector,
      paint: baseRasterPaint(theme),
    },
  ];
}

export function createOsmFallbackLayer(theme: MapLayerTheme): LayerSpecification {
  return {
    id: BASEMAP_LAYERS.osmFallback,
    type: "raster",
    source: BASEMAP_SOURCES.osmFallback,
    paint: baseRasterPaint(theme),
  };
}

export function createAmapStyle(theme: MapLayerTheme): StyleSpecification {
  return {
    version: 8,
    name: "Wuhan bridge study area · AMap vector raster",
    sources: { [BASEMAP_SOURCES.amapVector]: createAmapSource() },
    layers: createBasemapLayers(theme),
  };
}

/** 主题参数 → 底图图层 paint 更新（applyMapTheme 按图层存在性应用）。 */
export interface BasemapPaintUpdate {
  layerId: string;
  paint: Record<string, string | number>;
}

export function createBasemapThemeUpdates(theme: MapLayerTheme): BasemapPaintUpdate[] {
  return [
    { layerId: BASEMAP_LAYERS.background, paint: { "background-color": theme.background } },
    { layerId: BASEMAP_LAYERS.amapVector, paint: baseRasterPaint(theme) },
    { layerId: BASEMAP_LAYERS.osmFallback, paint: baseRasterPaint(theme) },
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
