import { useEffect, useState } from "react";
import frame01 from "../assets/branding/flux-mark-frame-01.svg";
import frame02 from "../assets/branding/flux-mark-frame-02.svg";
import frame03 from "../assets/branding/flux-mark-frame-03.svg";

const FRAMES = [frame01, frame02, frame03, frame02, frame01];
const FRAME_DURATION_MS = 333; // ~3 fps
const PAUSE_MS = 3000; // 3s pause between runs

export function FluxMarkLogo() {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    function runLoop() {
      let i = 0;

      function step() {
        if (cancelled) return;
        setFrameIndex(i);
        i += 1;

        if (i < FRAMES.length) {
          setTimeout(step, FRAME_DURATION_MS);
        } else {
          setTimeout(() => {
            if (!cancelled) {
              i = 0;
              step();
            }
          }, PAUSE_MS);
        }
      }

      step();
    }

    runLoop();

    return () => {
      cancelled = true;
    };
  }, []);

  return <img src={FRAMES[frameIndex]} alt="Flux" className="h-6 w-auto" />;
}
