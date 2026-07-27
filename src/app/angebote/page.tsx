import type { Metadata } from "next";
import Section from "@/components/Section";
import SectionHeading from "@/components/SectionHeading";
import StageTimeline from "@/components/StageTimeline";
import OfferCard from "@/components/OfferCard";
import offers from "@/content/offers.json";

export const metadata: Metadata = {
  title: "Angebote",
  description: offers.hero.subheading,
};

export default function AngebotePage() {
  return (
    <>
      <Section>
        <SectionHeading
          eyebrow={offers.hero.eyebrow}
          heading={offers.hero.heading}
          subheading={offers.hero.subheading}
        />
        <p className="mt-6 max-w-2xl rounded-sm border border-ink-200 bg-surface-muted px-5 py-4 text-sm text-foreground-muted">
          {offers.priceNote}
        </p>
      </Section>

      <Section muted>
        <StageTimeline />
      </Section>

      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offers.items.map((offer) => (
            <OfferCard key={offer.slug} offer={offer} />
          ))}
        </div>
      </Section>
    </>
  );
}
