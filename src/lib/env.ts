/**
 * Zentrale Stelle für austauschbare Umgebungsvariablen/Anbieter-Konfiguration.
 * Siehe .env.example für alle verfügbaren Variablen und Platzhalterwerte.
 */

export const contactConfig = {
  toEmail: process.env.CONTACT_TO_EMAIL ?? "kontakt@markusgoetz.com",
  fromEmail: process.env.CONTACT_FROM_EMAIL ?? "webseite@markusgoetz.com",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  responseTimeText:
    process.env.NEXT_PUBLIC_CONTACT_RESPONSE_TIME_TEXT ??
    "[Platzhalter: Antwort innerhalb von 2 Werktagen]",
};

/**
 * AI-Potenzial-Scout (docs/requirements.md, architecture.md, systemprompt.md).
 * Modell: Claude Sonnet 5 laut architecture.md. Preise verifiziert am 30.07.2026
 * gegen platform.claude.com/docs/en/about-claude/pricing: $2/$10 pro MTok
 * (Input/Output) bis 31.08.2026, danach $3/$15 — bei Modellwechsel oder nach
 * dem Stichtag AGENT_PRICE_* unten aktualisieren.
 */
export const agentConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  // Hartes Limit lt. architecture.md — bewusst nicht über 300 hinaus konfigurierbar.
  maxTokens: Math.min(Number(process.env.AGENT_MAX_TOKENS ?? 300) || 300, 300),
  // Max. Turns pro Session (serverseitiger Hard Stop, unabhängig vom Prompt).
  maxTurnsPerSession: Math.min(Number(process.env.AGENT_MAX_TURNS ?? 6) || 6, 20),
  sessionTtlMs:
    Number(process.env.AGENT_SESSION_TTL_MS ?? 30 * 60 * 1000) || 30 * 60 * 1000,
  // Input-Feld-Limit lt. requirements.md ("Kein Freitext-Overflow").
  maxUserInputChars: 300,
  maxSessionsPerIpPerDay: Math.min(
    Number(process.env.AGENT_MAX_SESSIONS_PER_IP_DAY ?? 2) || 2,
    50
  ),
  dailyBudgetUsd: Number(process.env.AGENT_DAILY_BUDGET_USD ?? 5) || 5,
  monthlyBudgetUsd: Number(process.env.AGENT_MONTHLY_BUDGET_USD ?? 50) || 50,
  priceInputPerMTok: Number(process.env.AGENT_PRICE_INPUT_PER_MTOK ?? 2) || 2,
  priceOutputPerMTok: Number(process.env.AGENT_PRICE_OUTPUT_PER_MTOK ?? 10) || 10,
  cookieSecret:
    process.env.AGENT_RATE_LIMIT_SECRET ??
    "dev-only-insecure-secret-please-set-AGENT_RATE_LIMIT_SECRET",
};

/**
 * Geteilter Zustand über alle Besucher hinweg (IP-Rate-Limit, Tages-/
 * Monatsbudget) — ein signiertes Cookie kann das architektonisch nicht
 * leisten (siehe architecture.md). Nutzt die Upstash-Redis-REST-API (z. B.
 * über die "Vercel KV"/Upstash-Marketplace-Integration bereitgestellt).
 * Ohne Konfiguration laufen Session-Turn-Limits weiter über das Cookie,
 * IP-Limit und Budget-Deckel sind dann inaktiv (siehe lib/redis.ts).
 */
export const redisConfig = {
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
};

export const newsletterConfig = {
  secret:
    process.env.NEWSLETTER_TOKEN_SECRET ??
    "dev-only-insecure-secret-please-set-NEWSLETTER_TOKEN_SECRET",
  tokenTtlMs: 48 * 60 * 60 * 1000,
};

export const isAgentMockMode = () => agentConfig.apiKey.trim().length === 0;
export const isContactMockMode = () => contactConfig.resendApiKey.trim().length === 0;
export const isRedisConfigured = () =>
  redisConfig.url.trim().length > 0 && redisConfig.token.trim().length > 0;
