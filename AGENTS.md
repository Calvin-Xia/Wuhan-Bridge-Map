# AGENTS.md — 桥见江城：武汉桥梁群实践数字地图

## 项目定位

大思政实践课调研成果的静态优先叙事型数字地图：用地图承载"一桥一问"、问卷证据与市民叙事（8 座武汉桥梁）。

## 怎么跑起来

```bash
npm run dev          # astro dev --host 127.0.0.1（默认 4321 端口，被占用时自动顺延）
npm test             # vitest run
npm run validate:data  # tsx 校验 public/data 全部数据文件
npm run build        # validate:data && astro check && astro build（产出 dist/）
```

## 技术栈

Astro 7（静态输出）· TypeScript · Tailwind CSS 4（`@tailwindcss/vite` 插件，无需配置文件）· 高德 JS API v2（官方底图引擎，normal/darkblue 明暗双样式）· Apache ECharts 6（按需引入，canvas 渲染）· Vitest。

## 目录与约定

- `public/data/`：唯一数据源（bridges.geojson 8 座桥 / routes.geojson 4 条路线 / stories.json 8 张故事卡（7 桥含 institutionNote）/ survey-summary.json 7 组问卷指标 / sources.json / voices.json 市民之声 / governance.json 治理侧记）
- `src/lib/`：纯函数与类型（data-validation.ts 校验、bridge-chain.ts 链线校验、chart-options.ts 图表工厂、map-layer-spec.ts 覆盖层调色板契约），同名 `.test.ts` 为契约测试
- `src/scripts/`：客户端入口（map-app.ts 地图、charts.ts 图表、voices.ts 引语、governance.ts 治理侧记、theme.ts、reveal.ts）
- `src/pages/index.astro` 单页（结尾 tail-grid：桌面双列"问卷里的市民之声 | 治理侧记"，移动单列，两侧均默认收起部分内容且双向展开/收起）；`src/styles/global.css` 全局样式（明暗主题 token）
- `data/`（根目录，已 git 跟踪）：原始调研材料（工作总结、问卷分析），只读素材

## 数据约定（改动必须同步）

- 数据字段以 `src/lib/data-validation.ts` 为准；**改 schema 必须同步**：`scripts/validate-data.ts`、`data-validation.test.ts`、相关契约测试
- `story.analysis` 是**段落数组**，段内 `**重点**` 渲染为 `<strong>`；引用须带 `quoteLabel`，无引用用 `quoteConsent: "not-collected"`
- `story.institutionNote`（可选）：治理与管养区块；`paragraphs` 段落数组支持 `**重点**`，含 `quote` 时 `quoteLabel` 必填
- `governance.json`：`statGroups`（数据卡，每项带 value/label/source 口径）/ `quotes`（引语，含 cite）/ `disclaimers`（口径说明）
- 路桥中心数据口径：访谈记录 878 座/829 座接入平台，工作总结 826 座全覆盖——**并存标注，禁止合并**；朱家河 20 吨/白沙洲 30 吨为历史限载案例
- 深度链接：`#bridge-<id>` 选桥（打开时定位地图，切换时 `history.replaceState` 写回，不产生历史记录）；页头导航用 `#section-map` / `#section-evidence` / `#section-voices` / `#section-governance`（`src/lib/bridge-hash.ts`）
- 指标口径：指标卡"类证据 5"= 公开资料 · 问卷封闭题 · 问卷开放题（市民之声为其呈现形式）· 团队实地记录 · 机构访谈，与 sources.json 的 type 字段（4 类）有意不同，勿按字段数改
- 路线属性含 `group`/`date`/`sampleCount`；串联线坐标必须逐一等于桥心（`bridge-chain.ts` 校验）
- 问卷口径：网络版 228 份、现场版 57 份、开放题网络 72 条/现场 22 条；图表多选数据用横向条形，不写"公众普遍"类推断
- 地图覆盖层 hover 用 `setOptions` 调线宽/透明度整条强调（AMap.Polyline）；**不使用 feature-state/promoteId**（曾导致maplibre 线条渲染异常，属历史约定）
- **地图坐标口径**：`public/data` 的 GeoJSON 与 `src/lib/map-view.ts` 初始视野均已是 **GCJ-02**（官方 `AMap.convertFrom` 一次性转换，2026-08-23 固化；与 WGS-84 底图不兼容，换回 OSM/卫星需反向转换）。引擎 `isCorrection: false`——高德官方 FAQ 46660 确认"GCJ-02 坐标在不同缩放级别显示位置会变"，纠偏开启会造成缩放漂移，勿改回

## CI/CD（GitHub Actions → Cloudflare Workers Assets）

- `.github/workflows/ci.yml`：PR 与 main 推送触发 CI（Node 22 LTS；`npm ci` → `validate:data` → `npm test` → `npm run build`）；仅 main 推送由 `cloudflare/wrangler-action` 部署 `dist/` 到 Workers Assets（产物经 artifact 传递，只构建一次）
- `wrangler.jsonc`：assets 指向 `./dist`（纯静态托管、无 Worker 脚本），部署后地址为 `https://wuhan-bridge-map.<account>.workers.dev`
- 仓库必需的 Secrets：`CLOUDFLARE_API_TOKEN`（"Edit Cloudflare Workers" 模板）、`CLOUDFLARE_ACCOUNT_ID`
- 本地手动发布：`npx wrangler login` 一次后 `npm run deploy`
- 注意：wrangler 的 postinstall（workerd）在本机沙箱环境可能被拦截；GitHub Actions（Linux）不受影响

## 当前状态与下一步

- 数据整合完成（8 桥、7 图、市民之声、路线图例/组命名/hover 强调）；治理侧记 + 7 桥"治理与管养"已上线（路桥中心访谈与 2025 年工作总结，口径并存标注）；测试 79 项全过
- 底图已切换为 **高德 JS API v2 引擎**（官方底图，周更矢量管线 `jsapi.amap.com/web_map/get_tile` + `o4.amap.com/…pbf`，实测数据版本 26_07_27；key+安全密钥为前端公开常量，构建期可用 `PUBLIC_AMAP_KEY/PUBLIC_AMAP_SECURITY_CODE` 覆盖；明暗主题官方样式 normal/darkblue；覆盖层为 AMap Marker/Polyline，颜色见 `map-layer-spec.ts`）
- 高德踩坑记录（实测 2026-08）：① 官方"底图瓦片"raster 端点（webrd/wprd style=7/8）数据滞后——style=7 缺 2019 杨泗港大桥（同瓦片 124B 纯水 vs style=8 5066B 带桥），style=8 地物较新但仍落后 web.amap.com，故弃用 raster 走引擎；② 引擎 isCorrection 开启=缩放级漂移（官方 FAQ 46660），数据已固化为 GCJ-02 + isCorrection:false，实测 z10→z14 像素比 15.998≈16（零漂移）；③ 桥点矢量 PBF 必须引擎渲染，MapLibre/Worker 代理不可行；④ Web 服务 API 与 JS API key 不互通（`USERKEY_PLAT_NOMATCH`），restapi 需另建 Web 服务 key
- 个别桥点位（如长江大桥）为低缩放级别人工拾取，与真实桥心有几十~几百米固定偏差（不随缩放变化）；可用官方 POI 坐标重写（待定项）
- 深链与导航：`#bridge-<id>` 选桥（加载定位 + replaceState 写回）、页头 4 个章节锚点（平滑滚动，尊重 reduced-motion）；"类证据 5"指标卡已加形态说明
- 故事卡交互：切桥快速平滑回顶（`prefers-reduced-motion` 时瞬时），每桥进度会话内记忆（桌面面板级 / 移动页面级，`src/lib/story-scroll.ts`）；同桥点击不滚动
- 尾部双列：市民之声每列默认收起至前 3 条/治理侧记默认展示 2 组数据卡 + 2 条引语，均为双向展开/收起（按钮带 `aria-expanded`），口径说明常显
- `dist/` 已随高德底图替换后的最近一次 `npm run build` 更新
- 待定项：图层开关（曾评估暂缓）、真实步行轨迹（P2 未做）、Google Fonts 加载偶发卡死（Noto Sans SC 523 个 @font-face 子集偶有一片 stuck loading 导致 load 事件不触发，境内网络 200/1.5s 正常，偶发 21s+；建议本地化 @fontsource）
