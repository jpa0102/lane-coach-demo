import { BallFlat, Line, Pattern, SimResult } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function strengthFromBall(ball: BallFlat) {
  const usedFallbackSpecs = !(ball.coverstock_type && ball.core_type && ball.differential != null);

  const cover = (ball.coverstock_type ?? "").toLowerCase();
  const core = (ball.core_type ?? "").toLowerCase();

  const traction =
    cover.includes("solid") ? 1.0 :
    cover.includes("hybrid") ? 0.85 :
    cover.includes("pearl") ? 0.70 :
    cover.includes("urethane") ? 0.80 : 0.78; // fallback

  const motion =
    core.includes("asym") ? 1.0 :
    core.includes("sym") ? 0.88 : 0.90; // fallback

  const diff = ball.differential ?? 0.045; // fallback typical-ish
  const diffNorm = clamp((diff - 0.03) / (0.06 - 0.03), 0, 1);

  return {
    traction,
    motion,
    total: traction * 0.55 + motion * 0.25 + diffNorm * 0.20,
    usedFallbackSpecs
  };
}

function patternFriction(pattern: Pattern) {
  const lengthFactor =
    pattern.shape === "short" ? 0.9 : pattern.shape === "medium" ? 1.0 : 1.15;

  const volumeFactor =
    pattern.volume === "low" ? 0.9 : pattern.volume === "medium" ? 1.0 : 1.1;

  const ratioFactor =
    pattern.ratio === "high" ? 1.05 : pattern.ratio === "medium" ? 1.0 : 0.95;

  return { lengthFactor, volumeFactor, ratioFactor };
}

export function simulatePath(
  ball: BallFlat,
  pattern: Pattern,
  line: Line,
  opts?: { speedClass?: "slow" | "med" | "fast"; revClass?: "low" | "med" | "high" }
): SimResult {
  const { traction, motion, total, usedFallbackSpecs } = strengthFromBall(ball);
  const fr = patternFriction(pattern);

  const speedClass = opts?.speedClass ?? "med";
  const revClass = opts?.revClass ?? "med";

  const speedFactor = speedClass === "fast" ? 1.08 : speedClass === "slow" ? 0.92 : 1.0;
  const revFactor = revClass === "high" ? 1.10 : revClass === "low" ? 0.92 : 1.0;

  const baseBP = pattern.lengthFt + 8;
  const earlierReads = traction * 0.9 + total * 0.4 + revFactor * 0.3;
  const laterPush = fr.volumeFactor * speedFactor * 1.1;

  const bpDistance = clamp(baseBP - (earlierReads * 4) + (laterPush * 2.5), 30, 50);

  const backend = clamp((1.2 - traction) * 0.8 + motion * 0.35 + fr.ratioFactor * 0.25, 0.2, 1.4);

  const startX = clamp(line.feetBoard, 0, 39);
  const targetX = clamp(line.targetBoard, 0, 39);

  const pocketX = 17; // right-handed demo default
  const bpBoard = clamp(targetX - backend * 6, 0, 39);

  const points: { x: number; y: number }[] = [];
  const totalLen = 60;

  for (let y = 0; y <= totalLen; y += 1) {
    let x: number;

    if (y <= 15) {
      const t = y / 15;
      x = startX + (targetX - startX) * t;
    } else if (y <= bpDistance) {
      const t = (y - 15) / (bpDistance - 15);
      x = targetX + (bpBoard - targetX) * t;
    } else {
      const t = (y - bpDistance) / (totalLen - bpDistance);
      const ease = t * t;
      x = bpBoard + (pocketX - bpBoard) * ease * (0.65 + 0.35 * motion);
    }

    points.push({ x: clamp(x, 0, 39), y });
  }

  const readPhase = bpDistance <= 40 ? "early" : bpDistance <= 44 ? "mid" : "late";
  const shape = backend >= 0.95 ? "sharp" : "smooth";

  return {
    path: points,
    breakpoint: { board: Math.round(bpBoard), distanceFt: Math.round(bpDistance) },
    notes: { readPhase, shape, usedFallbackSpecs }
  };
}
