import { motion } from "framer-motion";
import type { ReactNode } from "react";

type CodePanelProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function CodePanel({
  title,
  subtitle,
  children,
}: CodePanelProps) {
  return (
    <motion.article
      className="rounded-xl border border-slate-200 bg-slate-50/80 shadow-sm backdrop-blur"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </span>
          {subtitle && (
            <span className="text-[11px] font-medium text-slate-400">{subtitle}</span>
          )}
        </div>
      </header>

      <div className="hero-code-scroll">{children}</div>
    </motion.article>
  );
}
