# 桥见江城：武汉桥梁群实践数字地图

基于 `initial.md` 初始化的静态优先叙事型数字地图项目。当前版本采用 Astro 7、TypeScript、Tailwind CSS 4、高德 JS API v2（官方底图引擎，明暗双样式 normal/darkblue）、Apache ECharts 6 和静态 GeoJSON/JSON 数据，CI 经 GitHub Actions 部署到 Cloudflare Workers Assets。

## 本地命令

```bash
npm run dev          # astro dev --host 127.0.0.1（默认 4321，被占用时自动顺延）
npm test             # vitest run
npm run validate:data
npm run build        # validate:data && astro check && astro build（产出 dist/）
npm run deploy       # wrangler deploy（需先 npx wrangler login）
```

## 部署（Cloudflare Workers Assets）

- CI（`.github/workflows/ci.yml`）：PR 与 main 推送跑 `npm ci` → `validate:data` → `npm test` → `npm run build`；仅 main 推送由 wrangler-action 部署 `dist/`（产物经 artifact 传递）。
- `wrangler.jsonc`：assets 指向 `./dist`（纯静态托管，无 Worker 脚本）；仓库需配 `CLOUDFLARE_API_TOKEN`（"Edit Cloudflare Workers"）与 `CLOUDFLARE_ACCOUNT_ID`。
- 部署地址：`https://wuhan-bridge-map.<account>.workers.dev`。

## 数据目录

- `public/data/bridges.geojson`：桥梁点位与"一桥一问"基础字段（8 座，GCJ-02 官方 POI 锚点）
- `public/data/routes.geojson`：实践路线（组 A/B/C 三条调研路线 + 桥梁群串联线；坐标与桥心逐点对齐）
- `public/data/stories.json`：调研故事卡（含现场观察、引用、证据；7 桥含 institutionNote 治理与管养）
- `public/data/survey-summary.json`：网络版（228 份）与现场版（57 份）问卷聚合统计
- `public/data/sources.json`：资料来源索引
- `public/data/voices.json`：不能归位到单一桥梁的开放回答引语（"市民之声"，均经匿名处理）
- `public/data/governance.json`：治理侧记（statGroups 数据卡 / quotes 引语 / disclaimers 口径说明）

原始访谈录音、完整问卷、未打码照片和联系方式放 `private-data/`（已加入 `.gitignore`）；原始调研分析材料（工作总结、问卷分析）在 `data/`（已 git 跟踪，只读素材）。

## 页面构成

- **地图工作区**：左侧桥目录；右侧高德引擎地图（8 个桥点、4 条路线、左上角可点击路线图例）；切桥为距离感知混合动画（同视口滑行 / 跨视口"缩小推入"）。**故事卡为全端统一弹窗**（点桥弹出：移动端底部悬浮卡 / 桌面居中卡，背景高斯模糊；深链 `#bridge-<id>` 为一次性入口，初载弹出后清除 hash）。
- **证据区**：7 张 ECharts 图表（认知、价值、治理期待、改善优先级、开放题主题）+ 尾部"市民之声 | 治理侧记"双列 + 全宽页脚（口径说明与 ICP/公安备案）。
- 明暗主题（地图与图表同步）；视觉规范见 `DESIGN.md`（其 MapLibre/旧结构部分以 AGENTS.md 与代码为准）。
