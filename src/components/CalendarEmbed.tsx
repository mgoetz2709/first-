import { calendarConfig, isCalendarConfigured } from "@/lib/env";

/**
 * Kalender-Buchungslink-Embed. Anbieter ist über NEXT_PUBLIC_CALENDAR_EMBED_URL
 * (z. B. Calendly-Embed-Link) austauschbar, siehe .env.example. Ohne gesetzte
 * URL wird ein klar erkennbarer Platzhalter gerendert.
 */
export default function CalendarEmbed() {
  if (!isCalendarConfigured()) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-ink-300 bg-ink-50 p-8 text-center">
        <p className="text-sm font-semibold text-ink-900">
          Platzhalter: Kalender-Buchungslink
        </p>
        <p className="max-w-md text-sm text-foreground-muted">
          Sobald der finale Anbieter (z. B. Calendly) feststeht, wird hier über die
          Umgebungsvariable{" "}
          <code className="rounded-sm bg-ink-100 px-1 py-0.5 text-ink-900">
            NEXT_PUBLIC_CALENDAR_EMBED_URL
          </code>{" "}
          der echte Buchungskalender eingebettet — ohne Codeänderung.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-ink-200">
      <iframe
        src={calendarConfig.embedUrl}
        title={`Terminbuchung über ${calendarConfig.provider}`}
        className="h-[700px] w-full border-0"
        loading="lazy"
      />
    </div>
  );
}
