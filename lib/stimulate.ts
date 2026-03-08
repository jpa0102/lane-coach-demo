import { BallFlat, BowlerInput, Line, Pattern, PhysicsResult, SimResult } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseFactoryGrit(factoryFinish: string | null): number | null {
  if (!factoryFinish) return null;
  const m = factoryFinish.match(/(\d{3,4})/);
  return m ? Number(m[1]) : null;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / Math.max(edge1 - edge0, 0.001), 0, 1);
  return t * t * (3 - 2 * t);
}

function ballDynamics(ball: BallFlat) {
  const cover = (ball.coverstock_type ?? "").toLowerCase();
  const core = (ball.core_type ?? "").toLowerCase();

  const rg = ball.rg ?? 2.53;
  const diff = ball.differential ?? 0.045;
  const grit = parseFactoryGrit(ball.factory_finish) ?? 2000;

  const coverTraction =
    cover.includes("solid") ? 1.0 :
    cover.includes("hybrid") ? 0.88 :
    cover.includes("pearl") ? 0.74 :
    cover.includes("urethane") ? 0.82 :
    cover.includes("plastic") ? 0.42 : 0.8;

  const coreStrength = core.includes("asym") ? 1 : core.includes("sym") ? 0.86 : 0.9;
  const rgEarlyRoll = clamp((2.59 - rg) / (2.59 - 2.43), 0, 1);
  const flarePotential = clamp((diff - 0.015) / (0.06 - 0.015), 0, 1);
  const surfaceFriction = clamp((4000 - grit) / 3500, 0, 1);

  const usedFallbackSpecs =
    ball.rg == null || ball.differential == null || !ball.coverstock_type || !ball.core_type || !ball.factory_finish;

  return { coverTraction, coreStrength, rgEarlyRoll, flarePotential, surfaceFriction, usedFallbackSpecs };
}

function patternFactors(pattern: Pattern, oilPatternType: BowlerInput["oilPatternType"]) {
  const volumeFactor = pattern.volume === "high" ? 1.15 : pattern.volume === "low" ? 0.9 : 1;
  const ratioFactor = pattern.ratio === "high" ? 1.08 : pattern.ratio === "low" ? 0.92 : 1;
  const styleFactor = oilPatternType === "sport" ? 1.08 : oilPatternType === "house" ? 0.95 : 1;
  return { volumeFactor, ratioFactor, styleFactor };
}

function pocketBoardForHand(handedness: "right" | "left") {
  return handedness === "right" ? 17 : 22;
}

function createPhysicsModel(ball: BallFlat, pattern: Pattern, bowler: BowlerInput): PhysicsResult {
  const bd = ballDynamics(ball);
  const pf = patternFactors(pattern, bowler.oilPatternType);

  const speedNorm = clamp((bowler.ballSpeedMph - 10) / 14, 0, 1);
  const revNorm = clamp((bowler.revRateRpm - 150) / 450, 0, 1);

  const tractionStrength =
    bd.coverTraction * 0.34 + bd.surfaceFriction * 0.2 + bd.flarePotential * 0.2 + bd.rgEarlyRoll * 0.12 + bd.coreStrength * 0.14;

  const skidEndFt = clamp(
    pattern.lengthFt + 1.2 + speedNorm * 3.2 + pf.volumeFactor * 1.8 - revNorm * 2.6 - tractionStrength * 2.3,
    16,
    47
  );

  const hookPeakFt = clamp(
    pattern.lengthFt + 8 + speedNorm * 1.2 - revNorm * 1.3 - tractionStrength * 1.2,
    33,
    50
  );

  const rollStartFt = clamp(
    hookPeakFt + 4.8 - (revNorm * 1.1 + tractionStrength * 0.8),
    hookPeakFt + 2,
    56
  );

  const hookAmplitude = clamp(
    6.0 + revNorm * 2.1 + tractionStrength * 2.2 - speedNorm * 1.6 + (pf.ratioFactor - 1) * 2,
    3.5,
    10.5
  );

  const startBoard = clamp(bowler.startingBoard, 1, 39);
  const targetBoard = clamp(bowler.targetBoard, 1, 39);
  const pocketBoard = pocketBoardForHand(bowler.handedness);
  const handDir = bowler.handedness === "right" ? -1 : 1;


  const points: Array<{ ft: number; board: number }> = [];

  for (let ft = 0; ft <= 60; ft += 1) {
    const launchBlend = smoothstep(0, 15, ft);
    const baseLine = startBoard + (targetBoard - startBoard) * launchBlend;

    const hookRamp = smoothstep(skidEndFt, hookPeakFt, ft);
    const rollDamp = 1 - smoothstep(rollStartFt, 60, ft);

    const lateralOffset = handDir * hookAmplitude * hookRamp * rollDamp;

    const rollForward = smoothstep(rollStartFt, 60, ft);
    const pocketBlend = rollForward * (0.6 + bd.coreStrength * 0.25);

    const board = baseLine + lateralOffset + (pocketBoard - (targetBoard + lateralOffset)) * pocketBlend;
    points.push({ ft, board: clamp(board, 0, 39) });
  }

  let breakpoint = points[0];
  let maxDelta = -1;
  for (let i = 1; i < points.length; i += 1) {
    const delta = Math.abs(points[i].board - points[i - 1].board);
    if (delta > maxDelta) {
      maxDelta = delta;
      breakpoint = points[i];
    }
  }

  const finalBoard = points[points.length - 1].board;
  const pocketDelta = finalBoard - pocketBoard;
  const pocketEntry: PhysicsResult["pocket_entry"] =
    Math.abs(pocketDelta) <= 0.75
      ? "flush"
      : bowler.handedness === "right"
        ? pocketDelta < -0.75
          ? "high"
          : pocketDelta > 2.25
            ? "brooklyn"
            : "light"
        : pocketDelta > 0.75
          ? "high"
          : pocketDelta < -2.25
            ? "brooklyn"
            : "light";

  const entryAngle = clamp(2.1 + hookAmplitude * 0.38 + revNorm * 1.1 - speedNorm * 0.8, 1.2, 7.8);

  const reactionShape: PhysicsResult["reaction_shape"] =
    hookAmplitude > 8.2 && bd.coverTraction < 0.82
      ? "skid-flip"
      : hookAmplitude > 6.8
        ? "skid-snap"
        : bd.coverTraction < 0.52
          ? "straight"
          : "arc";

  const recommendation =
    pocketEntry === "flush"
      ? "Great match-up. Stay with this line and watch transition as fronts go away."
      : pocketEntry === "high"
        ? "Ball is reading too early. Add speed or move your laydown deeper to delay hook."
        : pocketEntry === "light"
          ? "Ball is not finishing enough. Reduce speed slightly or move toward friction for stronger entry."
          : "Crossing over too much. Blend the pattern with a softer line or smoother ball motion.";

  return {
    skid_length_ft: Number(skidEndFt.toFixed(1)),
    skid_end_ft: Number(skidEndFt.toFixed(1)),
    breakpoint_board: Number(breakpoint.board.toFixed(1)),
    breakpoint_distance_ft: Number(breakpoint.ft.toFixed(1)),
    roll_start_ft: Number(rollStartFt.toFixed(1)),
    entry_angle_degrees: Number(entryAngle.toFixed(2)),
    ball_path: points.map((p) => ({ ft: p.ft, board: Number(p.board.toFixed(2)) })),
    reaction_shape: reactionShape,
    pocket_entry: pocketEntry,
    recommendation
  };
}

function mapSpeedClass(speedClass: "slow" | "med" | "fast" | undefined) {
  return speedClass === "fast" ? 20 : speedClass === "slow" ? 15.5 : 17.5;
}

function mapRevClass(revClass: "low" | "med" | "high" | undefined) {
  return revClass === "high" ? 420 : revClass === "low" ? 220 : 320;
}

export function simulatePath(
  ball: BallFlat,
  pattern: Pattern,
  line: Line,
  opts?: { speedClass?: "slow" | "med" | "fast"; revClass?: "low" | "med" | "high" }
): SimResult {
  const bowler: BowlerInput = {
    handedness: "right",
    papXInches: 4.5,
    papYInches: 0.5,
    ballSpeedMph: mapSpeedClass(opts?.speedClass),
    revRateRpm: mapRevClass(opts?.revClass),
    startingBoard: clamp(line.feetBoard, 0, 39),
    targetBoard: clamp(line.targetBoard, 0, 39),
    oilPatternType: pattern.ratio === "high" ? "house" : "sport",
    laneSurface: "synthetic"
  };

  const physics = createPhysicsModel(ball, pattern, bowler);
  const usedFallbackSpecs = ballDynamics(ball).usedFallbackSpecs;

  const readPhase =
    physics.breakpoint_distance_ft <= 39 ? "early" : physics.breakpoint_distance_ft <= 45 ? "mid" : "late";

  const shape = physics.reaction_shape === "arc" || physics.reaction_shape === "straight" ? "smooth" : "sharp";

  return {
    path: physics.ball_path.map((p) => ({ x: p.board, y: p.ft })),
    breakpoint: {
      board: Math.round(physics.breakpoint_board),
      distanceFt: Math.round(physics.breakpoint_distance_ft)
    },
    notes: { readPhase, shape, usedFallbackSpecs },
    physics
  };
}

export function simulatePhysicsJSON(ball: BallFlat, pattern: Pattern, bowler: BowlerInput): PhysicsResult {
  return createPhysicsModel(ball, pattern, bowler);
}
