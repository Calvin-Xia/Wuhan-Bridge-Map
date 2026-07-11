export type Coordinate = [number, number];

export type ResearchStatus = "已实地调研" | "待实地核验" | "资料整理中";

export interface BridgeProperties {
  id: string;
  name: string;
  river: string;
  openedYear: number;
  bridgeType: string;
  themeTags: string[];
  question: string;
  shortStory: string;
  researchStatus: ResearchStatus;
  mediaIds: string[];
  sourceIds: string[];
}

export interface BridgeFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: Coordinate;
  };
  properties: BridgeProperties;
}

export interface BridgeFeatureCollection {
  type: "FeatureCollection";
  features: BridgeFeature[];
}

export interface RouteFeature {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: Coordinate[];
  };
  properties: {
    id: string;
    name: string;
    day: string;
    mode: string;
    color: string;
    summary: string;
  };
}

export interface RouteFeatureCollection {
  type: "FeatureCollection";
  features: RouteFeature[];
}

export interface StoryRecord {
  id: string;
  bridgeId: string;
  title: string;
  question: string;
  fieldObservation: string;
  interviewQuote: string;
  quoteConsent: "anonymous" | "public" | "not-collected";
  analysis: string;
  ideologicalLink: string;
  evidenceLevel: string;
}

export interface SourceRecord {
  id: string;
  title: string;
  type: "document" | "field-note" | "survey" | "interview" | "media";
  access: "public" | "team-private" | "aggregated";
  url?: string;
  note?: string;
}

export interface SurveyMetric {
  label: string;
  value: number;
}

export interface SurveySummary {
  sampleSize: number;
  familiarBridges: SurveyMetric[];
  cognitionSources: SurveyMetric[];
  developmentUnderstanding: SurveyMetric[];
}

export interface ResearchDataset {
  bridges: BridgeFeatureCollection;
  stories: StoryRecord[];
  sources: SourceRecord[];
  routes?: RouteFeatureCollection;
  survey?: SurveySummary;
}

const WUHAN_BOUNDS = {
  minLongitude: 113.5,
  maxLongitude: 115.3,
  minLatitude: 29.8,
  maxLatitude: 31.3,
};

export function validateBridgeCollection(bridges: BridgeFeatureCollection): string[] {
  const issues: string[] = [];

  if (bridges.type !== "FeatureCollection") {
    issues.push("bridges.type must be FeatureCollection");
  }

  bridges.features.forEach((feature, index) => {
    const prefix = `bridges[${index}]`;

    if (!feature.properties.id.trim()) {
      issues.push(`${prefix}.properties.id is required`);
    }

    if (!feature.properties.name.trim()) {
      issues.push(`${prefix}.properties.name is required`);
    }

    if (!isWuhanCoordinate(feature.geometry.coordinates)) {
      issues.push(`${prefix}.geometry.coordinates must be [longitude, latitude] near Wuhan`);
    }

    if (!Number.isInteger(feature.properties.openedYear)) {
      issues.push(`${prefix}.properties.openedYear must be an integer`);
    }

    if (feature.properties.themeTags.length === 0) {
      issues.push(`${prefix}.properties.themeTags must include at least one tag`);
    }

    if (!feature.properties.question.trim()) {
      issues.push(`${prefix}.properties.question is required`);
    }

    if (feature.properties.sourceIds.length === 0) {
      issues.push(`${prefix}.properties.sourceIds must include at least one evidence source`);
    }
  });

  return issues;
}

export function validateRouteCollection(routes: RouteFeatureCollection): string[] {
  const issues: string[] = [];

  if (routes.type !== "FeatureCollection") {
    issues.push("routes.type must be FeatureCollection");
  }

  routes.features.forEach((feature, index) => {
    const prefix = `routes[${index}]`;

    if (!feature.properties.id.trim()) {
      issues.push(`${prefix}.properties.id is required`);
    }

    if (feature.geometry.coordinates.length < 2) {
      issues.push(`${prefix}.geometry.coordinates must contain at least two points`);
    }

    feature.geometry.coordinates.forEach((coordinate, coordinateIndex) => {
      if (!isWuhanCoordinate(coordinate)) {
        issues.push(`${prefix}.geometry.coordinates[${coordinateIndex}] must be [longitude, latitude] near Wuhan`);
      }
    });
  });

  return issues;
}

export function validateSurveySummary(survey: SurveySummary): string[] {
  const issues: string[] = [];

  if (!Number.isInteger(survey.sampleSize) || survey.sampleSize <= 0) {
    issues.push("survey.sampleSize must be a positive integer");
  }

  for (const key of ["familiarBridges", "cognitionSources", "developmentUnderstanding"] as const) {
    if (survey[key].length === 0) {
      issues.push(`survey.${key} must include at least one metric`);
    }

    survey[key].forEach((metric, index) => {
      if (!metric.label.trim()) {
        issues.push(`survey.${key}[${index}].label is required`);
      }

      if (metric.value < 0) {
        issues.push(`survey.${key}[${index}].value must be non-negative`);
      }
    });
  }

  return issues;
}

export function validateResearchDataset(dataset: ResearchDataset): string[] {
  const issues = [
    ...validateBridgeCollection(dataset.bridges),
    ...(dataset.routes ? validateRouteCollection(dataset.routes) : []),
    ...(dataset.survey ? validateSurveySummary(dataset.survey) : []),
  ];
  const bridgeIds = new Set(dataset.bridges.features.map((feature) => feature.properties.id));
  const sourceIds = new Set(dataset.sources.map((source) => source.id));

  dataset.bridges.features.forEach((bridge, bridgeIndex) => {
    bridge.properties.sourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) {
        issues.push(`bridges[${bridgeIndex}].properties.sourceIds references unknown source: ${sourceId}`);
      }
    });
  });

  dataset.stories.forEach((story, index) => {
    if (!story.id.trim()) {
      issues.push(`stories[${index}].id is required`);
    }

    if (!bridgeIds.has(story.bridgeId)) {
      issues.push(`stories[${index}].bridgeId references unknown bridge: ${story.bridgeId}`);
    }

    if (!story.question.trim()) {
      issues.push(`stories[${index}].question is required`);
    }

    if (!story.analysis.trim()) {
      issues.push(`stories[${index}].analysis is required`);
    }
  });

  return issues;
}

function isWuhanCoordinate(coordinate: Coordinate): boolean {
  const [longitude, latitude] = coordinate;

  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= WUHAN_BOUNDS.minLongitude &&
    longitude <= WUHAN_BOUNDS.maxLongitude &&
    latitude >= WUHAN_BOUNDS.minLatitude &&
    latitude <= WUHAN_BOUNDS.maxLatitude
  );
}
