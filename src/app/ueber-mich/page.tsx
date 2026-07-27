import type { Metadata } from "next";
import Image from "next/image";
import Section from "@/components/Section";
import SectionHeading from "@/components/SectionHeading";
import { LinkButton } from "@/components/Button";
import Container from "@/components/Container";
import ueberMich from "@/content/ueber-mich.json";

export const metadata: Metadata = {
  title: "Über mich",
  description: ueberMich.hero.subheading,
};

export default function UeberMichPage() {
  return (
    <>
      <Section>
        <div className="grid gap-10 sm:grid-cols-[1fr_1.5fr] sm:items-start">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-ink-100">
            <Image
              src="/images/markus-goetz-portrait.jpg"
              alt={ueberMich.portraitAlt}
              fill
              priority
              sizes="(min-width: 640px) 33vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <SectionHeading
              eyebrow={ueberMich.hero.eyebrow}
              heading={ueberMich.hero.heading}
              subheading={ueberMich.hero.subheading}
              level="h1"
            />
            <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {ueberMich.credentials.map((c) => (
                <div key={c.label} className="border-t-2 border-accent-500 pt-3">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    {c.label}
                  </dt>
                  <dd className="mt-1 text-sm text-ink-900">{c.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      <Section muted>
        <div className="max-w-2xl space-y-6">
          {ueberMich.bio.map((paragraph, i) => (
            <p key={i} className="text-foreground-muted">
              {paragraph}
            </p>
          ))}
        </div>
      </Section>

      <Section>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-ink-900">
            {ueberMich.philosophy.heading}
          </h2>
          <p className="mt-4 text-foreground-muted">{ueberMich.philosophy.body}</p>
        </div>
      </Section>

      <section className="bg-ink-900 py-20 text-white">
        <Container className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">{ueberMich.cta.heading}</h2>
            <p className="mt-3 max-w-xl text-ink-200">{ueberMich.cta.body}</p>
          </div>
          <LinkButton
            href={ueberMich.cta.cta.href}
            variant="secondary"
            className="whitespace-nowrap border-white text-white hover:bg-white hover:text-ink-900"
          >
            {ueberMich.cta.cta.label}
          </LinkButton>
        </Container>
      </section>
    </>
  );
}
