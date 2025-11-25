import type { ReactNode } from "react";

type CodePanelProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function CodePanel({ title, subtitle, children }: CodePanelProps) {
  return (
    <section className="code-panel flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900/95 shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-800/80 px-3 py-2 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/20 px-2 py-[2px] text-[10px] font-medium text-emerald-200">
            {title}
          </span>
        </div>
        {subtitle ? (
          <span className="font-mono text-[10px] text-slate-500">{subtitle}</span>
        ) : null}
      </header>
      <div className="hero-code-scroll flex-1">{children}</div>
    </section>
  );
}
