import { describe, expect, it } from "vitest";
import {
  resolveStoryToggleView,
  STORY_PANEL_EXPANDED_CLASS,
  STORY_TOGGLE_COLLAPSED_LABEL,
  STORY_TOGGLE_EXPANDED_LABEL,
  toggleStoryView,
} from "./story-toggle";

describe("resolveStoryToggleView", () => {
  it("defaults to the collapsed state without memory", () => {
    const view = resolveStoryToggleView(new Map(), "erqi-yangtze-river-bridge");
    expect(view).toEqual({
      expanded: false,
      label: STORY_TOGGLE_COLLAPSED_LABEL,
      ariaExpanded: "false",
      expandedClass: null,
    });
  });

  it("treats explicit false memory as collapsed", () => {
    const memory = new Map([["baishazhou-yangtze-river-bridge", false]]);
    expect(resolveStoryToggleView(memory, "baishazhou-yangtze-river-bridge").expanded).toBe(false);
  });

  it("maps expanded memory to label, aria and panel class", () => {
    const memory = new Map([["wuhan-yangtze-river-bridge", true]]);
    expect(resolveStoryToggleView(memory, "wuhan-yangtze-river-bridge")).toEqual({
      expanded: true,
      label: STORY_TOGGLE_EXPANDED_LABEL,
      ariaExpanded: "true",
      expandedClass: STORY_PANEL_EXPANDED_CLASS,
    });
  });

  it("keeps bridge states independent", () => {
    const memory = new Map([["erqi-yangtze-river-bridge", true]]);
    expect(resolveStoryToggleView(memory, "wuhan-yangtze-river-bridge").expanded).toBe(false);
  });
});

describe("toggleStoryView", () => {
  it("flips the remembered state from collapsed to expanded", () => {
    const memory = new Map<string, boolean>();
    const view = toggleStoryView(memory, "qingchuan-bridge");
    expect(view.expanded).toBe(true);
    expect(memory.get("qingchuan-bridge")).toBe(true);
  });

  it("flips back from expanded to collapsed", () => {
    const memory = new Map([["qingchuan-bridge", true]]);
    const view = toggleStoryView(memory, "qingchuan-bridge");
    expect(view.expanded).toBe(false);
    expect(memory.get("qingchuan-bridge")).toBe(false);
  });

  it("returns a view consistent with resolveStoryToggleView", () => {
    const memory = new Map<string, boolean>();
    const view = toggleStoryView(memory, "yingwuzhou-yangtze-river-bridge");
    expect(view).toEqual(resolveStoryToggleView(memory, "yingwuzhou-yangtze-river-bridge"));
  });
});

describe("visible copy contract", () => {
  it("keeps the two toggle labels apart", () => {
    expect(STORY_TOGGLE_EXPANDED_LABEL).toBe("收起全文");
    expect(STORY_TOGGLE_COLLAPSED_LABEL).toBe("展开全文");
  });
});
