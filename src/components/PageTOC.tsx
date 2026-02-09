import { ButtonAnchor } from "./ui/Button";

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
          <ButtonAnchor
            key={item.id}
            href={`#${item.id}`}
            variant="badge"
            size="sm"
            className="snap-start shrink-0 whitespace-nowrap select-none normal-case tracking-[0.14em]"
          >
            {item.label}
          </ButtonAnchor>
        ))}
      </div>
    </nav>
  );
}
