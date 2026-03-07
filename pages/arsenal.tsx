import { useEffect, useMemo, useState } from "react";
import { Nav } from "../components/Nav";
import flatCatalog from "../data/ballCatalogFlat.json";
import { BallFlat } from "../lib/types";
import { addToArsenal, clearArsenal, getArsenal, removeFromArsenal } from "../lib/store";

function makeKey(b: BallFlat) {
  const y = b.usbc_approved_on_year ?? "unknown";
  return `${b.manufacturer}__${b.model}__${y}`.toLowerCase();
}

function safeDate(b: BallFlat) {
  return b.usbc_approved_on_date ?? b.usbc_approved_on_raw ?? "unknown";
}

const inputClass =
  "w-full sm:w-auto px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white outline-none focus:ring-2 focus:ring-cyan-400/40";

const buttonPrimary =
  "px-4 py-2 rounded-xl bg-white text-zinc-950 font-medium hover:opacity-90 transition";

const buttonGhost =
  "px-4 py-2 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/15 transition";

export default function Arsenal() {
  const catalog = flatCatalog as BallFlat[];
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(80);
  const [arsenal, setArsenal] = useState(getArsenal());

  useEffect(() => setArsenal(getArsenal()), []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t
      ? catalog.filter((b) => `${b.manufacturer} ${b.model}`.toLowerCase().includes(t))
      : catalog;
    return base.slice(0, limit);
  }, [q, catalog, limit]);

  const myBalls = useMemo(() => {
    const index = new Map<string, BallFlat>();
    for (const b of catalog) index.set(makeKey(b), b);

    return arsenal
      .map((ub) => ({ ub, c: index.get(ub.catalogKey) }))
      .filter((x) => x.c);
  }, [arsenal, catalog]);

  return (
    <>
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Arsenal</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Search your USBC-approved catalog and add balls to your arsenal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-400">
              Loaded <span className="text-zinc-200 font-medium">{catalog.length.toLocaleString()}</span> balls
            </div>
            <button
              className={buttonGhost}
              onClick={() => {
                clearArsenal();
                setArsenal(getArsenal());
              }}
            >
              Clear Arsenal
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Database */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold">Ball Database</div>
                <div className="text-xs text-zinc-400">Showing {Math.min(limit, catalog.length)} results max</div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  className={inputClass}
                  placeholder="Search brand or model (e.g., Storm, Widow, Motiv)"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setLimit(80);
                  }}
                />
              </div>
            </div>

            <div className="mt-4 divide-y divide-white/10">
              {filtered.map((b) => {
                const key = makeKey(b);
                return (
                  <div key={key} className="py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {b.manufacturer} <span className="text-zinc-200">{b.model}</span>
                      </div>

                      <div className="mt-1 text-xs text-zinc-400">
                        USBC: {safeDate(b)}
                      </div>

                      <div className="mt-1 text-xs text-zinc-400">
                        Cover: {b.coverstock_type ?? "—"} • Core: {b.core_type ?? "—"} • RG: {b.rg ?? "—"} • Diff: {b.differential ?? "—"}
                      </div>
                    </div>

                    <button className={buttonPrimary} onClick={() => setArsenal(addToArsenal(key))}>
                      Add
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-400">
                Tip: Search is instant. We cap results for performance.
              </div>
              <button
                className={buttonGhost}
                onClick={() => setLimit((n) => Math.min(n + 120, catalog.length))}
              >
                Load more
              </button>
            </div>
          </div>

          {/* My Arsenal */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">My Arsenal</div>
                <div className="text-xs text-zinc-400">{myBalls.length} balls</div>
              </div>
              <a href="/simulation" className={buttonGhost}>
                Go to Simulation
              </a>
            </div>

            <div className="mt-4">
              {myBalls.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
                  No balls added yet. Add from the database to start comparing reactions.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {myBalls.map(({ ub, c }) => (
                    <div key={ub.userBallId} className="py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {c!.manufacturer} <span className="text-zinc-200">{c!.model}</span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">USBC: {safeDate(c!)}</div>
                      </div>

                      <button className={buttonGhost} onClick={() => setArsenal(removeFromArsenal(ub.userBallId))}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-zinc-400">
              Next: add per-ball overrides (surface/layout) to improve the sim.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
