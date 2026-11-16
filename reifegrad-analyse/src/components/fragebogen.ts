/**
 * Fragebogen-Insel (Vanilla TypeScript). Das HTML rendert Astro beim Build;
 * dieses Skript steuert Schrittwechsel, Validierung, Zwischenspeicherung
 * (nur sessionStorage) und den Versand. Keine Cookies, kein Tracking.
 */
import {
  DIMENSIONEN,
  baueErhebung,
  istGueltigesKuerzel,
  lokalesDatum,
  type Eingaben,
  type Erhebung,
  type JaNeinUnklar,
  type Rolle,
  type Stufe,
} from '../lib/erhebung';

const SPEICHER_STAND = 'mgim-reifegrad-stand-v1';
const SPEICHER_KUERZEL = 'mgim-reifegrad-kuerzel';

function speicherLesen(schluessel: string): string | null {
  try {
    return sessionStorage.getItem(schluessel);
  } catch {
    return null;
  }
}
function speicherSchreiben(schluessel: string, wert: string | null): void {
  try {
    if (wert === null) sessionStorage.removeItem(schluessel);
    else sessionStorage.setItem(schluessel, wert);
  } catch {
    /* Speicher gesperrt: Fragebogen funktioniert ohne Zwischenspeicherung */
  }
}

function kuerzelErmitteln(): string | null {
  const ausUrl = new URLSearchParams(location.search).get('k');
  if (istGueltigesKuerzel(ausUrl)) {
    speicherSchreiben(SPEICHER_KUERZEL, ausUrl);
    return ausUrl;
  }
  // Rückkehr von /datenschutz oder /impressum ohne Parameter
  const gemerkt = speicherLesen(SPEICHER_KUERZEL);
  return ausUrl === null && istGueltigesKuerzel(gemerkt) ? gemerkt : null;
}

function start(): void {
  const formRoh = document.getElementById('fb') as HTMLFormElement | null;
  const gesperrt = document.getElementById('fb-gesperrt');
  if (!formRoh || !gesperrt) return;
  const form: HTMLFormElement = formRoh;

  const kuerzel = kuerzelErmitteln();
  if (!kuerzel) {
    gesperrt.hidden = false;
    return;
  }

  const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const schritte = Array.from(form.querySelectorAll<HTMLElement>('[data-schritt]'));
  const titel: string[] = JSON.parse(form.dataset.schritte ?? '[]');
  const letzter = schritte.length - 1;
  const fortschritt = el('fb-fortschritt');
  const balken = el('fb-balken');
  const zurueck = el<HTMLButtonElement>('fb-zurueck');
  const weiter = el<HTMLButtonElement>('fb-weiter');
  const absenden = el<HTMLButtonElement>('fb-absenden');
  const download = el<HTMLButtonElement>('fb-download');
  const status = el('fb-status');
  const einwilligung = el<HTMLInputElement>('fb-einwilligung');
  const einwilligungFehler = el('fb-einwilligung-fehler');
  const uebersicht = el('fb-uebersicht');
  const fertig = el('fb-fertig');
  let aktuell = 0;
  let gesendet: Erhebung | null = null;

  el('fb-kuerzel').textContent = kuerzel;
  form.hidden = false;

  /* ---------- Werte lesen, speichern, wiederherstellen ---------- */

  const wert = (name: string): string => {
    const feld = form.elements.namedItem(name);
    if (feld instanceof RadioNodeList) return feld.value;
    if (feld instanceof HTMLTextAreaElement) return feld.value;
    return '';
  };

  const felder = (): string[] => [
    'rolle',
    'richtlinie_vorhanden',
    'restriktionen_claude',
    ...DIMENSIONEN.flatMap((d) => [d, `freitext_${d}`]),
  ];

  function sichern(): void {
    const werte: Record<string, string> = {};
    for (const name of felder()) {
      const w = wert(name);
      if (w) werte[name] = w;
    }
    speicherSchreiben(SPEICHER_STAND, JSON.stringify({ kuerzel, schritt: aktuell, werte }));
  }

  function wiederherstellen(): void {
    const roh = speicherLesen(SPEICHER_STAND);
    if (!roh) return;
    try {
      const stand = JSON.parse(roh) as { kuerzel?: string; schritt?: number; werte?: Record<string, string> };
      if (stand.kuerzel !== kuerzel || !stand.werte) return;
      for (const [name, w] of Object.entries(stand.werte)) {
        const feld = form.elements.namedItem(name);
        if (feld instanceof RadioNodeList) feld.value = w;
        else if (feld instanceof HTMLTextAreaElement) feld.value = w;
      }
      const ziel = Number.isInteger(stand.schritt) ? Math.min(Math.max(stand.schritt!, 0), letzter) : 0;
      // Nie weiter springen, als die Angaben vollständig sind
      const offen = ersterOffenerSchritt();
      aktuell = offen === -1 ? ziel : Math.min(ziel, offen);
    } catch {
      speicherSchreiben(SPEICHER_STAND, null);
    }
  }

  /* ---------- Validierung ---------- */

  function gruppenPruefen(schritt: HTMLElement, anzeigen: boolean): HTMLInputElement | null {
    let ersteLuecke: HTMLInputElement | null = null;
    for (const gruppe of schritt.querySelectorAll<HTMLFieldSetElement>('fieldset[data-pflicht]')) {
      const gewaehlt = gruppe.querySelector('input[type="radio"]:checked') !== null;
      const fehler = gruppe.querySelector<HTMLElement>('[data-fehler]');
      if (anzeigen && fehler) fehler.hidden = gewaehlt;
      if (!gewaehlt && !ersteLuecke) ersteLuecke = gruppe.querySelector<HTMLInputElement>('input[type="radio"]');
    }
    return ersteLuecke;
  }

  function ersterOffenerSchritt(): number {
    return schritte.findIndex((s) => gruppenPruefen(s, false) !== null);
  }

  /* ---------- Schrittwechsel ---------- */

  function zeige(index: number, fokus: boolean): void {
    aktuell = index;
    schritte.forEach((s, i) => (s.hidden = i !== index));
    fortschritt.textContent = `Schritt ${index + 1} von ${schritte.length}: ${titel[index] ?? ''}`;
    balken.style.width = `${((index + 1) / schritte.length) * 100}%`;
    zurueck.hidden = index === 0;
    weiter.hidden = index === letzter;
    absenden.hidden = index !== letzter;
    download.hidden = index !== letzter;
    status.hidden = true;
    if (index === letzter) uebersichtBauen();
    sichern();
    if (fokus) {
      const kopf = schritte[index]?.querySelector<HTMLElement>('h3');
      form.scrollIntoView({ block: 'start' });
      kopf?.focus({ preventScroll: true });
    }
  }

  function vor(): void {
    const luecke = gruppenPruefen(schritte[aktuell]!, true);
    if (luecke) {
      luecke.focus();
      return;
    }
    if (aktuell < letzter) zeige(aktuell + 1, true);
  }

  /* ---------- Übersicht und Ausgabe ---------- */

  const textZu = (name: string): string =>
    form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.dataset.text ?? '';

  function uebersichtBauen(): void {
    uebersicht.replaceChildren();
    const zeile = (begriff: string, angabe: string, index: number) => {
      const div = document.createElement('div');
      div.className = `flex justify-between gap-4 px-3 py-2 ${index % 2 === 0 ? 'bg-light-grey' : ''}`;
      const dt = document.createElement('dt');
      dt.textContent = begriff;
      const dd = document.createElement('dd');
      dd.className = 'shrink-0 text-right font-headline font-semibold';
      dd.textContent = angabe;
      div.append(dt, dd);
      uebersicht.append(div);
    };
    let i = 0;
    zeile('Rolle', textZu('rolle'), i++);
    zeile('KI-Richtlinie vorhanden', textZu('richtlinie_vorhanden'), i++);
    zeile('Einschränkung für Tools wie Claude', textZu('restriktionen_claude'), i++);
    for (const d of DIMENSIONEN) {
      const legende = form.querySelector(`fieldset[data-pflicht="${d}"] legend .label`)?.textContent?.trim() ?? d;
      const anmerkung = wert(`freitext_${d}`).trim() ? ', mit Anmerkung' : '';
      zeile(legende.replace(/\s+/g, ' '), `Stufe ${wert(d)}${anmerkung}`, i++);
    }
  }

  function erhebungBauen(): Erhebung | null {
    const offen = ersterOffenerSchritt();
    if (offen !== -1) {
      zeige(offen, true);
      gruppenPruefen(schritte[offen]!, true)?.focus();
      return null;
    }
    const antworten: Eingaben['antworten'] = {};
    for (const d of DIMENSIONEN) {
      antworten[d] = { stufe: Number(wert(d)) as Stufe, freitext: wert(`freitext_${d}`) };
    }
    return baueErhebung({
      kuerzel: kuerzel!,
      datum: lokalesDatum(),
      rolle: wert('rolle') as Rolle,
      richtlinie_vorhanden: wert('richtlinie_vorhanden') as JaNeinUnklar,
      restriktionen_claude: wert('restriktionen_claude') as JaNeinUnklar,
      antworten,
    });
  }

  function herunterladen(erhebung: Erhebung): void {
    const blob = new Blob([JSON.stringify(erhebung, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reifegrad_${erhebung.kunde_kuerzel}_${erhebung.antworten[0]?.rolle ?? 'Rolle'}_${erhebung.erhebung_datum}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function melde(text: string): void {
    status.textContent = text;
    status.hidden = false;
  }

  async function senden(): Promise<void> {
    status.hidden = true;
    const erhebung = erhebungBauen();
    if (!erhebung) return;
    einwilligungFehler.hidden = einwilligung.checked;
    if (!einwilligung.checked) {
      einwilligung.focus();
      return;
    }
    absenden.disabled = true;
    absenden.textContent = 'Wird gesendet …';
    try {
      // Schema erst hier laden, damit die Seite beim Start schlank bleibt
      const { EinsendungSchema } = await import('../lib/schema');
      const pruefung = EinsendungSchema.safeParse(erhebung);
      if (!pruefung.success) {
        melde('Die Angaben sind unvollständig oder ungültig. Bitte prüfen Sie Ihre Antworten.');
        return;
      }
      const antwort = await fetch(form.dataset.endpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pruefung.data),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
      gesendet = erhebung;
      speicherSchreiben(SPEICHER_STAND, null);
      form.hidden = true;
      fertig.hidden = false;
      fertig.querySelector<HTMLElement>('h3')?.focus();
    } catch {
      melde(
        'Die Übermittlung ist fehlgeschlagen. Ihre Angaben sind in diesem Browserfenster weiter vorhanden. Bitte versuchen Sie es erneut oder laden Sie die Datei herunter und senden Sie sie an MGIM.',
      );
    } finally {
      absenden.disabled = false;
      absenden.textContent = 'Absenden';
    }
  }

  /* ---------- Ereignisse ---------- */

  form.addEventListener('change', (e) => {
    const ziel = e.target as HTMLElement;
    const fehler = ziel.closest('fieldset[data-pflicht]')?.querySelector<HTMLElement>('[data-fehler]');
    if (fehler) fehler.hidden = true;
    if (ziel === einwilligung) einwilligungFehler.hidden = true;
    sichern();
  });
  form.addEventListener('input', (e) => {
    if (e.target instanceof HTMLTextAreaElement) sichern();
  });
  weiter.addEventListener('click', vor);
  zurueck.addEventListener('click', () => aktuell > 0 && zeige(aktuell - 1, true));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (aktuell < letzter) vor();
    else void senden();
  });
  download.addEventListener('click', () => {
    const erhebung = erhebungBauen();
    if (erhebung) herunterladen(erhebung);
  });
  el('fb-download-fertig').addEventListener('click', () => gesendet && herunterladen(gesendet));

  wiederherstellen();
  zeige(aktuell, false);
}

start();
