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
  feetBoard: number;   // 0-39
  targetBoard: number; // 0-39
};

export type SimResult = {
  path: { x: number; y: number }[]; // x=board, y=feet
  breakpoint: { board: number; distanceFt: number };
  notes: {
    readPhase: "early" | "mid" | "late";
    shape: "smooth" | "sharp";
    usedFallbackSpecs: boolean;
  };
};
