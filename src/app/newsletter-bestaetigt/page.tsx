import type { Metadata } from "next";
import Section from "@/components/Section";
import { LinkButton } from "@/components/Button";

export const metadata: Metadata = {
  title: "Anmeldung bestätigt",
};

export default async function NewsletterBestaetigtPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const ok = status === "ok";

  return (
    <Section>
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold text-ink-600 sm:text-4xl">
          {ok ? "Anmeldung bestätigt" : "Link ungültig oder abgelaufen"}
        </h1>
        <p className="mt-4 text-foreground-muted">
          {ok
            ? "Vielen Dank — Ihre E-Mail-Adresse ist bestätigt. Markus Goetz meldet sich mit einer kurzen Rückmeldung zu Ihrer Situation."
            : "Dieser Bestätigungslink ist ungültig oder nicht mehr aktuell. Bitte fordern Sie über den AI-Potenzial-Scout auf der Startseite einen neuen Link an."}
        </p>
        <div className="mt-8">
          <LinkButton href="/" variant="primary">
            Zur Startseite
          </LinkButton>
        </div>
      </div>
    </Section>
  );
}
