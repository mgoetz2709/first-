import Link from "next/link";
import type offersData from "@/content/offers.json";

type Offer = (typeof offersData)["items"][number];

export default function OfferCard({ offer }: { offer: Offer }) {
  return (
    <Link
      href={`/angebote/${offer.slug}`}
      className="group flex flex-col rounded-sm border border-ink-200 bg-surface p-6 transition-colors hover:border-accent-400"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-700">
          {offer.stepNumber}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-600">
          {offer.stageLabel}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-ink-900">{offer.name}</h3>
      <p className="mt-1 text-sm font-medium text-foreground-muted">
        {offer.characterization}
      </p>
      <p className="mt-4 flex-1 text-sm text-foreground-muted">{offer.shortDescription}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink-900 group-hover:text-accent-600">
        Details ansehen →
      </span>
    </Link>
  );
}
