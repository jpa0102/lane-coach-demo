import { BallFlat } from "../lib/types";
import { BallProfile } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseGrit(factoryFinish: string | null) {
  if (!factoryFinish) return 2000;
  const m = factoryFinish.match(/(\d{3,4})/);
  return m ? Number(m[1]) : 2000;
}

export function buildBallProfile(ball: BallFlat): BallProfile {
  const cover = (ball.coverstock_type ?? "").toLowerCase();
  const core = (ball.core_type ?? "").toLowerCase();
  const rg = ball.rg ?? 2.53;
  const differential = ball.differential ?? 0.045;
  const surfaceGrit = parseGrit(ball.factory_finish);

  const coverClass: BallProfile["coverClass"] =
    cover.includes("plastic") ? "plastic" :
    cover.includes("urethane") ? "urethane" :
    cover.includes("pearl") ? "pearl" :
    cover.includes("hybrid") ? "hybrid" : "solid";

  const coreClass: BallProfile["coreClass"] = core.includes("asym") ? "asymmetric" : "symmetric";

  const baseTraction =
    coverClass === "plastic" ? 0.15 :
    coverClass === "urethane" ? 0.55 :
    coverClass === "pearl" ? 0.58 :
    coverClass === "hybrid" ? 0.68 : 0.76;

  const backendResponsiveness =
    coverClass === "plastic" ? 0.05 :
    coverClass === "urethane" ? 0.22 :
    coverClass === "solid" ? 0.5 :
    coverClass === "hybrid" ? 0.64 : 0.82;

  const surfaceBoost = clamp((4000 - surfaceGrit) / 3600, 0, 1);
  const rgEarly = clamp((2.59 - rg) / 0.16, 0, 1);
  const flarePotential = clamp((differential - 0.01) / 0.05, 0, 1);

  return {
    coverClass,
    coreClass,
    rg,
    differential,
    surfaceGrit,
    flarePotential,
    backendResponsiveness,
    traction: clamp(baseTraction + surfaceBoost * 0.22 + rgEarly * 0.12, 0.05, 1),
  };
}
