import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { HeroPacket } from "../components/hero/HeroPacket";
import { SiteContainer } from "../components/SiteContainer";
import { WhatIsFluxSection } from "../components/WhatIsFluxSection";
import { HomeChangelog } from "../components/changelog/HomeChangelog";
import { ConceptsSection } from "../components/home/ConceptsSection";
import { ShareWorkCTA } from "../components/home/ShareWorkCTA";
import { Seo } from "../components/Seo";
import { SITE_DESCRIPTION } from "../lib/seo";

export default function HomePage() {
  const shouldReduceMotion = useReducedMotion();
  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.5,
        delay: 0.05 + i * 0.05,
        ease: [0.25, 0.1, 0.25, 1],
      },
    }),
  };

  const infoCards = [
    {
      title: "Flux Documents",
      body:
        "Flux documents are structured, versioned score documents backed by an AST/IR that you can author, validate, and render with confidence.",
      href: "/docs",
    },
    {
      title: "Validate + Inspect",
      body:
        "Check a document and inspect the canonical IR snapshot to power tooling, automation, and repeatable builds.",
      href: "/docs",
    },
    {
      title: "Tooling Workflow",
      body:
        "Install once with the launcher, update with flux self update, and work locally in the CLI + editor on the same IR.",
      href: "/tooling",
    },
  ];

  const MotionLink = motion(Link);

  return (
    <div className="space-y-14 lg:space-y-16">
      <Seo
        title="Flux — A document language for musical scores"
        description={SITE_DESCRIPTION}
        canonicalPath="/"
      />
      <HeroPacket />
      <WhatIsFluxSection />

      <section className="border-t border-[var(--border)] bg-[var(--surface-0)] pt-12 pb-6">
        <SiteContainer className="px-2 sm:px-4 md:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {infoCards.map((card, idx) => (
              <MotionLink
                key={card.title}
                to={card.href}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 text-left shadow-sm transition hover:border-[var(--ring)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]"
                custom={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={cardVariants}
                whileHover={
                  shouldReduceMotion ? undefined : { y: -6, boxShadow: "0 16px 36px rgba(15,23,42,0.08)" }
                }
              >
                <h2 className="mb-2 text-sm font-semibold text-[var(--fg)] font-body">
                  {card.title}
                </h2>
                <p className="text-sm leading-relaxed text-[var(--muted)] font-body">{card.body}</p>
              </MotionLink>
            ))}
          </div>
        </SiteContainer>
      </section>

      <HomeChangelog />
      <ConceptsSection />
      <ShareWorkCTA />
    </div>
  );
}
