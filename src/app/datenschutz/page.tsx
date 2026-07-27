import type { Metadata } from "next";
import LegalPageView from "@/components/LegalPageView";
import datenschutz from "@/content/datenschutz.json";

export const metadata: Metadata = {
  title: "Datenschutz",
};

export default function DatenschutzPage() {
  return (
    <LegalPageView
      heading={datenschutz.heading}
      intro={datenschutz.intro}
      sections={datenschutz.sections}
    />
  );
}
