import siteData from "@/content/site.json";

export type NavItem = {
  label: string;
  href: string;
};

export type SiteContent = {
  siteName: string;
  shortName: string;
  positioningStatement: string;
  metaDescriptionDefault: string;
  contactEmail: string;
  primaryNav: NavItem[];
  footerLegalNav: NavItem[];
  footerTagline: string;
};

export const site: SiteContent = siteData;
