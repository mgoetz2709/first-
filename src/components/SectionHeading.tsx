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

  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-700">
          {eyebrow}
        </p>
      )}
      <Heading className="mt-3 text-3xl font-semibold text-ink-900 sm:text-4xl">
        {heading}
      </Heading>
      {subheading && (
        <p className="mt-4 text-lg text-foreground-muted">{subheading}</p>
      )}
    </div>
  );
}
