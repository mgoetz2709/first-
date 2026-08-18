import type { Metadata } from "next";
import OfferDetailView from "@/components/OfferDetailView";
import { getOffer } from "@/lib/offers";

const offer = getOffer("change-accelerator");

export const metadata: Metadata = {
  title: offer.name,
  description: offer.shortDescription,
};

export default function ChangeAcceleratorPage() {
  return <OfferDetailView offer={offer} />;
}
