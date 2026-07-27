import Link from "next/link";
import Container from "@/components/Container";
import { site } from "@/lib/content";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-100 bg-ink-950 text-ink-200">
      <Container className="grid gap-10 py-14 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="font-headline text-lg font-semibold text-white">
            {site.siteName}
          </p>
          <p className="mt-3 max-w-sm text-sm text-ink-300">{site.footerTagline}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Navigation
          </p>
          <ul className="mt-4 space-y-2">
            {site.primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-ink-200 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Rechtliches
          </p>
          <ul className="mt-4 space-y-2">
            {site.footerLegalNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-ink-200 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${site.contactEmail}`}
                className="text-sm text-ink-200 hover:text-white"
              >
                {site.contactEmail}
              </a>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-ink-800">
        <Container className="py-5 text-xs text-ink-400">
          © {year} {site.siteName}. Alle Rechte vorbehalten.
        </Container>
      </div>
    </footer>
  );
}
