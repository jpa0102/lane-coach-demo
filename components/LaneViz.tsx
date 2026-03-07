import React from "react";
import { SimResult } from "../lib/types";

type Props = {
  a?: SimResult | null;
  b?: SimResult | null;
  labelA?: string;
  labelB?: string;
};

export function LaneViz({ a, b, labelA, labelB }: Props) {
  const W = 560;
  const H = 820;

  function mapX(board: number) {
    return (board / 39) * (W - 60) + 30;
  }
  function mapY(feet: number) {
    return (feet / 60) * (H - 60) + 30;
  }

  function pathD(res: SimResult) {
    const pts = res.path;
    if (!pts.length) return "";
    const start = `M ${mapX(pts[0].x)} ${mapY(pts[0].y)}`;
    const rest = pts
      .slice(1)
      .map((p) => `L ${mapX(p.x)} ${mapY(p.y)}`)
      .join(" ");
    return `${start} ${rest}`;
  }

  return (
    <div className="lc-surface">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-semibold">Lane View</span> <span className="text-zinc-400">(top-down)</span>
        </div>
        <div className="text-xs text-zinc-400">0ft foul line → 60ft pins</div>
      </div>

      <div className="mt-3 rounded-2xl overflow-hidden border border-cyan-300/20 bg-black/30">
        <svg width={W} height={H} style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <linearGradient id="laneGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(35,99,255,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width={W} height={H} rx="22" fill="url(#laneGlow)" />
          <rect x="26" y="26" width={W - 52} height={H - 52} rx="16" fill="rgba(0,0,0,0.32)" stroke="rgba(255,255,255,0.08)" />

          {Array.from({ length: 6 }).map((_, i) => {
            const board = i * 8;
            const x = mapX(board);
            return <line key={i} x1={x} y1={26} x2={x} y2={H - 26} stroke="rgba(255,255,255,0.06)" />;
          })}

          {[15, 30, 45, 60].map((ft) => {
            const y = mapY(ft);
            return <line key={ft} x1={26} y1={y} x2={W - 26} y2={y} stroke="rgba(255,255,255,0.06)" />;
          })}

          {a && (
            <>
              <path d={pathD(a)} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="3.2" />
              <circle cx={mapX(a.breakpoint.board)} cy={mapY(a.breakpoint.distanceFt)} r="6.5" fill="rgba(255,255,255,0.95)" />
            </>
          )}

          {b && (
            <>
              <path d={pathD(b)} fill="none" stroke="rgba(34,211,238,0.95)" strokeWidth="3.2" />
              <circle cx={mapX(b.breakpoint.board)} cy={mapY(b.breakpoint.distanceFt)} r="6.5" fill="rgba(34,211,238,0.95)" />
            </>
          )}
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded bg-white/90" />
            <span className="text-zinc-300">{labelA ?? "Ball A"}</span>
          </div>
          <div className="mt-1 text-zinc-400">
            {a
              ? `BP ${a.breakpoint.board}@${a.breakpoint.distanceFt}ft • ${a.notes.readPhase} • ${a.notes.shape}`
              : "Select Ball A"}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded bg-cyan-400/90" />
            <span className="text-zinc-300">{labelB ?? "Ball B"}</span>
          </div>
          <div className="mt-1 text-zinc-400">
            {b
              ? `BP ${b.breakpoint.board}@${b.breakpoint.distanceFt}ft • ${b.notes.readPhase} • ${b.notes.shape}`
              : "Select Ball B (optional)"}
          </div>
        </div>
      </div>
    </div>
  );
}
