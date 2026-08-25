import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DATA_BOUNDS,
  DATA_CENTER,
  STUDY_AREA_BOUNDS,
  clampCenterToViewport,
  computeFocusZoom,
  computeOverviewZoom,
  computeZoomFloor,
  isBridgeInViewport,
} from "./map-view";

const bridges = JSON.parse(
  readFileSync(new URL("../../public/data/bridges.geojson", import.meta.url), "utf8"),
) as {
  features: Array<{ geometry: { coordinates: [number, number] } }>;
};

const dataExtent = (() => {
  let lngMin = Infinity;
  let lngMax = -Infinity;
  let latMin = Infinity;
  let latMax = -Infinity;
  for (const feature of bridges.features) {
    const [lng, lat] = feature.geometry.coordinates;
    lngMin = Math.min(lngMin, lng);
    lngMax = Math.max(lngMax, lng);
    latMin = Math.min(latMin, lat);
    latMax = Math.max(latMax, lat);
  }
  return { southWest: [lngMin, latMin] as [number, number], northEast: [lngMax, latMax] as [number, number] };
})();

describe("STUDY_AREA_BOUNDS", () => {
  it("keeps the study rectangle widened to 0.46° lng (overview/parity contract)", () => {
    expect(STUDY_AREA_BOUNDS).toEqual({
      southWest: [114.105, 30.4],
      northEast: [114.565, 30.725],
    });
  });

  it("contains every bridge coordinate with margin", () => {
    expect(STUDY_AREA_BOUNDS.southWest[0]).toBeLessThan(dataExtent.southWest[0]);
    expect(STUDY_AREA_BOUNDS.northEast[0]).toBeGreaterThan(dataExtent.northEast[0]);
    expect(STUDY_AREA_BOUNDS.southWest[1]).toBeLessThan(dataExtent.southWest[1]);
    expect(STUDY_AREA_BOUNDS.northEast[1]).toBeGreaterThan(dataExtent.northEast[1]);
  });
});

describe("DATA_BOUNDS", () => {
  it("matches the measured POI extent of bridges.geojson", () => {
    expect(DATA_BOUNDS.southWest[0]).toBeCloseTo(dataExtent.southWest[0], 6);
    expect(DATA_BOUNDS.southWest[1]).toBeCloseTo(dataExtent.southWest[1], 6);
    expect(DATA_BOUNDS.northEast[0]).toBeCloseTo(dataExtent.northEast[0], 6);
    expect(DATA_BOUNDS.northEast[1]).toBeCloseTo(dataExtent.northEast[1], 6);
  });

  it("centers the overview on the data centroid", () => {
    expect(DATA_CENTER).toEqual([
      (DATA_BOUNDS.southWest[0] + DATA_BOUNDS.northEast[0]) / 2,
      (DATA_BOUNDS.southWest[1] + DATA_BOUNDS.northEast[1]) / 2,
    ]);
  });
});

describe("computeZoomFloor", () => {
  it("703x542 map column floors at ~11.12", () => {
    expect(computeZoomFloor(703, 542)).toBeCloseTo(11.12, 3);
  });

  it("889x578 floors at ~11.458", () => {
    expect(computeZoomFloor(889, 578)).toBeCloseTo(11.458, 3);
  });

  it("1075x624 floors at ~11.732", () => {
    expect(computeZoomFloor(1075, 624)).toBeCloseTo(11.732, 3);
  });

  it("is monotonic: bigger viewports require a higher floor", () => {
    expect(computeZoomFloor(1075, 624)).toBeGreaterThan(computeZoomFloor(889, 578));
    expect(computeZoomFloor(889, 578)).toBeGreaterThan(computeZoomFloor(703, 542));
  });

  it("respects the margin so the viewport is strictly smaller than the box", () => {
    const floor = computeZoomFloor(703, 542);
    const viewportLng = (703 * 360) / (256 * 2 ** floor);
    const boxLng = STUDY_AREA_BOUNDS.northEast[0] - STUDY_AREA_BOUNDS.southWest[0];
    expect(viewportLng).toBeLessThan(boxLng);
  });
});

describe("computeOverviewZoom", () => {
  it("703x542 overview ~11.648 (data-fills, above floor)", () => {
    expect(computeOverviewZoom(703, 542)).toBeCloseTo(11.648, 3);
  });

  it("889x578 overview ~11.741", () => {
    expect(computeOverviewZoom(889, 578)).toBeCloseTo(11.741, 3);
  });

  it("1075x624 overview ~11.851", () => {
    expect(computeOverviewZoom(1075, 624)).toBeCloseTo(11.851, 3);
  });

  it("keeps parity (overview >= floor) for common aspect ratios and fits all bridges", () => {
    for (const [w, h] of [[703, 542], [889, 578], [1075, 624]] as const) {
      const zoom = computeOverviewZoom(w, h);
      expect(zoom).toBeGreaterThanOrEqual(computeZoomFloor(w, h) - 1e-9);
      // 数据盒（含 20px 级边距）⊆ 视口
      const pxPerDeg = (256 * 2 ** zoom) / 360;
      const halfLng = w / pxPerDeg / 2;
      const halfLat = (h * Math.cos(((30.4 + 30.725) / 2) * (Math.PI / 180))) / pxPerDeg / 2;
      expect(DATA_CENTER[0] - halfLng).toBeLessThan(DATA_BOUNDS.southWest[0]);
      expect(DATA_CENTER[0] + halfLng).toBeGreaterThan(DATA_BOUNDS.northEast[0]);
      expect(DATA_CENTER[1] - halfLat).toBeLessThan(DATA_BOUNDS.southWest[1] - 0.003); // ≥ ~10px 边距
      expect(DATA_CENTER[1] + halfLat).toBeGreaterThan(DATA_BOUNDS.northEast[1] + 0.003);
    }
  });
});

describe("computeFocusZoom", () => {
  const central = [114.292874, 30.547225] as [number, number]; // 武汉长江大桥
  const southwest = [114.241491, 30.487668] as [number, number]; // 白沙洲长江大桥
  const northeast = [114.390765, 30.678816] as [number, number]; // 天兴洲长江大桥

  it("central bridges use the base zoom 12.3", () => {
    expect(computeFocusZoom(central, 889, 578)).toBe(12.3);
    expect(computeFocusZoom(southwest, 889, 578)).toBe(12.3);
  });

  it("raises the zoom so a north-edge bridge can legally center", () => {
    expect(computeFocusZoom(northeast, 889, 578)).toBeCloseTo(12.9375, 3);
  });

  it("raises on ultra-wide containers for west-edge bridges", () => {
    expect(computeFocusZoom(southwest, 1150, 600)).toBeCloseTo(12.582, 3);
    expect(computeFocusZoom(southwest, 1150, 600)).toBeGreaterThan(12.3);
  });

  it("guarantees the focused bridge centers with the viewport inside the box", () => {
    const cases: Array<[ [number, number], number, number ]> = [
      [northeast, 12.938, 889],
      [southwest, 12.582, 1150],
    ];
    for (const [bridge, zoom, w] of cases) {
      const h = 578;
      const pxPerDeg = (256 * 2 ** zoom) / 360;
      const halfLng = w / pxPerDeg / 2;
      const halfLat = (h * Math.cos(((30.4 + 30.725) / 2) * (Math.PI / 180))) / pxPerDeg / 2;
      expect(bridge[0] - halfLng).toBeGreaterThanOrEqual(114.105 - 1e-4);
      expect(bridge[0] + halfLng).toBeLessThanOrEqual(114.565 + 1e-4);
      expect(bridge[1] - halfLat).toBeGreaterThanOrEqual(30.4 - 1e-4);
      expect(bridge[1] + halfLat).toBeLessThanOrEqual(30.725 + 1e-4);
    }
  });
});

describe("isBridgeInViewport (距离感知混合动画判定)", () => {
  const yangSiGang = [114.2574, 30.510951] as [number, number];
  const qingChuan = [114.284358, 30.563238] as [number, number];
  const tianXing = [114.390765, 30.678816] as [number, number];

  it("相邻南桥在彼此的 12.3 特写视口内（单段滑行）", () => {
    expect(isBridgeInViewport(qingChuan, yangSiGang, 12.3, 703, 542)).toBe(true);
    expect(isBridgeInViewport(yangSiGang, qingChuan, 12.3, 703, 542)).toBe(true);
  });

  it("跨江南北的远距桥不在当前特写视口内（触发缩小推入）", () => {
    expect(isBridgeInViewport(tianXing, yangSiGang, 12.3, 703, 542)).toBe(false);
    expect(isBridgeInViewport(tianXing, qingChuan, 12.3, 703, 542)).toBe(false);
  });

  it("初始数据全貌下 8 座桥全部可见（初始点任何桥均单段直达）", () => {
    const z = computeOverviewZoom(703, 542);
    for (const feature of bridges.features) {
      expect(isBridgeInViewport(feature.geometry.coordinates, DATA_CENTER, z, 703, 542)).toBe(true);
    }
  });
});

describe("clampCenterToViewport", () => {
  const center = (lng: number, lat: number): [number, number] => [lng, lat];

  it("keeps an in-box center unchanged", () => {
    expect(clampCenterToViewport(center(114.34, 30.56), 12.3, 703, 542)).toEqual([
      114.34, 30.56,
    ]);
  });

  it("clamps a western deep-link center back into the widened box", () => {
    const [lng, lat] = clampCenterToViewport(center(114.2415, 30.49), 12.3, 1150, 600);
    expect(lng).toBeCloseTo(114.2653, 3);
    expect(lat).toBe(30.49);
  });

  it("falls back to the box center when the viewport is larger than the box", () => {
    const [lng, lat] = clampCenterToViewport(center(113.6, 30.1), 9.3, 703, 542);
    expect(lng).toBeCloseTo(114.335, 4);
    expect(lat).toBeCloseTo(30.5625, 4);
  });

  it("clamps on the latitude axis independently", () => {
    const [, lat] = clampCenterToViewport(center(114.34, 30.42), 12.3, 703, 542);
    expect(lat).toBeCloseTo(30.4651, 3);
  });
});
