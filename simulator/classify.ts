import { ShotClassification } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeEntryAngle(path: Array<{ ft: number; board: number }>) {
  if (path.length < 4) return 0;
  const p0 = path[path.length - 4];
  const p1 = path[path.length - 1];
  const dy = Math.max(0.01, p1.ft - p0.ft);
  const dx = p1.board - p0.board;
  return clamp(Math.abs(Math.atan2(dx, dy) * (180 / Math.PI)), 0, 10);
}

export function classifyShot(
  finalBoard: number,
  pocketBoard: number,
  entryAngle: number,
  handedness: "right" | "left",
  breakpointBoard: number,
  breakpointDistanceFt: number
): ShotClassification {
  const delta = finalBoard - pocketBoard;

  if (breakpointDistanceFt > 51) return "skid too long";
  if (entryAngle < 1.4 && Math.abs(delta) > 2.5) return "no recovery";

  if (Math.abs(delta) <= 0.7) return "flush";

  if (handedness === "right") {
    if (delta < -1.8) return "through the nose";
    if (delta < -0.7) return "high pocket";
    if (delta > 5.5) return "miss right";
    if (breakpointBoard > 18 && delta > 2.2) return "Brooklyn";
    if (delta > 2.2) return "miss right";
    return "light pocket";
  }

  if (delta > 1.8) return "through the nose";
  if (delta > 0.7) return "high pocket";
  if (delta < -5.5) return "miss left";
  if (breakpointBoard < 21 && delta < -2.2) return "Brooklyn";
  if (delta < -2.2) return "miss left";
  return "light pocket";
}
