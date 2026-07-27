import type { Metadata } from "next";
import OfferDetailView from "@/components/OfferDetailView";
import { getOffer } from "@/lib/offers";

const offer = getOffer("process-blueprint");

export const metadata: Metadata = {
  title: offer.name,
  description: offer.shortDescription,
};

export default function ProcessBlueprintPage() {
  return <OfferDetailView offer={offer} />;
}
