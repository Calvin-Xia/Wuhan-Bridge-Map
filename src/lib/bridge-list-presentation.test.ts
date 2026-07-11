import { describe, expect, it } from "vitest";
import type { BridgeFeature } from "./data-validation";
import { createBridgeListMarkup, getBridgeSelectionAttributes } from "./bridge-list-presentation";

const bridge: BridgeFeature = {
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
    themeTags: ["工程报国"],
    question: "它怎样把三镇联系从地理愿望变成日常生活？",
    shortStory: "它改变了武汉三镇交通格局。",
    researchStatus: "已实地调研",
    mediaIds: [],
    sourceIds: ["source-001"],
  },
};

describe("createBridgeListMarkup", () => {
  it("renders the active bridge as a semantic list item with aria-current", () => {
    const markup = createBridgeListMarkup([bridge], bridge.properties.id);

    expect(markup).toContain('<li><button class="bridge-item is-active"');
    expect(markup).toContain('data-bridge-id="wuhan-yangtze-river-bridge"');
    expect(markup).toContain('aria-current="true"');
    expect(markup).toContain("武汉长江大桥");
  });
});

describe("getBridgeSelectionAttributes", () => {
  it("returns the literal aria-current value required for an active bridge", () => {
    expect(getBridgeSelectionAttributes(true)).toEqual({
      ariaCurrent: "true",
      isActive: true,
    });
    expect(getBridgeSelectionAttributes(false)).toEqual({
      ariaCurrent: undefined,
      isActive: false,
    });
  });
});
