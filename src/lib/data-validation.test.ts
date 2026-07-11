import { describe, expect, it } from "vitest";
import {
  validateBridgeCollection,
  validateResearchDataset,
  type BridgeFeatureCollection,
  type ResearchDataset,
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
      analysis: "国家工程被转化为市民可感知的城市生活经验。",
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
});
