import Link from "next/link";
import { useRouter } from "next/router";

function NavItem({ href, label }: { href: string; label: string }) {
  const r = useRouter();
  const active = r.pathname === href;

  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-xl text-sm transition border",
        active
          ? "bg-white/10 text-white border-white/10"
          : "text-zinc-300 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10"
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function Nav() {
  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-400 to-emerald-300 shadow-soft" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Lane Coach</div>
            <div className="text-xs text-zinc-400">Arsenal • Simulation • Patterns</div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap justify-end">
          <NavItem href="/" label="Home" />
          <NavItem href="/arsenal" label="Arsenal" />
          <NavItem href="/simulation" label="Ball Simulation" />
          <NavItem href="/patterns" label="Patterns" />
        </div>
      </div>
    </div>
  );
}
