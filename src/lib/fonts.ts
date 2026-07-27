import { Fraunces, Inter } from "next/font/google";

/**
 * Zentrale Typografie-Konfiguration (Abschnitt 7 der Projektanweisung).
 * Finale Schriftauswahl folgt später — Austausch erfolgt ausschließlich hier,
 * keine Font-Imports in einzelnen Komponenten/Seiten.
 */
export const headlineFont = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-headline-family",
  display: "swap",
});

export const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-family",
  display: "swap",
});

export const fontVariables = `${headlineFont.variable} ${bodyFont.variable}`;
