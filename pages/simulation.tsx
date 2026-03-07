import { useEffect, useMemo, useState } from "react";
import Nav from "../components/Nav";
import { LaneViz } from "../components/LaneViz";
import { Button, LinkButton, SectionTitle, Surface } from "../components/ui";
import flatCatalog from "../data/ballCatalogFlat.json";
import patternsData from "../data/pbaPatterns.json";
import { BallFlat, BowlerInput, Pattern, PhysicsResult } from "../lib/types";
import { getArsenal } from "../lib/store";
import { simulatePhysicsJSON } from "../lib/stimulate";

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
  laneTransitionState: string;
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
  laneTransitionState: ""
};

function makeKey(b: BallFlat) {
  const y = b.usbc_approved_on_year ?? "unknown";
  return `${b.manufacturer}__${b.model}__${y}`.toLowerCase();
}

function validateInputs(i: SimInputs) {
  const errors: string[] = [];
  if (!i.ballKey) errors.push("Select a bowling ball.");
  if (!i.patternId) errors.push("Select an oil pattern.");
  if (i.ballSpeedMph < 10 || i.ballSpeedMph > 22) errors.push("Ball speed must be 10–22 mph.");
  if (i.revRateRpm < 150 || i.revRateRpm > 600) errors.push("Rev rate must be 150–600 rpm.");
  if (i.standBoard < 1 || i.standBoard > 39) errors.push("Stand board must be 1–39.");
  if (i.targetBoard < 1 || i.targetBoard > 39) errors.push("Target board must be 1–39.");
  if (i.breakpointBoard < 1 || i.breakpointBoard > 39) errors.push("Breakpoint board must be 1–39.");
  if (i.breakpointDistanceFt < 35 || i.breakpointDistanceFt > 50) errors.push("Breakpoint distance must be 35–50 ft.");
  return errors;
}

function NumberInput({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
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
        {unit ? <span className="text-xs text-zinc-500 min-w-9">{unit}</span> : null}
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
  const [result, setResult] = useState<PhysicsResult | null>(null);
  const [submittedInputs, setSubmittedInputs] = useState<SimInputs | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [staleResult, setStaleResult] = useState(false);

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
  }, [inputs.ballKey, inputs.patternId, myCatalogBalls, patterns]);

  const selectedBall = myCatalogBalls.find((b) => makeKey(b) === inputs.ballKey) ?? null;
  const selectedPattern = patterns.find((p) => p.id === inputs.patternId) ?? null;

  function updateInput(key: keyof SimInputs, value: SimInputs[keyof SimInputs]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
    if (result) setStaleResult(true);
  }

  const formErrors = validateInputs(inputs);
  const canSimulate = formErrors.length === 0;

  function runSimulation() {
    const nextErrors = validateInputs(inputs);
    setErrors(nextErrors);

    if (nextErrors.length > 0 || !selectedBall || !selectedPattern) return;

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
      oilPatternType: selectedPattern.ratio === "high" ? "house" : "sport",
      laneSurface: "synthetic"
    };

    const nextResult = simulatePhysicsJSON(selectedBall, selectedPattern, bowler);
    setResult(nextResult);
    setSubmittedInputs(inputs);
    setStaleResult(false);
  }

  const readPhase = !result ? "—" : result.skid_length_ft < 35 ? "early" : result.skid_length_ft < 42 ? "mid" : "late";
  const shapeNote = !result
    ? "—"
    : result.reaction_shape === "arc" || result.reaction_shape === "straight"
      ? "smooth"
      : "angular";

  return (
    <>
      <Nav />
      <div className="lc-shell">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Ball Simulator</h1>
            <p className="mt-2 text-sm text-zinc-300 max-w-2xl">
              Configure ball and shot conditions, then press Simulate to generate a lane tracer and coach summary.
            </p>
          </div>
          <LinkButton href="/arsenal">Back to Arsenal</LinkButton>
        </div>

        {myCatalogBalls.length === 0 ? (
          <Surface className="mt-6">
            <SectionTitle title="No arsenal yet" subtitle="Add at least one ball in Arsenal before running simulations." />
            <div className="mt-4">
              <LinkButton tone="primary" href="/arsenal">Add Balls</LinkButton>
            </div>
          </Surface>
        ) : (
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-4 items-start">
            <Surface>
              <SectionTitle title="Simulator Inputs" subtitle="Complete required fields, then run simulation." />

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs text-zinc-400">Bowling ball *</label>
                  <select className="lc-input mt-1" value={inputs.ballKey} onChange={(e) => updateInput("ballKey", e.target.value)}>
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
                  <select className="lc-input mt-1" value={inputs.patternId} onChange={(e) => updateInput("patternId", e.target.value)}>
                    {patterns.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.lengthFt}ft)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumberInput
                    label="Ball speed *"
                    unit="mph"
                    value={inputs.ballSpeedMph}
                    min={10}
                    max={22}
                    step={0.1}
                    onChange={(n) => updateInput("ballSpeedMph", n)}
                  />
                  <NumberInput
                    label="Rev rate *"
                    unit="rpm"
                    value={inputs.revRateRpm}
                    min={150}
                    max={600}
                    onChange={(n) => updateInput("revRateRpm", n)}
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Handedness *</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button
                      className={inputs.handedness === "right" ? "lc-btn-primary" : "lc-btn-ghost"}
                      onClick={() => updateInput("handedness", "right")}
                    >
                      Right-handed
                    </button>
                    <button
                      className={inputs.handedness === "left" ? "lc-btn-primary" : "lc-btn-ghost"}
                      onClick={() => updateInput("handedness", "left")}
                    >
                      Left-handed
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400">Stand position board *</label>
                    <input className="lc-input mt-1" type="number" min={1} max={39} value={inputs.standBoard} onChange={(e) => updateInput("standBoard", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Target board *</label>
                    <input className="lc-input mt-1" type="number" min={1} max={39} value={inputs.targetBoard} onChange={(e) => updateInput("targetBoard", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Breakpoint board *</label>
                    <input className="lc-input mt-1" type="number" min={1} max={39} value={inputs.breakpointBoard} onChange={(e) => updateInput("breakpointBoard", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Breakpoint distance *</label>
                    <input className="lc-input mt-1" type="number" min={35} max={50} value={inputs.breakpointDistanceFt} onChange={(e) => updateInput("breakpointDistanceFt", Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-75">
                  <div>
                    <label className="text-xs text-zinc-500">Surface / grit override (coming soon)</label>
                    <input className="lc-input mt-1" value={inputs.surfaceOverride} placeholder="e.g., 2000" disabled />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Lane transition state (coming soon)</label>
                    <input className="lc-input mt-1" value={inputs.laneTransitionState} placeholder="fresh / transition / burn" disabled />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Axis rotation</label>
                    <input className="lc-input mt-1" type="number" min={0} max={90} value={inputs.axisRotationDeg} onChange={(e) => updateInput("axisRotationDeg", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Axis tilt</label>
                    <input className="lc-input mt-1" type="number" min={0} max={25} value={inputs.axisTiltDeg} onChange={(e) => updateInput("axisTiltDeg", Number(e.target.value))} />
                  </div>
                </div>

                {errors.length > 0 && (
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                    {errors.map((err) => (
                      <div key={err}>• {err}</div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button tone="primary" disabled={!canSimulate} onClick={runSimulation}>
                    Simulate
                  </Button>
                  {!canSimulate ? <span className="text-xs text-zinc-500">Fill all required fields to enable simulation.</span> : null}
                </div>

                {staleResult ? (
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200">
                    Inputs changed — press <span className="font-semibold">Simulate</span> to update result.
                  </div>
                ) : null}
              </div>
            </Surface>

            <div className="space-y-4">
              {!result ? (
                <Surface>
                  <SectionTitle title="Lane Visualization" subtitle="No simulation yet. Run Simulate to generate a lane tracer." />
                </Surface>
              ) : (
                <LaneViz
                  result={result}
                  handedness={submittedInputs?.handedness ?? inputs.handedness}
                  startBoard={submittedInputs?.standBoard}
                  targetBoard={submittedInputs?.targetBoard}
                  breakpointBoard={submittedInputs?.breakpointBoard}
                  breakpointDistanceFt={submittedInputs?.breakpointDistanceFt}
                />
              )}

              {!result ? (
                <Surface>
                  <SectionTitle title="Simulation Output" subtitle="Analysis appears after you click Simulate." />
                </Surface>
              ) : (
                <Surface>
                  <SectionTitle title="Coach Summary" subtitle="Shot setup and reaction readout." />
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-zinc-500">Selected ball</div><div>{selectedBall?.manufacturer} {selectedBall?.model}</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-zinc-500">Pattern</div><div>{selectedPattern?.name}</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-zinc-500">Speed / Revs</div><div>{submittedInputs?.ballSpeedMph} mph • {submittedInputs?.revRateRpm} rpm</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-zinc-500">Handedness</div><div>{submittedInputs?.handedness === "left" ? "Left" : "Right"}</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-zinc-500">Stand / Target</div><div>{submittedInputs?.standBoard} → {submittedInputs?.targetBoard}</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-zinc-500">Breakpoint plan</div><div>{submittedInputs?.breakpointBoard} @ {submittedInputs?.breakpointDistanceFt}ft</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-zinc-500">Reaction</div><div>{result.reaction_shape} • {shapeNote}</div></div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-zinc-500">Read + entry</div><div>{readPhase} read • {result.pocket_entry}</div></div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-500/5 p-4">
                    <div className="text-xs text-cyan-200">Quick reaction summary</div>
                    <div className="mt-1 text-sm text-zinc-200">
                      Skid: {result.skid_length_ft}ft • Entry angle: {result.entry_angle_degrees}° • Breakpoint: {result.breakpoint_board}
                    </div>
                    <div className="mt-2 text-sm text-zinc-300">{result.recommendation}</div>
                  </div>
                </Surface>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
