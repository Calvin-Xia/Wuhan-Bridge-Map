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

Astro 7（静态输出）· TypeScript · Tailwind CSS 4（`@tailwindcss/vite` 插件，无需配置文件）· MapLibre GL JS 5（高德矢量底图 `webrd` style=8，OSM 备用源，明暗双主题）· Apache ECharts 6（按需引入，canvas 渲染）· Vitest。

## 目录与约定

- `public/data/`：唯一数据源（bridges.geojson 8 座桥 / routes.geojson 4 条路线 / stories.json 8 张故事卡（7 桥含 institutionNote）/ survey-summary.json 7 组问卷指标 / sources.json / voices.json 市民之声 / governance.json 治理侧记）
- `src/lib/`：纯函数与类型（data-validation.ts 校验、bridge-chain.ts 链线校验、chart-options.ts 图表工厂、map-layer-spec.ts 图层契约、map-basemap.ts 底图瓦片工厂），同名 `.test.ts` 为契约测试
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
- 地图 hover 用 `setPaintProperty` 整层强调；**不使用 feature-state/promoteId**（曾导致线条渲染异常）

## CI/CD（GitHub Actions → Cloudflare Workers Assets）

- `.github/workflows/ci.yml`：PR 与 main 推送触发 CI（Node 22 LTS；`npm ci` → `validate:data` → `npm test` → `npm run build`）；仅 main 推送由 `cloudflare/wrangler-action` 部署 `dist/` 到 Workers Assets（产物经 artifact 传递，只构建一次）
- `wrangler.jsonc`：assets 指向 `./dist`（纯静态托管、无 Worker 脚本），部署后地址为 `https://wuhan-bridge-map.<account>.workers.dev`
- 仓库必需的 Secrets：`CLOUDFLARE_API_TOKEN`（"Edit Cloudflare Workers" 模板）、`CLOUDFLARE_ACCOUNT_ID`
- 本地手动发布：`npx wrangler login` 一次后 `npm run deploy`
- 注意：wrangler 的 postinstall（workerd）在本机沙箱环境可能被拦截；GitHub Actions（Linux）不受影响

## 当前状态与下一步

- 数据整合完成（8 桥、7 图、市民之声、路线图例/组命名/hover 强调）；治理侧记 + 7 桥"治理与管养"已上线（路桥中心访谈与 2025 年工作总结，口径并存标注）；测试 93 项全过
- 底图已切换为高德在线矢量瓦片（`webrd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`，官方"官方底图瓦片"类文档 URL、无需 key、标准 XYZ；当前白名单=无限制）；连续 ≥3 次瓦片级错误自动切 OSM 备用源并短暂提示，刷新后重试主源（`TileErrorTracker`，`map-app.ts` 的 `switchToOsmFallback`）
- 高德已知事项（实测 2026-08）：① 瓦片为 **GCJ-02**，与 WGS-84 数据有 300-500 m 系统偏移（武汉），坐标转换**暂未做**（已知并接受）；② `wprd…style=7`（官方示例）矢量快照缺 2019 年杨泗港长江大桥（同瓦片 124B 纯水 vs style=8 的 5066B 带桥+注记），故用 **style=8**；③ 高德 key + 安全密钥（JS API 类型）不适用于第三方引擎取瓦片，仅官方 JS API/Web 服务可用（Web 服务 API 需另建"Web 服务"类型 key，实测 `USERKEY_PLAT_NOMATCH`）；④ "200+占位图"类静默降级无错误事件，兜底无法感知
- 深链与导航：`#bridge-<id>` 选桥（加载定位 + replaceState 写回）、页头 4 个章节锚点（平滑滚动，尊重 reduced-motion）；"类证据 5"指标卡已加形态说明
- 故事卡交互：切桥快速平滑回顶（`prefers-reduced-motion` 时瞬时），每桥进度会话内记忆（桌面面板级 / 移动页面级，`src/lib/story-scroll.ts`）；同桥点击不滚动
- 尾部双列：市民之声每列默认收起至前 3 条/治理侧记默认展示 2 组数据卡 + 2 条引语，均为双向展开/收起（按钮带 `aria-expanded`），口径说明常显
- `dist/` 已随高德底图替换后的最近一次 `npm run build` 更新
- 待定项：图层开关（曾评估暂缓）、真实步行轨迹（P2 未做）、Google Fonts 加载偶发卡死（Noto Sans SC 523 个 @font-face 子集偶有一片 stuck loading 导致 load 事件不触发，境内网络 200/1.5s 正常，偶发 21s+；建议本地化 @fontsource）
