import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
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
  const baseClasses = [
    "inline-flex items-center justify-center gap-2 rounded-full border font-semibold",
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

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "border-transparent text-white shadow-sm hover:brightness-110 motion-safe:active:translate-y-px",
    secondary:
      "border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)] hover:border-[var(--ring)] hover:bg-[var(--surface-2)]",
    ghost:
      "border-transparent text-[var(--muted)] hover:bg-[var(--surface-1)] hover:text-[var(--fg)]",
    danger:
      "border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400",
  };

  return [
    ...baseClasses,
    iconOnly ? iconOnlyClasses[size] : sizeClasses[size],
    variantClasses[variant],
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

export function Button({
  variant = "primary",
  size = "md",
  iconOnly,
  className,
  style,
  ...props
}: ButtonProps) {
  const mergedStyle =
    variant === "primary"
      ? {
          background: "linear-gradient(96deg, var(--accent) 0%, var(--accent-2) 100%)",
          boxShadow: "var(--accent-shadow, 0 10px 24px rgba(14, 165, 233, 0.35))",
          ...style,
        }
      : style;

  return (
    <button
      type={props.type ?? "button"}
      className={buttonClasses({ variant, size, iconOnly, className })}
      style={mergedStyle}
      {...props}
    />
  );
}
