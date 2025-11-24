import type { ReactNode } from "react";

type PageLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerSlot?: ReactNode;
};

export function PageLayout({ title, subtitle, children, headerSlot }: PageLayoutProps) {
  return (
    <section className="bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-10 sm:px-6 sm:pt-12">
        <header className="mb-6 space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
          {headerSlot && <div className="pt-2">{headerSlot}</div>}
        </header>

        <div className="space-y-10 text-sm sm:text-base text-slate-700">{children}</div>
      </div>
    </section>
  );
}
