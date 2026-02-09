import { useId, useState } from "react";
import { SiteContainer } from "../SiteContainer";
import {
  BlocksIcon,
  CalculatorIcon,
  DocumentIcon,
  PlayPulseIcon,
} from "./HomeConceptIcons";

type ConceptItem = {
  title: string;
  teaser: string;
  description: string;
  snippet?: string;
  Icon: typeof DocumentIcon;
};

const concepts: ConceptItem[] = [
  {
    title: "Structured source",
    teaser: "A .flux file is source you can parse, validate, and render.",
    description:
      "Each document has a readable source and a dependable AST/IR snapshot, so the same file can power tools, layouts, and exports.",
    Icon: DocumentIcon,
  },
  {
    title: "Computer algebra inside the doc",
    teaser: "Values can be computed and related alongside what you write.",
    description:
      "Parameters, relationships, and computed values live beside the prose, keeping source data and presentation in sync.",
    Icon: CalculatorIcon,
  },
  {
    title: "Refresh types",
    teaser: "Documents can play over time—deterministic or stochastic.",
    description:
      "Refresh types like poisson or docstep let documents evolve with controlled timing, so updates remain predictable and repeatable.",
    snippet: "refresh: poisson(2.5s)",
    Icon: PlayPulseIcon,
  },
  {
    title: "Composable elements",
    teaser: "A small set of elements builds complex docs.",
    description:
      "Paragraphs, pages, inline slots, and tables combine into complex scores without a sprawling element list.",
    Icon: BlocksIcon,
  },
];

export function ConceptsSection() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="border-t border-[var(--border)] bg-[var(--surface-0)] py-16">
      <SiteContainer className="space-y-10">
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
            Concepts
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-[var(--fg)] md:text-3xl">
              Flux documents are living documents.
            </h2>
            <p className="text-sm text-[var(--muted)] md:text-base">
              Word meets computer algebra meets a DAW.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {concepts.map((concept, index) => {
            const isOpen = openIndex === index;
            const panelId = `${baseId}-panel-${index}`;
            const buttonId = `${baseId}-button-${index}`;
            const Icon = concept.Icon;

            return (
              <div
                key={concept.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm transition hover:border-[var(--ring)] hover:bg-[var(--surface-2)]"
              >
                <button
                  type="button"
                  id={buttonId}
                  className="flex w-full items-start justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => {
                    setOpenIndex(isOpen ? null : index);
                  }}
                >
                  <span className="space-y-2">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
                      <span className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--fg)]">
                        <Icon />
                      </span>
                      {concept.title}
                    </span>
                    <span className="block text-sm text-[var(--muted)]">{concept.teaser}</span>
                  </span>
                  <span
                    className="mt-1 text-[var(--muted)]"
                    aria-hidden="true"
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="mt-4 space-y-3 text-sm text-[var(--muted)]"
                >
                  <p>{concept.description}</p>
                  {concept.snippet ? (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg)]">
                      <code className="font-mono">{concept.snippet}</code>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </SiteContainer>
    </section>
  );
}
