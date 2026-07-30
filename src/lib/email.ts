import { contactConfig, isContactMockMode } from "@/lib/env";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  /** Prefix für Konsolen-Logs im Mock-Modus/bei Fehlern, z. B. "contact". */
  logLabel: string;
};

export type SendEmailResult = { ok: true; mock?: true } | { ok: false; error: string };

/**
 * Gemeinsamer Versandpfad für alle transaktionalen E-Mails (Kontaktformular,
 * Newsletter-Double-Opt-In) über Resend. Ohne RESEND_API_KEY läuft ein
 * Mock-Modus (Log statt Versand), damit die Flows auch ohne Zugangsdaten
 * durchgängig testbar bleiben.
 */
export async function sendTransactionalEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (isContactMockMode()) {
    console.info(`[${params.logLabel}:mock] Kein RESEND_API_KEY gesetzt — Log statt E-Mail-Versand:`, {
      to: params.to,
      subject: params.subject,
    });
    return { ok: true, mock: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${contactConfig.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: contactConfig.fromEmail,
        to: params.to,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${params.logLabel}] Resend-Versand fehlgeschlagen:`, errorText);
      return { ok: false, error: "Versand fehlgeschlagen." };
    }
    return { ok: true };
  } catch (error) {
    console.error(`[${params.logLabel}] Unerwarteter Fehler beim E-Mail-Versand:`, error);
    return { ok: false, error: "Versand fehlgeschlagen." };
  }
}
