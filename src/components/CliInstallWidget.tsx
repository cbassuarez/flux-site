import { motion } from "framer-motion";
import { useCallback, useState } from "react";

const installCommand = "npm i -g @flux-lang/flux";

export function CliInstallWidget() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(installCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch (err) {
      // silent fallback
    }
  }, []);

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 flux-gradient-bg" />
      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            I. Install via npm
          </span>
          <motion.button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] shadow-sm transition hover:border-[var(--ring)] hover:text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {copied ? "Copied" : "Copy"}
          </motion.button>
        </div>
        <code className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--fg)]">
          {installCommand}
        </code>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--muted)] sm:justify-start">
          <span>
            II. Update Flux:{" "}
            <code className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[11px] text-[var(--fg)]">
              flux self update
            </code>
          </span>
          <span>
            III. Run Launcher:{" "}
            <code className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[11px] text-[var(--fg)]">
              flux
            </code>
          </span>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <code className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[11px] text-[var(--fg)]">
            flux self update
          </code>{" "}
          updates the full toolchain via the launcher.
        </p>
      </div>
    </motion.div>
  );
}
