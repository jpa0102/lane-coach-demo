import { Nav } from "../components/Nav";
import patterns from "../data/pbaPatterns.json";
import { Pattern } from "../lib/types";

export default function Patterns() {
  const list = patterns as Pattern[];

  return (
    <>
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Patterns</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Demo patterns used by the simulation UI. Next step: ingest real PBA sheets.
            </p>
          </div>
          <a
            href="/simulation"
            className="px-4 py-2 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/15 transition"
          >
            Go to Simulation
          </a>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-soft">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="mt-2 text-xs text-zinc-400">
                  Length: {p.lengthFt}ft • Volume: {p.volume} • Ratio: {p.ratio} • Shape: {p.shape}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
