import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { createProcess, deleteClient, deleteProcess, updateClientStrategy } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { processes: { orderBy: { createdAt: "desc" }, include: { _count: { select: { findings: true } } } } },
  });

  if (!client) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          &larr; Alle Kunden
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{client.name}</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <section className="md:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">AI-Strategie</h2>
          <form action={updateClientStrategy} className="card space-y-4">
            <input type="hidden" name="id" value={client.id} />
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input className="input" id="name" name="name" defaultValue={client.name} required />
            </div>
            <div>
              <label className="label" htmlFor="industry">Branche</label>
              <input className="input" id="industry" name="industry" defaultValue={client.industry ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="aiStrategy">
                AI-Strategie (Rahmen für alle Prozessanalysen dieses Kunden)
              </label>
              <textarea
                className="input"
                id="aiStrategy"
                name="aiStrategy"
                rows={10}
                defaultValue={client.aiStrategy}
              />
            </div>
            <div className="flex items-center justify-between">
              <button type="submit" className="btn">Speichern</button>
              <form action={deleteClient}>
                <input type="hidden" name="id" value={client.id} />
                <button type="submit" className="btn-danger">Kunde löschen</button>
              </form>
            </div>
          </form>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Neuer Prozess</h2>
          <form action={createProcess} className="card space-y-4">
            <input type="hidden" name="clientId" value={client.id} />
            <div>
              <label className="label" htmlFor="pname">Name</label>
              <input className="input" id="pname" name="name" required placeholder="z.B. Angebotserstellung" />
            </div>
            <div>
              <label className="label" htmlFor="owner">Process Owner</label>
              <input className="input" id="owner" name="owner" placeholder="Name / Rolle" />
            </div>
            <div>
              <label className="label" htmlFor="goal">Ziel des Prozesses</label>
              <input className="input" id="goal" name="goal" />
            </div>
            <div>
              <label className="label" htmlFor="description">Beschreibung</label>
              <textarea className="input" id="description" name="description" rows={4} />
            </div>
            <button type="submit" className="btn w-full">Prozess anlegen</button>
          </form>
        </section>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Prozesse</h2>
        {client.processes.length === 0 ? (
          <div className="card text-sm text-slate-500 dark:text-slate-400">
            Noch keine Prozesse angelegt.
          </div>
        ) : (
          <ul className="space-y-3">
            {client.processes.map((p) => (
              <li key={p.id} className="card flex items-center justify-between">
                <Link href={`/processes/${p.id}`} className="flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {p._count.findings} Findings{p.owner ? ` · Owner: ${p.owner}` : ""}
                  </div>
                </Link>
                <form action={deleteProcess}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="clientId" value={client.id} />
                  <button type="submit" className="btn-danger">Löschen</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
