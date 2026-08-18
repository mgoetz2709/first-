import offers from "@/content/offers.json";

export type Offer = (typeof offers)["items"][number];

export function getOffer(slug: string): Offer {
  const offer = offers.items.find((item) => item.slug === slug);
  if (!offer) {
    throw new Error(`Unknown offer slug: ${slug}`);
  }
  return offer;
}
