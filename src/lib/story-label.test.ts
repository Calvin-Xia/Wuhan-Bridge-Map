import { describe, expect, it } from "vitest";
import { displayInstitutionLabel } from "./story-label";

describe("displayInstitutionLabel", () => {
  it("strips the redundant provenance prefix and role header from full labels", () => {
    expect(displayInstitutionLabel("根据访谈纸质记录整理，相关负责人介绍")).toBe("");
    expect(displayInstitutionLabel("根据访谈纸质记录整理，相关负责人介绍（历史案例）")).toBe(
      "（历史案例）",
    );
  });

  it("keeps labels without the redundant prefix untouched", () => {
    expect(displayInstitutionLabel("（历史案例）")).toBe("（历史案例）");
    expect(displayInstitutionLabel("网络版问卷开放回答")).toBe("网络版问卷开放回答");
  });

  it("returns an empty string for blank input", () => {
    expect(displayInstitutionLabel("")).toBe("");
  });
});
