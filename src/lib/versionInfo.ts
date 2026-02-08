import { coerceVersionInfo, type FluxVersionInfo } from "@flux-lang/brand";

type GetFluxVersionInfoOptions = {
  fetchImpl?: typeof fetch;
  dev?: boolean;
  now?: () => number;
  path?: string;
};

export async function getFluxVersionInfo(options: GetFluxVersionInfoOptions = {}): Promise<FluxVersionInfo> {
  const isDev = options.dev ?? import.meta.env.DEV;
  const now = options.now ?? Date.now;
  const fetchImpl = options.fetchImpl ?? (typeof fetch === "function" ? fetch.bind(globalThis) : undefined);
  const path = options.path ?? "/version.json";

  if (!fetchImpl) {
    return coerceVersionInfo({ version: "0.0.0" });
  }

  const resolvedPath = isDev ? `${path}?t=${now()}` : path;
  try {
    const response = await fetchImpl(resolvedPath, { cache: "no-store" });
    if (!response.ok) throw new Error(`Version fetch failed (${response.status})`);
    const payload = (await response.json()) as Partial<FluxVersionInfo>;
    return coerceVersionInfo(payload);
  } catch {
    return coerceVersionInfo({ version: "0.0.0" });
  }
}
