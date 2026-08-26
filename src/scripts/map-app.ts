import type {
  BridgeFeature,
  BridgeFeatureCollection,
  RouteFeature,
  RouteFeatureCollection,
  SourceRecord,
  StoryRecord,
} from "../lib/data-validation";
import {
  DARK_MAP_THEME,
  LIGHT_MAP_THEME,
  researchStatusFill,
  researchStatusFillDark,
  type MapLayerTheme,
} from "../lib/map-layer-spec";
import { createBridgeListMarkup, getBridgeSelectionAttributes } from "../lib/bridge-list-presentation";
import { BRIDGE_CHAIN_ROUTE_ID } from "../lib/bridge-chain";
import { parseBridgeHash } from "../lib/bridge-hash";
import { displayInstitutionLabel } from "../lib/story-label";
import {
  DATA_CENTER,
  clampCenterToViewport,
  computeFocusZoom,
  computeOverviewZoom,
  computeZoomFloor,
  isBridgeInViewport,
} from "../lib/map-view";
import {
  clampStoryScroll,
  readStoryScroll,
  type StoryScrollMetrics,
} from "../lib/story-scroll";
import { isThemeMode, THEME_CHANGE_EVENT, type ThemeMode } from "../lib/theme-preferences";

/**
 * 地图层：高德 JS API v2 引擎（官方底图，周更矢量管线）。
 *
 * - key/安全密钥为前端公开常量（构建期可用 import.meta.env.PUBLIC_AMAP_KEY /
 *   PUBLIC_AMAP_SECURITY_CODE 覆盖；防护边界=控制台域名白名单+安全密钥+每日配额）。
 * - 数据（public/data GeoJSON）与初始视野均为 **GCJ-02 口径**（由官方
 *   AMap.convertFrom 一次性转换，生成物在 git；重建方法见 AGENTS.md），
 *   引擎关闭坐标纠偏（isCorrection:false）——官方确认"GCJ-02 坐标在
 *   不同缩放级别显示位置会变"（FAQ 46660），固定投影后可消除缩放漂移。
 * - 明暗主题切换官方样式 amap://styles/normal / darkblue。
 * - 覆盖层（路线/桥链/桥点/标签）为 AMap Marker/Polyline，颜色取自
 *   src/lib/map-layer-spec.ts 调色板。
 */

declare global {
  interface Window {
    AMap?: AmapNamespace;
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

/** AMap JS API 的最小类型面（不引入官方类型包）。 */
type AmapNamespace = {
  Map: new (
    container: string | HTMLElement,
    options: Record<string, unknown>,
  ) => AmapMap;
  Marker: new (options: Record<string, unknown>) => AmapMarker;
  Polyline: new (options: Record<string, unknown>) => AmapPolyline;
  InfoWindow: new (options: Record<string, unknown>) => AmapInfoWindow;
  Pixel: new (x: number, y: number) => unknown;
  event?: { addListener?: (target: unknown, event: string, cb: (...args: unknown[]) => void) => void };
};

type AmapLngLat = [number, number];

type AmapMap = {
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  setStyle: (style: string) => void;
  setZoomAndCenter: (zoom: number, center: AmapLngLat, immediately?: boolean, duration?: number) => void;
  setFitView: (overlays: unknown[], immediately?: boolean, avoid?: number[], maxZoom?: number) => void;
  getZoom: () => number;
  getCenter: () => { getLng: () => number; getLat: () => number };
  destroy: () => void;
};

type AmapMarker = {
  setMap: (map: AmapMap | null) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  getPosition: () => AmapLngLat;
};

type AmapPolyline = {
  setMap: (map: AmapMap | null) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  setOptions: (options: Record<string, unknown>) => void;
  getPath: () => AmapLngLat[];
};

type AmapInfoWindow = {
  open: (map: AmapMap, position: AmapLngLat) => void;
  close: () => void;
};

const AMAP_KEY = import.meta.env.PUBLIC_AMAP_KEY || "02795a456428059711c56b78b60b80b6";
const AMAP_SECURITY_CODE =
  import.meta.env.PUBLIC_AMAP_SECURITY_CODE || "4fdeb357156b1b156a2ccae2cf10ada1";
const AMAP_SCRIPT_URL = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
const AMAP_STYLE_LIGHT = "amap://styles/normal";
const AMAP_STYLE_DARK = "amap://styles/darkblue";

const state = {
  activeBridgeId: "",
  bridges: [] as BridgeFeature[],
  stories: [] as StoryRecord[],
  sources: [] as SourceRecord[],
  routes: null as RouteFeatureCollection | null,
  map: null as AmapMap | null,
  amap: null as AmapNamespace | null,
  infoWindow: null as AmapInfoWindow | null,
  bridgeMarkers: new Map<string, AmapMarker>(),
  routePolylines: new Map<string, AmapPolyline[]>(),
  /** 切桥两段动画：缩小段完成后是否等待推入段。 */
  flyPending: false,
  flyToken: 0,
  /** 程序化全貌定位是否处于"微松兜底"态（仅极宽屏 zoom < 地板时；用户一交互即清除）。 */
  cameraRelaxed: false,
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
    await createMap();
    renderMapLegend(routes);
    bindLegendToggle();
    bindStoryModal();
    if (hashBridgeId) {
      // 一次性深链：弹出该桥故事卡弹窗（地图已在后台完成飞行定位），
      // 随后立即清除 URL hash——刷新/切桥永不重复弹窗。
      openStoryModal();
      clearBridgeHash();
    }
    // 首次引导提示：深链（已示范弹窗）或目录已活跃场景跳过请参照 initStoryHint。
    initStoryHint(Boolean(hashBridgeId));
    byId("bridge-list").setAttribute("aria-busy", "false");
    status.hidden = true;
  } catch (error) {
    byId("bridge-list").setAttribute("aria-busy", "false");
    status.hidden = false;
    status.textContent = "地图或数据载入失败，请稍后刷新重试。";
    console.error(error);
  }
}

/** 动态加载高德 JS API v2（需在脚本前设置安全密钥）。 */
function loadAmapScript(): Promise<AmapNamespace> {
  const existing = window.AMap;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
    const script = document.createElement("script");
    script.src = AMAP_SCRIPT_URL;
    script.onload = () => {
      if (window.AMap) resolve(window.AMap);
      else reject(new Error("AMap script loaded without AMap namespace"));
    };
    script.onerror = () => reject(new Error("Failed to load AMap JS API"));
    document.head.appendChild(script);
  });
}

async function createMap() {
  const status = byId("map-status");
  const amap = await loadAmapScript();
  state.amap = amap;

  const container = byId("bridge-map");
  const rect = container.getBoundingClientRect();
  // 初始视野 = 数据全貌（数据盒 + 圆点边距恰好放满，中心=数据质心）；
  // 宽高比 ≤1.94 时该 zoom ≥ 地板，parity 零妥协；极宽屏时才落入微松兜底。
  const overviewZoom = computeOverviewZoom(rect.width, rect.height);
  const floor = computeZoomFloor(rect.width, rect.height);
  state.cameraRelaxed = overviewZoom < floor;

  const map = new amap.Map("bridge-map", {
    zoom: overviewZoom,
    center: DATA_CENTER,
    viewMode: "2D",
    style: getDocumentTheme() === "dark" ? AMAP_STYLE_DARK : AMAP_STYLE_LIGHT,
    zooms: [9, 17],
    // 数据/初始视野已为 GCJ-02：关闭纠偏，固定投影，避免缩放级漂移。
    isCorrection: false,
  });
  state.map = map;
  // 调试/自动化钩子（无副作用；供 QA 测量缩放漂移）。
  (window as unknown as { __amapDebugMap?: AmapMap }).__amapDebugMap = map;

  // 视口⊆盒的运行时钳制（不用 setLimitBounds——实测拖动中不钳制、松手后回弹
  // 落点错误，见 AGENTS.md 踩坑记录）。zoomchange 只做"软地板"（打断缩放动画
  // 拉到地板）；zoomend/moveend/resize 做全量终检（含中心钳制，不打断动画）。
  map.on("zoomchange", enforceZoomFloor);
  map.on("zoomend", enforceCamera);
  map.on("moveend", enforceCamera);
  map.on("resize", enforceCamera);
  // 切桥两段动画的推入段接力：缩小段结束（moveend）后启动推入段；用户一交互
  // （拖拽/滚轮/双指）即取消（flyPending=false + 令牌失效），尊重用户位置。
  map.on("moveend", onFlyPhaseOneEnd);
  map.on("dragstart", cancelFly);
  container.addEventListener("wheel", cancelFly, { passive: true });
  container.addEventListener("touchstart", cancelFly, { passive: true });

  renderBridgeOverlays();
  renderRouteOverlays();
  applyMapTheme(getDocumentTheme());

  const focusBridge = state.bridges.find(
    (item) => item.properties.id === state.activeBridgeId,
  );
  if (focusBridge && parseBridgeHash(window.location.hash)) {
    // 深度链接定位：初始即全貌，直接单段推入特写（与切换桥同源 zoom）。
    flyToBridge(focusBridge, true);
  }

  map.on("complete", () => {
    status.hidden = true;
  });
}

/** 切桥两段动画：全貌（缩小段）→ 桥特写（推入段）。 */
function flyToBridge(bridge: BridgeFeature, skipOverview = false) {
  const map = state.map;
  if (!map) return;

  const rect = byId("bridge-map").getBoundingClientRect();
  const target = bridge.geometry.coordinates as [number, number];
  const closeZoom = computeFocusZoom(target, rect.width, rect.height);

  if (prefersReducedMotion()) {
    map.setZoomAndCenter(closeZoom, target, true);
    return;
  }

  // 距离感知混合：目标桥已在当前视口内（含边距）→ 单段直达滑行
  // （maplibre 手感，无脉冲无中程停留；初始全貌点任何桥、相邻桥切换均命中）；
  // 目标在视口外（跨江南北/天兴洲等远距）→ 两段"缩小推入"（语境值得展示）。
  const contextVisible = isBridgeInViewport(
    target,
    [map.getCenter().getLng(), map.getCenter().getLat()],
    map.getZoom(),
    rect.width,
    rect.height,
  );
  if (skipOverview || contextVisible) {
    // 深链/同视口直达：直接滑到桥特写。
    map.setZoomAndCenter(closeZoom, target, false, 620);
    return;
  }

  // 缩小段：中心 = 当前↔目标的中点（按地板约束钳制）——中点落在两桥连线上，
  // 路径成直线、无"先往中心走再回来"的折返；zoom 缩到数据全貌尺度并随中点
  // 平移（距离近的桥对看近域上下文，远桥对自然经过质心附近）。
  const current = map.getCenter();
  const mid: AmapLngLat = [
    (current.getLng() + target[0]) / 2,
    (current.getLat() + target[1]) / 2,
  ];
  const overviewZoom = computeOverviewZoom(rect.width, rect.height);
  const floor = computeZoomFloor(rect.width, rect.height);
  const via = clampCenterToViewport(mid, overviewZoom, rect.width, rect.height);
  const token = ++state.flyToken;
  state.flyPending = true;
  state.cameraRelaxed = overviewZoom < floor;
  map.setZoomAndCenter(overviewZoom, via, false, 380);

  // 推入段：由 moveend 接力启动（令牌防串：新切换覆盖旧序列）。
  const startFocus = () => {
    if (state.flyToken !== token || !state.flyPending) return;
    state.flyPending = false;
    state.cameraRelaxed = false;
    map.setZoomAndCenter(closeZoom, target, false, 620);
  };
  flyRelay.listeners.add(startFocus);
}

/** moveend 接力管理器：每次飞行注册一次性启动器（令牌失效即空转）。 */
const flyRelay = { listeners: new Set<() => void>() };

function onFlyPhaseOneEnd() {
  for (const listener of [...flyRelay.listeners]) {
    flyRelay.listeners.delete(listener);
    listener();
  }
}

function cancelFly() {
  state.flyPending = false;
  state.cameraRelaxed = false;
  flyRelay.listeners.clear();
}

/** 缩放软地板：缩放级别低于动态下限时立即拉回（幂等，无回环；微松兜底态除外）。 */
function enforceZoomFloor() {
  const map = state.map;
  if (!map || state.cameraRelaxed) return;
  const rect = byId("bridge-map").getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const floor = computeZoomFloor(rect.width, rect.height);
  const currentZoom = map.getZoom();
  if (currentZoom >= floor) return;

  const centerLngLat = map.getCenter();
  map.setZoomAndCenter(floor, [centerLngLat.getLng(), centerLngLat.getLat()], true);
}

/** 视口⊆研究区盒的全量终检（幂等；越界时一次性瞬移回合法位）。 */
function enforceCamera() {
  const map = state.map;
  if (!map) return;
  const rect = byId("bridge-map").getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const floor = computeZoomFloor(rect.width, rect.height);
  const currentZoom = map.getZoom();
  const centerLngLat = map.getCenter();
  const correctedZoom = currentZoom < floor ? floor : currentZoom;
  const [targetLng, targetLat] = clampCenterToViewport(
    [centerLngLat.getLng(), centerLngLat.getLat()],
    correctedZoom,
    rect.width,
    rect.height,
  );
  const centerMoved =
    Math.abs(targetLng - centerLngLat.getLng()) > 1e-6 ||
    Math.abs(targetLat - centerLngLat.getLat()) > 1e-6;

  if (currentZoom < floor || centerMoved) {
    map.setZoomAndCenter(correctedZoom, [targetLng, targetLat], true);
  }
}

function renderBridgeOverlays() {
  if (!state.map || !state.amap) return;

  for (const bridge of state.bridges) {
    const position = bridge.geometry.coordinates as [number, number];
    const fill = researchStatusFill(bridge.properties.researchStatus);
    const fillDark = researchStatusFillDark(bridge.properties.researchStatus);

    const element = document.createElement("div");
    element.className = "bridge-map-point";
    // 锚点=圆点中心：content 只含 dot，label 绝对定位溢出在下方（不影响锚点计算）。
    element.innerHTML = `
      <span class="bridge-map-dot" style="--point-fill: ${fill}; --point-fill-dark: ${fillDark}"></span>
      <span class="bridge-map-label">${escapeHtml(bridge.properties.name)}</span>
    `;

    const marker = new state.amap.Marker({
      position,
      content: element,
      anchor: "center",
      zIndex: 10,
    });
    marker.setMap(state.map);
    marker.on("click", () => {
      selectBridge(bridge.properties.id, true);
      showBridgePopup(bridge, position);
    });
    state.bridgeMarkers.set(bridge.properties.id, marker);
  }
}

function renderRouteOverlays() {
  if (!state.map || !state.amap || !state.routes) return;

  for (const route of state.routes.features) {
    const props = route.properties;
    const isChain = props.id === BRIDGE_CHAIN_ROUTE_ID;
    const path = route.geometry.coordinates.map((coordinate) => coordinate as [number, number]);

    const halo = new state.amap.Polyline({
      path,
      strokeColor: getMapTheme(getDocumentTheme()).chainHalo,
      strokeWeight: isChain ? 7 : 6,
      strokeOpacity: isChain ? 0.55 : 0,
      strokeStyle: "solid",
      zIndex: 2,
    });
    const line = new state.amap.Polyline({
      path,
      strokeColor: props.color,
      strokeWeight: 4,
      strokeOpacity: 0.82,
      strokeStyle: isChain ? "dashed" : "solid",
      zIndex: 3,
    });

    halo.setMap(state.map);
    line.setMap(state.map);
    state.routePolylines.set(props.id, [halo, line]);

    line.on("mouseover", () => {
      line.setOptions({ strokeWeight: 6, strokeOpacity: 1 });
    });
    line.on("mouseout", () => {
      line.setOptions({ strokeWeight: 4, strokeOpacity: 0.82 });
    });
    line.on("click", (event) => {
      const lngLatObj = (event as { lnglat?: { lng: number; lat: number } }).lnglat;
      const lngLat: AmapLngLat = lngLatObj ? [lngLatObj.lng, lngLatObj.lat] : path[0];
      showRoutePopup(props, lngLat);
    });
  }
}

function applyMapTheme(mode: ThemeMode) {
  const map = state.map;
  if (!map) return;

  map.setStyle(mode === "dark" ? AMAP_STYLE_DARK : AMAP_STYLE_LIGHT);

  const theme = getMapTheme(mode);
  // 覆盖层颜色：桥点经 CSS 变量（地图容器）更新；串链 halo 逐条重涂。
  const container = document.getElementById("bridge-map");
  container?.style.setProperty("--map-point-stroke", theme.pointStroke);
  container?.style.setProperty("--map-point-halo", theme.pointHalo);
  for (const [halo] of state.routePolylines.values()) {
    halo.setOptions({ strokeColor: theme.chainHalo });
  }
}

function getMapTheme(mode: ThemeMode): MapLayerTheme {
  return mode === "dark" ? DARK_MAP_THEME : LIGHT_MAP_THEME;
}

function getDocumentTheme(): ThemeMode {
  const theme = document.documentElement.dataset.theme;
  return isThemeMode(theme) ? theme : "light";
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
  const bridge = state.bridges.find((item) => item.properties.id === bridgeId);
  const story = state.stories.find((item) => item.bridgeId === bridgeId);

  if (!bridge || !story) {
    byId("story-panel-content").innerHTML = `
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
                (() => {
                  const label = displayInstitutionLabel(story.institutionNote.quoteLabel ?? "");
                  return label ? `<cite>${escapeHtml(label)}</cite>` : "";
                })()
              }</blockquote>`
            : ""
        }
        ${story.institutionNote.paragraphs.map((paragraph) => `<p>${renderEmphasis(paragraph)}</p>`).join("")}
      </section>`
    : "";

  // 弹窗内容区（面板首行 bar 为静态结构，不随渲染重建）。
  const fullContentMarkup = `
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

  // 弹窗内容区（bar 为面板静态首行，不在每次渲染的 innerHTML 范围内）。
  byId("story-panel-content").innerHTML = `
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
    ${fullContentMarkup}
  `;

  // 弹窗顶部条的上下文胶囊（桌面端该条不显示，更新无副作用）。
  const contextChip = byId("story-modal-context");
  contextChip.textContent = `当前点位 · ${bridge.properties.name}`;
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
      // 首次查看：面板快速平滑回顶；同桥点击不触发（见下方同一分支）。
      requestAnimationFrame(() => scrollStoryToTop());
    } else {
      // 切回已读过的桥：瞬时恢复进度，避免视觉跳变。
      requestAnimationFrame(() => restoreStoryScroll(savedScroll));
    }
  }

  // 移动端（≤980px）：点桥即打开故事卡弹窗（同桥重开=重弹；桌面端从不弹窗）。
  openStoryModal();

  if (!moveMap || !state.map) return;

  const bridge = state.bridges.find((item) => item.properties.id === bridgeId);
  if (!bridge) return;

  // 切桥动画：先缩到数据全貌（缩小段），再推入桥特写（推入段）。
  flyToBridge(bridge);
}

const storyScrollMemory = new Map<string, number>();
const STORY_SCROLL_DURATION = 180;

function getStoryScrollMetrics(): StoryScrollMetrics {
  const panel = byId("story-panel");
  return {
    viewportWidth: window.innerWidth,
    panelScrollTop: panel.scrollTop,
    panelOffsetTop: Math.max(0, panel.getBoundingClientRect().top + window.scrollY),
    panelScrollHeight: panel.scrollHeight,
    panelClientHeight: panel.clientHeight,
  };
}

function restoreStoryScroll(memory: number) {
  const metrics = getStoryScrollMetrics();
  const panel = byId("story-panel");
  // 进度记忆始终是面板相对值（桌面左栏面板与移动端弹窗共用同一语义）。
  panel.scrollTop = clampStoryScroll(metrics, memory);
}

function scrollStoryToTop() {
  const panel = byId("story-panel");
  animateScroll(panel, panel.scrollTop, 0, STORY_SCROLL_DURATION);
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

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

/** 移动端故事卡弹窗（近全屏）：开合、焦点、ESC、断点复位。 */
const MOBILE_STORY_QUERY = "(max-width: 980px)";

let storyModalReturnFocus: HTMLElement | null = null;

function openStoryModal() {
  const panel = byId("story-panel");
  if (panel.classList.contains("is-open")) return;

  storyModalReturnFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  panel.classList.add("is-open");
  // body class 仅用于显示背景拦截层与地图模糊（不锁滚动——实测 body
  // overflow:hidden 会摧毁窗口滚动位置：打开瞬间 scrollY 归零且解锁不恢复）。
  document.body.classList.add("story-modal-open");
  // 用户已点桥（=已理解机制），首次引导提示随即消失。
  byId("story-hint").hidden = true;
  // 打开时聚焦顶部条关闭按钮（键盘/读屏可达），preventScroll 防止焦点滚动。
  byId("story-modal-close").focus({ preventScroll: true });
}

function closeStoryModal() {
  const panel = byId("story-panel");
  if (!panel.classList.contains("is-open")) return;

  panel.classList.remove("is-open");
  document.body.classList.remove("story-modal-open");
  const back = storyModalReturnFocus;
  storyModalReturnFocus = null;
  // 焦点还给触发源但禁止浏览器滚动——关闭后视口即"打开前位置"，零干预。
  if (back && back.isConnected) back.focus({ preventScroll: true });
}

/** 一次性深链：弹窗直达后立即清除 URL hash（刷新/切桥永不重复弹窗）。 */
function clearBridgeHash() {
  window.history?.replaceState(null, "", window.location.pathname + window.location.search);
}

function bindStoryModal() {
  // 顶部条整条可点关闭（按钮点击冒泡命中同一监听）；背景层点击同样关闭。
  byId("story-modal-bar").addEventListener("click", closeStoryModal);
  const backdrop = byId("story-modal-backdrop");
  backdrop.addEventListener("click", closeStoryModal);
  // 背景滚轮不穿透（桌面窄窗/触控板场景；触摸由 touch-action: none 拦截）。
  backdrop.addEventListener("wheel", (event) => event.preventDefault(), { passive: false });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeStoryModal();
  });

  // 断点切换（旋转/跨 981px 调整窗口）：离开移动端即复位弹窗，避免 fixed 残留。
  const mobile = window.matchMedia(MOBILE_STORY_QUERY);
  mobile.addEventListener("change", (event) => {
    if (!event.matches) closeStoryModal();
  });
}

/** 首次引导提示（故事卡可发现性）：会话级一次；深链进入（已示范）则跳过。 */
const STORY_HINT_KEY = "wuhan-bridge-map-story-hint-shown";

function initStoryHint(skip: boolean) {
  if (skip) return;
  const hint = byId("story-hint");
  try {
    if (sessionStorage.getItem(STORY_HINT_KEY) === "1") return;
    sessionStorage.setItem(STORY_HINT_KEY, "1");
  } catch {
    /* 隐私模式/存储不可用：本次照常提示 */
  }

  hint.hidden = false;
  byId("story-hint-close").addEventListener("click", () => {
    hint.hidden = true;
  });
  window.setTimeout(() => {
    hint.hidden = true;
  }, 8000);
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

function showBridgePopup(bridge: BridgeFeature, position: AmapLngLat) {
  replaceInfoWindow(
    position,
    `
      <strong class="popup-title">${escapeHtml(bridge.properties.name)}</strong>
      <span>${bridge.properties.openedYear} / ${escapeHtml(bridge.properties.bridgeType)}</span>
    `,
  );
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
  const polylines = state.map && state.routePolylines.get(routeId);
  if (!route || !polylines || !state.map) return;

  state.map.setFitView(polylines, false, [56, 56, 56, 56], 15);

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

function showRoutePopup(properties: Record<string, unknown>, lngLat: AmapLngLat) {
  const read = (key: string) => (properties[key] === undefined ? "" : String(properties[key]));
  const lines = [
    `<strong class="popup-title">${escapeHtml(read("name"))}</strong>`,
    `<span>${escapeHtml(read("day"))}${read("group") ? ` · ${escapeHtml(read("group"))}` : ""}</span>`,
    read("date") ? `<span>${escapeHtml(read("date"))}</span>` : "",
    properties.sampleCount !== undefined ? `<span>回收问卷 ${Number(properties.sampleCount)} 份</span>` : "",
    read("summary") ? `<span>${escapeHtml(read("summary"))}</span>` : "",
  ].filter(Boolean);

  replaceInfoWindow(lngLat, lines.join("<br/>"));
}

function replaceInfoWindow(lngLat: AmapLngLat, html: string) {
  if (!state.map || !state.amap) return;

  state.infoWindow?.close();
  state.infoWindow = new state.amap.InfoWindow({
    content: html,
    offset: new state.amap.Pixel(0, -18),
    maxWidth: 280,
  });
  state.infoWindow.open(state.map, lngLat);
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
