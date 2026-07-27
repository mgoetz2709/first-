import offers from "@/content/offers.json";

export default function StageTimeline({ activeSlug }: { activeSlug?: string }) {
  return (
    <ol className="relative grid gap-6 sm:grid-cols-5 sm:gap-4">
      <span
        aria-hidden="true"
        className="absolute top-4 right-[10%] left-[10%] hidden h-px bg-ink-200 sm:block"
      />
      {offers.items.map((offer) => {
        const isActive = offer.slug === activeSlug;
        return (
          <li
            key={offer.slug}
            className="relative flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
          >
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                isActive ? "bg-accent-500 text-white" : "bg-ink-100 text-ink-700"
              }`}
            >
              {offer.stepNumber}
            </span>
            <span
              className={`text-xs font-medium ${
                isActive ? "text-ink-900" : "text-foreground-muted"
              }`}
            >
              {offer.stageLabel}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
