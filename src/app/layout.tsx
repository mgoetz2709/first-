import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Process AI Navigator",
  description: "E2E-Prozessanalyse zur Ableitung von Prompt-, Agent- und Vibe-Code-Lösungen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold">
              Process AI Navigator
            </Link>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              E2E-Prozessanalyse &rarr; Prompt / Agent / Vibe-Code
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
