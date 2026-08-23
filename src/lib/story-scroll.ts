/**
 * Story panel scroll helpers.
 *
 * The 一桥一问 panel is its own scroll container on desktop
 * (`min-width: 981px`, matches the CSS breakpoint) while on mobile the
 * page itself scrolls. A "story scroll amount" is normalized to
 * panel-relative units so per-bridge progress can be stored and restored
 * independently of the current container.
 */

export const STORY_SCROLL_BREAKPOINT = 981;

export type StoryScrollContainer = "panel" | "window";

export interface StoryScrollMetrics {
  viewportWidth: number;
  panelScrollTop: number;
  panelOffsetTop: number;
  panelScrollHeight: number;
  panelClientHeight: number;
  windowScrollY: number;
  windowInnerHeight: number;
  documentHeight: number;
}

export interface StoryScrollTarget {
  container: StoryScrollContainer;
  value: number;
}

export function resolveStoryScrollContainer(viewportWidth: number): StoryScrollContainer {
  return viewportWidth >= STORY_SCROLL_BREAKPOINT ? "panel" : "window";
}

/** Current panel-relative scroll amount (always >= 0). */
export function readStoryScroll(metrics: StoryScrollMetrics): number {
  const raw =
    resolveStoryScrollContainer(metrics.viewportWidth) === "panel"
      ? metrics.panelScrollTop
      : metrics.windowScrollY - metrics.panelOffsetTop;

  return Math.max(0, raw);
}

/** Convert panel-relative scroll units into per-container target values. */
export function resolveStoryScrollTarget(metrics: StoryScrollMetrics, memory: number): StoryScrollTarget {
  const container = resolveStoryScrollContainer(metrics.viewportWidth);
  const value = Math.max(0, memory);

  const maximum =
    container === "panel"
      ? Math.max(0, metrics.panelScrollHeight - metrics.panelClientHeight)
      : Math.max(0, metrics.documentHeight - metrics.windowInnerHeight);

  return { container, value: Math.min(value, maximum) };
}

export function getStoryPanelOffsetTop(panelTopFromViewport: number, windowScrollY: number): number {
  return Math.max(0, panelTopFromViewport + windowScrollY);
}

/** Top-of-panel scroll position for the window container. */
export function getStoryWindowTop(panelOffsetTop: number): number {
  return Math.max(0, panelOffsetTop);
}
