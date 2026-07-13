import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../pages/index.astro", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/global.css", import.meta.url), "utf8");

describe("map status region", () => {
  it("announces asynchronous map loading and error messages", () => {
    expect(page).toContain('id="map-status" class="map-status" role="status"');
  });
});

describe("archive theme interface", () => {
  it("provides a visible, stateful theme toggle in the page header", () => {
    expect(page).toContain('id="theme-toggle"');
    expect(page).toContain('aria-pressed="false"');
    expect(page).toContain('data-theme-toggle-label');
    expect(page).toContain('aria-label="切换到暗夜主题"');
  });

  it("defines the survey number typography and explicit theme tokens", () => {
    expect(page).toContain('data-theme="light"');
    expect(styles).toContain('--font-number: "Roboto Mono"');
    expect(styles).toContain('font-variant-numeric: tabular-nums');
    expect(styles).toContain(':root[data-theme="dark"]');
  });
});
