import { NextRequest, NextResponse } from "next/server";
import { agentConfig, isAgentMockMode } from "@/lib/env";
import { buildAgentSystemPrompt } from "@/lib/agentSystemPrompt";
import { checkTurnLimit, RATE_LIMIT_COOKIE } from "@/lib/rateLimit";
import {
  assertRedisAvailable,
  getFloat,
  incrCounterWithTtl,
  incrFloatWithTtl,
} from "@/lib/redis";
import agentContent from "@/content/agent.json";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_MESSAGES = agentConfig.maxTurnsPerSession * 2 + 1;
const MAX_ASSISTANT_MESSAGE_LENGTH = 2000;

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
    const role = (entry as { role: "user" | "assistant" }).role;
    const content = (entry as { content: string }).content.trim();
    const maxLength =
      role === "user" ? agentConfig.maxUserInputChars : MAX_ASSISTANT_MESSAGE_LENGTH;
    if (content.length === 0 || content.length > maxLength) return null;
    parsed.push({ role, content });
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

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function withTurnCookie(response: NextResponse, cookieValue: string): NextResponse {
  response.cookies.set(RATE_LIMIT_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.ceil(agentConfig.sessionTtlMs / 1000),
    path: "/",
  });
  return response;
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

  // 1) Session-Turn-Limit — signiertes Cookie, unabhängig vom Prompt (rateLimit.ts).
  const turnLimit = checkTurnLimit(request.cookies.get(RATE_LIMIT_COOKIE)?.value);
  if (!turnLimit.allowed) {
    return withTurnCookie(
      NextResponse.json({ error: agentContent.turnLimitMessage }, { status: 429 }),
      turnLimit.cookieValue
    );
  }

  const redisAvailable = assertRedisAvailable();
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const monthKey = dayKey.slice(0, 7); // YYYY-MM

  // 2) IP-Limit für neue Sessions — nur geteilter Zustand kann das leisten (redis.ts).
  if (redisAvailable && turnLimit.isNewSession) {
    try {
      const ip = getClientIp(request);
      const ipSessions = await incrCounterWithTtl(`agent:ip:${ip}:${dayKey}`, 60 * 60 * 24);
      if (ipSessions > agentConfig.maxSessionsPerIpPerDay) {
        return NextResponse.json({ error: agentContent.ipLimitMessage }, { status: 429 });
      }
    } catch (error) {
      console.error("[agent] IP-Limit-Check fehlgeschlagen, lasse Anfrage zu:", error);
    }
  }

  // 3) Tages-/Monatsbudget mit Auto-Pause — nicht relevant im Mock-Modus (keine Kosten).
  if (redisAvailable && !isAgentMockMode()) {
    try {
      const [daySpend, monthSpend] = await Promise.all([
        getFloat(`agent:spend:day:${dayKey}`),
        getFloat(`agent:spend:month:${monthKey}`),
      ]);
      if (daySpend >= agentConfig.dailyBudgetUsd || monthSpend >= agentConfig.monthlyBudgetUsd) {
        return NextResponse.json(
          { error: agentContent.budgetPausedMessage },
          { status: 503 }
        );
      }
    } catch (error) {
      console.error("[agent] Budget-Check fehlgeschlagen, lasse Anfrage zu:", error);
    }
  }

  if (isAgentMockMode()) {
    return withTurnCookie(
      NextResponse.json({ reply: agentContent.mockReply, mock: true }),
      turnLimit.cookieValue
    );
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
        system: buildAgentSystemPrompt(agentConfig.maxTurnsPerSession),
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

    if (redisAvailable && data.usage) {
      const inputTokens = Number(data.usage.input_tokens ?? 0);
      const outputTokens = Number(data.usage.output_tokens ?? 0);
      const cost =
        (inputTokens / 1_000_000) * agentConfig.priceInputPerMTok +
        (outputTokens / 1_000_000) * agentConfig.priceOutputPerMTok;
      Promise.all([
        incrFloatWithTtl(`agent:spend:day:${dayKey}`, cost, 60 * 60 * 24 * 2),
        incrFloatWithTtl(`agent:spend:month:${monthKey}`, cost, 60 * 60 * 24 * 32),
      ]).catch((error) => console.error("[agent] Budget-Fortschreibung fehlgeschlagen:", error));
    }

    return withTurnCookie(
      NextResponse.json({ reply: reply || agentContent.errorMessage }),
      turnLimit.cookieValue
    );
  } catch (error) {
    console.error("[agent] Unerwarteter Fehler:", error);
    return NextResponse.json({ error: agentContent.errorMessage }, { status: 502 });
  }
}
