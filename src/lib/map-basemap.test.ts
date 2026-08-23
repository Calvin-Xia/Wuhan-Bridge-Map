import { describe, expect, it } from "vitest";
import {
  AMAP_ATTRIBUTION,
  BASEMAP_LAYERS,
  BASEMAP_SOURCES,
  OSM_ATTRIBUTION,
  TileErrorTracker,
  createAmapSource,
  createAmapStyle,
  createAmapTileUrls,
  createBasemapLayers,
  createBasemapThemeUpdates,
  createOsmFallbackLayer,
  createOsmFallbackSource,
  isTileError,
} from "./map-basemap";
import { DARK_MAP_THEME, LIGHT_MAP_THEME } from "./map-layer-spec";

describe("高德矢量瓦片模板", () => {
  it("生成 webrd01-04 四主机、style=8、标准 XYZ 的 URL", () => {
    const urls = createAmapTileUrls();

    expect(urls).toHaveLength(4);
    expect(urls[0]).toBe(
      "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    );
    expect(urls[1]).toBe(
      "https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    );
    expect(urls[2]).toBe(
      "https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    );
    expect(urls[3]).toBe(
      "https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    );
    expect(urls[0]).not.toContain("tk=");
  });
});

describe("底图源与图层结构", () => {
  it("高德源：单一矢量源、tileSize 256、maxzoom 18、高德归因、无 tms scheme", () => {
    const source = createAmapSource();

    expect(source.type).toBe("raster");
    expect(source.tileSize).toBe(256);
    expect(source.maxzoom).toBe(18);
    expect(source.attribution).toBe(AMAP_ATTRIBUTION);
    expect(AMAP_ATTRIBUTION).toContain("高德地图");
    expect(AMAP_ATTRIBUTION).toContain("amap.com");
    expect(source).not.toHaveProperty("scheme");
  });

  it("OSM 兜底源：标准 XYZ、maxzoom 19、OSM 归因", () => {
    const source = createOsmFallbackSource();

    expect(source.tiles).toEqual(["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]);
    expect(source.maxzoom).toBe(19);
    expect(OSM_ATTRIBUTION).toContain("OpenStreetMap");
  });

  it("样式图层顺序：background → amap-vector", () => {
    const style = createAmapStyle(LIGHT_MAP_THEME);

    expect(style.version).toBe(8);
    expect(style.layers.map((layer) => layer.id)).toEqual([
      BASEMAP_LAYERS.background,
      BASEMAP_LAYERS.amapVector,
    ]);
  });

  it("矢量层吃满主题参数（明暗两套）", () => {
    const lightLayers = createBasemapLayers(LIGHT_MAP_THEME);
    const darkLayers = createBasemapLayers(DARK_MAP_THEME);

    const lightVector = lightLayers.find((layer) => layer.id === BASEMAP_LAYERS.amapVector);
    const darkVector = darkLayers.find((layer) => layer.id === BASEMAP_LAYERS.amapVector);

    expect(lightVector && "paint" in lightVector ? lightVector.paint : {}).toMatchObject({
      "raster-opacity": LIGHT_MAP_THEME.rasterOpacity,
      "raster-brightness-max": LIGHT_MAP_THEME.rasterBrightnessMax,
    });
    expect(darkVector && "paint" in darkVector ? darkVector.paint : {}).toMatchObject({
      "raster-opacity": DARK_MAP_THEME.rasterOpacity,
      "raster-brightness-max": DARK_MAP_THEME.rasterBrightnessMax,
    });
  });

  it("图层 id 与源 id 契约一致（防止拼写错位）", () => {
    expect(BASEMAP_LAYERS.amapVector).toBe(BASEMAP_SOURCES.amapVector);
    expect(BASEMAP_LAYERS.osmFallback).toBe(BASEMAP_SOURCES.osmFallback);
  });

  it("OSM 兜底图层采用同一套主题参数", () => {
    const layer = createOsmFallbackLayer(DARK_MAP_THEME);

    expect(layer.id).toBe(BASEMAP_LAYERS.osmFallback);
    expect(layer.type).toBe("raster");
    expect(layer && "paint" in layer ? layer.paint : {}).toMatchObject({
      "raster-opacity": DARK_MAP_THEME.rasterOpacity,
    });
  });
});

describe("主题更新映射（applyMapTheme 使用）", () => {
  it("覆盖 background/amap-vector/osm 三类底图图层", () => {
    const updates = createBasemapThemeUpdates(LIGHT_MAP_THEME);

    expect(updates.map((update) => update.layerId).sort()).toEqual(
      [
        BASEMAP_LAYERS.background,
        BASEMAP_LAYERS.amapVector,
        BASEMAP_LAYERS.osmFallback,
      ].sort(),
    );
  });
});

describe("兜底错误分类与计数", () => {
  it("瓦片级错误：带 url 或 tile 才计数", () => {
    expect(isTileError({ url: "https://wprd01.is.autonavi.com/appmaptile?..." })).toBe(true);
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
