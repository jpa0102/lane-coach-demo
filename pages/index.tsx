import { Nav } from "../components/Nav";

export default function Home() {
  return (
    <>
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Lane Coach</h1>
              <p className="mt-2 text-zinc-300 max-w-2xl">
                Modern demo: build an arsenal from your USBC-approved catalog and compare ball motion + breakpoint on patterns.
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href="/arsenal"
                className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-medium hover:opacity-90 transition"
              >
                Go to Arsenal
              </a>
              <a
                href="/simulation"
                className="px-4 py-2 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/15 transition"
              >
                Ball Simulation
              </a>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Arsenal</div>
              <div className="mt-1 text-sm text-zinc-400">
                Search your catalog and build “My Arsenal”.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Simulation</div>
              <div className="mt-1 text-sm text-zinc-400">
                Compare two balls on the same or different lines.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Patterns</div>
              <div className="mt-1 text-sm text-zinc-400">
                Demo pattern list (we’ll ingest real PBA sheets next).
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-zinc-400">
            Make sure your export JSON is pasted into{" "}
            <span className="text-zinc-200 font-medium">data/ballCatalogFlat.json</span>.
          </div>
        </div>
      </div>
    </>
  );
}
