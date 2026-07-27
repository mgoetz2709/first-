/**
 * Zentrale Stelle für austauschbare Umgebungsvariablen/Anbieter-Konfiguration.
 * Siehe .env.example für alle verfügbaren Variablen und Platzhalterwerte.
 */

export const calendarConfig = {
  // Kalender-Anbieter-Embed-URL (z. B. Calendly). Solange nicht gesetzt,
  // rendert die Kontaktseite einen klar erkennbaren Platzhalter.
  embedUrl: process.env.NEXT_PUBLIC_CALENDAR_EMBED_URL ?? "",
  provider: process.env.NEXT_PUBLIC_CALENDAR_PROVIDER ?? "Platzhalter-Anbieter",
};

export const contactConfig = {
  toEmail: process.env.CONTACT_TO_EMAIL ?? "kontakt@markusgoetz.com",
  fromEmail: process.env.CONTACT_FROM_EMAIL ?? "webseite@markusgoetz.com",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  responseTimeText:
    process.env.NEXT_PUBLIC_CONTACT_RESPONSE_TIME_TEXT ??
    "[Platzhalter: Antwort innerhalb von 2 Werktagen]",
};

export const agentConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
  maxTokens: Math.min(Number(process.env.AGENT_MAX_TOKENS ?? 400) || 400, 800),
  rateLimitMax: Math.min(Number(process.env.AGENT_RATE_LIMIT_MAX ?? 15) || 15, 50),
  rateLimitWindowMs:
    Number(process.env.AGENT_RATE_LIMIT_WINDOW_MS ?? 30 * 60 * 1000) ||
    30 * 60 * 1000,
  cookieSecret:
    process.env.AGENT_RATE_LIMIT_SECRET ??
    "dev-only-insecure-secret-please-set-AGENT_RATE_LIMIT_SECRET",
};

export const isAgentMockMode = () => agentConfig.apiKey.trim().length === 0;
export const isContactMockMode = () => contactConfig.resendApiKey.trim().length === 0;
export const isCalendarConfigured = () => calendarConfig.embedUrl.trim().length > 0;
