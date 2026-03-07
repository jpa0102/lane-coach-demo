import { useEffect, useMemo, useState } from "react";
import { Nav } from "../components/Nav";
import { LaneViz } from "../components/LaneViz";
import flatCatalog from "../data/ballCatalogFlat.json";
import patternsData from "../data/pbaPatterns.json";
import { BallFlat, Line, Pattern } from "../lib/types";
import { getArsenal } from "../lib/store";
import { simulatePath } from "../lib/simulate";

function makeKey(b: BallFlat) {
  const y = b.usbc_approved_on_year ?? "unknown";
  return `${b.manufacturer}__${b.model}__${y}`.toLowerCase();
}

const inputClass =
  "w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white outline-none focus:ring-2 focus:ring-cyan-400/40";

const buttonPrimary =
  "px-4 py-2 rounded-xl bg-white text-zinc-950 font-medium hover:opacity-90 transition";

const buttonGhost =
  "px-4 py-2 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/15 transition";

export default function Simulation() {
  const catalog = flatCatalog as BallFlat[];
  const patterns = patternsData as Pattern[];

  const [arsenal, setArsenal] = useState(getArsenal());

  const [patternId, setPatternId] = useState(patterns[0]?.id ?? "");
  const [ballAKey, setBallAKey] = useState<string>("");
  const [ballBKey, setBallBKey] = useState<string>("");

  const [sameLine, setSameLine] = useState(true);
  const [lineA, setLineA] = useState<Line>({ feetBoard: 25, targetBoard: 15 });
  const [lineB, setLineB] = useState<Line>({ feetBoard: 30, targetBoard: 17 });

  useEffect(() => {
    setArsenal(getArsenal());
  }, []);

  const pattern = patterns.find((p) => p.id === patternId) ?? patterns[0];

  const myCatalogBalls = useMemo(() => {
    const index = new Map<string, BallFlat>();
    for (const b of catalog) index.set(makeKey(b), b);

    return arsenal
      .map((ub) => index.get(ub.catalogKey))
      .filter(Boolean) as BallFlat[];
  }, [arsenal, catalog]);

  useEffect(() => {
    if (myCatalogBalls.length > 0 && !ballAKey) setBallAKey(makeKey(myCatalogBalls[0]));
    if (myCatalogBalls.length > 1 && !ballBKey) setBallBKey(makeKey(myCatalogBalls[1]));
  }, [myCatalogBalls, ballAKey, ballBKey]);

  const aBall = myCatalogBalls.find((b) => makeKey(b) === ballAKey);
  const bBall = myCatalogBalls.find((b) => makeKey(b) === ballBKey);

  const simA = useMemo(() => {
    if (!aBall || !pattern) return null;
    return simulatePath(aBall, pattern, lineA, { speedClass: "med", revClass: "med" });
  }, [aBall, pattern, lineA]);

  const simB = useMemo(() => {
    if (!bBall || !pattern) return null;
    const chosenLine = sameLine ? lineA : lineB;
    return simulatePath(bBall, pattern, chosenLine, { speedClass: "med", revClass: "med" });
  }, [bBall, pattern, lineA, lineB, sameLine]);

  const summary = useMemo(() => {
    if (!simA || !simB || !aBall || !bBall) return null;
    const earlier = simA.breakpoint.distanceFt < simB.breakpoint.distanceFt ? "A" : "B";
    const sharper =
      simA.notes.shape === "sharp" && simB.notes.shape !== "sharp"
        ? "A"
        : simB.notes.shape === "sharp" && simA.notes.shape !== "sharp"
          ? "B"
          : "Tie";
    return { earlier, sharper };
  }, [simA, simB, aBall, bBall]);

  return (
    <>
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ball Simulation</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Compare two balls from your arsenal and visualize breakpoint + shape.
            </p>
          </div>
          <a href="/arsenal" className={buttonGhost}>Back to Arsenal</a>
        </div>

        {myCatalogBalls.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-soft">
            <div className="text-sm font-semibold">No arsenal yet</div>
            <div className="mt-2 text-sm text-zinc-400">
              Add at least 1 ball in Arsenal to run the simulation.
            </div>
            <div className="mt-4">
              <a href="/arsenal" className={buttonPrimary}>Add balls</a>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Inputs */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-soft">
              <div className="text-sm font-semibold">Inputs</div>
              <div className="mt-1 text-xs text-zinc-400">
                Demo model; improves as your ball specs get enriched.
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs text-zinc-400">Pattern</label>
                  <select className={inputClass + " mt-1"} value={patternId} onChange={(e) => setPatternId(e.target.value)}>
                    {patterns.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400">Ball A</label>
                    <select className={inputClass + " mt-1"} value={ballAKey} onChange={(e) => setBallAKey(e.target.value)}>
                      {myCatalogBalls.map((b) => {
                        const k = makeKey(b);
                        return (
                          <option key={k} value={k}>
                            {b.manufacturer} {b.model}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400">Ball B</label>
                    <select className={inputClass + " mt-1"} value={ballBKey} onChange={(e) => setBallBKey(e.target.value)}>
                      <option value="">(none)</option>
                      {myCatalogBalls.map((b) => {
                        const k = makeKey(b);
                        return (
                          <option key={k} value={k}>
                            {b.manufacturer} {b.model}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Lines</div>
                    <label className="text-xs text-zinc-300 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sameLine}
                        onChange={(e) => setSameLine(e.target.checked)}
                      />
                      Same line for both
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400">Feet (A)</label>
                      <input
                        className={inputClass + " mt-1"}
                        type="number"
                        min={0}
                        max={39}
                        value={lineA.feetBoard}
                        onChange={(e) => setLineA({ ...lineA, feetBoard: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400">Target (A)</label>
                      <input
                        className={inputClass + " mt-1"}
                        type="number"
                        min={0}
                        max={39}
                        value={lineA.targetBoard}
                        onChange={(e) => setLineA({ ...lineA, targetBoard: Number(e.target.value) })}
                      />
                    </div>

                    {!sameLine && (
                      <>
                        <div>
                          <label className="text-xs text-zinc-400">Feet (B)</label>
                          <input
                            className={inputClass + " mt-1"}
                            type="number"
                            min={0}
                            max={39}
                            value={lineB.feetBoard}
                            onChange={(e) => setLineB({ ...lineB, feetBoard: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400">Target (B)</label>
                          <input
                            className={inputClass + " mt-1"}
                            type="number"
                            min={0}
                            max={39}
                            value={lineB.targetBoard}
                            onChange={(e) => setLineB({ ...lineB, targetBoard: Number(e.target.value) })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {(simA?.notes.usedFallbackSpecs || simB?.notes.usedFallbackSpecs) && (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs text-amber-200">
                    Some ball specs are missing in your export (normal before enrichment), so simulation uses fallback defaults.
                  </div>
                )}
              </div>
            </div>

            {/* Viz + Summary */}
            <div className="space-y-4">
              <LaneViz
                a={simA}
                b={simB}
                labelA={aBall ? `${aBall.manufacturer} ${aBall.model}` : "Ball A"}
                labelB={bBall ? `${bBall.manufacturer} ${bBall.model}` : "Ball B"}
              />

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-soft">
                <div className="text-sm font-semibold">Comparison</div>

                {!simA ? (
                  <div className="mt-2 text-sm text-zinc-400">Select Ball A to simulate.</div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-zinc-400">Ball A</div>
                      <div className="mt-1 text-sm font-semibold">
                        BP {simA.breakpoint.board}@{simA.breakpoint.distanceFt}ft
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">{simA.notes.readPhase} • {simA.notes.shape}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-zinc-400">Ball B</div>
                      <div className="mt-1 text-sm font-semibold">
                        {simB ? `BP ${simB.breakpoint.board}@${simB.breakpoint.distanceFt}ft` : "—"}
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {simB ? `${simB.notes.readPhase} • ${simB.notes.shape}` : "Select Ball B (optional)"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-zinc-400">Quick read</div>
                      <div className="mt-2 text-xs text-zinc-300">
                        <div><span className="text-zinc-400">Reads earlier:</span> {summary ? (summary.earlier === "A" ? "Ball A" : "Ball B") : "—"}</div>
                        <div className="mt-1">
                          <span className="text-zinc-400">Sharper:</span>{" "}
                          {summary ? (summary.sharper === "Tie" ? "Tie" : summary.sharper === "A" ? "Ball A" : "Ball B") : "—"}
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] text-zinc-500">
                        (Demo model — later we’ll use pattern oil graphs for higher fidelity.)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
