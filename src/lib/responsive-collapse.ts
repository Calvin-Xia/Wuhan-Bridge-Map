import { STORY_SCROLL_BREAKPOINT } from "./story-scroll";

/** 展开/收起两态的桌面断点（与故事卡弹窗/滚动记忆共用 981px 分界，2026-08）。 */
export const DESKTOP_COLLAPSE_QUERY = `(min-width: ${STORY_SCROLL_BREAKPOINT}px)`;

/**
 * 展开/收起的端侧默认（2026-08 用户决策）：
 * - 桌面（≥981px）：列表恒全展，折叠按钮不渲染（visibleCount = null）；
 * - 移动端（<981px）：默认收起至 visibleCount 条（探头式：露前几条），按钮保留。
 */
export function resolveCollapseState(
  isDesktop: boolean,
  visibleCount: number,
): { visibleCount: number | null } {
  return { visibleCount: isDesktop ? null : visibleCount };
}
