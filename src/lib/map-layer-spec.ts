import type { AddLayerObject } from "maplibre-gl";
import { BRIDGE_CHAIN_ROUTE_ID } from "./bridge-chain";

export interface MapLayerTheme {
  background: string;
  rasterOpacity: number;
  rasterSaturation: number;
  rasterContrast: number;
  rasterBrightnessMin: number;
  rasterBrightnessMax: number;
  chainHalo: string;
  pointHalo: string;
  pointStroke: string;
}

export const LIGHT_MAP_THEME: MapLayerTheme = {
  background: "#d9e3df",
  rasterOpacity: 0.96,
  rasterSaturation: -0.12,
  rasterContrast: 0.04,
  rasterBrightnessMin: 0,
  rasterBrightnessMax: 1,
  chainHalo: "#edf1ed",
  pointHalo: "#edf1ed",
  pointStroke: "#0f1a17",
};

export const DARK_MAP_THEME: MapLayerTheme = {
  background: "#20302b",
  rasterOpacity: 0.9,
  rasterSaturation: -0.32,
  rasterContrast: 0.08,
  rasterBrightnessMin: 0.12,
  rasterBrightnessMax: 0.76,
  chainHalo: "#17231f",
  pointHalo: "#17231f",
  pointStroke: "#edf4ef",
};

function createResearchRoutesLayer(): AddLayerObject {
  return {
    id: "research-routes",
    type: "line",
    source: "routes",
    filter: ["!=", ["get", "id"], BRIDGE_CHAIN_ROUTE_ID],
    paint: {
      "line-color": ["get", "color"],
      "line-width": 4,
      "line-opacity": 0.82,
    },
  };
}

function createBridgeChainHaloLayer(theme: MapLayerTheme): AddLayerObject {
  return {
    id: "bridge-chain-halo",
    type: "line",
    source: "routes",
    filter: ["==", ["get", "id"], BRIDGE_CHAIN_ROUTE_ID],
    paint: {
      "line-color": theme.chainHalo,
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 5, 14, 8],
      "line-opacity": 0.55,
      "line-blur": 1.2,
    },
  };
}

function createBridgeChainLayer(): AddLayerObject {
  return {
    id: "bridge-chain",
    type: "line",
    source: "routes",
    filter: ["==", ["get", "id"], BRIDGE_CHAIN_ROUTE_ID],
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 6],
      "line-opacity": 0.75,
      "line-dasharray": [1.2, 1.4],
    },
  };
}

function createBridgePointsHaloLayer(theme: MapLayerTheme): AddLayerObject {
  return {
    id: "bridge-points-halo",
    type: "circle",
    source: "bridges",
    paint: {
      "circle-radius": 14,
      "circle-color": theme.pointHalo,
      "circle-opacity": 0.88,
    },
  };
}

function createBridgePointsLayer(theme: MapLayerTheme): AddLayerObject {
  return {
    id: "bridge-points",
    type: "circle",
    source: "bridges",
    paint: {
      "circle-radius": 7,
      "circle-color": [
        "match",
        ["get", "researchStatus"],
        "已实地调研",
        "#cf6245",
        "待实地核验",
        "#9f7741",
        "#08768d",
      ],
      "circle-stroke-color": theme.pointStroke,
      "circle-stroke-width": 1.5,
    },
  };
}

export function createBridgeMapLayers(theme: MapLayerTheme): AddLayerObject[] {
  return [
    createResearchRoutesLayer(),
    createBridgeChainHaloLayer(theme),
    createBridgeChainLayer(),
    createBridgePointsHaloLayer(theme),
    createBridgePointsLayer(theme),
  ];
}

export const RESEARCH_ROUTES_LAYER = createResearchRoutesLayer();
export const BRIDGE_CHAIN_HALO_LAYER = createBridgeChainHaloLayer(LIGHT_MAP_THEME);
export const BRIDGE_CHAIN_LAYER = createBridgeChainLayer();
export const BRIDGE_ROUTE_LAYERS = [
  RESEARCH_ROUTES_LAYER,
  BRIDGE_CHAIN_HALO_LAYER,
  BRIDGE_CHAIN_LAYER,
];
export const BRIDGE_POINTS_HALO_LAYER = createBridgePointsHaloLayer(LIGHT_MAP_THEME);
export const BRIDGE_POINTS_LAYER = createBridgePointsLayer(LIGHT_MAP_THEME);
export const BRIDGE_MAP_LAYERS = createBridgeMapLayers(LIGHT_MAP_THEME);
