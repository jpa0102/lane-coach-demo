import React from "react";
import { PhysicsResult } from "../lib/types";

type Props = {
  result?: PhysicsResult | null;
  handedness?: "right" | "left";
  startBoard?: number;
  targetBoard?: number;
  breakpointBoard?: number;
  breakpointDistanceFt?: number;
};

const W = 460;
const H = 900;
const PAD_X = 34;
const PAD_Y = 40;
export function LaneViz({ a, b, labelA, labelB }: Props) {
  const W = 560;
  const H = 820;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mapX(board: number) {
  return PAD_X + (clamp(board, 0, 39) / 39) * (W - PAD_X * 2);
}

function mapY(ft: number) {
  return H - PAD_Y - (clamp(ft, 0, 60) / 60) * (H - PAD_Y * 2);
}

function smoothPath(points: Array<{ ft: number; board: number }>) {
  if (!points.length) return "";
  const sampled = points.filter((_, i) => i % 3 === 0 || i === points.length - 1);
  const first = sampled[0];
  let d = `M ${mapX(first.board)} ${mapY(first.ft)}`;

  for (let i = 1; i < sampled.length; i += 1) {
    const prev = sampled[i - 1];
    const cur = sampled[i];
    const cx = mapX((prev.board + cur.board) / 2);
    const cy = mapY((prev.ft + cur.ft) / 2);
    d += ` Q ${mapX(prev.board)} ${mapY(prev.ft)} ${cx} ${cy}`;
  }

  const last = sampled[sampled.length - 1];
  d += ` T ${mapX(last.board)} ${mapY(last.ft)}`;
  return d;
}

export function LaneViz({ result, handedness = "right", startBoard, targetBoard, breakpointBoard, breakpointDistanceFt }: Props) {
  const pocketBoard = handedness === "right" ? 17 : 22;

  return (
    <div className="lc-surface">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Lane Tracer</div>
        <div className="text-xs text-zinc-400">Broadcast-style path map</div>
      </div>

      <div className="mt-3 rounded-2xl overflow-hidden border border-cyan-300/20 bg-black/40">
        <svg width={W} height={H} style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <linearGradient id="laneTone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(230,240,255,0.18)" />
              <stop offset="65%" stopColor="rgba(175,215,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
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
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width={W} height={H} fill="rgba(5,8,18,0.95)" />
          <rect x={PAD_X} y={PAD_Y} width={W - PAD_X * 2} height={H - PAD_Y * 2} rx="20" fill="url(#laneTone)" stroke="rgba(255,255,255,0.16)" />

          {Array.from({ length: 11 }).map((_, i) => {
            const board = i * 4;
            const x = mapX(board);
            return <line key={`board-${board}`} x1={x} y1={PAD_Y} x2={x} y2={H - PAD_Y} stroke="rgba(255,255,255,0.06)" />;
          })}

          {[15, 30, 45].map((ft) => {
            const y = mapY(ft);
            return <line key={`dist-${ft}`} x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke="rgba(255,255,255,0.08)" />;
          })}

          {[5, 10, 15, 20, 25, 30, 35].map((board) => (
            <polygon
              key={`arrow-${board}`}
              points={`${mapX(board) - 4},${mapY(15) + 3} ${mapX(board) + 4},${mapY(15) + 3} ${mapX(board)},${mapY(15) - 6}`}
              fill="rgba(220,230,255,0.45)"
            />
          ))}

          <line x1={PAD_X} y1={mapY(0)} x2={W - PAD_X} y2={mapY(0)} stroke="rgba(255,255,255,0.35)" strokeDasharray="5 4" />

          {[16, 18, 20, 17, 19, 21, 18.5, 19.5, 20.5, 19].map((b, i) => (
            <circle key={`pin-${i}`} cx={mapX(b)} cy={mapY(60) + 14 + (i > 5 ? 8 : 0)} r="4.2" fill="rgba(244,246,255,0.9)" />
          ))}

          {result && (
            <>
              <path d={smoothPath(result.ball_path)} stroke="rgba(34,211,238,0.5)" strokeWidth="8" fill="none" filter="url(#glow)" />
              <path d={smoothPath(result.ball_path)} stroke="rgba(220,248,255,0.96)" strokeWidth="3" fill="none" />

              <circle cx={mapX(result.breakpoint_board)} cy={mapY(breakpointDistanceFt ?? 45)} r="7" fill="rgba(239,68,68,0.95)" />
              <text x={mapX(result.breakpoint_board) + 10} y={mapY((breakpointDistanceFt ?? 45)) - 8} fontSize="11" fill="rgba(255,210,210,0.95)">BP</text>

              <circle cx={mapX(pocketBoard)} cy={mapY(60)} r="6" fill="rgba(16,185,129,0.95)" />
              <text x={mapX(pocketBoard) + 9} y={mapY(60) - 6} fontSize="11" fill="rgba(167,243,208,0.95)">Pocket</text>
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

          {typeof startBoard === "number" && <text x={mapX(startBoard) + 8} y={mapY(1) - 8} fontSize="11" fill="rgba(255,255,255,0.8)">Start</text>}
          {typeof targetBoard === "number" && <text x={mapX(targetBoard) + 8} y={mapY(15) - 8} fontSize="11" fill="rgba(255,255,255,0.75)">Target</text>}
          {typeof breakpointBoard === "number" && <text x={mapX(breakpointBoard) + 8} y={mapY((breakpointDistanceFt ?? 45)) + 14} fontSize="11" fill="rgba(255,210,210,0.95)">Intent BP</text>}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Pins (60ft)</span>
        <span>Arrows (~15ft)</span>
        <span>Foul line (0ft)</span>
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
