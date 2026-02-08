import type { ReactNode } from "react";

type SiteContainerProps = {
  children: ReactNode;
  className?: string;
};

export function SiteContainer({ children, className }: SiteContainerProps) {
  const baseClasses = "mx-auto w-full max-w-6xl px-6";
  const mergedClassName = className ? `${baseClasses} ${className}` : baseClasses;

  return <div className={mergedClassName}>{children}</div>;
}
