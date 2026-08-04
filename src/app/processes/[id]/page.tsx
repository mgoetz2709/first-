import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  answerStakeholderQuestion,
  createDocument,
  createInterview,
  deleteDocument,
  deleteInterview,
  analyzePainPointsAction,
  designSolutionConceptsAction,
  generateArtifactAction,
  generateDocumentationAction,
  generateFinalReportAction,
  generateInterviewGuideAction,
  runValidationAction,
  structureInterviewAction,
  submitCorrectionRoundAction,
  toggleConceptPriority,
} from "@/lib/actions";
import {
  CategoryBadge,
  DocStatusBadge,
  FrequencyBadge,
  ImpactBadge,
  InterviewStatusBadge,
  SolutionTypeBadge,
  StagePill,
  ValidationOutcomeBadge,
} from "@/components/badges";

export const dynamic = "force-dynamic";
// Several actions invoked from this page call Claude with long prompts
// (documentation, pain point analysis, solution design, correction rounds
// chain three calls back to back) and can run well past Vercel's default
// serverless function duration. Raise the ceiling accordingly.
export const maxDuration = 300;

export default async function ProcessPage({ params }: { params: { id: string } }) {
  const process = await prisma.process.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      steps: { orderBy: { order: "asc" } },
      interviews: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      documentation: true,
      painPoints: { orderBy: { createdAt: "desc" }, include: { step: true } },
      validationRuns: { orderBy: { round: "desc" }, include: { correctionItems: true, stakeholderQuestions: true } },
      solutionConcepts: { orderBy: { createdAt: "asc" }, include: { painPoint: true } },
      reports: { orderBy: { createdAt: "desc" } },
      pipelineRuns: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!process) notFound();

  const hasStructuredInterview = process.interviews.some((i) => i.status === "STRUCTURED");
  const doc = process.documentation;
  const canAnalyzePainPoints = !!doc;
  const canValidate = !!doc && process.painPoints.length > 0;
  const latestValidation = process.validationRuns[0];
  const isCleared = latestValidation?.outcome === "CLEARED";
  const needsCorrection = latestValidation?.outcome === "CORRECTIONS_REQUIRED";
  const unresolvedCorrections = needsCorrection ? latestValidation.correctionItems.filter((c) => !c.resolved) : [];
  const questions = needsCorrection ? latestValidation.stakeholderQuestions : [];
  const canSubmitCorrection = needsCorrection;

  const decisionPoints = doc ? (JSON.parse(doc.decisionPointsJson) as any[]) : [];
  const exceptions = doc ? (JSON.parse(doc.exceptionsJson) as any[]) : [];
  const handoffs = doc ? (JSON.parse(doc.handoffsJson) as any[]) : [];
  const metrics = doc ? (JSON.parse(doc.metricsJson) as { step_durations?: Record<string, string>; success_indicators?: string[] }) : null;
  const gaps = doc ? (JSON.parse(doc.gapsJson) as string[]) : [];

  const conceptsByPainPoint = new Map<string, typeof process.solutionConcepts>();
  for (const c of process.solutionConcepts) {
    const arr = conceptsByPainPoint.get(c.painPointId) ?? [];
    arr.push(c);
    conceptsByPainPoint.set(c.painPointId, arr);
  }

  const latestReport = process.reports[0];

  return (
    <div className="space-y-10">
      <div>
        <Link href={`/clients/${process.clientId}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          &larr; {process.client.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{process.name}</h1>
          <StagePill stage={process.stage} />
        </div>
        {process.description && <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{process.description}</p>}
      </div>

      {/* Stage 1: Interviews */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">1. Interviews</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Interview ist Pflicht-Quelle. Prozessdokumente (unten) dürfen diese nur ergänzen, nie ersetzen.
        </p>

        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Interview-Leitfaden</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Maßgeschneiderter Fünf-Phasen-Leitfaden mit auf diesen Prozess zugeschnittenen Fragen, zum
              Mitnehmen ins Gespräch.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {process.interviewGuideJson && (
              <Link href={`/processes/${process.id}/guide`} className="btn-secondary" target="_blank">
                Leitfaden öffnen
              </Link>
            )}
            <form action={generateInterviewGuideAction}>
              <input type="hidden" name="processId" value={process.id} />
              <button type="submit" className="btn">
                {process.interviewGuideJson ? "Neu generieren" : "Leitfaden generieren"}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-3">
          {process.interviews.map((i) => (
            <div key={i.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{i.participantName}</span>
                  {i.participantRole && <span className="text-sm text-slate-500 dark:text-slate-400"> – {i.participantRole}</span>}
                  <span className="ml-2 text-xs text-slate-400">({i.mode})</span>
                </div>
                <div className="flex items-center gap-2">
                  <InterviewStatusBadge status={i.status} />
                  {i.status === "RAW" && (
                    <form action={structureInterviewAction}>
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="processId" value={process.id} />
                      <button type="submit" className="btn-secondary">Struktur extrahieren</button>
                    </form>
                  )}
                  <form action={deleteInterview}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="processId" value={process.id} />
                    <button type="submit" className="btn-danger">Löschen</button>
                  </form>
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate-500 dark:text-slate-400">Transkript anzeigen</summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{i.transcript}</p>
              </details>
              {i.structuredJson && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-slate-500 dark:text-slate-400">Strukturierte Extraktion anzeigen</summary>
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                    {JSON.stringify(JSON.parse(i.structuredJson), null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
        <details className="card mt-3">
          <summary className="cursor-pointer text-sm font-medium">+ Interview hinzufügen</summary>
          <form action={createInterview} className="mt-4 space-y-3">
            <input type="hidden" name="processId" value={process.id} />
            <input className="input" name="participantName" placeholder="Name des Teilnehmers" required />
            <input className="input" name="participantRole" placeholder="Rolle im Prozess" />
            <select className="input" name="mode" defaultValue="transcript_analysis">
              <option value="transcript_analysis">Teams-Session mit KI-Transkript (empfohlen)</option>
              <option value="live_chat">Präsenz-/Live-Interview</option>
              <option value="async_qa">Asynchrones Q&A</option>
            </select>
            <textarea className="input" name="transcript" placeholder="Transkript / Notizen einfügen ..." rows={6} required />
            <button type="submit" className="btn w-full">Hinzufügen</button>
          </form>
        </details>
      </section>

      {/* Supplementary documents */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">Ergänzende Prozessdokumentation</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Optional, immer nur als Add-on zu mindestens einem Interview.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {process.documents.map((d) => (
            <details key={d.id} className="card">
              <summary className="cursor-pointer text-sm font-medium">{d.filename}</summary>
              <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{d.content}</p>
              <form action={deleteDocument} className="mt-3">
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="processId" value={process.id} />
                <button type="submit" className="btn-danger">Löschen</button>
              </form>
            </details>
          ))}
        </div>
        <details className="card mt-3">
          <summary className="cursor-pointer text-sm font-medium">+ Dokument hinzufügen</summary>
          <form action={createDocument} className="mt-4 space-y-3" encType="multipart/form-data">
            <input type="hidden" name="processId" value={process.id} />
            <input className="input" name="file" type="file" accept=".txt,.md,.csv,.json" />
            <div className="text-center text-xs text-slate-400">— oder —</div>
            <input className="input" name="filename" placeholder="Dokumentname" />
            <textarea className="input" name="content" placeholder="Text der Prozessdokumentation einfügen ..." rows={5} />
            <button type="submit" className="btn w-full">Hinzufügen</button>
          </form>
        </details>
      </section>

      {/* Stage 2: Documentation */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">2. Prozessdokumentation</h2>
          <div className="flex items-center gap-2">
            {doc && <DocStatusBadge status={doc.status} />}
            <form action={generateDocumentationAction}>
              <input type="hidden" name="processId" value={process.id} />
              <button type="submit" className="btn" disabled={!hasStructuredInterview}>
                {doc ? "Neu generieren" : "Dokumentation erstellen"}
              </button>
            </form>
          </div>
        </div>
        {!hasStructuredInterview && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Mindestens ein strukturiertes Interview ist erforderlich.
          </p>
        )}
        {doc && (
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <span className="font-medium">Trigger:</span> {doc.triggerText} &middot; <span className="font-medium">Endzustand:</span> {doc.endStateText}
              <span className="ml-2 text-xs text-slate-400">Runde {doc.round}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="pb-1 pr-3">#</th>
                    <th className="pb-1 pr-3">Schritt</th>
                    <th className="pb-1 pr-3">Actor</th>
                    <th className="pb-1 pr-3">System</th>
                    <th className="pb-1 pr-3">Dauer</th>
                  </tr>
                </thead>
                <tbody>
                  {process.steps.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1 pr-3">{s.order}</td>
                      <td className="py-1 pr-3">
                        {s.name}
                        {s.inferred && <span className="ml-1 text-amber-600 dark:text-amber-400">(abgeleitet)</span>}
                      </td>
                      <td className="py-1 pr-3">{s.actor}</td>
                      <td className="py-1 pr-3">{s.system ?? "–"}</td>
                      <td className="py-1 pr-3">{s.avgDuration ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {gaps.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                <div className="font-medium text-amber-800 dark:text-amber-300">Geflaggte Lücken</div>
                <ul className="mt-1 list-inside list-disc text-amber-700 dark:text-amber-400">
                  {gaps.map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </div>
            )}

            <details>
              <summary className="cursor-pointer font-medium">Decision Points, Exceptions, Handoffs, Metriken</summary>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="font-medium">Decision Points</div>
                  {decisionPoints.length === 0 && <div className="text-slate-400">–</div>}
                  <ul className="list-inside list-disc">
                    {decisionPoints.map((d, idx) => (
                      <li key={idx}>
                        {d.condition}: {(d.outcomes ?? []).map((o: any) => o.label).join(" / ")}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium">Exceptions</div>
                  {exceptions.length === 0 && <div className="text-slate-400">–</div>}
                  <ul className="list-inside list-disc">
                    {exceptions.map((e, idx) => (
                      <li key={idx}>
                        {e.issue} → {e.handling}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium">Handoffs</div>
                  {handoffs.length === 0 && <div className="text-slate-400">–</div>}
                  <ul className="list-inside list-disc">
                    {handoffs.map((h, idx) => (
                      <li key={idx}>
                        {h.from_actor} → {h.to_actor} ({(h.required_inputs ?? []).join(", ")})
                      </li>
                    ))}
                  </ul>
                </div>
                {metrics && (
                  <div>
                    <div className="font-medium">Erfolgsindikatoren</div>
                    <ul className="list-inside list-disc">
                      {(metrics.success_indicators ?? []).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>

            <details>
              <summary className="cursor-pointer font-medium">Mermaid-Diagramm (Quelltext)</summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">{doc.mermaidDiagram}</pre>
            </details>
          </div>
        )}
      </section>

      {/* Stage 3: Pain Points */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">3. Pain Points</h2>
          <form action={analyzePainPointsAction}>
            <input type="hidden" name="processId" value={process.id} />
            <button type="submit" className="btn" disabled={!canAnalyzePainPoints}>
              {process.painPoints.length > 0 ? "Neu analysieren" : "Pain Points analysieren"}
            </button>
          </form>
        </div>
        {process.painPointsTopThreeMd && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
            <div className="mb-1 font-medium">Top 3 für KI-Intervention</div>
            <p className="whitespace-pre-wrap">{process.painPointsTopThreeMd}</p>
          </div>
        )}
        {process.painPoints.length > 0 && (
          <div className="mt-4 space-y-3">
            {process.painPoints.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  <CategoryBadge category={p.category} />
                  <FrequencyBadge frequency={p.frequency} />
                  <ImpactBadge impact={p.impact} />
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.description}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Schritt: {p.step?.name ?? "prozessübergreifend"} &middot; {p.rationale}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stage 4: Validation */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">4. Validierung</h2>
          <form action={runValidationAction}>
            <input type="hidden" name="processId" value={process.id} />
            <button type="submit" className="btn" disabled={!canValidate}>
              Validierung ausführen
            </button>
          </form>
        </div>

        {latestValidation && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <ValidationOutcomeBadge outcome={latestValidation.outcome} />
              <span className="text-xs text-slate-400">Runde {latestValidation.round}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{latestValidation.notes}</p>

            {needsCorrection && (
              <div className="space-y-4">
                {unresolvedCorrections.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-medium">Interne Korrekturen</div>
                    <div className="space-y-2">
                      {unresolvedCorrections.map((c) => (
                        <div key={c.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {c.targetDocument === "DOCUMENTATION" ? "Dokumentation" : "Pain Points"} &middot; {c.location}
                          </div>
                          <div>{c.instructions}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {questions.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-medium">Rückfragen an den Stakeholder</div>
                    <div className="space-y-3">
                      {questions.map((q) => (
                        <div key={q.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>{q.category}</span>
                            <ImpactBadge impact={q.priority} />
                          </div>
                          <div className="font-medium">{q.question}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{q.context}</div>
                          <form action={answerStakeholderQuestion} className="mt-2 flex gap-2">
                            <input type="hidden" name="id" value={q.id} />
                            <input type="hidden" name="processId" value={process.id} />
                            <input className="input" name="answer" defaultValue={q.answer ?? ""} placeholder="Antwort des Stakeholders" />
                            <button type="submit" className="btn-secondary">Speichern</button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <form action={submitCorrectionRoundAction}>
                  <input type="hidden" name="processId" value={process.id} />
                  <button type="submit" className="btn" disabled={!canSubmitCorrection}>
                    Korrekturrunde einreichen &amp; erneut prüfen
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stage 5: Solution Concepts */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">5. Lösungskonzepte</h2>
          <form action={designSolutionConceptsAction}>
            <input type="hidden" name="processId" value={process.id} />
            <button type="submit" className="btn" disabled={!isCleared}>
              {process.solutionConcepts.length > 0 ? "Neu entwerfen" : "Lösungsdesign starten"}
            </button>
          </form>
        </div>
        {!isCleared && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Erst möglich nach voller Freigabe in der Validierung.
          </p>
        )}

        {process.painPoints
          .filter((p) => conceptsByPainPoint.has(p.id))
          .map((p) => (
            <div key={p.id} className="mt-5">
              <div className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{p.title}</div>
              <div className="space-y-3">
                {(conceptsByPainPoint.get(p.id) ?? []).map((c: any) => (
                  <div key={c.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <SolutionTypeBadge type={c.type} />
                        <span className="font-medium">{c.title}</span>
                      </div>
                      <form action={toggleConceptPriority} className="flex items-center gap-2 text-xs">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="processId" value={process.id} />
                        <input type="hidden" name="isPriority" value={(!c.isPriority).toString()} />
                        <button type="submit" className={c.isPriority ? "btn" : "btn-secondary"}>
                          {c.isPriority ? "★ Priorität gesetzt" : "Als Priorität markieren"}
                        </button>
                      </form>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{c.purpose}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.howItWorks}</p>
                    <div className="mt-2 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-3">
                      <div><span className="font-medium">Zeitersparnis:</span> {c.timeSavingsImpact}</div>
                      <div><span className="font-medium">Qualität:</span> {c.qualityImpact}</div>
                      <div><span className="font-medium">Vertrauen:</span> {c.confidenceImpact}</div>
                    </div>

                    {c.isPriority && (
                      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                        {c.artifactContent ? (
                          <details>
                            <summary className="cursor-pointer text-sm font-medium">{c.artifactTitle ?? "Artefakt anzeigen"}</summary>
                            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                              {c.artifactContent}
                            </pre>
                          </details>
                        ) : (
                          <form action={generateArtifactAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="processId" value={process.id} />
                            <button type="submit" className="btn-secondary">Artefakt generieren</button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </section>

      {/* Stage 6: Final report */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">6. Abschlussbericht</h2>
          <form action={generateFinalReportAction}>
            <input type="hidden" name="processId" value={process.id} />
            <button type="submit" className="btn" disabled={process.solutionConcepts.length === 0}>
              {latestReport ? "Neu erstellen" : "Report erstellen"}
            </button>
          </form>
        </div>
        {latestReport && (
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="mb-1 font-medium">Executive Summary</div>
              <p className="whitespace-pre-wrap">{latestReport.executiveSummaryMd}</p>
            </div>
            <details open>
              <summary className="cursor-pointer font-medium">Vollständiger Report</summary>
              <p className="mt-2 whitespace-pre-wrap">{latestReport.fullReportMd}</p>
            </details>
            {latestReport.nextStepMd && (
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <div className="mb-1 font-medium">Nächster Schritt</div>
                <p className="whitespace-pre-wrap">{latestReport.nextStepMd}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Pipeline log */}
      <details className="card">
        <summary className="cursor-pointer text-sm font-medium">Workflow-Verlauf</summary>
        <div className="mt-3 space-y-2 text-xs">
          {process.pipelineRuns.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
              <div>
                <span className="font-medium">{r.stage}</span> – {r.status}
                {r.summary && <span className="text-slate-500 dark:text-slate-400"> · {r.summary}</span>}
                {r.errorMessage && <span className="text-red-600 dark:text-red-400"> · {r.errorMessage}</span>}
              </div>
              <span className="text-slate-400">{new Date(r.createdAt).toLocaleString("de-DE")}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
