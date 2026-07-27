import type { Metadata } from "next";
import Section from "@/components/Section";
import SectionHeading from "@/components/SectionHeading";
import { LinkButton } from "@/components/Button";
import Container from "@/components/Container";
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
      </Section>

      <Section muted>
        <div className="grid gap-10 sm:grid-cols-2">
          {ansatz.steps.map((step) => (
            <div key={step.number} className="flex gap-5">
              <span className="font-headline text-3xl font-semibold text-accent-700">
                {step.number}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{step.title}</h2>
                <p className="mt-2 text-sm text-foreground-muted">{step.body}</p>
              </div>
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
