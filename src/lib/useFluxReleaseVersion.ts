import { useEffect, useState } from "react";
import { getNpmLatestFluxVersion } from "./npmLatestFlux";

export function useFluxReleaseVersion(fallback: string): string {
  const [version, setVersion] = useState(fallback);

  useEffect(() => {
    let alive = true;
    setVersion(fallback);
    void getNpmLatestFluxVersion().then((latest) => {
      if (!alive) return;
      if (latest) {
        setVersion(latest);
      }
    });
    return () => {
      alive = false;
    };
  }, [fallback]);

  return version;
}
