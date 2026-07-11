import { describe, expect, it } from "vitest";
import { INITIAL_MAP_VIEW } from "./map-view";

describe("INITIAL_MAP_VIEW", () => {
  it("starts at the Wuhan study center without fitting the full study bounds", () => {
    expect(INITIAL_MAP_VIEW).toEqual({
      center: [114.3375, 30.5625],
      zoom: 11.2,
    });
  });
});
