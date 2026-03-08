import { Pattern } from "../lib/types";
import { BallProfile, PhaseTransitions } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function derivePhaseTransitions(
  ball: BallProfile,
  pattern: Pattern,
  speedMph: number,
  revRateRpm: number,
  laneSurface: "synthetic" | "wood"
): PhaseTransitions {
  const speedNorm = clamp((speedMph - 10) / 14, 0, 1);
  const revNorm = clamp((revRateRpm - 150) / 450, 0, 1);
  const volume = pattern.volume === "high" ? 1.14 : pattern.volume === "low" ? 0.9 : 1;
  const lane = laneSurface === "wood" ? 1.08 : 0.98;

  const skidEndFt = clamp(
    pattern.lengthFt + 1.5 + speedNorm * 3.2 + volume * 1.5 - ball.traction * 4.2 - revNorm * 2.1,
    14,
    48
  );

  const hookStartFt = clamp(pattern.lengthFt + 8 + speedNorm * 1.2 - revNorm * 1.3 - ball.traction * 1.3 + (lane - 1) * 1.6, 30, 52);

  const rollStartFt = clamp(
    hookStartFt + 4.5 - (ball.flarePotential * 1.2 + revNorm * 0.9) + speedNorm * 0.6,
    hookStartFt + 1,
    58
  );

  return { skidEndFt, hookStartFt, rollStartFt };
}

export function computeFrictionAtFt(ft: number, pattern: Pattern, laneSurface: "synthetic" | "wood") {
  const base = laneSurface === "wood" ? 1.05 : 0.95;
  const oilVol = pattern.volume === "high" ? 1.14 : pattern.volume === "low" ? 0.88 : 1;

  if (ft <= pattern.lengthFt) return base * 0.25 / oilVol;
  const d = ft - pattern.lengthFt;
  return base * (0.25 / oilVol + Math.min(d / 18, 1) * 0.95);
}
