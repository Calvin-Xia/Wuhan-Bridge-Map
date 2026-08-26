/**
 * 句末句号剥离（2026-08 市民之声条目化约定：句末不写句号，正文内部句号保留）。
 *
 * 只在显示层应用——数据文件（voices.json 等）原文保留，
 * 避免破坏数据契约与后续引用。
 */

/** 去掉文本末尾的句号（含连续多个）与尾随空白。 */
export function stripTrailingPeriod(text: string): string {
  return text.trimEnd().replace(/。+$/, "");
}
