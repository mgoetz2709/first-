import type { Metadata } from "next";
import Section from "@/components/Section";
import SectionHeading from "@/components/SectionHeading";
import CalendarEmbed from "@/components/CalendarEmbed";
import ContactForm from "@/components/ContactForm";
import kontakt from "@/content/kontakt.json";

export const metadata: Metadata = {
  title: "Kontakt",
  description: kontakt.hero.subheading,
};

export default function KontaktPage() {
  return (
    <>
      <Section>
        <SectionHeading
          eyebrow={kontakt.hero.eyebrow}
          heading={kontakt.hero.heading}
          subheading={kontakt.hero.subheading}
          level="h1"
        />
      </Section>

      <Section id="kalender" muted>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold text-ink-900">{kontakt.calendar.heading}</h2>
          <p className="mt-3 text-foreground-muted">{kontakt.calendar.body}</p>
          <div className="mt-8">
            <CalendarEmbed />
          </div>
        </div>
      </Section>

      <Section id="formular">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-xl font-semibold text-ink-900">{kontakt.form.heading}</h2>
          <p className="mt-2 text-sm text-foreground-muted">{kontakt.form.body}</p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </Section>
    </>
  );
}
