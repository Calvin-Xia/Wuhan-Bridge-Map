import { describe, expect, it } from "vitest";
import * as mapLayerSpec from "./map-layer-spec";

describe("theme-aware bridge map layers", () => {
  it("exposes a factory for light and dark map layer palettes", () => {
    expect(typeof mapLayerSpec.createBridgeMapLayers).toBe("function");
    expect(mapLayerSpec.LIGHT_MAP_THEME).toBeDefined();
    expect(mapLayerSpec.DARK_MAP_THEME).toBeDefined();
  });

  it("uses brighter halos and strokes for the dark map", () => {
    if (typeof mapLayerSpec.createBridgeMapLayers !== "function") return;

    const lightLayers = mapLayerSpec.createBridgeMapLayers(mapLayerSpec.LIGHT_MAP_THEME);
    const darkLayers = mapLayerSpec.createBridgeMapLayers(mapLayerSpec.DARK_MAP_THEME);
    const lightPointLayer = lightLayers.find((layer) => layer.id === "bridge-points");
    const darkPointLayer = darkLayers.find((layer) => layer.id === "bridge-points");
    const lightPaint = lightPointLayer && "paint" in lightPointLayer ? lightPointLayer.paint : null;
    const darkPaint = darkPointLayer && "paint" in darkPointLayer ? darkPointLayer.paint : null;

    expect(lightPaint).toMatchObject({ "circle-stroke-color": "#0f1a17" });
    expect(darkPaint).toMatchObject({ "circle-stroke-color": "#edf4ef" });
  });
});
