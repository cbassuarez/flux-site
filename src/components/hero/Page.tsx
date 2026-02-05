import type { ReactNode } from "react";

type PageProps = {
  children: ReactNode;
  pageNumber: number;
  totalPages: number;
  label?: string;
};

export function Page({ children, pageNumber, totalPages, label }: PageProps) {
  return (
    <div className="pointer-events-none relative h-full w-full select-none rounded-[28px] border border-slate-200/80 bg-white shadow-[0_28px_60px_rgba(15,23,42,0.12)]">
      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-white via-white to-slate-100/70" />
      <div className="absolute -right-3 -top-3 h-20 w-20 rounded-bl-[24px] bg-gradient-to-br from-white/10 via-white/60 to-slate-200/60 opacity-80" />
      <div className="absolute inset-0 rounded-[28px] ring-1 ring-slate-200/50" />

      <div className="relative z-10 flex h-full flex-col px-[10%] py-[9%]">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          <span>{label}</span>
        </div>

        <div className="mt-5 flex-1 font-serif text-[13px] leading-relaxed text-slate-700">
          {children}
        </div>

        <div className="mt-6 flex items-center justify-between text-[10px] font-medium text-slate-400">
          <span>Flux Demo Packet</span>
          <span>
            {pageNumber} / {totalPages}
          </span>
        </div>
      </div>
    </div>
  );
}
