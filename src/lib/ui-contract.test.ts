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
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 5, 14, 8],
        "line-opacity": 0.55,
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
        "line-opacity": 0.75,
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
    expect(page.match(/class="chart-icon"/g)?.length).toBe(7);
    expect(page.match(/<svg\b/g)?.length).toBe(7);
    expect(page).toContain('aria-hidden="true"');
  });

  it("keeps the project metrics synchronized with the dataset", () => {
    expect(page).toContain('<strong id="bridge-count">8</strong>');
    expect(page).toMatch(/<dt>条路线<\/dt><dd><strong>4<\/strong><\/dd>/);
  });

  it("declares the balanced workspace, three-column evidence grid and paired chart row", () => {
    expect(styles).toContain("grid-template-columns: minmax(22rem, 0.72fr) minmax(0, 1fr)");
    expect(styles).toContain("height: clamp(34rem, 58vh, 42rem)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.9fr) minmax(0, 1.05fr)");
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(styles).toContain(".chart-icon");
    expect(styles).toContain(".chart-icon svg");
    expect(styles).toContain("chart-icon-pop");
    expect(styles).toContain(".reveal.is-visible .chart-icon");
  });

  it("declares the anonymized voice list for unplaceable open answers", () => {
    expect(page).toContain('aria-label="市民之声"');
    expect(page).toContain('id="voice-list-online"');
    expect(page).toContain('id="voice-list-field"');
    expect(page).toContain("问卷里的市民之声");
    expect(styles).toContain(".voice-quote");
    expect(styles).toContain(".voice-meta");
  });

  it("declares the two-way collapsible voice list and side-by-side tail layout", () => {
    expect(styles).toContain(".voice-expand-toggle");
    expect(styles).toContain(".voice-item[hidden]");
    expect(styles).toContain(".tail-grid");
    expect(styles).toMatch(
      /\.tail-grid > \.voice-band,\s*\.tail-grid > \.governance-band\s*\{[^}]*margin-block-start: 0/,
    );
    expect(styles).toContain("@media (min-width: 981px)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)");
  });

  it("declares the governance band with its stat groups, quotes and disclaimers", () => {
    expect(page).toContain('aria-label="治理侧记"');
    expect(page).toContain('id="section-governance"');
    expect(page).toContain('id="governance-intro"');
    expect(page).toContain('id="governance-stat-groups"');
    expect(page).toContain('id="governance-quotes"');
    expect(page).toContain('id="governance-disclaimers"');
    expect(styles).toContain(".governance-stat-value");
    expect(styles).toContain(".governance-stat-source");
    expect(styles).toContain(".quote--institution");
    expect(styles).toContain(".governance-disclaimers");
  });

  it("keeps the governance heading aligned with the evidence headings", () => {
    expect(page).toContain('class="governance-heading reveal"');
    expect(styles).toMatch(
      /\.map-header h1,\s*\.evidence-heading h2,\s*\.story-panel h2,\s*\.governance-heading h2\s*\{[^}]*font-weight: 800/,
    );
    expect(styles).toMatch(
      /\.governance-heading h2\s*\{[^}]*clamp\(1\.5rem, 2\.6vw, 2\.45rem\)/,
    );
    expect(styles).toMatch(/\.governance-heading\s*\{[^}]*clamp\(1\.5rem, 3vw, 2\.5rem\)/);
    expect(styles).toMatch(/\.governance-quote \.quote\s*\{[^}]*font-size: 0\.98rem/);
    expect(styles).toMatch(/\.governance-note\s*\{[^}]*font-size: 0\.82rem/);
  });

  it("declares accessible touch targets and small-text sizes", () => {
    expect(styles).toMatch(/\.voice-expand-toggle\s*\{[^}]*min-height: 2\.75rem/);
    expect(styles).toMatch(/\.maplibregl-ctrl-group button\s*\{[^}]*width: 44px !important/);
    expect(styles).toMatch(/\.map-legend-title\s*\{[^}]*font-size: 0\.75rem/);
    expect(styles).toMatch(/\.governance-stat-source\s*\{[^}]*font-size: 0\.75rem/);
    expect(styles).toContain("--text-secondary: #56645e");
    expect(styles).toContain("--text-tertiary: #586660");
  });

  it("keeps chips and toggles on the shared small radius instead of capsules", () => {
    expect(styles).toMatch(/\.tag,\s*\.source-chip\s*\{[^}]*border-radius: var\(--radius\)/);
    expect(styles).toMatch(/\.voice-expand-toggle\s*\{[^}]*border-radius: var\(--radius\)/);
    expect(styles).toMatch(/\.header-nav a\s*\{[^}]*border-radius: var\(--radius\)/);
    expect(styles).toMatch(/\.header-nav a\s*\{[^}]*font-weight: 700/);
  });

  it("keeps the mobile header on a single column with the nav row", () => {
    expect(styles).toMatch(/"kicker"\s*"title"\s*"summary"\s*"nav"\s*"side"/);
  });

  it("declares the header section-jump navigation and section anchors", () => {
    expect(page).toContain('class="header-nav" aria-label="页面分区跳转"');
    expect(page).toContain('href="#section-map"');
    expect(page).toContain('href="#section-evidence"');
    expect(page).toContain('href="#section-voices"');
    expect(page).toContain('href="#section-governance"');
    expect(page).toContain('id="section-map"');
    expect(page).toContain('id="section-evidence"');
    expect(page).toContain('id="section-voices"');
    expect(styles).toContain(".header-nav");
    expect(styles).toMatch(/\.header-nav a\s*\{[^}]*min-height: 2\.75rem/);
    expect(styles).toContain("scroll-behavior: smooth");
  });

  it("declares the evidence-classes metric with its five-form note", () => {
    expect(page).toContain(
      'title="公开资料 · 问卷封闭题 · 问卷开放题 · 团队实地记录 · 机构访谈"',
    );
  });

  it("declares the map route legend and its document-style list", () => {
    expect(page).toContain('aria-label="路线图例"');
    expect(page).toContain('id="map-legend-list"');
    expect(page).toContain("点位间为直线示意，非实际步行路径");
    expect(styles).toContain(".map-legend");
    expect(styles).toContain(".map-legend-swatch--dashed");
    expect(styles).toContain(".map-legend-entry");
  });
});
