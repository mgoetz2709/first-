import { createHmac, timingSafeEqual } from "crypto";
import { agentConfig } from "@/lib/env";

export const RATE_LIMIT_COOKIE = "mgim_agent_rl";

type SessionState = {
  count: number;
  windowStart: number;
};

function sign(payload: string): string {
  return createHmac("sha256", agentConfig.cookieSecret).update(payload).digest("base64url");
}

function encode(state: SessionState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(cookieValue: string | undefined): SessionState | null {
  if (!cookieValue) return null;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof state.count === "number" && typeof state.windowStart === "number") {
      return state;
    }
    return null;
  } catch {
    return null;
  }
}

export type TurnLimitResult = {
  allowed: boolean;
  cookieValue: string;
  remaining: number;
  /** true, wenn kein gültiges Vorgänger-Cookie existierte (neue Session) — steuert das IP-Tageslimit. */
  isNewSession: boolean;
};

/**
 * Signiertes, httpOnly Cookie als serverseitig durchgesetztes Session-Turn-
 * Limit (architecture.md: max. 6 Antworten/Session). Da das Cookie
 * kryptografisch signiert ist, kann der Client den Zähler nicht fälschen —
 * das erfüllt "Session-ID serverseitig generieren, nicht im Frontend
 * vertrauen" ohne zusätzliche Infrastruktur. Für Limits, die über eine
 * einzelne Session hinausgehen (IP-Limit, Budget), siehe redis.ts.
 */
export function checkTurnLimit(cookieValue: string | undefined): TurnLimitResult {
  const now = Date.now();
  const existing = decode(cookieValue);
  const isNewSession = !existing || now - existing.windowStart > agentConfig.sessionTtlMs;
  const state: SessionState = isNewSession
    ? { count: 0, windowStart: now }
    : existing!;

  if (state.count >= agentConfig.maxTurnsPerSession) {
    return { allowed: false, cookieValue: encode(state), remaining: 0, isNewSession };
  }

  const nextState: SessionState = { count: state.count + 1, windowStart: state.windowStart };
  return {
    allowed: true,
    cookieValue: encode(nextState),
    remaining: agentConfig.maxTurnsPerSession - nextState.count,
    isNewSession,
  };
}
