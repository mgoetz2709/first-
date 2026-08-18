import type { Metadata } from "next";
import OfferDetailView from "@/components/OfferDetailView";
import { getOffer } from "@/lib/offers";

const offer = getOffer("readiness-sprint");

export const metadata: Metadata = {
  title: offer.name,
  description: offer.shortDescription,
};

export default function ReadinessSprintPage() {
  return <OfferDetailView offer={offer} />;
}
