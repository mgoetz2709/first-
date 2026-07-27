import { NextResponse } from "next/server";
import { contactConfig, isContactMockMode } from "@/lib/env";

export const runtime = "nodejs";

type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  offerInterest?: string;
  message: string;
  consent: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function validate(payload: Partial<ContactPayload>): string | null {
  if (!payload.name || payload.name.trim().length === 0) return "Name fehlt.";
  if (!payload.email || !EMAIL_PATTERN.test(payload.email)) return "E-Mail ist ungültig.";
  if (!payload.message || payload.message.trim().length === 0) return "Nachricht fehlt.";
  if (!payload.consent) return "Einwilligung fehlt.";
  if (payload.name.length > MAX_FIELD_LENGTH) return "Name ist zu lang.";
  if (payload.email.length > MAX_FIELD_LENGTH) return "E-Mail ist zu lang.";
  if ((payload.company ?? "").length > MAX_FIELD_LENGTH) return "Unternehmen ist zu lang.";
  if ((payload.offerInterest ?? "").length > MAX_FIELD_LENGTH) {
    return "Angebotsauswahl ist ungültig.";
  }
  if (payload.message.length > MAX_MESSAGE_LENGTH) return "Nachricht ist zu lang.";
  return null;
}

export async function POST(request: Request) {
  let body: Partial<ContactPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const validationError = validate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { name, email, company, offerInterest, message } = body as ContactPayload;

  const subject = `Neue Kontaktanfrage über markusgoetz.com${
    offerInterest ? ` – ${offerInterest}` : ""
  }`;
  const html = `
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
    <p><strong>Unternehmen:</strong> ${escapeHtml(company || "–")}</p>
    <p><strong>Interessiert an:</strong> ${escapeHtml(offerInterest || "–")}</p>
    <p><strong>Nachricht:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
  `;

  if (isContactMockMode()) {
    console.info("[contact:mock] Kein RESEND_API_KEY gesetzt — Formular-Log statt E-Mail-Versand:", {
      to: contactConfig.toEmail,
      subject,
      name,
      email,
      company,
      offerInterest,
    });
    return NextResponse.json({ ok: true, mock: true });
  }

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${contactConfig.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: contactConfig.fromEmail,
        to: contactConfig.toEmail,
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("[contact] Resend-Versand fehlgeschlagen:", errorText);
      return NextResponse.json({ error: "Versand fehlgeschlagen." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact] Unerwarteter Fehler beim E-Mail-Versand:", error);
    return NextResponse.json({ error: "Versand fehlgeschlagen." }, { status: 502 });
  }
}
