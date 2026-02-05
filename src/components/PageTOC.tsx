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
              "border border-slate-200 bg-slate-50",
              "px-3 text-xs font-medium leading-none text-slate-700",
              "shadow-sm transition",
              "hover:border-sky-300 hover:bg-white",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            ].join(" ")}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
