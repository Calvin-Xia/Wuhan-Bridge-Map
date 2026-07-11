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

- `public/data/bridges.geojson`: 桥梁点位与“一桥一问”基础字段
- `public/data/routes.geojson`: 实践路线图层
- `public/data/stories.json`: 调研故事卡片
- `public/data/survey-summary.json`: 问卷聚合统计
- `public/data/sources.json`: 资料来源索引

原始访谈录音、完整问卷、未打码照片和联系方式应放在 `private-data/`，该目录已加入 `.gitignore`。
