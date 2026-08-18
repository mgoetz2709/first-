import type { Metadata } from "next";
import LegalPageView from "@/components/LegalPageView";
import impressum from "@/content/impressum.json";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function ImpressumPage() {
  return (
    <LegalPageView
      heading={impressum.heading}
      intro={impressum.intro}
      sections={impressum.sections}
    />
  );
}
