import { painPointCategoryLabel, solutionTypeLabel } from "@/lib/types";

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

const NEUTRAL = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

export function SolutionTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    PROMPT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    AGENT: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    AUTOMATION: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
    TEMPLATE: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
    VIBE_CODE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  };
  return <Pill className={styles[type] ?? NEUTRAL}>{solutionTypeLabel(type)}</Pill>;
}

export function CategoryBadge({ category }: { category: string }) {
  return <Pill className={NEUTRAL}>{painPointCategoryLabel(category)}</Pill>;
}

export function ImpactBadge({ impact }: { impact: string }) {
  const styles: Record<string, string> = {
    high: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  const labels: Record<string, string> = { high: "Hoch", medium: "Mittel", low: "Niedrig" };
  return <Pill className={styles[impact] ?? NEUTRAL}>{labels[impact] ?? impact}</Pill>;
}

export function FrequencyBadge({ frequency }: { frequency: string }) {
  const labels: Record<string, string> = { always: "Immer", often: "Häufig", sometimes: "Manchmal", rarely: "Selten" };
  return <Pill className={NEUTRAL}>{labels[frequency] ?? frequency}</Pill>;
}

export function StagePill({ stage }: { stage: string }) {
  const labels: Record<string, string> = {
    INTERVIEW: "Interview",
    DOCUMENTATION: "Dokumentation",
    PAIN_POINTS: "Pain Points",
    VALIDATION: "Validierung",
    SOLUTION_DESIGN: "Lösungsdesign",
    ARTIFACTS: "Artefakte",
    REPORT: "Report",
    DONE: "Abgeschlossen",
  };
  return <Pill className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">{labels[stage] ?? stage}</Pill>;
}

export function DocStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    NEEDS_CORRECTION: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    VALIDATED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  };
  const labels: Record<string, string> = { DRAFT: "Entwurf", NEEDS_CORRECTION: "Korrektur erforderlich", VALIDATED: "Validiert" };
  return <Pill className={styles[status] ?? NEUTRAL}>{labels[status] ?? status}</Pill>;
}

export function ValidationOutcomeBadge({ outcome }: { outcome: string }) {
  return outcome === "CLEARED" ? (
    <Pill className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Volle Freigabe</Pill>
  ) : (
    <Pill className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Korrektur erforderlich</Pill>
  );
}

export function InterviewStatusBadge({ status }: { status: string }) {
  return status === "STRUCTURED" ? (
    <Pill className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Strukturiert</Pill>
  ) : (
    <Pill className={NEUTRAL}>Roh</Pill>
  );
}
