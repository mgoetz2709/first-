// Testbrücke: liest {daten, faelle:[{jahr, istBis}], zves:[...], jahr} von stdin und gibt die Ergebnisse des JS-Kerns als JSON aus.
const K = require("./kern.js");
let roh = "";
process.stdin.on("data", (c) => (roh += c)).on("end", () => {
  const ein = JSON.parse(roh), aus = { tarif: [], faelle: [] };
  for (const z of ein.zves || []) {
    const e = K.einkommensteuer(z, ein.jahr, "einzel"), s = K.einkommensteuer(z, ein.jahr, "zusammen");
    aus.tarif.push([z, e, K.soli(e * 100, ein.jahr, "einzel"), s, K.soli(s * 100, ein.jahr, "zusammen")]);
  }
  aus.vertraege = (ein.texte || []).map((t) => K.vertragErkennen(t, 19));
  for (const f of ein.faelle || []) {
    const st = K.status(ein.daten, f.jahr, f.istBis), liq = K.liquiditaet(ein.daten, st);
    const sz = {};
    for (const s of K.SZENARIEN) {
      const x = st.szenarien[s];
      sz[s] = { gewinn: x.gewinn, einnahmenIst: x.einnahmenIst, prognose: x.prognose, ausgaben: x.ausgaben, zve: x.steuer.zve, est: x.steuer.est,
        erm: x.steuer.ermaessigung35, soli: x.steuer.soli, kist: x.steuer.kist, gewst: x.steuer.gewst, gesamt: x.steuer.gesamt, vz: x.vz,
        luecke: x.luecke, ampel: x.ampel, dopGesamt: x.doppeleffekt.gesamt, posten: x.doppeleffekt.posten.map((p) => [p.datum, p.betrag]),
        zinsJeMonat: x.zinsen.jeMonat, zinsBeginn: x.zinsen.zinslaufBeginn };
    }
    aus.faelle.push({ szenarien: sz, monate: st.monate.map((m) => [m.monat, m.einnahmenIst, m.plan, m.prognose.konservativ, m.prognose.basis, m.prognose.runrate, m.ausgaben, m.ust, m.reisekosten, m.nichtGewinnwirksam]),
      ruecklage: st.ruecklage.map((r) => [r.monat, r.konservativ, r.basis, r.runrate]),
      liq: liq.zeilen.map((z) => [z.monat, z.einnahmen, z.ausgaben, z.vz, z.steuerSonder, z.kumuliert]), empfehlung: K.empfehlung(st) });
  }
  process.stdout.write(JSON.stringify(aus));
});
