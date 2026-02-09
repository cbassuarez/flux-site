import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDocstep } from "./useDocstep";

const mockRandomSequence = (values: number[]) => {
  let index = 0;
  return vi.spyOn(Math, "random").mockImplementation(() => {
    const value = values[index % values.length] ?? 0.5;
    index += 1;
    return value;
  });
};

const setupDocstep = ({
  length,
  intervalMs,
  mode,
}: {
  length: number;
  intervalMs: number;
  mode: "random";
}) => {
  const steps: number[] = [];
  let setStep: ((value: number | ((current: number) => number)) => void) | null = null;
  let currentStep = 0;

  function Harness() {
    const docstep = useDocstep({
      enabled: true,
      length,
      intervalMs,
      reduceMotion: false,
      mode,
    });
    currentStep = docstep.step;

    useEffect(() => {
      setStep = docstep.setStep;
    }, [docstep.setStep]);

    return null;
  }

  const utils = render(<Harness />);

  return {
    steps,
    getCurrentStep: () => currentStep,
    getSetStep: () => setStep,
    unmount: utils.unmount,
  };
};

describe("useDocstep random mode", () => {
  let intervalCallback: (() => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    intervalCallback = null;
    vi.spyOn(window, "setInterval").mockImplementation((callback) => {
      intervalCallback = callback as () => void;
      return 1;
    });
    vi.spyOn(window, "clearInterval").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("advances through a deck without repeats before it completes", async () => {
    mockRandomSequence([0.91, 0.3, 0.72, 0.14, 0.48]);
    const { steps, getCurrentStep, unmount } = setupDocstep({
      length: 4,
      intervalMs: 100,
      mode: "random",
    });

    await act(async () => {
      await Promise.resolve();
    });

    steps.push(getCurrentStep());

    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        intervalCallback?.();
        await Promise.resolve();
      });
      steps.push(getCurrentStep());
    }

    const sequence = steps.slice(1);
    const seen = new Set<number>([steps[0]]);
    let repeatAt = -1;
    sequence.forEach((value, index) => {
      if (repeatAt !== -1) return;
      if (seen.has(value)) {
        repeatAt = index;
        return;
      }
      seen.add(value);
    });
    expect(repeatAt).not.toBe(-1);
    expect(seen.size).toBe(4);

    unmount();
  });

  it("avoids an immediate repeat when reshuffling", async () => {
    mockRandomSequence([0.12, 0.84, 0.43, 0.76]);
    const { steps, getCurrentStep, unmount } = setupDocstep({
      length: 3,
      intervalMs: 100,
      mode: "random",
    });

    await act(async () => {
      await Promise.resolve();
    });

    steps.push(getCurrentStep());

    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        intervalCallback?.();
        await Promise.resolve();
      });
      steps.push(getCurrentStep());
    }

    const last = steps[steps.length - 1];
    const previous = steps[steps.length - 2];
    expect(last).not.toBe(previous);

    unmount();
  });

  it("syncs manual selection to avoid immediate repeats on the next tick", async () => {
    mockRandomSequence([0.22, 0.64, 0.11, 0.58, 0.37]);
    const { steps, getCurrentStep, getSetStep, unmount } = setupDocstep({
      length: 4,
      intervalMs: 100,
      mode: "random",
    });

    const setStep = getSetStep();
    expect(setStep).not.toBeNull();

    await act(async () => {
      await Promise.resolve();
    });

    steps.push(getCurrentStep());

    await act(async () => {
      setStep?.(2);
      await Promise.resolve();
    });

    steps.push(getCurrentStep());

    await act(async () => {
      intervalCallback?.();
      await Promise.resolve();
    });

    steps.push(getCurrentStep());

    expect(steps[steps.length - 1]).not.toBe(2);

    unmount();
  });
});
