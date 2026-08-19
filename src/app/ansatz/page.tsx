import type { Metadata } from "next";
import Section from "@/components/Section";
import SectionHeading from "@/components/SectionHeading";
import { LinkButton } from "@/components/Button";
import Container from "@/components/Container";
import { illustrations } from "@/components/illustrations";
import ansatz from "@/content/ansatz.json";

export const metadata: Metadata = {
  title: "Ansatz",
  description: ansatz.hero.subheading,
};

export default function AnsatzPage() {
  return (
    <>
      <Section>
        <SectionHeading
          eyebrow={ansatz.hero.eyebrow}
          heading={ansatz.hero.heading}
          subheading={ansatz.hero.subheading}
          level="h1"
        />
        <p className="mt-8 max-w-2xl text-foreground-muted">{ansatz.intro.body}</p>

        <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3">
          {ansatz.arc.map((word, i) => (
            <span key={word} className="flex items-center gap-2">
              <span className="rounded-full border border-accent-300 bg-accent-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent-700">
                {word}
              </span>
              {i < ansatz.arc.length - 1 && (
                <span aria-hidden="true" className="text-ink-300">
                  →
                </span>
              )}
            </span>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          Die Grundidee
        </h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-4">
          {ansatz.bigPicture.map((item) => {
            const Illustration = illustrations[item.illustration];
            return (
              <div key={item.illustration}>
                <div className="mx-auto flex w-24 items-center justify-center rounded-sm bg-ink-50 p-4">
                  <Illustration className="mgim-illustration mgim-illustration--approach" />
                </div>
                <h3 className="mt-4 text-center text-sm font-semibold text-ink-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-center text-xs text-foreground-muted">{item.body}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section muted>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          Die 7 Phasen im Detail
        </h2>
        <div className="mt-6 divide-y divide-ink-200 border-t border-ink-200">
          {ansatz.phases.map((phase) => (
            <div
              key={phase.number}
              className="grid gap-2 py-6 sm:grid-cols-[3rem_1fr_auto] sm:items-baseline sm:gap-6"
            >
              <span className="font-headline text-2xl font-semibold text-accent-700">
                {phase.number}
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink-900">{phase.title}</h3>
                <p className="mt-1 text-sm text-foreground-muted">{phase.goal}</p>
              </div>
              <span className="inline-flex h-fit items-center rounded-full bg-ink-100 px-3 py-1 text-xs font-medium whitespace-nowrap text-ink-900 sm:justify-self-end">
                {phase.output}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-8 sm:grid-cols-3">
          {ansatz.principles.map((principle) => (
            <div key={principle.title} className="border-t-2 border-ink-200 pt-4">
              <h3 className="font-semibold text-ink-600">{principle.title}</h3>
              <p className="mt-2 text-sm text-foreground-muted">{principle.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <section className="bg-ink-900 py-20 text-white">
        <Container className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">{ansatz.cta.heading}</h2>
            <p className="mt-3 max-w-xl text-ink-200">{ansatz.cta.body}</p>
          </div>
          <LinkButton
            href={ansatz.cta.cta.href}
            variant="secondary"
            className="whitespace-nowrap border-white text-white hover:bg-white hover:text-ink-900"
          >
            {ansatz.cta.cta.label}
          </LinkButton>
        </Container>
      </section>
    </>
  );
}
