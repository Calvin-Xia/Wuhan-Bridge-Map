import { describe, expect, it } from "vitest";
import {
  DARK_MAP_THEME,
  LIGHT_MAP_THEME,
  RESEARCH_STATUS_FILLS,
  researchStatusFill,
} from "./map-layer-spec";

describe("覆盖层明暗调色板", () => {
  it("暗色主题用亮色 halo/描边，亮色主题用深色描边", () => {
    expect(LIGHT_MAP_THEME.pointStroke).toBe("#0f1a17");
    expect(DARK_MAP_THEME.pointStroke).toBe("#edf4ef");
    expect(LIGHT_MAP_THEME.chainHalo).not.toBe(DARK_MAP_THEME.chainHalo);
  });

  it("三态调研状态 + 兜底色", () => {
    expect(researchStatusFill("已实地调研")).toBe(RESEARCH_STATUS_FILLS["已实地调研"]);
    expect(researchStatusFill("待实地核验")).toBe(RESEARCH_STATUS_FILLS["待实地核验"]);
    expect(researchStatusFill("未知状态")).toBe(RESEARCH_STATUS_FILLS.fallback);
  });
});
