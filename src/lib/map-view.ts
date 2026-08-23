/**
 * 初始视野（GCJ-02 口径——public/data 已为 GCJ-02，
 * 引擎 isCorrection:false，必须直接喂 GCJ-02 坐标）。
 */
export const INITIAL_MAP_VIEW: {
  center: [number, number];
  zoom: number;
} = {
  center: [114.342991, 30.560138],
  zoom: 11.2,
};
