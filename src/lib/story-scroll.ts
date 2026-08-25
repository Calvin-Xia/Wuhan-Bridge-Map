/**
 * Story panel scroll helpers.
 *
 * The 一桥一问 panel is its own scroll container at every breakpoint:
 * on desktop the `story-rail` grid bounds it; on mobile the panel is the
 * near-fullscreen story modal (see `global.css`, `@media (max-width: 980px)`).
 * Scroll memory is therefore always measured in panel-relative units
 * (`panel.scrollTop`) — one semantic for both surfaces.
 */

export const STORY_SCROLL_BREAKPOINT = 981;

export interface StoryScrollMetrics {
  viewportWidth: number;
  panelScrollTop: number;
  panelOffsetTop: number;
  panelScrollHeight: number;
  panelClientHeight: number;
}

/** Current panel-relative scroll amount (always >= 0). */
export function readStoryScroll(metrics: StoryScrollMetrics): number {
  return Math.max(0, metrics.panelScrollTop);
}

/** Clamp a panel-relative memory value into the panel's current scroll range. */
export function clampStoryScroll(metrics: StoryScrollMetrics, memory: number): number {
  const maximum = Math.max(0, metrics.panelScrollHeight - metrics.panelClientHeight);
  return Math.min(Math.max(0, memory), maximum);
}

/** Absolute document offset of the panel (window scroll target on mobile). */
export function getStoryPanelOffsetTop(panelTopFromViewport: number, windowScrollY: number): number {
  return Math.max(0, panelTopFromViewport + windowScrollY);
}
