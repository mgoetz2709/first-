import type { Metadata } from "next";
import Section from "@/components/Section";
import SectionHeading from "@/components/SectionHeading";
import { LinkButton } from "@/components/Button";
import Container from "@/components/Container";
import { illustrations } from "@/components/illustrations";
import erfolge from "@/content/erfolge.json";
import testimonials from "@/content/testimonials.json";

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
          level="h1"
        />
        <p className="mt-8 max-w-2xl text-foreground-muted">{erfolge.intro.body}</p>
      </Section>

      <Section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          {testimonials.heading}
        </h2>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {testimonials.items.map((item) => (
            <figure
              key={item.id}
              className="flex flex-col rounded-sm border-l-4 border-accent-500 bg-ink-100 p-6 sm:p-8"
            >
              <blockquote className="flex-1 space-y-3 text-sm text-ink-900">
                {item.quote.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </blockquote>
              <figcaption className="mt-6 border-t border-ink-200 pt-4">
                <p className="font-semibold text-ink-900">{item.name}</p>
                <p className="text-sm text-ink-900">{item.roleAtEngagement}</p>
                <p className="text-sm text-ink-900">{item.roleToday}</p>
                {item.linkedIn && (
                  <a
                    href={item.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-accent-700 underline underline-offset-2 hover:text-accent-600"
                  >
                    LinkedIn-Profil
                  </a>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section muted>
        <div className="space-y-16">
          {erfolge.caseStudies.map((study) => {
            const Illustration = illustrations[study.illustration];
            return (
              <article
                key={study.id}
                className="grid gap-8 rounded-sm border border-ink-200 bg-surface p-6 sm:grid-cols-[1fr_1.4fr] sm:p-8"
              >
                <div className="flex items-center justify-center rounded-sm bg-ink-50 p-6">
                  <Illustration className="mgim-illustration mgim-illustration--case-study" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-700">
                    {study.industry} · {study.clientType}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-ink-900">{study.title}</h2>
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
            );
          })}
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
