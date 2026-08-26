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
- `src/lib/`：纯函数与类型（data-validation.ts 校验、bridge-chain.ts 链线校验、chart-options.ts 图表工厂、map-layer-spec.ts 覆盖层调色板契约、story-scroll.ts 弹窗面板滚动记忆、bridge-hash.ts 深链解析），同名 `.test.ts` 为契约测试
- `src/scripts/`：客户端入口（map-app.ts 地图、charts.ts 图表、voices.ts 引语、governance.ts 治理侧记、theme.ts、reveal.ts）
- `src/pages/index.astro` 单页（结尾 tail-grid：桌面双列"问卷里的市民之声 | 治理侧记"，移动单列，两侧均默认收起部分内容且双向展开/收起）；`src/styles/global.css` 全局样式（明暗主题 token）
- `data/`（根目录，已 git 跟踪）：原始调研材料（工作总结、问卷分析），只读素材

## 数据约定（改动必须同步）

- 数据字段以 `src/lib/data-validation.ts` 为准；**改 schema 必须同步**：`scripts/validate-data.ts`、`data-validation.test.ts`、相关契约测试
- `story.analysis` 是**段落数组**，段内 `**重点**` 渲染为 `<strong>`；引用须带 `quoteLabel`，无引用用 `quoteConsent: "not-collected"`
- `story.institutionNote`（可选）：治理与管养区块；`paragraphs` 段落数组支持 `**重点**`，含 `quote` 时 `quoteLabel` 必填（2026-08 溯源降噪：段落不再逐段标注「据 2025 年工作总结」「根据访谈纸质记录整理」——来源由卡底 source-row 胶囊锚定；quoteLabel 经 `src/lib/story-label.ts` 的 `displayInstitutionLabel` 剥冗余前缀，空则不渲染 cite）
- `governance.json`：`statGroups`（数据卡，每项带 value/label/source 口径）/ `quotes`（引语，含 cite）/ `disclaimers`（口径说明）——2026-08 溯源降噪：数据卡 `source` 行、intro 来源声明、引语 `cite` 不再渲染（来源由页脚口径说明承担；cite 字段数据仍保留——契约），引语 note 已去访谈时间戳（R1 00:42 式，数据层直删）；829 卡 label 内联"与工作总结口径并存"禁止合并
- 路桥中心数据口径：访谈记录 878 座/829 座接入平台与工作总结 826 座全覆盖在**治理侧记数据卡内并存标注**（label 内联"与工作总结口径并存"，禁止合并）；朱家河 20 吨/白沙洲 30 吨为历史限载案例（仅故事卡内出现；2026-08 决策：引语标签只注「（历史案例）」，不再含"不代表 2026 年现行限值"括号）；页脚口径说明自 2026-08-25 起只保留"调研单位材料、不公开原始记录全文"一条
- 深度链接：`#bridge-<id>` 为**一次性入口**——初载解析后弹出/选中该桥并 `history.replaceState` **清除 hash**；切桥**不再写回** hash（URL 不随选中桥变化），刷新/切桥永不重复弹窗；页头导航用 `#section-map` / `#section-evidence` / `#section-voices` / `#section-governance`（`src/lib/bridge-hash.ts`）
- 指标口径：指标卡"类证据 5"= 公开资料 · 问卷封闭题 · 问卷开放题（市民之声为其呈现形式）· 团队实地记录 · 机构访谈，与 sources.json 的 type 字段（4 类）有意不同，勿按字段数改
- 路线属性含 `group`/`date`/`sampleCount`；串联线坐标必须逐一等于桥心（`bridge-chain.ts` 校验）
- 问卷口径：网络版 228 份、现场版 57 份、开放题网络 72 条/现场 22 条；图表多选数据用横向条形，不写"公众普遍"类推断
- 地图覆盖层 hover 用 `setOptions` 调线宽/透明度整条强调（AMap.Polyline）；**不使用 feature-state/promoteId**（曾导致maplibre 线条渲染异常，属历史约定）
- **地图坐标口径**：`public/data` 的 GeoJSON 与 `src/lib/map-view.ts` 的视图常量（`DATA_BOUNDS`/`DATA_CENTER`，全貌/特写定位由 `computeOverviewZoom`/`computeFocusZoom` 计算）均已是 **GCJ-02 官方 POI 锚点**（2026-08-23 用 AMap.PlaceSearch/convertFrom 固化：8 桥点=官方桥 POI，路线=按桥序列重建；`INITIAL_MAP_VIEW` 常量已于 2026-08-25 移除，初始视野=数据全貌；与 WGS-84 底图不兼容，换回 OSM/卫星需反向转换）。引擎 `isCorrection: false`——高德官方 FAQ 46660 确认"GCJ-02 坐标在不同缩放级别显示位置会变"，纠偏开启会造成缩放漂移，勿改回
- **覆盖层锚点契约**：桥点 Marker 的 content 只含圆点（label 绝对定位溢出），anchor=center，保证圆点中心压在坐标上（实测 0.1px）；改动 content 布局需同步 js 测量（`lngLatToContainer`）

## CI/CD（GitHub Actions → Cloudflare Workers Assets）

- `.github/workflows/ci.yml`：PR 与 main 推送触发 CI（Node 22 LTS；`npm ci` → `validate:data` → `npm test` → `npm run build`）；仅 main 推送由 `cloudflare/wrangler-action` 部署 `dist/` 到 Workers Assets（产物经 artifact 传递，只构建一次）
- `wrangler.jsonc`：assets 指向 `./dist`（纯静态托管、无 Worker 脚本），部署后地址为 `https://wuhan-bridge-map.<account>.workers.dev`
- 仓库必需的 Secrets：`CLOUDFLARE_API_TOKEN`（"Edit Cloudflare Workers" 模板）、`CLOUDFLARE_ACCOUNT_ID`
- 高德 key 属前端公开模型，防护边界是**控制台域名白名单**（必须包含正式域名，否则线上 Referer 校验拒绝加载；开发域 127.0.0.1 需临时加入）+ 安全密钥 + 每日配额；key 若担心公开历史泄露，控制台重置即可（重置后需同步改 `src/scripts/map-app.ts` 常量）
- 本地手动发布：`npx wrangler login` 一次后 `npm run deploy`
- 注意：wrangler 的 postinstall（workerd）在本机沙箱环境可能被拦截；GitHub Actions（Linux）不受影响

## 当前状态与下一步

- 测试 106 项全过**（2026-08-26 弹窗统一重构后：story-toggle 退役 −8；新增弹窗/桌面契约 +2；112 → 106）**
- 布局（2026-08-26 弹窗统一重构后）：桌面端（≥981px）地图区 `.map-stage height: 100vh`（页头+工作区恰好占满一屏），**左栏仅桥目录**（8 桥列表卡内滚动，故事卡已移出）；故事卡为 **body 直属的全端统一弹窗**（fixed 锚定视口，与页面结构零耦合）：移动端（≤980px）底部悬浮卡（顶部露 8dvh 背景、左右 12px 留白、自适应限高 `calc(100dvh−8dvh−0.75rem)` 内滚）、桌面端**居中卡**（`width: min(34rem, calc(100vw−2.5rem))`、max-height `min(82dvh,46rem)`、`margin:auto` 居中）；两态共用背景层（全屏压暗 0.45 + 地图容器 `filter: blur(8px)`）与顶部条（面板内首行，`position: sticky` 撑顶常驻，顶部内边距已移交 bar——panel 自身 padding-top 置 0）；对应契约测试与 ui-contract.test.ts 同步
- 页脚（2026-08-25 三版后定稿，按 DESIGN.md 校正）：「数据口径与来源」从治理侧记右列移出 → tail-grid 下方**全宽横带**（`.site-footer`，disclaimers 现仅 1 条）；**居中极简合并式**=身份「桥见江城 · 武汉桥梁群实践数字地图」/ 江蓝标签「数据口径与来源」（68ch 上限、15px、行高 1.7，无框无底色）/ 备案组（警徽 `public/beian-badge.png` 源自 data/Beian.png 36×40 + 两个链接，链接回归全站 a 语言）。备案——渝ICP备2026000319号→https://beian.miit.gov.cn/、渝公网安备50010102001439号→https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=50010102001439；教训：验证 UI 必须以 `npm run build` + `astro preview` 的**构建产物**为准（本轮 dev server 4321 的 Vite watcher 卡死、持续吐旧 CSS 导致两次误验收；4321 由用户自管重启）；`.governance-disclaimers` 曾有新旧规则共存残留（旧面板规则未被覆盖 border/background），删旧勿叠加
- 切桥与深链（2026-08-25 新增，最终版=距离感知混合）：`selectBridge` 改 `flyToBridge`——**目标桥已在当前视口内**（`isBridgeInViewport`，桥心在视口内即判定）→ **单段直达滑行** 620ms（maplibre 手感，无脉冲无中程停留；初始全貌点任何桥、同群相邻桥切换均命中）；**目标在视口外**（跨江南北/天兴洲等远距，28 对组合约 5-6 对）→ 两段"缩小推入"：缩小段 380ms（中心=当前↔目标**中点**按地板约束钳制——路径成直线、零折返）+ 推入段 620ms（桥特写，zoom=动态 per-bridge `computeFocusZoom`=max(12.3, 合法居中所需)；实测白沙洲 12.3/天兴洲 12.84-12.94）；`prefers-reduced-motion` 瞬移；拖拽/滚轮/双指打断即取消剩余段（flyRelay 一次性接力 + flyToken 令牌），同桥点击保持重播；深链 `#bridge-<id>` 单段推入（620ms，初始即全貌）；交互墙（enforceCamera/enforceZoomFloor）与视图数据坐标同源 `src/lib/map-view.ts`
- 底图已切换为 **高德 JS API v2 引擎**（官方底图，周更矢量管线 `jsapi.amap.com/web_map/get_tile` + `o4.amap.com/…pbf`，实测数据版本 26_07_27；key+安全密钥为前端公开常量，构建期可用 `PUBLIC_AMAP_KEY/PUBLIC_AMAP_SECURITY_CODE` 覆盖；明暗主题官方样式 normal/darkblue；覆盖层为 AMap Marker/Polyline，颜色见 `map-layer-spec.ts`）
- 高德踩坑记录（实测 2026-08）：① 官方"底图瓦片"raster 端点（webrd/wprd style=7/8）数据滞后——style=7 缺 2019 杨泗港大桥（同瓦片 124B 纯水 vs style=8 5066B 带桥），style=8 地物较新但仍落后 web.amap.com，故弃用 raster 走引擎；② 引擎 isCorrection 开启=缩放级漂移（官方 FAQ 46660），数据已固化为 GCJ-02 + isCorrection:false，实测 z10→z14 像素比 15.998≈16（零漂移）；③ 桥点矢量 PBF 必须引擎渲染，MapLibre/Worker 代理不可行；④ Web 服务 API 与 JS API key 不互通（`USERKEY_PLAT_NOMATCH`），restapi 需另建 Web 服务 key；⑤ **setLimitBounds 不等于 maplibre maxBounds**（实测 2026-08-25）：拖动中完全不钳制（可拖出边界 0.6°+），松手后其恢复算法落点错误——把"视口西缘对齐盒西缘"，中心落在盒东侧外 0.41°（即"回弹过头"根因，用户截图态）。已弃用，改用 `enforceCamera()` 族：zoomchange 软地板（打断缩放动画拉到地板）+ zoomend/moveend/resize 全量终检（含中心钳制）；纯函数 `computeZoomFloor/clampCenterToViewport` 在 `map-view.ts`，语义=旧版"视口⊆研究区盒"（动态缩放下限实测 703×542px≈z11.12、889×578px≈z11.458、1075×624px≈z11.732）；另注意高德仅接受真实/信任的滚轮事件，Playwright 合成 wheel 无法触发缩放（测试用 `setZoom` 走同一 zoomchange 路径验证）；⑥ **"地板=8 桥同框"是错的**（2026-08-25 实测修正）：宽屏下地板由横向驱动，地板处纵向可见范围 = H·boxLng·cosφ/W——与盒高无关、只随盒宽增大；数据盒纵向 0.1911°+圆点余量在宽高比 >1.94 的容器里装不进地板视口（天兴洲点整点出框，1920 屏 89px）。解决：**盒宽 0.375°→0.46°**（[114.105, 114.565]，宽高比 ≤1.94 全覆盖、parity 零妥协；盒只是相机约束、非研究边界）+ 初始/缩小段终点改为**数据全貌**（中心=数据质心 [114.3161, 30.5832]、zoom=`computeOverviewZoom`=数据盒+~20px 圆点边距正好放满，非"盒全貌"）；极宽屏（>1.94）降级为 `cameraRelaxed` 微松兜底（盒不可见、无城市名，用户一交互即回合规）；⑦ **两段动画的缩小段中心不能取"质心"**（2026-08-25 用户反馈"点击晴川桥/大桥/鹦鹉洲/杨泗港/白沙洲时动画先往中心走再回来"）：西南侧桥梁全部位于质心东北方向——先滑向质心再回头 = V 形折返 + 停顿，观感"卡卡的"。修正：缩小段中心 = 当前↔目标**中点**（钳制），路径成直线、零折返（实测 minProj=0，桥心收敛）；同时按"目标是否已在视口内"（isBridgeInViewport）做**距离感知混合**——同视口直接滑行（0 脉冲），仅跨视口远距才脉冲，否则"缩小放大"在相邻桥间是零信息增益的收缩-散开表演（用户 2026-08-25 二次反馈，帧级实测证明相机路径无折返、观感来源是缩放脉冲本身）；⑧ **弹窗浮层踩坑（2026-08-26）**：a) `body { overflow: hidden }` 滚动锁在 Chromium 下把 `window.scrollY` 清零且解锁不恢复（实测 663→0→0）——弃锁改背景层拦截（`touch-action:none` + backdrop `wheel preventDefault`）；b) 动画 `fill: both` 残留 transform 的祖先会成为 fixed 后代包含块——`.page-enter` 结束帧 `translateY(0)` 残留使弹窗钉在地图块上随页滚动（实测 panel `top=-622`），入场动画改**纯 opacity**；c) `backdrop-filter` 只模糊普通 DOM 合成层、对高德 canvas 无效（"部分文字糊、地图清晰"），地图模糊用 `filter: blur(8px)` 于 `.map-canvas`；d) AMap 控件（审图号/缩放钮）官方 z-index 达 3000+，地图容器 `.map-column` 若不建 stacking context 会穿透弹窗——加 `z-index: 0` 隔离；e) 验证 UI 必须以构建产物为准（见页脚条目）——本轮早期多轮实测被 dev 4321 吐旧 CSS 误导，改用 `npm run build` + `astro preview`（4322）后结论才可信
- 桥点坐标已按官方 POI 锚点重写（2026-08-23）：点在底图/桥线上像素级对齐（dot↔POI 0.1px、点↔线 0.1px）；POI 锚点为官方桥 POI 位置，非"桥几何中心"，如需中心可再细调
- 深链与导航：`#bridge-<id>` 一次性深链（初载选中桥并**弹出故事卡**（全端）、`flyToBridge` 单段推入在后台完成，随后 `replaceState` 清 hash——刷新/切桥永不重复弹窗，URL 不随选中桥变化）、页头 4 个章节锚点（平滑滚动，尊重 reduced-motion）；"类证据 5"指标卡已加形态说明
- 故事卡交互（2026-08-26 弹窗统一后）：切桥快速平滑回顶（`prefers-reduced-motion` 时瞬时），每桥进度会话内记忆（面板内滚动，`src/lib/story-scroll.ts` 面板相对值语义，桌面移动共用）；点桥（目录/地图点/深链/图例路线）即自动弹窗，同桥点击=弹窗未开时重开；关闭通道=顶部条按钮 / 背景层点击（背景层同时拦截背景触摸，`touch-action:none` + 滚轮 `preventDefault`，**不用 body overflow 锁**）/ ESC；打开时焦点到关闭按钮（`focus({preventScroll:true})`），关闭时焦点还给触发源（同样 preventScroll）——**关闭后视口=打开前位置，零干预零漂移**（实测 693→694→694）
- **故事卡弹窗（2026-08-26，取代旧双态/流域布局）**：全端统一浮层，DOM 在 `</main>` 之后的 body 直属（`#story-panel` + `#story-modal-bar` + `#story-modal-backdrop`），渲染只写 `#story-panel-content`（bar 为静态首行）；「展开全文」双态（28rem/60dvh、toggle、chevron、`story-toggle.ts`）已整体退役；滚动记忆=面板相对值（桌面移动共用，`story-scroll.ts`）；面板隐藏滚动条（`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`——滚动条是边框盒内独立绘制层、圆角裁不到会戳破圆角）；可发现性：首次加载底部提示条（`#story-hint`，会话级一次、8s 自动消退、深链跳过、点桥即消失）+ 目录项右缘 chevron + 选中桥「故事卡」徽标（`bridge-list-presentation.ts` 模板，注意 `.bridge-item > span:last-child` 已改为 `.bridge-item-question` 类选择器）；交互手感沿用（按压 `translateY(1px) scale(0.99)`、chevron CSS 边框绘制、`overscroll-behavior-y: contain`）
- 尾部双列：市民之声每列移动端默认收起至前 3 条/治理侧记移动端默认 2 组数据卡 + 2 条引语，均双向展开/收起（按钮带 `aria-expanded`）；**桌面端（≥981px）列表恒全展、折叠按钮不渲染**——端侧默认由 `src/lib/responsive-collapse.ts`（`DESKTOP_COLLAPSE_QUERY` 与故事卡共用 981px 分界，`resolveCollapseState`）驱动，断点翻转即重置默认（不记忆手动状态）；口径说明常显
- `dist/` 已随高德底图替换后的最近一次 `npm run build` 更新
- 待定项：图层开关（已评估、可做，曾暂缓；未排期）；真实步行轨迹（决定不做：未记录、难以记录，页面保留"点位间为直线示意，非实际步行路径"说明）；Google Fonts 加载偶发卡死已解决——Astro fonts 构建期下载并自托管（dist 中 100 个 woff2 子集、无 fonts.googleapis.com/gstatic 运行时引用），无需 @fontsource
