import type { Metadata } from "next";
import OfferDetailView from "@/components/OfferDetailView";
import { getOffer } from "@/lib/offers";

const offer = getOffer("first-agent-live");

export const metadata: Metadata = {
  title: offer.name,
  description: offer.shortDescription,
};

export default function FirstAgentLivePage() {
  return <OfferDetailView offer={offer} />;
}
