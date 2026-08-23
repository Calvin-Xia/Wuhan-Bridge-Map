import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LngLatBoundsLike, StyleSpecification } from "maplibre-gl";
import type {
  BridgeFeature,
  BridgeFeatureCollection,
  RouteFeature,
  RouteFeatureCollection,
  SourceRecord,
  StoryRecord,
} from "../lib/data-validation";
import { createBridgeListMarkup, getBridgeSelectionAttributes } from "../lib/bridge-list-presentation";
import { BRIDGE_CHAIN_ROUTE_ID } from "../lib/bridge-chain";
import { buildBridgeHash, parseBridgeHash } from "../lib/bridge-hash";
import { INITIAL_MAP_VIEW } from "../lib/map-view";
import {
  getStoryPanelOffsetTop,
  getStoryWindowTop,
  readStoryScroll,
  resolveStoryScrollContainer,
  resolveStoryScrollTarget,
  type StoryScrollMetrics,
} from "../lib/story-scroll";
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
  routes: null as RouteFeatureCollection | null,
  labelMarkers: [] as maplibregl.Marker[],
  map: null as maplibregl.Map | null,
  popup: null as maplibregl.Popup | null,
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
    state.routes = routes;
    // 深度链接：#bridge-<id> 打开时直接选中该桥。
    const hashBridgeId = parseBridgeHash(window.location.hash);
    state.activeBridgeId =
      (hashBridgeId && bridges.features.find((item) => item.properties.id === hashBridgeId)
        ? hashBridgeId
        : bridges.features[0]?.properties.id) ?? "";

    updateBridgeCount(state.bridges.length);
    renderBridgeList();
    renderStoryPanel(state.activeBridgeId);
    createMap(bridges, routes);
    renderMapLegend(routes);
    bindLegendToggle();
    byId("bridge-list").setAttribute("aria-busy", "false");
    status.hidden = true;
  } catch (error) {
    byId("bridge-list").setAttribute("aria-busy", "false");
    status.hidden = false;
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

    const focusBridge = bridges.features.find(
      (item) => item.properties.id === state.activeBridgeId,
    );
    if (focusBridge && parseBridgeHash(window.location.hash)) {
      // 深度链接定位：打开 #bridge-<id> 时把地图居中到该桥。
      map.jumpTo({
        center: focusBridge.geometry.coordinates,
        zoom: 12.3,
      });
    }

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

    bindRouteInteractions(map);
  });

  map.on("load", () => {
    status.hidden = true;
  });

  map.on("error", (event) => {
    const error = event.error as { url?: string; tile?: unknown } | undefined;
    // 瓦片级错误（OSM 偶发失败、限流、单瓦片 404）可自动重试，不打扰用户。
    if (error?.url || error?.tile) return;

    status.hidden = false;
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

  const quoteMarkup =
    story.quoteConsent === "not-collected"
      ? `<p class="quote-pending">本点位尚无访谈或开放回答引用，以问卷聚合数据与公开资料呈现。</p>`
      : `<blockquote class="quote">${escapeHtml(story.interviewQuote)}${
          story.quoteLabel ? `<cite>${escapeHtml(story.quoteLabel)}</cite>` : ""
        }</blockquote>`;

  const evidenceMarkup = story.surveyEvidence?.length
    ? `<section class="story-section">
      <h3>问卷与开放题证据</h3>
      <ul class="evidence-list">
        ${story.surveyEvidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>`
    : "";

  const analysisMarkup = story.analysis.map((paragraph) => `<p>${renderEmphasis(paragraph)}</p>`).join("");

  const institutionMarkup = story.institutionNote
    ? `<section class="story-section story-section--institution">
        <h3>治理与管养</h3>
        ${
          story.institutionNote.quote
            ? `<blockquote class="quote quote--institution">${escapeHtml(story.institutionNote.quote)}${
                story.institutionNote.quoteLabel ? `<cite>${escapeHtml(story.institutionNote.quoteLabel)}</cite>` : ""
              }</blockquote>`
            : ""
        }
        ${story.institutionNote.paragraphs.map((paragraph) => `<p>${renderEmphasis(paragraph)}</p>`).join("")}
      </section>`
    : "";

  panel.innerHTML = `
    <p class="section-label">当前点位 · ${escapeHtml(bridge.properties.river)} · ${bridge.properties.openedYear}</p>
    <h2>${escapeHtml(bridge.properties.name)}</h2>
    <ul class="tag-row" aria-label="主题标签">
      ${bridge.properties.themeTags.map((tag) => `<li><span class="tag">${escapeHtml(tag)}</span></li>`).join("")}
    </ul>
    <section class="story-section">
      <h3>${escapeHtml(story.title)}</h3>
      <p><strong>${escapeHtml(story.question)}</strong></p>
      <p>${escapeHtml(story.fieldObservation)}</p>
      ${quoteMarkup}
    </section>
    ${evidenceMarkup}
    <section class="story-section">
      <h3>调研分析</h3>
      ${analysisMarkup}
    </section>
    ${institutionMarkup}
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
  const isNewBridge = bridgeId !== state.activeBridgeId;

  if (isNewBridge) {
    const outgoingId = state.activeBridgeId;
    if (outgoingId) {
      storyScrollMemory.set(outgoingId, readStoryScroll(getStoryScrollMetrics()));
    }

    state.activeBridgeId = bridgeId;
    markActiveBridge();
    renderStoryPanel(bridgeId);

    const savedScroll = storyScrollMemory.get(bridgeId);
    if (savedScroll === undefined) {
      // 首次查看：快速平滑回顶；同桥点击不触发（见下方同一分支）。
      requestAnimationFrame(() => scrollStoryToTop());
    } else {
      // 切回已读过的桥：瞬时恢复进度，避免视觉跳变。
      requestAnimationFrame(() => restoreStoryScroll(savedScroll));
    }

    // 深链写回：URL 与当前选中桥保持同步，但不产生历史记录。
    window.history?.replaceState(null, "", buildBridgeHash(bridgeId));
  }

  if (!moveMap || !state.map) return;

  const bridge = state.bridges.find((item) => item.properties.id === bridgeId);
  if (!bridge) return;

  state.map.flyTo({
    center: bridge.geometry.coordinates,
    zoom: 12.3,
    duration: 600,
  });
}

const storyScrollMemory = new Map<string, number>();
const STORY_SCROLL_DURATION = 180;

function getStoryScrollMetrics(): StoryScrollMetrics {
  const panel = byId("story-panel");
  return {
    viewportWidth: window.innerWidth,
    panelScrollTop: panel.scrollTop,
    panelOffsetTop: getStoryPanelOffsetTop(panel.getBoundingClientRect().top, window.scrollY),
    panelScrollHeight: panel.scrollHeight,
    panelClientHeight: panel.clientHeight,
    windowScrollY: window.scrollY,
    windowInnerHeight: window.innerHeight,
    documentHeight: document.documentElement.scrollHeight,
  };
}

function restoreStoryScroll(memory: number) {
  const target = resolveStoryScrollTarget(getStoryScrollMetrics(), memory);
  if (target.container === "panel") {
    byId("story-panel").scrollTop = target.value;
  } else {
    window.scrollTo(0, getStoryWindowTop(getStoryScrollMetrics().panelOffsetTop) + target.value);
  }
}

function scrollStoryToTop() {
  const metrics = getStoryScrollMetrics();
  const panel = byId("story-panel");
  const container = resolveStoryScrollContainer(metrics.viewportWidth);

  if (container === "panel") {
    animateScroll(panel, panel.scrollTop, 0, STORY_SCROLL_DURATION);
  } else {
    const windowTop = getStoryWindowTop(metrics.panelOffsetTop);
    animateWindowScroll(window.scrollY, windowTop, STORY_SCROLL_DURATION);
  }
}

function animateScroll(element: HTMLElement, from: number, to: number, duration: number) {
  if (prefersReducedMotion() || from === to) {
    element.scrollTop = to;
    return;
  }

  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / duration);
    element.scrollTop = from + (to - from) * easeOutCubic(progress);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function animateWindowScroll(from: number, to: number, duration: number) {
  if (prefersReducedMotion() || from === to) {
    window.scrollTo(0, to);
    return;
  }

  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / duration);
    window.scrollTo(0, from + (to - from) * easeOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  replacePopup(feature.geometry.coordinates, `
      <strong class="popup-title">${escapeHtml(feature.properties.name)}</strong>
      <span>${feature.properties.openedYear} / ${escapeHtml(feature.properties.bridgeType)}</span>
    `);
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

function renderMapLegend(routes: RouteFeatureCollection) {
  const list = document.getElementById("map-legend-list");
  if (!list) return;

  list.setAttribute("aria-busy", "false");
  list.innerHTML = routes.features
    .map((route) => {
      const props = route.properties;
      const isChain = props.id === BRIDGE_CHAIN_ROUTE_ID;
      const detail = props.group
        ? `${escapeHtml(props.group)} · 回收问卷 ${props.sampleCount ?? 0} 份`
        : "串联 8 座桥点位";
      const swatchClass = isChain ? "map-legend-swatch map-legend-swatch--dashed" : "map-legend-swatch";

      return `<li>
        <button class="map-legend-entry" type="button" data-route-id="${escapeHtml(props.id)}">
          <span class="${swatchClass}" style="--legend-color: ${escapeHtml(props.color)}" aria-hidden="true"></span>
          <span class="map-legend-item"><strong>${escapeHtml(props.day)} · ${escapeHtml(props.name)}</strong><small>${detail}</small></span>
        </button>
      </li>`;
    })
    .join("");

  list.querySelectorAll<HTMLButtonElement>(".map-legend-entry").forEach((button) => {
    button.addEventListener("click", () => focusRoute(button.dataset.routeId ?? ""));
  });
}

const MOBILE_LEGEND_QUERY = "(max-width: 560px)";

function bindLegendToggle() {
  const legend = document.getElementById("map-legend");
  const toggle = document.getElementById("map-legend-toggle");
  if (!legend || !toggle) return;

  const mobile = window.matchMedia(MOBILE_LEGEND_QUERY);
  setLegendOpen(!mobile.matches);

  toggle.addEventListener("click", () => {
    setLegendOpen(!legend.classList.contains("is-open"));
  });

  mobile.addEventListener("change", (event) => {
    setLegendOpen(!event.matches);
  });
}

function setLegendOpen(open: boolean) {
  const legend = document.getElementById("map-legend");
  const toggle = document.getElementById("map-legend-toggle");
  if (!legend || !toggle) return;

  legend.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

function focusRoute(routeId: string) {
  const route = state.routes?.features.find((item) => item.properties.id === routeId);
  if (!route || !state.map) return;

  const bounds = new maplibregl.LngLatBounds();
  for (const coordinate of route.geometry.coordinates) {
    bounds.extend(coordinate);
  }
  state.map.fitBounds(bounds, { padding: 56, duration: 700 });

  const firstBridgeId = getRouteBridgeIds(route)[0];
  if (firstBridgeId) {
    selectBridge(firstBridgeId, false);
  }

  if (window.matchMedia(MOBILE_LEGEND_QUERY).matches) {
    setLegendOpen(false);
  }
}

function getRouteBridgeIds(route: RouteFeature): string[] {
  return route.geometry.coordinates.flatMap((coordinate) => {
    const bridge = state.bridges.find(
      (item) =>
        item.geometry.coordinates[0] === coordinate[0] &&
        item.geometry.coordinates[1] === coordinate[1],
    );
    return bridge ? [bridge.properties.id] : [];
  });
}

function bindRouteInteractions(map: maplibregl.Map) {
  for (const layerId of ["research-routes", "bridge-chain"]) {
    map.on("click", layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      showRoutePopup(feature.properties, event.lngLat);
    });

    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
      setRouteLayerEmphasis(layerId, true);
    });

    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
      setRouteLayerEmphasis(layerId, false);
    });
  }
}

function setRouteLayerEmphasis(layerId: string, hover: boolean) {
  if (!state.map) return;

  if (layerId === "research-routes") {
    state.map.setPaintProperty("research-routes", "line-width", hover ? 6 : 4);
    state.map.setPaintProperty("research-routes", "line-opacity", hover ? 1 : 0.82);
  } else {
    state.map.setPaintProperty(
      "bridge-chain",
      "line-width",
      hover
        ? ["interpolate", ["linear"], ["zoom"], 9, 5, 14, 8]
        : ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 6],
    );
    state.map.setPaintProperty("bridge-chain", "line-opacity", hover ? 1 : 0.75);
  }
}

function showRoutePopup(properties: Record<string, unknown>, lngLat: maplibregl.LngLat) {
  if (!state.map) return;

  const read = (key: string) => (properties[key] === undefined ? "" : String(properties[key]));
  const lines = [
    `<strong class="popup-title">${escapeHtml(read("name"))}</strong>`,
    `<span>${escapeHtml(read("day"))}${read("group") ? ` · ${escapeHtml(read("group"))}` : ""}</span>`,
    read("date") ? `<span>${escapeHtml(read("date"))}</span>` : "",
    properties.sampleCount !== undefined ? `<span>回收问卷 ${Number(properties.sampleCount)} 份</span>` : "",
    read("summary") ? `<span>${escapeHtml(read("summary"))}</span>` : "",
  ].filter(Boolean);

  replacePopup(lngLat, lines.join("<br/>"));
}

function replacePopup(lngLat: maplibregl.LngLatLike, html: string) {
  if (!state.map) return;

  state.popup?.remove();
  state.popup = new maplibregl.Popup({ closeButton: false, maxWidth: "280px" })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(state.map);
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

function renderEmphasis(text: string): string {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts
    .map((part, index) => (index % 2 === 1 ? `<strong>${escapeHtml(part)}</strong>` : escapeHtml(part)))
    .join("");
}
