/* Oberfläche der App. Rechnet nichts selbst: alle Zahlen kommen aus Kern.* */
(function () {
  "use strict";
  const K = window.Kern, $ = (s, el) => (el || document).querySelector(s);
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const kurz = (k) => `${MON[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`;
  const heute = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const E = (euro, st) => K.eur(K.C(euro), st);
  const zahlDe = (n) => (n === undefined || n === null || n === "" ? "" : String(n).replace(".", ","));
  const num = (t, pflicht) => { if (String(t).trim() === "") { if (pflicht) throw new Error("Bitte eine Zahl eingeben."); return 0; } return K.parseDe(t) / 100; };

  const Z = { daten: K.leereDaten(), tab: "status", dirty: false, handle: null, dateiname: "", jahr: null, stichtag: null,
    vorschlag: null, importVorschau: null, bearbeite: {}, meldung: "" };
  window.__app = Z;

  function geaendert() { Z.dirty = true; kopf(); }
  function meld(text, fehler) { Z.meldung = text ? `<div class="meldung${fehler ? " fehler" : ""}" role="status">${esc(text)}</div>` : ""; }
  function versuch(f) { try { f(); } catch (e) { meld(e.message, true); zeige(); } }

  /* ---------- Datei ---------- */
  async function oeffnen() {
    if (Z.dirty && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
    try {
      let text, name, handle = null;
      if (window.showOpenFilePicker) {
        [handle] = await window.showOpenFilePicker({ types: [{ description: "ESt-Monitor-Daten", accept: { "application/json": [".json"] } }] });
        const f = await handle.getFile(); text = await f.text(); name = f.name;
      } else {
        const f = await dateiWaehlen(".json,application/json"); if (!f) return; text = await f.text(); name = f.name;
      }
      Z.daten = K.pruefeDaten(JSON.parse(text)); Z.handle = handle; Z.dateiname = name; Z.dirty = false; Z.jahr = Z.stichtag = null;
      meld(`${name} geladen.`); Z.tab = "status"; zeige();
    } catch (e) { if (e.name !== "AbortError") { meld("Datei konnte nicht geladen werden: " + e.message, true); zeige(); } }
  }
  function dateiWaehlen(accept) {
    return new Promise((ok) => { const i = document.createElement("input"); i.type = "file"; i.accept = accept; i.onchange = () => ok(i.files[0] || null); i.click(); });
  }
  function herunterladen(name, inhalt, typ) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([inhalt], { type: typ || "application/octet-stream" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function speichern() {
    const text = JSON.stringify(Z.daten, null, 2);
    try {
      if (window.showSaveFilePicker) {
        if (!Z.handle) Z.handle = await window.showSaveFilePicker({ suggestedName: Z.dateiname || "steuer-daten.json", types: [{ description: "ESt-Monitor-Daten", accept: { "application/json": [".json"] } }] });
        const w = await Z.handle.createWritable(); await w.write(text); await w.close(); Z.dateiname = Z.handle.name;
        meld(`Gespeichert in ${Z.dateiname}.`);
      } else {
        Z.dateiname = Z.dateiname || "steuer-daten.json"; herunterladen(Z.dateiname, text, "application/json");
        meld(`${Z.dateiname} wurde in deinen Download-Ordner geschrieben. Ersetze damit deine bisherige Datendatei.`);
      }
      Z.dirty = false; zeige();
    } catch (e) { if (e.name !== "AbortError") { meld("Speichern fehlgeschlagen: " + e.message, true); zeige(); } }
  }
  function beispiel() {
    if ((Z.dirty || Z.daten.eingaenge.length || Z.daten.vertraege.length) && !confirm("Aktuelle Daten durch die fiktiven Beispieldaten ersetzen?")) return;
    Z.daten = K.pruefeDaten(JSON.parse(JSON.stringify(window.BEISPIELDATEN))); Z.handle = null; Z.dateiname = ""; Z.dirty = false; Z.jahr = 2026; Z.stichtag = "2026-03";
    meld("Fiktive Beispieldaten geladen (1 Bescheid, 2 Verträge, 3 Monate Eingänge)."); Z.tab = "status"; zeige();
  }

  /* ---------- Bausteine ---------- */
  const FARBE = { gruen: "#0ca30c", gelb: "#fab219", rot: "#d03b3b", ueberzahlung: "#2a78d6" }, ZEICHEN = { gruen: "✓", gelb: "!", rot: "✕", ueberzahlung: "↓" };
  const ampel = (a) => `<span class="ampel"><i style="background:${FARBE[a]}">${ZEICHEN[a]}</i>${K.AMPEL_TEXT[a]}</span>`;
  function tabelle(kopf, zeilen, opt) {
    opt = opt || {}; const ra = opt.rechtsAb === undefined ? 1 : opt.rechtsAb;
    const z = (i, v, tag) => `<${tag}${i >= ra ? ' class="r"' : ""}>${v}</${tag}>`;
    return `<div class="wrap"><table class="${opt.klasse || ""}"><thead><tr>${kopf.map((k, i) => z(i, k, "th")).join("")}</tr></thead><tbody>` +
      zeilen.map((r) => `<tr${r.klasse ? ` class="${r.klasse}"` : ""}>${(r.z || r).map((v, i) => z(i, v, "td")).join("")}</tr>`).join("") + "</tbody></table></div>";
  }
  function feld(label, name, wert, opt) {
    opt = opt || {};
    if (opt.optionen) return `<label>${esc(label)}<select name="${name}">${opt.optionen.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(wert ?? "") ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
    if (opt.typ === "haken") return `<label class="haken"><input type="checkbox" name="${name}"${wert ? " checked" : ""}>${esc(label)}</label>`;
    return `<label${opt.breit ? ' class="breit"' : ""}>${esc(label)}<input type="${opt.typ || "text"}" name="${name}" value="${esc(wert ?? "")}"${opt.zahl ? ' inputmode="decimal"' : ""}${opt.platz ? ` placeholder="${esc(opt.platz)}"` : ""}></label>`;
  }
  const werte = (form) => Object.fromEntries([...form.elements].filter((e) => e.name).map((e) => [e.name, e.type === "checkbox" ? e.checked : e.value.trim()]));

  /* ---------- Diagramme ---------- */
  const B = 720, H = 250, L = 64, R = 96, O = 14, U = 30;
  const DF = { basis: "#2a78d6", runrate: "#eb6834", konservativ: "#1baf7a", ist: "#52514e", plan: "#2a78d6" };
  function skala(w) {
    const lo = Math.min(0, ...w), hi0 = Math.max(0, ...w), hi = hi0 === lo ? lo + 1 : hi0, roh = (hi - lo) / 4;
    const pot = roh >= 1 ? Math.pow(10, String(Math.floor(roh)).length) / 10 : 1, s = [1, 2, 2.5, 5, 10].map((x) => x * pot).find((x) => x >= roh);
    return [Math.floor(lo / s) * s, Math.ceil(hi / s) * s, s];
  }
  function rahmen(lo, hi, s, labels, xp, titel) {
    const y = (w) => O + (H - O - U) * (1 - (w - lo) / (hi - lo));
    let t = `<svg viewBox="0 0 ${B} ${H}" role="img" font-size="11"><title>${esc(titel)}</title>`;
    for (let w = lo; w <= hi + 1e-9; w += s) t += `<line x1="${L}" x2="${B - R}" y1="${y(w).toFixed(1)}" y2="${y(w).toFixed(1)}" stroke="${Math.abs(w) < 1e-9 ? "#9a9994" : "#e4e3df"}"/><text x="${L - 8}" y="${(y(w) + 4).toFixed(1)}" text-anchor="end" fill="#52514e">${K.zahl(w)}</text>`;
    const jeder = labels.length <= 12 ? 1 : 2;
    labels.forEach((b, i) => { if (i % jeder === 0) t += `<text x="${xp(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" fill="#52514e">${esc(b)}</text>`; });
    return [t, y];
  }
  function saeulen(labels, reihen, titel) {
    const alle = reihen.flatMap((r) => r[2].filter((v) => v !== null)).map((c) => c / 100), [lo, hi, s] = skala(alle), band = (B - L - R) / labels.length;
    const dicke = Math.min(14, (band - 8) / reihen.length - 2);
    let [t, y] = rahmen(lo, hi, s, labels, (i) => L + band * (i + 0.5), titel);
    reihen.forEach(([name, farbe, ws], r) => ws.forEach((c, i) => {
      if (c === null || c === 0) return;
      const w = c / 100, x = L + band * (i + 0.5) + (r - reihen.length / 2) * (dicke + 2) + 1, o = Math.min(y(w), y(0)), u = Math.max(y(w), y(0)), rad = Math.min(4, Math.max(u - o, 1));
      t += `<path d="M${x.toFixed(1)},${u.toFixed(1)} V${(o + rad).toFixed(1)} Q${x.toFixed(1)},${o.toFixed(1)} ${(x + rad).toFixed(1)},${o.toFixed(1)} H${(x + dicke - rad).toFixed(1)} Q${(x + dicke).toFixed(1)},${o.toFixed(1)} ${(x + dicke).toFixed(1)},${(o + rad).toFixed(1)} V${u.toFixed(1)} Z" fill="${DF[farbe]}"><title>${esc(labels[i])} ${esc(name)}: ${K.eur(c)}</title></path>`;
    }));
    return t + "</svg>";
  }
  function linien(labels, reihen, titel) {
    const alle = reihen.flatMap((r) => r[2]).map((c) => c / 100), [lo, hi, s] = skala(alle), n = labels.length, weite = (B - L - R) / Math.max(n - 1, 1);
    const xp = n > 1 ? (i) => L + weite * i : () => (L + B - R) / 2;
    let [t, y] = rahmen(lo, hi, s, labels, xp, titel); const enden = [];
    for (const [name, farbe, ws] of reihen) {
      if (!ws.length) continue;
      if (ws.length > 1) t += `<polyline points="${ws.map((c, i) => `${xp(i).toFixed(1)},${y(c / 100).toFixed(1)}`).join(" ")}" fill="none" stroke="${DF[farbe]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      ws.forEach((c, i) => (t += `<circle cx="${xp(i).toFixed(1)}" cy="${y(c / 100).toFixed(1)}" r="4" fill="${DF[farbe]}" stroke="#fff" stroke-width="2"><title>${esc(labels[i])} ${esc(name)}: ${K.eur(c)}</title></circle>`));
      enden.push([xp(ws.length - 1), y(ws[ws.length - 1] / 100), ws[ws.length - 1]]);
    }
    enden.sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < enden.length; i++) if (enden[i][1] - enden[i - 1][1] < 13) enden[i][1] = enden[i - 1][1] + 13;
    for (const [x, yy, c] of enden) t += `<text x="${(x + 9).toFixed(1)}" y="${(yy + 4).toFixed(1)}" fill="#0b0b0b">${K.eur(c, 0)}</text>`;
    return t + "</svg>";
  }
  const legende = (e) => `<div class="legende">${e.map(([n, f]) => `<span><i style="background:${DF[f]}"></i>${esc(n)}</span>`).join("")}</div>`;

  /* ---------- Status ---------- */
  function jahre() { return Object.keys(K.PARAMS).map(Number); }
  function tabStatus() {
    const d = Z.daten, std = K.standardStichtag(d, heute());
    if (!Z.stichtag) Z.stichtag = K.mKey(std);
    if (!Z.jahr) Z.jahr = jahre().includes(Number(Z.stichtag.slice(0, 4))) ? Number(Z.stichtag.slice(0, 4)) : jahre()[0];
    const ist = Z.stichtag.split("-").map(Number);
    let st; try { st = K.status(d, Z.jahr, ist); } catch (e) { return `<h2>Steuer-Check</h2><div class="meldung fehler">${esc(e.message)}</div>`; }
    Z.status = st;
    const leit = st.szenarien[st.leitszenario], einst = d.einstellungen, liq = K.liquiditaet(d, st), verlauf = K.lueckenverlauf(d, st), a = einst.ampel;
    const monOpt = []; for (let y = Math.min(...jahre()) - 1; y <= Math.max(...jahre()); y++) for (let m = 1; m <= 12; m++) monOpt.push([K.mKey([y, m]), `${MON[m - 1]} ${y}`]);
    let t = `<h2>Steuer-Check ${st.jahr}</h2>
      <div class="leiste nichtdrucken"><label>Steuerjahr <select id="s-jahr">${jahre().map((j) => `<option${j === Z.jahr ? " selected" : ""}>${j}</option>`).join("")}</select></label>
      <label>Ist erfasst bis einschließlich <select id="s-stichtag">${monOpt.map(([v, x]) => `<option value="${v}"${v === Z.stichtag ? " selected" : ""}>${x}</option>`).join("")}</select></label>
      <button id="s-druck">Bericht drucken / als PDF sichern</button></div>
      <p class="hinweis">Stand ${String(ist[1]).padStart(2, "0")}/${ist[0]} · erstellt am ${K.deDatum(heute())} · ${einst.einstufung === "freiberuflich" ? "freiberuflich (§ 18 EStG)" : "gewerblich (§ 15 EStG)"}, ${einst.veranlagung === "einzel" ? "Grundtarif" : "Splittingtarif"}, ${einst.kirchensteuer.pflichtig ? "Kirchensteuer " + einst.kirchensteuer.satz_prozent + " %" : "ohne Kirchensteuer"}</p>`;
    if (!d.eingaenge.length && !d.vertraege.length && !d.bescheide.length) {
      return `<h2>Willkommen</h2><p>Diese App prüft, ob deine festgesetzten Einkommensteuer-Vorauszahlungen zu deinem Gewinn passen. Alle Daten bleiben in einer Datei auf deinem Rechner.</p>
        <div class="empfehlung"><p><b>So fängst du an</b></p><p>1. Unter „Einstellungen“ deine Betriebsausgaben-Pauschale prüfen.</p><p>2. Unter „Bescheide“ den aktuellen Vorauszahlungsbescheid erfassen (oder über „Import von Claude“ einlesen lassen).</p><p>3. Unter „Verträge“ laufende und erwartete Aufträge anlegen.</p><p>4. Unter „Eingänge“ den Bankexport des Monats einlesen.</p><p>5. Oben auf „Speichern“ klicken und die Datei <code>steuer-daten.json</code> an einem festen Ort ablegen. Beim nächsten Mal mit „Datei öffnen“ weitermachen.</p></div>
        <p>Zum Ausprobieren: oben rechts „Beispieldaten“ lädt einen fiktiven Fall.</p><footer>Planungswerkzeug. Ersetzt keine Steuerberatung.</footer>`;
    }
    t += st.warnungen.map((w) => `<div class="meldung">${esc(w)}</div>`).join("");
    t += `<div class="kacheln"><div class="kachel"><small>Leitszenario ${esc(leit.titel)}</small><b>${ampel(leit.ampel)}</b></div>
      <div class="kachel"><small>Deckungslücke ${st.jahr}</small><b>${K.eur(leit.luecke, 0)}</b></div>
      <div class="kachel"><small>Erwartete Jahressteuer</small><b>${K.eur(leit.steuer.gesamt, 0)}</b></div>
      <div class="kachel"><small>Liquiditätsbedarf inkl. Folgejahr</small><b>${K.eur(leit.doppeleffekt.gesamt, 0)}</b></div></div>`;
    t += tabelle(["Szenario", "Gewinn", "Jahressteuer", "festgesetzte VZ", "Lücke", "Ampel"], K.SZENARIEN.map((s) => {
      const x = st.szenarien[s];
      return { klasse: s === st.leitszenario ? "leit" : "", z: [esc(x.titel) + (s === st.leitszenario ? " (Leitszenario)" : ""), K.eur(x.gewinn), K.eur(x.steuer.gesamt), K.eur(x.vz), `${K.eur(x.luecke)} (${K.zahl(x.lueckeProzent, 1)} %)`, ampel(x.ampel)] };
    }));
    t += `<div class="empfehlung">${K.empfehlung(st).map((s) => `<p>${esc(s)}</p>`).join("")}</div>`;
    t += `<p class="hinweis">Ampel: Grün bei Lücke unter ${a.gruen_bis_prozent} % der Jahressteuer und unter ${K.zahl(a.gruen_bis_euro)} €; Gelb bis ${a.gelb_bis_prozent} % und bis ${K.zahl(a.gelb_bis_euro)} €; darüber Rot. Es gilt jeweils die strengere Grenze.</p>`;

    const dp = leit.doppeleffekt, zi = leit.zinsen;
    t += `<h3>Doppeleffekt und Zinsrisiko (${esc(leit.titel)})</h3>`;
    if (dp.posten.length) {
      t += tabelle(["Fällig ca.", "Posten", "Betrag"], dp.posten.map((p) => [K.deDatum(p.datum), esc(p.text), K.eur(p.betrag)]).concat([["", "<b>Liquiditätsbedarf gesamt</b>", `<b>${K.eur(dp.gesamt)}</b>`]]), { rechtsAb: 2 });
      t += `<p class="hinweis">Annahme: Steuerbescheid ${st.jahr} ca. ${dp.bescheidGeschaetzt.slice(5, 7)}/${dp.bescheidGeschaetzt.slice(0, 4)}, Zahlungsfrist ein Monat. Mit dem Bescheid hebt das Finanzamt die Vorauszahlungen ${st.jahr + 1} auf die neue Jahressteuer an (bisher ${K.eur(dp.vzFolgejahr)}${dp.folgejahrFortgeschrieben ? ", fortgeschrieben aus " + st.jahr : ""}); der Erhöhungsbetrag fällt auf die verbleibenden Termine (§ 37 Abs. 3 und 4 EStG).</p>`;
    } else t += "<p>Keine Nachzahlung im Leitszenario.</p>";
    t += `<p class="hinweis">Nachzahlungszinsen nach § 233a AO: 0,15 % je vollem Monat ab ${K.deDatum(zi.zinslaufBeginn)} (15 Monate Karenzzeit). Auf die Lücke wären das ${K.eur(zi.jeMonat)} je Monat; beim angenommenen Bescheidtermin ${K.eur(zi.betragBisBescheid)}.</p>`;

    if (leit.ampel === "rot") {
      t += `<h3 class="nichtdrucken">Antragsentwurf an das Finanzamt</h3><div class="nichtdrucken"><p class="hinweis">Entwurf zum Prüfen und Anpassen. Die App versendet nichts.</p>
        <textarea id="s-antrag" rows="14" readonly>${esc(K.antrag(d, st, heute()))}</textarea>
        <div class="leiste"><button id="s-antrag-kopie">In die Zwischenablage kopieren</button><button id="s-antrag-datei">Als Datei sichern</button></div></div>`;
    }

    t += `<h3>Zuflüsse ${st.jahr}: Plan und Ist</h3><figure>${saeulen(MON, [["Plan (Basis)", "plan", st.monate.map((m) => m.plan)], ["Ist", "ist", st.monate.map((m) => (m.ist ? m.einnahmenIst : null))]], `Netto-Zuflüsse ${st.jahr} je Monat, Plan und Ist in Euro`)}${legende([["Plan (Basis, netto)", "plan"], ["Ist (netto)", "ist"]])}</figure>`;
    t += `<details><summary>Monatswerte als Tabelle</summary>${tabelle(["Monat", "Plan netto", "Ist netto", "Abweichung", "Reisekosten erstattet", "USt (kein Gewinn)", "durchlaufend/privat", "Betriebsausgaben"],
      st.monate.map((m) => [kurz(m.monat), K.de(m.plan), m.ist ? K.de(m.einnahmenIst) : "", m.ist ? K.de(m.einnahmenIst - m.plan) : "", m.ist && m.reisekosten ? K.de(m.reisekosten) : "", m.ist ? K.de(m.ust) : "", m.ist && m.nichtGewinnwirksam ? K.de(m.nichtGewinnwirksam) : "", `${K.de(m.ausgaben)} (${m.ausgabenQuelle})`]), { klasse: "klein" })}</details>`;

    if (verlauf.length) {
      t += `<h3>Lücke über die Monate</h3><figure>${linien(verlauf.map((v) => kurz(v.monat)), K.SZENARIEN.map((s) => [K.TITEL[s], s, verlauf.map((v) => v[s])]), "Deckungslücke je Stichtag und Szenario in Euro")}${legende(K.SZENARIEN.map((s) => [K.TITEL[s], s]))}</figure>
        <p class="hinweis">Je Stichtag neu berechnet mit den Eingängen bis zu diesem Monat und den damals vorliegenden Bescheiden. Verträge gehen mit ihrem heutigen Stand ein.</p>
        <details><summary>Werte als Tabelle</summary>${tabelle(["Stichtag", "Konservativ", "Basis", "Run-Rate"], verlauf.map((v) => [kurz(v.monat)].concat(K.SZENARIEN.map((s) => K.eur(v[s])))), { klasse: "klein" })}</details>`;
    }

    t += `<h3>Empfohlene Steuerrücklage</h3>${tabelle(["Monat", "Konservativ", "Basis", "Run-Rate", "kumuliert (Leitszenario)"], st.ruecklage.map((r) => [kurz(r.monat), K.eur(r.konservativ), K.eur(r.basis), K.eur(r.runrate), K.eur(r[st.leitszenario + "Kumuliert"])]))}
      <div class="leiste nichtdrucken"><button id="s-ruecklage">rücklage.csv sichern</button><span class="hinweis">Gleichmäßig verteilt, sodass die Lücke bis Jahresende gedeckt ist.</span></div>`;

    t += `<h3>Liquiditätsvorschau 18 Monate (${esc(leit.titel)})</h3><figure>${linien(liq.zeilen.map((z) => kurz(z.monat)), [["Kumulierter Saldo", st.leitszenario, liq.zeilen.map((z) => z.kumuliert)]], "Kumulierter Liquiditätssaldo in Euro")}</figure>
      <p class="hinweis">Kumulierter Saldo aus Netto-Zuflüssen, Betriebsausgaben und Steuerzahlungen, ab Startbestand ${E(einst.annahmen.liquiditaet_startbestand)}. Tiefpunkt: ${K.eur(liq.minimum.kumuliert)} im ${kurz(liq.minimum.monat)}. Ohne Umsatzsteuer und Privatentnahmen. Zuflüsse enden mit den erfassten Verträgen.${liq.vzGeschaetztJahre.length ? ` Vorauszahlungen ${liq.vzGeschaetztJahre.join(", ")} sind mangels Bescheid aus dem Vorjahr fortgeschrieben.` : ""}${liq.danach.length ? " Nach dem Vorschauzeitraum fällig: " + liq.danach.map((p) => `${esc(p.text)} ${K.eur(p.betrag)} am ${K.deDatum(p.datum)}`).join("; ") + "." : ""}</p>
      ${tabelle(["Monat", "Zuflüsse netto", "Betriebsausgaben", "Vorauszahlungen", "Nachzahlung/Erhöhung", "Saldo", "kumuliert"], liq.zeilen.map((z) => [kurz(z.monat), K.de(z.einnahmen), K.de(-z.ausgaben), z.vz ? K.de(-z.vz) : "", z.steuerSonder ? K.de(-z.steuerSonder) + `<br><span class="hinweis">${esc(z.sonderText)}</span>` : "", K.de(z.saldo), K.de(z.kumuliert)]), { klasse: "klein" })}`;

    t += "<h3>Rechenweg und Belege</h3>";
    for (const s of K.SZENARIEN) { const x = st.szenarien[s]; t += `<details><summary>Rechenweg ${esc(x.titel)}: Lücke ${K.eur(x.luecke)}</summary>${tabelle(["Schritt", "Rechnung", "Ergebnis", "Quelle"], x.rechenweg.map((r) => r.map(esc)), { rechtsAb: 99, klasse: "klein" })}</details>`; }
    const b = st.bescheidEst;
    if (b) t += `<details><summary>Vorauszahlungsbescheid ${esc(b.id)} vom ${K.deDatum(b.datum)}</summary>${tabelle(["Fällig", "ESt", "Soli", "KiSt", "Summe"], b.termine.map((x) => [K.deDatum(x.faellig), E(x.est), E(x.soli), E(x.kist), K.eur(K.C(x.est) + K.C(x.soli) + K.C(x.kist))]), { klasse: "klein" })}<p class="hinweis">Beleg: ${esc(b.beleg || "nicht angegeben")}${b.bemessungsgrundlage_zve ? ` · vom Finanzamt zugrunde gelegtes zvE: ${K.zahl(b.bemessungsgrundlage_zve)} €` : ""}</p></details>`;
    t += `<details><summary>Parameter und Annahmen</summary><p>Steuerparameter ${st.jahr}: Stand ${K.deDatum(st.params.stand)}, Status ${esc(st.params.status)}. Quelle: ${esc(st.params.quelle)}. Der Tarif ist gegen den BMF-Steuerrechner getestet.</p>
      <p>Jahrespauschale: weitere Einkünfte ${E(st.pauschale.weitere_einkuenfte)}, Abzüge ${E(st.pauschale.abzuege)} (${esc(st.pauschale.quelle || "ohne Quelle")}).</p>
      <p>Betriebsausgaben: Pauschale ${E(einst.betriebsausgaben.monatspauschale)} je Monat, ersetzt durch Ist-Werte, wo erfasst. Erstattete Reisekosten sind in Pauschalmonaten gewinnneutral angesetzt.</p></details>`;
    t += "<footer>Planungswerkzeug. Ersetzt keine Steuerberatung. Alle Werte sind Schätzungen auf Basis der erfassten Daten und vereinfachter Annahmen; verbindlich ist allein der Steuerbescheid.</footer>";
    return t;
  }

  /* ---------- Eingänge ---------- */
  const ARTNAME = { honorar: "Honorar", reisekosten: "Reisekosten erstattet", durchlaufend: "durchlaufender Posten", privat: "privat / kein Betrieb", sonstig: "sonstige Betriebseinnahme" };
  const artOpt = () => K.ARTEN.map((a) => [a, ARTNAME[a]]);
  const vertragOpt = () => [["", "(kein Vertrag)"]].concat(Z.daten.vertraege.map((v) => [v.id, `${v.id} ${v.kunde || ""}`]));
  const sel = (name, wert, opt) => `<select data-f="${name}">${opt.map(([v, x]) => `<option value="${esc(v)}"${String(v) === String(wert) ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
  function tabEingaenge() {
    const d = Z.daten;
    let t = `<h2>Zahlungseingänge</h2><p class="hinweis">Maßgeblich ist der Tag des Geldeingangs (Zuflussprinzip, § 11 EStG). Umsatzsteuer wird herausgerechnet und ist kein Gewinn.</p>
      <h3>Bankexport einlesen</h3><p>Sparkasse/VR: Umsätze als „CSV-CAMT“ exportieren. Die App liest nur Geldeingänge; nichts wird hochgeladen.</p>
      <div class="leiste"><button class="haupt" id="e-csv">CSV-Datei wählen</button><label>nur Monat <input id="e-monat" placeholder="JJJJ-MM" size="8" value="${esc(Z.csvMonat || "")}"></label></div>`;
    if (Z.vorschlag) {
      t += `<p><b>${Z.vorschlag.length} Eingänge gefunden.</b> Prüfe Art, Vertrag und USt-Satz. Gespeichert wird erst mit „Übernehmen“.</p>` +
        tabelle(["", "Datum", "Zahler / Zweck", "Brutto", "USt %", "Netto", "Art", "Vertrag"], Z.vorschlag.map((e, i) => {
          const n = K.ustTrennen(K.C(e.brutto), e.ust_satz).netto;
          return [`<input type="checkbox" data-i="${i}" data-f="ok"${e.ok ? " checked" : ""}${e.doppelt ? " disabled" : ""} aria-label="übernehmen">`, K.deDatum(e.datum), `${esc(e.kunde)}<br><span class="hinweis">${esc(e.verwendungszweck)}</span>${e.hinweise.length ? `<br><span class="hinweis"><b>Prüfen:</b> ${esc(e.hinweise.join("; "))}</span>` : ""}`, `<span class="nw">${E(e.brutto)}</span>`,
            `<input data-i="${i}" data-f="ust_satz" size="3" value="${zahlDe(e.ust_satz)}" aria-label="USt-Satz">`, `<span class="nw">${K.eur(n)}</span>`, sel("art", e.art, artOpt()).replace("<select", `<select data-i="${i}"`), sel("vertrag_id", e.vertrag_id, vertragOpt()).replace("<select", `<select data-i="${i}"`)];
        }), { rechtsAb: 99, klasse: "klein" }) + `<div class="leiste"><button class="haupt" id="e-uebernehmen">Markierte übernehmen</button><button id="e-verwerfen">Verwerfen</button></div>`;
    }
    const b = Z.bearbeite.eingang || {};
    t += `<h3>Eingang von Hand erfassen</h3><form id="e-form"><div class="form">${feld("Datum Geldeingang", "datum", b.datum || "", { typ: "date" })}${feld("Zahler", "kunde", b.kunde)}${feld("Verwendungszweck", "verwendungszweck", b.verwendungszweck)}${feld("Brutto €", "brutto", zahlDe(b.brutto), { zahl: 1 })}${feld("USt-Satz %", "ust_satz", zahlDe(b.ust_satz ?? d.einstellungen.ust_satz_standard_prozent), { zahl: 1 })}${feld("Art", "art", b.art || "honorar", { optionen: artOpt() })}${feld("Vertrag", "vertrag_id", b.vertrag_id || "", { optionen: vertragOpt() })}</div><button class="haupt">Eingang hinzufügen</button></form>`;
    const liste = d.eingaenge.slice().sort((x, y) => (x.datum < y.datum ? 1 : -1));
    t += `<h3>Erfasste Eingänge (${liste.length})</h3>` + (liste.length ? tabelle(["Datum", "Zahler / Zweck", "Art", "Vertrag", "Brutto", "USt", "Netto", ""], liste.map((e) => {
      const x = K.ustTrennen(K.C(e.brutto), e.ust_satz);
      return [K.deDatum(e.datum), `${esc(e.kunde)}<br><span class="hinweis">${esc(e.verwendungszweck)}${e.quelle ? " · " + esc(e.quelle) : ""}</span>`, esc(ARTNAME[e.art]), esc(e.vertrag_id || ""), E(e.brutto), K.eur(x.ust), K.eur(x.netto), `<button class="klein" data-loesche="eingaenge" data-id="${esc(e.id)}">Löschen</button>`];
    }), { rechtsAb: 4, klasse: "klein" }) : '<p class="leer">Noch keine Eingänge.</p>');
    if (d.vertraege.length && d.eingaenge.length) {
      const ist = (Z.stichtag || K.mKey(K.standardStichtag(d, heute()))).split("-").map(Number), ab = K.datenAb(d, ist[0]);
      t += `<h3>Plan und Ist je Vertrag bis ${kurz(K.mKey(ist))}</h3>` + tabelle(["Vertrag", "Plan", "Ist", "Abweichung", "Folge"], K.vertragsstand(d, ist, ab).map((s) => [`${esc(s.vertrag.id)} ${esc(s.vertrag.kunde || "")}`, K.eur(s.planBis), K.eur(s.ist), K.eur(s.abweichung), s.abweichung === 0 ? "im Plan" : s.abweichung < 0 ? "überfällig, wird in den Folgemonat vorgetragen" : "früher bezahlt, mindert künftige Zuflüsse"]), { klasse: "klein" });
    }
    return t;
  }

  /* ---------- Verträge ---------- */
  const STATUS = [["unterschrieben", "unterschrieben"], ["zugesagt", "mündlich zugesagt"], ["pipeline", "Pipeline"]];
  function tabVertraege() {
    const d = Z.daten, b = Z.bearbeite.vertrag || {}, neu = !b.id;
    let t = `<h2>Verträge und Angebote</h2>` + (d.vertraege.length ? tabelle(["ID", "Kunde / Projekt", "Status", "Satz netto", "Menge/Monat", "Laufzeit", "Zahlungsziel", ""], d.vertraege.map((v) => [esc(v.id), `${esc(v.kunde || "")}<br><span class="hinweis">${esc(v.projekt || "")}</span>`, esc(v.status) + (v.status === "pipeline" ? ` (${v.wahrscheinlichkeit_prozent || 0} %)` : ""), `${E(v.satz_netto)} / ${v.einheit === "stunde" ? "Std." : "Tag"}`, zahlDe(v.menge_pro_monat), `${K.deDatum(v.beginn)} – ${K.deDatum(v.ende)}`, `${v.zahlungsziel_tage || 0} Tage`,
      `<button class="klein" data-zeige="${esc(v.id)}">Zuflüsse</button> <button class="klein" data-bearbeite="vertrag" data-id="${esc(v.id)}">Bearbeiten</button> <button class="klein" data-loesche="vertraege" data-id="${esc(v.id)}">Löschen</button>`]), { rechtsAb: 99, klasse: "klein" }) : '<p class="leer">Noch keine Verträge.</p>');
    const zv = d.vertraege.find((v) => String(v.id) === String(Z.zeigeVertrag));
    if (zv) {
      const p = K.projektion(zv), jeJahr = {}; p.forEach((f) => (jeJahr[f.zufluss.slice(0, 4)] = (jeJahr[f.zufluss.slice(0, 4)] || 0) + f.netto));
      t += `<h3>Erwartete Zuflüsse ${esc(zv.id)} ${esc(zv.kunde || "")}</h3>` + tabelle(["Leistungsmonat", "Rechnung", "Zufluss", "Steuerjahr", "Netto"], p.map((f) => [f.leistung, K.deDatum(f.rechnung), K.deDatum(f.zufluss), f.zufluss.slice(0, 4), K.eur(f.netto)]), { rechtsAb: 4, klasse: "klein" }) +
        `<p class="hinweis">Summe je Steuerjahr (nach Zufluss): ${Object.entries(jeJahr).map(([j, c]) => `${j}: ${K.eur(c)}`).join(", ")}. Gewicht im Basis-Szenario: ${K.gewicht(zv, "basis", d.einstellungen) / 100} %.</p>`;
    }
    t += `<h3>${neu ? "Vertrag hinzufügen" : "Vertrag " + esc(b.id) + " bearbeiten"}</h3><form id="v-form"><div class="form">
      ${feld("Kunde", "kunde", b.kunde)}${feld("Projekt", "projekt", b.projekt)}${feld("Status", "status", b.status || "unterschrieben", { optionen: STATUS })}${feld("Wahrscheinlichkeit % (nur Pipeline)", "wahrscheinlichkeit_prozent", zahlDe(b.wahrscheinlichkeit_prozent), { zahl: 1 })}
      ${feld("Einheit", "einheit", b.einheit || "tag", { optionen: [["tag", "Tag"], ["stunde", "Stunde"]] })}${feld("Satz netto €", "satz_netto", zahlDe(b.satz_netto), { zahl: 1 })}${feld("Menge je Monat", "menge_pro_monat", zahlDe(b.menge_pro_monat), { zahl: 1 })}
      ${feld("Beginn", "beginn", b.beginn, { typ: "date" })}${feld("Ende", "ende", b.ende, { typ: "date" })}${feld("Abrechnung", "abrechnung", b.abrechnung || "monatlich", { optionen: [["monatlich", "monatlich"], ["quartalsweise", "quartalsweise"], ["einmalig", "einmalig am Ende"]] })}
      ${feld("Zahlungsziel Tage", "zahlungsziel_tage", b.zahlungsziel_tage ?? 30, { zahl: 1 })}${feld("USt-Satz %", "ust_satz_prozent", zahlDe(b.ust_satz_prozent ?? d.einstellungen.ust_satz_standard_prozent), { zahl: 1 })}
      ${feld("Reisekostenregelung", "reisekosten", b.reisekosten)}${feld("Kündigungsfrist", "kuendigungsfrist", b.kuendigungsfrist)}${feld("Stichwörter für Bankzuordnung (Komma)", "matching", (b.matching || []).join(", "))}${feld("Beleg / Ablageort", "beleg", b.beleg)}
      ${feld("Abweichende Monatsmengen (z. B. 2026-08: 4, 2026-12: 6)", "mengen", Object.entries(b.mengen || {}).map(([k, v]) => `${k}: ${zahlDe(v)}`).join(", "), { breit: 1 })}</div>
      <div class="leiste"><button class="haupt">${neu ? "Vertrag hinzufügen" : "Änderungen übernehmen"}</button>${neu ? "" : '<button type="button" id="v-abbruch">Abbrechen</button>'}</div></form>`;
    return t;
  }
  function naechsteId(liste, praefix, breite) {
    const n = Math.max(0, ...liste.map((x) => { const m = String(x.id).match(/(\d+)$/); return m && String(x.id).startsWith(praefix) ? Number(m[1]) : 0; })) + 1;
    return praefix + String(n).padStart(breite, "0");
  }

  /* ---------- Bescheide ---------- */
  function tabBescheide() {
    const d = Z.daten, b = Z.bearbeite.bescheid || {}, neu = !b.id, jahr = Number(b.jahr || Z.jahr || jahre()[0]), art = b.art || "est";
    const std = (art === "gewst" ? K.params(jahres(jahr)).gewst.termine : K.params(jahres(jahr)).vz.termine).map((x) => `${jahr}-${x}`);
    const term = b.termine && b.termine.length ? b.termine : std.map((f) => ({ faellig: f }));
    let t = `<h2>Vorauszahlungsbescheide</h2><p class="hinweis">Je Jahr und Steuerart gilt der Bescheid mit dem jüngsten Datum. Einen Änderungsbescheid erfasst du als neuen Bescheid mit allen Terminen des Jahres.</p>` +
      (d.bescheide.length ? tabelle(["ID", "Datum", "Jahr", "Art", "Summe", "zvE laut FA", ""], d.bescheide.slice().sort((x, y) => (x.datum < y.datum ? 1 : -1)).map((x) => {
        const gilt = K.vzBescheid(d, Number(x.jahr), x.art || "est");
        return [esc(x.id) + (gilt && gilt.id === x.id ? "" : ' <span class="hinweis">(ersetzt)</span>'), K.deDatum(x.datum), x.jahr, (x.art || "est") === "est" ? "ESt" : "GewSt", K.eur(K.vzSumme(x)), x.bemessungsgrundlage_zve ? K.zahl(x.bemessungsgrundlage_zve) + " €" : "", `<button class="klein" data-bearbeite="bescheid" data-id="${esc(x.id)}">Bearbeiten</button> <button class="klein" data-loesche="bescheide" data-id="${esc(x.id)}">Löschen</button>`];
      }), { rechtsAb: 4, klasse: "klein" }) : '<p class="leer">Noch kein Bescheid.</p>');
    t += `<h3>${neu ? "Bescheid erfassen" : "Bescheid " + esc(b.id) + " bearbeiten"}</h3><form id="b-form"><div class="form">
      ${feld("Bescheiddatum", "datum", b.datum, { typ: "date" })}${feld("Jahr", "jahr", jahr, { zahl: 1 })}${feld("Steuerart", "art", art, { optionen: [["est", "Einkommensteuer"], ["gewst", "Gewerbesteuer"]] })}
      ${feld("zvE laut Bescheid € (optional)", "bemessungsgrundlage_zve", zahlDe(b.bemessungsgrundlage_zve), { zahl: 1 })}${feld("Beleg / Ablageort", "beleg", b.beleg)}</div>` +
      tabelle(["Fällig", art === "gewst" ? "GewSt €" : "ESt €", art === "gewst" ? "" : "Soli €", art === "gewst" ? "" : "KiSt €"], term.map((x, i) => [`<input type="date" name="t${i}_faellig" value="${esc(x.faellig || "")}" aria-label="Fälligkeit ${i + 1}">`,
        `<input name="t${i}_${art === "gewst" ? "gewst" : "est"}" inputmode="decimal" size="10" value="${zahlDe(art === "gewst" ? x.gewst : x.est)}" aria-label="Betrag ${i + 1}">`,
        art === "gewst" ? "" : `<input name="t${i}_soli" inputmode="decimal" size="10" value="${zahlDe(x.soli)}" aria-label="Soli ${i + 1}">`, art === "gewst" ? "" : `<input name="t${i}_kist" inputmode="decimal" size="10" value="${zahlDe(x.kist)}" aria-label="KiSt ${i + 1}">`]), { rechtsAb: 99 }) +
      `<div class="leiste"><button class="haupt">${neu ? "Bescheid speichern" : "Änderungen übernehmen"}</button>${neu ? "" : '<button type="button" id="b-abbruch">Abbrechen</button>'}</div></form>`;
    return t;
  }
  const jahres = (j) => (K.PARAMS[j] ? j : jahre()[0]);

  /* ---------- Ausgaben und Pauschalen ---------- */
  function tabAusgaben() {
    const d = Z.daten;
    let t = `<h2>Betriebsausgaben und Jahrespauschalen</h2><h3>Betriebsausgaben</h3><p>Standard ist die Monatspauschale von ${E(d.einstellungen.betriebsausgaben.monatspauschale)} (unter Einstellungen änderbar). Ein Ist-Wert ersetzt die Pauschale für diesen Monat.</p>` +
      (d.ausgaben.length ? tabelle(["Monat", "Betrag netto", "Notiz", ""], d.ausgaben.slice().sort((x, y) => (x.monat < y.monat ? -1 : 1)).map((a, i) => [esc(a.monat), E(a.betrag_netto), esc(a.notiz || ""), `<button class="klein" data-loesche-ausgabe="${esc(a.monat)}|${a.betrag_netto}">Löschen</button>`]), { rechtsAb: 1, klasse: "klein" }).replace(/<td class="r">([^<]*)<\/td><td class="r">(<button)/g, '<td>$1</td><td class="r">$2') : "") +
      `<form id="a-form"><div class="form">${feld("Monat", "monat", "", { platz: "JJJJ-MM" })}${feld("Betrag netto €", "betrag_netto", "", { zahl: 1 })}${feld("Notiz", "notiz", "")}</div><button class="haupt">Ist-Ausgaben hinzufügen</button></form>
      <h3>Weitere Einkünfte und Abzüge je Jahr</h3><p>Pauschal aus dem letzten Bescheid: z. B. Vermietung als weitere Einkünfte; Sonderausgaben und Vorsorgeaufwendungen als Abzüge. Fehlt ein Jahr, gilt das letzte davor.</p>`;
    t += '<form id="p-form">' + tabelle(["Jahr", "weitere Einkünfte €", "Abzüge €", "Quelle"], jahre().map((j) => { const p = d.pauschalen[j] || {}; return [j, `<input name="w${j}" inputmode="decimal" size="10" value="${zahlDe(p.weitere_einkuenfte)}" aria-label="weitere Einkünfte ${j}">`, `<input name="a${j}" inputmode="decimal" size="10" value="${zahlDe(p.abzuege)}" aria-label="Abzüge ${j}">`, `<input name="q${j}" size="34" value="${esc(p.quelle || "")}" aria-label="Quelle ${j}">`]; }), { rechtsAb: 99 }) + '<div class="leiste"><button class="haupt">Pauschalen übernehmen</button></div></form>';
    return t;
  }

  /* ---------- Einstellungen ---------- */
  function tabEinstellungen() {
    const e = Z.daten.einstellungen;
    return `<h2>Einstellungen</h2><form id="k-form"><h3>Steuerliche Einordnung</h3><div class="form">
      ${feld("Veranlagung", "veranlagung", e.veranlagung, { optionen: [["einzel", "Einzelveranlagung (Grundtarif)"], ["zusammen", "Zusammenveranlagung (Splitting)"]] })}
      ${feld("Einstufung", "einstufung", e.einstufung, { optionen: [["freiberuflich", "freiberuflich (§ 18 EStG)"], ["gewerblich", "gewerblich (§ 15 EStG)"]] })}
      ${feld("Hebesatz Gewerbesteuer % (nur gewerblich)", "hebesatz", zahlDe(e.gewerbesteuer.hebesatz_prozent), { zahl: 1 })}
      ${feld("Kirchensteuersatz %", "kist_satz", e.kirchensteuer.satz_prozent, { optionen: [[8, "8 % (Bayern, Baden-Württemberg)"], [9, "9 % (übrige Länder)"]] })}
      ${feld("kirchensteuerpflichtig", "kist", e.kirchensteuer.pflichtig, { typ: "haken" })}</div>
      <h3>Umsatz und Ausgaben</h3><div class="form">${feld("USt-Satz Standard %", "ust", zahlDe(e.ust_satz_standard_prozent), { zahl: 1 })}${feld("Betriebsausgaben-Pauschale € je Monat (netto)", "ba", zahlDe(e.betriebsausgaben.monatspauschale), { zahl: 1 })}</div>
      <h3>Szenarien</h3><div class="form">${feld("Leitszenario", "leit", e.szenarien.leitszenario, { optionen: [["konservativ", "Konservativ"], ["basis", "Basis"], ["runrate", "Run-Rate"]] })}${feld("Gewicht mündlich zugesagter Verträge %", "zugesagt", zahlDe(e.szenarien.gewicht_zugesagt_prozent), { zahl: 1 })}${feld("Run-Rate über Monate", "rr", e.szenarien.runrate_monate, { zahl: 1 })}</div>
      <h3>Ampel-Schwellen</h3><div class="form">${feld("Grün bis unter % der Jahressteuer", "gp", zahlDe(e.ampel.gruen_bis_prozent), { zahl: 1 })}${feld("Grün bis unter €", "ge", zahlDe(e.ampel.gruen_bis_euro), { zahl: 1 })}${feld("Gelb bis %", "yp", zahlDe(e.ampel.gelb_bis_prozent), { zahl: 1 })}${feld("Gelb bis €", "ye", zahlDe(e.ampel.gelb_bis_euro), { zahl: 1 })}</div>
      <h3>Annahmen</h3><div class="form">${feld("Steuerbescheid: Monate nach Jahresende", "bm", e.annahmen.bescheid_monate_nach_jahresende, { zahl: 1 })}${feld("Zahlungsfrist Monate", "zf", e.annahmen.zahlungsfrist_monate, { zahl: 1 })}${feld("Bereits gebildete Steuerrücklage €", "rl", zahlDe(e.annahmen.ruecklage_bereits_gebildet), { zahl: 1 })}${feld("Kontostand Geschäftskonto zum Stichtag €", "sb", zahlDe(e.annahmen.liquiditaet_startbestand), { zahl: 1 })}</div>
      <div class="leiste"><button class="haupt">Einstellungen übernehmen</button></div></form>
      <h3>Steuerparameter</h3>${tabelle(["Jahr", "Stand", "Status", "Grundfreibetrag", "Soli-Freigrenze", "Zinssatz § 233a"], jahre().map((j) => { const p = K.params(j); return [j, K.deDatum(p.stand), esc(p.status), K.zahl(p.zonen[0].bis) + " €", K.zahl(p.soli.freigrenzeEinzel) + " €", "0,15 % je Monat"]; }), { rechtsAb: 3, klasse: "klein" })}
      <p class="hinweis">${esc(K.params(jahre()[0]).quelle)}. Die Parameter sind fest in der App hinterlegt und werden von Claude gepflegt, nicht von Hand.</p>`;
  }

  /* ---------- Import von Claude ---------- */
  function tabImport() {
    let t = `<h2>Import von Claude</h2><p>Wenn du einen Bescheid oder Vertrag nicht abtippen willst: Lade das PDF im Chat mit Claude hoch und bitte um eine Importdatei für den ESt-Monitor. Claude liest die Werte aus und gibt dir eine kleine Datei <code>import_….json</code>. Die wählst du hier aus oder fügst ihren Inhalt ein.</p>
      <p class="hinweis">Hinweis: Dabei geht das Dokument an Claude. Von Hand erfasste Daten bleiben vollständig auf deinem Rechner.</p>
      <div class="leiste"><button class="haupt" id="i-datei">Importdatei wählen</button></div>
      <textarea id="i-text" rows="6" placeholder='{"format": "est-monitor-import", "bescheide": [...], "vertraege": [...]}'></textarea><div class="leiste"><button id="i-pruefen">Eingefügten Text prüfen</button></div>`;
    const v = Z.importVorschau;
    if (v) {
      t += "<h3>Bitte prüfen</h3>";
      if (v.bescheide.length) t += "<p><b>Bescheide</b></p>" + tabelle(["Datum", "Jahr", "Art", "Termine", "Summe", "zvE laut FA"], v.bescheide.map((b) => [K.deDatum(b.datum), b.jahr, (b.art || "est") === "est" ? "ESt" : "GewSt", b.termine.map((x) => `${K.deDatum(x.faellig)}: ${K.eur(K.C(x.est) + K.C(x.soli) + K.C(x.kist) + K.C(x.gewst))}`).join("<br>"), K.eur(K.vzSumme(b)), b.bemessungsgrundlage_zve ? K.zahl(b.bemessungsgrundlage_zve) + " €" : ""]), { rechtsAb: 4, klasse: "klein" });
      if (v.vertraege.length) t += "<p><b>Verträge</b></p>" + tabelle(["Kunde / Projekt", "Status", "Satz netto", "Menge/Monat", "Laufzeit", "Abrechnung", "Zahlungsziel"], v.vertraege.map((x) => [`${esc(x.kunde || "")}<br><span class="hinweis">${esc(x.projekt || "")}</span>`, esc(x.status), E(x.satz_netto), zahlDe(x.menge_pro_monat), `${K.deDatum(x.beginn)} – ${K.deDatum(x.ende)}`, esc(x.abrechnung || "monatlich"), `${x.zahlungsziel_tage || 0} Tage`]), { rechtsAb: 99, klasse: "klein" });
      if (Object.keys(v.pauschalen).length) t += "<p><b>Jahrespauschalen</b></p>" + tabelle(["Jahr", "weitere Einkünfte", "Abzüge", "Quelle"], Object.entries(v.pauschalen).map(([j, p]) => [j, E(p.weitere_einkuenfte), E(p.abzuege), esc(p.quelle || "")]), { klasse: "klein" });
      if (v.hinweise.length) t += `<div class="meldung">${v.hinweise.map(esc).join("<br>")}</div>`;
      t += '<div class="leiste"><button class="haupt" id="i-ok">Stimmt so, übernehmen</button><button id="i-nein">Verwerfen</button></div>';
    }
    return t;
  }
  function importPruefen(text) {
    const j = JSON.parse(text);
    if (j.format !== "est-monitor-import") throw new Error('Das ist keine Importdatei (erwartet "format": "est-monitor-import").');
    const v = { bescheide: j.bescheide || [], vertraege: j.vertraege || [], pauschalen: j.pauschalen || {}, hinweise: (j.hinweise || []).slice() };
    for (const b of v.bescheide) { if (!b.datum || !b.jahr || !Array.isArray(b.termine) || !b.termine.length) throw new Error("Bescheid unvollständig (Datum, Jahr, Termine)."); b.termine.forEach((x) => K.deDatum(x.faellig)); }
    for (const x of v.vertraege) { if (!x.beginn || !x.ende || x.satz_netto === undefined || !["unterschrieben", "zugesagt", "pipeline"].includes(x.status)) throw new Error(`Vertrag ${x.kunde || ""} unvollständig (Status, Satz, Beginn, Ende).`); K.projektion(Object.assign({ id: "x" }, x)); }
    if (!v.bescheide.length && !v.vertraege.length && !Object.keys(v.pauschalen).length) throw new Error("Die Importdatei enthält keine Einträge.");
    return v;
  }

  /* ---------- Rahmen ---------- */
  const TABS = [["status", "Steuer-Check"], ["eingaenge", "Eingänge"], ["vertraege", "Verträge"], ["bescheide", "Bescheide"], ["ausgaben", "Ausgaben & Pauschalen"], ["einstellungen", "Einstellungen"], ["import", "Import von Claude"]];
  const SEITE = { status: tabStatus, eingaenge: tabEingaenge, vertraege: tabVertraege, bescheide: tabBescheide, ausgaben: tabAusgaben, einstellungen: tabEinstellungen, import: tabImport };
  function kopf() {
    $("#datei").innerHTML = (Z.dateiname ? esc(Z.dateiname) : "noch keine Datei") + (Z.dirty ? " · <b>ungespeicherte Änderungen</b>" : "");
    $("nav").innerHTML = TABS.map(([k, n]) => `<button data-tab="${k}"${k === Z.tab ? ' class="an" aria-current="page"' : ""}>${n}</button>`).join("");
  }
  function zeige() {
    kopf();
    let inhalt; try { inhalt = SEITE[Z.tab](); } catch (e) { inhalt = `<div class="meldung fehler">${esc(e.message)}</div>`; }
    $("main").innerHTML = Z.meldung + inhalt; Z.meldung = "";
  }

  /* ---------- Ereignisse ---------- */
  document.addEventListener("click", async (ev) => {
    const el = ev.target.closest("button"); if (!el) return;
    const d = Z.daten;
    if (el.dataset.tab) { Z.tab = el.dataset.tab; zeige(); window.scrollTo(0, 0); return; }
    if (el.id === "k-oeffnen") return oeffnen();
    if (el.id === "k-speichern") return speichern();
    if (el.id === "k-beispiel") return beispiel();
    if (el.id === "s-druck") { document.querySelectorAll("details").forEach((x) => (x.open = true)); return window.print(); }
    if (el.id === "s-ruecklage") return herunterladen("rücklage.csv", K.ruecklageCsv(Z.status), "text/csv;charset=utf-8");
    if (el.id === "s-antrag-datei") return herunterladen(`antrag_anpassung_${Z.stichtag}.md`, $("#s-antrag").value, "text/markdown;charset=utf-8");
    if (el.id === "s-antrag-kopie") { try { await navigator.clipboard.writeText($("#s-antrag").value); } catch (e) { $("#s-antrag").select(); document.execCommand("copy"); } el.textContent = "Kopiert"; return; }
    if (el.id === "e-csv") {
      const f = await dateiWaehlen(".csv,text/csv"); if (!f) return;
      const buf = await f.arrayBuffer(); let text;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { text = new TextDecoder("windows-1252").decode(buf); }
      Z.csvMonat = $("#e-monat").value.trim();
      return versuch(() => {
        if (Z.csvMonat && !/^\d{4}-\d{2}$/.test(Z.csvMonat)) throw new Error("Monat bitte als JJJJ-MM angeben.");
        Z.vorschlag = K.bankVorschlag(text, d, Z.csvMonat || null).map((e) => Object.assign(e, { quelle: f.name, ok: !e.doppelt }));
        if (!Z.vorschlag.length) { Z.vorschlag = null; meld("Keine Geldeingänge in der Datei" + (Z.csvMonat ? " für " + Z.csvMonat : "") + " gefunden."); }
        zeige();
      });
    }
    if (el.id === "e-verwerfen") { Z.vorschlag = null; return zeige(); }
    if (el.id === "e-uebernehmen") {
      const neu = Z.vorschlag.filter((e) => e.ok && !e.doppelt).map(({ hinweise, doppelt, ok, ...rest }) => rest);
      d.eingaenge.push(...neu); Z.vorschlag = null; Z.stichtag = Z.jahr = null; geaendert(); meld(`${neu.length} Eingänge übernommen. Speichern nicht vergessen.`); return zeige();
    }
    if (el.dataset.loesche) { if (!confirm("Eintrag löschen?")) return; d[el.dataset.loesche] = d[el.dataset.loesche].filter((x) => String(x.id) !== el.dataset.id); geaendert(); return zeige(); }
    if (el.dataset.loescheAusgabe) { const [m, b] = el.dataset.loescheAusgabe.split("|"); const i = d.ausgaben.findIndex((a) => a.monat === m && String(a.betrag_netto) === b); if (i >= 0) d.ausgaben.splice(i, 1); geaendert(); return zeige(); }
    if (el.dataset.bearbeite) { const liste = el.dataset.bearbeite === "vertrag" ? d.vertraege : d.bescheide; Z.bearbeite[el.dataset.bearbeite] = JSON.parse(JSON.stringify(liste.find((x) => String(x.id) === el.dataset.id))); return zeige(); }
    if (el.dataset.zeige) { Z.zeigeVertrag = el.dataset.zeige; return zeige(); }
    if (el.id === "v-abbruch") { Z.bearbeite.vertrag = null; return zeige(); }
    if (el.id === "b-abbruch") { Z.bearbeite.bescheid = null; return zeige(); }
    if (el.id === "i-datei") { const f = await dateiWaehlen(".json,application/json"); if (!f) return; const text = await f.text(); return versuch(() => { Z.importVorschau = importPruefen(text); zeige(); }); }
    if (el.id === "i-pruefen") { const text = $("#i-text").value; return versuch(() => { Z.importVorschau = importPruefen(text); zeige(); }); }
    if (el.id === "i-nein") { Z.importVorschau = null; return zeige(); }
    if (el.id === "i-ok") {
      const v = Z.importVorschau;
      for (const b of v.bescheide) d.bescheide.push(Object.assign({ art: "est" }, b, { id: naechsteId(d.bescheide, `VZ-${b.jahr}-`, 2) }));
      for (const x of v.vertraege) d.vertraege.push(Object.assign({ einheit: "tag", abrechnung: "monatlich", zahlungsziel_tage: 30, ust_satz_prozent: d.einstellungen.ust_satz_standard_prozent, matching: x.kunde ? [String(x.kunde).split(" ")[0]] : [] }, x, { id: naechsteId(d.vertraege, "V-", 3) }));
      Object.assign(d.pauschalen, v.pauschalen);
      Z.importVorschau = null; geaendert(); meld(`Übernommen: ${v.bescheide.length} Bescheide, ${v.vertraege.length} Verträge, ${Object.keys(v.pauschalen).length} Jahrespauschalen. Speichern nicht vergessen.`); return zeige();
    }
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target;
    if (el.id === "s-jahr") { Z.jahr = Number(el.value); return zeige(); }
    if (el.id === "s-stichtag") { Z.stichtag = el.value; return zeige(); }
    if (el.form && el.form.id === "b-form" && (el.name === "art" || el.name === "jahr")) {
      const w = werte(el.form), alt = Z.bearbeite.bescheid || {};
      return versuch(() => { const j = Math.round(num(w.jahr, true)); if (j < 2000 || j > 2100) throw new Error("Bitte ein gültiges Jahr angeben."); Z.bearbeite.bescheid = { id: alt.id, datum: w.datum, jahr: j, art: w.art, beleg: w.beleg, bemessungsgrundlage_zve: w.bemessungsgrundlage_zve ? num(w.bemessungsgrundlage_zve) : undefined }; zeige(); });
    }
    if (el.dataset.i !== undefined && Z.vorschlag) {
      const e = Z.vorschlag[Number(el.dataset.i)];
      versuch(() => { if (el.dataset.f === "ok") e.ok = el.checked; else if (el.dataset.f === "ust_satz") e.ust_satz = num(el.value); else e[el.dataset.f] = el.value; if (el.dataset.f === "art" && (e.art === "durchlaufend" || e.art === "privat")) e.ust_satz = 0; zeige(); });
    }
  });
  document.addEventListener("submit", (ev) => {
    ev.preventDefault(); const f = ev.target, w = werte(f), d = Z.daten;
    versuch(() => {
      if (f.id === "e-form") {
        if (!w.datum) throw new Error("Bitte das Datum des Geldeingangs angeben.");
        const brutto = num(w.brutto, true); if (brutto <= 0) throw new Error("Brutto muss größer als 0 sein.");
        let id = K.eingangId(w.datum, K.C(brutto), w.kunde, w.verwendungszweck), n = 1; while (d.eingaenge.some((e) => e.id === id)) id = id.replace(/(-\d)?$/, "") + "-" + ++n;
        d.eingaenge.push({ id, datum: w.datum, kunde: w.kunde, verwendungszweck: w.verwendungszweck, brutto, ust_satz: num(w.ust_satz), art: w.art, vertrag_id: w.vertrag_id, quelle: "manuell" });
        Z.stichtag = Z.jahr = null; meld("Eingang erfasst.");
      } else if (f.id === "v-form") {
        if (!w.kunde || !w.beginn || !w.ende) throw new Error("Kunde, Beginn und Ende sind Pflicht.");
        if (w.ende < w.beginn) throw new Error("Das Ende liegt vor dem Beginn.");
        const mengen = {}; if (w.mengen) for (const teil of w.mengen.split(/,(?=\s*\d{4}-)/)) { const m = teil.trim().match(/^(\d{4}-\d{2})\s*:\s*(.+)$/); if (!m) throw new Error("Monatsmengen bitte als JJJJ-MM: Zahl angeben."); mengen[m[1]] = num(m[2]); }
        const alt = Z.bearbeite.vertrag || {};
        const v = { id: alt.id || naechsteId(d.vertraege, "V-", 3), kunde: w.kunde, projekt: w.projekt, status: w.status, wahrscheinlichkeit_prozent: num(w.wahrscheinlichkeit_prozent), einheit: w.einheit, satz_netto: num(w.satz_netto, true), menge_pro_monat: num(w.menge_pro_monat, true),
          mengen, beginn: w.beginn, ende: w.ende, abrechnung: w.abrechnung, zahlungsziel_tage: Math.round(num(w.zahlungsziel_tage)), ust_satz_prozent: num(w.ust_satz_prozent), reisekosten: w.reisekosten, kuendigungsfrist: w.kuendigungsfrist,
          matching: w.matching ? w.matching.split(",").map((s) => s.trim()).filter(Boolean) : [], beleg: w.beleg };
        K.projektion(v);
        if (alt.id) d.vertraege[d.vertraege.findIndex((x) => x.id === alt.id)] = v; else d.vertraege.push(v);
        Z.bearbeite.vertrag = null; Z.zeigeVertrag = v.id; meld(`Vertrag ${v.id} gespeichert. Unten stehen die erwarteten Zuflüsse.`);
      } else if (f.id === "b-form") {
        if (!w.datum) throw new Error("Bitte das Bescheiddatum angeben.");
        const jahr = Math.round(num(w.jahr, true)), termine = [];
        for (let i = 0; i < 8 && w[`t${i}_faellig`] !== undefined; i++) {
          if (!w[`t${i}_faellig`]) continue;
          const t = { faellig: w[`t${i}_faellig`] };
          if (w.art === "gewst") t.gewst = num(w[`t${i}_gewst`] ?? w[`t${i}_est`] ?? ""); else { t.est = num(w[`t${i}_est`] ?? w[`t${i}_gewst`] ?? ""); t.soli = num(w[`t${i}_soli`] ?? ""); t.kist = num(w[`t${i}_kist`] ?? ""); }
          termine.push(t);
        }
        if (!termine.length) throw new Error("Mindestens ein Termin ist nötig.");
        const alt = Z.bearbeite.bescheid || {};
        const b = { id: alt.id || naechsteId(d.bescheide, `VZ-${jahr}-`, 2), datum: w.datum, jahr, art: w.art, beleg: w.beleg, termine };
        if (w.bemessungsgrundlage_zve) b.bemessungsgrundlage_zve = num(w.bemessungsgrundlage_zve);
        if (alt.id) d.bescheide[d.bescheide.findIndex((x) => x.id === alt.id)] = b; else d.bescheide.push(b);
        Z.bearbeite.bescheid = null; meld(`Bescheid ${b.id} gespeichert.`);
      } else if (f.id === "a-form") {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(w.monat)) throw new Error("Monat bitte als JJJJ-MM angeben.");
        d.ausgaben.push({ monat: w.monat, betrag_netto: num(w.betrag_netto, true), notiz: w.notiz }); meld("Ist-Ausgaben erfasst.");
      } else if (f.id === "p-form") {
        for (const j of jahre()) { if (w["w" + j] === "" && w["a" + j] === "" && w["q" + j] === "") delete d.pauschalen[j]; else d.pauschalen[j] = { weitere_einkuenfte: num(w["w" + j]), abzuege: num(w["a" + j]), quelle: w["q" + j] }; }
        meld("Pauschalen übernommen.");
      } else if (f.id === "k-form") {
        const e = d.einstellungen;
        e.veranlagung = w.veranlagung; e.einstufung = w.einstufung; e.gewerbesteuer.hebesatz_prozent = num(w.hebesatz, true);
        e.kirchensteuer = { pflichtig: w.kist, satz_prozent: Number(w.kist_satz) }; e.ust_satz_standard_prozent = num(w.ust); e.betriebsausgaben.monatspauschale = num(w.ba);
        e.szenarien = { leitszenario: w.leit, gewicht_zugesagt_prozent: num(w.zugesagt), runrate_monate: Math.max(1, Math.round(num(w.rr, true))) };
        e.ampel = { gruen_bis_prozent: num(w.gp, true), gruen_bis_euro: num(w.ge, true), gelb_bis_prozent: num(w.yp, true), gelb_bis_euro: num(w.ye, true) };
        e.annahmen = { bescheid_monate_nach_jahresende: Math.round(num(w.bm, true)), zahlungsfrist_monate: Math.round(num(w.zf)), ruecklage_bereits_gebildet: num(w.rl), liquiditaet_startbestand: num(w.sb) };
        meld("Einstellungen übernommen.");
      } else return;
      geaendert(); zeige();
    });
  });
  window.addEventListener("beforeunload", (ev) => { if (Z.dirty) { ev.preventDefault(); ev.returnValue = ""; } });
  zeige();
})();
