/**
 * Story panel expand/collapse state helpers (mobile dual-state).
 *
 * The 一桥一问 panel collapses to its core sections on mobile (≤980px)
 * and expands via the 「展开全文」 toggle; per-bridge state is remembered
 * for the session (see `src/scripts/map-app.ts` `storyExpandMemory`).
 * This module holds the pure view mapping so the interaction contract
 * (label text, `aria-expanded`, panel class) stays unit-testable; DOM
 * binding lives in the client script.
 */

export const STORY_TOGGLE_EXPANDED_LABEL = "收起全文";
export const STORY_TOGGLE_COLLAPSED_LABEL = "展开全文";
export const STORY_PANEL_EXPANDED_CLASS = "is-expanded";

export interface StoryToggleView {
  expanded: boolean;
  label: string;
  ariaExpanded: "true" | "false";
  expandedClass: string | null;
}

/** Resolve the presentational state of the toggle for a bridge. */
export function resolveStoryToggleView(
  memory: Map<string, boolean>,
  bridgeId: string,
): StoryToggleView {
  const expanded = memory.get(bridgeId) ?? false;
  return {
    expanded,
    label: expanded ? STORY_TOGGLE_EXPANDED_LABEL : STORY_TOGGLE_COLLAPSED_LABEL,
    ariaExpanded: expanded ? "true" : "false",
    expandedClass: expanded ? STORY_PANEL_EXPANDED_CLASS : null,
  };
}

/** Flip the remembered state for a bridge and return the fresh view. */
export function toggleStoryView(
  memory: Map<string, boolean>,
  bridgeId: string,
): StoryToggleView {
  memory.set(bridgeId, !(memory.get(bridgeId) ?? false));
  return resolveStoryToggleView(memory, bridgeId);
}
