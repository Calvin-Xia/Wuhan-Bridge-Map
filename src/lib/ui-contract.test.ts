import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRIDGE_CHAIN_ROUTE_ID } from "./bridge-chain";
import {
  BRIDGE_CHAIN_HALO_LAYER,
  BRIDGE_CHAIN_LAYER,
  BRIDGE_MAP_LAYERS,
  BRIDGE_POINTS_HALO_LAYER,
  BRIDGE_POINTS_LAYER,
  RESEARCH_ROUTES_LAYER,
} from "./map-layer-spec";

const page = readFileSync(new URL("../pages/index.astro", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/global.css", import.meta.url), "utf8");

describe("MapLibre bridge-chain contract", () => {
  it("keeps all rendered map layers in order", () => {
    expect(BRIDGE_MAP_LAYERS.map((layer) => layer.id)).toEqual([
      "research-routes",
      "bridge-chain-halo",
      "bridge-chain",
      "bridge-points-halo",
      "bridge-points",
    ]);
  });

  it("defines the research-routes layer contract", () => {
    expect(RESEARCH_ROUTES_LAYER).toEqual({
      id: "research-routes",
      type: "line",
      source: "routes",
      filter: ["!=", ["get", "id"], BRIDGE_CHAIN_ROUTE_ID],
      paint: {
        "line-color": ["get", "color"],
        "line-width": 4,
        "line-opacity": 0.82,
      },
    });
  });

  it("defines the bridge-chain halo layer contract", () => {
    expect(BRIDGE_CHAIN_HALO_LAYER).toEqual({
      id: "bridge-chain-halo",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "id"], BRIDGE_CHAIN_ROUTE_ID],
      paint: {
        "line-color": "#edf1ed",
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 8, 14, 13],
        "line-opacity": 0.9,
        "line-blur": 1.2,
      },
    });
  });

  it("defines the bridge-chain main line contract", () => {
    expect(BRIDGE_CHAIN_LAYER).toEqual({
      id: "bridge-chain",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "id"], BRIDGE_CHAIN_ROUTE_ID],
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 6],
        "line-opacity": 0.92,
        "line-dasharray": [1.2, 1.4],
      },
    });
  });

  it("defines the bridge-points halo layer contract", () => {
    expect(BRIDGE_POINTS_HALO_LAYER).toEqual({
      id: "bridge-points-halo",
      type: "circle",
      source: "bridges",
      paint: {
        "circle-radius": 14,
        "circle-color": "#edf1ed",
        "circle-opacity": 0.88,
      },
    });
  });

  it("defines bridge-points as a circle layer on the bridges source", () => {
    expect(BRIDGE_POINTS_LAYER).toEqual({
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
        "circle-stroke-color": "#0f1a17",
        "circle-stroke-width": 1.5,
      },
    });
  });
});

describe("dashboard interface contract", () => {
  it("provides one semantic decorative icon per chart", () => {
    expect(page.match(/class="chart-icon"/g)?.length).toBe(3);
    expect(page.match(/<svg\b/g)?.length).toBe(3);
    expect(page).toContain('aria-hidden="true"');
  });

  it("keeps the project metrics synchronized with the dataset", () => {
    expect(page).toContain('<strong id="bridge-count">9</strong>');
    expect(page).toMatch(/<dt>条路线<\/dt><dd><strong>4<\/strong><\/dd>/);
  });

  it("declares the balanced workspace and one-shot chart icon animation", () => {
    expect(styles).toContain("grid-template-columns: minmax(22rem, 0.72fr) minmax(0, 1fr)");
    expect(styles).toContain("height: clamp(28rem, 48vh, 34rem)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.9fr) minmax(0, 1.05fr)");
    expect(styles).toContain(".chart-icon");
    expect(styles).toContain(".chart-icon svg");
    expect(styles).toContain("chart-icon-pop");
    expect(styles).toContain(".reveal.is-visible .chart-icon");
  });
});
