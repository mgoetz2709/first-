import type { RecommendationStatus, RecommendationType } from "@/lib/types";

const TYPE_STYLES: Record<RecommendationType, string> = {
  PROMPT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  AGENT: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  VIBE_CODE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

const TYPE_LABELS: Record<RecommendationType, string> = {
  PROMPT: "Engineered Prompt",
  AGENT: "AI Agent",
  VIBE_CODE: "Vibe-Code System",
};

export function TypeBadge({ type }: { type: string }) {
  const t = type as RecommendationType;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TYPE_STYLES[t] ?? ""}`}>
      {TYPE_LABELS[t] ?? type}
    </span>
  );
}

const STATUS_LABELS: Record<RecommendationStatus, string> = {
  DRAFT: "Entwurf",
  REVIEW: "In Review",
  APPROVED: "Freigegeben",
  IMPLEMENTED: "Umgesetzt",
  REJECTED: "Verworfen",
};

export function statusLabel(status: RecommendationStatus) {
  return STATUS_LABELS[status];
}

export const ALL_STATUSES: RecommendationStatus[] = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "IMPLEMENTED",
  "REJECTED",
];

export const ALL_TYPES: RecommendationType[] = ["PROMPT", "AGENT", "VIBE_CODE"];
export { TYPE_LABELS };
