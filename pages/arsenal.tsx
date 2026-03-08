import { useEffect, useMemo, useState } from "react";
import { Nav } from "../components/Nav";
import { Button, LinkButton, MetricTile, SectionTitle, Surface } from "../components/ui";
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

export default function Arsenal() {
  const catalog = flatCatalog as BallFlat[];
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(80);
  const [arsenal, setArsenal] = useState([] as ReturnType<typeof getArsenal>);

  useEffect(() => setArsenal(getArsenal()), []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? catalog.filter((b) => `${b.manufacturer} ${b.model}`.toLowerCase().includes(t)) : catalog;
    return base.slice(0, limit);
  }, [q, catalog, limit]);

  const myBalls = useMemo(() => {
    const index = new Map<string, BallFlat>();
    for (const b of catalog) index.set(makeKey(b), b);

    return arsenal.map((ub) => ({ ub, c: index.get(ub.catalogKey) })).filter((x) => x.c);
  }, [arsenal, catalog]);

  return (
    <>
      <Nav />
      <div className="lc-shell">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Arsenal Intelligence Hub</h1>
            <p className="mt-2 text-sm text-zinc-300 max-w-2xl">
              Curate your premium bag from the USBC-approved catalog and stage your simulation lineup.
            </p>
          </div>
          <Button
            onClick={() => {
              clearArsenal();
              setArsenal(getArsenal());
            }}
          >
            Clear Arsenal
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Catalog" value={catalog.length.toLocaleString()} accent="text-cyan-200" />
          <MetricTile label="My Arsenal" value={String(myBalls.length)} accent="text-emerald-200" />
          <MetricTile label="Query Results" value={String(filtered.length)} />
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.25fr_.9fr] gap-4 items-start">
          <Surface>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <SectionTitle
                title="Ball Database"
                subtitle={`Showing up to ${Math.min(limit, catalog.length)} entries for fast browsing.`}
              />
              <input
                className="lc-input w-full sm:w-[340px]"
                placeholder="Search brand or model (Storm, Widow, Motiv...)"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setLimit(80);
                }}
              />
            </div>

            <div className="mt-4 max-h-[64vh] overflow-auto pr-1 divide-y divide-white/10">
              {filtered.map((b) => {
                const key = makeKey(b);
                return (
                  <div key={key} className="py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {b.manufacturer} <span className="text-zinc-200">{b.model}</span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">USBC: {safeDate(b)}</div>
                      <div className="mt-1 text-xs text-zinc-400 truncate">
                        Cover: {b.coverstock_type ?? "—"} • Core: {b.core_type ?? "—"} • RG: {b.rg ?? "—"} • Diff: {b.differential ?? "—"}
                      </div>
                    </div>
                    <Button tone="primary" onClick={() => setArsenal(addToArsenal(key))}>
                      Add
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">Instant search is capped for UI performance.</p>
              <Button onClick={() => setLimit((n) => Math.min(n + 120, catalog.length))}>Load More</Button>
            </div>
          </Surface>

          <Surface>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle title="My Arsenal" subtitle="Balls saved for simulation and pattern planning." />
              <LinkButton href="/simulation">Open Simulation</LinkButton>
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

                      <Button onClick={() => setArsenal(removeFromArsenal(ub.userBallId))}>Remove</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Surface>
        </div>
      </div>
    </>
  );
}
