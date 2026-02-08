import { useEffect, useId, useRef, useState } from "react";
import { type Theme, useTheme } from "../lib/theme";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "blueprint", label: "Blueprint" },
];

const iconClassName = "h-5 w-5";

function SunIcon() {
  return (
    <svg
      className={iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M4.9 4.9l1.4 1.4" />
      <path d="M17.7 17.7l1.4 1.4" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M4.9 19.1l1.4-1.4" />
      <path d="M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className={iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function BlueprintIcon() {
  return (
    <svg
      className={iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 8h4" />
      <path d="M8 12h8" />
      <path d="M8 16h6" />
      <path d="M14 8v8" />
    </svg>
  );
}

const THEME_ICONS: Record<Theme, () => JSX.Element> = {
  light: SunIcon,
  dark: MoonIcon,
  blueprint: BlueprintIcon,
};

export function ThemeOrb() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Record<Theme, HTMLButtonElement | null>>({
    light: null,
    dark: null,
    blueprint: null,
  });
  const popoverId = useId();
  const CurrentIcon = THEME_ICONS[theme];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const target = optionRefs.current[theme];
    if (target) {
      requestAnimationFrame(() => target.focus());
    }
  }, [isOpen, theme]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-4 z-40 flex items-center md:bottom-auto md:right-6 md:top-4"
    >
      <div className="relative">
        <button
          type="button"
          aria-label="Theme"
          aria-expanded={isOpen}
          aria-controls={popoverId}
          onClick={() => setIsOpen((prev) => !prev)}
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]",
            "bg-[var(--surface-1)] text-[var(--fg)] shadow-sm",
            "transition focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-[color-mix(in_srgb,#22d3ee_60%,#22c55e_60%)]",
            "hover:shadow-[0_0_0_2px_color-mix(in_srgb,#22d3ee_50%,#22c55e_50%)]",
          ].join(" ")}
        >
          <CurrentIcon />
        </button>

        {isOpen ? (
          <div
            id={popoverId}
            role="dialog"
            aria-label="Theme selection"
            className={[
              "absolute right-0 mt-2 flex items-center gap-2 rounded-xl border border-[var(--border)]",
              "bg-[var(--surface-1)] p-2 shadow-lg",
              "bottom-full mb-2 mt-0 md:bottom-auto md:mb-0 md:mt-2",
            ].join(" ")}
          >
            {THEME_OPTIONS.map((option) => {
              const isActive = theme === option.value;
              const OptionIcon = THEME_ICONS[option.value];
              return (
                <button
                  key={option.value}
                  ref={(node) => {
                    optionRefs.current[option.value] = node;
                  }}
                  type="button"
                  aria-label={`${option.label} theme`}
                  aria-pressed={isActive}
                  title={option.label}
                  onClick={() => {
                    setTheme(option.value);
                    setIsOpen(false);
                  }}
                  className={[
                    "relative flex h-8 w-8 items-center justify-center rounded-full",
                    "text-[var(--fg)] transition focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-[color-mix(in_srgb,#22d3ee_60%,#22c55e_60%)]",
                    isActive
                      ? "shadow-[inset_0_0_0_1.5px_var(--ring)]"
                      : "shadow-[inset_0_0_0_1px_var(--border)] hover:shadow-[inset_0_0_0_1px_var(--ring)]",
                  ].join(" ")}
                >
                  <OptionIcon />
                  {isActive ? (
                    <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--ring)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
