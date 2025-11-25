import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import fluxMarkFull from "../../assets/branding/flux-mark-full.svg";
import fluxFrame01 from "../../assets/branding/flux-mark-frame-01.svg";
import fluxFrame02 from "../../assets/branding/flux-mark-frame-02.svg";
import fluxFrame03 from "../../assets/branding/flux-mark-frame-03.svg";

type FluxMarkVariant = "full" | "frame" | "pill";

interface FluxMarkProps {
  variant?: FluxMarkVariant;
  animate?: boolean;
  className?: string;
}

const frameSources = [fluxFrame01, fluxFrame02, fluxFrame03];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export function FluxMark({ variant = "full", animate, className }: FluxMarkProps) {
  const resolvedAnimate = useMemo(() => {
    if (typeof animate === "boolean") return animate;
    return variant === "frame";
  }, [animate, variant]);

  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (variant !== "frame" || !resolvedAnimate) return undefined;
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frameSources.length);
    }, 1300);
    return () => clearInterval(interval);
  }, [resolvedAnimate, variant]);

  if (variant === "pill") {
    return (
      <div className={cx("flux-mark-pill flux-gradient-border", className)} data-testid="flux-mark-pill">
        <FluxMark variant="frame" animate={resolvedAnimate} className="flux-mark-pill-icon" />
        <span className="flux-mark-pill-text">flux language</span>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <img
        src={fluxMarkFull}
        alt="Flux mark"
        className={cx("h-10 w-auto", className)}
        data-testid="flux-mark-full"
      />
    );
  }

  if (!resolvedAnimate) {
    return (
      <img
        src={frameSources[0]}
        alt="Flux frame"
        className={cx("h-10 w-10", className)}
        data-testid="flux-mark-frame"
      />
    );
  }

  const currentFrame = frameSources[frameIndex % frameSources.length];

  return (
    <div className={cx("relative h-10 w-10", className)} data-testid="flux-mark-frame-animated">
      <AnimatePresence mode="wait" initial={false}>
        <motion.img
          key={currentFrame}
          src={currentFrame}
          alt="Flux frame"
          className="absolute inset-0 h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        />
      </AnimatePresence>
    </div>
  );
}
