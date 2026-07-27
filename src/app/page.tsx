import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import Container from "@/components/Container";
import PlaceholderImage from "@/components/PlaceholderImage";
import { LinkButton } from "@/components/Button";
import home from "@/content/home.json";

export const metadata: Metadata = {
  title: "Startseite",
};

type Teaser = {
  eyebrow: string;
  heading: string;
  body: string;
  cta: { label: string; href: string };
};

function Teaser({
  teaser,
  reverse = false,
  imageLabel,
}: {
  teaser: Teaser;
  reverse?: boolean;
  imageLabel: string;
}) {
  return (
    <div
      className={`grid items-center gap-10 md:grid-cols-2 ${
        reverse ? "md:[&>*:first-child]:order-2" : ""
      }`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-700">
          {teaser.eyebrow}
        </p>
        <h3 className="mt-3 text-2xl font-semibold text-ink-900">{teaser.heading}</h3>
        <p className="mt-4 text-foreground-muted">{teaser.body}</p>
        <Link
          href={teaser.cta.href}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink-900 underline underline-offset-4 hover:text-accent-600"
        >
          {teaser.cta.label} →
        </Link>
      </div>
      <PlaceholderImage label={imageLabel} />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Section>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-700">
            {home.hero.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-ink-900 sm:text-6xl">
            {home.hero.heading}
          </h1>
          <p className="mt-6 text-lg text-foreground-muted">{home.hero.subheading}</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <LinkButton href={home.hero.primaryCta.href} variant="primary">
              {home.hero.primaryCta.label}
            </LinkButton>
            <LinkButton href={home.hero.secondaryCta.href} variant="secondary">
              {home.hero.secondaryCta.label}
            </LinkButton>
          </div>
        </div>
      </Section>

      <Section muted>
        <div className="grid gap-8 sm:grid-cols-3">
          {home.pillars.map((pillar) => (
            <div key={pillar.title} className="border-t-2 border-accent-500 pt-4">
              <h2 className="font-headline text-lg font-semibold text-ink-900">
                {pillar.title}
              </h2>
              <p className="mt-2 text-sm text-foreground-muted">{pillar.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-ink-900">
            {home.introSection.heading}
          </h2>
          <p className="mt-4 text-foreground-muted">{home.introSection.body}</p>
        </div>
      </Section>

      <Section muted>
        <div className="space-y-20">
          <Teaser teaser={home.approachTeaser} imageLabel="[Platzhalter: Bild/Illustration Ansatz]" />
          <Teaser
            teaser={home.offersTeaser}
            reverse
            imageLabel="[Platzhalter: Bild/Illustration Angebote]"
          />
          <Teaser
            teaser={home.successTeaser}
            imageLabel="[Platzhalter: Bild/Illustration Erfolge]"
          />
          <Teaser
            teaser={home.aboutTeaser}
            reverse
            imageLabel="[Platzhalter: Porträtfoto Markus Goetz]"
          />
        </div>
      </Section>

      <section className="bg-ink-900 py-20 text-white">
        <Container className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">{home.finalCta.heading}</h2>
            <p className="mt-3 max-w-xl text-ink-200">{home.finalCta.body}</p>
          </div>
          <LinkButton
            href={home.finalCta.cta.href}
            variant="secondary"
            className="whitespace-nowrap border-white text-white hover:bg-white hover:text-ink-900"
          >
            {home.finalCta.cta.label}
          </LinkButton>
        </Container>
      </section>
    </>
  );
}
