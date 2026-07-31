import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TypeBadge } from "@/components/badges";

export const dynamic = "force-dynamic";

export default async function AnalysisRunPage({ params }: { params: { id: string; runId: string } }) {
  const run = await prisma.analysisRun.findUnique({
    where: { id: params.runId },
    include: {
      process: { include: { client: true } },
      findings: { include: { recommendations: true, step: true } },
    },
  });

  if (!run || run.processId !== params.id) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/processes/${run.processId}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          &larr; {run.process.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Analyse-Lauf</h1>
        <p className="text-xs text-slate-400">
          {new Date(run.createdAt).toLocaleString("de-DE")} · Status: {run.status}
        </p>
      </div>

      {run.status === "FAILED" && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Analyse fehlgeschlagen: {run.errorMessage}
        </div>
      )}

      {run.status === "RUNNING" && (
        <div className="card text-sm text-slate-500 dark:text-slate-400">Analyse läuft ...</div>
      )}

      {run.summary && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Zusammenfassung</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{run.summary}</p>
        </div>
      )}

      {run.findings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {run.findings.length} Finding(s), {run.findings.reduce((n, f) => n + f.recommendations.length, 0)} Empfehlung(en)
          </h2>
          {run.findings.map((f) => (
            <div key={f.id} className="card">
              <div className="text-xs text-slate-400">{f.step ? f.step.name : "Prozessübergreifend"}</div>
              <div className="font-medium">{f.title}</div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{f.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {f.recommendations.map((r) => (
                  <TypeBadge key={r.id} type={r.type} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href={`/processes/${run.processId}`} className="btn-secondary inline-block">
        Zur vollständigen Ergebnis-Ansicht mit Bearbeitung
      </Link>
    </div>
  );
}
