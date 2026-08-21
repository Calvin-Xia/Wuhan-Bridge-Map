# 武汉桥梁地图连线与证据区体验优化 Implementation Plan

> 历史归档（2026-07-13）：该计划已执行完毕；后续迭代（8 桥、数据整合、路线交互）以根目录 `DESIGN.md` 与 `AGENTS.md` 为准。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重启 8788 热更新 dev 的前提下，修正 9 座桥的中心点、加入二七长江大桥和连续串联线，采用 A 方案收窄地图，并修复图表注释与一次性图标动效。

**Architecture:** 静态 GeoJSON/JSON 继续作为地图和故事的唯一数据源；新增桥梁链路校验器，保证串联路线坐标与点位同步。MapLibre 继续负责底图、点位和路线图层，Astro/CSS 负责 42% 内容栏 + 58% 地图栏和图表标题图标，ECharts 负责可见标签、tooltip 与 hover emphasis。

**Tech Stack:** Astro 7, TypeScript 6, MapLibre GL JS 5, ECharts 6, Tailwind CSS 4, Vitest 4.

---

## 文件边界

- Create: `src/lib/bridge-chain.ts` — 桥梁串联顺序、路线 id 和点位/路线一致性校验。
- Create: `src/lib/bridge-chain.test.ts` — 串联路线的失败测试、生产数据回归测试。
- Create: `src/lib/map-layer-spec.ts` — MapLibre 路线、连续线和桥梁点位图层的结构化契约。
- Create: `src/lib/ui-contract.test.ts` — 页面需要的图表 icon 和工作区语义契约。
- Create: `src/lib/chart-options.ts` — 可独立测试的 ECharts 选项工厂。
- Create: `src/lib/chart-options.test.ts` — 饼图标注、强调态和柱状图留白回归测试。
- Modify: `src/lib/data-validation.ts` — 将桥梁串联路线纳入研究数据校验。
- Modify: `src/lib/data-validation.test.ts` — 增加桥梁与串联路线缺失/错位测试。
- Modify: `public/data/bridges.geojson` — 修正 8 个中心点，新增二七长江大桥。
- Modify: `public/data/routes.geojson` — 同步既有路线端点，新增 9 点连续桥梁串联线。
- Modify: `public/data/stories.json` — 增加二七长江大桥故事卡片。
- Modify: `src/scripts/map-app.ts` — 绘制串联线双层图层，保持既有路线与 marker 交互。
- Modify: `src/pages/index.astro` — 三个图表标题增加可访问的语义图标。
- Modify: `src/styles/global.css` — A 方案 42/58 双栏、紧凑地图高度、图表列宽和 icon 一次性动效。
- Modify: `src/scripts/charts.ts` — 修复饼图外置注释、标签布局和 hover/focus 放大。
- Verify: 8788 页面、`npm test`、`npm run validate:data`、`npm run build`。

## Task 1: 为桥梁串联路线建立可测试的数据契约

**Files:**
- Create: `src/lib/bridge-chain.test.ts`
- Create: `src/lib/bridge-chain.ts`
- Modify: `src/lib/data-validation.ts`
- Modify: `src/lib/data-validation.test.ts`

- [ ] **Step 1: 写失败测试，先证明串联路线契约尚不存在**

在 `src/lib/bridge-chain.test.ts` 写入：

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BRIDGE_CHAIN_IDS,
  BRIDGE_CHAIN_ROUTE_ID,
  getBridgeChainCoordinates,
  validateBridgeChain,
} from "./bridge-chain";
import type { BridgeFeatureCollection, RouteFeatureCollection } from "./data-validation";

const bridges = JSON.parse(
  readFileSync(new URL("../../public/data/bridges.geojson", import.meta.url), "utf8"),
) as BridgeFeatureCollection;
const routes = JSON.parse(
  readFileSync(new URL("../../public/data/routes.geojson", import.meta.url), "utf8"),
) as RouteFeatureCollection;

describe("bridge chain", () => {
  it("defines the approved nine-bridge order", () => {
    expect(BRIDGE_CHAIN_IDS).toEqual([
      "qingchuan-bridge",
      "wuhan-yangtze-river-bridge",
      "yingwuzhou-yangtze-river-bridge",
      "yangsigang-yangtze-river-bridge",
      "baishazhou-yangtze-river-bridge",
      "wuhan-second-yangtze-river-bridge",
      "erqi-yangtze-river-bridge",
      "tianxingzhou-yangtze-river-bridge",
      "qingshan-yangtze-river-bridge",
    ]);
  });

  it("matches the production chain route to the production bridge centers", () => {
    expect(validateBridgeChain(bridges, routes)).toEqual([]);
    expect(routes.features.find((route) => route.properties.id === BRIDGE_CHAIN_ROUTE_ID)?.geometry.coordinates)
      .toEqual(getBridgeChainCoordinates(bridges));
  });
});
```

- [ ] **Step 2: 运行单测，确认测试因模块/契约缺失而失败**

Run: `npm test -- src/lib/bridge-chain.test.ts`

Expected: FAIL because `src/lib/bridge-chain.ts` does not exist yet or the production route does not contain the required chain.

- [ ] **Step 3: 写最小串联契约实现**

在 `src/lib/bridge-chain.ts` 写入：

```ts
import type {
  BridgeFeatureCollection,
  Coordinate,
  RouteFeatureCollection,
} from "./data-validation";

export const BRIDGE_CHAIN_ROUTE_ID = "route-bridge-chain";

export const BRIDGE_CHAIN_IDS = [
  "qingchuan-bridge",
  "wuhan-yangtze-river-bridge",
  "yingwuzhou-yangtze-river-bridge",
  "yangsigang-yangtze-river-bridge",
  "baishazhou-yangtze-river-bridge",
  "wuhan-second-yangtze-river-bridge",
  "erqi-yangtze-river-bridge",
  "tianxingzhou-yangtze-river-bridge",
  "qingshan-yangtze-river-bridge",
] as const;

export function getBridgeChainCoordinates(bridges: BridgeFeatureCollection): Coordinate[] {
  const byId = new Map(bridges.features.map((bridge) => [bridge.properties.id, bridge]));
  return BRIDGE_CHAIN_IDS.flatMap((bridgeId) => {
    const bridge = byId.get(bridgeId);
    return bridge ? [bridge.geometry.coordinates] : [];
  });
}

export function validateBridgeChain(
  bridges: BridgeFeatureCollection,
  routes: RouteFeatureCollection,
): string[] {
  const issues: string[] = [];
  const route = routes.features.find((candidate) => candidate.properties.id === BRIDGE_CHAIN_ROUTE_ID);
  const coordinates = getBridgeChainCoordinates(bridges);

  if (!route) {
    return [`routes must include ${BRIDGE_CHAIN_ROUTE_ID}`];
  }

  if (coordinates.length !== BRIDGE_CHAIN_IDS.length) {
    issues.push(`bridges must include all ${BRIDGE_CHAIN_IDS.length} bridge chain ids`);
  }

  if (route.geometry.coordinates.length !== BRIDGE_CHAIN_IDS.length) {
    issues.push(`${BRIDGE_CHAIN_ROUTE_ID} must contain ${BRIDGE_CHAIN_IDS.length} coordinates`);
  }

  coordinates.forEach((coordinate, index) => {
    const routeCoordinate = route.geometry.coordinates[index];
    if (!routeCoordinate || routeCoordinate[0] !== coordinate[0] || routeCoordinate[1] !== coordinate[1]) {
      issues.push(`${BRIDGE_CHAIN_ROUTE_ID} coordinate ${index} must match the bridge center`);
    }
  });

  return issues;
}
```

- [ ] **Step 4: 在研究数据总校验中调用契约**

在 `src/lib/data-validation.ts` 顶部增加：

```ts
import { validateBridgeChain } from "./bridge-chain";
```

在 `validateResearchDataset` 的 `issues` 数组后追加：

```ts
if (dataset.routes) {
  issues.push(...validateBridgeChain(dataset.bridges, dataset.routes));
}
```

并把 `Coordinate` 类型导出保持为现有的公开类型，供 `bridge-chain.ts` 使用。

- [ ] **Step 5: 为总校验增加错位路线测试**

在 `src/lib/data-validation.test.ts` 增加一个含 `routes` 的最小数据测试，将 `route-bridge-chain` 坐标改成 `[114.3, 30.6]`，断言 `validateResearchDataset` 包含 `route-bridge-chain coordinate 0 must match the bridge center`。

- [ ] **Step 6: 再次运行测试，确认契约测试从红变绿**

Run: `npm test -- src/lib/bridge-chain.test.ts src/lib/data-validation.test.ts`

Expected: PASS after the production data is updated in Task 2; before Task 2 only the helper-level tests may pass.

## Task 2: 更新桥梁点位、二七故事和静态路线数据

**Files:**
- Modify: `public/data/bridges.geojson`
- Modify: `public/data/routes.geojson`
- Modify: `public/data/stories.json`

- [ ] **Step 1: 更新桥梁中心点并增加二七长江大桥**

使用以下中心点（GeoJSON 顺序为 `[longitude, latitude]`）：

```json
{
  "qingchuan-bridge": [114.279, 30.5661],
  "wuhan-yangtze-river-bridge": [114.28201, 30.55262],
  "yingwuzhou-yangtze-river-bridge": [114.27685, 30.53403],
  "yangsigang-yangtze-river-bridge": [114.25637, 30.51026],
  "baishazhou-yangtze-river-bridge": [114.23831, 30.48868],
  "wuhan-second-yangtze-river-bridge": [114.32049, 30.60472],
  "erqi-yangtze-river-bridge": [114.33987, 30.62914],
  "tianxingzhou-yangtze-river-bridge": [114.39302, 30.66807],
  "qingshan-yangtze-river-bridge": [114.4667, 30.6797]
}
```

新增二七 feature 必须包含非空 `themeTags`、`question`、`shortStory`、`mediaIds`，并复用 `source-bridge-catalog` 和 `field-template`。

- [ ] **Step 2: 更新现有调研路线端点并加入连续线**

让 `route-memory` 使用 `qingchuan → wuhan → yingwuzhou`，`route-public-space` 使用 `baishazhou → yangsigang → yingwuzhou`，`route-network` 使用 `wuhan-second → erqi → tianxingzhou → qingshan`。追加：

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [114.279, 30.5661],
      [114.28201, 30.55262],
      [114.27685, 30.53403],
      [114.25637, 30.51026],
      [114.23831, 30.48868],
      [114.32049, 30.60472],
      [114.33987, 30.62914],
      [114.39302, 30.66807],
      [114.4667, 30.6797]
    ]
  },
  "properties": {
    "id": "route-bridge-chain",
    "name": "武汉桥梁群串联线",
    "day": "Bridge Chain",
    "mode": "桥梁地理顺序",
    "color": "#cf6245",
    "summary": "按武汉桥梁群的地理顺序，将 9 座桥串联为一条连续路线。"
  }
}
```

- [ ] **Step 3: 增加二七长江大桥故事**

在 `stories.json` 追加一条 `bridgeId: "erqi-yangtze-river-bridge"`，包含完整的 `title`、`question`、`fieldObservation`、`interviewQuote`、`quoteConsent: "anonymous"`、`analysis`、`ideologicalLink` 和 `evidenceLevel` 字段；文本保持“资料整理中”的占位研究语气，不能伪造已实地调研结论。

- [ ] **Step 4: 运行数据校验，确认 9 座桥和 4 条路线有效**

Run: `npm run validate:data`

Expected: `Data validation passed (9 bridges, 4 routes, 9 stories).`

## Task 3: 让 MapLibre 区分渲染连续桥梁线和既有路线

**Files:**
- Modify: `src/scripts/map-app.ts`

- [ ] **Step 1: 先增加地图脚本契约测试**

在 `src/lib/ui-contract.test.ts` 之外新增一个简单源码契约测试或扩展该文件，断言 `src/scripts/map-app.ts` 包含 `bridge-chain-halo`、`bridge-chain` 和 `route-bridge-chain`，以防数据已存在但没有视觉层。

- [ ] **Step 2: 运行测试确认新图层契约失败**

Run: `npm test -- src/lib/ui-contract.test.ts`

Expected: FAIL because `map-app.ts` currently only has `research-routes`.

- [ ] **Step 3: 过滤既有路线并添加桥梁串联线双层图层**

在 `map.on("load")` 中把既有路线图层改为只绘制非串联线：

```ts
map.addLayer({
  id: "research-routes",
  type: "line",
  source: "routes",
  filter: ["!=", ["get", "id"], "route-bridge-chain"],
  paint: {
    "line-color": ["get", "color"],
    "line-width": 4,
    "line-opacity": 0.82,
  },
});
```

紧接着追加：

```ts
map.addLayer({
  id: "bridge-chain-halo",
  type: "line",
  source: "routes",
  filter: ["==", ["get", "id"], "route-bridge-chain"],
  paint: {
    "line-color": "#edf1ed",
    "line-width": ["interpolate", ["linear"], ["zoom"], 9, 8, 14, 13],
    "line-opacity": 0.9,
    "line-blur": 1.2,
  },
});

map.addLayer({
  id: "bridge-chain",
  type: "line",
  source: "routes",
  filter: ["==", ["get", "id"], "route-bridge-chain"],
  paint: {
    "line-color": ["get", "color"],
    "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 6],
    "line-opacity": 0.92,
    "line-dasharray": [1.2, 1.4],
  },
});
```

- [ ] **Step 4: 运行脚本契约与现有单测**

Run: `npm test -- src/lib/ui-contract.test.ts src/lib/bridge-list-presentation.test.ts`

Expected: PASS.

## Task 4: 实现 A 方案双栏和图表标题 icon 的 DOM 契约

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`
- Create/Modify: `src/lib/ui-contract.test.ts`

- [ ] **Step 1: 写失败的页面契约测试**

在 `src/lib/ui-contract.test.ts` 写入/扩展：

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../pages/index.astro", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/global.css", import.meta.url), "utf8");

describe("dashboard interface contract", () => {
  it("provides one semantic icon per chart", () => {
    expect(page.match(/class="chart-icon"/g)?.length).toBe(3);
    expect(page).toContain('aria-hidden="true"');
  });

  it("declares the balanced workspace and one-shot chart icon animation", () => {
    expect(styles).toContain("grid-template-columns: minmax(22rem, 0.72fr) minmax(0, 1fr)");
    expect(styles).toContain("chart-icon-pop");
  });
});
```

- [ ] **Step 2: 运行测试确认布局契约失败**

Run: `npm test -- src/lib/ui-contract.test.ts`

Expected: FAIL because chart captions have no `.chart-icon` and workspace still uses the old fixed 22rem/1fr definition.

- [ ] **Step 3: 在三个 figcaption 中加入 inline SVG icon**

将每个标题从纯文本改为：

```astro
<figcaption>
  <span class="chart-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false"><path d="M5 19V9m7 10V5m7 14v-7" /></svg>
  </span>
  最熟悉的桥梁
</figcaption>
```

第二、第三个图表使用相同结构但替换 `svg` path，分别表达来源节点和趋势曲线；三个 SVG 都只作为装饰，不增加重复读屏文本。

- [ ] **Step 4: 写 A 方案 CSS 最小实现**

在 `global.css` 中更新：

```css
.workspace {
  grid-template-columns: minmax(22rem, 0.72fr) minmax(0, 1fr);
}

.map-column {
  min-height: 28rem;
}

@media (min-width: 981px) {
  .workspace {
    height: clamp(28rem, 48vh, 34rem);
  }

  .story-rail {
    grid-template-rows: minmax(11rem, 0.9fr) minmax(14rem, 1.1fr);
  }
}

.chart-grid {
  grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.9fr) minmax(0, 1.05fr);
}

.chart-block + .chart-block {
  padding-inline-start: clamp(0.75rem, 2vw, 1.5rem);
}

.chart-block figcaption {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chart-icon {
  display: inline-grid;
  width: 1.65rem;
  height: 1.65rem;
  place-items: center;
  flex: 0 0 auto;
  color: var(--accent-hover);
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  border-radius: 50%;
}

.chart-icon svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

@media (prefers-reduced-motion: no-preference) {
  .reveal.is-visible .chart-icon {
    animation: chart-icon-pop 540ms cubic-bezier(0.16, 1, 0.3, 1) 160ms both;
  }
}

@keyframes chart-icon-pop {
  0% { opacity: 0.4; transform: scale(0.76) rotate(-5deg); }
  65% { opacity: 1; transform: scale(1.12) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
```

- [ ] **Step 5: 运行契约测试**

Run: `npm test -- src/lib/ui-contract.test.ts`

Expected: PASS.

## Task 5: 修复 ECharts 注释与 hover/focus 放大

**Files:**
- Modify: `src/scripts/charts.ts`
- Modify: `src/styles/global.css` only if the chart canvas height needs the final 18rem value.

- [ ] **Step 1: 写图表源码契约测试，先锁定失败行为**

在 `ui-contract.test.ts` 增加：

```ts
const charts = readFileSync(new URL("../scripts/charts.ts", import.meta.url), "utf8");

it("keeps pie annotations visible and emphasizes the hovered slice", () => {
  expect(charts).toContain('position: "outside"');
  expect(charts).toContain("labelLine");
  expect(charts).toContain("emphasis");
});
```

- [ ] **Step 2: 运行测试确认图表契约失败**

Run: `npm test -- src/lib/ui-contract.test.ts`

Expected: FAIL because the current pie option only uses default label behavior and has no emphasis block.

- [ ] **Step 3: 调整饼图 option 让标签始终可见**

在 `mountPieChart` 的 `series` option 中使用：

```ts
{
  type: "pie",
  radius: ["39%", "63%"],
  center: ["37%", "43%"],
  avoidLabelOverlap: true,
  label: {
    show: true,
    position: "outside",
    alignTo: "edge",
    edgeDistance: 8,
    bleedMargin: 4,
    color: theme.ink,
    fontSize: 12,
    lineHeight: 18,
    formatter: ({ name, percent }) => `${name}\n${percent}%`,
  },
  labelLine: {
    show: true,
    length: 10,
    length2: 8,
    lineStyle: { color: theme.line },
  },
  labelLayout: { hideOverlap: false },
  emphasis: {
    scale: true,
    scaleSize: 7,
    itemStyle: {
      shadowBlur: 12,
      shadowColor: "rgba(15, 26, 23, 0.22)",
    },
    label: { fontWeight: 800 },
  },
  data: data.map((item) => ({ name: item.label, value: item.value })),
}
```

If TypeScript reports that the `percent` callback type is not inferred, type the formatter parameter as `{ name?: string; percent?: number }` and use `name ?? ""` / `percent ?? 0`.

- [ ] **Step 4: Improve bar chart label spacing without changing data**

Set the bar chart `grid.bottom` to `68`, `xAxis.axisLabel.margin` to `12`, and keep `interval: 0`/`rotate: 28`; set chart canvas height to `18rem` if the labels still collide.

- [ ] **Step 5: Run chart contract and TypeScript tests**

Run: `npm test -- src/lib/ui-contract.test.ts`; then `npm run build`.

Expected: both commands pass; build output contains no ECharts type errors.

## Task 6: Complete the browser regression pass on the live 8788 dev

**Files:**
- No new production files.
- Verify: `http://127.0.0.1:8788/`.

- [ ] **Step 1: Run the complete automated verification**

Run:

```powershell
npm test
npm run validate:data
npm run build
```

Expected: all Vitest tests pass, data validation reports 9 bridges/4 routes/9 stories, and Astro build exits with code 0.

- [ ] **Step 2: Inspect the live page without restarting its dev server**

Use the already-open 8788 page and wait for hot update. Confirm:

1. The bridge count reads `9` and the list contains `二七长江大桥`.
2. The map has nine labeled markers, with the new chain line visible and the three original route colors still present.
3. At desktop width, `.story-rail` is visibly wider and `.map-column` is about 58% of the workspace; at mobile width there is no horizontal page overflow.
4. Scroll to the evidence band; all three chart icons are visible, the middle pie has readable name/percentage annotations, and hovering a pie slice enlarges it slightly.
5. Toggle `prefers-reduced-motion` in browser emulation and confirm the icon/sector animations are disabled while text stays visible.

- [ ] **Step 3: Check browser diagnostics**

Use the browser console inspection and confirm there are no new errors or warnings after hot update, and the map status reads `点位、路线与故事卡片已加载`.

- [ ] **Step 4: Review the diff and commit only implementation files**

Run:

```powershell
git status --short
git diff --check
git diff -- public/data src/lib src/pages src/scripts src/styles
```

Stage only the implementation files listed in this plan; leave pre-existing user changes (`src/pages/index.astro`, `initial.md`, `src/lib/index-page.test.ts`, `.superpowers/`, and generated inspection assets) out of any commit unless they are deliberately part of the implementation diff.
