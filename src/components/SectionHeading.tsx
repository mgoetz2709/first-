export default function SectionHeading({
  eyebrow,
  heading,
  subheading,
  align = "left",
}: {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-3xl font-semibold text-ink-900 sm:text-4xl">
        {heading}
      </h2>
      {subheading && (
        <p className="mt-4 text-lg text-foreground-muted">{subheading}</p>
      )}
    </div>
  );
}
