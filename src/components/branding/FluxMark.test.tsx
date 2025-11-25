import { act, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { FluxMark } from "./FluxMark";

describe("FluxMark", () => {
  it("renders the full mark by default", () => {
    render(<FluxMark />);
    expect(screen.getByTestId("flux-mark-full")).toBeInTheDocument();
  });

  it("cycles frames when animated", async () => {
    vi.useFakeTimers();
    const intervalSpy = vi.spyOn(global, "setInterval");

    render(<FluxMark variant="frame" />);

    expect(screen.getByTestId("flux-mark-frame-animated")).toBeInTheDocument();
    expect(intervalSpy).toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });

    expect(intervalSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    vi.useRealTimers();
  });

  it("renders the pill variant with text", () => {
    render(<FluxMark variant="pill" animate={false} />);
    expect(screen.getByTestId("flux-mark-pill")).toBeInTheDocument();
    expect(screen.getByText("flux language")).toBeInTheDocument();
  });
});
