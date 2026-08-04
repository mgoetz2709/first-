import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function InterviewGuidePage({ params }: { params: { id: string } }) {
  const process = await prisma.process.findUnique({
    where: { id: params.id },
    include: { client: true },
  });

  if (!process || !process.interviewGuideJson) notFound();

  const guide = JSON.parse(process.interviewGuideJson) as {
    context_note: string;
    phases: { number: number; name: string; goal: string; questions: string[] }[];
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/processes/${process.id}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          &larr; {process.name}
        </Link>
        <PrintButton />
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-500">
        Prozessanalyse &middot; Vorbereitung
      </div>
      <h1 className="mt-1 text-3xl font-semibold">Interview-Leitfaden</h1>
      <p className="mt-2 max-w-prose text-slate-600 dark:text-slate-400">
        Maßgeschneidert für {process.name} ({process.client.name}). Fünf-Phasen-Gesprächsführung — für
        Teams-Sessions mit KI-Transkript ebenso geeignet wie für Präsenzgespräche.
      </p>

      <div className="my-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <span className="font-medium">Kontext-Hinweis: </span>
        {guide.context_note}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 print:border-0 print:p-0">
        <h2 className="mb-3 text-sm font-semibold">Vorbereitung</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500 dark:text-slate-400">Prozess</dt>
          <dd className="border-b border-dotted border-slate-300 dark:border-slate-700">{process.name}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Gesprächspartner</dt>
          <dd className="border-b border-dotted border-slate-300 dark:border-slate-700">&nbsp;</dd>
          <dt className="text-slate-500 dark:text-slate-400">Rolle</dt>
          <dd className="border-b border-dotted border-slate-300 dark:border-slate-700">&nbsp;</dd>
          <dt className="text-slate-500 dark:text-slate-400">Datum</dt>
          <dd className="border-b border-dotted border-slate-300 dark:border-slate-700">&nbsp;</dd>
        </dl>
      </div>

      <div className="mt-8 space-y-8">
        {guide.phases.map((p) => (
          <section key={p.number} className="break-inside-avoid">
            <div className="flex gap-4">
              <div className="w-10 shrink-0 text-3xl font-semibold text-amber-700 dark:text-amber-500">{p.number}</div>
              <div>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">{p.goal}</p>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                  {p.questions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-slate-200 bg-white p-5 text-sm dark:border-slate-800 dark:bg-slate-900 print:border-0 print:p-0">
        <h2 className="mb-2 text-sm font-semibold">Abschluss &amp; nächster Schritt</h2>
        <blockquote className="mb-2 border-l-2 border-amber-500 pl-3 italic text-slate-600 dark:text-slate-400">
          „Vielen Dank — das deckt alles ab, was ich brauche. Ich fasse das Gespräch jetzt strukturiert zusammen.“
        </blockquote>
        <p className="text-slate-500 dark:text-slate-400">
          Danach: Transkript oder Notizen unter diesem Prozess als neues Interview anlegen und „Struktur
          extrahieren“ anstoßen.
        </p>
      </div>
    </div>
  );
}
