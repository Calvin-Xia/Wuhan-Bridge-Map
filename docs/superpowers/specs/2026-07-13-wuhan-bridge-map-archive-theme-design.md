# 武汉桥见江城：江岸档案与测绘读数主题升级

## 状态

设计已获用户批准，进入实现与验证阶段。

## Design Read

这是面向课堂展示和公众阅读的叙事型数字地图 redesign preserve。页面以「江岸档案」为视觉基底，以「档案系统化」组织页头、目录、地图和证据区，使用路线二「测绘读数」处理指标数字。

## Goals

- 让页头从单一标题区升级为「左侧叙事、右侧读数」的档案索引。
- 使用 Roboto Mono 等宽数字强化项目指标的测绘感，同时保留中文阅读优先级。
- 增加可访问的日间 / 暗夜切换，首次跟随系统，手动选择后记忆。
- 让页面外壳、MapLibre 地图、控件、弹窗、图表和状态文字保持同一主题。
- 保留现有数据、地图交互、桥梁目录、图表 ID、无障碍文本和响应式信息架构。

## Non-goals

- 不修改 GeoJSON、故事、来源或问卷数据。
- 不更换地图服务，不引入 UI 框架、动画库或新的状态管理依赖。
- 不重建地图实例，不重置当前桥梁、中心点、缩放或图表数据。
- 不改变页面标题、路径、地图容器 ID 和图表 ID。

## Typography

```css
--font-sans: "Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
--font-number: "Roboto Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
```

- H1 继续使用 Noto Sans SC，800 字重和现有尺寸区间。
- 指标数字使用 Roboto Mono，500 字重，`font-variant-numeric: tabular-nums`。
- 中文指标标签使用 Noto Sans SC，英文辅助标签作为低对比度元信息。
- 数值不补零，字体加载失败时使用系统等宽字体，不阻断内容显示。

## Theme Contract

```ts
export type ThemeMode = "light" | "dark";
export const THEME_STORAGE_KEY = "wuhan-bridge-map-theme";
export const THEME_CHANGE_EVENT = "bridge-theme-change";
```

主题解析顺序：

1. 合法的 `localStorage` 值。
2. `matchMedia("(prefers-color-scheme: dark)")`。
3. 日间主题作为无 API 环境的 fallback。

主题写入 `html[data-theme]`。浅色时按钮显示「暗夜」，暗色时显示「日间」，按钮使用 `aria-pressed` 表示当前暗夜状态，并使用动态 `aria-label` 说明下一步动作。切换后派发：

```ts
new CustomEvent("bridge-theme-change", {
  detail: { mode },
});
```

系统偏好监听只在用户没有手动保存值时生效。`localStorage` 失败时不抛出阻断错误。

## Map Theme

日间地图：`#d9e3df` 背景、0.96 raster opacity、-0.12 saturation、0.04 contrast、0 至 1 brightness、`#edf1ed` halo、`#0f1a17` point stroke。

暗夜地图：`#20302b` 背景、0.90 raster opacity、-0.32 saturation、0.08 contrast、0.12 至 0.76 brightness、`#17231f` halo、`#edf4ef` point stroke。

底图使用 `setPaintProperty` 更新。路线颜色继续使用数据字段，不被主题重写，以保留路线语义。

## Chart Theme

图表继续从 CSS 变量构造 `ChartTheme`。主题事件触发后对已保存的 ECharts 实例重新调用 `setOption`，不重新请求数据、不改变数据顺序、不启动循环动画。

## Responsive and Accessibility

- 桌面端：页头左侧叙事，右侧指标和主题工具。
- 980px 以下：指标和主题工具移到标题下方，地图仍然优先。
- 560px 以下：指标保持紧凑网格，主题按钮最小 44px，页面无横向滚动。
- 主题按钮、桥梁目录和地图控件有清晰的 focus-visible 状态。
- 动效只用于状态反馈和已有一次性 reveal，并遵守 `prefers-reduced-motion`。

## Acceptance Criteria

- 浅色、暗色、系统偏好和手动记忆行为均可验证。
- 主题切换不重置桥梁选择、地图中心点、缩放或图表数据。
- 1280px、768px、390px 下无横向滚动，主题按钮可操作。
- `npm test` 与 `npm run build` 通过。
- 8789 若已运行只进行热更新验证，不停止、不重启、不接管。
