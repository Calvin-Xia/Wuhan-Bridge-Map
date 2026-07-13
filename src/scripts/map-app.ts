import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LngLatBoundsLike, StyleSpecification } from "maplibre-gl";
import type {
  BridgeFeature,
  BridgeFeatureCollection,
  RouteFeatureCollection,
  SourceRecord,
  StoryRecord,
} from "../lib/data-validation";
import { createBridgeListMarkup, getBridgeSelectionAttributes } from "../lib/bridge-list-presentation";
import { INITIAL_MAP_VIEW } from "../lib/map-view";
import {
  createBridgeMapLayers,
  DARK_MAP_THEME,
  LIGHT_MAP_THEME,
  type MapLayerTheme,
} from "../lib/map-layer-spec";
import { isThemeMode, THEME_CHANGE_EVENT, type ThemeMode } from "../lib/theme-preferences";

const STUDY_AREA_BOUNDS: LngLatBoundsLike = [
  [114.15, 30.4],
  [114.525, 30.725],
];
const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>';
const state = {
  activeBridgeId: "",
  bridges: [] as BridgeFeature[],
  stories: [] as StoryRecord[],
  sources: [] as SourceRecord[],
  labelMarkers: [] as maplibregl.Marker[],
  map: null as maplibregl.Map | null,
};

window.addEventListener(THEME_CHANGE_EVENT, (event) => {
  const detail = (event as CustomEvent<{ mode?: unknown }>).detail;
  const mode = isThemeMode(detail?.mode) ? detail.mode : getDocumentTheme();
  applyMapTheme(mode);
});

void initMapApp();

async function initMapApp() {
  const status = byId("map-status");

  try {
    const [bridges, routes, stories, sources] = await Promise.all([
      fetchJson<BridgeFeatureCollection>("/data/bridges.geojson"),
      fetchJson<RouteFeatureCollection>("/data/routes.geojson"),
      fetchJson<StoryRecord[]>("/data/stories.json"),
      fetchJson<SourceRecord[]>("/data/sources.json"),
    ]);

    state.bridges = bridges.features;
    state.stories = stories;
    state.sources = sources;
    state.activeBridgeId = state.bridges[0]?.properties.id ?? "";

    updateBridgeCount(state.bridges.length);
    renderBridgeList();
    renderStoryPanel(state.activeBridgeId);
    createMap(bridges, routes);
    byId("bridge-list").setAttribute("aria-busy", "false");
    status.textContent = "点位、路线与故事卡片已加载";
  } catch (error) {
    byId("bridge-list").setAttribute("aria-busy", "false");
    status.textContent = "数据载入失败，请检查 public/data 下的 GeoJSON 和 JSON 文件。";
    console.error(error);
  }
}

function createMap(bridges: BridgeFeatureCollection, routes: RouteFeatureCollection) {
  const status = byId("map-status");
  const theme = getMapTheme(getDocumentTheme());
  const map = new maplibregl.Map({
    container: "bridge-map",
    style: createOsmRasterStyle(theme),
    center: INITIAL_MAP_VIEW.center,
    zoom: INITIAL_MAP_VIEW.zoom,
    minZoom: 9.1,
    maxZoom: 17,
    maxBounds: STUDY_AREA_BOUNDS,
    attributionControl: false,
  });

  state.map = map;

  map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "top-right");
  map.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");

  map.on("load", () => {
    map.addSource("routes", {
      type: "geojson",
      data: routes,
    });

    map.addSource("bridges", {
      type: "geojson",
      data: bridges,
    });

    for (const layer of createBridgeMapLayers(theme)) {
      map.addLayer(layer);
    }

    applyMapTheme(getDocumentTheme());

    renderBridgeMapLabels();

    map.on("click", "bridge-points", (event) => {
      const feature = event.features?.[0] as BridgeFeature | undefined;
      if (!feature) return;
      selectBridge(feature.properties.id, true);
      showPopup(feature);
    });

    map.on("mouseenter", "bridge-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "bridge-points", () => {
      map.getCanvas().style.cursor = "";
    });

  });

  map.on("error", () => {
    status.textContent = "底图暂时不可用，桥梁列表和故事卡片仍可使用。";
  });
}

function createOsmRasterStyle(theme: MapLayerTheme): StyleSpecification {
  return {
    version: 8,
    name: "Wuhan bridge study area OSM raster",
    sources: {
      "osm-raster": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: "map-background",
        type: "background",
        paint: {
          "background-color": theme.background,
        },
      },
      {
        id: "osm-raster",
        type: "raster",
        source: "osm-raster",
        paint: {
          "raster-opacity": theme.rasterOpacity,
          "raster-saturation": theme.rasterSaturation,
          "raster-contrast": theme.rasterContrast,
          "raster-brightness-min": theme.rasterBrightnessMin,
          "raster-brightness-max": theme.rasterBrightnessMax,
        },
      },
    ],
  };
}

function applyMapTheme(mode: ThemeMode) {
  const map = state.map;
  if (!map || !map.isStyleLoaded()) return;

  const theme = getMapTheme(mode);
  setPaintPropertyIfPresent(map, "map-background", "background-color", theme.background);
  setPaintPropertyIfPresent(map, "osm-raster", "raster-opacity", theme.rasterOpacity);
  setPaintPropertyIfPresent(map, "osm-raster", "raster-saturation", theme.rasterSaturation);
  setPaintPropertyIfPresent(map, "osm-raster", "raster-contrast", theme.rasterContrast);
  setPaintPropertyIfPresent(map, "osm-raster", "raster-brightness-min", theme.rasterBrightnessMin);
  setPaintPropertyIfPresent(map, "osm-raster", "raster-brightness-max", theme.rasterBrightnessMax);
  setPaintPropertyIfPresent(map, "bridge-chain-halo", "line-color", theme.chainHalo);
  setPaintPropertyIfPresent(map, "bridge-points-halo", "circle-color", theme.pointHalo);
  setPaintPropertyIfPresent(map, "bridge-points", "circle-stroke-color", theme.pointStroke);
}

function setPaintPropertyIfPresent(
  map: maplibregl.Map,
  layerId: string,
  property: string,
  value: string | number,
) {
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, property, value);
  }
}

function getDocumentTheme(): ThemeMode {
  const theme = document.documentElement.dataset.theme;
  return isThemeMode(theme) ? theme : "light";
}

function getMapTheme(mode: ThemeMode): MapLayerTheme {
  return mode === "dark" ? DARK_MAP_THEME : LIGHT_MAP_THEME;
}

function renderBridgeList() {
  const container = byId("bridge-list");
  container.innerHTML = createBridgeListMarkup(state.bridges, state.activeBridgeId);
  container.querySelectorAll<HTMLButtonElement>(".bridge-item").forEach((button) => {
    button.addEventListener("click", () => selectBridge(button.dataset.bridgeId ?? "", true));
  });

  markActiveBridge();
}

function renderStoryPanel(bridgeId: string) {
  const panel = byId("story-panel");
  const bridge = state.bridges.find((item) => item.properties.id === bridgeId);
  const story = state.stories.find((item) => item.bridgeId === bridgeId);

  if (!bridge || !story) {
    panel.innerHTML = `
      <p class="section-label">当前点位</p>
      <h2>暂无故事卡片</h2>
      <p>该点位仍在资料整理中。</p>
    `;
    return;
  }

  const sources = bridge.properties.sourceIds
    .map((sourceId) => state.sources.find((source) => source.id === sourceId))
    .filter((source): source is SourceRecord => Boolean(source));

  panel.innerHTML = `
    <p class="section-label">${escapeHtml(bridge.properties.river)} · ${bridge.properties.openedYear}</p>
    <h2>${escapeHtml(bridge.properties.name)}</h2>
    <ul class="tag-row" aria-label="主题标签">
      ${bridge.properties.themeTags.map((tag) => `<li><span class="tag">${escapeHtml(tag)}</span></li>`).join("")}
    </ul>
    <section class="story-section">
      <h3>${escapeHtml(story.title)}</h3>
      <p><strong>${escapeHtml(story.question)}</strong></p>
      <p>${escapeHtml(story.fieldObservation)}</p>
      <blockquote class="quote">${escapeHtml(story.interviewQuote)}</blockquote>
    </section>
    <section class="story-section">
      <h3>调研分析</h3>
      <p>${escapeHtml(story.analysis)}</p>
    </section>
    <section class="story-section">
      <h3>思政连接</h3>
      <p>${escapeHtml(story.ideologicalLink)}</p>
    </section>
    <ul class="source-row" aria-label="资料来源">
      ${sources.map((source) => `<li><span class="source-chip">${escapeHtml(source.title)}</span></li>`).join("")}
    </ul>
  `;
}

function selectBridge(bridgeId: string, moveMap: boolean) {
  state.activeBridgeId = bridgeId;
  markActiveBridge();
  renderStoryPanel(bridgeId);

  if (!moveMap || !state.map) return;

  const bridge = state.bridges.find((item) => item.properties.id === bridgeId);
  if (!bridge) return;

  state.map.flyTo({
    center: bridge.geometry.coordinates,
    zoom: 12.3,
    duration: 600,
  });
}

function markActiveBridge() {
  document.querySelectorAll<HTMLButtonElement>(".bridge-item").forEach((button) => {
    const selection = getBridgeSelectionAttributes(button.dataset.bridgeId === state.activeBridgeId);
    button.classList.toggle("is-active", selection.isActive);
    if (selection.ariaCurrent) {
      button.setAttribute("aria-current", selection.ariaCurrent);
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function showPopup(feature: BridgeFeature) {
  if (!state.map) return;

  new maplibregl.Popup({ closeButton: false, maxWidth: "260px" })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(`
      <strong class="popup-title">${escapeHtml(feature.properties.name)}</strong>
      <span>${feature.properties.openedYear} / ${escapeHtml(feature.properties.bridgeType)}</span>
    `)
    .addTo(state.map);
}

function renderBridgeMapLabels() {
  if (!state.map) return;

  for (const marker of state.labelMarkers) {
    marker.remove();
  }
  state.labelMarkers = state.bridges.map((bridge) => {
    const label = document.createElement("span");
    label.className = "bridge-map-label";
    label.textContent = bridge.properties.name;

    return new maplibregl.Marker({
      element: label,
      anchor: "top",
      offset: [0, 16],
    })
      .setLngLat(bridge.geometry.coordinates)
      .addTo(state.map as maplibregl.Map);
  });
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing #${id}`);
  }
  return element;
}

function updateBridgeCount(count: number) {
  const element = document.getElementById("bridge-count");
  if (element) {
    element.textContent = String(count);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
