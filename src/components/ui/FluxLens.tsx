import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

type FluxLensPreset = "header" | "hero" | "default";

type FluxLensProps = {
  children: ReactNode;
  preset?: FluxLensPreset;
  className?: string;
  as?: "span" | "div";
  stretch?: number;
  radius?: number;
  tint?: boolean;
};

const PRESET_CONFIG: Record<FluxLensPreset, { radius: number; stretch: number; feather: number }> = {
  header: { radius: 42, stretch: 1.12, feather: 18 },
  hero: { radius: 96, stretch: 1.1, feather: 26 },
  default: { radius: 56, stretch: 1.1, feather: 20 },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function FluxLens({
  children,
  preset = "default",
  className,
  as = "span",
  stretch,
  radius,
  tint = true,
}: FluxLensProps) {
  const Component = as;
  const prefersReducedMotion = useReducedMotion();
  const [supportsHover, setSupportsHover] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 50, y: 50 });
  const currentRef = useRef({ x: 50, y: 50 });
  const activeRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    setSupportsHover(media.matches);
    const handleChange = (event: MediaQueryListEvent) => setSupportsHover(event.matches);
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const canTrack = supportsHover && !prefersReducedMotion;

  useEffect(() => {
    if (!canTrack) {
      setIsActive(false);
      activeRef.current = false;
    }
  }, [canTrack]);

  const presetConfig = PRESET_CONFIG[preset];
  const stretchValue = stretch ?? presetConfig.stretch;
  const radiusValue = radius ?? presetConfig.radius;
  const styleVars = useMemo(
    () =>
      ({
        "--flux-lens-r": `${radiusValue}px`,
        "--flux-lens-feather": `${presetConfig.feather}px`,
        "--flux-lens-stretch": String(stretchValue),
        "--flux-lens-unstretch": String(1 / stretchValue),
      }) as CSSProperties,
    [radiusValue, presetConfig.feather, stretchValue]
  );

  const scheduleFrame = () => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const root = rootRef.current;
      if (!root) return;
      const current = currentRef.current;
      const target = targetRef.current;
      const ease = 0.18;
      current.x += (target.x - current.x) * ease;
      current.y += (target.y - current.y) * ease;
      root.style.setProperty("--flux-lens-x", `${current.x}%`);
      root.style.setProperty("--flux-lens-y", `${current.y}%`);
      const delta = Math.abs(target.x - current.x) + Math.abs(target.y - current.y);
      if (delta > 0.2 || activeRef.current) {
        scheduleFrame();
      }
    });
  };

  const updateTargetFromEvent = (event: React.PointerEvent<HTMLElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    targetRef.current = { x, y };
    scheduleFrame();
  };

  const handlePointerEnter = (event: React.PointerEvent<HTMLElement>) => {
    if (!canTrack) return;
    activeRef.current = true;
    setIsActive(true);
    updateTargetFromEvent(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!canTrack) return;
    updateTargetFromEvent(event);
  };

  const handlePointerLeave = () => {
    if (!canTrack) return;
    activeRef.current = false;
    setIsActive(false);
  };

  return (
    <Component
      ref={rootRef}
      className={[
        "flux-lens",
        `flux-lens--${preset}`,
        tint ? "flux-lens--tint" : "",
        prefersReducedMotion ? "flux-lens--reduced" : "",
        isActive ? "flux-lens--active" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={styleVars}
      onPointerEnter={canTrack ? handlePointerEnter : undefined}
      onPointerMove={canTrack ? handlePointerMove : undefined}
      onPointerLeave={canTrack ? handlePointerLeave : undefined}
    >
      <span className="flux-lens__base">{children}</span>
      <span className="flux-lens__overlay" aria-hidden="true">
        {children}
      </span>
    </Component>
  );
}
