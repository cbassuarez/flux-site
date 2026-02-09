import { useEffect, useState } from "react";
import { parseChangelogData } from "./schema";
import type { ChangelogData } from "./types";

export function useChangelogData() {
  const [data, setData] = useState<ChangelogData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const load = async () => {
      setStatus("loading");
      try {
        const response = await fetch("/changelog.json", { signal: controller.signal });
        if (!response.ok) throw new Error(`Failed to load changelog: ${response.status}`);
        const json = (await response.json()) as unknown;
        const parsed = parseChangelogData(json);
        if (isMounted) {
          setData(parsed);
          setStatus(parsed ? "ready" : "error");
        }
      } catch (error) {
        if (!isMounted) return;
        if ((error as Error).name === "AbortError") return;
        setStatus("error");
      }
    };

    void load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return { data, status };
}
