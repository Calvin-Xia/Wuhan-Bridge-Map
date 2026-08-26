import { describe, expect, it } from "vitest";
import { DESKTOP_COLLAPSE_QUERY, resolveCollapseState } from "./responsive-collapse";
import { STORY_SCROLL_BREAKPOINT } from "./story-scroll";

describe("resolveCollapseState", () => {
  it("expands everything and hides the toggle on desktop", () => {
    expect(resolveCollapseState(true, 3)).toEqual({ visibleCount: null });
  });

  it("keeps the peeked collapse count on mobile", () => {
    expect(resolveCollapseState(false, 3)).toEqual({ visibleCount: 3 });
    expect(resolveCollapseState(false, 2)).toEqual({ visibleCount: 2 });
  });
});

describe("DESKTOP_COLLAPSE_QUERY", () => {
  it("shares the 981px desktop breakpoint with the story modal", () => {
    expect(DESKTOP_COLLAPSE_QUERY).toBe("(min-width: 981px)");
    expect(STORY_SCROLL_BREAKPOINT).toBe(981);
  });
});
