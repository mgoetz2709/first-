/* ESt-Vorauszahlungs-Monitor: Rechenkern (JavaScript).
 * Deterministisch, ohne Abhängigkeiten. Geldbeträge intern als ganze Cent, der ESt-Tarif mit BigInt (exakt).
 * Gegengeprüft gegen den Python-Kern (src/estmon) und den BMF-Steuerrechner, siehe tests/test_app_kern.py. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Kern = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- Steuerparameter (Quelle und Stand je Wert) ---------- */
  const P2026 = {
    jahr: 2026, stand: "2026-11-10", status: "verifiziert",
    // § 32a Abs. 1 EStG ("ab dem Veranlagungszeitraum 2026"), gesetze-im-internet.de/estg/__32a.html, abgerufen 10.11.2026.
    // Beträge a, c, abzug in Cent (a·100, c·100), satz in Prozent. zvE und Steuer werden auf volle Euro abgerundet.
    zonen: [
      { bis: 12348, typ: null },                                             // Nr. 1 Grundfreibetrag
      { bis: 17799, typ: "q", a100: 91451, b: 1400, c100: 0, basis: 12348 }, // Nr. 2: (914,51·y + 1 400)·y
      { bis: 69878, typ: "q", a100: 17310, b: 2397, c100: 103487, basis: 17799 }, // Nr. 3: (173,10·z + 2 397)·z + 1 034,87
      { bis: 277825, typ: "l", satz: 42, abzug100: 1113563 },                // Nr. 4: 0,42·x − 11 135,63
      { bis: null, typ: "l", satz: 45, abzug100: 1947038 },                  // Nr. 5: 0,45·x − 19 470,38
    ],
    // §§ 3 Abs. 3, 4 SolzG 1995, gesetze-im-internet.de/solzg_1995/__3.html und __4.html, abgerufen 10.11.2026.
    soli: { satzPromille: 55, milderungPromille: 119, freigrenzeEinzel: 20350, freigrenzeZusammen: 40700 },
    // § 11 Abs. 1, 2 GewStG (Freibetrag 24 500 €, Messzahl 3,5 %, Abrundung auf 100 €); § 35 Abs. 1 EStG (Faktor 4);
    // § 19 Abs. 1 GewStG (Termine). gesetze-im-internet.de/gewstg/__11.html, __19.html, estg/__35.html, abgerufen 10.11.2026.
    gewst: { messzahlPromille: 35, freibetrag: 24500, abrundung: 100, faktor: 4, termine: ["02-15", "05-15", "08-15", "11-15"] },
    // § 37 Abs. 1, 3, 4 EStG, gesetze-im-internet.de/estg/__37.html, abgerufen 10.11.2026.
    vz: { termine: ["03-10", "06-10", "09-10", "12-10"], fristErhoehungMonate: 1 },
    // § 233a Abs. 2 AO (15 Monate Karenz), § 238 Abs. 1a AO (0,15 % je Monat), § 238 Abs. 2 AO (Abrundung auf 50 €).
    // gesetze-im-internet.de/ao_1977/__233a.html und __238.html, abgerufen 10.11.2026.
    zinsen: { satzZehntelPromille: 15, karenzMonate: 15, abrundung: 50 },
    quelle: "§ 32a EStG, §§ 3, 4 SolzG, § 11 GewStG, § 35 EStG, §§ 233a, 238 AO (gesetze-im-internet.de, Stand 10.11.2026)",
  };
  // 2027: § 32a gilt laut Gesetzestext vom 10.11.2026 "ab dem Veranlagungszeitraum 2026", also nach heutigem Stand
  // auch 2027. VORLÄUFIG: vor Nutzung für 2027 erneut prüfen (der BMF-Rechner bot 2027 am 10.11.2026 noch nicht an).
  const PARAMS = { 2026: P2026, 2027: Object.assign({}, P2026, { jahr: 2027, status: "vorlaeufig" }) };
  function params(jahr) {
    const p = PARAMS[jahr];
    if (!p) throw new Error("Keine Steuerparameter für " + jahr + " hinterlegt.");
    return p;
  }

  /* ---------- Geld und Datum ---------- */
  const C = (euro) => Math.round(Number(euro || 0) * 100);            // Euro (Zahl) -> Cent
  function divRund(z, n) {                                            // kaufmännisch, symmetrisch
    const neg = (z < 0) !== (n < 0); z = Math.abs(z); n = Math.abs(n);
    const q = Math.floor((2 * z + n) / (2 * n));
    return neg ? -q : q;
  }
  function de(cent, stellen) {
    stellen = stellen === undefined ? 2 : stellen;
    let v = stellen === 0 ? divRund(cent, 100) : cent;
    const neg = v < 0; v = Math.abs(v);
    let ganz = String(stellen === 0 ? v : Math.floor(v / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const s = stellen === 0 ? ganz : ganz + "," + String(v % 100).padStart(2, "0");
    return (neg && v !== 0 ? "-" : "") + s;
  }
  const eur = (c, st) => de(c, st) + " €";
  const zahl = (n, stellen) => Number(n).toLocaleString("de-DE", { minimumFractionDigits: stellen || 0, maximumFractionDigits: stellen || 0 });
  function parseDe(text) {
    let t = String(text).trim().replace(/[€\s ]/g, "");
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");   // 1.500 = eintausendfünfhundert
    const n = Number(t);
    if (t === "" || Number.isNaN(n)) throw new Error("Betrag nicht lesbar: " + text);
    return Math.round(n * 100);
  }
  const D = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number); return { y, m, d }; };
  const iso = (d) => `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  const deDatum = (i) => { const d = D(i); return `${String(d.d).padStart(2, "0")}.${String(d.m).padStart(2, "0")}.${d.y}`; };
  const tageImMonat = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monatsende = (y, m) => iso({ y, m, d: tageImMonat(y, m) });
  function plusTage(i, n) { const d = D(i); const t = new Date(Date.UTC(d.y, d.m - 1, d.d + n)); return iso({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }); }
  function tageZwischen(a, b) { const x = D(a), y = D(b); return Math.round((Date.UTC(y.y, y.m - 1, y.d) - Date.UTC(x.y, x.m - 1, x.d)) / 86400000); }
  const idx = (m) => m[0] * 12 + m[1] - 1;
  const vonIdx = (i) => [Math.floor(i / 12), (i % 12) + 1];
  const naechsterMonat = (m, n) => vonIdx(idx(m) + (n === undefined ? 1 : n));
  const mKey = (m) => `${m[0]}-${String(m[1]).padStart(2, "0")}`;
  const monatVon = (i) => { const d = D(i); return [d.y, d.m]; };
  function plusMonate(i, n) { const d = D(i); const [y, m] = naechsterMonat([d.y, d.m], n); return iso({ y, m, d: Math.min(d.d, tageImMonat(y, m)) }); }

  /* ---------- Tarif ---------- */
  function grundtarif(zveEuro, p) {
    const x = Math.max(Math.floor(zveEuro), 0);
    for (let nr = 0; nr < p.zonen.length; nr++) {
      const z = p.zonen[nr];
      if (z.bis !== null && x > z.bis) continue;
      if (!z.typ) return { est: 0, formel: `Zone ${nr + 1} (Grundfreibetrag bis ${zahl(z.bis)} €): 0` };
      if (z.typ === "q") {
        const v = BigInt(x - z.basis);
        const num = (BigInt(z.a100) * v + BigInt(z.b) * 1000000n) * v + BigInt(z.c100) * 100000000n;
        return { est: Number(num / 10000000000n),
          formel: `Zone ${nr + 1}: (${zahl(z.a100 / 100, 2)} · v + ${zahl(z.b)}) · v + ${zahl(z.c100 / 100, 2)} mit v = (${zahl(x)} − ${zahl(z.basis)}) / 10.000` };
      }
      const cent = BigInt(z.satz) * BigInt(x) - BigInt(z.abzug100);
      return { est: Number(cent / 100n), formel: `Zone ${nr + 1}: ${zahl(z.satz / 100, 2)} · ${zahl(x)} − ${zahl(z.abzug100 / 100, 2)}` };
    }
    throw new Error("Tarifzonen unvollständig");
  }
  /** Tarifliche ESt in vollen Euro. */
  function einkommensteuer(zveEuro, jahr, veranlagung, rw) {
    const p = params(jahr);
    const zve = Math.max(Math.floor(zveEuro), 0);
    const q = `§ 32a Abs. 1 EStG (Stand ${p.stand})`;
    if (veranlagung === "zusammen") {
      const h = grundtarif(Math.floor(zve / 2), p);
      if (rw) rw.push(["Einkommensteuer (Splitting)", `2 × Steuer auf ${zahl(Math.floor(zve / 2))} €; ${h.formel}`, zahl(h.est * 2) + " €", q + ", Abs. 5"]);
      return h.est * 2;
    }
    const g = grundtarif(zve, p);
    if (rw) rw.push(["Einkommensteuer (Grundtarif)", g.formel + ", abgerundet auf volle Euro", zahl(g.est) + " €", q]);
    return g.est;
  }
  /** Soli in Cent auf eine ESt in Cent. */
  function soli(estC, jahr, veranlagung, rw) {
    const s = params(jahr).soli;
    const grenze = (veranlagung === "zusammen" ? s.freigrenzeZusammen : s.freigrenzeEinzel) * 100;
    let r = 0, f = `ESt ${de(estC)} € ≤ Freigrenze ${de(grenze, 0)} €`;
    if (estC > grenze) {
      const voll = Math.floor(estC * s.satzPromille / 1000), mild = Math.floor((estC - grenze) * s.milderungPromille / 1000);
      r = Math.min(voll, mild);
      f = `min(5,5 % · ${de(estC)} = ${de(voll)}; 11,9 % · (${de(estC)} − ${de(grenze, 0)}) = ${de(mild)})`;
    }
    if (rw) rw.push(["Solidaritätszuschlag", f, eur(r), "§§ 3 Abs. 3, 4 SolzG 1995"]);
    return r;
  }
  function kist(estC, einst, rw) {
    const k = einst.kirchensteuer || {};
    if (!k.pflichtig) return 0;
    const r = Math.floor(estC * Number(k.satz_prozent) / 100);
    if (rw) rw.push(["Kirchensteuer", `${k.satz_prozent} % · ${de(estC)} (vereinfacht, ohne § 51a-Korrektur)`, eur(r), "Landes-KiStG; Einstellungen"]);
    return r;
  }
  function gewerbesteuer(gewinnC, hebesatz, jahr, rw) {
    const g = params(jahr).gewst;
    const schritt = g.abrundung * 100;
    const ertrag = Math.floor(Math.max(gewinnC, 0) / schritt) * schritt;
    const nachFb = Math.max(ertrag - g.freibetrag * 100, 0);
    const mess = Math.floor(nachFb * g.messzahlPromille / 1000);
    const gst = divRund(mess * Math.round(Number(hebesatz) * 100), 10000);
    if (rw) {
      rw.push(["Gewerbeertrag", `Gewinn abgerundet auf volle 100 € − Freibetrag ${zahl(g.freibetrag)} €`, eur(nachFb, 0), "§ 11 Abs. 1 GewStG"]);
      rw.push(["Steuermessbetrag", `3,5 % · ${de(nachFb, 0)}`, eur(mess), "§ 11 Abs. 2 GewStG"]);
      rw.push(["Gewerbesteuer", `Messbetrag · Hebesatz ${hebesatz} %`, eur(gst), "§ 16 GewStG; Einstellungen"]);
    }
    return { gewerbeertrag: nachFb, messbetrag: mess, gewerbesteuer: gst };
  }
  function ermaessigung35(estC, g, gewerblC, summePositivC, jahr, rw) {
    const a = g.messbetrag * params(jahr).gewst.faktor, b = g.gewerbesteuer;
    const gew = Math.max(gewerblC, 0), sum = Math.max(summePositivC, 0);
    const c = sum > 0 ? Math.floor(estC * gew / sum) : 0;
    const r = Math.max(Math.min(a, b, c, estC), 0);
    if (rw) rw.push(["Ermäßigung § 35 EStG", `min(4 × Messbetrag = ${de(a)}; GewSt = ${de(b)}; Höchstbetrag = ${de(c)})`, eur(r), "§ 35 Abs. 1 EStG"]);
    return r;
  }

  /* ---------- Zufluss ---------- */
  function ustTrennen(bruttoC, satzProzent) {
    const netto = divRund(bruttoC * 1000, 1000 + Math.round(Number(satzProzent || 0) * 10));
    return { netto, ust: bruttoC - netto };
  }
  function leistungJeMonat(v) {
    const b = D(v.beginn), e = D(v.ende), satz = C(v.satz_netto), std = Math.round(Number(v.menge_pro_monat || 0) * 100);
    const aus = [];
    for (let i = idx([b.y, b.m]); i <= idx([e.y, e.m]); i++) {
      const [y, m] = vonIdx(i), key = mKey([y, m]);
      if (v.mengen && v.mengen[key] !== undefined && v.mengen[key] !== "") {
        aus.push([y, m, divRund(satz * Math.round(Number(v.mengen[key]) * 100), 100)]);
      } else {
        const tage = tageImMonat(y, m);
        const von = (y === b.y && m === b.m) ? b.d : 1, bis = (y === e.y && m === e.m) ? e.d : tage;
        aus.push([y, m, divRund(satz * std * (bis - von + 1), 100 * tage)]);
      }
    }
    return aus;
  }
  function projektion(v) {
    const ziel = Number(v.zahlungsziel_tage || 0), rh = v.abrechnung || "monatlich", gruppen = new Map();
    for (const [y, m, betrag] of leistungJeMonat(v)) {
      let stichtag;
      if (rh === "monatlich") stichtag = monatsende(y, m);
      else if (rh === "quartalsweise") stichtag = monatsende(y, Math.floor((m - 1) / 3) * 3 + 3);
      else if (rh === "einmalig") stichtag = v.ende;
      else throw new Error(`Vertrag ${v.id}: Abrechnung '${rh}' unbekannt`);
      const rechnung = stichtag < v.ende ? stichtag : String(v.ende).slice(0, 10);
      if (!gruppen.has(rechnung)) gruppen.set(rechnung, []);
      gruppen.get(rechnung).push([y, m, betrag]);
    }
    return [...gruppen.keys()].sort().map((r) => {
      const t = gruppen.get(r), l = t[t.length - 1];
      return { vertrag_id: String(v.id), leistung: mKey([l[0], l[1]]), rechnung: r, zufluss: plusTage(r, ziel), netto: t.reduce((s, x) => s + x[2], 0) };
    });
  }

  /* ---------- Szenarien ---------- */
  const SZENARIEN = ["konservativ", "basis", "runrate"];
  const TITEL = { konservativ: "Konservativ", basis: "Basis", runrate: "Run-Rate" };
  const GEWINNWIRKSAM = ["honorar", "sonstig"];
  const ARTEN = ["honorar", "reisekosten", "durchlaufend", "privat", "sonstig"];
  /** Gewicht in Hundertstel-Prozent (10000 = 100 %). */
  function gewicht(v, szenario, einst) {
    if (v.status === "unterschrieben") return 10000;
    if (szenario !== "basis") return 0;
    if (v.status === "zugesagt") return Math.round(Number(((einst.szenarien || {}).gewicht_zugesagt_prozent) ?? 100) * 100);
    return Math.round(Number(v.wahrscheinlichkeit_prozent || 0) * 100);
  }
  const gew = (betrag, g) => divRund(betrag * g, 10000);
  const nettoC = (e) => ustTrennen(C(e.brutto), e.ust_satz).netto;
  function eingaengeC(daten) {
    return (daten.eingaenge || []).map((e) => { const t = ustTrennen(C(e.brutto), e.ust_satz); return Object.assign({}, e, { nettoC: t.netto, ustC: t.ust, monat: monatVon(e.datum) }); });
  }
  function datenAb(daten, jahr) {
    const jahre = (daten.eingaenge || []).map((e) => D(e.datum).y).concat([jahr]);
    return `${Math.min(...jahre)}-01-01`;
  }
  function vertragsstand(daten, istBis, ab) {
    const eing = eingaengeC(daten).filter((e) => e.art === "honorar" && e.datum >= ab && idx(e.monat) <= idx(istBis));
    return (daten.vertraege || []).map((v) => {
      const fl = projektion(v).filter((f) => f.zufluss >= ab);
      const planBis = fl.filter((f) => idx(monatVon(f.zufluss)) <= idx(istBis)).reduce((s, f) => s + f.netto, 0);
      const ist = eing.filter((e) => String(e.vertrag_id || "") === String(v.id)).reduce((s, e) => s + e.nettoC, 0);
      const delta = planBis - ist, kuenftig = [];
      if (delta > 0) kuenftig.push([naechsterMonat(istBis), delta, "überfällig, vorgetragen"]);
      let vorab = delta < 0 ? -delta : 0;
      for (const f of fl) {
        const m = monatVon(f.zufluss);
        if (idx(m) <= idx(istBis)) continue;
        let b = f.netto;
        if (vorab > 0) { const ab2 = Math.min(vorab, b); b -= ab2; vorab -= ab2; }
        if (b > 0) kuenftig.push([m, b, `Leistung ${f.leistung}, Rechnung ${deDatum(f.rechnung)}`]);
      }
      return { vertrag: v, planBis, ist, abweichung: ist - planBis, kuenftig };
    });
  }
  function kuenftigeZufluesse(daten, einst, istBis, ab) {
    const aus = { konservativ: {}, basis: {} };
    for (const st of vertragsstand(daten, istBis, ab)) for (const s of Object.keys(aus)) {
      const g = gewicht(st.vertrag, s, einst);
      if (!g) continue;
      for (const [m, b] of st.kuenftig) aus[s][mKey(m)] = (aus[s][mKey(m)] || 0) + gew(b, g);
    }
    return aus;
  }
  function planOriginal(daten, einst, ab) {
    const aus = {};
    for (const v of daten.vertraege || []) {
      const g = gewicht(v, "basis", einst);
      if (!g) continue;
      for (const f of projektion(v)) if (f.zufluss >= ab) { const k = mKey(monatVon(f.zufluss)); aus[k] = (aus[k] || 0) + gew(f.netto, g); }
    }
    return aus;
  }
  function runrate(daten, einst, istBis) {
    const n = Number((einst.szenarien || {}).runrate_monate || 3);
    let monate = [];
    for (let i = n - 1; i >= 0; i--) monate.push(naechsterMonat(istBis, -i));
    const eing = eingaengeC(daten);
    if (eing.length) {
      const erster = Math.min(...eing.map((e) => idx(e.monat)));
      const gef = monate.filter((m) => idx(m) >= erster);
      monate = gef.length ? gef : monate.slice(-1);
    }
    const keys = monate.map(mKey);
    const summe = eing.filter((e) => GEWINNWIRKSAM.includes(e.art) && keys.includes(mKey(e.monat))).reduce((s, e) => s + e.nettoC, 0);
    return { rate: divRund(summe, monate.length), monate };
  }
  function ausgabenIst(daten) {
    const aus = {};
    for (const a of daten.ausgaben || []) aus[a.monat] = (aus[a.monat] || 0) + C(a.betrag_netto);
    return aus;
  }
  function ausgabenMonat(ist, einst, m) {
    const k = mKey(m);
    return k in ist ? [ist[k], "Ist"] : [C((einst.betriebsausgaben || {}).monatspauschale), "Pauschale"];
  }
  function prognose(daten, jahr, istBis) {
    const einst = daten.einstellungen, ab = datenAb(daten, jahr), ausgIst = ausgabenIst(daten);
    const zukunft = kuenftigeZufluesse(daten, einst, istBis, ab), rr = runrate(daten, einst, istBis), plan = planOriginal(daten, einst, ab);
    const eing = eingaengeC(daten).filter((e) => e.monat[0] === jahr && idx(e.monat) <= idx(istBis));
    const monate = [];
    for (let mo = 1; mo <= 12; mo++) {
      const m = [jahr, mo], k = mKey(m), ist = idx(m) <= idx(istBis);
      const [ausg, quelle] = ausgabenMonat(ausgIst, einst, m);
      const im = eing.filter((e) => e.monat[1] === mo);
      const sum = (f) => im.filter(f).reduce((s, e) => s + e.nettoC, 0);
      const reise = sum((e) => e.art === "reisekosten");
      monate.push({ monat: k, ist, einnahmenIst: sum((e) => GEWINNWIRKSAM.includes(e.art)), reisekosten: reise,
        reisekostenWirksam: quelle === "Ist" ? reise : 0, ust: im.reduce((s, e) => s + e.ustC, 0),
        nichtGewinnwirksam: sum((e) => e.art === "durchlaufend" || e.art === "privat"), plan: plan[k] || 0,
        prognose: { konservativ: ist ? 0 : (zukunft.konservativ[k] || 0), basis: ist ? 0 : (zukunft.basis[k] || 0), runrate: ist ? 0 : rr.rate },
        ausgaben: ausg, ausgabenQuelle: quelle });
    }
    const S = (f) => monate.reduce((s, m) => s + f(m), 0);
    const einnahmenIst = S((m) => m.einnahmenIst), reiseWirksam = S((m) => m.reisekostenWirksam);
    const reiseNeutral = S((m) => m.reisekosten) - reiseWirksam, ausgaben = S((m) => m.ausgaben);
    const nPauschal = monate.filter((m) => m.ausgabenQuelle === "Pauschale").length, nRest = monate.filter((m) => !m.ist).length;
    const szen = {};
    for (const s of SZENARIEN) {
      const prog = S((m) => m.prognose[s]), gewinn = einnahmenIst + reiseWirksam + prog - ausgaben, rw = [];
      rw.push(["Ist-Zuflüsse netto (Honorar, sonstige)", `Summe der Eingänge ${jahr} bis ${String(istBis[1]).padStart(2, "0")}/${istBis[0]}`, eur(einnahmenIst), "Eingänge (Zuflussdatum, § 11 EStG)"]);
      if (reiseWirksam || reiseNeutral) rw.push(["Erstattete Reisekosten", `${de(reiseWirksam)} € als Einnahme (Monate mit Ist-Ausgaben); ${de(reiseNeutral)} € neutral (Monate mit Pauschale)`, eur(reiseWirksam), "Eingänge, Art Reisekosten"]);
      if (s === "runrate") rw.push(["Prognose Restjahr", `Ø ${rr.monate.map((m) => String(m[1]).padStart(2, "0") + "/" + m[0]).join(", ")} = ${de(rr.rate)} € × ${nRest} Monate`, eur(prog), "Eingänge"]);
      else rw.push(["Prognose Restjahr", "Vertragszuflüsse nach Zahlungsziel, " + (s === "konservativ" ? "nur unterschriebene Verträge" : "unterschrieben + zugesagt + Pipeline × Wahrscheinlichkeit"), eur(prog), "Verträge"]);
      rw.push(["Betriebsausgaben", `${12 - nPauschal} Monate Ist + ${nPauschal} Monate Pauschale à ${de(C((einst.betriebsausgaben || {}).monatspauschale))} €`, "− " + eur(ausgaben), "Ausgaben; Einstellungen"]);
      rw.push(["Gewinn (EÜR) Gesamtjahr", "Ist + Prognose − Betriebsausgaben", eur(gewinn), "§ 4 Abs. 3 EStG"]);
      szen[s] = { einnahmenIst, reisekostenWirksam: reiseWirksam, prognose: prog, ausgaben, gewinn, rechenweg: rw };
    }
    return { monate, szenarien: szen, runrateMonatswert: rr.rate, zukunft };
  }

  /* ---------- Vorauszahlungen ---------- */
  function vzBescheid(daten, jahr, art, stand) {
    const p = (daten.bescheide || []).filter((b) => Number(b.jahr) === jahr && (b.art || "est") === art && (!stand || b.datum <= stand));
    if (!p.length) return null;
    return p.reduce((a, b) => ((b.datum > a.datum || (b.datum === a.datum && String(b.id) > String(a.id))) ? b : a));
  }
  const terminSumme = (t) => C(t.est) + C(t.soli) + C(t.kist) + C(t.gewst);
  const vzTermine = (b) => (b ? b.termine.map((t) => [t.faellig, terminSumme(t)]).sort((x, y) => (x[0] < y[0] ? -1 : 1)) : []);
  const vzSumme = (b) => vzTermine(b).reduce((s, t) => s + t[1], 0);
  function pauschale(daten, jahr) {
    const alle = daten.pauschalen || {}, js = Object.keys(alle).map(Number).filter((j) => j <= jahr);
    if (!js.length) return { weitere_einkuenfte: 0, abzuege: 0, quelle: "keine Angabe", jahrDerAngabe: null };
    const j = Math.max(...js);
    return Object.assign({}, alle[j], { jahrDerAngabe: j });
  }

  /* ---------- Jahressteuer, Lücke, Ampel ---------- */
  function jahressteuer(gewinnC, pau, einst, jahr, rw) {
    const weitere = C(pau.weitere_einkuenfte), abz = C(pau.abzuege);
    const zve = Math.floor(Math.max(gewinnC + weitere - abz, 0) / 100);
    if (rw) rw.push(["Zu versteuerndes Einkommen", `Gewinn ${de(gewinnC)} + weitere Einkünfte ${de(weitere)} − Abzüge ${de(abz)}`, zahl(zve) + " €", `Jahrespauschale (${pau.quelle || "ohne Quelle"})`]);
    const est = einkommensteuer(zve, jahr, einst.veranlagung, rw) * 100;
    let gst = 0, erm = 0;
    if (einst.einstufung === "gewerblich") {
      const g = gewerbesteuer(gewinnC, (einst.gewerbesteuer || {}).hebesatz_prozent, jahr, rw);
      erm = ermaessigung35(est, g, gewinnC, Math.max(gewinnC, 0) + Math.max(weitere, 0), jahr, rw);
      gst = g.gewerbesteuer;
    }
    const estNetto = est - erm, so = soli(estNetto, jahr, einst.veranlagung, rw), ki = kist(estNetto, einst, rw);
    const estGesamt = estNetto + so + ki, gesamt = estGesamt + gst;
    if (rw) rw.push(["Erwartete Jahressteuer", (erm ? "ESt − § 35 + Soli" : "ESt + Soli") + (ki ? " + KiSt" : "") + (gst ? " + GewSt" : ""), eur(gesamt), ""]);
    return { zve, est, ermaessigung35: erm, soli: so, kist: ki, gewst: gst, estGesamt, gesamt };
  }
  function ampel(lueckeC, steuerC, a) {
    const betrag = Math.abs(lueckeC);
    const unterProzent = (p, strikt) => steuerC > 0 ? (strikt ? betrag * 100 < Number(p) * steuerC : betrag * 100 <= Number(p) * steuerC) : betrag === 0;
    if (unterProzent(a.gruen_bis_prozent, true) && betrag < C(a.gruen_bis_euro)) return "gruen";
    if (lueckeC < 0) return "ueberzahlung";
    if (unterProzent(a.gelb_bis_prozent, false) && betrag <= C(a.gelb_bis_euro)) return "gelb";
    return "rot";
  }
  function postenSteuerart(lueckeC, steuerC, vzFolge, standardTermine, jahr, bescheid, faellig, frist, kurz) {
    const posten = [], nach = Math.max(lueckeC, 0);
    if (nach > 0) posten.push({ datum: faellig, betrag: nach, text: `${kurz}Nachzahlung ${jahr} (Abschlusszahlung)` });
    const vzFolgeSumme = vzFolge.reduce((s, t) => s + t[1], 0);
    const erh = lueckeC > 0 ? Math.max(steuerC - vzFolgeSumme, 0) : 0;
    if (erh > 0) {
      let rest = vzFolge.map((t) => t[0]).filter((d) => d > bescheid);
      if (!rest.length) rest = standardTermine.map((t) => `${jahr + 1}-${t}`).filter((d) => d > bescheid);
      if (rest.length) {
        const teil = divRund(erh, rest.length);
        rest.forEach((d, i) => posten.push({ datum: d, betrag: i === rest.length - 1 ? erh - teil * (rest.length - 1) : teil, text: `${kurz}Erhöhung Vorauszahlung ${jahr + 1} (nachträglich)` }));
      } else posten.push({ datum: plusMonate(bescheid, frist), betrag: erh, text: `${kurz}Erhöhung Vorauszahlungen ${jahr + 1}` });
    }
    return { posten, nach, erh, vzFolgeSumme };
  }
  /** gewst = {luecke, steuer, vzFolge}: dieselbe Logik für die Gewerbesteuer (vereinfacht mit demselben Bescheidzeitpunkt). */
  function doppeleffekt(lueckeC, steuerEstC, jahr, vzFolge, fortgeschrieben, einst, gewst) {
    const a = einst.annahmen || {}, p = params(jahr);
    const bescheid = plusMonate(`${jahr + 1}-01-15`, Number(a.bescheid_monate_nach_jahresende ?? 9) - 1);
    const faellig = plusMonate(bescheid, Number(a.zahlungsfrist_monate ?? 1));
    const e = postenSteuerart(lueckeC, steuerEstC, vzFolge, p.vz.termine, jahr, bescheid, faellig, p.vz.fristErhoehungMonate, "");
    let posten = e.posten, nach = e.nach, erh = e.erh;
    if (gewst) {
      const g = postenSteuerart(gewst.luecke, gewst.steuer, gewst.vzFolge, p.gewst.termine, jahr, bescheid, faellig, p.vz.fristErhoehungMonate, "Gewerbesteuer: ");
      posten = posten.concat(g.posten); nach += g.nach; erh += g.erh;
    }
    posten.sort((x, y) => (x.datum < y.datum ? -1 : x.datum > y.datum ? 1 : x.text < y.text ? -1 : x.text > y.text ? 1 : 0));
    return { bescheidGeschaetzt: bescheid, nachzahlung: nach, erhoehungFolgejahr: erh, gesamt: nach + erh, posten, folgejahrFortgeschrieben: fortgeschrieben, vzFolgejahr: e.vzFolgeSumme };
  }
  function zinsen233a(lueckeC, jahr, bescheid) {
    const z = params(jahr).zinsen, beginn = plusMonate(`${jahr + 1}-01-01`, z.karenzMonate);
    const schritt = z.abrundung * 100, basis = Math.floor(Math.max(lueckeC, 0) / schritt) * schritt;
    const jeMonat = divRund(basis * z.satzZehntelPromille, 10000);
    const b = D(bescheid), s = D(beginn);
    const monate = Math.max(0, (b.y - s.y) * 12 + b.m - s.m - (b.d < s.d ? 1 : 0));
    return { zinslaufBeginn: beginn, bemessung: basis, jeMonat, monateBisBescheid: monate, betragBisBescheid: jeMonat * monate };
  }
  function ruecklage(luecken, jahr, istBis, einst) {
    const start = naechsterMonat(istBis);
    const monate = [];
    if (start[0] > jahr) monate.push(start);
    else for (let m = start[0] === jahr ? start[1] : 1; m <= 12; m++) monate.push([jahr, m]);
    const schon = C((einst.annahmen || {}).ruecklage_bereits_gebildet), kum = {};
    return monate.map((m, i) => {
      const z = { monat: mKey(m) };
      for (const s of Object.keys(luecken)) {
        const bedarf = Math.max(luecken[s] - schon, 0), rate = divRund(bedarf, monate.length);
        const betrag = i === monate.length - 1 ? bedarf - rate * (monate.length - 1) : rate;
        kum[s] = (kum[s] || 0) + betrag; z[s] = betrag; z[s + "Kumuliert"] = kum[s];
      }
      return z;
    });
  }
  /** Vollständiger Steuer-Check. istBis = [jahr, monat]: Eingänge bis einschließlich dieses Monats gelten als Ist. */
  function status(daten, jahr, istBis, bescheideStand) {
    const einst = daten.einstellungen, p = params(jahr), prog = prognose(daten, jahr, istBis), pau = pauschale(daten, jahr);
    const bEst = vzBescheid(daten, jahr, "est", bescheideStand);
    const bGew = einst.einstufung === "gewerblich" ? vzBescheid(daten, jahr, "gewst", bescheideStand) : null;
    const vzEst = vzSumme(bEst), vzGew = vzSumme(bGew);
    const bFolge = vzBescheid(daten, jahr + 1, "est", bescheideStand);
    const vzFolge = bFolge ? vzTermine(bFolge) : vzTermine(bEst).map((t) => [`${jahr + 1}${t[0].slice(4)}`, t[1]]);
    const warnungen = [];
    if (!bEst) warnungen.push(`Kein ESt-Vorauszahlungsbescheid für ${jahr} erfasst; festgesetzte Vorauszahlungen = 0.`);
    if (p.status !== "verifiziert") warnungen.push(`Steuerparameter ${jahr} sind vorläufig (Stand ${deDatum(p.stand)}): Tarif vor Nutzung erneut prüfen.`);
    if (pau.jahrDerAngabe !== jahr) warnungen.push(`Jahrespauschale für ${jahr} fehlt; verwendet wird ${pau.jahrDerAngabe ? "die Angabe für " + pau.jahrDerAngabe : "0 €"}.`);
    if (!(daten.eingaenge || []).length) warnungen.push("Keine Zahlungseingänge erfasst; das Ergebnis ist ohne Aussagekraft.");
    const erg = {};
    for (const s of SZENARIEN) {
      const x = prog.szenarien[s], rw = x.rechenweg, st = jahressteuer(x.gewinn, pau, einst, jahr, rw), vz = vzEst + vzGew, l = st.gesamt - vz;
      rw.push(["Festgesetzte Vorauszahlungen", `ESt und Soli ${de(vzEst)}` + (bGew ? ` + GewSt ${de(vzGew)}` : ""), "− " + eur(vz), bEst ? `Bescheid ${bEst.id} vom ${deDatum(bEst.datum)}${bEst.beleg ? ", Beleg " + bEst.beleg : ""}` : "kein Bescheid"]);
      rw.push(["Deckungslücke", "Jahressteuer − festgesetzte Vorauszahlungen", eur(l), ""]);
      let gw = null;
      if (einst.einstufung === "gewerblich") {
        const bGewFolge = vzBescheid(daten, jahr + 1, "gewst", bescheideStand);
        gw = { luecke: st.gewst - vzGew, steuer: st.gewst, vzFolge: bGewFolge ? vzTermine(bGewFolge) : vzTermine(bGew).map((t) => [`${jahr + 1}${t[0].slice(4)}`, t[1]]) };
      }
      const dop = doppeleffekt(st.estGesamt - vzEst, st.estGesamt, jahr, vzFolge, !bFolge, einst, gw);
      erg[s] = { titel: TITEL[s], gewinn: x.gewinn, einnahmenIst: x.einnahmenIst, prognose: x.prognose, ausgaben: x.ausgaben, steuer: st, vz,
        luecke: l, lueckeProzent: st.gesamt > 0 ? Math.abs(l) / st.gesamt * 100 : 0, ampel: ampel(l, st.gesamt, einst.ampel),
        doppeleffekt: dop, zinsen: zinsen233a(l, jahr, dop.bescheidGeschaetzt), rechenweg: rw };
    }
    const luecken = {}; SZENARIEN.forEach((s) => (luecken[s] = erg[s].luecke));
    return { jahr, istBis, szenarien: erg, leitszenario: (einst.szenarien || {}).leitszenario || "basis", monate: prog.monate, zukunft: prog.zukunft,
      runrateMonatswert: prog.runrateMonatswert, pauschale: pau, bescheidEst: bEst, bescheidGewst: bGew, vzEst, vzGewst: vzGew,
      ruecklage: ruecklage(luecken, jahr, istBis, einst), params: p, warnungen };
  }
  const AMPEL_TEXT = { gruen: "Grün", gelb: "Gelb", rot: "Rot", ueberzahlung: "Überzahlung" };
  function empfehlung(st) {
    const l = st.szenarien[st.leitszenario], n = l.titel, pz = zahl(l.lueckeProzent, 1);
    let s1;
    if (l.ampel === "rot") s1 = `Im Leitszenario ${n} fehlen ${de(l.luecke)} € (${pz} % der Jahressteuer): Anpassung der Vorauszahlungen beim Finanzamt beantragen, der Entwurf steht unten.`;
    else if (l.ampel === "gelb") s1 = `Im Leitszenario ${n} fehlen ${de(l.luecke)} € (${pz} % der Jahressteuer): kein Antrag nötig, aber Rücklage bilden.`;
    else if (l.ampel === "ueberzahlung") s1 = `Im Leitszenario ${n} sind die Vorauszahlungen um ${de(-l.luecke)} € zu hoch: Herabsetzungsantrag prüfen, um Liquidität freizusetzen.`;
    else s1 = `Im Leitszenario ${n} decken die Vorauszahlungen die erwartete Jahressteuer (Abweichung ${de(l.luecke)} €): kein Handlungsbedarf.`;
    const d = l.doppeleffekt;
    let s2 = "Eine zusätzliche Steuerrücklage ist im Leitszenario nicht erforderlich.";
    if (l.luecke > 0 && st.ruecklage.length) {
      s2 = `Monatliche Rücklage ab ${st.ruecklage[0].monat}: ${de(st.ruecklage[0][st.leitszenario])} €`;
      if (d.posten.length) s2 += `; mit der Anhebung der Vorauszahlungen ${st.jahr + 1} summiert sich der Liquiditätsbedarf auf ${de(d.gesamt)} € (erste Fälligkeit ca. ${d.posten[0].datum.slice(5, 7)}/${d.posten[0].datum.slice(0, 4)})`;
      s2 += ".";
    }
    const s3 = "Zum Vergleich: " + SZENARIEN.filter((s) => s !== st.leitszenario).map((s) => `${st.szenarien[s].titel} ${AMPEL_TEXT[st.szenarien[s].ampel]}`).join(", ") + ".";
    return [s1, s2, s3];
  }
  function lueckenverlauf(daten, st) {
    const letzter = st.istBis[0] > st.jahr ? 12 : (st.istBis[0] < st.jahr ? 0 : st.istBis[1]), aus = [];
    for (let m = 1; m <= letzter; m++) {
      const t = status(daten, st.jahr, [st.jahr, m], monatsende(st.jahr, m)), z = { monat: mKey([st.jahr, m]) };
      SZENARIEN.forEach((s) => (z[s] = t.szenarien[s].luecke));
      aus.push(z);
    }
    return aus;
  }

  /* ---------- Liquidität ---------- */
  function vzFortgeschrieben(daten, art, jahre) {
    const aus = {}, geschaetzt = []; let letzter = null;
    for (const j of jahre) {
      const b = vzBescheid(daten, j, art);
      let t = [];
      if (b) { t = vzTermine(b); letzter = b; }
      else if (letzter) { t = vzTermine(letzter).map((x) => [`${j}${x[0].slice(4)}`, x[1]]); geschaetzt.push(j); }
      for (const [d, betrag] of t) { const k = d.slice(0, 7); aus[k] = (aus[k] || 0) + betrag; }
    }
    return { jeMonat: aus, geschaetzt };
  }
  function liquiditaet(daten, st, anzahl) {
    anzahl = anzahl || 18;
    const einst = daten.einstellungen, leit = st.leitszenario, start = naechsterMonat(st.istBis);
    const reihe = []; for (let i = 0; i < anzahl; i++) reihe.push(naechsterMonat(start, i));
    const jahre = [...new Set(reihe.map((m) => m[0]).concat([st.jahr]))].sort();
    const alle = [jahre[0] - 1].concat(jahre);
    const est = vzFortgeschrieben(daten, "est", alle);
    const gw = einst.einstufung === "gewerblich" ? vzFortgeschrieben(daten, "gewst", alle).jeMonat : {};
    const ausgIst = ausgabenIst(daten), zuk = kuenftigeZufluesse(daten, einst, st.istBis, datenAb(daten, st.jahr));
    const sonder = {};
    for (const p of st.szenarien[leit].doppeleffekt.posten) (sonder[p.datum.slice(0, 7)] = sonder[p.datum.slice(0, 7)] || []).push(p);
    let stand = C((einst.annahmen || {}).liquiditaet_startbestand);
    const zeilen = reihe.map((m) => {
      const k = mKey(m), ein = leit === "runrate" ? st.runrateMonatswert : (zuk[leit][k] || 0);
      const ausg = ausgabenMonat(ausgIst, einst, m)[0], vz = (est.jeMonat[k] || 0) + (gw[k] || 0);
      const extra = (sonder[k] || []).reduce((s, p) => s + p.betrag, 0), saldo = ein - ausg - vz - extra;
      stand += saldo;
      return { monat: k, einnahmen: ein, ausgaben: ausg, vz, steuerSonder: extra, sonderText: (sonder[k] || []).map((p) => p.text).join("; "), saldo, kumuliert: stand };
    });
    const endeK = mKey(reihe[reihe.length - 1]);
    return { zeilen, szenario: leit, vzGeschaetztJahre: est.geschaetzt.filter((j) => jahre.includes(j)),
      danach: st.szenarien[leit].doppeleffekt.posten.filter((p) => p.datum.slice(0, 7) > endeK),
      minimum: zeilen.reduce((a, b) => (b.kumuliert < a.kumuliert ? b : a)) };
  }

  /* ---------- Bankimport ---------- */
  function csvZeilen(text, trenn) {
    const zeilen = []; let feld = "", zeile = [], inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { feld += '"'; i++; } else inQ = false; } else feld += ch; }
      else if (ch === '"') inQ = true;
      else if (ch === trenn) { zeile.push(feld); feld = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; zeile.push(feld); feld = ""; if (zeile.length > 1 || zeile[0] !== "") zeilen.push(zeile); zeile = []; }
      else feld += ch;
    }
    if (feld !== "" || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
    return zeilen;
  }
  const BANKPROFIL = {
    trennzeichen: ";",
    spalten: { datum: ["Buchungstag", "Buchungsdatum", "Datum"], name: ["Beguenstigter/Zahlungspflichtiger", "Begünstigter/Zahlungspflichtiger", "Name Zahlungsbeteiligter", "Name"],
      zweck: ["Verwendungszweck"], betrag: ["Betrag", "Umsatz"] },
    erkennung: { durchlaufend: ["durchlaufend", "weiterleitung", "im namen und für rechnung", "verauslagt für"],
      privat: ["finanzamt", "erstattung est", "einlage", "privat", "umbuchung", "übertrag"],
      reisekosten: ["reisekosten", "spesen", "auslagen", "travel", "expenses"] },
  };
  function datumLesen(t) {
    const m = String(t).trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
    if (m) return iso({ y: m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), m: Number(m[2]), d: Number(m[1]) });
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(t).trim())) return String(t).trim();
    throw new Error("Datum nicht lesbar: " + t);
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); }
  const eingangId = (datum, bruttoC, name, zweck) => `E-${datum.replace(/-/g, "")}-${hash([datum, bruttoC, name, zweck].join("|"))}`;
  /** Liest einen Bankexport (Text) und liefert Vorschläge für alle Zahlungseingänge (Betrag > 0). Speichert nichts. */
  function bankVorschlag(text, daten, monat) {
    const zeilen = csvZeilen(text.replace(/^﻿/, ""), BANKPROFIL.trennzeichen);
    if (!zeilen.length) throw new Error("Die Datei ist leer.");
    const kopf = zeilen[0].map((k) => k.trim());
    const sp = {};
    for (const [feld, namen] of Object.entries(BANKPROFIL.spalten)) {
      sp[feld] = kopf.findIndex((k) => namen.some((n) => n.toLowerCase() === k.toLowerCase()));
      if (sp[feld] < 0) throw new Error(`Spalte für ${feld} fehlt (erwartet: ${namen.join(" oder ")}). Vorhanden: ${kopf.join(", ")}`);
    }
    const std = Number(daten.einstellungen.ust_satz_standard_prozent ?? 19), vorhanden = new Set((daten.eingaenge || []).map((e) => e.id)), aus = [];
    for (const z of zeilen.slice(1)) {
      if (z.length <= Math.max(sp.datum, sp.betrag)) continue;
      const betrag = parseDe(z[sp.betrag]);
      if (betrag <= 0) continue;
      const datum = datumLesen(z[sp.datum]);
      if (monat && datum.slice(0, 7) !== monat) continue;
      const name = (z[sp.name] || "").trim(), zweck = (z[sp.zweck] || "").split(/\s+/).join(" ").trim(), txt = (zweck + " " + name).toLowerCase();
      let art = "honorar", grund = "";
      for (const a of ["durchlaufend", "privat", "reisekosten"]) { const w = BANKPROFIL.erkennung[a].find((x) => txt.includes(x)); if (w) { art = a; grund = w; break; } }
      const treffer = (daten.vertraege || []).filter((v) => (v.matching && v.matching.length ? v.matching : [v.kunde || ""]).some((s) => s && txt.includes(String(s).toLowerCase())));
      const vertrag = treffer.length === 1 ? String(treffer[0].id) : "";
      const satz = (art === "durchlaufend" || art === "privat") ? 0 : Number(vertrag ? (treffer[0].ust_satz_prozent ?? std) : std);
      const hinweise = [];
      if (grund) hinweise.push(`Art wegen Stichwort „${grund}“ vorgeschlagen`);
      if (!vertrag && art === "honorar") hinweise.push("kein Vertrag eindeutig zugeordnet");
      const id = eingangId(datum, betrag, name, zweck);
      if (vorhanden.has(id)) hinweise.push("bereits erfasst, wird übersprungen");
      aus.push({ id, datum, kunde: name, verwendungszweck: zweck, brutto: betrag / 100, ust_satz: satz, art, vertrag_id: vertrag, quelle: "", hinweise, doppelt: vorhanden.has(id) });
    }
    return aus;
  }

  /* ---------- Vertragserkennung (Mustererkennung auf dem gelesenen Text, ohne KI) ---------- */
  const MONATSNAMEN = { januar: 1, februar: 2, "märz": 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };
  const ZAHL_RE = "(\\d{1,3}(?:[.\\u202f ]\\d{3})+(?:,\\d{1,2})?|\\d+(?:,\\d{1,2})?)";
  function alleBetraege(text) {
    const re = new RegExp(`(?:(?:€|EUR|Euro)\\s*${ZAHL_RE}|${ZAHL_RE}\\s*(?:,-+)?\\s*(?:€|EUR\\b|Euro\\b))`, "gi"), aus = [];
    let m;
    while ((m = re.exec(text))) { const roh = (m[1] || m[2]).replace(/[  ]/g, ""); aus.push({ index: m.index, ende: m.index + m[0].length, wert: parseDe(roh) / 100 }); }
    return aus;
  }
  function alleDaten(text) {
    const re = /(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4}|\d{2})(?!\d)|(\d{1,2})\.\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})/gi, aus = [];
    let m;
    while ((m = re.exec(text))) {
      const d = m[1] ? Number(m[1]) : Number(m[4]), mo = m[1] ? Number(m[2]) : MONATSNAMEN[m[5].toLowerCase()];
      let y = Number(m[1] ? m[3] : m[6]); if (y < 100) y += 2000;
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= tageImMonat(y, mo)) aus.push({ index: m.index, ende: m.index + m[0].length, iso: iso({ y, m: mo, d }) });
    }
    return aus;
  }
  function zeileUm(text, index) {
    let a = text.lastIndexOf("\n", index - 1) + 1, e = text.indexOf("\n", index); if (e < 0) e = text.length;
    let z = text.slice(a, e).trim();
    if (z.length < 25) { const e2 = text.indexOf("\n", e + 1); z = (z + " " + text.slice(e + 1, e2 < 0 ? text.length : e2)).trim(); }
    return z.length > 170 ? z.slice(0, 167) + "…" : z;
  }
  function naechsterBetrag(text, betraege, kwRe) {
    let best = null, m; const re = new RegExp(kwRe.source, "gi");
    while ((m = re.exec(text))) for (const b of betraege) {
      const dist = b.index >= m.index ? b.index - (m.index + m[0].length) : m.index - b.ende;
      if (dist > 110 || b.wert < 20) continue;
      const zwischen = b.index >= m.index ? text.slice(m.index, b.index) : text.slice(b.ende, m.index);
      if (/\n\s*\n/.test(zwischen)) continue;                         // nicht über Absätze hinweg
      if (!best || dist < best.dist) best = { dist, wert: b.wert, index: Math.min(b.index, m.index) };
    }
    return best;
  }
  /** Liest Honorarparameter aus Vertragstext. Liefert Vorschläge mit Fundstelle; nichts wird geraten:
   *  Was nicht eindeutig erkannt wird, bleibt leer und steht unter "fehlend" oder "hinweise". */
  function vertragErkennen(roh, ustStandard) {
    const text = String(roh).replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\r/g, "");
    const f = {}, fund = {}, hinweise = [];
    const setze = (feld, wert, index) => { f[feld] = wert; fund[feld] = zeileUm(text, index); };
    const betraege = alleBetraege(text), daten = alleDaten(text);

    // Satz und Einheit
    const tag = naechsterBetrag(text, betraege, /Tagess[aä]tz(?:e|es)?|Tageshonorar|Tagespauschale|(?:Berater|Personen|Mann|Projekt|Arbeits|Leistungs|Einsatz)tag\b|(?:je|pro)\s+Tag\b|\/\s*Tag\b|per\s+day|daily\s+rate|day\s+rate/);
    const std = naechsterBetrag(text, betraege, /Stundens[aä]tz(?:e|es)?|Stundenhonorar|(?:je|pro)\s+(?:Arbeits|Berater)?stunde\b|\/\s*(?:Stunde|Std\.?)|per\s+hour|hourly\s+rate/);
    const satz = tag && std ? (tag.dist <= std.dist ? ["tag", tag] : ["stunde", std]) : tag ? ["tag", tag] : std ? ["stunde", std] : null;
    if (satz) { setze("satz_netto", satz[1].wert, satz[1].index); f.einheit = satz[0]; if (tag && std) hinweise.push("Tages- und Stundensatz gefunden; übernommen wurde der " + (satz[0] === "tag" ? "Tagessatz" : "Stundensatz") + "."); }
    if (satz && /brutto|inkl(?:\.|usive)\s+(?:der\s+)?(?:gesetzlichen\s+)?(?:USt|Umsatzsteuer|MwSt|Mehrwertsteuer)/i.test(fund.satz_netto)) hinweise.push("Der Satz ist im Vertrag möglicherweise brutto angegeben. Bitte den Nettobetrag eintragen.");

    // Laufzeit
    const dWert = (i) => Date.UTC(D(i).y, D(i).m - 1, D(i).d);
    let paar = null;
    for (let i = 0; i + 1 < daten.length; i++) {
      const a = daten[i], b = daten[i + 1];
      if (!/^\s*(?:bis(?:\s+zum|\s+einschließlich|\s+einschl\.)?|[-–—]|und\s+endet(?:\s+am)?|to|until|through)\s*$/i.test(text.slice(a.ende, b.index)) || dWert(b.iso) <= dWert(a.iso)) continue;
      const davor = text.slice(Math.max(0, a.index - 70), a.index), punkte = /Laufzeit|Zeitraum|Vertragsdauer|Dauer|beginn|Leistungszeit|Einsatz|Projekt|term\b|period/i.test(davor) ? 2 : /vom|ab|von/i.test(davor) ? 1 : 0;
      if (!paar || punkte > paar.punkte) paar = { a, b, punkte };
    }
    if (paar) { setze("beginn", paar.a.iso, paar.a.index); setze("ende", paar.b.iso, paar.b.index); }
    else {
      for (const d of daten) {
        const davor = text.slice(Math.max(0, d.index - 45), d.index);
        if (!f.beginn && /(?:beginnt|Beginn|Vertragsbeginn|Start|startet|ab(?:\s+dem)?|commenc\w+|starting)\W{0,12}(?:am|zum|on)?\s*$/i.test(davor)) setze("beginn", d.iso, d.index);
        else if (!f.ende && /(?:endet|Ende|Vertragsende|befristet\s+bis|läuft\s+bis|bis(?:\s+zum)?|until|ends?)\W{0,12}(?:am|zum|on)?\s*$/i.test(davor)) setze("ende", d.iso, d.index);
      }
      if (f.beginn && f.ende && f.ende <= f.beginn) { delete f.ende; delete fund.ende; }
    }

    // Menge je Monat
    const nz = (t) => Number(String(t).replace(",", "."));
    const mRe = /(\d+(?:,\d+)?)(?:\s*(?:bis|[-–—])\s*(\d+(?:,\d+)?))?\s*(?:Berater|Personen|Mann|Projekt|Arbeits|Leistungs|Einsatz)?(tage?n?|stunden|PT|MT|days|hours|Std\.?)\s*(?:je|pro|im|per|\/|a)\s*(Kalendermonat|Monat|Woche|Kalenderwoche|month|week)/i;
    const mRe2 = /(?:monatlich|pro\s+Monat|je\s+Monat|im\s+Monat)\s*(?:ca\.|circa|etwa|durchschnittlich|bis\s+zu|maximal)?\s*(\d+(?:,\d+)?)(?:\s*(?:bis|[-–—])\s*(\d+(?:,\d+)?))?\s*(?:Berater|Personen|Mann|Projekt|Arbeits|Leistungs|Einsatz)?(tage?n?|stunden|PT|MT)/i;
    let mm = mRe.exec(text), woche = false;
    if (mm) woche = /woche|week/i.test(mm[4]); else mm = mRe2.exec(text);
    if (mm) {
      const stunden = /stunden|hours|Std/i.test(mm[3]);
      if (mm[2]) { fund.menge_pro_monat = zeileUm(text, mm.index); hinweise.push(`Umfang als Spanne angegeben (${mm[1]} bis ${mm[2]}). Bitte die Menge je Monat selbst festlegen.`); }
      else if (woche) { setze("menge_pro_monat", Math.round(nz(mm[1]) * 52 / 12 * 10) / 10, mm.index); hinweise.push(`Umfang je Woche angegeben (${mm[1]}); auf den Monat umgerechnet (× 52 / 12). Bitte prüfen.`); }
      else setze("menge_pro_monat", nz(mm[1]), mm.index);
      if (f.einheit && stunden !== (f.einheit === "stunde")) hinweise.push("Der Umfang ist in " + (stunden ? "Stunden" : "Tagen") + " angegeben, der Satz je " + (f.einheit === "stunde" ? "Stunde" : "Tag") + ". Bitte Menge und Einheit abgleichen.");
    } else {
      const g = /(?:insgesamt|Gesamtumfang|Gesamtvolumen|Kontingent|Volumen|Umfang|maximal|bis\s+zu|höchstens)[^\n\d]{0,40}(\d+(?:,\d+)?)\s*(?:Berater|Personen|Mann|Projekt|Arbeits|Leistungs|Einsatz)?(tage?n?|PT|MT|stunden)/i.exec(text);
      if (g && f.beginn && f.ende) {
        const monate = Math.max(1, Math.round((tageZwischen(f.beginn, f.ende) + 1) / 30.4375 * 10) / 10);
        setze("menge_pro_monat", Math.round(nz(g[1]) / monate * 100) / 100, g.index);
        hinweise.push(`Gesamtumfang ${g[1]} gefunden und gleichmäßig auf ${String(monate).replace(".", ",")} Monate verteilt. Bitte prüfen.`);
      } else if (g) { fund.menge_pro_monat = zeileUm(text, g.index); hinweise.push(`Nur ein Gesamtumfang (${g[1]}) gefunden. Bitte die Menge je Monat selbst festlegen.`); }
    }

    // Zahlungsziel
    const zz = [/Zahlungsziel[^\n\d]{0,30}(\d{1,3})\s*(?:Kalender|Werk|Arbeits|Bank)?tage/i, /(\d{1,3})\s*(?:Kalender|Werk|Arbeits|Bank)?tagen?\s*(?:netto|rein\s+netto|nach\s+(?:Rechnungs\w*|Zugang|Erhalt|Eingang)|ab\s+Rechnungs?\w*)/i,
      /(?:zahlbar|fällig|zu\s+(?:zahlen|begleichen)|Zahlung(?:\s+erfolgt)?|payable|due)[^\n\d]{0,45}(\d{1,3})\s*(?:Kalender|Werk|Arbeits|Bank)?(?:tage|days)/i, /\bnet\s+(\d{1,3})\b/i];
    for (const re of zz) { const m = re.exec(text); if (m) { setze("zahlungsziel_tage", Number(m[1]), m.index); break; } }
    if (f.zahlungsziel_tage === undefined) { const m = /sofort\s+(?:fällig|zahlbar)|(?:zahlbar|fällig)\s+sofort|ohne\s+Abzug\s+sofort/i.exec(text); if (m) setze("zahlungsziel_tage", 0, m.index); }

    // Abrechnungsrhythmus
    for (const zeile of text.split("\n")) {
      if (!/Abrechnung|Rechnungsstellung|abgerechnet|Rechnung|in\s+Rechnung|fakturiert|invoic/i.test(zeile)) continue;
      const art = /quartalsweise|vierteljährlich|quarterly/i.test(zeile) ? "quartalsweise" : /monatlich|zum\s+Monatsende|jeden\s+Monat|monatsweise|monthly/i.test(zeile) ? "monatlich" : /nach\s+(?:Abschluss|Projektende|Abnahme|Beendigung)|einmalig|Schlussrechnung/i.test(zeile) ? "einmalig" : null;
      if (art) { f.abrechnung = art; fund.abrechnung = zeile.trim().slice(0, 170); break; }
    }

    // Kunde und Projekt
    const FORM = "(?:GmbH\\s*&\\s*Co\\.?\\s*KG(?:aA)?|gGmbH|GmbH|AG|SE|KGaA|KG|OHG|UG(?:\\s*\\(haftungsbeschränkt\\))?|mbH|e\\.\\s?K\\.|e\\.\\s?V\\.|Ltd\\.?|Inc\\.?|B\\.V\\.|S\\.A\\.)";
    const sauber = (t) => { t = t.replace(/^[\s"„“»:–-]+|[\s"“”«,;:–-]+$/g, "").replace(/\.$/, (p, i, g) => (/(?:Ltd|Inc|Co|K|V|A)\.$/.test(g) ? p : "")).replace(/^(?:der|die|dem|den|das|Firma)\s+/i, ""); const m = new RegExp(`^(.*?\\b${FORM})(?=$|[\\s,;(])`).exec(t); return (m ? m[1] : t).trim(); };
    const kMuster = [/zwischen\s+(?:(?:der|dem|den|die|Firma)\s+)*(.{3,90}?)\s*(?:\(|,\s|–|—|-\s|nachfolgend|im\s+Folgenden|\n|\bund\b)/i, /(?:Auftraggeber(?:in)?|Kunde|Kundin|Client|Customer)\s*[:\n]\s*(.{3,90})/i, /Angebot\s+(?:an|für)\s+(.{3,90}?)(?:,|\n|$)/im];
    for (const re of kMuster) { const m = re.exec(text); if (m && sauber(m[1]).length >= 3) { setze("kunde", sauber(m[1]), m.index); break; } }
    if (!f.kunde) { const m = new RegExp(`([A-ZÄÖÜ][\\wÄÖÜäöüß&.\\-]*(?: [\\wÄÖÜäöüß&.\\-]+){0,4} ${FORM})(?=$|[\\s,;(.])`, "m").exec(text); if (m) setze("kunde", m[1].trim(), m.index); }
    const pm = /(?:Vertragsgegenstand|Leistungsgegenstand|Gegenstand|Projektbezeichnung|Projektname|Projekt|Leistung|Betreff|Thema|Subject)\s*[:–-]\s*(.{3,120})/i.exec(text);
    if (pm) setze("projekt", pm[1].replace(/["„“”»«]/g, "").replace(/[\s.]+$/, "").trim(), pm.index);

    // Reisekosten, Kündigung, USt
    const satzMit = (re) => { const m = re.exec(text); if (!m) return null; return { text: zeileUm(text, m.index).replace(/^§\s*\d+\w?\s*/, ""), index: m.index }; };
    const rk = satzMit(/Reisekosten|Reisezeit|Spesen|Nebenkosten|travel\s+expenses/i); if (rk) setze("reisekosten", rk.text, rk.index);
    const kd = satzMit(/Kündigungsfrist|Frist\s+von[^\n]{0,60}(?:gekündigt|kündbar|Kündigung)|(?:gekündigt|kündbar)[^\n]{0,60}Frist|notice\s+period/i) || satzMit(/Kündigung|kündbar|gekündigt|terminat/i); if (kd) setze("kuendigungsfrist", kd.text, kd.index);
    const rc = /Reverse[- ]?Charge|Steuerschuldnerschaft\s+des\s+Leistungsempfängers|§\s*13b\s*UStG/i.exec(text);
    f.ust_satz_prozent = rc ? 0 : Number(ustStandard ?? 19);
    if (rc) { fund.ust_satz_prozent = zeileUm(text, rc.index); hinweise.push("Reverse-Charge erkannt: USt-Satz auf 0 % gesetzt."); }
    if (f.kunde) f.matching = [f.kunde.split(/\s+/)[0]];

    const NAMEN = { kunde: "Kunde", satz_netto: "Satz netto", menge_pro_monat: "Menge je Monat", beginn: "Beginn", ende: "Ende", abrechnung: "Abrechnung", zahlungsziel_tage: "Zahlungsziel" };
    return { felder: f, fundstellen: fund, hinweise, fehlend: Object.keys(NAMEN).filter((k) => f[k] === undefined || f[k] === "").map((k) => NAMEN[k]), zeichen: text.trim().length };
  }

  /* ---------- Antrag und Rücklage-CSV ---------- */
  function antrag(daten, st, heute) {
    const jahr = st.jahr, l = st.szenarien[st.leitszenario], t = l.steuer, estNeu = t.est - t.ermaessigung35;
    const stichtag = monatsende(st.istBis[0], st.istBis[1]), termine = (st.bescheidEst || {}).termine || [];
    const sum = (f) => termine.reduce((s, x) => s + C(x[f]), 0), ab = (c) => Math.floor(c / 100) * 100;
    const zeilen = [["est", "Einkommensteuer", estNeu], ["soli", "Solidaritätszuschlag", t.soli], ["kist", "Kirchensteuer", t.kist]]
      .filter(([f, , neu]) => neu !== 0 || sum(f) !== 0)
      .map(([f, n, neu]) => `| ${n} | ${de(sum(f))} € | ${de(ab(neu))} € | ${de(ab(neu) - sum(f))} € |`);
    const offen = termine.filter((x) => x.faellig > stichtag);
    const vertraege = (daten.vertraege || []).filter((v) => gewicht(v, st.leitszenario, daten.einstellungen) > 0)
      .map((v) => `- ${v.kunde}, ${v.projekt || ""}: ${de(C(v.satz_netto))} € je ${v.einheit === "stunde" ? "Stunde" : "Tag"}, ${zahl(v.menge_pro_monat)} je Monat, Laufzeit ${deDatum(v.beginn)} bis ${deDatum(v.ende)} (${v.status})`);
    const verteilung = offen.length
      ? `Ich bitte, den Erhöhungsbetrag auf die noch ausstehenden Vorauszahlungstermine ${jahr} (${offen.map((x) => deDatum(x.faellig)).join(", ")}) zu verteilen.`
      : `Die Vorauszahlungstermine ${jahr} sind abgelaufen. Ich bitte um nachträgliche Anpassung nach § 37 Abs. 3 Satz 3 EStG.`;
    const gesamt = ab(estNeu) + ab(t.soli) + ab(t.kist), bmg = (st.bescheidEst || {}).bemessungsgrundlage_zve;
    return `ENTWURF. Wird nicht automatisch versendet. Vor dem Versand prüfen, Platzhalter ersetzen.

[Vorname Name]
[Straße Hausnummer]
[PLZ Ort]

Finanzamt [Name des Finanzamts]
[Anschrift]

[Ort], ${deDatum(heute)}

Steuernummer: [STEUERNUMMER]

Antrag auf Anpassung der Vorauszahlungen zur Einkommensteuer ${jahr} (§ 37 Abs. 3 Satz 3 EStG)

Sehr geehrte Damen und Herren,

ich beantrage, die Vorauszahlungen für ${jahr} wie folgt neu festzusetzen:

| Steuerart | bisher festgesetzt ${jahr} | beantragt ${jahr} | Differenz |
|---|---:|---:|---:|
${zeilen.join("\n")}

${verteilung} Für ${jahr + 1} beantrage ich Vorauszahlungen in gleicher Jahreshöhe (${de(gesamt)} €, je Termin ${de(ab(Math.floor(gesamt / 4)))} €).

Begründung

Der Gewinn aus selbständiger Arbeit (Einnahmenüberschussrechnung nach § 4 Abs. 3 EStG) wird ${jahr} voraussichtlich ${de(ab(l.gewinn), 0)} € betragen. Die Prognose setzt sich zusammen aus:

- Betriebseinnahmen bis ${deDatum(stichtag)} (zugeflossen, netto): ${de(l.einnahmenIst)} €
- erwartete Betriebseinnahmen bis 31.12.${jahr} aus laufenden Aufträgen: ${de(l.prognose)} €
- Betriebsausgaben ${jahr}: ${de(l.ausgaben)} €

Grundlage der erwarteten Einnahmen:

${vertraege.join("\n") || "- [Auftragslage ergänzen]"}

Unter Berücksichtigung der übrigen Besteuerungsgrundlagen (weitere Einkünfte ${de(C(st.pauschale.weitere_einkuenfte))} €, Abzüge ${de(C(st.pauschale.abzuege))} €) ergibt sich ein zu versteuerndes Einkommen von voraussichtlich ${zahl(t.zve)} €${bmg ? ` (bisher zugrunde gelegt: ${zahl(bmg)} €)` : ""}. Darauf entfallen ${de(estNeu, 0)} € Einkommensteuer und ${de(t.soli)} € Solidaritätszuschlag.

Mit freundlichen Grüßen

[Unterschrift]
`;
  }
  function ruecklageCsv(st) {
    const k = st.leitszenario + "Kumuliert";
    return "﻿Monat;Rücklage Konservativ;Rücklage Basis;Rücklage Run-Rate;Kumuliert Leitszenario (" + st.szenarien[st.leitszenario].titel + ")\r\n" +
      st.ruecklage.map((r) => [r.monat, de(r.konservativ), de(r.basis), de(r.runrate), de(r[k])].join(";")).join("\r\n") + "\r\n";
  }

  /* ---------- Datendatei ---------- */
  function leereDaten() {
    return { format: "est-monitor", version: 1,
      einstellungen: { veranlagung: "einzel", kirchensteuer: { pflichtig: false, satz_prozent: 9 }, einstufung: "freiberuflich",
        gewerbesteuer: { hebesatz_prozent: 400 }, ust_satz_standard_prozent: 19, betriebsausgaben: { monatspauschale: 1500 },
        szenarien: { leitszenario: "basis", gewicht_zugesagt_prozent: 100, runrate_monate: 3 },
        ampel: { gruen_bis_prozent: 5, gruen_bis_euro: 2000, gelb_bis_prozent: 15, gelb_bis_euro: 10000 },
        annahmen: { bescheid_monate_nach_jahresende: 9, zahlungsfrist_monate: 1, ruecklage_bereits_gebildet: 0, liquiditaet_startbestand: 0 } },
      bescheide: [], vertraege: [], eingaenge: [], ausgaben: [], pauschalen: {} };
  }
  function pruefeDaten(d) {
    if (!d || d.format !== "est-monitor") throw new Error("Das ist keine Datendatei des ESt-Monitors.");
    const basis = leereDaten();
    for (const k of Object.keys(basis)) if (d[k] === undefined) d[k] = basis[k];
    for (const k of Object.keys(basis.einstellungen)) if (d.einstellungen[k] === undefined) d.einstellungen[k] = basis.einstellungen[k];
    return d;
  }
  function standardStichtag(daten, heute) {
    const e = (daten.eingaenge || []).map((x) => x.datum).sort();
    if (e.length) return monatVon(e[e.length - 1]);
    return naechsterMonat(monatVon(heute), -1);
  }

  return { PARAMS, params, C, de, eur, zahl, parseDe, deDatum, monatsende, plusTage, plusMonate, mKey, naechsterMonat, monatVon,
    einkommensteuer, soli, kist, gewerbesteuer, ermaessigung35, ustTrennen, leistungJeMonat, projektion, SZENARIEN, TITEL, ARTEN, AMPEL_TEXT,
    gewicht, vertragsstand, datenAb, prognose, vzBescheid, vzTermine, vzSumme, pauschale, jahressteuer, ampel, doppeleffekt, zinsen233a,
    ruecklage, status, empfehlung, lueckenverlauf, liquiditaet, bankVorschlag, eingangId, antrag, ruecklageCsv, leereDaten, pruefeDaten,
    standardStichtag, nettoC, csvZeilen, vertragErkennen };
});
