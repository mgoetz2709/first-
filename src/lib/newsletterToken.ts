import { createHmac, timingSafeEqual } from "crypto";
import { newsletterConfig } from "@/lib/env";

type TokenPayload = { email: string; exp: number };

function sign(payload: string): string {
  return createHmac("sha256", newsletterConfig.secret).update(payload).digest("base64url");
}

/**
 * Zustandsloses Double-Opt-In-Token: signierte E-Mail + Ablaufzeit, kein
 * eigener Datenspeicher nötig (keine CRM-/DB-Anbindung in dieser Phase).
 */
export function createConfirmToken(email: string): string {
  const payload: TokenPayload = { email, exp: Date.now() + newsletterConfig.tokenTtlMs };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyConfirmToken(token: string): string | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload: TokenPayload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload.email;
  } catch {
    return null;
  }
}
