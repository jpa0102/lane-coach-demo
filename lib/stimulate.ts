import { BallFlat, BowlerInput, Line, Pattern, PhysicsResult, SimResult } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function parseFactoryGrit(factoryFinish: string | null): number | null {
  if (!factoryFinish) return null;
  const m = factoryFinish.match(/(\d{3,4})/);
  if (!m) return null;
  return Number(m[1]);
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
    cover.includes("pearl") ? 0.76 :
    cover.includes("urethane") ? 0.83 :
    cover.includes("plastic") ? 0.45 : 0.8;

  const rgEarlyRoll = clamp((2.59 - rg) / (2.59 - 2.43), 0, 1);
  const flarePotential = clamp((diff - 0.015) / (0.06 - 0.015), 0, 1);
  const surfaceFriction = clamp((4000 - grit) / 3500, 0, 1);
  const coreStrength = core.includes("asym") ? 1 : core.includes("sym") ? 0.85 : 0.9;

  const usedFallbackSpecs =
    ball.rg == null || ball.differential == null || !ball.coverstock_type || !ball.core_type || !ball.factory_finish;

  return { coverTraction, rgEarlyRoll, flarePotential, surfaceFriction, coreStrength, usedFallbackSpecs };
}

function patternFactors(pattern: Pattern, oilPatternType: BowlerInput["oilPatternType"]) {
  const volumeFactor = pattern.volume === "high" ? 1.14 : pattern.volume === "low" ? 0.9 : 1;
  const ratioFactor = pattern.ratio === "high" ? 1.08 : pattern.ratio === "low" ? 0.92 : 1;
  const styleFactor = oilPatternType === "sport" ? 1.07 : oilPatternType === "house" ? 0.95 : 1;
  return { volumeFactor, ratioFactor, styleFactor };
}

function derivePocketBoard(handedness: "right" | "left") {
  return handedness === "right" ? 17 : 22;
}

function deriveBreakpointTarget(targetBoard: number, handedness: "right" | "left") {
  const delta = handedness === "right" ? -7 : 7;
  return clamp(targetBoard + delta, 1, 38);
}

function createPhysicsModel(ball: BallFlat, pattern: Pattern, bowler: BowlerInput): PhysicsResult {
  const bd = ballDynamics(ball);
  const pf = patternFactors(pattern, bowler.oilPatternType);

  const speed = clamp(bowler.ballSpeedMph, 10, 24);
  const revs = clamp(bowler.revRateRpm, 120, 650);

  const speedNorm = clamp((speed - 10) / 14, 0, 1);
  const revNorm = clamp((revs - 150) / 450, 0, 1);

  // 3-phase model:
  // - skid through heads/oil, influenced by speed + oil volume
  // - hook transition near pattern length + ~8ft
  // - roll through pocket
  const frictionStrength =
    bd.coverTraction * 0.42 + bd.surfaceFriction * 0.2 + bd.flarePotential * 0.2 + bd.rgEarlyRoll * 0.08 + bd.coreStrength * 0.1;

  const skidLength = clamp(
    pattern.lengthFt + 1.6 + speedNorm * 3.2 + pf.volumeFactor * 1.6 - revNorm * 2.4 - frictionStrength * 2.3,
    16,
    48
  );

  const hookStartFt = clamp(pattern.lengthFt + 8 + speedNorm * 1.5 - frictionStrength * 1.8 - revNorm * 1.2, 30, 50);

  const hookShape = clamp(0.65 + revNorm * 0.28 + frictionStrength * 0.3 - speedNorm * 0.2 + (pf.ratioFactor - 1) * 0.2, 0.45, 1.2);

  const pocketBoard = derivePocketBoard(bowler.handedness);
  const start = clamp(bowler.startingBoard, 1, 39);
  const target = clamp(bowler.targetBoard, 1, 39);

  const baseBreakpoint = deriveBreakpointTarget(target, bowler.handedness);
  const breakpointBoard = clamp(
    baseBreakpoint + (bowler.handedness === "right" ? -1 : 1) * (hookShape * 0.8 - pf.ratioFactor * 0.2),
    1,
    38
  );

  const breakpointDistance = clamp(hookStartFt + 1.6 + hookShape * 1.6 - frictionStrength * 0.8, hookStartFt - 1, 52);

  const path: Array<{ ft: number; board: number }> = [];

  for (let ft = 0; ft <= 60; ft += 1) {
    let board: number;

    if (ft <= skidLength) {
      const t = ft / Math.max(skidLength, 1);
      const towardTarget = Math.min(t, 15 / Math.max(skidLength, 15));
      board = lerp(start, target, towardTarget);
    } else if (ft <= breakpointDistance) {
      const t = (ft - skidLength) / Math.max(breakpointDistance - skidLength, 1);
      const eased = Math.pow(t, 1.35);
      board = lerp(target, breakpointBoard, eased);
    } else {
      const t = (ft - breakpointDistance) / Math.max(60 - breakpointDistance, 1);
      const eased = 1 - Math.pow(1 - t, 1.8);
      board = lerp(breakpointBoard, pocketBoard, eased);
    }

    path.push({ ft, board: clamp(board, 0, 39) });
  }

  const pocketDelta = path[path.length - 1].board - pocketBoard;
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

  const entryAngle = clamp(2.3 + hookShape * 2.6 + revNorm * 1.2 - speedNorm * 0.9, 1.2, 7.8);

  const reactionShape: PhysicsResult["reaction_shape"] =
    hookShape > 1.03 && bd.coverTraction < 0.83
      ? "skid-flip"
      : hookShape > 0.84
        ? "skid-snap"
        : bd.coverTraction < 0.55
          ? "straight"
          : "arc";

  const recommendation =
    pocketEntry === "flush"
      ? "Great match-up. Stay with this line and monitor transition as fronts go away."
      : pocketEntry === "high"
        ? "Reading too early. Increase speed slightly, move feet inward, or switch to a cleaner cover."
        : pocketEntry === "light"
          ? "Not finishing enough. Reduce speed a touch, move feet toward friction, or use more traction."
          : "Crossing over. Reduce hook shape by moving line deeper or choosing a smoother motion ball.";

  return {
    skid_length_ft: Number(skidLength.toFixed(1)),
    breakpoint_board: Number(breakpointBoard.toFixed(1)),
    breakpoint_distance_ft: Number(breakpointDistance.toFixed(1)),
    entry_angle_degrees: Number(entryAngle.toFixed(2)),
    ball_path: path.map((p) => ({ ft: p.ft, board: Number(p.board.toFixed(2)) })),
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
