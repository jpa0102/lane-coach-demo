import { useEffect, useMemo, useState } from "react";
import { Nav } from "../components/Nav";
import { LaneViz } from "../components/LaneViz";
import { Button, LinkButton, SectionTitle, Surface } from "../components/ui";
import { Button, LinkButton, MetricTile, SectionTitle, Surface } from "../components/ui";
import flatCatalog from "../data/ballCatalogFlat.json";
import patternsData from "../data/pbaPatterns.json";
import { BallFlat, BowlerInput, Pattern, PhysicsResult } from "../lib/types";
import { getArsenal } from "../lib/store";
import { simulatePhysicsJSON } from "../lib/stimulate";
import { simulatePath } from "../lib/stimulate";

function makeKey(b: BallFlat) {
  const y = b.usbc_approved_on_year ?? "unknown";
  return `${b.manufacturer}__${b.model}__${y}`.toLowerCase();
}

type SimInputs = {
  ballKey: string;
  patternId: string;
  ballSpeedMph: number;
  revRateRpm: number;
  handedness: "right" | "left";
  standBoard: number;
  targetBoard: number;
  breakpointBoard: number;
  breakpointDistanceFt: number;
  axisRotationDeg: number;
  axisTiltDeg: number;
  surfaceOverride: string;
  transitionState: string;
};

const defaultInputs: SimInputs = {
  ballKey: "",
  patternId: "",
  ballSpeedMph: 17,
  revRateRpm: 320,
  handedness: "right",
  standBoard: 25,
  targetBoard: 15,
  breakpointBoard: 8,
  breakpointDistanceFt: 42,
  axisRotationDeg: 50,
  axisTiltDeg: 14,
  surfaceOverride: "",
  transitionState: ""
};

function validateInputs(inputs: SimInputs) {
  const errors: string[] = [];
  if (!inputs.ballKey) errors.push("Select a bowling ball.");
  if (!inputs.patternId) errors.push("Select an oil pattern.");
  if (inputs.ballSpeedMph < 10 || inputs.ballSpeedMph > 22) errors.push("Ball speed must be between 10 and 22 mph.");
  if (inputs.revRateRpm < 150 || inputs.revRateRpm > 600) errors.push("Rev rate must be between 150 and 600 rpm.");
  if (inputs.standBoard < 1 || inputs.standBoard > 39) errors.push("Stand position must be between boards 1-39.");
  if (inputs.targetBoard < 1 || inputs.targetBoard > 39) errors.push("Target board must be between boards 1-39.");
  if (inputs.breakpointBoard < 1 || inputs.breakpointBoard > 39) errors.push("Breakpoint board must be between boards 1-39.");
  if (inputs.breakpointDistanceFt < 35 || inputs.breakpointDistanceFt > 50) errors.push("Breakpoint distance must be between 35 and 50 ft.");
  return errors;
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-zinc-400">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          className="lc-input"
          type="number"
          min={min}
          max={max}
          step={step ?? 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {unit ? <span className="text-xs text-zinc-500 min-w-8">{unit}</span> : null}
      </div>
      <input
        className="mt-2 w-full accent-cyan-300"
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export default function Simulation() {
  const catalog = flatCatalog as BallFlat[];
  const patterns = patternsData as Pattern[];

  const [arsenal, setArsenal] = useState(getArsenal());
  const [inputs, setInputs] = useState<SimInputs>(defaultInputs);
  const [submittedInputs, setSubmittedInputs] = useState<SimInputs | null>(null);
  const [result, setResult] = useState<PhysicsResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [stale, setStale] = useState(false);
  const [patternId, setPatternId] = useState(patterns[0]?.id ?? "");
  const [ballAKey, setBallAKey] = useState<string>("");
  const [ballBKey, setBallBKey] = useState<string>("");

  const [sameLine, setSameLine] = useState(true);
  const [lineA, setLineA] = useState<Line>({ feetBoard: 25, targetBoard: 15 });
  const [lineB, setLineB] = useState<Line>({ feetBoard: 30, targetBoard: 17 });

  useEffect(() => {
    setArsenal(getArsenal());
  }, []);

  const myCatalogBalls = useMemo(() => {
    const index = new Map<string, BallFlat>();
    for (const b of catalog) index.set(makeKey(b), b);

    return arsenal.map((ub) => index.get(ub.catalogKey)).filter(Boolean) as BallFlat[];
  }, [arsenal, catalog]);

  useEffect(() => {
    if (!inputs.ballKey && myCatalogBalls.length > 0) {
      setInputs((prev) => ({ ...prev, ballKey: makeKey(myCatalogBalls[0]) }));
    }
    if (!inputs.patternId && patterns[0]?.id) {
      setInputs((prev) => ({ ...prev, patternId: patterns[0].id }));
    }
  }, [myCatalogBalls, patterns, inputs.ballKey, inputs.patternId]);

  const ball = myCatalogBalls.find((b) => makeKey(b) === inputs.ballKey);
  const pattern = patterns.find((p) => p.id === inputs.patternId);

  const setInput = <K extends keyof SimInputs>(key: K, value: SimInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    if (result) setStale(true);
  };

  const currentErrors = validateInputs(inputs);
  const canSimulate = currentErrors.length === 0;

  const onSimulate = () => {
    const nextErrors = validateInputs(inputs);
    setErrors(nextErrors);
    if (nextErrors.length || !ball || !pattern) return;

    const bowler: BowlerInput = {
      handedness: inputs.handedness,
      papXInches: 4.5,
      papYInches: 0.5,
      ballSpeedMph: inputs.ballSpeedMph,
      revRateRpm: inputs.revRateRpm,
      axisTiltDeg: inputs.axisTiltDeg,
      axisRotationDeg: inputs.axisRotationDeg,
      startingBoard: inputs.standBoard,
      targetBoard: inputs.targetBoard,
      breakpointBoardIntent: inputs.breakpointBoard,
      breakpointDistanceFt: inputs.breakpointDistanceFt,
      oilPatternType: pattern.ratio === "high" ? "house" : "sport",
      laneSurface: "synthetic"
    };

    setResult(simulatePhysicsJSON(ball, pattern, bowler));
    setSubmittedInputs(inputs);
    setStale(false);
  };

  return (
    <>
      <Nav />
      <div className="lc-shell">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Ball Simulator</h1>
            <p className="mt-2 text-sm text-zinc-300 max-w-2xl">
              Configure shot conditions, then run a broadcast-style lane trace and coach summary.
            <h1 className="text-3xl font-semibold tracking-tight">Ball Simulation Studio</h1>
            <p className="mt-2 text-sm text-zinc-300 max-w-2xl">
              Evaluate line choices and ball motion with a premium analytics dashboard layout.
            </p>
          </div>
          <LinkButton href="/arsenal">Back to Arsenal</LinkButton>
        </div>

        {myCatalogBalls.length === 0 ? (
          <Surface className="mt-6">
            <SectionTitle title="No arsenal yet" subtitle="Add at least one ball in Arsenal to use the simulator." />
            <div className="mt-4">
              <LinkButton tone="primary" href="/arsenal">Add Balls</LinkButton>
            </div>
          </Surface>
        ) : (
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-4">
            <Surface>
              <SectionTitle title="Simulator Inputs" subtitle="Required fields must be valid before simulation can run." />

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs text-zinc-400">Bowling ball *</label>
                  <select className="lc-input mt-1" value={inputs.ballKey} onChange={(e) => setInput("ballKey", e.target.value)}>
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
                  <label className="text-xs text-zinc-400">Oil pattern *</label>
                  <select className="lc-input mt-1" value={inputs.patternId} onChange={(e) => setInput("patternId", e.target.value)}>
                    {patterns.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.lengthFt}ft)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumberField label="Ball speed *" value={inputs.ballSpeedMph} min={10} max={22} step={0.1} unit="mph" onChange={(n) => setInput("ballSpeedMph", n)} />
                  <NumberField label="Rev rate *" value={inputs.revRateRpm} min={150} max={600} unit="rpm" onChange={(n) => setInput("revRateRpm", n)} />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Handedness *</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button className={inputs.handedness === "right" ? "lc-btn-primary" : "lc-btn-ghost"} onClick={() => setInput("handedness", "right")}>Right-handed</button>
                    <button className={inputs.handedness === "left" ? "lc-btn-primary" : "lc-btn-ghost"} onClick={() => setInput("handedness", "left")}>Left-handed</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400">Stand position board *</label>
                    <input className="lc-input mt-1" type="number" min={1} max={39} value={inputs.standBoard} onChange={(e) => setInput("standBoard", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Target board *</label>
                    <input className="lc-input mt-1" type="number" min={1} max={39} value={inputs.targetBoard} onChange={(e) => setInput("targetBoard", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Breakpoint board *</label>
                    <input className="lc-input mt-1" type="number" min={1} max={39} value={inputs.breakpointBoard} onChange={(e) => setInput("breakpointBoard", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Breakpoint distance *</label>
                    <input className="lc-input mt-1" type="number" min={35} max={50} value={inputs.breakpointDistanceFt} onChange={(e) => setInput("breakpointDistanceFt", Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
                  <div>
                    <label className="text-xs text-zinc-500">Surface / grit override (coming soon)</label>
                    <input className="lc-input mt-1" value={inputs.surfaceOverride} placeholder="e.g., 2000" disabled />
            <SectionTitle title="No arsenal yet" subtitle="Add at least 1 ball in Arsenal to run the simulation." />
            <div className="mt-4">
              <LinkButton tone="primary" href="/arsenal">
                Add Balls
              </LinkButton>
            </div>
          </Surface>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MetricTile label="Pattern" value={pattern?.name ?? "—"} accent="text-cyan-200" />
              <MetricTile label="Ball A" value={aBall ? `${aBall.manufacturer} ${aBall.model}` : "—"} />
              <MetricTile label="Ball B" value={bBall ? `${bBall.manufacturer} ${bBall.model}` : "Optional"} accent="text-emerald-200" />
            </div>

            <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.1fr_1.2fr] gap-4">
              <Surface>
                <SectionTitle title="Simulation Inputs" subtitle="Demo model; accuracy improves as specs are enriched." />

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400">Pattern</label>
                    <select className="lc-input mt-1" value={patternId} onChange={(e) => setPatternId(e.target.value)}>
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
                      <select className="lc-input mt-1" value={ballAKey} onChange={(e) => setBallAKey(e.target.value)}>
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
                      <select className="lc-input mt-1" value={ballBKey} onChange={(e) => setBallBKey(e.target.value)}>
                        <option value="">None</option>
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
                  <div>
                    <label className="text-xs text-zinc-500">Lane transition state (coming soon)</label>
                    <input className="lc-input mt-1" value={inputs.transitionState} placeholder="fresh / transition / burn" disabled />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Axis rotation</label>
                    <input className="lc-input mt-1" type="number" min={0} max={90} value={inputs.axisRotationDeg} onChange={(e) => setInput("axisRotationDeg", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Axis tilt</label>
                    <input className="lc-input mt-1" type="number" min={0} max={25} value={inputs.axisTiltDeg} onChange={(e) => setInput("axisTiltDeg", Number(e.target.value))} />
                  </div>
                </div>

                {errors.length > 0 && (
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                    {errors.map((err) => <div key={err}>• {err}</div>)}
                  <label className="text-xs text-zinc-300 flex items-center gap-2">
                    <input type="checkbox" checked={sameLine} onChange={(e) => setSameLine(e.target.checked)} />
                    Same line for both balls
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400">Feet (A)</label>
                      <input
                        className="lc-input mt-1"
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
                        className="lc-input mt-1"
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
                            className="lc-input mt-1"
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
                            className="lc-input mt-1"
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
                )}

                <div className="flex items-center gap-3">
                  <Button tone="primary" className="w-full md:w-auto" disabled={!canSimulate} onClick={onSimulate}>
                    Simulate
                  </Button>
                  {!canSimulate && <span className="text-xs text-zinc-500">Complete all required fields to enable simulation.</span>}
                </div>

                {stale && (
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200">
                    Inputs changed — press <span className="font-semibold">Simulate</span> to update result.
                  </div>
                )}
              </div>
            </Surface>

            <div className="space-y-4">
              <LaneViz
                result={result}
                handedness={submittedInputs?.handedness ?? inputs.handedness}
                startBoard={submittedInputs?.standBoard}
                targetBoard={submittedInputs?.targetBoard}
                breakpointBoard={submittedInputs?.breakpointBoard}
                breakpointDistanceFt={submittedInputs?.breakpointDistanceFt}
              />

              {!result ? (
                <Surface>
                  <SectionTitle title="Simulation Output" subtitle="No output yet. Configure inputs and press Simulate." />
                </Surface>
              ) : (
                <Surface>
                  <SectionTitle title="Coach Summary" subtitle="Post-simulation reaction breakdown and recommendation." />
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-zinc-400 text-xs">Ball</span><div>{ball?.manufacturer} {ball?.model}</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-zinc-400 text-xs">Pattern</span><div>{pattern?.name}</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-zinc-400 text-xs">Speed / Revs</span><div>{submittedInputs?.ballSpeedMph} mph • {submittedInputs?.revRateRpm} rpm</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-zinc-400 text-xs">Handedness</span><div>{submittedInputs?.handedness === "left" ? "Left" : "Right"}</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-zinc-400 text-xs">Line Plan</span><div>{submittedInputs?.standBoard} → {submittedInputs?.targetBoard} → {submittedInputs?.breakpointBoard}</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-zinc-400 text-xs">Breakpoint Distance</span><div>{submittedInputs?.breakpointDistanceFt} ft</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-zinc-400 text-xs">Reaction Shape</span><div>{result.reaction_shape}</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-zinc-400 text-xs">Pocket Entry</span><div>{result.pocket_entry}</div></div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-500/5 p-4">
                    <div className="text-xs text-cyan-200">Quick reaction summary</div>
                    <div className="mt-1 text-sm text-zinc-200">Skid: {result.skid_length_ft}ft • Entry angle: {result.entry_angle_degrees}° • Breakpoint: {result.breakpoint_board}</div>
                    <div className="mt-2 text-sm text-zinc-300">{result.recommendation}</div>
                  </div>
                </Surface>
              )}
                {(simA?.notes.usedFallbackSpecs || simB?.notes.usedFallbackSpecs) && (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs text-amber-200">
                    Some ball specs are missing in your export, so simulation uses fallback defaults.
                  </div>
                )}
              </Surface>

              <div className="space-y-4">
                <LaneViz
                  a={simA}
                  b={simB}
                  labelA={aBall ? `${aBall.manufacturer} ${aBall.model}` : "Ball A"}
                  labelB={bBall ? `${bBall.manufacturer} ${bBall.model}` : "Ball B"}
                />

                <Surface>
                  <SectionTitle title="Comparison Analytics" />
                  {!simA ? (
                    <div className="mt-2 text-sm text-zinc-400">Select Ball A to simulate.</div>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs text-zinc-400">Ball A</div>
                        <div className="mt-1 font-semibold">
                          BP {simA.breakpoint.board}@{simA.breakpoint.distanceFt}ft
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {simA.notes.readPhase} • {simA.notes.shape}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs text-zinc-400">Ball B</div>
                        <div className="mt-1 font-semibold">
                          {simB ? `BP ${simB.breakpoint.board}@${simB.breakpoint.distanceFt}ft` : "—"}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {simB ? `${simB.notes.readPhase} • ${simB.notes.shape}` : "Select Ball B (optional)"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs text-zinc-400">Quick read</div>
                        <div className="mt-2 text-xs text-zinc-300 space-y-1">
                          <div>
                            <span className="text-zinc-400">Reads earlier:</span>{" "}
                            {summary ? (summary.earlier === "A" ? "Ball A" : "Ball B") : "—"}
                          </div>
                          <div>
                            <span className="text-zinc-400">Sharper:</span>{" "}
                            {summary
                              ? summary.sharper === "Tie"
                                ? "Tie"
                                : summary.sharper === "A"
                                  ? "Ball A"
                                  : "Ball B"
                              : "—"}
                          </div>
                        </div>
                        <div className="mt-3 text-[11px] text-zinc-500">Demo model only; oil graph integration is planned.</div>
                      </div>
                    </div>
                  )}
                </Surface>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
