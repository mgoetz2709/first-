import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAnthropicClient, ANALYSIS_MODEL } from "@/lib/anthropic";
import type { FindingSource, RecommendationType } from "@/lib/types";

const MAX_CHARS_PER_SOURCE = 20000;

const recommendationSchema = z.object({
  type: z.enum(["PROMPT", "AGENT", "VIBE_CODE"]),
  rationale: z.string(),
  artifactTitle: z.string().optional().nullable(),
  artifact: z.string(),
});

const findingSchema = z.object({
  stepName: z.string().optional().nullable(),
  title: z.string(),
  description: z.string(),
  painPoint: z.string().optional().nullable(),
  source: z.enum(["INTERVIEW", "DOCUMENT", "MANUAL"]),
  sourceRef: z.string().optional().nullable(),
  recommendations: z.array(recommendationSchema).min(1),
});

const analysisResultSchema = z.object({
  summary: z.string(),
  findings: z.array(findingSchema),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

const ANALYSIS_TOOL = {
  name: "submit_process_analysis",
  description:
    "Submit the structured results of the end-to-end process analysis: identified findings per process step and, for each finding, one or more classified recommendations with a fully generated solution artifact.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description:
          "Management-Zusammenfassung der Analyse auf Deutsch (3-6 Sätze): wichtigste Erkenntnisse und Gesamteinschätzung des Automatisierungspotenzials.",
      },
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            stepName: {
              type: ["string", "null"],
              description:
                "Name des betroffenen Prozessschritts, exakt wie in der Prozessschritt-Liste angegeben. null falls das Finding prozessübergreifend ist.",
            },
            title: { type: "string", description: "Kurzer, prägnanter Titel des Findings/Problems." },
            description: {
              type: "string",
              description: "Detaillierte Beschreibung des Problems, wie es im Prozess auftritt.",
            },
            painPoint: {
              type: "string",
              description: "Konkreter Schmerzpunkt bzw. Business-Auswirkung (Zeit, Kosten, Qualität, Risiko).",
            },
            source: {
              type: "string",
              enum: ["INTERVIEW", "DOCUMENT", "MANUAL"],
              description: "Woher das Finding stammt.",
            },
            sourceRef: {
              type: "string",
              description: "Referenz auf die Quelle, z.B. Name des Interview-Teilnehmers oder Dokumentname.",
            },
            recommendations: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["PROMPT", "AGENT", "VIBE_CODE"],
                    description:
                      "PROMPT = einmaliges/seltenes Problem, lösbar durch einen von einem Menschen ausgeführten, gut engineerten Prompt (Action-Prinzip). AGENT = wiederkehrende, klar definierte Aufgabe, die ein AI-Agent eigenständig oder halbautonom übernehmen kann. VIBE_CODE = das Problem braucht eine echte Software-/Tooling-Lösung (Integration, Determinismus, UI, Datenhaltung), umsetzbar z.B. via Claude Code.",
                  },
                  rationale: {
                    type: "string",
                    description:
                      "Warum diese Klassifikation gewählt wurde, explizit unter Bezug auf die AI-Strategie des Kunden (Reifegrad, Risikobereitschaft, Governance, erlaubte Tools).",
                  },
                  artifactTitle: { type: "string", description: "Kurzer Titel für das generierte Artefakt." },
                  artifact: {
                    type: "string",
                    description:
                      "Das vollständige, direkt verwendbare Artefakt. Bei PROMPT: der fertige, engineerte Prompt-Text (Rolle, Kontext, Instruktionen, Output-Format, ggf. Few-Shot-Beispiele). Bei AGENT: eine vollständige Agent-Spezifikation (Zweck, System-Prompt, benötigte Tools/Integrationen, Trigger/Inputs, Guardrails, Erfolgsmetriken). Bei VIBE_CODE: ein Build-Brief (Zweck, Kernfunktionalität, Datenmodell-Skizze, zentrale Screens/Flows, Integrationspunkte, Umsetzungsempfehlung z.B. mit Claude Code).",
                  },
                },
                required: ["type", "rationale", "artifact"],
              },
            },
          },
          required: ["title", "description", "source", "recommendations"],
        },
      },
    },
    required: ["summary", "findings"],
  },
};

function truncate(text: string, max = MAX_CHARS_PER_SOURCE): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n\n[... gekürzt, ${text.length - max} weitere Zeichen ...]`;
}

async function buildPrompt(processId: string) {
  const process = await prisma.process.findUniqueOrThrow({
    where: { id: processId },
    include: {
      client: true,
      steps: { orderBy: { order: "asc" } },
      interviews: true,
      documents: true,
    },
  });

  const stepsBlock = process.steps.length
    ? process.steps
        .map(
          (s) =>
            `- [Schritt ${s.order}] ${s.name}${s.roleResponsible ? ` (Verantwortlich: ${s.roleResponsible})` : ""}${
              s.systemsUsed ? ` | Systeme: ${s.systemsUsed}` : ""
            }\n  ${s.description ?? ""}`
        )
        .join("\n")
    : "(Keine Prozessschritte erfasst)";

  const interviewsBlock = process.interviews.length
    ? process.interviews
        .map(
          (i) =>
            `### Interview mit ${i.participantName}${i.participantRole ? ` (${i.participantRole})` : ""}\n${truncate(
              i.transcript
            )}`
        )
        .join("\n\n")
    : "(Keine Interviews erfasst)";

  const documentsBlock = process.documents.length
    ? process.documents
        .map((d) => `### Dokument: ${d.filename}\n${truncate(d.content)}`)
        .join("\n\n")
    : "(Keine Dokumente erfasst)";

  const prompt = `Du bist ein Senior Process & AI-Strategy Consultant. Du analysierst einen End-to-End Geschäftsprozess eines Kunden, um herauszufinden, an welchen Stellen KI-basierte Lösungen die Prozessprobleme beheben können.

## AI-Strategie des Kunden (verbindlicher Rahmen für alle Empfehlungen)
${process.client.aiStrategy || "(keine spezifische AI-Strategie hinterlegt – gehe von einem vorsichtigen, pragmatischen Ansatz aus)"}

## Kunde
${process.client.name}${process.client.industry ? ` (Branche: ${process.client.industry})` : ""}

## Prozess
Name: ${process.name}
Ziel: ${process.goal ?? "-"}
Owner: ${process.owner ?? "-"}
Beschreibung: ${process.description ?? "-"}

## Prozessschritte
${stepsBlock}

## Interview-Transkripte/Notizen
${interviewsBlock}

## Prozessdokumentation
${documentsBlock}

## Aufgabe
1. Identifiziere konkrete, im Material belegte Probleme/Pain Points je Prozessschritt (nutze wörtliche Hinweise aus Interviews und Dokumenten, keine Spekulation ohne Anhaltspunkt).
2. Klassifiziere für jedes Problem die passende Lösung nach dem Action-Prinzip:
   - PROMPT: einmalige oder seltene Probleme, für die ein einzelner Mensch mit einem gut engineerten Prompt arbeiten kann.
   - AGENT: wiederkehrende, klar abgrenzbare Teilaufgaben, die ein AI-Agent eigenständig oder halbautonom im Prozess übernehmen kann.
   - VIBE_CODE: Probleme, die eine echte, deterministische Software-/Tooling-Lösung brauchen (z.B. via Claude Code umsetzbar) – etwa wegen Integrationen, UI-Bedarf, Datenhaltung oder hoher Wiederholrate mit fester Logik.
   Ein Finding kann auch mehrere Empfehlungen haben, wenn Teilaspekte unterschiedlich zu lösen sind.
3. Wäge die Klassifikation explizit gegen die AI-Strategie des Kunden ab (Reifegrad, Risikobereitschaft, Governance-Vorgaben, bereits erlaubte Tools).
4. Erzeuge für jede Empfehlung das vollständige, sofort nutzbare Artefakt (fertiger Prompt / Agent-Spezifikation / Build-Brief für Vibe-Coding).

Antworte ausschließlich über den Tool-Call "submit_process_analysis".`;

  return prompt;
}

export async function runProcessAnalysis(processId: string) {
  const run = await prisma.analysisRun.create({
    data: { processId, status: "RUNNING" },
  });

  try {
    const prompt = await buildPrompt(processId);
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 8000,
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: "submit_process_analysis" },
      messages: [{ role: "user", content: prompt }],
    });

    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Claude hat kein strukturiertes Analyseergebnis zurückgegeben.");
    }

    const result = analysisResultSchema.parse(toolUse.input);

    const steps = await prisma.processStep.findMany({ where: { processId } });
    const stepByName = new Map(steps.map((s) => [s.name.trim().toLowerCase(), s.id]));

    await prisma.$transaction(async (tx) => {
      for (const finding of result.findings) {
        const stepId = finding.stepName
          ? stepByName.get(finding.stepName.trim().toLowerCase()) ?? null
          : null;

        await tx.finding.create({
          data: {
            processId,
            stepId,
            title: finding.title,
            description: finding.description,
            painPoint: finding.painPoint ?? null,
            source: finding.source as FindingSource,
            sourceRef: finding.sourceRef ?? null,
            analysisRunId: run.id,
            recommendations: {
              create: finding.recommendations.map((r) => ({
                type: r.type as RecommendationType,
                rationale: r.rationale,
                artifactTitle: r.artifactTitle ?? null,
                artifact: r.artifact,
              })),
            },
          },
        });
      }

      await tx.analysisRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", summary: result.summary, completedAt: new Date() },
      });
    });

    return run.id;
  } catch (err) {
    await prisma.analysisRun.update({
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
