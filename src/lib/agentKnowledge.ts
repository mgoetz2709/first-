import { site } from "@/lib/content";
import offers from "@/content/offers.json";
import ansatz from "@/content/ansatz.json";
import ueberMich from "@/content/ueber-mich.json";

/**
 * Baut die Wissensbasis für den Probeagenten aus denselben Content-Dateien,
 * die auch die Webseite speist (Abschnitt 5.4 der Projektanweisung). So
 * laufen Agent und Webseite nicht auseinander, wenn Texte aktualisiert werden.
 */
export function buildKnowledgeBase(): string {
  const offerLines = offers.items
    .map(
      (offer) =>
        `- ${offer.name} (Stufe ${offer.stepNumber}: ${offer.stageLabel}, ${offer.characterization}): ${offer.shortDescription}`
    )
    .join("\n");

  const phaseLines = ansatz.phases
    .map((phase) => `- Phase ${phase.number} ${phase.title}: ${phase.goal} (Output: ${phase.output})`)
    .join("\n");

  return `
Positionierung: ${site.siteName} — "${site.positioningStatement}"

Über Markus Goetz:
${ueberMich.bio.join("\n")}

Methodischer Ansatz — AI Transformation Playbook (${ansatz.hero.heading}):
${ansatz.intro.body}
Phasenfolge: ${ansatz.arc.join(" → ")}
${phaseLines}

Angebote (Produkttreppe, aufsteigend von Diagnose zu Selbstlernangebot — es werden bewusst keine Preise genannt):
${offerLines}

Kontaktweg: Erstgespräche werden über die Kalender-Buchung oder das Kontaktformular auf /kontakt vereinbart.
`.trim();
}
