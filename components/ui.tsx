import React, { PropsWithChildren } from "react";

type SurfaceProps = PropsWithChildren<{
  className?: string;
}>;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "ghost";
};

type LinkButtonProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  tone?: "primary" | "ghost";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Surface({ className, children }: SurfaceProps) {
  return <div className={cx("lc-surface", className)}>{children}</div>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
      {subtitle ? <p className="mt-1 text-xs text-zinc-400">{subtitle}</p> : null}
    </div>
  );
}

export function Button({ tone = "ghost", className, children, ...props }: ButtonProps) {
  return (
    <button className={cx(tone === "primary" ? "lc-btn-primary" : "lc-btn-ghost", className)} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({ tone = "ghost", className, children, ...props }: LinkButtonProps) {
  return (
    <a className={cx(tone === "primary" ? "lc-btn-primary" : "lc-btn-ghost", className)} {...props}>
      {children}
    </a>
  );
}

export function MetricTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className={cx("mt-1 text-lg font-semibold", accent ?? "text-zinc-100")}>{value}</div>
    </div>
  );
}
