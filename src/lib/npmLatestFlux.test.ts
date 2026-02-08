import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setStorage = (value: unknown) => {
  localStorage.setItem("flux.npm.latest", JSON.stringify(value));
};

describe("getNpmLatestFluxVersion", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns dist-tags.latest when fetch succeeds", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ "dist-tags": { latest: "1.2.3" } }),
    } as Response);

    const { getNpmLatestFluxVersion } = await import("./npmLatestFlux");

    await expect(getNpmLatestFluxVersion()).resolves.toBe("1.2.3");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses localStorage cache within TTL", async () => {
    const now = 1_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    setStorage({ v: "2.0.0", t: now });
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { getNpmLatestFluxVersion } = await import("./npmLatestFlux");

    await expect(getNpmLatestFluxVersion()).resolves.toBe("2.0.0");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("expires cache after TTL and refetches", async () => {
    const { NPM_LATEST_TTL_MS, getNpmLatestFluxVersion } = await import("./npmLatestFlux");
    const now = 2_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    setStorage({ v: "2.1.0", t: now - NPM_LATEST_TTL_MS - 1 });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ "dist-tags": { latest: "2.2.0" } }),
    } as Response);

    await expect(getNpmLatestFluxVersion()).resolves.toBe("2.2.0");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null on fetch failure or malformed payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    const { getNpmLatestFluxVersion } = await import("./npmLatestFlux");

    await expect(getNpmLatestFluxVersion()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when dist-tags.latest is missing", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ name: "@flux-lang/flux" }),
    } as Response);

    const { getNpmLatestFluxVersion } = await import("./npmLatestFlux");

    await expect(getNpmLatestFluxVersion()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent requests", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(fetchPromise);

    const { getNpmLatestFluxVersion } = await import("./npmLatestFlux");

    const firstCall = getNpmLatestFluxVersion();
    const secondCall = getNpmLatestFluxVersion();

    resolveFetch?.({
      ok: true,
      json: async () => ({ "dist-tags": { latest: "3.0.0" } }),
    } as Response);

    await expect(Promise.all([firstCall, secondCall])).resolves.toEqual(["3.0.0", "3.0.0"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
