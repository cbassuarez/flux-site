import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FLUX_TAGLINE } from "@flux-lang/brand";
import { Header } from "./Header";

describe("Header", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the shared brand lockup with version and tagline", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ version: "0.1.4", channel: "stable" }),
    } as Response);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("v0.1.4").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByTestId("flux-wordmark").length).toBeGreaterThan(0);
    expect(screen.getAllByText(FLUX_TAGLINE).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("flux-mark").length).toBeGreaterThan(0);
    expect(document.querySelector('.flux-brand-wordmark[data-flux-ligatures="enabled"]')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalled();
  });
});
