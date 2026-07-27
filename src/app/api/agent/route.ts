import { NextRequest, NextResponse } from "next/server";
import { agentConfig, isAgentMockMode } from "@/lib/env";
import { buildKnowledgeBase } from "@/lib/agentKnowledge";
import { checkRateLimit, RATE_LIMIT_COOKIE } from "@/lib/rateLimit";
import agentContent from "@/content/agent.json";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_MESSAGES = 21;
const MAX_MESSAGE_LENGTH = 2000;

const SYSTEM_PROMPT = `Du bist der Demo-Agent auf der Webseite von Markus Goetz Interim Management (MGIM).

Rolle: Du zeigst Besuchern der Seite beispielhaft, wie ein von Markus gebauter AI-Agent im Kundenkontext arbeitet. Du bist selbst ein Beweis für die angebotene Kompetenz.

Wissensbasis (ausschließlich diese Informationen über MGIM verwenden):
${buildKnowledgeBase()}

Leitplanken (verbindlich):
- Nenne niemals Preise, Preisspannen oder Kostenschätzungen und verhandle nicht über Preise. Verweise stattdessen freundlich auf ein Erstgespräch oder das Kontaktformular unter /kontakt.
- Erfinde keine Fakten über Markus Goetz, MGIM oder Kundenreferenzen, die nicht oben in der Wissensbasis stehen. Wenn du etwas nicht weißt, sag das offen.
- Bei Themen außerhalb von MGIM, AI-Transformation oder den Angeboten: höflich ablehnen und auf den Zweck dieser Seite hinweisen.
- Antworte sachlich, präzise und professionell auf Deutsch, in kurzen Absätzen.`;

function validateMessages(body: unknown): ChatMessage[] | null {
  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { messages?: unknown }).messages)
  ) {
    return null;
  }

  const messages = (body as { messages: unknown[] }).messages;
  if (messages.length === 0 || messages.length > MAX_MESSAGES) return null;

  const parsed: ChatMessage[] = [];
  for (const entry of messages) {
    if (
      !entry ||
      typeof entry !== "object" ||
      ((entry as { role?: unknown }).role !== "user" &&
        (entry as { role?: unknown }).role !== "assistant") ||
      typeof (entry as { content?: unknown }).content !== "string"
    ) {
      return null;
    }
    const content = (entry as { content: string }).content.trim();
    if (content.length === 0 || content.length > MAX_MESSAGE_LENGTH) return null;
    parsed.push({ role: (entry as { role: "user" | "assistant" }).role, content });
  }

  if (parsed[parsed.length - 1].role !== "user") return null;
  return parsed;
}

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // manche Same-Origin-Requests senden keinen Origin-Header
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Anfrage nicht erlaubt." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const messages = validateMessages(body);
  if (!messages) {
    return NextResponse.json({ error: "Ungültige Nachricht." }, { status: 400 });
  }

  const rateLimit = checkRateLimit(request.cookies.get(RATE_LIMIT_COOKIE)?.value);
  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: agentContent.rateLimitMessage },
      { status: 429 }
    );
    response.cookies.set(RATE_LIMIT_COOKIE, rateLimit.cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: Math.ceil(agentConfig.rateLimitWindowMs / 1000),
      path: "/",
    });
    return response;
  }

  if (isAgentMockMode()) {
    const response = NextResponse.json({ reply: agentContent.mockReply, mock: true });
    response.cookies.set(RATE_LIMIT_COOKIE, rateLimit.cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: Math.ceil(agentConfig.rateLimitWindowMs / 1000),
      path: "/",
    });
    return response;
  }

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": agentConfig.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: agentConfig.model,
        max_tokens: agentConfig.maxTokens,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("[agent] Anthropic-API-Fehler:", anthropicResponse.status, errorText);
      return NextResponse.json({ error: agentContent.errorMessage }, { status: 502 });
    }

    const data = await anthropicResponse.json();
    const reply = Array.isArray(data.content)
      ? data.content
          .filter((block: { type: string }) => block.type === "text")
          .map((block: { text: string }) => block.text)
          .join("\n")
      : "";

    const response = NextResponse.json({ reply: reply || agentContent.errorMessage });
    response.cookies.set(RATE_LIMIT_COOKIE, rateLimit.cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: Math.ceil(agentConfig.rateLimitWindowMs / 1000),
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("[agent] Unerwarteter Fehler:", error);
    return NextResponse.json({ error: agentContent.errorMessage }, { status: 502 });
  }
}
