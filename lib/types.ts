export type BallFlat = {
  manufacturer: string;
  model: string;

  // USBC approval fields (some may be null)
  usbc_approval_id: string | null;
  usbc_approved_on_raw: string | null;
  usbc_approved_on_date: string | null;
  usbc_approved_on_year: number | null;
  usbc_approved_on_month: number | null;
  usbc_approved_on_day: number | null;
  usbc_approved_on_precision: "day" | "month" | "unknown" | string | null;

  // enrichment fields (often null until enriched)
  release_date: string | null;
  release_year: number | null;

  coverstock_type: string | null;
  coverstock_material: string | null;
  coverstock_name: string | null;

  core_name: string | null;
  core_type: string | null;

  rg: number | null;
  differential: number | null;
  mass_bias: number | null;

  factory_finish: string | null;

  data_confidence?: string | null;
};

export type UserBall = {
  userBallId: string;
  catalogKey: string; // derived from manufacturer+model+year (stable enough for demo)
  surface?: string;
};

export type Pattern = {
  id: string;
  name: string;
  lengthFt: number;
  ratio: "low" | "medium" | "high" | string;
  volume: "low" | "medium" | "high" | string;
  shape: "short" | "medium" | "long" | string;
};

export type Line = {
  feetBoard: number; // 0-39
  targetBoard: number; // 0-39
};

export type BowlerInput = {
  handedness: "right" | "left";
  papXInches: number;
  papYInches: number;
  ballSpeedMph: number;
  revRateRpm: number;
  startingBoard: number;
  targetBoard: number;
  oilPatternType: "house" | "sport" | "specific";
  laneSurface: "synthetic" | "wood";
};

export type PhysicsResult = {
  skid_length_ft: number;
  skid_end_ft: number;
  breakpoint_board: number;
  breakpoint_distance_ft: number;
  roll_start_ft: number;
  final_board_at_pins: number;
  entry_angle_degrees: number;
  ball_path: Array<{ ft: number; board: number }>;
  reaction_shape: "arc" | "skid-snap" | "skid-flip" | "straight";
  pocket_entry: "brooklyn" | "light" | "flush" | "high";
  shot_classification: "flush" | "light pocket" | "high pocket" | "through the nose" | "Brooklyn" | "miss right" | "miss left" | "no recovery" | "rolled out" | "skid too long";
  recommendation: string;
};

export type SimResult = {
  path: { x: number; y: number }[]; // x=board, y=feet
  breakpoint: { board: number; distanceFt: number };
  notes: {
    readPhase: "early" | "mid" | "late";
    shape: "smooth" | "sharp";
    usedFallbackSpecs: boolean;
  };
  physics: PhysicsResult;
};
