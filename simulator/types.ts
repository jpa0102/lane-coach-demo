import { BallFlat, BowlerInput, Pattern } from "../lib/types";

export type BallProfile = {
  coverClass: "plastic" | "urethane" | "solid" | "hybrid" | "pearl";
  coreClass: "symmetric" | "asymmetric";
  rg: number;
  differential: number;
  surfaceGrit: number;
  flarePotential: number;
  backendResponsiveness: number;
  traction: number;
};

export type ShotClassification =
  | "flush"
  | "light pocket"
  | "high pocket"
  | "through the nose"
  | "Brooklyn"
  | "miss right"
  | "miss left"
  | "no recovery"
  | "rolled out"
  | "skid too long";

export type SimState = {
  ft: number;
  board: number;
  heading: number;
  speed: number;
  hookEnergy: number;
  inRoll: boolean;
};

export type PhaseTransitions = {
  skidEndFt: number;
  hookStartFt: number;
  rollStartFt: number;
};

export type SimulationInput = {
  ball: BallFlat;
  ballProfile: BallProfile;
  pattern: Pattern;
  bowler: BowlerInput;
};
