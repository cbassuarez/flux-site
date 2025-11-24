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
      <div className="flex snap-x gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="snap-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-white"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
