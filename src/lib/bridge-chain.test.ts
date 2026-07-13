import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BRIDGE_CHAIN_IDS,
  BRIDGE_CHAIN_ROUTE_ID,
  getBridgeChainCoordinates,
  validateBridgeChain,
} from "./bridge-chain";
import type {
  BridgeFeatureCollection,
  RouteFeatureCollection,
  StoryRecord,
} from "./data-validation";

const bridges = JSON.parse(
  readFileSync(new URL("../../public/data/bridges.geojson", import.meta.url), "utf8"),
) as BridgeFeatureCollection;
const routes = JSON.parse(
  readFileSync(new URL("../../public/data/routes.geojson", import.meta.url), "utf8"),
) as RouteFeatureCollection;
const stories = JSON.parse(
  readFileSync(new URL("../../public/data/stories.json", import.meta.url), "utf8"),
) as StoryRecord[];

function getBridgeCoordinates(bridgeIds: readonly string[]) {
  return bridgeIds.map((bridgeId) => {
    const bridge = bridges.features.find((candidate) => candidate.properties.id === bridgeId);
    if (!bridge) {
      throw new Error(`Production bridge missing: ${bridgeId}`);
    }
    return bridge.geometry.coordinates;
  });
}

function expectRouteToMatchBridges(routeId: string, bridgeIds: readonly string[]) {
  const route = routes.features.find((candidate) => candidate.properties.id === routeId);
  expect(route).toBeDefined();
  if (!route) {
    throw new Error(`Production route missing: ${routeId}`);
  }

  expect(route.geometry.coordinates).toEqual(getBridgeCoordinates(bridgeIds));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getProductionChainRoute() {
  const route = routes.features.find((candidate) => candidate.properties.id === BRIDGE_CHAIN_ROUTE_ID);
  if (!route) {
    throw new Error(`Production route missing: ${BRIDGE_CHAIN_ROUTE_ID}`);
  }
  return route;
}

describe("bridge chain", () => {
  it("defines the approved nine-bridge order", () => {
    expect(BRIDGE_CHAIN_IDS).toEqual([
      "qingchuan-bridge",
      "wuhan-yangtze-river-bridge",
      "yingwuzhou-yangtze-river-bridge",
      "yangsigang-yangtze-river-bridge",
      "baishazhou-yangtze-river-bridge",
      "wuhan-second-yangtze-river-bridge",
      "erqi-yangtze-river-bridge",
      "tianxingzhou-yangtze-river-bridge",
      "qingshan-yangtze-river-bridge",
    ]);
  });

  it("keeps the production bridge inventory and 二七 research placeholders complete", () => {
    expect(bridges.features).toHaveLength(9);
    expect(bridges.features.map((bridge) => bridge.properties.id).sort()).toEqual(
      [...BRIDGE_CHAIN_IDS].sort(),
    );

    const erqi = bridges.features.find((bridge) => bridge.properties.id === "erqi-yangtze-river-bridge");
    expect(erqi).toBeDefined();
    if (!erqi) {
      throw new Error("Production bridge missing: erqi-yangtze-river-bridge");
    }

    expect(erqi.properties).toMatchObject({
      id: "erqi-yangtze-river-bridge",
      name: "二七长江大桥",
      openedYear: 2011,
      bridgeType: "公路桥",
      researchStatus: "资料整理中",
      sourceIds: ["source-bridge-catalog", "field-template"],
    });
    expect(erqi.properties.mediaIds.length).toBeGreaterThan(0);
    expect(erqi.properties.shortStory).toContain("资料整理中");

    const erqiStory = stories.find((story) => story.bridgeId === "erqi-yangtze-river-bridge");
    expect(erqiStory).toBeDefined();
    if (!erqiStory) {
      throw new Error("Production story missing: erqi-yangtze-river-bridge");
    }

    expect(erqiStory.bridgeId).toBe("erqi-yangtze-river-bridge");
    expect(erqiStory.quoteConsent).toBe("anonymous");
    expect(`${erqiStory.fieldObservation}\n${erqiStory.analysis}`).toContain("资料整理中");
  });

  it("keeps existing route points synchronized with production bridge centers", () => {
    expectRouteToMatchBridges("route-memory", [
      "qingchuan-bridge",
      "wuhan-yangtze-river-bridge",
      "yingwuzhou-yangtze-river-bridge",
    ]);
    expectRouteToMatchBridges("route-public-space", [
      "baishazhou-yangtze-river-bridge",
      "yangsigang-yangtze-river-bridge",
      "yingwuzhou-yangtze-river-bridge",
    ]);
    expectRouteToMatchBridges("route-network", [
      "wuhan-second-yangtze-river-bridge",
      "erqi-yangtze-river-bridge",
      "tianxingzhou-yangtze-river-bridge",
      "qingshan-yangtze-river-bridge",
    ]);
  });

  it("reports only the exact missing bridge-chain ids", () => {
    const incompleteBridges = clone(bridges);
    incompleteBridges.features = incompleteBridges.features.filter(
      (bridge) => bridge.properties.id !== "erqi-yangtze-river-bridge",
    );

    expect(validateBridgeChain(incompleteBridges, routes)).toEqual([
      "bridges missing from chain: erqi-yangtze-river-bridge",
    ]);
  });

  it("reports only the exact chain length issue for a truncated route", () => {
    const truncatedRoutes = clone(routes);
    const chainRoute = getProductionChainRoute();
    const truncatedChainRoute = truncatedRoutes.features.find(
      (route) => route.properties.id === BRIDGE_CHAIN_ROUTE_ID,
    );
    if (!truncatedChainRoute) {
      throw new Error(`Production route missing: ${BRIDGE_CHAIN_ROUTE_ID}`);
    }
    truncatedChainRoute.geometry.coordinates = chainRoute.geometry.coordinates.slice(0, 8);

    expect(validateBridgeChain(bridges, truncatedRoutes)).toEqual([
      "route-bridge-chain must contain 9 coordinates",
    ]);
  });

  it("reports only the exact coordinate issue for a changed first point", () => {
    const changedRoutes = clone(routes);
    const chainRoute = changedRoutes.features.find(
      (route) => route.properties.id === BRIDGE_CHAIN_ROUTE_ID,
    );
    if (!chainRoute) {
      throw new Error(`Production route missing: ${BRIDGE_CHAIN_ROUTE_ID}`);
    }
    chainRoute.geometry.coordinates[0] = [114.3, 30.6];

    expect(validateBridgeChain(bridges, changedRoutes)).toEqual([
      "route-bridge-chain coordinate 0 must match the bridge center",
    ]);
  });

  it("matches the production chain route to the production bridge centers", () => {
    expect(validateBridgeChain(bridges, routes)).toEqual([]);
    expect(
      routes.features.find((route) => route.properties.id === BRIDGE_CHAIN_ROUTE_ID)?.geometry.coordinates,
    ).toEqual(getBridgeChainCoordinates(bridges));
  });
});
