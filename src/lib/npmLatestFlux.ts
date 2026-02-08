const NPM_REGISTRY_URL = "https://registry.npmjs.org";
const NPM_PACKAGE_NAME = "@flux-lang/flux";
const STORAGE_KEY = "flux.npm.latest";
const FETCH_TIMEOUT_MS = 4000;
export const NPM_LATEST_TTL_MS = 12 * 60 * 60 * 1000;

type CachePayload = {
  v: string;
  t: number;
};

let memoryCache: CachePayload | null = null;
let inFlight: Promise<string | null> | null = null;

const isFresh = (payload: CachePayload, now: number) => now - payload.t < NPM_LATEST_TTL_MS;

const readStorage = (): CachePayload | null => {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed || typeof parsed.v !== "string" || typeof parsed.t !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStorage = (payload: CachePayload) => {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures silently.
  }
};

const fetchLatestVersion = async (): Promise<string | null> => {
  if (typeof fetch !== "function") return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const encodedPackageName = encodeURIComponent(NPM_PACKAGE_NAME);
  const url = `${NPM_REGISTRY_URL}/${encodedPackageName}`;

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const payload = (await response.json()) as { "dist-tags"?: { latest?: string } };
    const latest = payload?.["dist-tags"]?.latest;
    return typeof latest === "string" && latest.trim() ? latest.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export async function getNpmLatestFluxVersion(): Promise<string | null> {
  const now = Date.now();
  if (memoryCache && isFresh(memoryCache, now)) {
    return memoryCache.v;
  }

  const stored = readStorage();
  if (stored && isFresh(stored, now)) {
    memoryCache = stored;
    return stored.v;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const latest = await fetchLatestVersion();
    if (latest) {
      const payload = { v: latest, t: Date.now() };
      memoryCache = payload;
      writeStorage(payload);
    }
    return latest;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
