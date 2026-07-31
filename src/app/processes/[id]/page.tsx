import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createDocument,
  createInterview,
  createStep,
  deleteDocument,
  deleteInterview,
  deleteStep,
  runAnalysisAction,
  updateRecommendationArtifact,
  updateRecommendationStatus,
} from "@/lib/actions";
import { ALL_STATUSES, TypeBadge, statusLabel } from "@/components/badges";

export const dynamic = "force-dynamic";

export default async function ProcessPage({ params }: { params: { id: string } }) {
  const process = await prisma.process.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      steps: { orderBy: { order: "asc" } },
      interviews: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      findings: {
        orderBy: { createdAt: "desc" },
        include: { recommendations: { orderBy: { createdAt: "asc" } }, step: true },
      },
      analysisRuns: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!process) notFound();

  const unassignedFindings = process.findings.filter((f) => !f.stepId);
  const latestRun = process.analysisRuns[0];

  return (
    <div className="space-y-10">
      <div>
        <Link href={`/clients/${process.clientId}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          &larr; {process.client.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{process.name}</h1>
        {process.description && <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{process.description}</p>}
      </div>

      {/* Run analysis */}
      <section className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Analyse ausführen</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Analysiert Prozessschritte, Interviews und Dokumente gegen die AI-Strategie des Kunden und schlägt klassifizierte Lösungen vor.
          </p>
          {latestRun && (
            <p className="mt-1 text-xs text-slate-400">
              Letzter Lauf: {latestRun.status} · {new Date(latestRun.createdAt).toLocaleString("de-DE")}{" "}
              <Link href={`/processes/${process.id}/analysis/${latestRun.id}`} className="underline">
                Details
              </Link>
            </p>
          )}
        </div>
        <form action={runAnalysisAction}>
          <input type="hidden" name="processId" value={process.id} />
          <button type="submit" className="btn" disabled={process.steps.length === 0}>
            Analyse starten
          </button>
        </form>
      </section>
      {process.steps.length === 0 && (
        <p className="-mt-6 text-xs text-amber-600 dark:text-amber-400">
          Bitte zuerst mindestens einen Prozessschritt anlegen, bevor eine Analyse gestartet werden kann.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Steps */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Prozessschritte</h2>
          <div className="space-y-3">
            {process.steps.map((s) => (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {s.order}. {s.name}
                    </div>
                    {s.roleResponsible && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">Verantwortlich: {s.roleResponsible}</div>
                    )}
                    {s.systemsUsed && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">Systeme: {s.systemsUsed}</div>
                    )}
                    {s.description && <p className="mt-1 text-sm">{s.description}</p>}
                  </div>
                  <form action={deleteStep}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="processId" value={process.id} />
                    <button type="submit" className="btn-danger">Löschen</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
          <details className="card mt-3">
            <summary className="cursor-pointer text-sm font-medium">+ Prozessschritt hinzufügen</summary>
            <form action={createStep} className="mt-4 space-y-3">
              <input type="hidden" name="processId" value={process.id} />
              <input className="input" name="name" placeholder="Name des Schritts" required />
              <input className="input" name="roleResponsible" placeholder="Verantwortliche Rolle" />
              <input className="input" name="systemsUsed" placeholder="Genutzte Systeme (optional)" />
              <textarea className="input" name="description" placeholder="Beschreibung" rows={3} />
              <button type="submit" className="btn w-full">Hinzufügen</button>
            </form>
          </details>
        </section>

        {/* Interviews */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Interviews</h2>
          <div className="space-y-3">
            {process.interviews.map((i) => (
              <details key={i.id} className="card">
                <summary className="cursor-pointer text-sm font-medium">
                  {i.participantName}
                  {i.participantRole ? ` – ${i.participantRole}` : ""}
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{i.transcript}</p>
                <form action={deleteInterview} className="mt-3">
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="processId" value={process.id} />
                  <button type="submit" className="btn-danger">Löschen</button>
                </form>
              </details>
            ))}
          </div>
          <details className="card mt-3">
            <summary className="cursor-pointer text-sm font-medium">+ Interview hinzufügen</summary>
            <form action={createInterview} className="mt-4 space-y-3">
              <input type="hidden" name="processId" value={process.id} />
              <input className="input" name="participantName" placeholder="Name des Teilnehmers" required />
              <input className="input" name="participantRole" placeholder="Rolle im Prozess" />
              <input className="input" name="date" type="date" />
              <textarea
                className="input"
                name="transcript"
                placeholder="Transkript / Notizen des Interviews einfügen ..."
                rows={6}
                required
              />
              <button type="submit" className="btn w-full">Hinzufügen</button>
            </form>
          </details>
        </section>
      </div>

      {/* Documents */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Prozessdokumentation</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {process.documents.map((d) => (
            <details key={d.id} className="card">
              <summary className="cursor-pointer text-sm font-medium">{d.filename}</summary>
              <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
                {d.content}
              </p>
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
            <div>
              <label className="label">Datei hochladen (Textformate wie .txt, .md)</label>
              <input className="input" name="file" type="file" accept=".txt,.md,.csv,.json" />
            </div>
            <div className="text-center text-xs text-slate-400">— oder —</div>
            <input className="input" name="filename" placeholder="Dokumentname" />
            <textarea
              className="input"
              name="content"
              placeholder="Text der Prozessdokumentation einfügen (z.B. aus PDF/Word kopiert) ..."
              rows={6}
            />
            <button type="submit" className="btn w-full">Hinzufügen</button>
          </form>
        </details>
      </section>

      {/* Findings & Recommendations */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Findings &amp; Empfehlungen</h2>
        {process.findings.length === 0 ? (
          <div className="card text-sm text-slate-500 dark:text-slate-400">
            Noch keine Findings. Starte oben eine Analyse, sobald Prozessschritte, Interviews und/oder Dokumente erfasst sind.
          </div>
        ) : (
          <div className="space-y-6">
            {process.steps.map((step) => {
              const stepFindings = process.findings.filter((f) => f.stepId === step.id);
              if (stepFindings.length === 0) return null;
              return (
                <div key={step.id}>
                  <h3 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Schritt {step.order}: {step.name}
                  </h3>
                  <div className="space-y-4">
                    {stepFindings.map((f) => (
                      <FindingCard key={f.id} finding={f} processId={process.id} />
                    ))}
                  </div>
                </div>
              );
            })}
            {unassignedFindings.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Prozessübergreifend</h3>
                <div className="space-y-4">
                  {unassignedFindings.map((f) => (
                    <FindingCard key={f.id} finding={f} processId={process.id} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function FindingCard({ finding, processId }: { finding: any; processId: string }) {
  return (
    <div className="card">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <div className="font-medium">{finding.title}</div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{finding.description}</p>
          {finding.painPoint && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">Pain Point: {finding.painPoint}</p>
          )}
          {finding.sourceRef && (
            <p className="mt-1 text-xs text-slate-400">
              Quelle: {finding.source} – {finding.sourceRef}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        {finding.recommendations.map((r: any) => (
          <div key={r.id} className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TypeBadge type={r.type} />
                {r.artifactTitle && <span className="text-sm font-medium">{r.artifactTitle}</span>}
              </div>
              <form action={updateRecommendationStatus} className="flex items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="processId" value={processId} />
                <select name="status" defaultValue={r.status} className="input py-1 text-xs" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </form>
            </div>
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Begründung: </span>
              {r.rationale}
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                Artefakt anzeigen / bearbeiten
              </summary>
              <form action={updateRecommendationArtifact} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="processId" value={processId} />
                <input className="input" name="artifactTitle" defaultValue={r.artifactTitle ?? ""} placeholder="Titel" />
                <textarea className="input font-mono text-xs" name="artifact" defaultValue={r.artifact} rows={12} />
                <button type="submit" className="btn-secondary">Speichern</button>
              </form>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
