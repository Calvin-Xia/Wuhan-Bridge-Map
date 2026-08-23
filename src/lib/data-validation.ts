import { validateBridgeChain } from "./bridge-chain";

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
    group?: string;
    date?: string;
    sampleCount?: number;
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
  quoteLabel?: string;
  quoteConsent: "anonymous" | "public" | "not-collected" | "team-record";
  surveyEvidence?: string[];
  /** Analysis paragraphs; `**text**` marks inline emphasis. */
  analysis: string[];
  ideologicalLink: string;
  evidenceLevel: string;
  /** Governance case attached to a bridge story; paragraphs support `**text**` emphasis. */
  institutionNote?: InstitutionNote;
}

export interface InstitutionNote {
  /** Institution quote (e.g. interview excerpt), attached when available. */
  quote?: string;
  /** Required attribution label whenever `quote` is present. */
  quoteLabel?: string;
  /** Governance paragraphs; `**text**` marks inline emphasis. */
  paragraphs: string[];
}

export interface GovernanceStat {
  /** Display value, e.g. "17894 处" or "826 座". */
  value: string;
  label: string;
  /** Source attribution, e.g. "据 2025 年工作总结". */
  source: string;
}

export interface GovernanceStatGroup {
  title: string;
  items: GovernanceStat[];
}

export interface GovernanceQuote {
  text: string;
  /** Citation line shown under the quote, e.g. "根据访谈纸质记录整理 · 相关负责人介绍". */
  cite: string;
  note?: string;
}

export interface GovernanceRecord {
  intro: string;
  statGroups: GovernanceStatGroup[];
  quotes: GovernanceQuote[];
  disclaimers: string[];
}

export interface SourceRecord {
  id: string;
  title: string;
  type: "document" | "field-note" | "survey" | "interview" | "media";
  access: "public" | "team-private" | "aggregated";
  url?: string;
  note?: string;
}

export interface VoiceRecord {
  id: string;
  survey: "online" | "field";
  quote: string;
  theme: string;
  source: string;
  note?: string;
}

export interface SurveyMetric {
  label: string;
  value: number;
  percent?: number;
  mean?: number;
  detail?: string;
}

export interface SurveySummary {
  sampleSize: number;
  fieldSampleSize: number;
  familiarBridges: SurveyMetric[];
  cognitionSources: SurveyMetric[];
  valueRecognition: SurveyMetric[];
  techPriorities: SurveyMetric[];
  improvementPriorities: SurveyMetric[];
  openEndedThemes: SurveyMetric[];
  openEndedFieldThemes: SurveyMetric[];
}

export interface ResearchDataset {
  bridges: BridgeFeatureCollection;
  stories: StoryRecord[];
  sources: SourceRecord[];
  routes?: RouteFeatureCollection;
  survey?: SurveySummary;
  voices?: VoiceRecord[];
  governance?: GovernanceRecord;
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

    if (feature.properties.sampleCount !== undefined) {
      if (!Number.isInteger(feature.properties.sampleCount) || feature.properties.sampleCount < 0) {
        issues.push(`${prefix}.properties.sampleCount must be a non-negative integer`);
      }
    }

    if (feature.properties.group !== undefined && !feature.properties.group.trim()) {
      issues.push(`${prefix}.properties.group must be a non-empty string`);
    }

    if (feature.properties.date !== undefined && !feature.properties.date.trim()) {
      issues.push(`${prefix}.properties.date must be a non-empty string`);
    }
  });

  return issues;
}

export function validateSurveySummary(survey: SurveySummary): string[] {
  const issues: string[] = [];

  if (!Number.isInteger(survey.sampleSize) || survey.sampleSize <= 0) {
    issues.push("survey.sampleSize must be a positive integer");
  }

  if (!Number.isInteger(survey.fieldSampleSize) || survey.fieldSampleSize <= 0) {
    issues.push("survey.fieldSampleSize must be a positive integer");
  }

  for (const key of [
    "familiarBridges",
    "cognitionSources",
    "valueRecognition",
    "techPriorities",
    "improvementPriorities",
    "openEndedThemes",
    "openEndedFieldThemes",
  ] as const) {
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

      if (metric.percent !== undefined && (metric.percent < 0 || metric.percent > 100)) {
        issues.push(`survey.${key}[${index}].percent must be between 0 and 100`);
      }

      if (metric.mean !== undefined && (metric.mean < 1 || metric.mean > 5)) {
        issues.push(`survey.${key}[${index}].mean must be between 1 and 5`);
      }
    });
  }

  return issues;
}

export function validateVoices(voices: VoiceRecord[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();

  voices.forEach((voice, index) => {
    const prefix = `voices[${index}]`;

    if (!voice.id.trim()) {
      issues.push(`${prefix}.id is required`);
    } else if (ids.has(voice.id)) {
      issues.push(`${prefix}.id must be unique: ${voice.id}`);
    } else {
      ids.add(voice.id);
    }

    if (!voice.quote.trim()) {
      issues.push(`${prefix}.quote is required`);
    }

    if (!voice.theme.trim()) {
      issues.push(`${prefix}.theme is required`);
    }

    if (!voice.source.trim()) {
      issues.push(`${prefix}.source is required`);
    }

    if (voice.note !== undefined && !voice.note.trim()) {
      issues.push(`${prefix}.note must be a non-empty string`);
    }
  });

  return issues;
}

export function validateResearchDataset(dataset: ResearchDataset): string[] {
  const issues = [
    ...validateBridgeCollection(dataset.bridges),
    ...(dataset.routes ? validateRouteCollection(dataset.routes) : []),
    ...(dataset.survey ? validateSurveySummary(dataset.survey) : []),
    ...(dataset.voices ? validateVoices(dataset.voices) : []),
    ...(dataset.governance ? validateGovernance(dataset.governance) : []),
  ];

  if (dataset.routes) {
    issues.push(...validateBridgeChain(dataset.bridges, dataset.routes));
  }

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

    if (story.analysis.length === 0) {
      issues.push(`stories[${index}].analysis must include at least one paragraph`);
    }

    story.analysis.forEach((paragraph, paragraphIndex) => {
      if (!paragraph.trim()) {
        issues.push(`stories[${index}].analysis[${paragraphIndex}] must be a non-empty paragraph`);
      }
    });

    if (story.quoteConsent !== "not-collected") {
      if (!story.interviewQuote.trim()) {
        issues.push(`stories[${index}].interviewQuote is required unless quoteConsent is "not-collected"`);
      }

      if (!story.quoteLabel?.trim()) {
        issues.push(`stories[${index}].quoteLabel is required for quoted stories`);
      }
    }

    story.surveyEvidence?.forEach((evidence, evidenceIndex) => {
      if (!evidence.trim()) {
        issues.push(`stories[${index}].surveyEvidence[${evidenceIndex}] must be a non-empty string`);
      }
    });

    if (story.institutionNote) {
      const note = story.institutionNote;

      note.paragraphs.forEach((paragraph, paragraphIndex) => {
        if (!paragraph.trim()) {
          issues.push(`stories[${index}].institutionNote.paragraphs[${paragraphIndex}] must be a non-empty paragraph`);
        }
      });

      if (note.quote !== undefined && !note.quote.trim()) {
        issues.push(`stories[${index}].institutionNote.quote must be a non-empty string`);
      }

      if (note.quote && !note.quoteLabel?.trim()) {
        issues.push(`stories[${index}].institutionNote.quoteLabel is required when institutionNote.quote is present`);
      }
    }
  });

  return issues;
}

export function validateGovernance(governance: GovernanceRecord): string[] {
  const issues: string[] = [];

  if (!governance.intro.trim()) {
    issues.push("governance.intro is required");
  }

  if (governance.statGroups.length === 0) {
    issues.push("governance.statGroups must include at least one group");
  }

  governance.statGroups.forEach((group, groupIndex) => {
    const prefix = `governance.statGroups[${groupIndex}]`;

    if (!group.title.trim()) {
      issues.push(`${prefix}.title is required`);
    }

    if (group.items.length === 0) {
      issues.push(`${prefix}.items must include at least one stat`);
    }

    group.items.forEach((item, itemIndex) => {
      const itemPrefix = `${prefix}.items[${itemIndex}]`;

      if (!item.value.trim()) {
        issues.push(`${itemPrefix}.value is required`);
      }

      if (!item.label.trim()) {
        issues.push(`${itemPrefix}.label is required`);
      }

      if (!item.source.trim()) {
        issues.push(`${itemPrefix}.source is required`);
      }
    });
  });

  if (governance.quotes.length === 0) {
    issues.push("governance.quotes must include at least one quote");
  }

  governance.quotes.forEach((quote, quoteIndex) => {
    const prefix = `governance.quotes[${quoteIndex}]`;

    if (!quote.text.trim()) {
      issues.push(`${prefix}.text is required`);
    }

    if (!quote.cite.trim()) {
      issues.push(`${prefix}.cite is required`);
    }

    if (quote.note !== undefined && !quote.note.trim()) {
      issues.push(`${prefix}.note must be a non-empty string`);
    }
  });

  if (governance.disclaimers.length === 0) {
    issues.push("governance.disclaimers must include at least one disclaimer");
  }

  governance.disclaimers.forEach((disclaimer, disclaimerIndex) => {
    if (!disclaimer.trim()) {
      issues.push(`governance.disclaimers[${disclaimerIndex}] must be a non-empty string`);
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
