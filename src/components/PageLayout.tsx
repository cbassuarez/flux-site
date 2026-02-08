import type { ReactNode } from "react";
import { SiteContainer } from "./SiteContainer";

type PageLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerSlot?: ReactNode;
  eyebrow?: ReactNode;
  contentClassName?: string;
};

export function PageLayout({
  title,
  subtitle,
  children,
  headerSlot,
  eyebrow,
  contentClassName,
}: PageLayoutProps) {
  const mergedContentClassName = contentClassName
    ? `w-full ${contentClassName}`
    : "w-full max-w-3xl";

  return (
    <section className="bg-white text-slate-900">
      <SiteContainer className="pb-12 pt-10 sm:pt-12">
        <div className={mergedContentClassName}>
          <header className="mb-6 space-y-2">
            {eyebrow && <div className="mb-2">{eyebrow}</div>}
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
            {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
            {headerSlot && <div className="pt-2">{headerSlot}</div>}
          </header>

          <div className="space-y-10 text-sm sm:text-base text-slate-700">{children}</div>
        </div>
      </SiteContainer>
    </section>
  );
}
