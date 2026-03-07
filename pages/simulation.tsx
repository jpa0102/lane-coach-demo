import Nav from "../components/Nav";

export default function Simulation() {
  return (
    <>
      <Nav />
      <div className="lc-shell">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Ball Simulator</h1>
            <p className="text-sm opacity-70 mt-2">
              Simulator page is loading correctly.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
