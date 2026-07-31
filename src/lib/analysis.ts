import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAnthropicClient, ANALYSIS_MODEL } from "@/lib/anthropic";
import type { PipelineRunStage } from "@/lib/types";

const MAX_CHARS = 20000;

function truncate(text: string, max = MAX_CHARS): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n\n[... gekürzt, ${text.length - max} weitere Zeichen ...]`;
}

async function callStructured<T extends z.ZodTypeAny>(
  prompt: string,
  tool: { name: string; description: string; input_schema: Record<string, unknown> },
  schema: T
): Promise<z.infer<T>> {
  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 8000,
    tools: [tool as any],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: prompt }],
  });
  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`Claude hat kein strukturiertes Ergebnis für "${tool.name}" zurückgegeben.`);
  }
  return schema.parse(toolUse.input);
}

const STAGE_ORDER: string[] = [
  "INTERVIEW",
  "DOCUMENTATION",
  "PAIN_POINTS",
  "VALIDATION",
  "SOLUTION_DESIGN",
  "ARTIFACTS",
  "REPORT",
  "DONE",
];

async function advanceStage(processId: string, candidate: string) {
  const process = await prisma.process.findUniqueOrThrow({ where: { id: processId } });
  if (STAGE_ORDER.indexOf(candidate) > STAGE_ORDER.indexOf(process.stage)) {
    await prisma.process.update({ where: { id: processId }, data: { stage: candidate } });
  }
}

async function runStage(
  processId: string,
  stage: PipelineRunStage,
  fn: () => Promise<string | void>
): Promise<void> {
  const run = await prisma.pipelineRun.create({ data: { processId, stage, status: "RUNNING" } });
  try {
    const summary = (await fn()) ?? undefined;
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED", summary, completedAt: new Date() },
    });
  } catch (err) {
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unbekannter Fehler",
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

const AI_STRATEGY_HEADER = (aiStrategy: string) =>
  `## AI-Strategie des Kunden (verbindlicher Rahmen für alle Empfehlungen)\n${
    aiStrategy || "(keine spezifische AI-Strategie hinterlegt – gehe von einem vorsichtigen, pragmatischen Ansatz aus)"
  }`;

// ---------------------------------------------------------------------------
// Stage 1 — Finn: Interview Structuring
// ---------------------------------------------------------------------------

const interviewStructureSchema = z.object({
  process_boundaries: z.object({ trigger: z.string(), end_state: z.string() }),
  happy_path: z.array(
    z.object({
      step_number: z.number(),
      description: z.string(),
      actor: z.string(),
      system_or_tool: z.string().nullable().optional(),
      next_step: z.string().nullable().optional(),
    })
  ),
  decision_points: z.array(
    z.object({
      after_step: z.number().nullable().optional(),
      condition: z.string(),
      paths: z.array(z.string()),
    })
  ),
  exceptions: z.array(z.object({ issue: z.string(), handling: z.string() })),
  handoffs: z.array(
    z.object({
      from_actor: z.string(),
      to_actor: z.string(),
      at_step: z.number().nullable().optional(),
      required_inputs: z.array(z.string()),
    })
  ),
  metrics: z.object({
    step_durations: z.record(z.string()).optional().default({}),
    success_indicators: z.array(z.string()).optional().default([]),
  }),
  preliminary_insights: z.object({
    key_actors: z.array(z.string()),
    systems_mentioned: z.array(z.string()),
    pain_points_mentioned: z.array(z.string()),
    open_questions: z.array(z.string()),
  }),
});

const INTERVIEW_TOOL = {
  name: "submit_interview_structure",
  description: "Submit the structured five-phase interview extraction (process boundaries, happy path, decision points, exceptions, handoffs, metrics, preliminary insights).",
  input_schema: {
    type: "object",
    properties: {
      process_boundaries: {
        type: "object",
        properties: { trigger: { type: "string" }, end_state: { type: "string" } },
        required: ["trigger", "end_state"],
      },
      happy_path: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step_number: { type: "integer" },
            description: { type: "string" },
            actor: { type: "string", description: "Rolle, nicht Personenname" },
            system_or_tool: { type: ["string", "null"] },
            next_step: { type: ["string", "null"] },
          },
          required: ["step_number", "description", "actor"],
        },
      },
      decision_points: {
        type: "array",
        items: {
          type: "object",
          properties: {
            after_step: { type: ["integer", "null"] },
            condition: { type: "string" },
            paths: { type: "array", items: { type: "string" } },
          },
          required: ["condition", "paths"],
        },
      },
      exceptions: {
        type: "array",
        items: {
          type: "object",
          properties: { issue: { type: "string" }, handling: { type: "string" } },
          required: ["issue", "handling"],
        },
      },
      handoffs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from_actor: { type: "string" },
            to_actor: { type: "string" },
            at_step: { type: ["integer", "null"] },
            required_inputs: { type: "array", items: { type: "string" } },
          },
          required: ["from_actor", "to_actor", "required_inputs"],
        },
      },
      metrics: {
        type: "object",
        properties: {
          step_durations: { type: "object" },
          success_indicators: { type: "array", items: { type: "string" } },
        },
      },
      preliminary_insights: {
        type: "object",
        properties: {
          key_actors: { type: "array", items: { type: "string" } },
          systems_mentioned: { type: "array", items: { type: "string" } },
          pain_points_mentioned: { type: "array", items: { type: "string" } },
          open_questions: { type: "array", items: { type: "string" } },
        },
        required: ["key_actors", "systems_mentioned", "pain_points_mentioned", "open_questions"],
      },
    },
    required: ["process_boundaries", "happy_path", "decision_points", "exceptions", "handoffs", "metrics", "preliminary_insights"],
  },
};

export async function structureInterview(interviewId: string): Promise<void> {
  const interview = await prisma.interview.findUniqueOrThrow({
    where: { id: interviewId },
    include: { process: true },
  });

  await runStage(interview.processId, "INTERVIEW_STRUCTURING", async () => {
    const prompt = `Du bist Finn, ein strukturierter Process Interviewer. Du extrahierst aus einem Interview-Transkript vollständiges, neutrales Prozesswissen nach einer festen Fünf-Phasen-Methodik: Scope Definition, Happy Path Mapping, Decision Points, Exception Handling, Handoffs & Metrics.

Wichtig: Du schlägst niemals Lösungen oder KI-Anwendungen vor. Deine einzige Aufgabe ist neutrale, präzise Prozess-Discovery. Erfinde keine Informationen, die nicht im Transkript stehen — nutze für optionale Felder null, wenn nichts genannt wurde.

## Teilnehmer
${interview.participantName}${interview.participantRole ? ` (${interview.participantRole})` : ""}
Modus: ${interview.mode}

## Prozess
${interview.process.name}

## Transkript / Notizen
${truncate(interview.transcript)}

Extrahiere das vollständige Prozesswissen und antworte ausschließlich über den Tool-Call "submit_interview_structure".`;

    const result = await callStructured(prompt, INTERVIEW_TOOL, interviewStructureSchema);

    await prisma.interview.update({
      where: { id: interviewId },
      data: { structuredJson: JSON.stringify(result), status: "STRUCTURED" },
    });

    return `${result.happy_path.length} Prozessschritte, ${result.preliminary_insights.pain_points_mentioned.length} genannte Pain Points, ${result.preliminary_insights.open_questions.length} offene Fragen.`;
  });
}

// ---------------------------------------------------------------------------
// Stage 2 — Mira: Process Documentation
// ---------------------------------------------------------------------------

const documentationSchema = z.object({
  trigger: z.string(),
  end_state: z.string(),
  steps: z.array(
    z.object({
      order: z.number(),
      name: z.string(),
      description: z.string(),
      actor: z.string(),
      system: z.string().nullable().optional(),
      avg_duration: z.string().nullable().optional(),
      inferred: z.boolean().optional().default(false),
    })
  ),
  decision_points: z.array(
    z.object({
      after_step_order: z.number().nullable().optional(),
      condition: z.string(),
      outcomes: z.array(z.object({ label: z.string(), next_step_order: z.number().nullable().optional() })),
    })
  ),
  exceptions: z.array(
    z.object({ issue: z.string(), handling: z.string(), related_step_order: z.number().nullable().optional() })
  ),
  handoffs: z.array(
    z.object({
      from_actor: z.string(),
      to_actor: z.string(),
      at_step_order: z.number().nullable().optional(),
      required_inputs: z.array(z.string()),
    })
  ),
  metrics: z.object({
    step_durations: z.record(z.string()).optional().default({}),
    success_indicators: z.array(z.string()).optional().default([]),
  }),
  gaps: z.array(z.string()),
  mermaid_diagram: z.string(),
});

const DOCUMENTATION_TOOL = {
  name: "submit_process_documentation",
  description: "Submit the structured, complete process documentation derived from interview data and process documents, including a Mermaid flow diagram and explicitly flagged gaps.",
  input_schema: {
    type: "object",
    properties: {
      trigger: { type: "string" },
      end_state: { type: "string" },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            order: { type: "integer" },
            name: { type: "string", description: "Aktionsverb-Name, z.B. 'Angebot prüfen'" },
            description: { type: "string" },
            actor: { type: "string", description: "Rolle, nicht Personenname" },
            system: { type: ["string", "null"] },
            avg_duration: { type: ["string", "null"] },
            inferred: { type: "boolean", description: "true wenn der Schritt nicht explizit genannt, sondern abgeleitet wurde" },
          },
          required: ["order", "name", "description", "actor"],
        },
      },
      decision_points: {
        type: "array",
        items: {
          type: "object",
          properties: {
            after_step_order: { type: ["integer", "null"] },
            condition: { type: "string" },
            outcomes: {
              type: "array",
              items: {
                type: "object",
                properties: { label: { type: "string" }, next_step_order: { type: ["integer", "null"] } },
                required: ["label"],
              },
            },
          },
          required: ["condition", "outcomes"],
        },
      },
      exceptions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            issue: { type: "string" },
            handling: { type: "string" },
            related_step_order: { type: ["integer", "null"] },
          },
          required: ["issue", "handling"],
        },
      },
      handoffs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from_actor: { type: "string" },
            to_actor: { type: "string" },
            at_step_order: { type: ["integer", "null"] },
            required_inputs: { type: "array", items: { type: "string" } },
          },
          required: ["from_actor", "to_actor", "required_inputs"],
        },
      },
      metrics: {
        type: "object",
        properties: {
          step_durations: { type: "object" },
          success_indicators: { type: "array", items: { type: "string" } },
        },
      },
      gaps: {
        type: "array",
        items: { type: "string" },
        description: "Explizit geflaggte Lücken/Unklarheiten in den Ausgangsdaten. Niemals mit Annahmen füllen.",
      },
      mermaid_diagram: {
        type: "string",
        description: "Mermaid flowchart LR: Tasks als [...], Decisions als {...}, Start/Ende als ([...]). Pain-Point-nahe Schritte mit ⚠️ im Label markieren, falls aus den Daten ersichtlich.",
      },
    },
    required: ["trigger", "end_state", "steps", "decision_points", "exceptions", "handoffs", "metrics", "gaps", "mermaid_diagram"],
  },
};

export async function generateDocumentation(processId: string, correctionInstructions?: string): Promise<void> {
  const process = await prisma.process.findUniqueOrThrow({
    where: { id: processId },
    include: {
      client: true,
      interviews: { where: { status: "STRUCTURED" } },
      documents: true,
      documentation: true,
    },
  });

  if (process.interviews.length === 0) {
    throw new Error(
      "Mindestens ein strukturiertes Interview ist erforderlich. Prozessdokumente allein dürfen nie die einzige Quelle sein."
    );
  }

  await runStage(processId, "DOCUMENTATION", async () => {
    const interviewsBlock = process.interviews
      .map((i, idx) => `### Interview ${idx + 1}: ${i.participantName}${i.participantRole ? ` (${i.participantRole})` : ""}\n${i.structuredJson}`)
      .join("\n\n");

    const documentsBlock = process.documents.length
      ? process.documents.map((d) => `### Dokument: ${d.filename}\n${truncate(d.content)}`).join("\n\n")
      : "(keine ergänzenden Prozessdokumente)";

    const prompt = `Du bist Mira, eine präzise Process Documenter. Du transformierst strukturierte Interview-Outputs (im Finn-Schema: process_boundaries, happy_path, decision_points, exceptions, handoffs, metrics, preliminary_insights) und ergänzende Prozessdokumente in eine saubere, vollständige, eindeutige Prozessdokumentation.

Niemals Prozessschritte erfinden oder annehmen, die nicht in den Daten belegt sind. Fehlende Informationen werden explizit im "gaps"-Feld geflaggt, nie stillschweigend mit Annahmen gefüllt. Falls ein Schritt aus dem Kontext klar abgeleitet werden muss, markiere ihn mit inferred=true statt ihn unmarkiert einzufügen.

${AI_STRATEGY_HEADER(process.client.aiStrategy)}

## Prozess
${process.name}${process.goal ? ` — Ziel: ${process.goal}` : ""}

## Strukturierte Interviews
${interviewsBlock}

## Ergänzende Prozessdokumentation
${documentsBlock}
${correctionInstructions ? `\n## Korrekturanweisungen aus der Validierung (unbedingt berücksichtigen)\n${correctionInstructions}` : ""}

Erzeuge die vollständige, konsolidierte Prozessdokumentation inkl. Mermaid-Diagramm. Antworte ausschließlich über den Tool-Call "submit_process_documentation".`;

    const result = await callStructured(prompt, DOCUMENTATION_TOOL, documentationSchema);

    await prisma.$transaction(async (tx) => {
      await tx.processStep.deleteMany({ where: { processId } });
      await tx.processStep.createMany({
        data: result.steps.map((s) => ({
          processId,
          order: s.order,
          name: s.name,
          description: s.description,
          actor: s.actor,
          system: s.system ?? null,
          avgDuration: s.avg_duration ?? null,
          inferred: s.inferred ?? false,
        })),
      });

      const nextRound = (process.documentation?.round ?? 0) + 1;
      await tx.processDocumentation.upsert({
        where: { processId },
        create: {
          processId,
          triggerText: result.trigger,
          endStateText: result.end_state,
          decisionPointsJson: JSON.stringify(result.decision_points),
          exceptionsJson: JSON.stringify(result.exceptions),
          handoffsJson: JSON.stringify(result.handoffs),
          metricsJson: JSON.stringify(result.metrics),
          gapsJson: JSON.stringify(result.gaps),
          mermaidDiagram: result.mermaid_diagram,
          status: "DRAFT",
          round: nextRound,
        },
        update: {
          triggerText: result.trigger,
          endStateText: result.end_state,
          decisionPointsJson: JSON.stringify(result.decision_points),
          exceptionsJson: JSON.stringify(result.exceptions),
          handoffsJson: JSON.stringify(result.handoffs),
          metricsJson: JSON.stringify(result.metrics),
          gapsJson: JSON.stringify(result.gaps),
          mermaidDiagram: result.mermaid_diagram,
          status: "DRAFT",
          round: nextRound,
        },
      });
    });

    await advanceStage(processId, "PAIN_POINTS");
    return `${result.steps.length} Schritte dokumentiert, ${result.gaps.length} Lücke(n) geflaggt.`;
  });
}

// ---------------------------------------------------------------------------
// Stage 3 — Rex: Pain Point Analysis
// ---------------------------------------------------------------------------

const painPointsSchema = z.object({
  pain_points: z.array(
    z.object({
      step_order: z.number().nullable().optional(),
      title: z.string(),
      description: z.string(),
      category: z.enum([
        "manual_work",
        "delay_bottleneck",
        "communication_gap",
        "decision_delay",
        "data_quality",
        "visibility_gap",
        "redundant_step",
      ]),
      frequency: z.enum(["always", "often", "sometimes", "rarely"]),
      impact: z.enum(["high", "medium", "low"]),
      rationale: z.string(),
    })
  ),
  top_three_summary_md: z.string(),
});

const PAIN_POINTS_TOOL = {
  name: "submit_pain_point_report",
  description: "Submit the ranked, categorized pain point report derived exclusively from the process documentation.",
  input_schema: {
    type: "object",
    properties: {
      pain_points: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step_order: { type: ["integer", "null"], description: "order-Wert des betroffenen Prozessschritts, oder null falls prozessübergreifend" },
            title: { type: "string" },
            description: { type: "string" },
            category: {
              type: "string",
              enum: ["manual_work", "delay_bottleneck", "communication_gap", "decision_delay", "data_quality", "visibility_gap", "redundant_step"],
            },
            frequency: { type: "string", enum: ["always", "often", "sometimes", "rarely"] },
            impact: { type: "string", enum: ["high", "medium", "low"] },
            rationale: { type: "string", description: "Evidenzbasierte Begründung, ausschließlich aus der Prozessdokumentation abgeleitet." },
          },
          required: ["title", "description", "category", "frequency", "impact", "rationale"],
        },
      },
      top_three_summary_md: {
        type: "string",
        description: "Kurze Markdown-Zusammenfassung der drei Pain Points mit dem höchsten Potenzial für KI-gestützte Intervention.",
      },
    },
    required: ["pain_points", "top_three_summary_md"],
  },
};

export async function analyzePainPoints(processId: string, correctionInstructions?: string): Promise<void> {
  const process = await prisma.process.findUniqueOrThrow({
    where: { id: processId },
    include: { documentation: true, steps: { orderBy: { order: "asc" } } },
  });

  if (!process.documentation) {
    throw new Error("Es liegt noch keine Prozessdokumentation vor.");
  }

  await runStage(processId, "PAIN_POINTS", async () => {
    const doc = process.documentation!;
    const stepsBlock = process.steps.map((s) => `${s.order}. ${s.name} (${s.actor}${s.system ? `, ${s.system}` : ""}) — ${s.description}`).join("\n");

    const prompt = `Du bist Rex, ein scharfer Pain Point Analyzer. Du analysierst systematisch eine Prozessdokumentation, um Ineffizienzen mit dem höchsten Potenzial für KI-gestützte Verbesserung zu identifizieren, zu kategorisieren und zu priorisieren.

Analysiere jeden Schritt auf folgende Kategorien: manueller/repetitiver Aufwand, Bottlenecks/Verzögerungen, Kommunikationslücken/Handoff-Fehler, Entscheidungsverzögerungen durch fehlende Infos, Datenqualitätsprobleme, fehlende Visibility/Monitoring, redundante Schritte.

Wichtig: Du schlägst niemals Lösungen oder KI-Anwendungen vor — das ist ausschließlich Sache der Solution-Design-Phase. Stütze jeden Pain Point ausschließlich auf die Prozessdokumentation, keine Spekulation.

## Prozess
${process.name}
Trigger: ${doc.triggerText} | Endzustand: ${doc.endStateText}

## Prozessschritte
${stepsBlock}

## Decision Points
${doc.decisionPointsJson}

## Exceptions
${doc.exceptionsJson}

## Handoffs
${doc.handoffsJson}

## Metriken
${doc.metricsJson}
${correctionInstructions ? `\n## Korrekturanweisungen aus der Validierung (unbedingt berücksichtigen)\n${correctionInstructions}` : ""}

Erzeuge den vollständigen, priorisierten Pain-Point-Report inkl. Top-3-Zusammenfassung. Antworte ausschließlich über den Tool-Call "submit_pain_point_report".`;

    const result = await callStructured(prompt, PAIN_POINTS_TOOL, painPointsSchema);
    const stepByOrder = new Map(process.steps.map((s) => [s.order, s.id]));

    await prisma.$transaction(async (tx) => {
      await tx.painPoint.deleteMany({ where: { processId } });
      await tx.painPoint.createMany({
        data: result.pain_points.map((p) => ({
          processId,
          stepId: p.step_order != null ? stepByOrder.get(p.step_order) ?? null : null,
          title: p.title,
          description: p.description,
          category: p.category,
          frequency: p.frequency,
          impact: p.impact,
          rationale: p.rationale,
          status: "DRAFT",
        })),
      });
      await tx.process.update({
        where: { id: processId },
        data: { painPointsTopThreeMd: result.top_three_summary_md, painPointsStatus: "DRAFT" },
      });
    });

    await advanceStage(processId, "VALIDATION");
    return `${result.pain_points.length} Pain Points identifiziert.`;
  });
}

// ---------------------------------------------------------------------------
// Stage 4 — Viktor: Validation
// ---------------------------------------------------------------------------

const validationSchema = z.object({
  outcome: z.enum(["CLEARED", "CORRECTIONS_REQUIRED"]),
  notes_md: z.string(),
  correction_items: z.array(
    z.object({
      target_document: z.enum(["DOCUMENTATION", "PAIN_POINTS"]),
      location: z.string(),
      issue_type: z.string(),
      instructions: z.string(),
    })
  ),
  stakeholder_questions: z.array(
    z.object({
      category: z.enum(["completeness", "consistency", "accuracy", "gap"]),
      priority: z.enum(["high", "medium", "low"]),
      affected_steps: z.array(z.string()),
      question: z.string(),
      context: z.string(),
    })
  ),
});

const VALIDATION_TOOL = {
  name: "submit_validation_result",
  description: "Submit the validation outcome for the process documentation and pain point report, including any correction items or stakeholder clarifying questions.",
  input_schema: {
    type: "object",
    properties: {
      outcome: {
        type: "string",
        enum: ["CLEARED", "CORRECTIONS_REQUIRED"],
        description: "CLEARED nur wenn correction_items UND stakeholder_questions beide leer sind.",
      },
      notes_md: { type: "string", description: "Bei CLEARED: was genau validiert/bestätigt wurde. Bei CORRECTIONS_REQUIRED: Überblick über die Probleme." },
      correction_items: {
        type: "array",
        description: "Probleme, die intern durch Mira (Dokumentation) oder Rex (Pain Points) behoben werden können, weil die nötige Information bereits in den Ausgangsdaten vorhanden, aber falsch/unvollständig verarbeitet wurde.",
        items: {
          type: "object",
          properties: {
            target_document: { type: "string", enum: ["DOCUMENTATION", "PAIN_POINTS"] },
            location: { type: "string", description: "Genaue Stelle des Problems, z.B. Schrittname oder Pain-Point-Titel." },
            issue_type: { type: "string" },
            instructions: { type: "string", description: "Konkrete, umsetzbare Korrekturanweisung." },
          },
          required: ["target_document", "location", "issue_type", "instructions"],
        },
      },
      stakeholder_questions: {
        type: "array",
        description: "Fragen für echte Wissenslücken, die in den Ausgangsdaten nie erfasst wurden und daher nur durch Rückfrage beim Stakeholder geklärt werden können.",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["completeness", "consistency", "accuracy", "gap"] },
            priority: { type: "string", enum: ["high", "medium", "low"] },
            affected_steps: { type: "array", items: { type: "string" } },
            question: { type: "string", description: "Direkt an den Stakeholder gerichtet, ein Thema pro Frage." },
            context: { type: "string", description: "Ein Satz: warum diese Frage aufkommt." },
          },
          required: ["category", "priority", "affected_steps", "question", "context"],
        },
      },
    },
    required: ["outcome", "notes_md", "correction_items", "stakeholder_questions"],
  },
};

export async function runValidation(processId: string): Promise<void> {
  const process = await prisma.process.findUniqueOrThrow({
    where: { id: processId },
    include: {
      documentation: true,
      painPoints: { include: { step: true } },
      steps: { orderBy: { order: "asc" } },
      validationRuns: true,
    },
  });

  if (!process.documentation || process.painPoints.length === 0) {
    throw new Error("Sowohl Prozessdokumentation als auch Pain-Point-Report müssen vorliegen, bevor validiert werden kann.");
  }

  await runStage(processId, "VALIDATION", async () => {
    const doc = process.documentation!;
    const stepsBlock = process.steps.map((s) => `${s.order}. ${s.name} (${s.actor}${s.system ? `, ${s.system}` : ""}) [inferred=${s.inferred}] — ${s.description}`).join("\n");
    const painPointsBlock = process.painPoints
      .map((p) => `- [${p.category}/${p.frequency}/${p.impact}] ${p.title} (Schritt: ${p.step?.name ?? "prozessübergreifend"}): ${p.description}\n  Begründung: ${p.rationale}`)
      .join("\n");

    const prompt = `Du bist Viktor, ein exakter, unparteiischer Process Validator. Du bist das Qualitäts-Gate zwischen Analyse- und Lösungsdesign-Phase.

Prüfe Vollständigkeit, Konsistenz und Genauigkeit sowohl der Prozessdokumentation als auch des Pain-Point-Reports — niemals nur eines der beiden isoliert. Prüfe insbesondere, ob jeder Pain Point auf einen dokumentierten Schritt zurückführbar ist und ob Kategorie/Priorität durch die Prozessdaten gedeckt sind.

Unterscheide bei Problemen zwei Fälle:
1. Die Information ist vermutlich in den Ausgangsdaten vorhanden, wurde aber unvollständig oder falsch verarbeitet → correction_items, adressiert an Mira (DOCUMENTATION) oder Rex (PAIN_POINTS).
2. Die Information wurde im Ausgangsmaterial nie erfasst (echte Wissenslücke) → stakeholder_questions, direkt an den Interviewten gerichtet.

Erteile CLEARED nur, wenn beide Listen leer sind. Niemals Teil-Freigaben.

## Prozessdokumentation (Runde ${doc.round})
Trigger: ${doc.triggerText} | Endzustand: ${doc.endStateText}

### Schritte
${stepsBlock}

### Decision Points
${doc.decisionPointsJson}

### Exceptions
${doc.exceptionsJson}

### Handoffs
${doc.handoffsJson}

### Von Mira geflaggte Lücken
${doc.gapsJson}

## Pain-Point-Report
${painPointsBlock}

Antworte ausschließlich über den Tool-Call "submit_validation_result".`;

    const result = await callStructured(prompt, VALIDATION_TOOL, validationSchema);
    const outcome = result.correction_items.length === 0 && result.stakeholder_questions.length === 0 ? result.outcome : "CORRECTIONS_REQUIRED";
    const round = process.validationRuns.length + 1;

    await prisma.$transaction(async (tx) => {
      const run = await tx.validationRun.create({
        data: { processId, round, outcome, notes: result.notes_md },
      });
      if (result.correction_items.length) {
        await tx.correctionItem.createMany({
          data: result.correction_items.map((c) => ({
            validationRunId: run.id,
            targetDocument: c.target_document,
            location: c.location,
            issueType: c.issue_type,
            instructions: c.instructions,
            resolutionPath: "INTERNAL",
          })),
        });
      }
      if (result.stakeholder_questions.length) {
        await tx.stakeholderQuestion.createMany({
          data: result.stakeholder_questions.map((q) => ({
            validationRunId: run.id,
            category: q.category,
            priority: q.priority,
            affectedSteps: JSON.stringify(q.affected_steps),
            question: q.question,
            context: q.context,
          })),
        });
      }

      const docStatus = outcome === "CLEARED" ? "VALIDATED" : "NEEDS_CORRECTION";
      await tx.processDocumentation.update({ where: { processId }, data: { status: docStatus } });
      await tx.process.update({ where: { id: processId }, data: { painPointsStatus: docStatus } });
    });

    if (outcome === "CLEARED") await advanceStage(processId, "SOLUTION_DESIGN");
    return outcome === "CLEARED"
      ? "Volle Freigabe erteilt."
      : `Korrektur erforderlich: ${result.correction_items.length} interne(s) Item(s), ${result.stakeholder_questions.length} Rückfrage(n) an den Stakeholder.`;
  });
}

export async function submitCorrectionRound(processId: string): Promise<void> {
  const latestRun = await prisma.validationRun.findFirst({
    where: { processId },
    orderBy: { round: "desc" },
    include: { correctionItems: { where: { resolved: false } }, stakeholderQuestions: true },
  });
  if (!latestRun) throw new Error("Es liegt noch kein Validierungslauf vor.");

  const docItems = latestRun.correctionItems.filter((c) => c.targetDocument === "DOCUMENTATION");
  const painItems = latestRun.correctionItems.filter((c) => c.targetDocument === "PAIN_POINTS");
  const answeredQuestions = latestRun.stakeholderQuestions.filter((q) => q.answer);

  const clarificationBlock = answeredQuestions.length
    ? `\n\nKlärende Rückfragen an den Stakeholder und dessen Antworten:\n${answeredQuestions
        .map((q) => `F: ${q.question}\nA: ${q.answer}`)
        .join("\n\n")}`
    : "";

  const docInstructions = docItems.length
    ? docItems.map((c) => `- [${c.issueType}] ${c.location}: ${c.instructions}`).join("\n") + clarificationBlock
    : answeredQuestions.length
    ? `Berücksichtige folgende Klärungen:${clarificationBlock}`
    : undefined;

  const painInstructions = painItems.length
    ? painItems.map((c) => `- [${c.issueType}] ${c.location}: ${c.instructions}`).join("\n") + clarificationBlock
    : answeredQuestions.length
    ? `Berücksichtige folgende Klärungen:${clarificationBlock}`
    : undefined;

  await generateDocumentation(processId, docInstructions);
  await analyzePainPoints(processId, painInstructions);
  await runValidation(processId);

  await prisma.correctionItem.updateMany({
    where: { id: { in: latestRun.correctionItems.map((c) => c.id) } },
    data: { resolved: true },
  });
}

// ---------------------------------------------------------------------------
// Stage 5 — Aria: Solution Concept Design (conceptual only)
// ---------------------------------------------------------------------------

const solutionConceptsSchema = z.object({
  concepts: z.array(
    z.object({
      pain_point_id: z.string(),
      type: z.enum(["PROMPT", "AGENT", "AUTOMATION", "TEMPLATE", "VIBE_CODE"]),
      title: z.string(),
      purpose: z.string(),
      how_it_works: z.string(),
      time_savings_impact: z.string(),
      quality_impact: z.string(),
      confidence_impact: z.string(),
    })
  ),
});

const SOLUTION_CONCEPTS_TOOL = {
  name: "submit_solution_concepts",
  description: "Submit one conceptual AI/automation solution proposal per validated pain point.",
  input_schema: {
    type: "object",
    properties: {
      concepts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            pain_point_id: { type: "string", description: "Exakte ID des adressierten Pain Points, wie in den Eingabedaten angegeben." },
            type: {
              type: "string",
              enum: ["PROMPT", "AGENT", "AUTOMATION", "TEMPLATE", "VIBE_CODE"],
              description:
                "PROMPT = Textgenerierung/Einzelentscheidung. AGENT = komplexe mehrstufige autonome Entscheidungen über mehrere Schritte. AUTOMATION = regelbasiert, repetitiv, kein Ermessen, kein LLM nötig. TEMPLATE = Standardisierung ohne KI, immer eine ehrliche Option. VIBE_CODE = braucht eine echte Software-/Tooling-Lösung. Wähle immer die minimal wirksame Lösung, nicht automatisch AGENT.",
            },
            title: { type: "string" },
            purpose: { type: "string" },
            how_it_works: { type: "string", description: "Konzeptionelle Beschreibung, keine technische Spezifikation." },
            time_savings_impact: { type: "string" },
            quality_impact: { type: "string" },
            confidence_impact: { type: "string", description: "Wie das Konzept den Verantwortlichen mehr Schnelligkeit und Sicherheit in ihrer Arbeit gibt." },
          },
          required: ["pain_point_id", "type", "title", "purpose", "how_it_works", "time_savings_impact", "quality_impact", "confidence_impact"],
        },
      },
    },
    required: ["concepts"],
  },
};

export async function designSolutionConcepts(processId: string): Promise<void> {
  const process = await prisma.process.findUniqueOrThrow({
    where: { id: processId },
    include: {
      client: true,
      painPoints: { include: { step: true } },
      validationRuns: { orderBy: { round: "desc" }, take: 1 },
    },
  });

  if (process.validationRuns[0]?.outcome !== "CLEARED") {
    throw new Error("Aria darf erst aktiviert werden, nachdem Viktor volle Freigabe erteilt hat.");
  }

  await runStage(processId, "SOLUTION_DESIGN", async () => {
    const painPointsBlock = process.painPoints
      .map((p) => `- id="${p.id}" [${p.category}/${p.frequency}/${p.impact}] ${p.title} (Schritt: ${p.step?.name ?? "prozessübergreifend"}): ${p.description}`)
      .join("\n");

    const prompt = `Du bist Aria, eine strategische AI Solution Architect. Du entwirfst konzeptionelle, geschäftstaugliche Lösungsvorschläge für validierte Pain Points.

Wähle für jeden Pain Point den minimal wirksamen Lösungstyp aus dem Spektrum PROMPT / AGENT / AUTOMATION / TEMPLATE / VIBE_CODE. Greife nicht automatisch zu AGENT — ein einfaches Template oder eine Automation kann die ehrlichere, bessere Empfehlung sein. Bleibe strikt konzeptionell: keine technischen Spezifikationen, keine Implementierungspläne, keine Tool-/Vendor-Empfehlungen.

Für jedes Konzept musst du explizit alle drei Impact-Dimensionen adressieren: Zeitersparnis, Qualitätsverbesserung, Vertrauens-/Sicherheitsgewinn für die verantwortlichen Personen.

${AI_STRATEGY_HEADER(process.client.aiStrategy)}

## Validierte Pain Points
${painPointsBlock}

Erzeuge pro Pain Point mindestens ein Lösungskonzept (referenziere die exakte pain_point_id). Antworte ausschließlich über den Tool-Call "submit_solution_concepts".`;

    const result = await callStructured(prompt, SOLUTION_CONCEPTS_TOOL, solutionConceptsSchema);
    const validIds = new Set(process.painPoints.map((p) => p.id));
    const concepts = result.concepts.filter((c) => validIds.has(c.pain_point_id));

    await prisma.$transaction(async (tx) => {
      await tx.solutionConcept.deleteMany({ where: { processId } });
      await tx.solutionConcept.createMany({
        data: concepts.map((c) => ({
          processId,
          painPointId: c.pain_point_id,
          type: c.type,
          title: c.title,
          purpose: c.purpose,
          howItWorks: c.how_it_works,
          timeSavingsImpact: c.time_savings_impact,
          qualityImpact: c.quality_impact,
          confidenceImpact: c.confidence_impact,
        })),
      });
    });

    await advanceStage(processId, "ARTIFACTS");
    return `${concepts.length} Lösungskonzept(e) entworfen.`;
  });
}

// ---------------------------------------------------------------------------
// Stage 6 — Artifact generation (only for consultant-prioritized concepts)
// ---------------------------------------------------------------------------

const artifactSchema = z.object({ artifact_title: z.string(), artifact_content: z.string() });

const ARTIFACT_TOOL = {
  name: "submit_solution_artifact",
  description: "Submit the fully usable solution artifact for a prioritized concept.",
  input_schema: {
    type: "object",
    properties: {
      artifact_title: { type: "string" },
      artifact_content: {
        type: "string",
        description:
          "Vollständiger, sofort nutzbarer Inhalt: bei PROMPT der fertige Prompt-Text; bei AGENT eine Agent-Spezifikation (Zweck, System-Prompt, Tools, Trigger, Guardrails, Erfolgsmetriken); bei AUTOMATION eine Ablauf-/Regel-Spezifikation; bei TEMPLATE die fertige Checkliste/Vorlage; bei VIBE_CODE ein Build-Brief für die Umsetzung z.B. mit Claude Code.",
      },
    },
    required: ["artifact_title", "artifact_content"],
  },
};

export async function generateArtifact(solutionConceptId: string): Promise<void> {
  const concept = await prisma.solutionConcept.findUniqueOrThrow({
    where: { id: solutionConceptId },
    include: { process: { include: { client: true } }, painPoint: { include: { step: true } } },
  });

  await runStage(concept.processId, "ARTIFACT_GENERATION", async () => {
    const prompt = `Du erzeugst das konkrete, sofort nutzbare Lösungsartefakt für ein bereits konzipiertes und vom Berater priorisiertes Konzept.

${AI_STRATEGY_HEADER(concept.process.client.aiStrategy)}

## Konzept
Typ: ${concept.type}
Titel: ${concept.title}
Zweck: ${concept.purpose}
Funktionsweise: ${concept.howItWorks}

## Adressierter Pain Point
${concept.painPoint.title}: ${concept.painPoint.description}
Betroffener Prozessschritt: ${concept.painPoint.step?.name ?? "prozessübergreifend"}${concept.painPoint.step?.description ? ` — ${concept.painPoint.step.description}` : ""}

Erzeuge das vollständige Artefakt passend zum Typ. Antworte ausschließlich über den Tool-Call "submit_solution_artifact".`;

    const result = await callStructured(prompt, ARTIFACT_TOOL, artifactSchema);

    await prisma.solutionConcept.update({
      where: { id: solutionConceptId },
      data: {
        artifactTitle: result.artifact_title,
        artifactContent: result.artifact_content,
        artifactGeneratedAt: new Date(),
        status: "ARTIFACT_GENERATED",
      },
    });

    return `Artefakt "${result.artifact_title}" erzeugt.`;
  });
}

// ---------------------------------------------------------------------------
// Stage 7 — Max: Final AI Solution Report
// ---------------------------------------------------------------------------

const reportSchema = z.object({
  executive_summary_md: z.string(),
  full_report_md: z.string(),
  next_step_md: z.string(),
});

const REPORT_TOOL = {
  name: "submit_final_report",
  description: "Submit the formal, customer-presentable AI Solution Report.",
  input_schema: {
    type: "object",
    properties: {
      executive_summary_md: { type: "string", description: "Management-Zusammenfassung in deutscher Geschäftssprache, ohne technischen Jargon." },
      full_report_md: {
        type: "string",
        description:
          "Vollständiger formaler Report in Markdown: Prozessüberblick, Top-Pain-Points, je Konzept Typ/Zweck/Funktionsweise/drei Impact-Dimensionen, klar markierter Abschnitt mit den vom Berater priorisierten Konzepten.",
      },
      next_step_md: { type: "string", description: "Konkreter nächster Schritt für den Kunden, um vom Konzept zur Umsetzung zu kommen." },
    },
    required: ["executive_summary_md", "full_report_md", "next_step_md"],
  },
};

export async function generateFinalReport(processId: string): Promise<void> {
  const process = await prisma.process.findUniqueOrThrow({
    where: { id: processId },
    include: {
      client: true,
      documentation: true,
      painPoints: true,
      solutionConcepts: { include: { painPoint: true } },
    },
  });

  await runStage(processId, "FINAL_REPORT", async () => {
    const conceptsBlock = process.solutionConcepts
      .map(
        (c) =>
          `- ${c.isPriority ? "[PRIORITÄT] " : ""}${c.title} (Typ: ${c.type}) für Pain Point "${c.painPoint.title}"\n  Zweck: ${c.purpose}\n  Funktionsweise: ${c.howItWorks}\n  Zeitersparnis: ${c.timeSavingsImpact}\n  Qualität: ${c.qualityImpact}\n  Vertrauen: ${c.confidenceImpact}${c.artifactTitle ? `\n  Artefakt bereits erzeugt: ${c.artifactTitle}` : ""}`
      )
      .join("\n\n");

    const prompt = `Du erstellst den finalen AI Solution Report für die Präsentation beim Kunden ${process.client.name}. Der Report muss formal, überzeugend, in deutscher Geschäftssprache und für Entscheider verständlich sein — kein technischer Jargon.

${AI_STRATEGY_HEADER(process.client.aiStrategy)}

## Prozess
${process.name}${process.goal ? ` — Ziel: ${process.goal}` : ""}
Trigger: ${process.documentation?.triggerText} | Endzustand: ${process.documentation?.endStateText}

## Top-Pain-Points
${process.painPointsTopThreeMd ?? "-"}

## Lösungskonzepte (vom Berater priorisierte sind markiert)
${conceptsBlock}

Erstelle den vollständigen Report. Antworte ausschließlich über den Tool-Call "submit_final_report".`;

    const result = await callStructured(prompt, REPORT_TOOL, reportSchema);

    await prisma.analysisReport.create({
      data: {
        processId,
        executiveSummaryMd: result.executive_summary_md,
        fullReportMd: result.full_report_md,
        nextStepMd: result.next_step_md,
      },
    });

    await advanceStage(processId, "DONE");
    return "Report erstellt.";
  });
}
