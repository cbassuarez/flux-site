import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhatIsFluxSection } from "./WhatIsFluxSection";

vi.mock("framer-motion", () => ({
  motion: {
    span: ({ children, ...props }: { children: React.ReactNode }) => <span {...props}>{children}</span>,
  },
  useReducedMotion: () => true,
}));

describe("WhatIsFluxSection", () => {
  it("pauses auto-run and disables transitions with reduced motion while allowing manual step", async () => {
    render(<WhatIsFluxSection />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /auto-run off/i })).toBeInTheDocument();
    });

    const transitionSelect = screen.getByLabelText(/transition:/i) as HTMLSelectElement;
    expect(transitionSelect.value).toBe("none");

    const section = screen.getByTestId("what-is-flux");
    expect(section.getAttribute("data-docstep")).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: /step/i }));
    expect(section.getAttribute("data-docstep")).toBe("1");
  });
});
