import { Barlow, Inter } from "next/font/google";

/**
 * Typografie gemäß MGIM Corporate Identity Guide v2 (Abschnitt 03):
 * Primary/Headlines = Barlow Bold/SemiBold (Fallback Arial Bold),
 * Secondary/Body & UI = Inter Regular/Bold (Fallback Arial).
 */
export const headlineFont = Barlow({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-headline-family",
  display: "swap",
});

export const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-family",
  display: "swap",
});

export const fontVariables = `${headlineFont.variable} ${bodyFont.variable}`;
