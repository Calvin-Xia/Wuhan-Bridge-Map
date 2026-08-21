import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  validateBridgeCollection,
  validateResearchDataset,
  validateRouteCollection,
  validateSurveySummary,
  validateVoices,
  type BridgeFeatureCollection,
  type ResearchDataset,
  type RouteFeatureCollection,
  type SourceRecord,
  type StoryRecord,
  type SurveySummary,
  type VoiceRecord,
} from "./data-validation";

const validBridges: BridgeFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [114.288, 30.553],
      },
      properties: {
        id: "wuhan-yangtze-river-bridge",
        name: "武汉长江大桥",
        river: "长江",
        openedYear: 1957,
        bridgeType: "公铁两用桥",
        themeTags: ["工程报国", "城市记忆"],
        question: "它怎样把三镇联系从地理愿望变成日常生活？",
        shortStory: "它改变了武汉三镇交通格局。",
        researchStatus: "已实地调研",
        mediaIds: ["photo-001"],
        sourceIds: ["source-001"],
      },
    },
  ],
};

const validDataset: ResearchDataset = {
  bridges: validBridges,
  stories: [
    {
      id: "story-001",
      bridgeId: "wuhan-yangtze-river-bridge",
      title: "天堑变通途的日常化",
      question: "第一座长江大桥如何进入市民生活？",
      fieldObservation: "桥头堡周边兼具交通、观景和城市记忆功能。",
      interviewQuote: "小时候过江就认这座桥。",
      quoteConsent: "anonymous",
      analysis: ["国家工程被转化为市民可感知的城市生活经验。"],
      ideologicalLink: "工程报国、人民城市",
      evidenceLevel: "field + interview + document",
    },
  ],
  sources: [
    {
      id: "source-001",
      title: "公开资料索引",
      type: "document",
      access: "public",
    },
  ],
};

const productionDataset: ResearchDataset = {
  bridges: JSON.parse(
    readFileSync(new URL("../../public/data/bridges.geojson", import.meta.url), "utf8"),
  ) as BridgeFeatureCollection,
  routes: JSON.parse(
    readFileSync(new URL("../../public/data/routes.geojson", import.meta.url), "utf8"),
  ) as RouteFeatureCollection,
  stories: JSON.parse(
    readFileSync(new URL("../../public/data/stories.json", import.meta.url), "utf8"),
  ) as StoryRecord[],
  sources: JSON.parse(
    readFileSync(new URL("../../public/data/sources.json", import.meta.url), "utf8"),
  ) as SourceRecord[],
};

const productionSurvey = JSON.parse(
  readFileSync(new URL("../../public/data/survey-summary.json", import.meta.url), "utf8"),
) as SurveySummary;

const productionVoices = JSON.parse(
  readFileSync(new URL("../../public/data/voices.json", import.meta.url), "utf8"),
) as VoiceRecord[];

describe("validateBridgeCollection", () => {
  it("accepts bridge point features with required research fields", () => {
    expect(validateBridgeCollection(validBridges)).toEqual([]);
  });

  it("reports malformed coordinates and missing evidence links", () => {
    const invalid: BridgeFeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          ...validBridges.features[0],
          geometry: {
            type: "Point",
            coordinates: [30.553, 114.288],
          },
          properties: {
            ...validBridges.features[0].properties,
            id: "",
            sourceIds: [],
          },
        },
      ],
    };

    expect(validateBridgeCollection(invalid)).toEqual([
      "bridges[0].properties.id is required",
      "bridges[0].geometry.coordinates must be [longitude, latitude] near Wuhan",
      "bridges[0].properties.sourceIds must include at least one evidence source",
    ]);
  });
});

describe("validateResearchDataset", () => {
  it("requires every story to reference an existing bridge", () => {
    const dataset: ResearchDataset = {
      ...validDataset,
      stories: [
        {
          ...validDataset.stories[0],
          bridgeId: "missing-bridge",
        },
      ],
    };

    expect(validateResearchDataset(dataset)).toContain(
      "stories[0].bridgeId references unknown bridge: missing-bridge",
    );
  });

  it("requires a quote label whenever a story carries a quote", () => {
    const dataset: ResearchDataset = {
      ...validDataset,
      stories: [
        {
          ...validDataset.stories[0],
          quoteLabel: undefined,
        },
      ],
    };

    expect(validateResearchDataset(dataset)).toContain(
      'stories[0].quoteLabel is required for quoted stories',
    );
  });

  it("accepts quoted stories only with a quote, and unquoted stories without one", () => {
    const unquoted: ResearchDataset = {
      ...validDataset,
      stories: [
        {
          ...validDataset.stories[0],
          interviewQuote: "",
          quoteLabel: "",
          quoteConsent: "not-collected",
        },
      ],
    };

    expect(validateResearchDataset(unquoted)).toEqual([]);
  });

  it("rejects empty survey evidence strings", () => {
    const dataset: ResearchDataset = {
      ...validDataset,
      stories: [
        {
          ...validDataset.stories[0],
          surveyEvidence: ["现场问卷 13 份", ""],
        },
      ],
    };

    expect(validateResearchDataset(dataset)).toContain(
      "stories[0].surveyEvidence[1] must be a non-empty string",
    );
  });

  it("requires at least one non-empty analysis paragraph", () => {
    const emptyParagraphs: ResearchDataset = {
      ...validDataset,
      stories: [
        {
          ...validDataset.stories[0],
          analysis: ["有效段落", ""],
        },
      ],
    };

    expect(validateResearchDataset(emptyParagraphs)).toContain(
      "stories[0].analysis[1] must be a non-empty paragraph",
    );

    const noParagraphs: ResearchDataset = {
      ...validDataset,
      stories: [{ ...validDataset.stories[0], analysis: [] }],
    };

    expect(validateResearchDataset(noParagraphs)).toContain(
      "stories[0].analysis must include at least one paragraph",
    );
  });

  it("accepts the full production dataset including the bridge chain", () => {
    expect(validateResearchDataset({ ...productionDataset, voices: productionVoices })).toEqual([]);
  });

  it("accepts the full production survey summary", () => {
    expect(validateSurveySummary(productionSurvey)).toEqual([]);
  });
});

describe("validateVoices", () => {
  const voice: VoiceRecord = {
    id: "voice-001",
    survey: "online",
    quote: "桥梁的连接作用，在这一刻具象化了。",
    theme: "个人经历与情感记忆",
    source: "网络版问卷第 20 题",
    note: "背景说明。",
  };

  it("accepts complete voice records", () => {
    expect(validateVoices([voice])).toEqual([]);
  });

  it("rejects duplicate ids and empty quotes", () => {
    expect(
      validateVoices([
        voice,
        { ...voice, quote: "" },
        { ...voice, id: "voice-001" },
      ]),
    ).toEqual([
      "voices[1].id must be unique: voice-001",
      "voices[1].quote is required",
      "voices[2].id must be unique: voice-001",
    ]);
  });
});

describe("validateRouteCollection", () => {
  it("rejects negative sample counts and empty group labels", () => {
    const invalid: RouteFeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [114.279, 30.5661],
              [114.28201, 30.55262],
            ],
          },
          properties: {
            id: "route-memory",
            name: "城市记忆与三镇联系路线",
            day: "组 A",
            mode: "City Walk + 公共交通",
            color: "#08768d",
            summary: "summary",
            group: " ",
            sampleCount: -1,
          },
        },
      ],
    };

    expect(validateRouteCollection(invalid)).toEqual([
      "routes[0].properties.sampleCount must be a non-negative integer",
      "routes[0].properties.group must be a non-empty string",
    ]);
  });
});

describe("validateSurveySummary", () => {
  const validSurvey: SurveySummary = {
    sampleSize: 228,
    fieldSampleSize: 57,
    familiarBridges: [{ label: "武汉长江大桥", value: 110, percent: 60.44 }],
    cognitionSources: [{ label: "短视频、社交媒体", value: 95, percent: 41.67 }],
    valueRecognition: [{ label: "城市形象与记忆", value: 207, percent: 84.06, mean: 4.237 }],
    techPriorities: [{ label: "实时交通信息", value: 62, percent: 27.19 }],
    improvementPriorities: [{ label: "安全检查与养护", value: 65, percent: 28.51 }],
    openEndedThemes: [{ label: "安全、养护与韧性", value: 24, percent: 33.33 }],
    openEndedFieldThemes: [{ label: "交通与慢行组织", value: 5, percent: 22.73 }],
  };

  it("accepts metrics with percent and mean", () => {
    expect(validateSurveySummary(validSurvey)).toEqual([]);
  });

  it("rejects percent values outside 0-100", () => {
    expect(
      validateSurveySummary({
        ...validSurvey,
        familiarBridges: [{ label: "x", value: 1, percent: 120 }],
      }),
    ).toContain("survey.familiarBridges[0].percent must be between 0 and 100");
  });

  it("rejects mean values outside 1-5", () => {
    expect(
      validateSurveySummary({
        ...validSurvey,
        valueRecognition: [{ label: "x", value: 1, mean: 6 }],
      }),
    ).toContain("survey.valueRecognition[0].mean must be between 1 and 5");
  });
});
