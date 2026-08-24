import { describe, expect, it } from "vitest";
import {
  clampStoryScroll,
  getStoryPanelOffsetTop,
  readStoryScroll,
  type StoryScrollMetrics,
} from "./story-scroll";

const metrics: StoryScrollMetrics = {
  viewportWidth: 560,
  panelScrollTop: 420,
  panelOffsetTop: 1600,
  panelScrollHeight: 2240,
  panelClientHeight: 700,
};

describe("readStoryScroll", () => {
  it("reads the panel-relative scroll amount regardless of breakpoint", () => {
    expect(readStoryScroll(metrics)).toBe(420);
    expect(readStoryScroll({ ...metrics, viewportWidth: 1280 })).toBe(420);
  });

  it("clamps negative values to zero", () => {
    expect(readStoryScroll({ ...metrics, panelScrollTop: -20 })).toBe(0);
  });
});

describe("clampStoryScroll", () => {
  it("clamps memory into the panel's current scroll range", () => {
    expect(clampStoryScroll(metrics, 9999)).toBe(1540);
  });

  it("passes through in-range values", () => {
    expect(clampStoryScroll(metrics, 120)).toBe(120);
  });

  it("treats negative memory as zero", () => {
    expect(clampStoryScroll(metrics, -40)).toBe(0);
  });

  it("returns zero when the panel content fits without scrolling", () => {
    expect(clampStoryScroll({ ...metrics, panelScrollHeight: 500, panelClientHeight: 700 }, 9999)).toBe(0);
  });
});

describe("story panel offset helper", () => {
  it("computes the absolute document offset of the panel", () => {
    expect(getStoryPanelOffsetTop(300, 200)).toBe(500);
    expect(getStoryPanelOffsetTop(-100, 200)).toBe(100);
  });
});
