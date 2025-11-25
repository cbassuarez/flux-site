import { motion } from "framer-motion";
import { useCallback, useState } from "react";

const installCommand = "npm install flux-language";

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
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 flux-gradient-bg" />
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Install via npm
          </span>
          <code className="rounded-md bg-slate-50 px-2 py-1 font-mono text-sm text-slate-800">
            {installCommand}
          </code>
        </div>
        <motion.button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center rounded-full flux-gradient-bg px-4 py-2 text-xs font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {copied ? "Copied" : "Copy"}
        </motion.button>
      </div>
    </motion.div>
  );
}
