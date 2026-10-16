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
  const interimOffers = offers.items.filter((offer) => offer.track === "interim");
  const aiOffers = offers.items.filter((offer) => offer.track === "ai");

  return (
    <>
      <Section>
        <SectionHeading
          eyebrow={offers.hero.eyebrow}
          heading={offers.hero.heading}
          subheading={offers.hero.subheading}
          level="h1"
        />
        <p className="mt-6 max-w-2xl rounded-sm border-l-4 border-accent-500 bg-ink-100 px-5 py-4 text-sm text-ink-900">
          {offers.priceNote}
        </p>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Weg 1"
          heading="Klassisches Interim Management"
          subheading="Sie brauchen jemanden, der Verantwortung übernimmt und liefert – unabhängig von AI."
          level="h2"
        />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {interimOffers.map((offer) => (
            <OfferCard key={offer.slug} offer={offer} />
          ))}
        </div>
      </Section>

      <Section muted>
        <SectionHeading
          eyebrow="Weg 2"
          heading="AI-Transformation – die Produkttreppe"
          subheading="Jedes Angebot deckt einen Abschnitt des AI Transformation Playbooks ab – von der ersten Diagnose bis zur laufenden Partnerschaft."
          level="h2"
        />
        <div className="mt-8">
          <StageTimeline />
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {aiOffers.map((offer) => (
            <OfferCard key={offer.slug} offer={offer} />
          ))}
        </div>
      </Section>
    </>
  );
}
