const iconClassName = "h-6 w-6";

type IconProps = {
  className?: string;
};

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? iconClassName}
      aria-hidden="true"
    >
      <path d="M8 3h6l4 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v4h4" />
      <path d="M8 11h8" />
      <path d="M8 15h6" />
    </svg>
  );
}

export function CalculatorIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? iconClassName}
      aria-hidden="true"
    >
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M8.5 7h7" />
      <path d="M9 11h.01" />
      <path d="M12 11h.01" />
      <path d="M15 11h.01" />
      <path d="M9 14h.01" />
      <path d="M12 14h.01" />
      <path d="M15 14h.01" />
      <path d="M9 17h.01" />
      <path d="M12 17h.01" />
      <path d="M15 17h.01" />
    </svg>
  );
}

export function PlayPulseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? iconClassName}
      aria-hidden="true"
    >
      <path d="M8 5.5v13l10-6.5-10-6.5z" />
      <path d="M3 12h2" />
      <path d="M19 8l2-2" />
      <path d="M19 16l2 2" />
    </svg>
  );
}

export function BlocksIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? iconClassName}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h7v7h-7z" />
    </svg>
  );
}
