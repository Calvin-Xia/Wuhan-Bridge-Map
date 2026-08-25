# DESIGN.md

> 让武汉桥梁的空间关系、调研证据与市民叙事在一张清晰、克制、可阅读的地理档案中自然展开。

> **现值说明（2026-08-25）**：本文档的视觉规范（配色 token、字阶、分隔线/边框规则、动效与可访问性）仍然现役；其中涉及 **MapLibre/天地图引擎与旧工作区结构** 的部分已随底图迁移（高德 JS API v2、100vh 地图区等）过时，以 `AGENTS.md` 与代码为准。

## 1. Visual Theme & Atmosphere

**Style**: 江岸档案

**Keywords**: 地理档案、浅色水系、工程叙事、证据优先、线性目录、克制、可读性、公共教育

**Tone**: 平静、可靠、具有实地调研感，不做旅游攻略式热闹界面，也不做数据驾驶舱。

**Feel**: 像一张被认真整理、可以边读边定位的武汉桥梁田野地图。

**Design Read**: 这是面向课堂展示和公众阅读的叙事型数字地图，以浅色地理档案语言组织桥梁、路线和证据。

**Interaction Tier**: L1 为基础，局部采用不打扰阅读的 L2 交互。

**Dependencies**: 现有 Astro、MapLibre GL JS、ECharts、CSS 和原生 `IntersectionObserver`。不新增动画库。

**Redesign Mode**: Preserve。保留标题、数据、地图行为、桥梁目录、图表和现有的青绿品牌基调，仅重构视觉层级与 DOM 结构。

## 2. Color Palette & Roles

```css
:root {
  /* Backgrounds */
  --bg: #edf1ed;
  --surface: #f7f8f4;
  --surface-alt: #e1e8e4;
  --surface-hover: #e6f0ef;
  --map-wash: #d9e3df;

  /* Borders */
  --border: #c6d0ca;
  --border-strong: #9fb0a9;
  --border-hover: #08768d;

  /* Text */
  --text: #17231f;
  --text-strong: #0f1a17;
  --text-secondary: #5f6d67;
  --text-tertiary: #62706a;
  --text-on-accent: #eef6f3;

  /* Accent */
  --accent: #08768d;
  --accent-hover: #075466;
  --accent-soft: #d7e9eb;

  /* Semantic evidence colors. These never replace the interaction accent. */
  --evidence: #cf6245;
  --warning: #9f7741;
  --success: #39715d;
  --error: #a34136;

  /* RGB variants for alpha compositing */
  --bg-rgb: 237, 241, 237;
  --surface-rgb: 247, 248, 244;
  --text-rgb: 23, 35, 31;
  --accent-rgb: 8, 118, 141;
  --evidence-rgb: 207, 98, 69;
}
```

**Color Rules:**

- 页面所有颜色从以上语义变量取得。组件规则中不写硬编码色值。
- 江蓝是唯一交互强调色，用于选中、链接、键盘焦点和可操作控件。
- 橙褐仅表示访谈、观察或问卷中的证据重点，不用作按钮、导航或装饰。
- 地图底图低饱和处理，保证桥梁路线、活动点位和文字标签先被看见。
- 深色模式仍沿用同一语义变量名，由页面根节点的 `data-theme` 整体替换，不能让不同区段自行反转主题。
- 首次访问跟随 `prefers-color-scheme`，用户手动选择后使用 `localStorage` 记忆，并覆盖系统变化。

## 3. Typography Rules

**Font Stack:**

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&family=Roboto+Mono:wght@400;500;600&display=swap');

:root {
  --font-sans: "Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
  --font-number: "Roboto Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
| --- | --- | --- | --- | --- | --- |
| Page H1 | `--font-sans` | `clamp(2rem, 3.6vw, 3.4rem)` | 800 | 1.1 | 0 |
| Section H2 | `--font-sans` | `clamp(1.5rem, 2.6vw, 2.45rem)` | 800 | 1.2 | 0 |
| Panel H3 | `--font-sans` | `1rem` | 700 | 1.45 | 0 |
| Body | `--font-sans` | `1rem` | 400 | 1.75 | `0.02em` |
| Metadata | `--font-sans` | `0.8125rem` | 600 | 1.55 | `0.01em` |
| Number | `--font-number` | context-specific | 500 | 1 | 0 |

**Typography Rules:**

- 标题只通过字重、大小与留白建立层级，不用渐变、描边或投影。
- 正文最小 15px，中文段落行高不低于 1.7，避免地图和证据文字显得拥挤。
- 数字指标使用 `font-variant-numeric: tabular-nums`，便于纵向比较。
- 页头指标数字使用 `--font-number`，中文标签继续使用 `--font-sans`，形成测绘读数与档案说明的字阶对比。
- 桥梁名称、路线名称和证据标题优先使用完整中文词组，不做全大写英文式标签。
- **NEVER use**: Inter 作为默认字体、无品牌理由的衬线字体、渐变文字、装饰性斜体。

**Text Decoration:**

- H1: 无渐变、无投影。
- H2: 无渐变、无投影。
- 标签: 用江蓝色和正常字重表达类别，不加宽字距的全大写装饰。
- 链接: 仅使用颜色变化和 2px 下划线滑入效果。

## 4. Component Stylings

组件应由语义化元素构成。优先使用 `header`、`section`、`aside`、`article`、`nav`、`ul`、`li`、`button`、`dl` 和 `figure`。每个功能组最多使用一个非语义包装元素，不得出现容器内再套同视觉容器的结构。

### Buttons and Bridge Items

```css
.bridge-item,
.control-button {
  min-height: 44px;
  padding: 0.75rem 0.8rem;
  color: var(--text);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.bridge-item:hover,
.control-button:hover {
  color: var(--text-strong);
  background: var(--surface-hover);
  border-color: var(--border-hover);
  transform: translateY(-1px);
}

.bridge-item:active,
.control-button:active {
  transform: translateY(1px) scale(0.99);
}

.bridge-item:focus-visible,
.control-button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.bridge-item[aria-current="true"],
.bridge-item.is-active {
  color: var(--accent-hover);
  background: var(--accent-soft);
  border-color: var(--accent);
}

.bridge-item:disabled,
.control-button:disabled {
  color: var(--text-tertiary);
  background: var(--surface-alt);
  border-color: var(--border);
  cursor: not-allowed;
  opacity: 0.58;
  transform: none;
}
```

### Evidence Items and Map Surface

```css
.map-column {
  overflow: hidden;
  background: var(--map-wash);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.evidence-item {
  padding-block: 1rem;
  border-block-end: 1px solid var(--border);
}

.evidence-item:hover {
  background: var(--surface-hover);
}

.evidence-item:focus-within {
  background: var(--surface-hover);
  box-shadow: inset 3px 0 0 var(--accent);
}

.evidence-item:last-child {
  border-block-end: 0;
}
```

`evidence-item` 是文档式列表行，不是卡片。图表也不使用独立的悬浮卡片，只保留标题、图表画布和必要分隔。

### Navigation and Links

```css
.map-header {
  border-block-end: 1px solid var(--border);
}

.map-header.is-condensed {
  background: rgb(var(--bg-rgb) / 0.94);
}

a {
  color: var(--accent-hover);
  text-decoration-color: transparent;
  text-decoration-thickness: 2px;
  text-underline-offset: 0.22em;
  transition: color 180ms ease, text-decoration-color 180ms ease;
}

a:hover {
  color: var(--accent);
  text-decoration-color: currentColor;
}

a:active {
  color: var(--accent-hover);
}
```

页面没有传统站点导航时，不为视觉完整性虚构导航栏。`is-condensed` 只可在小屏折叠标题区时使用，不引入滚动监听或毛玻璃。

### Tags, Status and Quotations

```css
.tag,
.source-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding-inline: 0.55rem;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
}

.tag:hover,
.source-chip:hover {
  color: var(--accent-hover);
  border-color: var(--accent);
}

.tag:focus-visible,
.source-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.map-status {
  max-width: min(28rem, 100%);
  padding: 0.65rem 0.8rem;
  color: var(--text-on-accent);
  background: rgb(var(--text-rgb) / 0.88);
  border: 1px solid rgb(var(--surface-rgb) / 0.18);
  border-radius: 8px;
}

.quote {
  padding-inline-start: 1rem;
  color: var(--text);
  border-inline-start: 3px solid var(--evidence);
}
```

标签只用于真实类别或资料来源，不能作为图片角标或装饰性状态点。

## 5. Layout Principles

**Structure:**

```text
main.app-shell
  section.map-stage
    header.map-header
    aside.story-rail
      nav[aria-label="桥梁目录"] > ul.bridge-list > li > button.bridge-item
    section.map-column
      aside.map-legend > ul.map-legend-list > li > button.map-legend-entry
  section.evidence-band
    header.evidence-heading
    figure.chart-block (three + two + two, 共七张)
    section.voice-band
      ul.voice-list (网络版 / 现场版两组)
article#story-panel（body 直属故事卡弹窗）
  div.story-modal-bar（返回钮 + 当前点位胶囊，面板内首行）
  div#story-panel-content（故事卡内容）
div.story-modal-backdrop（全屏背景层：压暗 + 地图 filter 模糊）
aside#story-hint（首次引导提示，会话级一次）
```

`story-rail` 与 `map-column` 是同一工作区的直接子元素。目录中 `li > button` 直接表达可选桥梁，不能再插入“卡片外壳”或装饰性 `div`。

**Container:**

- 应用区最大宽度: 不设人为窄上限，地图工作区使用完整可用视口。
- 证据区最大宽度: 1184px。
- 页面内边距: `clamp(0.75rem, 2vw, 1.5rem)`。
- 长文本最大宽度: 68ch。

**Spacing Scale:**

- 区段间距: `clamp(2.5rem, 6vw, 5rem)`。
- 组件间距: `0.5rem`、`0.75rem`、`1rem`、`1.5rem`。
- 工作区间距: `clamp(0.75rem, 1.5vw, 1.25rem)`。

**Grid:**

```css
.workspace {
  display: grid;
  grid-template-columns: minmax(22rem, 0.72fr) minmax(0, 1fr);
  gap: clamp(0.75rem, 1.5vw, 1.25rem);
  min-height: 0;
}

.chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.9fr) minmax(0, 1.05fr);
  gap: clamp(1.25rem, 3vw, 2.5rem);
}
```

## 6. Depth & Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | 背景色与 1px 分隔线 | 证据区、图表、目录列表 |
| Defined | 1px 边框，无阴影 | 地图边界、桥梁选项、状态控件 |
| Floating | `0 16px 38px rgb(var(--text-rgb) / 0.12)` | 地图浮动状态和原生地图弹窗 |

规则：视觉层次优先由留白、排版和分隔线实现。不可将多个浮层连续嵌套，普通内容区默认不使用阴影。

## 7. Animation & Interaction

**Motion Philosophy**: 动画只说明“内容已进入”“当前点位已改变”或“控件已被操作”，不为装饰制造持续运动。

**Tier**: L1 基础，局部 L2 仅用于一次性证据区 reveal。

### Dependencies

不新增依赖。继续由 Astro 直接加载现有 TypeScript 模块。

### Entrance Animation

```css
@media (prefers-reduced-motion: no-preference) {
  .page-enter {
    animation: page-enter 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes page-enter {
    /* 纯 opacity：动画带 transform（含结束帧 translateY(0)）会被 fill:both
       永久残留——transform 祖先会成为 fixed 弹窗的包含块（实测踩坑）。 */
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .reveal {
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .reveal.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Scroll Behavior

```ts
const observer = new IntersectionObserver(
  (entries, activeObserver) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      activeObserver.unobserve(entry.target);
    }
  },
  { threshold: 0.16 },
);

document.querySelectorAll<HTMLElement>(".reveal").forEach((element) => observer.observe(element));
```

该 reveal 只用于证据标题和七个图表区，触发一次后停止观察。禁止视差、滚动劫持、固定区段和全局滚动监听。

### Hover, Focus and Selection

- 桥梁目录、地图标记和相关故事同步更新，状态变化时只使用 180ms 颜色和 1px 位移。
- 地图飞行（高德 `setZoomAndCenter`；旧 MapLibre 约定沿用）仅在用户选择桥梁时发生，时长应在 550-700ms，不能随页面滚动自动移动。
- ECharts 保留 tooltip 与数据高亮，不增加循环图表动画。
- 每一个鼠标悬停规则必须有等价的 `:focus-visible` 键盘样式。

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }

  .reveal {
    opacity: 1;
    transform: none;
  }
}
```

## 8. Do's and Don'ts

### Do

- 让地图成为工作区中面积最大、对比最清晰的元素。
- 使用直接的语义层级和一层内边距组织内容。
- 用留白、标题和细分隔线组织证据，而非通用卡片。
- 让选中的桥梁在目录、地图与故事区有一致的江蓝反馈。
- 保留真实数据加载、错误状态、键盘可达性和现有资料来源。
- 对每个动效说明其信息目的，并提供 `prefers-reduced-motion` 降级。

### Don't

- ❌ 不做框中套框、卡片中再放卡片，或为排版添加无意义 `div`。
- ❌ 不将七个图表制作成相同悬浮卡片。
- ❌ 不使用紫蓝霓虹、通用玻璃拟态或大面积模糊（**故事卡弹窗的背景虚化为有意例外**：地图容器 `filter: blur(8px)` 仅在弹窗打开时应用，压暗 0.45 保证阅读对比）。
- ❌ 不使用标题渐变、文字投影、装饰性大写标签或编号眉题。
- ❌ 不使用滚动进度条、视差、滚动劫持、固定滚动叙事或全局自定义光标。
- ❌ 不用旅游攻略式图标、彩色状态点或无证据的精确统计数字。
- ❌ 不改变既有数据字段、桥梁 ID、地图容器 ID 或无障碍文本。
- ❌ 不为了视觉效果引入新的 UI 框架、动画库或图片生成素材。

## 9. Archive System Theme Upgrade

本次升级是对现有江岸档案的定向演进，不改变页面信息架构、数据字段、桥梁 ID、地图容器 ID 或图表 ID。

### Header and Metrics

- 页头左侧保留眉题、主标题与摘要，右侧组织三组项目指标和主题切换按钮。
- 指标数字使用 Roboto Mono、500 字重与 `tabular-nums`，不强制补零，不改变真实数据。
- 指标中文标签使用 Noto Sans SC，英文辅助标签仅作为低对比度信息层。
- 主题按钮显示下一步动作：日间主题显示「暗夜」，暗夜主题显示「日间」。按钮最小尺寸为 44px，必须提供 `aria-pressed`、动态 `aria-label` 和键盘焦点。

### Theme State Contract

```ts
type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "wuhan-bridge-map-theme";
const THEME_CHANGE_EVENT = "bridge-theme-change";
```

- `html[data-theme="light"]` 与 `html[data-theme="dark"]` 是唯一页面主题入口。
- 没有保存值时解析系统偏好，手动切换后保存用户选择。
- 主题切换只更新视觉状态，不重新请求数据，不重置桥梁选择、地图中心点或地图缩放。
- `localStorage` 不可用时保持当前会话状态，不让主题错误阻断地图和图表初始化。

### Map and Chart Synchronization

- 地图外壳、地图控件、弹窗和标签从语义变量取色。
- 地图底图在 MapLibre style 已加载后使用 `setPaintProperty` 更新，不重建地图实例。
- 路线仍使用数据提供的语义颜色，桥梁 halo、点位描边和底图明度随主题切换。
- ECharts 继续从 CSS 变量读取颜色，主题事件触发后重新设置 option，保持动画关闭、数据顺序和画布尺寸不变。

### Responsive and Accessibility

- 桌面端使用「左侧叙事、右侧读数」的页头布局。
- 980px 以下将指标与主题按钮移到标题内容下方，地图继续优先显示。
- 560px 以下保持紧凑指标网格与 44px 主题按钮，禁止横向溢出。
- 所有主题、按钮、地图控件和图表状态都必须同时通过键盘、焦点样式和文本状态表达。
- 所有主题过渡保持 150-300ms，并在 `prefers-reduced-motion: reduce` 下关闭。

## 10. Responsive Behavior

| Name | Width | Key Changes |
| --- | --- | --- |
| Desktop | `> 980px` | 左侧桥目录固定宽度，地图占主区域，证据图表为三列 + 两列 + 两列（共七张）。 |
| Tablet | `561px-980px` | 地图置于上方，桥目录在下方纵向排列，图表单列。 |
| Mobile | `<= 560px` | 标题和指标纵向排列，目录可横向滑动，地图最小高度 32rem，所有证据区单列。 |

**Touch Targets:** 所有可点按项目最小为 44px × 44px。

**Collapsing Strategy:** 小屏不把地图缩成小组件。优先保留完整地图区域，再将桥梁目录转为横向滚动列表，**故事卡做成全端统一弹窗浮层**（移动端底部悬浮卡：顶部露 8dvh 背景 + 自适应限高内滚；桌面居中卡：`min(34rem, 100vw−2.5rem)`）。图表按阅读顺序一列排列。

```css
@media (max-width: 980px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .map-column {
    min-height: 62vh;
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .map-stage,
  .evidence-band {
    padding-inline: 0.75rem;
  }

  .bridge-list {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x proximity;
  }

  .bridge-list > li {
    flex: 0 0 min(15rem, 84vw);
    scroll-snap-align: start;
  }

  .map-column {
    min-height: 32rem;
  }
}
```

## 11. Data Integration Upgrade (2026-08)

调研材料（两份问卷分析、开放题质性分析、三组工作总结）已整合进数据层，本页现役事实如下：

- **桥梁**：8 座（青山长江大桥已从全部数据、路线与链线校验中移除）。点位调研状态按现场样本更新：已实地调研 7 座、待实地核验 1 座（天兴洲）、资料整理中 1 座（青山已删，实际为 8 座清单）。
- **问卷证据**：`survey-summary.json` 聚合网络版（228 份）与现场版（57 份）；图表 7 张——最熟悉桥梁、信息来源、公共价值、科技治理期待、近期改善优先级、网络版/现场版开放题主题。多选型数据用横向条形图（饼图会误导为构成比），最高项用证据色高亮，tooltip 展示完整题项、人数、占比与均值。
- **市民之声**：`voices.json` 收录无法归位到单一桥梁的开放回答引语（网络版 2 条、现场版 17 条），按问卷分两组以文档式列表行呈现，全部匿名。
- **故事面板**：每个点位包含现场观察、引用（带出处标签）、问卷与开放题证据列表、分段加粗的调研分析（`**重点**` 标记渲染为 `<strong>`）。
- **路线**：调研路线命名改为「组 A/B/C + 调研组名」，属性含 `group`/`date`/`sampleCount`；地图左上角图例为可点击按钮，点击聚焦该线路并让左侧跟随到线路第一座桥；路线 hover 加粗提亮（`setPaintProperty` 整层，不使用 feature-state）。
- **地图浮层**：图例、状态提示使用实色表面 + 1px 边框（不透明，避免底图文字透出）；错误提示只在源/样式级错误时显示，瓦片级错误不打扰用户。
