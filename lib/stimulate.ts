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
    cover.includes("hybrid") ? 0.9 :
    cover.includes("pearl") ? 0.78 :
    cover.includes("urethane") ? 0.84 :
    cover.includes("plastic") ? 0.5 : 0.82;

  const coreTransition = core.includes("asym") ? 1.0 : core.includes("sym") ? 0.86 : 0.9;
  const rgEarlyRoll = clamp((2.58 - rg) / (2.58 - 2.43), 0, 1);
  const flarePotential = clamp((diff - 0.015) / (0.06 - 0.015), 0, 1);
  const surfaceFriction = clamp((4000 - grit) / 3500, 0, 1);

  const usedFallbackSpecs =
    ball.rg == null || ball.differential == null || !ball.coverstock_type || !ball.core_type || !ball.factory_finish;

  return {
    rg,
    diff,
    grit,
    coverTraction,
    coreTransition,
    rgEarlyRoll,
    flarePotential,
    surfaceFriction,
    usedFallbackSpecs
  };
}

function patternFactors(pattern: Pattern, oilPatternType: BowlerInput["oilPatternType"]) {
  const lengthNorm = clamp((pattern.lengthFt - 32) / (50 - 32), 0, 1);

  const volumeFactor =
    pattern.volume === "high" ? 1.14 : pattern.volume === "low" ? 0.9 : 1.0;

  const ratioFactor =
    pattern.ratio === "high" ? 1.08 : pattern.ratio === "low" ? 0.92 : 1.0;

  const shapeFactor =
    pattern.shape === "long" ? 1.1 : pattern.shape === "short" ? 0.92 : 1.0;

  const styleFactor = oilPatternType === "sport" ? 1.08 : oilPatternType === "house" ? 0.95 : 1.0;

  return { lengthNorm, volumeFactor, ratioFactor, shapeFactor, styleFactor };
}

function createPhysicsModel(ball: BallFlat, pattern: Pattern, bowler: BowlerInput): PhysicsResult {
  const bd = ballDynamics(ball);
  const pf = patternFactors(pattern, bowler.oilPatternType);

  const speed = clamp(bowler.ballSpeedMph, 12, 26);
  const revs = clamp(bowler.revRateRpm, 80, 600);
  const axisTilt = clamp(bowler.axisTiltDeg, 0, 25);
  const axisRotation = clamp(bowler.axisRotationDeg, 0, 90);

  const laneFrictionAdj = bowler.laneSurface === "wood" ? 1.05 : 0.98;

  // Phase 1: skid
  const speedPush = (speed - 16) * 0.65;
  const oilPush = (pf.volumeFactor * pf.shapeFactor * pf.styleFactor - 1) * 11;
  const surfacePull = bd.surfaceFriction * 7.5;
  const revPull = clamp((revs - 260) / 220, -0.8, 1.3) * 2.8;
  const rgPull = bd.rgEarlyRoll * 2.2;

  const skidLength = clamp(
    pattern.lengthFt - 4 + speedPush + oilPush - surfacePull - revPull - rgPull - (laneFrictionAdj - 1) * 4,
    12,
    52
  );

  // Phase 2/3: hook + roll
  const transitionStrength =
    bd.coverTraction * 0.3 + bd.flarePotential * 0.23 + bd.coreTransition * 0.14 + bd.surfaceFriction * 0.18 +
    clamp((revs - 250) / 220, -0.4, 1.2) * 0.1 +
    clamp((20 - axisTilt) / 20, 0, 1) * 0.05;

  const backendAngularity =
    clamp((axisRotation - 35) / 45, 0, 1) * 0.44 +
    (1 - bd.coverTraction) * 0.26 +
    bd.coreTransition * 0.2 +
    bd.flarePotential * 0.1;

  const intended = clamp(bowler.breakpointBoardIntent, 0, 39);
  const start = clamp(bowler.startingBoard, 0, 39);
  const target = clamp(bowler.targetBoard, 0, 39);

  const handPocket = bowler.handedness === "right" ? 17 : 22;
  const direction = bowler.handedness === "right" ? -1 : 1;

  const dynamicBreakpoint = clamp(
    intended + direction * (backendAngularity * 3.8 - transitionStrength * 2.2 + (pf.ratioFactor - 1) * 4),
    1,
    38
  );

  const entryAngle = clamp(
    2.2 + transitionStrength * 2.8 + backendAngularity * 2.4 + bd.flarePotential * 1.2 - (speed - 17) * 0.18,
    1,
    8
  );

  const path: Array<{ ft: number; board: number }> = [];
  const hookStartFt = clamp((skidLength + bowler.breakpointDistanceFt) / 2, 14, 55);

  for (let ft = 0; ft <= 60; ft += 1) {
    let board = target;
    if (ft <= 15) {
      board = lerp(start, target, ft / 15);
    } else if (ft <= hookStartFt) {
      const t = (ft - 15) / Math.max(hookStartFt - 15, 1);
      board = lerp(target, dynamicBreakpoint, t);
    } else {
      const t = (ft - hookStartFt) / Math.max(60 - hookStartFt, 1);
      const eased = Math.pow(t, 1.45 + backendAngularity * 0.5);
      board = lerp(dynamicBreakpoint, handPocket, eased);
    }

    path.push({ ft, board: clamp(board, 0, 39) });
  }

  const pocketDelta = path[path.length - 1].board - handPocket;
  const pocketEntry: PhysicsResult["pocket_entry"] =
    Math.abs(pocketDelta) <= 0.8 ? "flush" :
    bowler.handedness === "right"
      ? pocketDelta < -0.8
        ? "high"
        : pocketDelta > 2.2
          ? "brooklyn"
          : "light"
      : pocketDelta > 0.8
        ? "high"
        : pocketDelta < -2.2
          ? "brooklyn"
          : "light";

  const reactionShape: PhysicsResult["reaction_shape"] =
    bd.coverTraction < 0.6 ? "straight" :
    backendAngularity > 0.62 && bd.coverTraction < 0.86 ? "skid-flip" :
    backendAngularity > 0.46 ? "skid-snap" : "arc";

  const recommendation =
    pocketEntry === "flush"
      ? "Match-up is strong. Keep speed and target consistent and monitor transition in the midlane."
      : pocketEntry === "high"
        ? "Ball is reading too early/high. Increase speed slightly, move feet in, or use higher grit/cleaner cover."
        : pocketEntry === "light"
          ? "Ball is too weak at the pocket. Slow speed slightly, move right/left with your hand, or use lower grit/stronger cover."
          : "Entry is crossing high. Soften backend angle, reduce axis rotation, or choose a smoother symmetric/solid option.";

  return {
    skid_length_ft: Number(skidLength.toFixed(1)),
    breakpoint_board: Number(dynamicBreakpoint.toFixed(1)),
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
    axisTiltDeg: 14,
    axisRotationDeg: 50,
    startingBoard: clamp(line.feetBoard, 0, 39),
    targetBoard: clamp(line.targetBoard, 0, 39),
    breakpointBoardIntent: 8,
    breakpointDistanceFt: 42,
    oilPatternType: pattern.ratio === "high" ? "house" : "sport",
    laneSurface: "synthetic"
  };

  const physics = createPhysicsModel(ball, pattern, bowler);
  const usedFallbackSpecs = ballDynamics(ball).usedFallbackSpecs;

  const readPhase =
    physics.skid_length_ft <= 34 ? "early" : physics.skid_length_ft <= 41 ? "mid" : "late";

  const shape =
    physics.reaction_shape === "arc" || physics.reaction_shape === "straight" ? "smooth" : "sharp";

  return {
    path: physics.ball_path.map((p) => ({ x: p.board, y: p.ft })),
    breakpoint: {
      board: Math.round(physics.breakpoint_board),
      distanceFt: Math.round(clamp(physics.skid_length_ft + 3, 20, 55))
    },
    notes: { readPhase, shape, usedFallbackSpecs },
    physics
  };
}

export function simulatePhysicsJSON(ball: BallFlat, pattern: Pattern, bowler: BowlerInput): PhysicsResult {
  return createPhysicsModel(ball, pattern, bowler);
}
