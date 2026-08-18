import Container from "@/components/Container";
import Section from "@/components/Section";
import StageTimeline from "@/components/StageTimeline";
import { LinkButton } from "@/components/Button";
import type offersData from "@/content/offers.json";

type Offer = (typeof offersData)["items"][number];

export default function OfferDetailView({ offer }: { offer: Offer }) {
  return (
    <>
      <Section>
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500 text-sm font-semibold text-white">
              {offer.stepNumber}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-700">
              {offer.stageLabel}
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-ink-600">{offer.name}</h1>
          <p className="mt-2 text-lg font-medium text-foreground-muted">
            {offer.characterization}
          </p>
          <p className="mt-6 text-foreground-muted">{offer.shortDescription}</p>
          <div className="mt-8">
            <LinkButton href={offer.ctaHref} variant="primary">
              {offer.ctaLabel}
            </LinkButton>
          </div>
        </div>
      </Section>

      <Section muted>
        <StageTimeline activeSlug={offer.slug} />
      </Section>

      <Section>
        <div className="grid gap-12 sm:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            {offer.longDescription.map((paragraph, i) => (
              <p key={i} className="text-foreground-muted">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-900">
                Für wen
              </h2>
              <p className="mt-2 text-sm text-foreground-muted">{offer.targetGroup}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-900">
                Format
              </h2>
              <p className="mt-2 text-sm text-foreground-muted">{offer.format}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-900">
                Ergebnisse
              </h2>
              <ul className="mt-2 space-y-2 text-sm text-foreground-muted">
                {offer.deliverables.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent-500">
                      —
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <section className="bg-ink-900 py-20 text-white">
        <Container className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Interesse an {offer.name}?
            </h2>
            <p className="mt-3 max-w-xl text-ink-200">
              Jedes Angebot wird individuell nach einem Erstgespräch zugeschnitten —
              ganz ohne Verpflichtung.
            </p>
          </div>
          <LinkButton
            href={offer.ctaHref}
            variant="secondary"
            className="whitespace-nowrap border-white text-white hover:bg-white hover:text-ink-900"
          >
            {offer.ctaLabel}
          </LinkButton>
        </Container>
      </section>
    </>
  );
}
