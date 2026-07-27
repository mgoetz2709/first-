import type { Metadata } from "next";
import Section from "@/components/Section";
import SectionHeading from "@/components/SectionHeading";
import PlaceholderImage from "@/components/PlaceholderImage";
import { LinkButton } from "@/components/Button";
import Container from "@/components/Container";
import erfolge from "@/content/erfolge.json";

export const metadata: Metadata = {
  title: "Erfolge",
  description: erfolge.hero.subheading,
};

export default function ErfolgePage() {
  return (
    <>
      <Section>
        <SectionHeading
          eyebrow={erfolge.hero.eyebrow}
          heading={erfolge.hero.heading}
          subheading={erfolge.hero.subheading}
        />
        <p className="mt-8 max-w-2xl text-foreground-muted">{erfolge.intro.body}</p>
      </Section>

      <Section muted>
        <div className="space-y-16">
          {erfolge.caseStudies.map((study) => (
            <article
              key={study.id}
              className="grid gap-8 rounded-sm border border-ink-200 bg-surface p-6 sm:grid-cols-[1fr_1.4fr] sm:p-8"
            >
              <PlaceholderImage label={study.imageAlt} aspect="aspect-square" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">
                  {study.industry} · {study.clientType}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink-900">{study.title}</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="font-semibold text-ink-900">Herausforderung</dt>
                    <dd className="mt-1 text-foreground-muted">{study.challenge}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-900">Vorgehen</dt>
                    <dd className="mt-1 text-foreground-muted">{study.approach}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-900">Ergebnis</dt>
                    <dd className="mt-1 text-foreground-muted">{study.result}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <section className="bg-ink-900 py-20 text-white">
        <Container className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">{erfolge.cta.heading}</h2>
            <p className="mt-3 max-w-xl text-ink-200">{erfolge.cta.body}</p>
          </div>
          <LinkButton
            href={erfolge.cta.cta.href}
            variant="secondary"
            className="whitespace-nowrap border-white text-white hover:bg-white hover:text-ink-900"
          >
            {erfolge.cta.cta.label}
          </LinkButton>
        </Container>
      </section>
    </>
  );
}
