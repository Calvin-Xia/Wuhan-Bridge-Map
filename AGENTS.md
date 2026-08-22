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

Astro 7（静态输出）· TypeScript · Tailwind CSS 4（`@tailwindcss/vite` 插件，无需配置文件）· MapLibre GL JS 5（OSM 栅格底图，明暗双主题）· Apache ECharts 6（按需引入，canvas 渲染）· Vitest。

## 目录与约定

- `public/data/`：唯一数据源（bridges.geojson 8 座桥 / routes.geojson 4 条路线 / stories.json 8 张故事卡 / survey-summary.json 7 组问卷指标 / sources.json / voices.json 市民之声）
- `src/lib/`：纯函数与类型（data-validation.ts 校验、bridge-chain.ts 链线校验、chart-options.ts 图表工厂、map-layer-spec.ts 图层契约），同名 `.test.ts` 为契约测试
- `src/scripts/`：客户端入口（map-app.ts 地图、charts.ts 图表、voices.ts 引语、theme.ts、reveal.ts）
- `src/pages/index.astro` 单页；`src/styles/global.css` 全局样式（明暗主题 token）
- `data/`（根目录，已 git 跟踪）：原始调研材料（工作总结、问卷分析），只读素材

## 数据约定（改动必须同步）

- 数据字段以 `src/lib/data-validation.ts` 为准；**改 schema 必须同步**：`scripts/validate-data.ts`、`data-validation.test.ts`、相关契约测试
- `story.analysis` 是**段落数组**，段内 `**重点**` 渲染为 `<strong>`；引用须带 `quoteLabel`，无引用用 `quoteConsent: "not-collected"`
- 路线属性含 `group`/`date`/`sampleCount`；串联线坐标必须逐一等于桥心（`bridge-chain.ts` 校验）
- 问卷口径：网络版 228 份、现场版 57 份、开放题网络 72 条/现场 22 条；图表多选数据用横向条形，不写"公众普遍"类推断
- 地图 hover 用 `setPaintProperty` 整层强调；**不使用 feature-state/promoteId**（曾导致线条渲染异常）

## CI/CD（GitHub Actions → Cloudflare Workers Assets）

- `.github/workflows/ci.yml`：PR 与 main 推送触发 CI（`npm ci` → `validate:data` → `npm test` → `npm run build`）；仅 main 推送由 `cloudflare/wrangler-action` 部署 `dist/` 到 Workers Assets（产物经 artifact 传递，只构建一次）
- `wrangler.jsonc`：assets 指向 `./dist`（纯静态托管、无 Worker 脚本），部署后地址为 `https://wuhan-bridge-map.<account>.workers.dev`
- 仓库必需的 Secrets：`CLOUDFLARE_API_TOKEN`（"Edit Cloudflare Workers" 模板）、`CLOUDFLARE_ACCOUNT_ID`
- 本地手动发布：`npx wrangler login` 一次后 `npm run deploy`
- 注意：wrangler 的 postinstall（workerd）在本机沙箱环境可能被拦截；GitHub Actions（Linux）不受影响

## 当前状态与下一步

- 数据整合完成（8 桥、7 图、市民之声、路线图例/组命名/hover 强调）；测试 51 项全过
- `dist/` 为旧构建，发布前需本地执行 `npm run build`
- 待定项：图层开关（曾评估暂缓）、真实步行轨迹（P2 未做）
