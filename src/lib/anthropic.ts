import Anthropic from "@anthropic-ai/sdk";

const globalForAnthropic = globalThis as unknown as { anthropic?: Anthropic };

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY ist nicht gesetzt. Bitte in .env eintragen (siehe .env.example)."
    );
  }
  if (!globalForAnthropic.anthropic) {
    globalForAnthropic.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return globalForAnthropic.anthropic;
}

export const ANALYSIS_MODEL = "claude-sonnet-5";
