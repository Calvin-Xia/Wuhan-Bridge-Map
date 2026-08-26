/**
 * 机构引语标签的显示归一（2026-08 溯源降噪约定）。
 *
 * 数据契约（src/lib/data-validation.ts）要求 institutionNote.quote 存在时
 * quoteLabel 必填且非空——但「根据访谈纸质记录整理，」这类冗余前缀已由
 * 故事卡底部来源胶囊（source-row）锚定，逐条重复属于噪声。显示层在此
 * 剥除冗余前缀与角色头，剩余为空串则不渲染 <cite>（鹦鹉洲/天兴洲的
 * 标签整体不可见；白沙洲保留「（历史案例）」）。
 */

/** 剥除已知冗余溯源前缀与角色头，返回实际显示的标签文本（可能为空串）。 */
export function displayInstitutionLabel(label: string): string {
  return label
    .replace(/^根据访谈纸质记录整理，/, "")
    .replace(/^相关负责人介绍/, "")
    .trim();
}
