export default function SectionHeading({
  eyebrow,
  heading,
  subheading,
  align = "left",
  level = "h2",
}: {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  align?: "left" | "center";
  level?: "h1" | "h2";
}) {
  const Heading = level;
  // H1 = MG Grey, H2 = Near Black (CI Guide, Typografische Skala)
  const headingColor = level === "h1" ? "text-ink-600" : "text-ink-900";

  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-700">
          {eyebrow}
        </p>
      )}
      <Heading className={`mt-3 text-3xl font-semibold sm:text-4xl ${headingColor}`}>
        {heading}
      </Heading>
      {subheading && (
        <p className="mt-4 text-lg text-foreground-muted">{subheading}</p>
      )}
    </div>
  );
}
