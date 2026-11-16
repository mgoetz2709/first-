/**
 * Rechtstexte. Impressum und die allgemeinen Abschnitte der Datenschutzerklärung
 * sind von der MGIM-Website (www.markusgoetz.net) übernommen. Die Abschnitte zum
 * Fragebogen und zur Speicherung im Browser sowie der Einwilligungstext sind
 * für diese Seite formuliert und noch nicht anwaltlich geprüft.
 */
export interface Rechtsabschnitt {
  titel: string;
  text: string;
}

export const impressum: Rechtsabschnitt[] = [
  {
    "titel": "Angaben gemäß § 5 DDG",
    "text": "Markus Goetz Interim Management\nEinzelunternehmer, Dipl. Wirtschaftsingenieur\nMarkus Goetz\nZentnerstraße 9a\n80798 München\nDeutschland"
  },
  {
    "titel": "Kontakt",
    "text": "Telefon: +49 89 33986020\nMobil: +49 176 24200000\nE-Mail: markus@markusgoetz.net"
  },
  {
    "titel": "Umsatzsteuer-ID",
    "text": "Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:\nDE 278993749"
  },
  {
    "titel": "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
    "text": "Markus Goetz\nZentnerstraße 9a\n80798 München"
  },
  {
    "titel": "Verbraucherstreitbeilegung",
    "text": "Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Die von der Europäischen Kommission zuvor betriebene OS-Plattform zur Online-Streitbeilegung wurde zum 20. Juli 2025 eingestellt."
  },
  {
    "titel": "Haftung für Inhalte",
    "text": "Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen."
  },
  {
    "titel": "Haftung für Links",
    "text": "Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen."
  },
  {
    "titel": "Urheberrecht",
    "text": "Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen."
  }
];

export const datenschutz: Rechtsabschnitt[] = [
  {
    "titel": "1. Verantwortlicher",
    "text": "Markus Goetz Interim Management\nMarkus Goetz\nZentnerstraße 9a\n80798 München\nDeutschland\n\nTelefon: +49 89 33986020\nE-Mail: markus@markusgoetz.net"
  },
  {
    "titel": "2. Allgemeines zur Datenverarbeitung",
    "text": "Wir verarbeiten personenbezogene Daten der Nutzer dieser Website grundsätzlich nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung erfolgt regelmäßig nur nach Einwilligung des Nutzers (Art. 6 Abs. 1 lit. a DSGVO), zur Erfüllung eines Vertrags oder vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO) oder auf Grundlage berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO), etwa an der technisch fehlerfreien Darstellung und Optimierung dieser Website. Personenbezogene Daten werden gelöscht, sobald der Zweck der Verarbeitung entfällt und keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Eine Weitergabe an Dritte erfolgt nur an die in dieser Erklärung genannten Auftragsverarbeiter oder soweit gesetzlich vorgeschrieben."
  },
  {
    "titel": "3. Hosting",
    "text": "Diese Website wird bei Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA, gehostet (Auftragsverarbeitung gemäß Art. 28 DSGVO). Beim Aufruf der Website erhebt Vercel automatisch sogenannte Server-Logfiles, die Ihr Browser übermittelt (u. a. IP-Adresse, Datum und Uhrzeit der Anfrage, Browsertyp, Referrer-URL). Diese Verarbeitung erfolgt auf Grundlage unseres berechtigten Interesses an einer sicheren und stabilen Bereitstellung der Website (Art. 6 Abs. 1 lit. f DSGVO). Da Vercel Server auch außerhalb der EU/des EWR betreiben kann, kann eine Datenübermittlung in Drittländer stattfinden; Vercel verpflichtet sich vertraglich zu angemessenen Garantien (u. a. EU-Standardvertragsklauseln)."
  },
  {
    "titel": "4. Fragebogen zur KI-Reifegrad-Analyse",
    "text": "Wenn Sie den Fragebogen auf dieser Seite ausfüllen und absenden, verarbeiten wir folgende Angaben: das Kürzel Ihres Unternehmens (sofern Sie eines erhalten oder eingegeben haben), das Datum der Erhebung, Ihre Rolle im Unternehmen, Ihre Angaben zur KI-Richtlinie, die gewählte Stufe je Dimension sowie freiwillige Anmerkungen. Einen Namen, eine E-Mail-Adresse oder andere Kontaktdaten erheben wir im Fragebogen nicht. Bitte geben Sie in den Anmerkungsfeldern keine Namen, keine Kundendaten und keine personenbezogenen Daten ein.\n\nZweck der Verarbeitung ist die Erstellung der KI-Reifegrad-Analyse für das jeweilige Unternehmen. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie vor dem Absenden durch Ankreuzen des Einwilligungsfelds erteilen.\n\nDie Einsendungen werden in einem nicht öffentlich zugänglichen Speicher der Vercel Inc. (Vercel Blob, Speicherort Frankfurt am Main) abgelegt; Vercel wird dabei als Auftragsverarbeiter gemäß Art. 28 DSGVO tätig. Eine Weitergabe an sonstige Dritte findet nicht statt. Die Ergebnisse der Analyse erhält das Unternehmen, dem das Kürzel zugeordnet ist, in zusammengefasster Form je Rolle.\n\nWir löschen die Einsendungen, sobald sie für die Analyse nicht mehr benötigt werden. Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, zum Beispiel per E-Mail an markus@markusgoetz.net. Damit wir Ihre Einsendung finden können, nennen Sie uns bitte Kürzel, Rolle und Datum der Teilnahme. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt."
  },
  {
    "titel": "5. Speicherung im Browser, Cookies",
    "text": "Diese Seite setzt keine Cookies und bindet keine Analyse- oder Tracking-Dienste und keine Inhalte von Drittanbietern ein. Schriften und Skripte werden vom eigenen Server geladen.\n\nWährend Sie den Fragebogen ausfüllen, speichert Ihr Browser den Zwischenstand Ihrer Antworten im sogenannten Session Storage, damit Ihre Angaben beim Neuladen der Seite oder beim Wechsel zwischen den Schritten erhalten bleiben. Diese Daten verbleiben auf Ihrem Gerät, werden erst mit dem Absenden an uns übermittelt und beim Schließen des Browserfensters gelöscht; der Zwischenstand wird zudem nach erfolgreichem Absenden entfernt. Die Speicherung ist für die von Ihnen gewünschte Funktion technisch erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG)."
  },
  {
    "titel": "6. Ihre Rechte als betroffene Person",
    "text": "Ihnen stehen als betroffene Person nach der DSGVO folgende Rechte zu: Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch gegen die Verarbeitung (Art. 21). Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3). Zudem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO). Zur Ausübung Ihrer Rechte wenden Sie sich bitte an die im Abschnitt „Verantwortlicher“ genannten Kontaktdaten."
  },
  {
    "titel": "7. Änderungen dieser Datenschutzerklärung",
    "text": "Wir passen diese Datenschutzerklärung an, sobald Änderungen an der Website, den eingesetzten Diensten oder der Rechtslage dies erforderlich machen. Es gilt die jeweils aktuelle, auf dieser Seite veröffentlichte Fassung."
  }
];
