import { BowlerInput, Pattern } from "../lib/types";
import { BallProfile, PhaseTransitions, SimState } from "./types";
import { computeFrictionAtFt } from "./physics";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
  return t * t * (3 - 2 * t);
}

export function simulateContinuousPath(
  ball: BallProfile,
  pattern: Pattern,
  bowler: BowlerInput,
  phases: PhaseTransitions
): { path: Array<{ ft: number; board: number }>; states: SimState[] } {
  const pocketBoard = bowler.handedness === "right" ? 17 : 22;
  const handDir = bowler.handedness === "right" ? -1 : 1;

  let state: SimState = {
    ft: 0,
    board: clamp(bowler.startingBoard, 1, 39),
    heading: 0,
    speed: clamp(bowler.ballSpeedMph, 10, 24),
    hookEnergy: 0,
    inRoll: false,
  };

  const states: SimState[] = [{ ...state }];
  const path: Array<{ ft: number; board: number }> = [{ ft: 0, board: state.board }];

  const targetBoard = clamp(bowler.targetBoard, 1, 39);

  for (let ft = 1; ft <= 60; ft += 1) {
    const friction = computeFrictionAtFt(ft, pattern, bowler.laneSurface);
    const speedNorm = clamp((state.speed - 10) / 14, 0, 1);
    const revNorm = clamp((bowler.revRateRpm - 150) / 450, 0, 1);

    const launchToTarget = smoothstep(0, 15, ft);
    const baseline = state.board + (targetBoard - state.board) * Math.max(0, launchToTarget - (ft > 15 ? 1 : 0));

    const hookRamp = smoothstep(phases.skidEndFt, phases.hookStartFt, ft);
    const rollBlend = smoothstep(phases.rollStartFt, 60, ft);

    const hookGain =
      hookRamp * (1 - rollBlend * 0.7) * friction * (0.22 + ball.traction * 0.35 + revNorm * 0.2) * (1.15 - speedNorm * 0.4);

    state.hookEnergy = clamp(state.hookEnergy + hookGain, 0, 2.2);

    const headingInfluence = handDir * state.hookEnergy * (0.38 + ball.backendResponsiveness * 0.2) * (1 - rollBlend * 0.6);
    state.heading = state.heading * 0.86 + headingInfluence;

    const lateralFromHeading = state.heading * 0.42;
    const pocketSettle = rollBlend * 0.06 * (pocketBoard - state.board);

    state.board = clamp(state.board + lateralFromHeading + pocketSettle, 0, 39);
    if (ft <= 15) {
      state.board = clamp(baseline, 0, 39);
    }

    state.speed = clamp(state.speed - (0.025 + friction * 0.035), 8.5, 24);
    state.inRoll = ft >= phases.rollStartFt;
    state.ft = ft;

    states.push({ ...state });
    path.push({ ft, board: state.board });
  }

  return { path, states };
}
