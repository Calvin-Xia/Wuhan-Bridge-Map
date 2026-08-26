import { describe, expect, it } from "vitest";
import { stripTrailingPeriod } from "./final-period";

describe("stripTrailingPeriod", () => {
  it("strips a single trailing fullwidth period", () => {
    expect(stripTrailingPeriod("步行时又感到大桥很长。")).toBe("步行时又感到大桥很长");
  });

  it("strips multiple trailing periods and surrounding whitespace", () => {
    expect(stripTrailingPeriod("多盖几座桥。。 ")).toBe("多盖几座桥");
    expect(stripTrailingPeriod("看日出日落很美好。　")).toBe("看日出日落很美好");
  });

  it("keeps internal periods and texts without a trailing period", () => {
    expect(stripTrailingPeriod("受访者回忆暑期随在武汉工作的父母出行：乘车时觉得家与工作地点很近，步行时又感到大桥很长。")).toBe(
      "受访者回忆暑期随在武汉工作的父母出行：乘车时觉得家与工作地点很近，步行时又感到大桥很长",
    );
    expect(stripTrailingPeriod("没有句号")).toBe("没有句号");
  });
});
