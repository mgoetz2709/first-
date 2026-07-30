import { NextRequest, NextResponse } from "next/server";
import { EMAIL_PATTERN, escapeHtml, sendTransactionalEmail } from "@/lib/email";
import { createConfirmToken } from "@/lib/newsletterToken";

export const runtime = "nodejs";

type SignupPayload = {
  email: string;
  consent: boolean;
};

/**
 * Double-Opt-In-Anmeldung (DSGVO), bewusst getrennt vom Assessment-Chat
 * (siehe architecture.md/requirements.md). Schickt nur eine
 * Bestätigungs-Mail an den Nutzer — erst nach Klick auf den Link in
 * newsletter-confirm/route.ts gilt die Anmeldung als bestätigt.
 */
export async function POST(request: NextRequest) {
  let body: Partial<SignupPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (!body.email || !EMAIL_PATTERN.test(body.email) || body.email.length > 200) {
    return NextResponse.json({ error: "E-Mail ist ungültig." }, { status: 400 });
  }
  if (!body.consent) {
    return NextResponse.json({ error: "Einwilligung fehlt." }, { status: 400 });
  }

  const email = body.email;
  const token = createConfirmToken(email);
  const confirmUrl = new URL("/api/newsletter-confirm", request.nextUrl.origin);
  confirmUrl.searchParams.set("token", token);

  const html = `
    <p>Bitte bestätigen Sie Ihre Anmeldung beim AI-Potenzial-Scout von Markus Goetz Interim Management:</p>
    <p><a href="${escapeHtml(confirmUrl.toString())}">Anmeldung bestätigen</a></p>
    <p>Der Link ist 48 Stunden gültig. Falls Sie das nicht angefragt haben, ignorieren Sie diese E-Mail einfach.</p>
  `;

  const result = await sendTransactionalEmail({
    to: email,
    subject: "Bitte bestätigen Sie Ihre Anmeldung",
    html,
    logLabel: "newsletter-signup",
  });

  // Immer eine generische Erfolgsmeldung zurückgeben (kein User-Enumeration-Risiko),
  // Versandfehler nur im mock:false-Fall als echten Fehler weitergeben.
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, ...(result.mock ? { mock: true } : {}) });
}
