import { useEffect, useState } from "react";
import frame01 from "../../assets/branding/flux-mark-frame-01.svg";
import frame02 from "../../assets/branding/flux-mark-frame-02.svg";
import frame03 from "../../assets/branding/flux-mark-frame-03.svg";
import fullMark from "../../assets/branding/flux-mark-full.svg";

interface FluxMarkAnimatedProps {
  className?: string;
}

const sequence = [frame01, frame02, frame03, frame02, frame01];
const frameDuration = 1000 / 3; // 3fps
const pauseDuration = 3000;

export function FluxMarkAnimated({ className }: FluxMarkAnimatedProps) {
  const [current, setCurrent] = useState<string>(fullMark);

  useEffect(() => {
    const timers: Array<number> = [];

    const runLoop = () => {
      timers.splice(0, timers.length);
      sequence.forEach((frame, idx) => {
        const timerId = window.setTimeout(() => setCurrent(frame), idx * frameDuration);
        timers.push(timerId);
      });

      const loopDelay = sequence.length * frameDuration + pauseDuration;
      const resetTimer = window.setTimeout(() => {
        setCurrent(fullMark);
        runLoop();
      }, loopDelay);
      timers.push(resetTimer);
    };

    runLoop();

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return <img src={current} alt="Flux logo" className={className ?? "h-10 w-auto"} />;
}
