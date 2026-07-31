export type PipelineStage =
  | "INTERVIEW"
  | "DOCUMENTATION"
  | "PAIN_POINTS"
  | "VALIDATION"
  | "SOLUTION_DESIGN"
  | "ARTIFACTS"
  | "REPORT"
  | "DONE";

export type InterviewMode = "live_chat" | "async_qa" | "transcript_analysis" | "clarification";
export type InterviewStatus = "RAW" | "STRUCTURED";

export type DocStatus = "DRAFT" | "NEEDS_CORRECTION" | "VALIDATED";

export type PainPointCategory =
  | "manual_work"
  | "delay_bottleneck"
  | "communication_gap"
  | "decision_delay"
  | "data_quality"
  | "visibility_gap"
  | "redundant_step";

export type Frequency = "always" | "often" | "sometimes" | "rarely";
export type Impact = "high" | "medium" | "low";

export type ValidationOutcome = "CLEARED" | "CORRECTIONS_REQUIRED";
export type TargetDocument = "DOCUMENTATION" | "PAIN_POINTS";
export type ResolutionPath = "INTERNAL" | "STAKEHOLDER_QUESTION";

export type SolutionType = "PROMPT" | "AGENT" | "AUTOMATION" | "TEMPLATE" | "VIBE_CODE";
export type ConceptStatus = "DRAFT" | "ARTIFACT_GENERATED";

export type PipelineRunStage =
  | "INTERVIEW_STRUCTURING"
  | "DOCUMENTATION"
  | "PAIN_POINTS"
  | "VALIDATION"
  | "SOLUTION_DESIGN"
  | "ARTIFACT_GENERATION"
  | "FINAL_REPORT";

export type PipelineRunStatus = "RUNNING" | "COMPLETED" | "FAILED";

export const PAIN_POINT_CATEGORIES: { value: PainPointCategory; label: string }[] = [
  { value: "manual_work", label: "Manueller/repetitiver Aufwand" },
  { value: "delay_bottleneck", label: "Bottleneck / Verzögerung" },
  { value: "communication_gap", label: "Kommunikationslücke / Handoff-Fehler" },
  { value: "decision_delay", label: "Entscheidungsverzögerung (fehlende Infos)" },
  { value: "data_quality", label: "Datenqualität" },
  { value: "visibility_gap", label: "Fehlende Visibility / Monitoring" },
  { value: "redundant_step", label: "Redundanter Schritt" },
];

export const SOLUTION_TYPES: { value: SolutionType; label: string; description: string }[] = [
  {
    value: "PROMPT",
    label: "Engineered Prompt",
    description: "Textgenerierung, Zusammenfassung oder Einzelentscheidungs-Unterstützung",
  },
  {
    value: "AGENT",
    label: "AI Agent",
    description: "Komplexe, mehrstufige Entscheidungen mit autonomem Handeln über mehrere Prozessschritte",
  },
  {
    value: "AUTOMATION",
    label: "Automation",
    description: "Regelbasierte, repetitive Aufgaben ohne Ermessensspielraum, kein LLM nötig",
  },
  {
    value: "TEMPLATE",
    label: "Template / Checkliste",
    description: "Standardisierungsbedarf, keine KI nötig — immer eine ehrliche Option",
  },
  {
    value: "VIBE_CODE",
    label: "Vibe-Code System",
    description: "Braucht eine echte Software-/Tooling-Lösung, umsetzbar z.B. mit Claude Code",
  },
];

export function painPointCategoryLabel(v: string): string {
  return PAIN_POINT_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export function solutionTypeLabel(v: string): string {
  return SOLUTION_TYPES.find((c) => c.value === v)?.label ?? v;
}
