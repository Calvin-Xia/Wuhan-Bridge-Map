/**
 * 地图视野契约（GCJ-02 口径——public/data 已为 GCJ-02，引擎 isCorrection:false，
 * 必须直接喂 GCJ-02 坐标）。
 *
 * - STUDY_AREA_BOUNDS：研究区矩形（相机约束）。语义 = 旧 maplibre maxBounds：
 *   交互时**视口必须完全落在盒内**（parity），实现为"动态缩放下限 + 中心钳制"
 *   （computeZoomFloor / clampCenterToViewport），与 AMap setLimitBounds
 *   （实测：拖动中不钳制、松手后恢复落点错误）无关。
 *   2026-08-25 盒宽从 0.375° 调宽至 0.46°：宽屏下地板由横向驱动，地板处纵向
 *   可见范围 = H·boxLng·cosφ/W 只随盒宽增大——调宽后宽高比 ≤1.94 的容器在
 *   地板/全貌下 8 座桥可全部同框（"视口⊆盒"与"数据全貌"不再冲突）。
 * - DATA_BOUNDS：8 桥 POI 锚点数据盒（与 public/data/bridges.geojson 实测范围
 *   一致，契约测试对照）。数据盒纵向跨度（0.1911°）远大于横向（0.1493°），
 *   因此"全貌"几乎恒由纵向约束驱动。
 * - computeOverviewZoom / computeFocusZoom：程序化定位的纯函数。
 *   - 全貌（初始视野 + 切桥缩小段终点）：中心=数据质心，zoom=数据盒 + 圆点
 *     边距（≈7% 纵向余量 ≈20px）恰好放满；宽高比 ≤1.94 时 zoom ≥ 地板、
 *     parity 零妥协；极宽屏（>1.94）下 zoom < 地板，允许微松兜底
 *     （map-app.ts 的 cameraRelaxed：盒不可见、无城市名，程序化定位专用）。
 *   - 特写（切桥/深链终点）：zoom = max(12.3, 该桥在当前容器下以"视口⊆盒"
 *     居中所需 zoom + 0.05)，边缘桥动态抬升，多数情况回落底值。
 */

export const STUDY_AREA_BOUNDS: {
  southWest: [number, number];
  northEast: [number, number];
} = {
  southWest: [114.105, 30.4],
  northEast: [114.565, 30.725],
};

/** 8 桥数据盒（2026-08-23 POI 锚点实测范围；与 bridges.geojson 同步，见契约测试）。 */
export const DATA_BOUNDS: {
  southWest: [number, number];
  northEast: [number, number];
} = {
  southWest: [114.241491, 30.487668],
  northEast: [114.390765, 30.678816],
};

export const DATA_CENTER: [number, number] = [
  (DATA_BOUNDS.southWest[0] + DATA_BOUNDS.northEast[0]) / 2,
  (DATA_BOUNDS.southWest[1] + DATA_BOUNDS.northEast[1]) / 2,
];

/** 地板余量（zoom 级别上的附加量）：保证交互视口严格小于盒、边缘留缝。 */
export const ZOOM_FLOOR_MARGIN = 0.05;

/** 切桥/深链特写底值 zoom（历史值，中心桥与多数边缘桥直接使用）。 */
export const FOCUS_ZOOM_BASE = 12.3;

/** 特写"合法居中"附加余量（zoom 级别），抵消引擎 zoom 量化与浮点。 */
export const FOCUS_MARGIN = 0.05;

/** 全貌的纵向边距系数：数据盒纵向 ×1.07 ≈ 上下各 20px 圆点余量（全貌 zoom 量级）。 */
export const OVERVIEW_DATA_PAD = 1.07;

const TILE_SIZE = 256;
const DEGREES = 360;

function boxMid(sw: [number, number], ne: [number, number]): [number, number] {
  return [(sw[0] + ne[0]) / 2, (sw[1] + ne[1]) / 2];
}

/** 盒/数据中纬的 Mercator 纵向放大因子 1/cos(lat)（统一用研究区盒中纬）。 */
const midLatRad = boxMid(STUDY_AREA_BOUNDS.southWest, STUDY_AREA_BOUNDS.northEast)[1] * (Math.PI / 180);
const LAT_SCALE = Math.cos(midLatRad);

/**
 * 计算"视口 ⊆ 研究区盒"所需的最低缩放级别（动态缩放下限，交互墙）。
 *
 * Web Mercator 口径（与高德 v2 2D 视图一致，实测 703px @ z11.2 视口宽
 * 0.42022° ≈ 公式值）：世界宽 = 256·2^zoom px 对应 360°；纬向每度像素
 * 放大 1/cos(lat)。因此：
 *   lngFloor = log2( width · 360 / (256 · ΔLng) )
 *   latFloor = log2( height · 360 · cos(盒中纬) / (256 · ΔLat) )
 * 取较大者 + ZOOM_FLOOR_MARGIN。
 */
export function computeZoomFloor(
  widthPx: number,
  heightPx: number,
  bounds: { southWest: [number, number]; northEast: [number, number] } = STUDY_AREA_BOUNDS,
): number {
  const lngFloor = Math.log2((widthPx * DEGREES) / (TILE_SIZE * (bounds.northEast[0] - bounds.southWest[0])));
  const latFloor = Math.log2(
    (heightPx * DEGREES * LAT_SCALE) / (TILE_SIZE * (bounds.northEast[1] - bounds.southWest[1])),
  );
  return Math.max(lngFloor, latFloor) + ZOOM_FLOOR_MARGIN;
}

/** 全貌定位 zoom：数据盒 + 边距恰好放满（纵向恒为驱动轴，横向自动满足）。 */
export function computeOverviewZoom(widthPx: number, heightPx: number): number {
  const latFit = Math.log2(
    (heightPx * DEGREES * LAT_SCALE) / (TILE_SIZE * (DATA_BOUNDS.northEast[1] - DATA_BOUNDS.southWest[1]) * OVERVIEW_DATA_PAD),
  );
  const lngFit = Math.log2(
    (widthPx * DEGREES) / (TILE_SIZE * (DATA_BOUNDS.northEast[0] - DATA_BOUNDS.southWest[0]) * OVERVIEW_DATA_PAD),
  );
  return Math.min(latFit, lngFit);
}

/**
 * 切桥/深链特写 zoom：以该桥为中心且视口 ⊆ 盒所需的最小 zoom
 * （各轴按"桥到盒边缘最近距离"反解），上限加 FOCUS_MARGIN，底值 FOCUS_ZOOM_BASE。
 */
export function computeFocusZoom(
  bridge: [number, number],
  widthPx: number,
  heightPx: number,
  bounds: { southWest: [number, number]; northEast: [number, number] } = STUDY_AREA_BOUNDS,
): number {
  const marginLng = Math.min(bridge[0] - bounds.southWest[0], bounds.northEast[0] - bridge[0]);
  const marginLat = Math.min(bridge[1] - bounds.southWest[1], bounds.northEast[1] - bridge[1]);
  const zLng = Math.log2((widthPx * DEGREES) / (TILE_SIZE * 2 * Math.max(marginLng, 1e-9)));
  const zLat = Math.log2(
    (heightPx * DEGREES * LAT_SCALE) / (TILE_SIZE * 2 * Math.max(marginLat, 1e-9)),
  );
  return Math.max(FOCUS_ZOOM_BASE, Math.max(zLng, zLat) + FOCUS_MARGIN);
}

/**
 * 目标桥是否已在当前视口内（默认：桥心在视口内即视为可见）。
 * 距离感知混合动画的判定：为真 → 单段直达滑行（maplibre 手感，无缩放脉冲）；
 * 为假 → 两段"缩小推入"（脉冲只对"当前看不到目标"的远距跳转有语境价值）。
 */
export function isBridgeInViewport(
  bridge: [number, number],
  center: [number, number],
  zoom: number,
  widthPx: number,
  heightPx: number,
  marginRatio = 1,
): boolean {
  const pxPerDeg = (TILE_SIZE * 2 ** zoom) / DEGREES;
  const halfLng = (widthPx / pxPerDeg / 2) * marginRatio;
  const halfLat = ((heightPx * LAT_SCALE) / pxPerDeg / 2) * marginRatio;
  return (
    Math.abs(bridge[0] - center[0]) < halfLng &&
    Math.abs(bridge[1] - center[1]) < halfLat
  );
}

/**
 * 将视口中心钳制到"视口 ⊆ 研究区盒"的合法范围内（在 zoom ≥ floor 时保证
 * 盒内；zoom < floor 的瞬态下退化为盒中心：视口大于盒时无解，取轴对称位）。
 * 返回保留 6 位小数（引擎精度级），避免浮点往返抖动。
 */
export function clampCenterToViewport(
  center: [number, number],
  zoom: number,
  widthPx: number,
  heightPx: number,
  bounds: { southWest: [number, number]; northEast: [number, number] } = STUDY_AREA_BOUNDS,
): [number, number] {
  const pxPerDeg = (TILE_SIZE * 2 ** zoom) / DEGREES;
  const halfLng = widthPx / pxPerDeg / 2;
  const halfLat = (heightPx * LAT_SCALE) / pxPerDeg / 2;

  const clampAxis = (value: number, min: number, max: number): number => {
    if (min > max) return (min + max) / 2; // 视口大于盒：无合法位置，取轴对称位
    return Math.min(Math.max(value, min), max);
  };

  const lng = clampAxis(center[0], bounds.southWest[0] + halfLng, bounds.northEast[0] - halfLng);
  const lat = clampAxis(center[1], bounds.southWest[1] + halfLat, bounds.northEast[1] - halfLat);
  return [round6(lng), round6(lat)];
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
