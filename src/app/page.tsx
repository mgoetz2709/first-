import Link from "next/link";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { processes: true } } },
  });

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <section className="md:col-span-2">
        <h1 className="mb-1 text-2xl font-semibold">Kunden</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Jeder Kunde hat eine eigene AI-Strategie, die als Rahmen für alle Prozessanalysen dient.
        </p>
        {clients.length === 0 ? (
          <div className="card text-sm text-slate-500 dark:text-slate-400">
            Noch keine Kunden angelegt. Lege rechts deinen ersten Kunden an.
          </div>
        ) : (
          <ul className="space-y-3">
            {clients.map((c) => (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="card block hover:border-slate-400 dark:hover:border-slate-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      {c.industry && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">{c.industry}</div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {c._count.processes} Prozess(e)
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Neuer Kunde</h2>
        <form action={createClient} className="card space-y-4">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input className="input" id="name" name="name" required placeholder="z.B. Musterfirma GmbH" />
          </div>
          <div>
            <label className="label" htmlFor="industry">Branche</label>
            <input className="input" id="industry" name="industry" placeholder="z.B. Maschinenbau" />
          </div>
          <div>
            <label className="label" htmlFor="aiStrategy">AI-Strategie</label>
            <textarea
              className="input"
              id="aiStrategy"
              name="aiStrategy"
              rows={6}
              placeholder="Reifegrad, Risikobereitschaft, erlaubte Tools/Modelle, Governance-Vorgaben, strategische Ziele für KI-Einsatz ..."
            />
          </div>
          <button type="submit" className="btn w-full">Kunde anlegen</button>
        </form>
      </section>
    </div>
  );
}
