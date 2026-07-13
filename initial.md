# “武汉桥梁实践数字地图”可行性评估报告

## 0. 结论先行

建议做，而且建议把它定位为**“调研成果的可交互展示平台”**，而不是一开始就做成完整的“大型 GIS 平台”或“可多人在线投稿的公众地图系统”。

最合适的技术路线是：

**Astro / Vite + TypeScript + MapLibre GL JS + 静态 GeoJSON/JSON 数据 + Cloudflare Pages 部署；必要时再接入 Pages Functions / Workers + D1 + R2。**

也就是说，先做一个**静态优先、数据驱动、边缘部署、可扩展为轻后端**的数字地图。这样既符合“大思政实践课”对成果展示、材料沉淀、形式创新的要求，也能控制开发量，不至于让项目变成技术开发比赛。

课程材料中明确鼓励使用“大思政课”实践教学数字地图，既可作为选题和案例参考，也可作为实践成果展示的启发来源fileciteturn2file0。你们小组前期材料里已经把“武汉桥梁实践数字地图”设想为成果形式，即用地图标注调研路线、桥梁年代、功能和故事，并与“一桥一问”短视频、问卷图表、访谈摘录、青年 City Walk 路线结合fileciteturn1file16。这一方向与课程要求中的“展示材料可选择性提交调研札记、访谈提纲、访谈录、问卷、活动方案、安全保障与应急预案等”高度兼容fileciteturn2file1。

---

## 1. 项目背景与目标定位

### 1.1 课程背景

“大思政实践课”不是普通参观打卡。课程要求团队完成社会实践报告、个人心得和课堂展示，并强调调研主题要有问题导向、实践价值和成果呈现能力。课程材料中提到，数字地图不仅可以用于查看全国实践基地，也可以参考其他团队如何设计调研主题和呈现成果fileciteturn2file2。报告和展示要求中也明确强调团队报告应包含实践简介、组织、背景、流程、调研报告主要内容、实践成果和展示材料fileciteturn2file1。

因此，你们的数字地图不应只是“把几座桥放到地图上”，而应承担三个功能：

第一，作为**证据组织工具**：把桥梁点位、调研路线、照片、访谈摘录、问卷结论、历史资料统一放到一个空间叙事框架里。

第二，作为**展示传播工具**：课堂展示时可以边讲边点开地图，用“一桥一问”的方式呈现“桥梁如何改变城市与人的生活”。

第三，作为**成果沉淀工具**：实践结束后，地图可以作为报告附录、展示材料、新闻推送、短视频脚本和后续拓展项目的基础。

### 1.2 选题背景

你们的主题是“从‘天堑变通途’到‘人民城市’：武汉桥梁群赋能城市发展与民生获得感的实践调研”。前期材料已经把核心问题概括为：桥梁如何改变武汉三镇之间的通勤、生活和空间联系；桥梁建设如何体现工程技术进步和科技报国精神；青年对武汉桥梁的认知是否停留在“地标打卡”；如何通过青年化、地图化、故事化方式传播武汉桥梁背后的中国式现代化故事fileciteturn1file18。

这说明数字地图的核心不是“地图”，而是**用地图承载调研逻辑**。建议把地图标题暂定为：

**桥见江城：武汉桥梁群与人民城市实践数字地图**

副标题：

**从一桥一问看工程报国、城市治理与民生获得感**

---

## 2. 产品形态评估

### 2.1 不建议做成什么

不建议做成“纯地图打点页”。这种形式容易变成旅游攻略，缺少调研深度。

不建议做成“复杂 GIS 分析平台”。团队是大一实践队，时间集中在 2—3 天，复杂空间分析、遥感影像处理、矢量瓦片生产、后台管理系统都会显著增加风险。

不建议做成“开放投稿平台”。涉及用户认证、内容审核、隐私保护、图片合规和垃圾提交防护，开发和运维成本明显超出本课程需求。

### 2.2 建议做成什么

建议做成一个**“叙事型数字地图网站”**，核心页面包括：

| 模块 | 功能 | 课程价值 |
|---|---|---|
| 首页叙事 | 说明主题、实践队、调研路线、核心问题 | 防止被看作旅游地图 |
| 地图主界面 | 展示桥梁点位、调研路线、江滩/桥下空间、访谈点 | 空间化呈现调研过程 |
| 一桥一问 | 每座桥对应一个核心问题，如“它连接了谁？”“它改变了什么？” | 强化问题导向 |
| 时间轴 | 按桥梁建成年代展示武汉过江通道发展 | 呈现城市发展脉络 |
| 图文卡片 | 每个点位包含照片、访谈摘录、观察记录、资料来源 | 支撑报告证据链 |
| 问卷图表 | 展示青年对武汉桥梁认知来源、熟悉桥梁、获得感评价 | 增强数据分析感 |
| 路线模式 | 生成 1—2 条青年 City Walk / 桥梁文化科普路线 | 对策建议可视化 |
| 附录材料 | 访谈提纲、问卷、实践日志、调研函情况、感谢信等 | 对应课程附件要求 |

优秀报告经验材料也强调，要做好过程性材料整理，对调研数据做可视化处理，用图表形式让结论更清晰，并在展示中突出实践意义与实际成果fileciteturn1file19。数字地图正好可以把“过程材料—数据图表—空间叙事—展示亮点”串起来。

---

## 3. 推荐总体架构

## 3.1 架构关键词

**静态优先、组件化前端、类型化数据、边缘函数补充、对象存储托管媒体、无服务器部署。**

推荐架构如下：

```text id="cpb90k"
GitHub Repository
│
├─ src/
│  ├─ pages/                 Astro 页面
│  ├─ components/            地图、时间轴、卡片、图表组件
│  ├─ layouts/               页面布局
│  └─ styles/
│
├─ public/
│  ├─ data/
│  │  ├─ bridges.geojson     桥梁点位
│  │  ├─ routes.geojson      调研路线
│  │  ├─ stories.json        一桥一问故事卡片
│  │  ├─ survey-summary.json 问卷统计结果
│  │  └─ sources.json        资料来源索引
│  └─ media/                 小体积图片、压缩封面
│
├─ functions/                Cloudflare Pages Functions，可选
│  └─ api/
│
├─ scripts/
│  ├─ validate-data.ts       校验数据格式
│  ├─ build-geojson.ts       CSV/Excel 转 GeoJSON
│  └─ compress-images.ts
│
├─ wrangler.toml             Workers/Pages 配置，可选
└─ package.json
```

### 3.2 推荐部署形态

#### 第一阶段：Cloudflare Pages 静态部署

Cloudflare Pages 适合静态网站和前端项目部署，Pages Functions 可在 Pages 项目中加入认证、表单处理、中间件等后端逻辑；官方文档说明 Pages Functions 运行在 Cloudflare Workers 网络上，可用于构建 full-stack 应用([developers.cloudflare.com](https://developers.cloudflare.com/pages/functions/?utm_source=chatgpt.com))。Astro 也有官方的 Cloudflare Pages 部署指南，适合内容型、静态优先的网站([developers.cloudflare.com](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/?utm_source=chatgpt.com))。

这一阶段足够完成课堂展示和评优材料，后端可以完全不要。

#### 第二阶段：Cloudflare Workers + Static Assets

如果后期要把地图做成长期运行的项目，可以迁移到 Workers Static Assets。Cloudflare Workers 文档说明可以把 HTML、CSS、图片等静态资源与 Worker 一起上传，并由 Cloudflare 负责缓存和浏览器访问服务([developers.cloudflare.com](https://developers.cloudflare.com/workers/static-assets/?utm_source=chatgpt.com))。Workers 官方文档也明确支持 React、Vue、Svelte、Next、Astro、React Router 等框架构建 full-stack 应用([developers.cloudflare.com](https://developers.cloudflare.com/workers/?utm_source=chatgpt.com))。

这一阶段更适合统一管理 API、静态资源、D1 数据库和 R2 媒体存储。

---

## 4. 前端技术栈评估

### 4.1 框架选择

推荐：

```text id="9utk1k"
Astro + TypeScript + MapLibre GL JS + Tailwind CSS + ECharts
```

理由：

Astro 适合内容展示型网站，页面首屏轻，结构清晰，适合把调研报告、故事卡片、图文材料、地图组件整合在一起。互动地图部分可以作为一个 React / Svelte / 原生 TypeScript 岛屿组件加载，避免全站变成重型 SPA。

备选：

```text id="jfw4n7"
Vite + React + TypeScript
```

适合团队中有人熟悉 React，开发交互组件更方便。但纯 React 项目在内容组织、Markdown/MDX 叙事页面方面不如 Astro 自然。

不优先推荐 Next.js。它功能强，但对这个项目偏重，Cloudflare 部署和 SSR 适配也会增加不必要复杂度。

### 4.2 地图库选择

推荐首选：

```text id="s2ogoa"
MapLibre GL JS
```

MapLibre GL JS 是 TypeScript 地图库，使用 WebGL 在浏览器渲染交互式地图和矢量瓦片，样式由 MapLibre Style Spec 控制([maplibre.org](https://www.maplibre.org/maplibre-gl-js/docs/?utm_source=chatgpt.com))。它更“现代”，适合做桥梁年代图层、路线图层、点位聚合、时间轴筛选、故事弹窗等效果。

备选：

```text id="v5b8kg"
Leaflet
```

Leaflet 是轻量、移动端友好的开源交互地图 JavaScript 库，适合简单点位和线路展示([leafletjs.com](https://leafletjs.com/?utm_source=chatgpt.com))。如果团队时间很紧，Leaflet 的上手速度更快。

判断：

| 维度 | MapLibre GL JS | Leaflet |
|---|---|---|
| 现代感 | 高 | 中 |
| WebGL 性能 | 强 | 一般 |
| 上手难度 | 中等 | 低 |
| 适合复杂图层 | 适合 | 基本够用 |
| 适合课程项目 | 推荐 | 保底 |
| 对底图依赖 | 需要认真配置 | 更灵活 |

建议采用 **MapLibre GL JS**，但保留 Leaflet 作为降级方案。若地图底图配置卡住，立刻切到 Leaflet，保证项目按期完成。

### 4.3 UI 与图表

推荐：

```text id="qcfxb8"
Tailwind CSS + ECharts / Observable Plot
```

ECharts 更适合中文环境和常见问卷图表，如柱状图、饼图、折线图、雷达图。Tailwind 适合快速完成响应式布局。

页面风格建议使用：

- 深绿色 / 江蓝色 / 桥梁灰作为主色；
- 地图卡片使用“桥梁档案”风格；
- 时间轴使用“建成时间—功能变化—城市发展”的三段式；
- 每座桥卡片固定包含“基本信息、调研观察、市民声音、思政连接、资料来源”。

---

## 5. 数据架构设计

### 5.1 数据源类型

数字地图应整合五类数据：

| 数据类型 | 示例 | 存储方式 |
|---|---|---|
| 桥梁基础数据 | 名称、位置、跨越水体、建成年份、桥型、功能 | `bridges.geojson` |
| 调研路线数据 | 每天走访路线、点位顺序、交通方式 | `routes.geojson` |
| 调研材料 | 观察记录、访谈摘录、问卷结论、照片说明 | `stories.json` |
| 媒体材料 | 图片、短视频封面、采访照片、队旗合影 | `public/media` 或 R2 |
| 来源索引 | 政府网站、馆方资料、公开文献、实地记录 | `sources.json` |

### 5.2 桥梁数据字段建议

`bridges.geojson` 中每个 Feature 可以这样设计：

```json id="iawte4"
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [114.288, 30.553]
  },
  "properties": {
    "id": "wuhan-yangtze-river-bridge",
    "name": "武汉长江大桥",
    "river": "长江",
    "openedYear": 1957,
    "bridgeType": "公铁两用桥",
    "themeTags": ["工程报国", "城市记忆", "一五计划", "武汉三镇"],
    "question": "它怎样把三镇联系从地理愿望变成日常生活？",
    "shortStory": "作为新中国成立后建设的重要桥梁之一，它改变了武汉三镇交通格局，也成为城市记忆的重要象征。",
    "researchStatus": "已实地调研",
    "mediaIds": ["photo-001", "interview-001"],
    "sourceIds": ["source-001", "field-note-001"]
  }
}
```

### 5.3 故事卡片字段建议

`stories.json`：

```json id="txnkks"
{
  "id": "story-yangsigang-001",
  "bridgeId": "yangsigang-bridge",
  "title": "从过江通勤到桥下公共空间",
  "question": "桥梁除了通车，还给市民留下了什么公共生活空间？",
  "fieldObservation": "桥下空间存在运动、休闲、通行等多种使用方式。",
  "interviewQuote": "这里不仅是桥，也是我们散步和看江的地方。",
  "quoteConsent": "anonymous",
  "analysis": "桥梁基础设施在交通功能之外，也参与塑造城市公共生活。",
  "ideologicalLink": "人民城市、城市治理、民生获得感",
  "evidenceLevel": "field + interview + document"
}
```

### 5.4 原始数据与公开数据分离

强烈建议分成两层：

```text id="bhyydm"
private-data/     不上传 GitHub：原始访谈录音、完整问卷、未打码照片、联系方式
public/data/      可公开：脱敏摘录、聚合统计、公开点位、压缩图片
```

课程材料强调访谈、问卷、观察和文献法的综合使用，也强调录音录像、涉密内容和调研影像的授权边界fileciteturn2file2。因此，地图上只展示经过脱敏处理的内容，不放完整联系方式、不放未授权原话、不放可识别路人的高清照片。

---

## 6. 后端与 Cloudflare 技术栈评估

### 6.1 MVP 阶段：无后端

最推荐的第一版是：

```text id="tj3x3h"
Astro 静态页面
+ MapLibre 地图组件
+ public/data/*.json
+ public/data/*.geojson
+ public/media/*
+ Cloudflare Pages
```

优点：

- 开发快；
- 不需要登录系统；
- 不需要数据库；
- 不担心 API 被刷；
- 可以完全通过 Git 管理数据；
- 展示当天稳定性最高；
- 失败时还能本地 `npm run build && npm run preview` 演示。

这已经足以满足“大思政实践课”的成果展示要求。

### 6.2 增强阶段：Pages Functions / Workers API

需要后端的场景：

- 想做“反馈表单”；
- 想记录访问量；
- 想做后台更新点位；
- 想把图片上传到对象存储；
- 想让老师或组员通过表单补充材料。

可使用：

```text id="via36z"
Cloudflare Pages Functions / Workers
```

Pages Functions 可给静态网站加入认证、表单提交和中间件等能力([developers.cloudflare.com](https://developers.cloudflare.com/pages/functions/?utm_source=chatgpt.com))。如果后续统一改成 Workers，Cloudflare Workers 也支持把静态资源与 Worker 脚本一起部署([developers.cloudflare.com](https://developers.cloudflare.com/workers/static-assets/?utm_source=chatgpt.com))。

### 6.3 数据库：Cloudflare D1

Cloudflare D1 是 Cloudflare 的托管 serverless SQL 数据库，使用 SQLite 语义，并可从 Workers 和 HTTP API 访问([developers.cloudflare.com](https://developers.cloudflare.com/d1/?utm_source=chatgpt.com))。D1 很适合存储结构化数据，例如桥梁点位、故事卡片、审核状态、反馈表单、访问统计等。

不过，D1 不应作为第一版的必需项。课程项目数据量很小，静态 JSON 更简单、更稳。D1 适合第二阶段。D1 免费计划数据库大小上限为 500MB，付费计划单库上限为 10GB；对你们这种几十个点位、几百条文本记录的项目来说，容量不是问题([developers.cloudflare.com](https://developers.cloudflare.com/d1/platform/limits/?utm_source=chatgpt.com))。

可选 D1 表结构：

```sql id="dmpcx2"
CREATE TABLE bridges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  river TEXT,
  opened_year INTEGER,
  bridge_type TEXT,
  longitude REAL NOT NULL,
  latitude REAL NOT NULL,
  summary TEXT,
  question TEXT,
  tags TEXT,
  source_status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  bridge_id TEXT NOT NULL,
  title TEXT NOT NULL,
  question TEXT,
  field_observation TEXT,
  interview_quote TEXT,
  quote_consent TEXT,
  analysis TEXT,
  ideological_link TEXT,
  evidence_level TEXT,
  FOREIGN KEY (bridge_id) REFERENCES bridges(id)
);

CREATE TABLE media (
  id TEXT PRIMARY KEY,
  bridge_id TEXT,
  r2_key TEXT,
  caption TEXT,
  media_type TEXT,
  consent_status TEXT,
  FOREIGN KEY (bridge_id) REFERENCES bridges(id)
);
```

### 6.4 媒体存储：Cloudflare R2

Cloudflare R2 是面向云原生应用、Web 内容和数据湖等场景的对象存储服务，官方说明其特点是可扩展、成本较低且无出口流量费用([developers.cloudflare.com](https://developers.cloudflare.com/r2/?utm_source=chatgpt.com))。它适合存储较大的图片、视频封面、地图瓦片、音频转写附件等。

建议：

- 少量压缩图片：直接放 `public/media`；
- 大量高清图片、视频封面、备份材料：放 R2；
- 原始访谈音频：不公开，单独本地或私有云盘保存，不进入公开网站。

### 6.5 KV 的位置

Workers KV 可以作为缓存或配置存储，但这个项目不必优先使用。可用于：

- 首页统计数字缓存；
- 地图图层开关配置；
- 轻量访问计数；
- 临时公告。

不建议用 KV 存复杂关系数据，桥梁、故事、媒体关系更适合 JSON 或 D1。

---

## 7. 地图底图与空间数据风险

### 7.1 底图选择

这是最大技术风险之一。选择底图时要考虑加载稳定性、授权、坐标系和国内访问效果。

推荐顺序：

1. **课堂展示版：使用稳定的在线底图 + 本地 GeoJSON 图层。**
2. **备份版：提供无底图的“示意地图 / SVG 江岸线 / 点位列表模式”。**
3. **长期版：考虑自托管轻量瓦片或 PMTiles。**

MapLibre 可以配合矢量瓦片使用，但如果要自托管瓦片，数据处理复杂度会上升。PMTiles + R2 + Workers 是一种现代 serverless 地图瓦片方案，Protomaps 文档也提供 Cloudflare R2 和 Workers 集成方案，但其文档同时提示 R2 作为地图瓦片后端可能存在较高延迟，需要结合场景评估([docs.protomaps.com](https://docs.protomaps.com/deploy/cloudflare?utm_source=chatgpt.com))。因此，不建议第一版就自托管完整底图瓦片。

### 7.2 坐标系问题

武汉市内点位可以手动采集坐标，但必须统一坐标系：

- 使用 MapLibre / OSM 类底图：通常按 WGS84 处理；
- 使用高德、腾讯等国内底图：通常涉及 GCJ-02；
- 如果点位来自不同平台，可能出现几十到数百米偏移。

解决办法：

- 统一规定“点位坐标来源”；
- 每个点位实地核对一次；
- 地图卡片中不强调厘米级精度；
- 对桥梁这样的大型线性地物，可用“代表点 + 桥梁线段”双表达。

---

## 8. 功能分期方案

### 8.1 MVP：必须完成

建议 MVP 控制在 5 个核心功能：

1. **地图点位展示**
   至少包含武汉长江大桥、长江二桥、鹦鹉洲长江大桥、杨泗港长江大桥、晴川桥 / 江汉桥等点位。

2. **一桥一问卡片**
   每座桥固定一个问题：连接谁、改变什么、服务谁、留下什么城市记忆。

3. **调研路线图层**
   展示 2—3 天实践路线，体现“我们实际怎么调研”。

4. **资料证据卡片**
   每个点位至少关联：照片 1 张、观察记录 1 条、资料来源 1 条。重点点位再加访谈摘录。

5. **问卷 / 访谈结论可视化**
   至少 3 张图表：青年最熟悉的桥、认知来源、对桥梁与城市发展的理解程度。

### 8.2 进阶功能

可在时间允许时加入：

- 时间轴筛选：按 1950s、1990s、2000s、2010s、2020s 切换桥梁；
- 桥梁类型筛选：公铁两用桥、公路桥、悬索桥、斜拉桥等；
- “人民城市”图层：桥下空间、江滩活动、观景点、公共交通接驳点；
- 分享链接：`/map?bridge=yangsigang`；
- 展示模式：全屏地图 + 左侧讲稿式滚动叙事；
- 离线备份：导出静态 HTML 和截图，防止展示现场网络波动。

### 8.3 不建议第一版加入

- 用户登录；
- 后台 CMS；
- 在线多人编辑；
- 实时定位；
- 复杂空间分析；
- 自托管全量地图瓦片；
- 大体量 3D 城市模型；
- 原始访谈音频在线播放。

---

## 9. 可行性评分

| 维度 | 评分 | 说明 |
|---|---:|---|
| 课程契合度 | 5/5 | 能承载实践过程、调研成果、展示材料和创新形式 |
| 主题契合度 | 5/5 | 桥梁天然具有空间属性，适合地图化表达 |
| 技术可行性 | 4/5 | 静态版很稳，动态版需控制边界 |
| 数据可获得性 | 4/5 | 桥梁基础资料、现场照片、问卷、访谈均可获得；部分单位访谈不确定 |
| 展示效果 | 5/5 | 地图 + 时间轴 + 一桥一问，比普通 PPT 更有记忆点 |
| 评优潜力 | 4.5/5 | 形式创新明显，但必须有扎实调研支撑 |
| 运维成本 | 4.5/5 | 静态部署几乎无运维；R2/D1 增强后仍可控 |
| 风险可控性 | 4/5 | 主要风险在底图、数据质量、网络访问和时间管理 |

综合判断：**高度可行，适合作为本队核心展示成果之一。**

---

## 10. 实施计划

### 10.1 实践前 3—5 天

完成：

- 确定点位清单；
- 设计数据字段；
- 建立 GitHub 仓库；
- 搭建 Astro + MapLibre 基础页面；
- 手动录入 5—8 座桥的初始点位；
- 设计问卷；
- 制作访谈和观察记录模板；
- 明确照片命名规则。

建议文件命名：

```text id="0u3xun"
2026-07-18_wuhan-yangtze-bridge_photo_001.webp
2026-07-18_wuhan-yangtze-bridge_note_001.md
2026-07-19_yangsigang-interview-anonymous-001.md
```

### 10.2 实践期间 2—3 天

每天晚上进行数据归档：

| 任务 | 负责人 |
|---|---|
| 点位核对 | GIS/地图负责人 |
| 照片筛选与压缩 | 影像负责人 |
| 访谈摘录脱敏 | 访谈负责人 |
| 问卷回收与初步统计 | 数据负责人 |
| 地图数据更新 | 技术负责人 |
| 实践日志 | 每日轮值 |

课程经验材料强调实践日志要跟随实践进程每日填写，反映每日实践活动和完成成果fileciteturn2file1。数字地图的数据更新可以和每日复盘绑定，避免实践结束后素材混乱。

### 10.3 实践后 3—5 天

完成：

- 清洗 GeoJSON；
- 整理问卷图表；
- 选取 6—10 条高质量访谈摘录；
- 完成地图网站；
- 输出展示截图；
- 将地图嵌入 PPT；
- 在报告附录中列出数字地图说明、数据来源和隐私处理方式。

---

## 11. 推荐技术方案清单

### 11.1 标准版

```text id="bvikll"
前端框架：Astro
交互组件：React 或 Svelte
语言：TypeScript
地图：MapLibre GL JS
样式：Tailwind CSS
图表：ECharts
数据：GeoJSON + JSON + Markdown/MDX
部署：Cloudflare Pages
CI/CD：GitHub → Cloudflare Pages 自动部署
```

适合当前课程项目。

### 11.2 增强版

```text id="6ulue3"
前端：Astro / Vite
地图：MapLibre GL JS
API：Cloudflare Pages Functions 或 Workers
数据库：Cloudflare D1
媒体：Cloudflare R2
缓存：Workers KV
校验：Zod
测试：Vitest + Playwright
部署：Cloudflare Workers / Pages
```

适合后续长期维护。

### 11.3 极简保底版

```text id="z1pp5s"
前端：Vite + Leaflet
数据：单个 bridges.geojson
部署：Cloudflare Pages
```

适合时间不足时快速完成。

---

## 12. 风险与应对

### 12.1 风险一：技术开发挤占调研时间

应对：先做静态 MVP。地图只是成果容器，不能替代问卷、访谈、观察和文献分析。

### 12.2 风险二：地图漂亮但证据薄弱

应对：每个重点点位必须至少有“三件套”：

```text id="gygn8j"
公开资料 + 现场观察 + 问卷/访谈/照片之一
```

没有证据的点位只作为背景点，不作为重点分析点。

### 12.3 风险三：底图加载失败

应对：

- 准备截图版；
- 准备点位列表版；
- 准备本地 `npm run preview`；
- PPT 中嵌入关键地图截图；
- 网站提供“无地图阅读模式”。

### 12.4 风险四：隐私与授权问题

应对：

- 访谈摘录匿名化；
- 路人照片打码；
- 不公开原始录音；
- 不展示电话号码、学号、联系方式；
- 对外展示只使用经筛选的公开材料。

### 12.5 风险五：项目看起来像“城市观光”

应对：每座桥都必须绑定一个问题，不按“景点介绍”写，而按“调研问题—证据—分析—建议”写。

示例：

```text id="n2i9ar"
武汉长江大桥
问题：它如何把“天堑变通途”转化为武汉人的日常生活？
证据：历史资料 + 实地观察 + 游客/市民访谈
分析：国家工程、城市记忆、三镇联系
建议：青年桥梁文化路线中应强化工程报国叙事
```

---

## 13. 最终建议

本项目建议采用：

```text id="a98jp6"
Astro + TypeScript + MapLibre GL JS + GeoJSON/JSON + Cloudflare Pages
```

后端先不做，除非确实需要表单或后台；媒体先压缩放仓库，较大文件再放 R2；D1 只作为二期扩展。

最终成果可以包装为：

**“桥见江城”武汉桥梁群实践数字地图**

核心展示逻辑：

```text id="732ib3"
一条江城路线
若干座桥梁
每桥一个问题
每问一组证据
最终回到“工程如何服务人民城市”
```

这样做最平衡：既现代、可部署、可展示，又不会超出团队实际开发能力。它能把你们的遥感/空间信息专业背景、武汉桥梁主题、大思政课程的问题导向、评优展示的形式创新统一起来。
