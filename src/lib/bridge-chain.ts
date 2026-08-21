import type {
  BridgeFeatureCollection,
  Coordinate,
  RouteFeatureCollection,
} from "./data-validation";

export const BRIDGE_CHAIN_ROUTE_ID = "route-bridge-chain";

export const BRIDGE_CHAIN_IDS = [
  "qingchuan-bridge",
  "wuhan-yangtze-river-bridge",
  "yingwuzhou-yangtze-river-bridge",
  "yangsigang-yangtze-river-bridge",
  "baishazhou-yangtze-river-bridge",
  "wuhan-second-yangtze-river-bridge",
  "erqi-yangtze-river-bridge",
  "tianxingzhou-yangtze-river-bridge",
] as const;

export function getBridgeChainCoordinates(bridges: BridgeFeatureCollection): Coordinate[] {
  const byId = new Map(bridges.features.map((bridge) => [bridge.properties.id, bridge]));

  return BRIDGE_CHAIN_IDS.flatMap((bridgeId) => {
    const bridge = byId.get(bridgeId);
    return bridge ? [bridge.geometry.coordinates] : [];
  });
}

export function validateBridgeChain(
  bridges: BridgeFeatureCollection,
  routes: RouteFeatureCollection,
): string[] {
  const issues: string[] = [];
  const route = routes.features.find((candidate) => candidate.properties.id === BRIDGE_CHAIN_ROUTE_ID);
  const byId = new Map(bridges.features.map((bridge) => [bridge.properties.id, bridge]));
  const missingIds = BRIDGE_CHAIN_IDS.filter((bridgeId) => !byId.has(bridgeId));

  if (!route) {
    return [`routes must include ${BRIDGE_CHAIN_ROUTE_ID}`];
  }

  if (missingIds.length > 0) {
    return [`bridges missing from chain: ${missingIds.join(", ")}`];
  }

  if (route.geometry.coordinates.length !== BRIDGE_CHAIN_IDS.length) {
    return [`${BRIDGE_CHAIN_ROUTE_ID} must contain ${BRIDGE_CHAIN_IDS.length} coordinates`];
  }

  const coordinates = getBridgeChainCoordinates(bridges);
  coordinates.forEach((coordinate, index) => {
    const routeCoordinate = route.geometry.coordinates[index];
    if (!routeCoordinate || routeCoordinate[0] !== coordinate[0] || routeCoordinate[1] !== coordinate[1]) {
      issues.push(`${BRIDGE_CHAIN_ROUTE_ID} coordinate ${index} must match the bridge center`);
    }
  });

  return issues;
}
