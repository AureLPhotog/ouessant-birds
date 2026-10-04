#!/usr/bin/env python3
"""Oiseaux d'Ouessant — vérification automatique des listes (lancée par GitHub à chaque modification).

Erreurs (bloquantes, GitHub envoie un e-mail) : JSON illisible, champ obligatoire manquant,
valeur inconnue (canal, type, carré), coordonnées hors de l'île, doublon.
Avertissements (signalés, non bloquants) : nom anglais manquant, point GPS hors de ses carrés.
"""
import json, math, re, sys, unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
CANAUX = {"Télégram", "Whatsapp", "Pas d'annonce"}
TYPES = {"espèce", "sous-espèce"}
CARRE = re.compile(r"^[A-S](?:[1-9]|1[0-3])$")
LAT, LON = (48.40, 48.50), (-5.20, -4.98)          # emprise large de l'île et de ses îlots
# Recalage carte <-> GPS (identique à js/carte.js)
GRID_X = [357,708,1055,1409,1761,2123,2477,2819,3183,3535,3881,4243,4587,4949,5301,5655,6009,6353,6715,7015]
GRID_Y = [357,717,1067,1413,1761,2113,2467,2829,3183,3531,3883,4245,4591,4944]
AFF = [[0.709161048, -0.002042154, 2964.964458201], [-0.000573242, -0.712172752, 3202.871361484]]
MLAT, MLON = 111132, 111320 * math.cos(math.radians(48.45))

erreurs, avertissements = [], []
def err(f, m): erreurs.append((f, m))
def warn(f, m): avertissements.append((f, m))
def norm(s): return " ".join(unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower().split())

def carre_du_point(lat, lon):
    E, N = (lon + 5.1) * MLON, (lat - 48.45) * MLAT
    x = AFF[0][0] * E + AFF[0][1] * N + AFF[0][2]; y = AFF[1][0] * E + AFF[1][1] * N + AFF[1][2]
    c = next((i for i in range(len(GRID_X) - 1) if GRID_X[i] <= x < GRID_X[i + 1]), None)
    r = next((i for i in range(len(GRID_Y) - 1) if GRID_Y[i] <= y < GRID_Y[i + 1]), None)
    return None if c is None or r is None else f"{chr(65 + c)}{r + 1}"

def charger(nom):
    chemin = RACINE / nom
    if not chemin.exists():
        err(nom, "fichier introuvable"); return None
    try:
        data = json.loads(chemin.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(nom, f"JSON illisible, ligne {e.lineno} colonne {e.colno} : {e.msg}"); return None
    if not isinstance(data, list) or not all(isinstance(x, dict) for x in data):
        err(nom, "le fichier doit contenir une liste [ … ] d'objets { … }"); return None
    return data

def verifier_oiseaux(nom="ouessant_birds.json"):
    data = charger(nom)
    if data is None: return
    vus_fr, vus_sci = {}, {}
    for i, o in enumerate(data, 1):
        ici = f"entrée {i} ({o.get('Nom Français', '?')})"
        for k in ("Nom Français", "Nom Scientifique", "Proposition de Canal de Diffusion Ouessant"):
            if not str(o.get(k, "")).strip(): err(nom, f"{ici} : « {k} » manquant")
        c = o.get("Proposition de Canal de Diffusion Ouessant")
        if c and c not in CANAUX: err(nom, f"{ici} : canal inconnu « {c} » (attendu : {', '.join(sorted(CANAUX))})")
        t = o.get("Type de taxon")
        if t not in (None, "") and t not in TYPES: err(nom, f"{ici} : type de taxon inconnu « {t} »")
        if not str(o.get("Nom Anglais", "")).strip(): warn(nom, f"{ici} : nom anglais manquant")
        for k, vus in (("Nom Français", vus_fr), ("Nom Scientifique", vus_sci)):
            v = norm(o.get(k, ""))
            if v and v in vus: err(nom, f"{ici} : « {o[k]} » en double (déjà à l'entrée {vus[v]})")
            elif v: vus[v] = i
    print(f"{nom} : {len(data)} entrées vérifiées")

def verifier_lieux(nom="lieux_ouessant.json"):
    data = charger(nom)
    if data is None: return
    vus = {}
    for i, o in enumerate(data, 1):
        ici = f"entrée {i} ({o.get('nom', '?')})"
        if not str(o.get("nom", "")).strip(): err(nom, f"{ici} : « nom » manquant")
        carres = o.get("carres")
        if not isinstance(carres, list) or not carres: err(nom, f"{ici} : « carres » doit être une liste non vide, ex. [\"B8\"]")
        else:
            for c in carres:
                if not CARRE.match(str(c)): err(nom, f"{ici} : carré inconnu « {c} » (de A1 à S13)")
        lat, lon = o.get("lat"), o.get("lon")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            err(nom, f"{ici} : « lat » et « lon » doivent être des nombres")
        elif not (LAT[0] <= lat <= LAT[1] and LON[0] <= lon <= LON[1]):
            err(nom, f"{ici} : coordonnées {lat}, {lon} hors d'Ouessant")
        else:
            p = o.get("precision_m", 550)
            # seuls les points placés ou vérifiés comptent : les autres sont recalculés au centre du carré par l'appli
            # (les phares, à précision ≤ 50 m, sont dessinés de façon schématique en mer : on ne les contrôle pas)
            if isinstance(carres, list) and isinstance(p, (int, float)) and p > 50 and (o.get("verifie") or p < 500):
                c = carre_du_point(lat, lon)
                if c not in carres: warn(nom, f"{ici} : le point GPS tombe en {c or 'dehors de la carte'}, hors de ses carrés {', '.join(map(str, carres))}")
        if "precision_m" in o and not (isinstance(o["precision_m"], (int, float)) and o["precision_m"] > 0):
            err(nom, f"{ici} : « precision_m » doit être un nombre positif")
        if "verifie" in o and not isinstance(o["verifie"], bool): err(nom, f"{ici} : « verifie » doit valoir true ou false")
        v = norm(o.get("nom", ""))
        if v and v in vus: err(nom, f"{ici} : « {o['nom']} » en double (déjà à l'entrée {vus[v]})")
        elif v: vus[v] = i
    print(f"{nom} : {len(data)} entrées vérifiées")

if __name__ == "__main__":
    verifier_oiseaux(); verifier_lieux()
    for f, m in avertissements: print(f"::warning file={f}::{m}")
    for f, m in erreurs: print(f"::error file={f}::{m}")
    print(f"\n{len(erreurs)} erreur(s), {len(avertissements)} avertissement(s)")
    sys.exit(1 if erreurs else 0)
