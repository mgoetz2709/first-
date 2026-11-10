"""Jahressteuer, Deckungslücke, Ampel, Doppeleffekt, Zinsen und Rücklage."""
from __future__ import annotations

import datetime as dt
from decimal import Decimal

from . import gewst as gewst_modul
from . import szenarien as sz
from . import tarif
from .daten import Daten, vz_summe, vz_termine
from .geld import D, NULL, abrunden_auf, cent, de, euro_ab
from .params import steuerparameter
from .rechenweg import Rechenweg
from .zufluss import monatsende, naechster_monat

AMPEL_TEXT = {"gruen": "Grün", "gelb": "Gelb", "rot": "Rot", "ueberzahlung": "Überzahlung"}
AMPEL_SYMBOL = {"gruen": "🟢", "gelb": "🟡", "rot": "🔴", "ueberzahlung": "🔵"}


def jahressteuer(gewinn, pauschale: dict, einst: dict, params: dict, rw: Rechenweg | None = None) -> dict:
    """ESt + Soli + KiSt (+ GewSt nach § 35) auf Basis des Gewinns und der Jahrespauschalen."""
    rw = rw if rw is not None else Rechenweg()
    gewinn = D(gewinn)
    weitere, abzuege = D(pauschale.get("weitere_einkuenfte")), D(pauschale.get("abzuege"))
    zve = euro_ab(max(gewinn + weitere - abzuege, NULL))
    rw.add("Zu versteuerndes Einkommen", f"Gewinn {de(gewinn)} + weitere Einkünfte {de(weitere)} − Abzüge {de(abzuege)}",
           f"{de(zve, 0)} €", f"data/pauschalen.yaml ({pauschale.get('quelle', 'ohne Quelle')})")
    veranlagung = einst["veranlagung"]
    est = tarif.einkommensteuer(zve, params, veranlagung, rw)
    gst, erm = NULL, NULL
    if einst["einstufung"] == "gewerblich":
        g = gewst_modul.gewerbesteuer(gewinn, einst["gewerbesteuer"]["hebesatz_prozent"], params, rw)
        positive = max(gewinn, NULL) + max(weitere, NULL)
        erm = gewst_modul.ermaessigung_35(est, g, gewinn, positive, params, rw)
        gst = g.gewerbesteuer
    est_netto = est - erm
    soli = tarif.solidaritaetszuschlag(est_netto, params, veranlagung, rw)
    kist = tarif.kirchensteuer(est_netto, einst, rw)
    est_gesamt = est_netto + soli + kist
    gesamt = est_gesamt + gst
    rw.add("Erwartete Jahressteuer", "ESt − § 35 + Soli + KiSt" + (" + GewSt" if gst else ""), f"{de(gesamt)} €")
    return {"zve": zve, "est": est, "ermaessigung_35": erm, "soli": soli, "kist": kist, "gewst": gst,
            "est_gesamt": est_gesamt, "gesamt": gesamt}


def ampel(luecke, steuer, schwellen: dict) -> str:
    """Grün nur, wenn Prozent- UND Eurogrenze eingehalten; Rot, sobald eine Gelb-Grenze reißt.
    Überzahlung jenseits der Grün-Grenzen wird gesondert gemeldet."""
    l, st = D(luecke), D(steuer)
    betrag = abs(l)
    if st > 0:
        quote = betrag / st * 100
    else:
        quote = NULL if betrag == 0 else Decimal("Infinity")
    gruen = quote < D(schwellen["gruen_bis_prozent"]) and betrag < D(schwellen["gruen_bis_euro"])
    if gruen:
        return "gruen"
    if l < 0:
        return "ueberzahlung"
    if quote <= D(schwellen["gelb_bis_prozent"]) and betrag <= D(schwellen["gelb_bis_euro"]):
        return "gelb"
    return "rot"


def _plus_monate(d: dt.date, n: int) -> dt.date:
    j, m = naechster_monat(d.year, d.month, n)
    return dt.date(j, m, min(d.day, monatsende(j, m).day))


def doppeleffekt(luecke, steuer_est, jahr: int, vz_folgejahr: list[tuple[dt.date, Decimal]],
                 folgejahr_fortgeschrieben: bool, einst: dict, params: dict) -> dict:
    """(a) Nachzahlung für das Jahr, (b) Anhebung der Vorauszahlungen des Folgejahres auf die
    neue Jahressteuer. Die Anhebung fällt auf die nach dem Bescheid verbleibenden Termine des
    Folgejahres; gibt es keine mehr, wird sie mit Frist nach § 37 Abs. 4 EStG fällig."""
    a = einst.get("annahmen", {})
    bescheid = dt.date(jahr + 1, 1, 15)
    bescheid = _plus_monate(bescheid, int(a.get("bescheid_monate_nach_jahresende", 9)) - 1)
    faellig = _plus_monate(bescheid, int(a.get("zahlungsfrist_monate", 1)))
    luecke = D(luecke)
    posten = []
    nachzahlung = max(luecke, NULL)
    if nachzahlung > 0:
        posten.append({"datum": faellig, "betrag": nachzahlung, "text": f"Nachzahlung {jahr} (Abschlusszahlung)"})
    vz_folge_summe = sum((b for _, b in vz_folgejahr), NULL)
    erhoehung = max(D(steuer_est) - vz_folge_summe, NULL) if luecke > 0 else NULL
    if erhoehung > 0:
        rest = [d for d, _ in vz_folgejahr if d > bescheid] or \
               [dt.date(jahr + 1, int(t[:2]), int(t[3:])) for t in params["est_vorauszahlungen"]["vz_termine"]
                if dt.date(jahr + 1, int(t[:2]), int(t[3:])) > bescheid]
        if rest:
            teil = cent(erhoehung / len(rest))
            for i, d in enumerate(rest):
                b = erhoehung - teil * (len(rest) - 1) if i == len(rest) - 1 else teil
                posten.append({"datum": d, "betrag": b, "text": f"Erhöhung Vorauszahlung {jahr + 1} (nachträglich)"})
        else:
            posten.append({"datum": _plus_monate(bescheid, int(params["est_vorauszahlungen"]["frist_erhoehungsbetrag_monate"])),
                           "betrag": erhoehung, "text": f"Erhöhung Vorauszahlungen {jahr + 1} (§ 37 Abs. 4 EStG)"})
    return {"bescheid_geschaetzt": bescheid, "nachzahlung": nachzahlung, "erhoehung_folgejahr": erhoehung,
            "gesamt": nachzahlung + erhoehung, "posten": sorted(posten, key=lambda p: p["datum"]),
            "folgejahr_fortgeschrieben": folgejahr_fortgeschrieben, "vz_folgejahr": vz_folge_summe}


def zinsen_233a(luecke, jahr: int, bescheid: dt.date, params: dict) -> dict:
    p = params["zinsen_233a"]
    beginn = _plus_monate(dt.date(jahr + 1, 1, 1), int(p["karenz_monate"]))
    basis = abrunden_auf(max(D(luecke), NULL), p["abrundung_betrag"])
    je_monat = cent(basis * D(p["satz_pro_monat"]))
    volle_monate = max(0, (bescheid.year - beginn.year) * 12 + bescheid.month - beginn.month
                       - (1 if bescheid.day < beginn.day else 0))
    return {"zinslauf_beginn": beginn, "bemessung": basis, "je_monat": je_monat,
            "monate_bis_bescheid": volle_monate, "betrag_bis_bescheid": je_monat * volle_monate,
            "satz_pro_monat": D(p["satz_pro_monat"])}


def ruecklage(luecken: dict[str, Decimal], jahr: int, ist_bis: tuple[int, int], einst: dict) -> list[dict]:
    """Monatliche Rücklage ab dem Monat nach dem Stichtag bis Dezember, je Szenario."""
    start = naechster_monat(*ist_bis)
    if start[0] > jahr:
        monate = [start]
    else:
        monate = [(jahr, m) for m in range(start[1] if start[0] == jahr else 1, 13)]
    schon = D(einst.get("annahmen", {}).get("ruecklage_bereits_gebildet", 0))
    zeilen = []
    kum = {s: NULL for s in luecken}
    for i, (j, m) in enumerate(monate):
        z = {"monat": f"{j}-{m:02d}"}
        for s, l in luecken.items():
            bedarf = max(D(l) - schon, NULL)
            rate = cent(bedarf / len(monate))
            betrag = bedarf - rate * (len(monate) - 1) if i == len(monate) - 1 else rate
            kum[s] += betrag
            z[s] = betrag
            z[f"{s}_kumuliert"] = kum[s]
        zeilen.append(z)
    return zeilen


def status(daten: Daten, einst: dict, jahr: int, ist_bis: tuple[int, int],
           bescheide_stand: dt.date | None = None, config_dir=None) -> dict:
    """Vollständiger Steuer-Check für ein Jahr zum Stichtag (Ist bis einschließlich Monat ist_bis)."""
    params = steuerparameter(jahr, config_dir)
    prognose = sz.berechne(daten, einst, jahr, ist_bis)
    pauschale = daten.pauschalen(jahr)
    b_est = daten.vz_bescheid(jahr, "est", bescheide_stand)
    b_gew = daten.vz_bescheid(jahr, "gewst", bescheide_stand) if einst["einstufung"] == "gewerblich" else None
    vz_est, vz_gew = vz_summe(b_est), vz_summe(b_gew)
    b_folge = daten.vz_bescheid(jahr + 1, "est", bescheide_stand)
    if b_folge:
        vz_folge, fortgeschrieben = vz_termine(b_folge), False
    else:
        vz_folge = [(dt.date(d.year + 1, d.month, d.day), b) for d, b in vz_termine(b_est)]
        fortgeschrieben = True

    warnungen = []
    if not b_est:
        warnungen.append(f"Kein ESt-Vorauszahlungsbescheid für {jahr} erfasst; festgesetzte VZ = 0.")
    if params.get("status") != "verifiziert":
        warnungen.append(f"Steuerparameter {jahr} sind als '{params.get('status')}' markiert (Stand {params['stand']}).")
    if pauschale.get("jahr_der_angabe") not in (jahr,):
        warnungen.append(f"Jahrespauschale für {jahr} fehlt; verwendet wird die Angabe für "
                         f"{pauschale.get('jahr_der_angabe') or 'kein Jahr (0 €)'}.")

    if not daten.eingaenge():
        warnungen.append("Keine Zahlungseingänge erfasst; das Ergebnis ist ohne Aussagekraft. Zuerst /bescheid, /vertrag und /monat ausführen.")

    ergebnis = {}
    for s in sz.SZENARIEN:
        p = prognose["szenarien"][s]
        rw = p["rechenweg"]
        st = jahressteuer(p["gewinn"], pauschale, einst, params, rw)
        vz = vz_est + vz_gew
        luecke = st["gesamt"] - vz
        rw.add("Festgesetzte Vorauszahlungen", f"ESt/Soli/KiSt {de(vz_est)}" + (f" + GewSt {de(vz_gew)}" if b_gew else ""),
               f"− {de(vz)} €", f"data/bescheide.yaml ({b_est['id'] if b_est else 'kein Bescheid'}"
               + (f", Beleg {b_est.get('beleg')}" if b_est and b_est.get('beleg') else "") + ")")
        rw.add("Deckungslücke", "Jahressteuer − festgesetzte Vorauszahlungen", f"{de(luecke)} €")
        farbe = ampel(luecke, st["gesamt"], einst["ampel"])
        quote = (abs(luecke) / st["gesamt"] * 100) if st["gesamt"] > 0 else NULL
        dop = doppeleffekt(st["est_gesamt"] - vz_est, st["est_gesamt"], jahr, vz_folge, fortgeschrieben, einst, params)
        zins = zinsen_233a(luecke, jahr, dop["bescheid_geschaetzt"], params)
        ergebnis[s] = {"titel": sz.TITEL[s], "gewinn": p["gewinn"], "einnahmen_ist": p["einnahmen_ist"],
                       "prognose": p["prognose"], "ausgaben": p["ausgaben"], "steuer": st, "vz": vz,
                       "luecke": luecke, "luecke_prozent": quote, "ampel": farbe, "doppeleffekt": dop,
                       "zinsen": zins, "rechenweg": rw}
    leit = einst.get("szenarien", {}).get("leitszenario", "basis")
    return {"jahr": jahr, "ist_bis": ist_bis, "szenarien": ergebnis, "leitszenario": leit,
            "monate": prognose["monate"], "zukunft": prognose["zukunft"],
            "runrate_monatswert": prognose["runrate_monatswert"], "pauschale": pauschale,
            "bescheid_est": b_est, "bescheid_gewst": b_gew, "vz_est": vz_est, "vz_gewst": vz_gew,
            "bemessungsgrundlage_fa": (b_est or {}).get("bemessungsgrundlage_zve"),
            "ruecklage": ruecklage({s: e["luecke"] for s, e in ergebnis.items()}, jahr, ist_bis, einst),
            "params": params, "warnungen": warnungen, "einstellungen": einst}


def empfehlung(st: dict) -> list[str]:
    """Drei Sätze, abgeleitet aus dem Leitszenario."""
    leit = st["szenarien"][st["leitszenario"]]
    name, farbe, l = leit["titel"], leit["ampel"], leit["luecke"]
    ampeln = {s: e["ampel"] for s, e in st["szenarien"].items()}
    rate = st["ruecklage"][0][st["leitszenario"]] if st["ruecklage"] else NULL
    dop = leit["doppeleffekt"]
    if farbe == "rot":
        s1 = (f"Im Leitszenario {name} fehlen {de(l)} € ({de(leit['luecke_prozent'], 1)} % der Jahressteuer): "
              f"Anpassung der Vorauszahlungen beim Finanzamt beantragen, Entwurf liegt unter reports/.")
    elif farbe == "gelb":
        s1 = (f"Im Leitszenario {name} fehlen {de(l)} € ({de(leit['luecke_prozent'], 1)} % der Jahressteuer): "
              f"kein Antrag nötig, aber Rücklage bilden.")
    elif farbe == "ueberzahlung":
        s1 = (f"Im Leitszenario {name} sind die Vorauszahlungen um {de(-l)} € zu hoch: "
              f"Herabsetzungsantrag prüfen, um Liquidität freizusetzen.")
    else:
        s1 = f"Im Leitszenario {name} decken die Vorauszahlungen die erwartete Jahressteuer (Abweichung {de(l)} €): kein Handlungsbedarf."
    if l > 0:
        s2 = (f"Monatliche Rücklage ab {st['ruecklage'][0]['monat']}: {de(rate)} €; mit der Anhebung der Vorauszahlungen "
              f"{st['jahr'] + 1} summiert sich der Liquiditätsbedarf auf {de(dop['gesamt'])} € "
              f"(erste Fälligkeit ca. {dop['posten'][0]['datum']:%m/%Y}).")
    else:
        s2 = "Eine zusätzliche Steuerrücklage ist im Leitszenario nicht erforderlich."
    andere = ", ".join(f"{st['szenarien'][s]['titel']} {AMPEL_TEXT[a]}" for s, a in ampeln.items() if s != st["leitszenario"])
    s3 = f"Zum Vergleich: {andere}."
    return [s1, s2, s3]
