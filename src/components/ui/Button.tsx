import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, HTMLAttributes } from "react";
import { forwardRef, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, type LinkProps } from "react-router-dom";

export type ButtonVariant =
  | "glass"
  | "solid"
  | "ghost"
  | "badge"
  | "primary"
  | "secondary"
  | "tertiary"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  className?: string;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  iconOnly = false,
  className,
}: ButtonStyleOptions = {}) {
  const resolvedVariant = normalizeVariant(variant);

  const baseClasses = [
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden",
    "rounded-[var(--radius-button)] border font-semibold font-body",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "motion-safe:transition motion-safe:duration-200",
  ];

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-base",
  };

  const iconOnlyClasses: Record<ButtonSize, string> = {
    sm: "h-8 w-8 p-0",
    md: "h-10 w-10 p-0",
    lg: "h-12 w-12 p-0",
  };

  const variantClasses: Record<ReturnType<typeof normalizeVariant>, string> = {
    glass: [
      "border-[color:color-mix(in_srgb,var(--flux-accent)_45%,var(--border))]",
      "flux-gradient-bg text-white",
      "shadow-[0_12px_30px_rgba(0,205,254,0.28)]",
      "backdrop-blur-sm",
      "hover:brightness-110",
    ].join(" "),
    solid:
      "border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)] shadow-sm hover:border-[color:color-mix(in_srgb,var(--button-hover-tint)_45%,var(--border))] hover:bg-[color:color-mix(in_srgb,var(--button-hover-tint)_18%,var(--surface-1))]",
    ghost:
      "border-transparent bg-transparent text-[var(--muted)] hover:bg-[color:color-mix(in_srgb,var(--accent)_10%,var(--surface-1))] hover:text-[var(--fg)]",
    badge:
      "border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)] shadow-sm hover:border-[var(--ring)]",
  };

  const badgeSizing = "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]";
  const sizeClass =
    resolvedVariant === "badge"
      ? badgeSizing
      : iconOnly
        ? iconOnlyClasses[size]
        : sizeClasses[size];

  return [
    ...baseClasses,
    sizeClass,
    variantClasses[resolvedVariant],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
};

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
};

type ButtonAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "muted";
};

const sheenClassName =
  "pointer-events-none absolute inset-0 overflow-hidden rounded-[var(--radius-button)]";

const sheenSweepClassName = [
  "absolute -left-1/2 top-0 h-full w-1/2",
  "bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.5),transparent)]",
  "opacity-0",
  "motion-safe:transition motion-safe:duration-500 motion-safe:ease-out",
  "motion-safe:group-hover:translate-x-[220%] motion-safe:group-hover:opacity-70",
].join(" ");

const useButtonMotion = () => {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) {
    return {};
  }
  return {
    whileHover: { y: -2 },
    whileTap: { scale: 0.98 },
    transition: { type: "spring", stiffness: 320, damping: 22 },
  };
};

const pickHoverTint = () => (Math.random() < 0.5 ? "var(--flux-accent)" : "var(--flux-accent-green)");

const useSolidHoverStyle = (variant: ButtonVariant) => {
  const isSolid = normalizeVariant(variant) === "solid";
  const [hoverTint, setHoverTint] = useState<string>("var(--flux-accent)");

  return useMemo(() => {
    if (!isSolid) {
      return {
        style: undefined,
        onMouseEnter: undefined,
      } as const;
    }

    return {
      style: { "--button-hover-tint": hoverTint } as CSSProperties,
      onMouseEnter: () => setHoverTint(pickHoverTint()),
    } as const;
  }, [hoverTint, isSolid]);
};

function normalizeVariant(variant: ButtonVariant = "glass") {
  if (variant === "primary") return "glass";
  if (variant === "secondary") return "solid";
  if (variant === "tertiary") return "ghost";
  if (variant === "danger") return "solid";
  return variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "glass", size = "md", iconOnly, className, children, ...props },
  ref,
) {
  const motionProps = useButtonMotion();
  const isGlass = normalizeVariant(variant) === "glass";
  const { style, onMouseEnter } = useSolidHoverStyle(variant);
  const mergedStyle = { ...style, ...props.style } as CSSProperties;

  return (
    <motion.button
      ref={ref}
      type={props.type ?? "button"}
      className={buttonClasses({ variant, size, iconOnly, className })}
      {...motionProps}
      onMouseEnter={(event) => {
        onMouseEnter?.();
        props.onMouseEnter?.(event);
      }}
      style={mergedStyle}
      {...props}
    >
      {children}
      {isGlass ? (
        <span aria-hidden className={sheenClassName}>
          <span className={sheenSweepClassName} />
        </span>
      ) : null}
    </motion.button>
  );
});

export function ButtonLink({ variant = "glass", size = "md", iconOnly, className, ...props }: ButtonLinkProps) {
  const motionProps = useButtonMotion();
  const isGlass = normalizeVariant(variant) === "glass";
  const MotionLink = motion(Link);
  const { style, onMouseEnter } = useSolidHoverStyle(variant);
  const mergedStyle = { ...style, ...props.style } as CSSProperties;

  return (
    <MotionLink
      className={buttonClasses({ variant, size, iconOnly, className })}
      {...motionProps}
      onMouseEnter={(event) => {
        onMouseEnter?.();
        props.onMouseEnter?.(event);
      }}
      style={mergedStyle}
      {...props}
    >
      {props.children}
      {isGlass ? (
        <span aria-hidden className={sheenClassName}>
          <span className={sheenSweepClassName} />
        </span>
      ) : null}
    </MotionLink>
  );
}

export function ButtonAnchor({
  variant = "glass",
  size = "md",
  iconOnly,
  className,
  ...props
}: ButtonAnchorProps) {
  const motionProps = useButtonMotion();
  const isGlass = normalizeVariant(variant) === "glass";
  const MotionAnchor = motion.a;
  const { style, onMouseEnter } = useSolidHoverStyle(variant);
  const mergedStyle = { ...style, ...props.style } as CSSProperties;

  return (
    <MotionAnchor
      className={buttonClasses({ variant, size, iconOnly, className })}
      {...motionProps}
      onMouseEnter={(event) => {
        onMouseEnter?.();
        props.onMouseEnter?.(event);
      }}
      style={mergedStyle}
      {...props}
    >
      {props.children}
      {isGlass ? (
        <span aria-hidden className={sheenClassName}>
          <span className={sheenSweepClassName} />
        </span>
      ) : null}
    </MotionAnchor>
  );
}

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  const toneClasses =
    tone === "muted" ? "text-[var(--muted)] bg-[var(--surface-2)]" : "text-[var(--fg)] bg-[var(--surface-1)]";
  return (
    <span
      className={[
        "inline-flex items-center rounded-[var(--radius-button)] border border-[var(--border)]",
        "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] font-body",
        toneClasses,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
