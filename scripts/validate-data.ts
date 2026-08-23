import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  validateResearchDataset,
  type BridgeFeatureCollection,
  type GovernanceRecord,
  type ResearchDataset,
  type RouteFeatureCollection,
  type SourceRecord,
  type StoryRecord,
  type SurveySummary,
  type VoiceRecord,
} from "../src/lib/data-validation";

async function readJson<T>(path: string): Promise<T> {
  const file = await readFile(resolve(path), "utf8");
  return JSON.parse(file) as T;
}

const [bridges, routes, stories, survey, sources, voices, governance] = await Promise.all([
  readJson<BridgeFeatureCollection>("public/data/bridges.geojson"),
  readJson<RouteFeatureCollection>("public/data/routes.geojson"),
  readJson<StoryRecord[]>("public/data/stories.json"),
  readJson<SurveySummary>("public/data/survey-summary.json"),
  readJson<SourceRecord[]>("public/data/sources.json"),
  readJson<VoiceRecord[]>("public/data/voices.json"),
  readJson<GovernanceRecord>("public/data/governance.json"),
]);

const dataset: ResearchDataset = {
  bridges,
  routes,
  stories,
  survey,
  sources,
  voices,
  governance,
};

const issues = validateResearchDataset(dataset);

if (issues.length > 0) {
  console.error("Data validation failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(
  `Data validation passed (${bridges.features.length} bridges, ${routes.features.length} routes, ${stories.length} stories).`,
);
