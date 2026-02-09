import { useCallback, useEffect, useRef, useState } from "react";

type UseDocstepOptions = {
  enabled: boolean;
  length: number;
  intervalMs?: number;
  reduceMotion: boolean;
  mode?: "sequential" | "random";
};

const clampStep = (value: number, length: number) => {
  if (length <= 0) return 0;
  return ((value % length) + length) % length;
};

const buildDeck = (length: number, currentStep?: number) => {
  const deck = Array.from({ length }, (_, index) => index);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  if (length > 1 && currentStep !== undefined && deck[0] === currentStep) {
    [deck[0], deck[1]] = [deck[1], deck[0]];
  }
  return deck;
};

export function useDocstep({
  enabled,
  length,
  intervalMs = 2600,
  reduceMotion,
  mode = "sequential",
}: UseDocstepOptions) {
  const [step, setStepState] = useState(0);
  const stepRef = useRef(step);
  const deckRef = useRef<number[]>([]);
  const posRef = useRef(0);
  const remainingRef = useRef(0);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    setStepState((current) => clampStep(current, length));
    if (mode === "random" && length > 0) {
      deckRef.current = buildDeck(length, stepRef.current);
      posRef.current = Math.max(deckRef.current.indexOf(stepRef.current), 0);
      remainingRef.current = Math.max(deckRef.current.length - 1, 0);
    }
  }, [length, mode]);

  useEffect(() => {
    if (!enabled || reduceMotion || length < 2) return undefined;
    const interval = window.setInterval(() => {
      if (mode === "random") {
        setStepState((current) => {
          if (deckRef.current.length !== length) {
            deckRef.current = buildDeck(length, current);
            posRef.current = Math.max(deckRef.current.indexOf(current), 0);
            remainingRef.current = Math.max(deckRef.current.length - 1, 0);
          }
          if (remainingRef.current <= 0) {
            deckRef.current = buildDeck(length, current);
            posRef.current = Math.max(deckRef.current.indexOf(current), 0);
            remainingRef.current = Math.max(deckRef.current.length - 1, 0);
          }
          const deckLength = deckRef.current.length;
          if (deckLength < 2) return current;
          const nextPos = (posRef.current + 1) % deckLength;
          posRef.current = nextPos;
          remainingRef.current -= 1;
          return deckRef.current[nextPos] ?? current;
        });
        return;
      }
      setStepState((current) => (current + 1) % length);
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, reduceMotion, length, mode]);

  const setStep = useCallback(
    (value: number | ((current: number) => number)) => {
      setStepState((current) => {
        const nextValue = typeof value === "function" ? value(current) : value;
        const clamped = clampStep(nextValue, length);
        if (mode === "random" && length > 0) {
          if (deckRef.current.length !== length) {
            deckRef.current = buildDeck(length, clamped);
          }
          let index = deckRef.current.indexOf(clamped);
          if (index === -1) {
            deckRef.current = buildDeck(length, clamped);
            index = deckRef.current.indexOf(clamped);
          }
          posRef.current = Math.max(index, 0);
          remainingRef.current = Math.max(deckRef.current.length - 1, 0);
        }
        return clamped;
      });
    },
    [length, mode],
  );

  return { step, setStep };
}
