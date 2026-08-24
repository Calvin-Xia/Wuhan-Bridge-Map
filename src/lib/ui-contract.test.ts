import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DARK_MAP_THEME,
  LIGHT_MAP_THEME,
  RESEARCH_STATUS_FILLS,
  researchStatusFill,
} from "./map-layer-spec";

const page = readFileSync(new URL("../pages/index.astro", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/global.css", import.meta.url), "utf8");

describe("overlay appearance contract", () => {
  it("keeps light/dark palette contrast for halos and strokes", () => {
    expect(LIGHT_MAP_THEME.pointStroke).toBe("#0f1a17");
    expect(DARK_MAP_THEME.pointStroke).toBe("#edf4ef");
    expect(LIGHT_MAP_THEME.chainHalo).not.toBe(DARK_MAP_THEME.chainHalo);
  });

  it("maps the three research statuses plus a fallback color", () => {
    expect(researchStatusFill("已实地调研")).toBe(RESEARCH_STATUS_FILLS["已实地调研"]);
    expect(researchStatusFill("待实地核验")).toBe(RESEARCH_STATUS_FILLS["待实地核验"]);
    expect(researchStatusFill("其他")).toBe(RESEARCH_STATUS_FILLS.fallback);
  });

  it("keeps the AMap tile key out of source (build-time injection only)", () => {
    expect(page).not.toContain("02795a");
    expect(styles).not.toContain("02795a");
  });

  it("defines the dark-mode glow dot and brightened label contract", () => {
    expect(styles).toMatch(
      /:root\[data-theme="dark"\] \.bridge-map-dot\s*\{[^}]*--point-fill-dark[^}]*color-mix/,
    );
    expect(styles).toMatch(
      /:root\[data-theme="dark"\] \.bridge-map-label\s*\{[^}]*color: #fff/,
    );
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

  it("declares the desktop-only full story panel and touch-target toggle", () => {
    expect(styles).toMatch(/\.story-panel-toggle\s*\{[^}]*display: none/);
  });

  it("declares the mobile story panel dual-state bounds", () => {
    expect(styles).toContain(".story-panel-toggle");
    expect(styles).toContain("max-height: 28rem");
    expect(styles).toContain("max-height: min(60dvh, 36rem)");
    expect(styles).toMatch(/\.story-panel \.story-collapsible\s*\{[^}]*display: none/);
    expect(styles).toMatch(/\.story-panel-toggle\s*\{[^}]*min-height: 2\.75rem/);
  });

  it("keeps the story toggle interaction polish in line with the app language", () => {
    expect(styles).toMatch(/\.story-panel-toggle:active\s*\{[^}]*translateY\(1px\) scale\(0\.99\)/);
    expect(styles).toContain(".story-panel-chevron");
    expect(styles).toMatch(/\.story-panel-chevron\s*\{[^}]*border-inline-end: 1\.6px/);
    expect(styles).toMatch(/\.story-panel\.is-expanded \.story-panel-chevron\s*\{[^}]*rotate\(225deg\)/);
    expect(styles).toContain("story-fade-in");
    expect(styles).toMatch(/@keyframes story-fade-in\s*\{[^}]*opacity: 0/);
    expect(styles).toMatch(/\.story-panel\s*\{[^}]*overscroll-behavior-y: contain/);
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
