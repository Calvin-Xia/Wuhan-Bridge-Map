import { describe, expect, it } from "vitest";
import {
  BASEMAP_LAYERS,
  BASEMAP_SOURCES,
  DARK_TIANDITU_THEME,
  LIGHT_TIANDITU_THEME,
  OSM_ATTRIBUTION,
  TDT_ATTRIBUTION,
  TIANDITU_TK,
  TileErrorTracker,
  createBasemapLayers,
  createBasemapThemeUpdates,
  createOsmFallbackLayer,
  createOsmFallbackSource,
  createTiandituSources,
  createTiandituStyle,
  createTiandituTileUrls,
  isTileError,
} from "./map-basemap";
import { DARK_MAP_THEME, LIGHT_MAP_THEME } from "./map-layer-spec";

describe("天地图 WMTS 瓦片模板", () => {
  it("生成 t0-t4 五主机、球面墨卡托 w 集、TMS 行序 {y} 的影像 URL", () => {
    const urls = createTiandituTileUrls("img");

    expect(urls).toHaveLength(5);
    expect(urls[0]).toMatch(/^https:\/\/t0\.tianditu\.gov\.cn\/img_w\/wmts\?/);
    expect(urls[0]).toContain("SERVICE=WMTS");
    expect(urls[0]).toContain("REQUEST=GetTile");
    expect(urls[0]).toContain("LAYER=img");
    expect(urls[0]).toContain("STYLE=default");
    expect(urls[0]).toContain("TILEMATRIXSET=w");
    expect(urls[0]).toContain("TILEMATRIX={z}");
    expect(urls[0]).toContain("TILEROW={y}");
    expect(urls[0]).toContain("TILECOL={x}");
    expect(urls[0]).toContain(`tk=${TIANDITU_TK}`);
    expect(urls[0]).not.toContain("{-y}");
    expect(urls[3]).toMatch(/^https:\/\/t3\.tianditu\.gov\.cn\//);
  });

  it("cva 注记层使用 LAYER=cva", () => {
    const urls = createTiandituTileUrls("cva");
    expect(urls[0]).toContain("/cva_w/wmts?");
    expect(urls[0]).toContain("LAYER=cva");
  });

  it("声明 scheme:'tms' 由引擎翻转行序（maplibre-gl 5.24 不替换 {-y}，勿双重翻转）", () => {
    const sources = createTiandituSources();
    for (const source of Object.values(sources)) {
      expect(source.scheme).toBe("tms");
    }
  });
});

describe("底图源与图层结构", () => {
  it("天地图源：影像+注记双源、tileSize 256、maxzoom 18、天地图归因", () => {
    const sources = createTiandituSources();

    expect(Object.keys(sources).sort()).toEqual(
      [BASEMAP_SOURCES.tiandituBase, BASEMAP_SOURCES.tiandituAnnotation].sort(),
    );
    for (const source of Object.values(sources)) {
      expect(source.type).toBe("raster");
      expect(source.tileSize).toBe(256);
      expect(source.maxzoom).toBe(18);
      expect(source.attribution).toBe(TDT_ATTRIBUTION);
      expect(TDT_ATTRIBUTION).toContain("天地图");
      expect(TDT_ATTRIBUTION).toContain("tianditu.gov.cn");
    }
  });

  it("OSM 兜底源：标准 XYZ、maxzoom 19、OSM 归因", () => {
    const source = createOsmFallbackSource();

    expect(source.tiles).toEqual(["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]);
    expect(source.maxzoom).toBe(19);
    expect(OSM_ATTRIBUTION).toContain("OpenStreetMap");
  });

  it("样式图层顺序：background → tdt-base → tdt-cva", () => {
    const style = createTiandituStyle(LIGHT_MAP_THEME, LIGHT_TIANDITU_THEME);

    expect(style.version).toBe(8);
    expect(style.layers.map((layer) => layer.id)).toEqual([
      BASEMAP_LAYERS.background,
      BASEMAP_LAYERS.tiandituBase,
      BASEMAP_LAYERS.tiandituAnnotation,
    ]);
  });

  it("影像底图吃满主题参数（强降饱和）；注记层只做降饱和、不压暗", () => {
    const layers = createBasemapLayers(LIGHT_MAP_THEME, LIGHT_TIANDITU_THEME);
    const base = layers.find((layer) => layer.id === BASEMAP_LAYERS.tiandituBase);
    const annotation = layers.find((layer) => layer.id === BASEMAP_LAYERS.tiandituAnnotation);

    expect(base && "paint" in base ? base.paint : {}).toMatchObject({
      "raster-opacity": LIGHT_TIANDITU_THEME.base["raster-opacity"],
      "raster-saturation": LIGHT_TIANDITU_THEME.base["raster-saturation"],
      "raster-brightness-max": LIGHT_TIANDITU_THEME.base["raster-brightness-max"],
    });
    expect(LIGHT_TIANDITU_THEME.base["raster-saturation"]).toBeLessThanOrEqual(-0.4);

    const annotationPaint = (annotation && "paint" in annotation ? annotation.paint : {}) as Record<
      string,
      unknown
    >;
    expect(Object.keys(annotationPaint).sort()).toEqual(["raster-saturation"]);
    expect(annotationPaint).not.toHaveProperty("raster-brightness-max");
    expect(annotationPaint).not.toHaveProperty("raster-contrast");
    expect(annotationPaint).not.toHaveProperty("raster-opacity");
  });

  it("暗色主题：影像压暗可调（brightness-max 0.62）；注记层保持原始亮度", () => {
    const darkLayers = createBasemapLayers(DARK_MAP_THEME, DARK_TIANDITU_THEME);
    const darkBase = darkLayers.find((layer) => layer.id === BASEMAP_LAYERS.tiandituBase);
    const darkAnnotation = darkLayers.find((layer) => layer.id === BASEMAP_LAYERS.tiandituAnnotation);

    expect(darkBase && "paint" in darkBase ? darkBase.paint : {}).toMatchObject({
      "raster-brightness-max": DARK_TIANDITU_THEME.base["raster-brightness-max"],
    });

    const paint = darkAnnotation && "paint" in darkAnnotation ? darkAnnotation.paint : {};
    expect(paint).toEqual({ "raster-saturation": DARK_TIANDITU_THEME.annotation.saturation });
  });

  it("图层 id 与源 id 契约一致（防止拼写错位）", () => {
    expect(BASEMAP_LAYERS.tiandituBase).toBe(BASEMAP_SOURCES.tiandituBase);
    expect(BASEMAP_LAYERS.tiandituAnnotation).toBe(BASEMAP_SOURCES.tiandituAnnotation);
    expect(BASEMAP_LAYERS.osmFallback).toBe(BASEMAP_SOURCES.osmFallback);
  });

  it("OSM 兜底图层采用 OSM 适配主题参数（MapLayerTheme）", () => {
    const layer = createOsmFallbackLayer(DARK_MAP_THEME);

    expect(layer.id).toBe(BASEMAP_LAYERS.osmFallback);
    expect(layer.type).toBe("raster");
    expect(layer && "paint" in layer ? layer.paint : {}).toMatchObject({
      "raster-opacity": DARK_MAP_THEME.rasterOpacity,
      "raster-brightness-max": DARK_MAP_THEME.rasterBrightnessMax,
    });
  });
});

describe("主题更新映射（applyMapTheme 使用）", () => {
  it("覆盖 background/tdt-base/tdt-cva/osm 四类底图图层", () => {
    const updates = createBasemapThemeUpdates(LIGHT_MAP_THEME, LIGHT_TIANDITU_THEME);

    expect(updates.map((update) => update.layerId).sort()).toEqual(
      [
        BASEMAP_LAYERS.background,
        BASEMAP_LAYERS.tiandituBase,
        BASEMAP_LAYERS.tiandituAnnotation,
        BASEMAP_LAYERS.osmFallback,
      ].sort(),
    );
  });

  it("暗色更新中注记层不包含 brightness 参数", () => {
    const updates = createBasemapThemeUpdates(DARK_MAP_THEME, DARK_TIANDITU_THEME);
    const annotation = updates.find((update) => update.layerId === BASEMAP_LAYERS.tiandituAnnotation);

    expect(annotation?.paint).not.toHaveProperty("raster-brightness-max");
  });
});

describe("兜底错误分类与计数", () => {
  it("瓦片级错误：带 url 或 tile 才计数", () => {
    expect(isTileError({ url: "https://t0.tianditu.gov.cn/img_w/wmts?..." })).toBe(true);
    expect(isTileError({ tile: { x: 1, y: 1, z: 1 }, status: 403 })).toBe(true);
    expect(isTileError({ status: 500 })).toBe(false);
    expect(isTileError({ message: "style 级错误" })).toBe(false);
    expect(isTileError(null)).toBe(false);
    expect(isTileError(undefined)).toBe(false);
  });

  it("连续 3 次瓦片错误达到阈值；非瓦片错误不计", () => {
    const tracker = new TileErrorTracker();

    expect(tracker.record(100, { url: "tile/1" })).toBe(false);
    expect(tracker.record(200, { url: "tile/2" })).toBe(false);
    expect(tracker.record(300, { status: 500 })).toBe(false); // 非瓦片级
    expect(tracker.record(400, { url: "tile/3" })).toBe(true);
  });

  it("超过时间窗口清零；reset 清零", () => {
    const tracker = new TileErrorTracker(3, 30_000);

    tracker.record(0, { url: "a" });
    tracker.record(10_000, { url: "b" });
    // 距上次错误 60s，窗口滑出 → 计数重置为 1，仍未达阈值
    expect(tracker.record(70_000, { url: "c" })).toBe(false);
    tracker.record(71_000, { url: "d" });
    expect(tracker.record(72_000, { url: "e" })).toBe(true);

    tracker.reset();
    expect(tracker.record(73_000, { url: "f" })).toBe(false);
  });
});
