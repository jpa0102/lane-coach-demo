import { BallFlat, BowlerInput, Line, Pattern, PhysicsResult, SimResult } from "./types";
import { buildBallProfile } from "../simulator/balls";
import { classifyShot, computeEntryAngle } from "../simulator/classify";
import { derivePhaseTransitions } from "../simulator/physics";
import { simulateContinuousPath } from "../simulator/path";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mapSpeedClass(speedClass: "slow" | "med" | "fast" | undefined) {
  return speedClass === "fast" ? 20 : speedClass === "slow" ? 15.5 : 17.5;
}

function mapRevClass(revClass: "low" | "med" | "high" | undefined) {
  return revClass === "high" ? 420 : revClass === "low" ? 220 : 320;
}

function fallbackUsed(ball: BallFlat) {
  return ball.rg == null || ball.differential == null || !ball.coverstock_type || !ball.core_type || !ball.factory_finish;
}

export function simulatePhysicsJSON(ball: BallFlat, pattern: Pattern, bowler: BowlerInput): PhysicsResult {
  const profile = buildBallProfile(ball);
  const phases = derivePhaseTransitions(profile, pattern, bowler.ballSpeedMph, bowler.revRateRpm, bowler.laneSurface);
  const { path } = simulateContinuousPath(profile, pattern, bowler, phases);

  let breakpoint = path[0];
  let maxLateralRate = -1;
  for (let i = 1; i < path.length; i += 1) {
    const lateralRate = Math.abs(path[i].board - path[i - 1].board);
    if (lateralRate > maxLateralRate) {
      maxLateralRate = lateralRate;
      breakpoint = path[i];
    }
  }

  const pocketBoard = bowler.handedness === "right" ? 17 : 22;
  const finalBoard = path[path.length - 1].board;
  const entryAngle = computeEntryAngle(path);
  const classification = classifyShot(finalBoard, pocketBoard, entryAngle, bowler.handedness, breakpoint.board, breakpoint.ft);

  const reactionShape: PhysicsResult["reaction_shape"] =
    profile.coverClass === "plastic"
      ? "straight"
      : profile.backendResponsiveness > 0.74
        ? "skid-flip"
        : profile.backendResponsiveness > 0.56
          ? "skid-snap"
          : "arc";

  const pocketEntry: PhysicsResult["pocket_entry"] =
    classification === "flush"
      ? "flush"
      : classification === "high pocket" || classification === "through the nose"
        ? "high"
        : classification === "Brooklyn"
          ? "brooklyn"
          : "light";

  const recommendation =
    classification === "flush"
      ? "Great match-up. Keep this line and monitor transition as the fronts go away."
      : classification === "high pocket" || classification === "through the nose"
        ? "Reading too early/high. Add speed or move your laydown deeper to delay hook."
        : classification === "light pocket" || classification === "miss right" || classification === "no recovery"
          ? "Ball is too weak downlane. Reduce speed slightly or migrate line toward friction."
          : classification === "Brooklyn"
            ? "Ball crossed over. Soften line angle and reduce total hook to get back to pocket side."
            : classification === "miss left"
              ? "You overcovered and missed left. Move feet and target right/left with your hand to recover pocket."
              : classification === "rolled out"
                ? "Ball rolled out too early. Increase speed or use cleaner shell for continuation."
                : "Skid phase is too long. Increase traction or lower launch speed for earlier read.";

  return {
    skid_length_ft: Number(phases.skidEndFt.toFixed(1)),
    skid_end_ft: Number(phases.skidEndFt.toFixed(1)),
    breakpoint_board: Number(breakpoint.board.toFixed(1)),
    breakpoint_distance_ft: Number(breakpoint.ft.toFixed(1)),
    roll_start_ft: Number(phases.rollStartFt.toFixed(1)),
    final_board_at_pins: Number(finalBoard.toFixed(2)),
    entry_angle_degrees: Number(entryAngle.toFixed(2)),
    ball_path: path.map((p) => ({ ft: p.ft, board: Number(p.board.toFixed(2)) })),
    reaction_shape: reactionShape,
    pocket_entry: pocketEntry,
    shot_classification: classification,
    recommendation,
  };
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
    laneSurface: "synthetic",
  };

  const physics = simulatePhysicsJSON(ball, pattern, bowler);

  const readPhase =
    physics.breakpoint_distance_ft <= 39 ? "early" : physics.breakpoint_distance_ft <= 45 ? "mid" : "late";

  const shape = physics.reaction_shape === "arc" || physics.reaction_shape === "straight" ? "smooth" : "sharp";

  return {
    path: physics.ball_path.map((p) => ({ x: p.board, y: p.ft })),
    breakpoint: {
      board: Math.round(physics.breakpoint_board),
      distanceFt: Math.round(physics.breakpoint_distance_ft),
    },
    notes: { readPhase, shape, usedFallbackSpecs: fallbackUsed(ball) },
    physics,
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
