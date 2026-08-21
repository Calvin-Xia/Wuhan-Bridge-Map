# 桥见江城：武汉桥梁群实践数字地图

基于 `initial.md` 初始化的静态优先叙事型数字地图项目。当前版本采用 Astro、TypeScript、Tailwind CSS、MapLibre GL JS、Apache ECharts 和静态 GeoJSON/JSON 数据，面向 Cloudflare Pages 部署。

## 本地命令

```bash
npm run dev
npm test
npm run validate:data
npm run build
```

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- 第一阶段不需要后端；后续如需表单、访问统计或后台更新，再添加 `functions/`、D1 和 R2。

## 数据目录

- `public/data/bridges.geojson`: 桥梁点位与“一桥一问”基础字段（当前 8 座）
- `public/data/routes.geojson`: 实践路线图层（组 A/B/C 三条调研路线 + 桥梁群串联线）
- `public/data/stories.json`: 调研故事卡片（含现场问卷、开放回答与团队记录的引用）
- `public/data/survey-summary.json`: 网络版（228 份）与现场版（57 份）问卷聚合统计
- `public/data/sources.json`: 资料来源索引
- `public/data/voices.json`: 无法归位到单一桥梁的开放回答引语（“市民之声”，均经匿名处理）

原始访谈录音、完整问卷、未打码照片和联系方式应放在 `private-data/`，该目录已加入 `.gitignore`。原始分析材料（工作总结、问卷 SPSS 与质性分析）在 `data/`。

## 页面构成

- **地图工作区**：左侧桥梁目录 + 故事面板（现场观察、引用、问卷证据、分段加粗的调研分析）；右侧 MapLibre 地图（8 个桥点、4 条路线、左上角可点击路线图例）
- **证据区**：7 张 ECharts 图表（认知、价值、治理需求、开放题主题）+ 市民之声引语栏
- 明暗主题、地图与图表同步切换；设计规范见 `DESIGN.md`
