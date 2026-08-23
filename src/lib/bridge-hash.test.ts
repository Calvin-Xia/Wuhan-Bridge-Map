import { describe, expect, it } from "vitest";
import { buildBridgeHash, parseBridgeHash } from "./bridge-hash";

describe("parseBridgeHash", () => {
  it("extracts a bridge id from a bridge hash", () => {
    expect(parseBridgeHash("#bridge-erqi-yangtze-river-bridge")).toBe("erqi-yangtze-river-bridge");
  });

  it("returns null for section hashes, plain anchors or empty hashes", () => {
    expect(parseBridgeHash("#section-evidence")).toBeNull();
    expect(parseBridgeHash("")).toBeNull();
    expect(parseBridgeHash("#")).toBeNull();
    expect(parseBridgeHash("#bridge-")).toBeNull();
  });

  it("returns null for malformed percent-encoding", () => {
    expect(parseBridgeHash("#bridge-%")).toBeNull();
  });

  it("decodes percent-encoded ids", () => {
    expect(parseBridgeHash(buildBridgeHash("wuhan-@-bridge"))).toBe("wuhan-@-bridge");
  });
});

describe("buildBridgeHash", () => {
  it("builds a bridge hash from an id", () => {
    expect(buildBridgeHash("baishazhou-yangtze-river-bridge")).toBe(
      "#bridge-baishazhou-yangtze-river-bridge",
    );
  });
});
