import { isRedisConfigured, redisConfig } from "@/lib/env";

/**
 * Dünner Client für die Upstash-Redis-REST-API. Kein SDK-Dependency nötig —
 * die REST-API ist ein einfacher GET pro Kommando, passt zu Serverless/Edge.
 * Trägt den geteilten Zustand für IP-Rate-Limit und Tages-/Monatsbudget des
 * AI-Potenzial-Scout (siehe env.ts, agent/route.ts).
 */

let warnedMissingConfig = false;

async function command(parts: (string | number)[]): Promise<unknown> {
  const url = `${redisConfig.url}/${parts.map((p) => encodeURIComponent(String(p))).join("/")}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${redisConfig.token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Upstash-Redis-Fehler ${response.status} für ${parts[0]}`);
  }
  const data = await response.json();
  return data.result;
}

/** true, wenn Redis konfiguriert ist. Loggt einmalig eine Warnung, falls nicht. */
export function assertRedisAvailable(): boolean {
  if (isRedisConfigured()) return true;
  if (!warnedMissingConfig) {
    warnedMissingConfig = true;
    console.warn(
      "[redis] UPSTASH_REDIS_REST_URL/-TOKEN nicht gesetzt — IP-Rate-Limit und Tages-/Monatsbudget des Probeagenten sind inaktiv, nur das Session-Turn-Limit (Cookie) greift."
    );
  }
  return false;
}

/** Ganzzahliger Zähler mit TTL, der nur beim ersten Schreiben gesetzt wird (EXPIRE ... NX). */
export async function incrCounterWithTtl(
  key: string,
  ttlSeconds: number
): Promise<number> {
  const value = await command(["INCR", key]);
  await command(["EXPIRE", key, ttlSeconds, "NX"]).catch(() => {});
  return Number(value);
}

/** Gleitkomma-Akkumulator (z. B. USD-Kosten) mit TTL, analog incrCounterWithTtl. */
export async function incrFloatWithTtl(
  key: string,
  amount: number,
  ttlSeconds: number
): Promise<number> {
  const value = await command(["INCRBYFLOAT", key, amount]);
  await command(["EXPIRE", key, ttlSeconds, "NX"]).catch(() => {});
  return Number(value);
}

export async function getFloat(key: string): Promise<number> {
  const value = await command(["GET", key]);
  return value ? Number(value) : 0;
}
