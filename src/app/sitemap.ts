import type { MetadataRoute } from "next";

const baseUrl = "https://www.markusgoetz.net";

const routes = [
  "",
  "/ansatz",
  "/angebote",
  "/angebote/interim-mandat",
  "/angebote/readiness-sprint",
  "/angebote/first-agent-live",
  "/angebote/retainer",
  "/angebote/change-accelerator",
  "/angebote/process-blueprint",
  "/erfolge",
  "/ueber-mich",
  "/kontakt",
  "/impressum",
  "/datenschutz",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
