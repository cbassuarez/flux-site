type TocItem = {
  id: string;
  label: string;
};

type PageTOCProps = {
  items: TocItem[];
};

export function PageTOC({ items }: PageTOCProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Page sections">
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={[
              "snap-start",
              "inline-flex items-center",
              "shrink-0 whitespace-nowrap select-none",
              "h-8 rounded-full",
              "border border-[var(--border)] bg-[var(--surface-1)]",
              "px-3 text-xs font-medium leading-none text-[var(--fg)]",
              "shadow-sm transition",
              "hover:border-[var(--ring)] hover:bg-[var(--surface-2)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]",
            ].join(" ")}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
