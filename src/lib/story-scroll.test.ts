import { describe, expect, it } from "vitest";
import {
  getStoryPanelOffsetTop,
  getStoryWindowTop,
  readStoryScroll,
  resolveStoryScrollContainer,
  resolveStoryScrollTarget,
  STORY_SCROLL_BREAKPOINT,
  type StoryScrollMetrics,
} from "./story-scroll";

const desktopMetrics: StoryScrollMetrics = {
  viewportWidth: 1280,
  panelScrollTop: 420,
  panelOffsetTop: 300,
  panelScrollHeight: 2240,
  panelClientHeight: 700,
  windowScrollY: 0,
  windowInnerHeight: 720,
  documentHeight: 3200,
};

const mobileMetrics: StoryScrollMetrics = {
  viewportWidth: 560,
  panelScrollTop: 0,
  panelOffsetTop: 1600,
  panelScrollHeight: 2400,
  panelClientHeight: 2400,
  windowScrollY: 2100,
  windowInnerHeight: 700,
  documentHeight: 9000,
};

describe("resolveStoryScrollContainer", () => {
  it("uses the panel container at or above the CSS breakpoint", () => {
    expect(resolveStoryScrollContainer(STORY_SCROLL_BREAKPOINT)).toBe("panel");
    expect(resolveStoryScrollContainer(1200)).toBe("panel");
  });

  it("uses the window container below the CSS breakpoint", () => {
    expect(resolveStoryScrollContainer(STORY_SCROLL_BREAKPOINT - 1)).toBe("window");
    expect(resolveStoryScrollContainer(320)).toBe("window");
  });
});

describe("readStoryScroll", () => {
  it("reads panel scrollTop on desktop", () => {
    expect(readStoryScroll(desktopMetrics)).toBe(420);
  });

  it("reads page scroll relative to the panel top on mobile", () => {
    expect(readStoryScroll(mobileMetrics)).toBe(500);
  });

  it("clamps negative values to zero", () => {
    expect(readStoryScroll({ ...mobileMetrics, windowScrollY: 1200 })).toBe(0);
  });
});

describe("resolveStoryScrollTarget", () => {
  it("clamps desktop memory to the panel's scroll range", () => {
    expect(resolveStoryScrollTarget(desktopMetrics, 9999)).toEqual({
      container: "panel",
      value: 1540,
    });
  });

  it("clamps mobile memory to the document scroll range", () => {
    expect(resolveStoryScrollTarget(mobileMetrics, 9999)).toEqual({
      container: "window",
      value: 8300,
    });
  });

  it("passes through non-negative memory values", () => {
    expect(resolveStoryScrollTarget(desktopMetrics, 120)).toEqual({
      container: "panel",
      value: 120,
    });

    expect(resolveStoryScrollTarget(mobileMetrics, 500)).toEqual({
      container: "window",
      value: 500,
    });
  });

  it("treats negative memory as zero", () => {
    expect(resolveStoryScrollTarget(desktopMetrics, -40)).toEqual({
      container: "panel",
      value: 0,
    });
  });
});

describe("story panel offset helpers", () => {
  it("computes the absolute document offset of the panel", () => {
    expect(getStoryPanelOffsetTop(300, 200)).toBe(500);
    expect(getStoryPanelOffsetTop(-100, 200)).toBe(100);
  });

  it("provides the window scroll target for the panel top", () => {
    expect(getStoryWindowTop(1600)).toBe(1600);
  });
});
