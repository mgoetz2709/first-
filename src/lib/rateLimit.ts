import { createHmac, timingSafeEqual } from "crypto";
import { agentConfig } from "@/lib/env";

export const RATE_LIMIT_COOKIE = "mgim_agent_rl";

type RateLimitState = {
  count: number;
  windowStart: number;
};

function sign(payload: string): string {
  return createHmac("sha256", agentConfig.cookieSecret).update(payload).digest("base64url");
}

function encode(state: RateLimitState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(cookieValue: string | undefined): RateLimitState | null {
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

export type RateLimitResult = {
  allowed: boolean;
  cookieValue: string;
  remaining: number;
};

/**
 * Zustandsloses, signiertes Cookie als Rate-Limit pro Besucher/Sitzung
 * (Abschnitt 5.2). Funktioniert ohne Datenbank/externen Store und damit
 * auch über mehrere Serverless-Instanzen hinweg konsistent genug für eine
 * Demo-/Kostenschutz-Begrenzung.
 */
export function checkRateLimit(cookieValue: string | undefined): RateLimitResult {
  const now = Date.now();
  let state = decode(cookieValue);

  if (!state || now - state.windowStart > agentConfig.rateLimitWindowMs) {
    state = { count: 0, windowStart: now };
  }

  if (state.count >= agentConfig.rateLimitMax) {
    return { allowed: false, cookieValue: encode(state), remaining: 0 };
  }

  const nextState: RateLimitState = { count: state.count + 1, windowStart: state.windowStart };
  return {
    allowed: true,
    cookieValue: encode(nextState),
    remaining: agentConfig.rateLimitMax - nextState.count,
  };
}
