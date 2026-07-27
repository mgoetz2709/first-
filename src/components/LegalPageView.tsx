import Section from "@/components/Section";

type LegalSection = {
  heading: string;
  body: string;
};

export default function LegalPageView({
  heading,
  intro,
  sections,
}: {
  heading: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <Section>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">{heading}</h1>
        <p className="mt-4 text-sm text-foreground-muted">{intro}</p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-lg font-semibold text-ink-900">{section.heading}</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-foreground-muted">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
