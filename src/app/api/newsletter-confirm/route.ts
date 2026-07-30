import { NextRequest, NextResponse } from "next/server";
import { contactConfig } from "@/lib/env";
import { escapeHtml, sendTransactionalEmail } from "@/lib/email";
import { verifyConfirmToken } from "@/lib/newsletterToken";

export const runtime = "nodejs";

/**
 * Double-Opt-In-Bestätigung. Ohne CRM-/Mailinglisten-Anbindung (siehe
 * ursprüngliche Projektanweisung, Abschnitt 10 "Out of Scope") wird die
 * bestätigte Adresse per E-Mail an Markus Goetz weitergereicht, statt sie
 * automatisiert in ein Tool einzutragen.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const email = verifyConfirmToken(token);

  const redirectUrl = new URL("/newsletter-bestaetigt", request.nextUrl.origin);

  if (!email) {
    redirectUrl.searchParams.set("status", "invalid");
    return NextResponse.redirect(redirectUrl);
  }

  await sendTransactionalEmail({
    to: contactConfig.toEmail,
    subject: "Neue bestätigte Anmeldung: AI-Potenzial-Scout",
    html: `<p>Neue bestätigte Double-Opt-In-Anmeldung über den AI-Potenzial-Scout:</p><p>${escapeHtml(email)}</p>`,
    logLabel: "newsletter-confirm",
  });

  redirectUrl.searchParams.set("status", "ok");
  return NextResponse.redirect(redirectUrl);
}
