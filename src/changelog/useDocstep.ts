import { useEffect, useState } from "react";

type UseDocstepOptions = {
  enabled: boolean;
  length: number;
  intervalMs?: number;
  reduceMotion: boolean;
};

export function useDocstep({ enabled, length, intervalMs = 2600, reduceMotion }: UseDocstepOptions) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [length]);

  useEffect(() => {
    if (!enabled || reduceMotion || length < 2) return undefined;
    const interval = window.setInterval(() => {
      setStep((current) => (current + 1) % length);
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, reduceMotion, length]);

  return { step, setStep };
}
