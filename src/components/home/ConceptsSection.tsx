import { useId, useState } from "react";
import { SiteContainer } from "../SiteContainer";
import { Button } from "../ui/Button";
import {
  BlocksIcon,
  CalculatorIcon,
  DocumentIcon,
  PlayPulseIcon,
} from "./HomeConceptIcons";

type ConceptItem = {
  title: string;
  teaser: string;
  details: string[];
  snippet?: string;
  Icon: typeof DocumentIcon;
};

const concepts: ConceptItem[] = [
  {
    title: "Structured source",
    teaser: "A .flux file is source you can parse, validate, and render.",
    details: [
      "Every document has readable source and a dependable AST/IR snapshot, so the same file powers tools, layouts, and exports.",
      "That structure makes diffs, validation, and rendering consistent across your workflow.",
    ],
    Icon: DocumentIcon,
  },
  {
    title: "Computer algebra inside the doc",
    teaser: "Values can be computed and related alongside what you write.",
    details: [
      "Parameters, relationships, and computed values live beside the prose, keeping source data and presentation aligned.",
      "You can encode shared measurements, constraints, and transformations once and reuse them everywhere.",
    ],
    Icon: CalculatorIcon,
  },
  {
    title: "Refresh types",
    teaser: "Documents can play over time—deterministic or stochastic.",
    details: [
      "Refresh types like poisson or docstep let documents evolve with controlled timing, so updates remain predictable and repeatable.",
      "That means variation is authored, not accidental, and it stays reproducible.",
    ],
    snippet: "refresh: poisson(2.5s)",
    Icon: PlayPulseIcon,
  },
  {
    title: "Composable elements",
    teaser: "A small set of elements builds complex docs.",
    details: [
      "Paragraphs, pages, inline slots, and tables combine into complex scores without a sprawling element list.",
      "The same primitives scale from tiny sketches to full scores and parts.",
    ],
    Icon: BlocksIcon,
  },
];

export function ConceptsSection() {
  const baseId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeConcept = concepts[activeIndex];
  const panelId = `${baseId}-panel`;
  const activeButtonId = `${baseId}-button-${activeIndex}`;

  return (
    <section className="border-t border-[var(--border)] bg-[var(--surface-0)] py-16">
      <SiteContainer className="space-y-10">
        <div className="space-y-3 max-w-3xl">
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

        <div className="flex flex-wrap gap-3">
          {concepts.map((concept, index) => {
            const buttonId = `${baseId}-button-${index}`;
            const Icon = concept.Icon;
            const isActive = activeIndex === index;

            return (
              <Button
                key={concept.title}
                type="button"
                id={buttonId}
                aria-controls={panelId}
                aria-pressed={isActive}
                onClick={() => setActiveIndex(index)}
                variant="badge"
                size="sm"
                className={[
                  "normal-case gap-2 text-sm tracking-[0.14em]",
                  isActive
                    ? "border-[var(--ring)] bg-[var(--surface-2)] text-[var(--fg)]"
                    : "text-[var(--muted)] hover:text-[var(--fg)]",
                ].join(" ")}
              >
                <span className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1.5 text-[var(--fg)]">
                  <Icon className="h-4 w-4" />
                </span>
                {concept.title}
              </Button>
            );
          })}
        </div>

        <div
          id={panelId}
          role="region"
          aria-labelledby={activeButtonId}
          aria-live="polite"
          className="max-w-3xl space-y-3 text-sm text-[var(--muted)] md:text-base"
        >
          <p className="text-[var(--fg)] font-semibold">{activeConcept.teaser}</p>
          {activeConcept.details.map((detail) => (
            <p key={detail}>{detail}</p>
          ))}
          {activeConcept.snippet ? (
            <p className="font-mono text-xs text-[var(--fg)]">{activeConcept.snippet}</p>
          ) : null}
        </div>
      </SiteContainer>
    </section>
  );
}
