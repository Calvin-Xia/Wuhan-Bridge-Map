import { describe, expect, it } from "vitest";
import { INITIAL_MAP_VIEW } from "./map-view";

describe("INITIAL_MAP_VIEW", () => {
  it("starts at the Wuhan study center in GCJ-02 (data/correction-off contract)", () => {
    expect(INITIAL_MAP_VIEW).toEqual({
      center: [114.342991, 30.560138],
      zoom: 11.2,
    });
  });
});
