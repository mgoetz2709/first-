"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Container from "@/components/Container";
import { LinkButton } from "@/components/Button";
import { site } from "@/lib/content";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <Container className="flex h-18 items-center justify-between py-4">
        <Link
          href="/"
          className="font-headline text-lg font-semibold tracking-tight text-ink-900"
          onClick={() => setMenuOpen(false)}
        >
          {site.shortName}
          <span className="ml-2 hidden text-xs font-normal text-foreground-muted sm:inline">
            {site.siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Hauptnavigation">
          {site.primaryNav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`text-sm font-medium transition-colors hover:text-accent-600 ${
                  active ? "text-ink-900" : "text-foreground-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <LinkButton href="/kontakt" variant="primary" className="px-5 py-2.5">
            Erstgespräch vereinbaren
          </LinkButton>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-sm p-2 text-ink-900 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </Container>

      {menuOpen && (
        <div id="mobile-nav" className="border-t border-ink-100 bg-surface md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {site.primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm px-2 py-3 text-base font-medium text-ink-900 hover:bg-ink-50"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <LinkButton
              href="/kontakt"
              variant="primary"
              className="mt-3 w-full"
              onClick={() => setMenuOpen(false)}
            >
              Erstgespräch vereinbaren
            </LinkButton>
          </Container>
        </div>
      )}
    </header>
  );
}
