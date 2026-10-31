# -*- coding: utf-8 -*-
"""Fabrique le classeur de pilotage a partir des CSV de ce dossier.

    pip install openpyxl
    python docs/pilotage/build-xlsx.py

Produit `pilotage-labs-food.xlsx`, a importer dans Google Sheets (Fichier →
Importer). Les CSV restent la source de verite : ce script ne fait que les
mettre en forme, il n'invente aucune donnee.

Ce qu'il ajoute et que le CSV ne sait pas porter :
 - huit onglets dans un seul fichier ;
 - les listes deroulantes du Backlog, tirees de l'onglet Referentiels ;
 - la couleur des statuts, du badge MVP, et des deadlines depassees ;
 - l'onglet Tableau de bord, entierement calcule depuis le Backlog.
"""
import csv, datetime, io, os, re, sys

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "pilotage-labs-food.xlsx")

# ── Palette : celle de la marque, assourdie pour un tableau ───────────────────
NAVY = "00234B"
CREME = "F7F1E8"
CREME_PROFOND = "EDE3D1"
ENCRE = "3A4A5A"
VERT, VERT_PALE = "1F6F4F", "DCF1E7"
AMBRE, AMBRE_PALE = "8A6212", "FBEDD0"
BLEU, BLEU_PALE = "2A548C", "DEE8F5"
ROUGE, ROUGE_PALE = "9E2B2B", "F8DEDE"
TERRE, TERRE_PALE = "B8542F", "F4D4C2"
GRIS = "7B8794"

FILET = Side(style="thin", color="D8CDBA")
BORDURE = Border(bottom=FILET)

# ── Les onglets, dans l'ordre ────────────────────────────────────────────────
ONGLETS = [
    ("00-lisez-moi.csv", "Lisez-moi"),
    ("01-backlog.csv", "Backlog"),
    ("02-modules.csv", "Modules"),
    ("03-bugs-blocages.csv", "Bugs"),
    ("04-commentaires.csv", "Commentaires"),
    ("05-equipe.csv", "Equipe"),
    ("06-referentiels.csv", "Referentiels"),
]

LARGEURS = {
    "Lisez-moi": [26, 118],
    "Backlog": [10, 13, 26, 20, 46, 16, 30, 7, 9, 12, 12, 12, 10, 11, 16, 60, 12],
    "Modules": [13, 30, 7, 14, 12, 15, 34, 15, 44],
    "Bugs": [9, 44, 11, 9, 12, 12, 12, 70, 60, 34, 12],
    "Commentaires": [12, 12, 16, 110],
    "Equipe": [14, 20, 54, 60],
    "Referentiels": [15, 17, 12, 10, 7, 11, 24, 10, 12],
}

# Les colonnes du Backlog qui recoivent une liste deroulante, et la colonne de
# l'onglet Referentiels ou lire les valeurs.
LISTES = {
    "Espace": "A",
    "Type": "B",
    "Statut": "C",
    "Priorite": "D",
    "MVP": "E",
    "Sprint": "F",
    "Action": "G",
}

ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def lire(nom):
    with io.open(os.path.join(ICI, nom), encoding="utf-8-sig", newline="") as f:
        return list(csv.reader(f, delimiter=";"))


def pose(ws, lignes, nom):
    """Ecrit les lignes, met l'en-tete en forme, fige et filtre."""
    for i, ligne in enumerate(lignes, start=1):
        for j, valeur in enumerate(ligne, start=1):
            c = ws.cell(row=i, column=j)
            if i > 1 and ISO.match(valeur or ""):
                c.value = datetime.date(*(int(x) for x in valeur.split("-")))
                c.number_format = "DD/MM/YYYY"
            else:
                c.value = valeur
            if i == 1:
                c.font = Font(bold=True, color="FFFFFF", size=9)
                c.fill = PatternFill("solid", fgColor=NAVY)
                c.alignment = Alignment(vertical="center", wrap_text=True)
            else:
                c.font = Font(size=9, color=ENCRE)
                c.alignment = Alignment(vertical="top", wrap_text=True)
                c.border = BORDURE

    ws.row_dimensions[1].height = 28
    for j, l in enumerate(LARGEURS.get(nom, []), start=1):
        ws.column_dimensions[get_column_letter(j)].width = l
    ws.freeze_panes = "B2"
    if len(lignes) > 1:
        ws.auto_filter.ref = "A1:%s%d" % (
            get_column_letter(len(lignes[0])), len(lignes),
        )


def teinte(ws, plage, valeur, texte, fond, gras=True):
    ws.conditional_formatting.add(
        plage,
        CellIsRule(
            operator="equal",
            formula=['"%s"' % valeur],
            font=Font(color=texte, bold=gras, size=9),
            fill=PatternFill("solid", fgColor=fond),
        ),
    )


STATUTS = [
    ("Terminé" if False else "Terminé", VERT, VERT_PALE),
    ("À tester", BLEU, BLEU_PALE),
    ("En cours", AMBRE, AMBRE_PALE),
    ("À faire", GRIS, CREME_PROFOND),
    ("Bloqué", ROUGE, ROUGE_PALE),
]


def main():
    wb = Workbook()
    wb.remove(wb.active)

    feuilles = {}
    for fichier, nom in ONGLETS:
        lignes = lire(fichier)
        ws = wb.create_sheet(nom)
        pose(ws, lignes, nom)
        feuilles[nom] = (ws, lignes)

    # ── Backlog : couleurs et listes deroulantes ─────────────────────────────
    bk, lignes = feuilles["Backlog"]
    n = len(lignes)
    entete = lignes[0]
    col = {h: get_column_letter(i + 1) for i, h in enumerate(entete)}

    for valeur, texte, fond in STATUTS:
        teinte(bk, "%s2:%s%d" % (col["Statut"], col["Statut"], n), valeur, texte, fond)

    teinte(bk, "%s2:%s%d" % (col["MVP"], col["MVP"], n), "Oui", TERRE, TERRE_PALE)
    teinte(bk, "%s2:%s%d" % (col["MVP"], col["MVP"], n), "Non", GRIS, CREME, gras=False)
    teinte(bk, "%s2:%s%d" % (col["Priorité"], col["Priorité"], n), "P1", ROUGE, ROUGE_PALE)

    # Une deadline passee sur une ligne qui n'est pas terminee : en rouge.
    bk.conditional_formatting.add(
        "%s2:%s%d" % (col["Deadline"], col["Deadline"], n),
        FormulaRule(
            formula=[
                'AND(%s2<>"",%s2<TODAY(),%s2<>"Terminé")'
                % (col["Deadline"], col["Deadline"], col["Statut"])
            ],
            font=Font(color=ROUGE, bold=True, size=9),
            fill=PatternFill("solid", fgColor=ROUGE_PALE),
        ),
    )
    # Une ligne bloquee porte toujours un code : si la case est vide, on le voit.
    bk.conditional_formatting.add(
        "%s2:%s%d" % (col["Bug / blocage"], col["Bug / blocage"], n),
        FormulaRule(
            formula=['AND(%s2="Bloqué",%s2="")' % (col["Statut"], col["Bug / blocage"])],
            fill=PatternFill("solid", fgColor=AMBRE_PALE),
        ),
    )

    _, ref = feuilles["Referentiels"]
    for titre, lettre in LISTES.items():
        cible = col.get(titre) or col.get(titre.replace("Priorite", "Priorité"))
        if not cible:
            continue
        hauteur = max(
            (i for i, r in enumerate(ref[1:], start=2)
             if r[ord(lettre) - 65].strip()),
            default=2,
        )
        dv = DataValidation(
            type="list",
            formula1="Referentiels!$%s$2:$%s$%d" % (lettre, lettre, hauteur),
            allow_blank=True,
            showErrorMessage=True,
            errorTitle="Valeur hors liste",
            error="Choisissez une valeur de l'onglet Referentiels, "
                  "ou ajoutez-la d'abord dans cet onglet.",
        )
        bk.add_data_validation(dv)
        dv.add("%s2:%s%d" % (cible, cible, n))

    # ── Bugs : memes couleurs de statut ──────────────────────────────────────
    bg, lignes_bg = feuilles["Bugs"]
    cbg = {h: get_column_letter(i + 1) for i, h in enumerate(lignes_bg[0])}
    for valeur, texte, fond in STATUTS:
        teinte(
            bg, "%s2:%s%d" % (cbg["Statut"], cbg["Statut"], len(lignes_bg)),
            valeur, texte, fond,
        )
    teinte(
        bg, "%s2:%s%d" % (cbg["Gravité"], cbg["Gravité"], len(lignes_bg)),
        "P1", ROUGE, ROUGE_PALE,
    )

    # ── Modules : les deux colonnes d'avancement ─────────────────────────────
    md, lignes_md = feuilles["Modules"]
    cmd = {h: get_column_letter(i + 1) for i, h in enumerate(lignes_md[0])}
    for titre in ("Design", "Intégration API"):
        for valeur, texte, fond in STATUTS:
            teinte(
                md, "%s2:%s%d" % (cmd[titre], cmd[titre], len(lignes_md)),
                valeur, texte, fond,
            )
    teinte(md, "%s2:%s%d" % (cmd["MVP"], cmd["MVP"], len(lignes_md)), "Oui", TERRE, TERRE_PALE)

    # ── Tableau de bord ─────────────────────────────────────────────────────
    tb = wb.create_sheet("Tableau de bord")
    construis_tableau_de_bord(tb, col, n)

    wb.move_sheet("Tableau de bord", offset=-len(wb.sheetnames) + 1)
    wb.save(SORTIE)
    print("écrit : %s" % SORTIE)
    print("%d tâches, %d onglets" % (n - 1, len(wb.sheetnames)))


def construis_tableau_de_bord(tb, col, n):
    """Tout est calcule : rien ne se saisit ici."""
    S, H, K, B, D, M, P = (
        col["Statut"], col["MVP"], col["Assigné"], col["Espace"],
        col["Deadline"], col["Module"], col["Priorité"],
    )
    fin = n
    ESPACES = ["Public", "Client", "Batch cooker", "Admin", "Transverse"]
    GENS = ["Amir", "Daniel", "Duval", "Ivy", "Emmanuel"]
    LIBELLES = [s[0] for s in STATUTS]

    def titre(ligne, texte):
        c = tb.cell(row=ligne, column=1, value=texte)
        c.font = Font(bold=True, size=11, color=NAVY)

    def etiquette(ligne, colonne, texte, gras=False):
        c = tb.cell(row=ligne, column=colonne, value=texte)
        c.font = Font(bold=gras, size=9, color=ENCRE if not gras else NAVY)
        return c

    def nombre(ligne, colonne, formule):
        c = tb.cell(row=ligne, column=colonne, value=formule)
        c.font = Font(size=9, color=ENCRE)
        c.alignment = Alignment(horizontal="center")
        return c

    tb.cell(row=1, column=1, value="Pilotage Lab's Food — tout est calculé depuis l'onglet Backlog").font = Font(
        bold=True, size=13, color=NAVY
    )
    tb.cell(row=2, column=1, value="Ne rien saisir ici. Les cases se recalculent à chaque modification du Backlog.").font = Font(
        size=9, italic=True, color=GRIS
    )

    # Bloc 1 — l'etat general
    titre(4, "Où en est-on")
    etiquette(5, 1, "Statut", gras=True)
    etiquette(5, 2, "Tout", gras=True)
    etiquette(5, 3, "MVP seul", gras=True)
    for i, s in enumerate(LIBELLES):
        etiquette(6 + i, 1, s)
        nombre(6 + i, 2, '=COUNTIF(Backlog!${0}$2:${0}${1},A{2})'.format(S, fin, 6 + i))
        nombre(6 + i, 3,
               '=COUNTIFS(Backlog!${0}$2:${0}${1},"Oui",Backlog!${2}$2:${2}${1},A{3})'
               .format(H, fin, S, 6 + i))
    etiquette(11, 1, "Total", gras=True)
    nombre(11, 2, '=COUNTA(Backlog!$A$2:$A${0})'.format(fin))
    nombre(11, 3, '=COUNTIF(Backlog!${0}$2:${0}${1},"Oui")'.format(H, fin))

    etiquette(13, 1, "Reste à faire sur le MVP", gras=True)
    nombre(13, 2,
           '=COUNTIFS(Backlog!${0}$2:${0}${1},"Oui",Backlog!${2}$2:${2}${1},"<>Terminé")'
           .format(H, fin, S))
    etiquette(14, 1, "Deadlines dépassées", gras=True)
    nombre(14, 2,
           '=SUMPRODUCT((Backlog!${0}$2:${0}${1}<>"")*(Backlog!${0}$2:${0}${1}<TODAY())'
           '*(Backlog!${2}$2:${2}${1}<>"Terminé"))'.format(D, fin, S))
    etiquette(15, 1, "Bloqué, toutes priorités", gras=True)
    nombre(15, 2, '=COUNTIF(Backlog!${0}$2:${0}${1},"Bloqué")'.format(S, fin))
    etiquette(16, 1, "Bloqué en P1 sur le MVP", gras=True)
    nombre(16, 2,
           '=COUNTIFS(Backlog!${0}$2:${0}${1},"Bloqué",Backlog!${2}$2:${2}${1},"P1",'
           'Backlog!${3}$2:${3}${1},"Oui")'.format(S, fin, P, H))

    # Bloc 2 — par espace
    titre(18, "Par espace")
    etiquette(19, 1, "Espace", gras=True)
    for j, s in enumerate(LIBELLES):
        etiquette(19, 2 + j, s, gras=True)
    etiquette(19, 2 + len(LIBELLES), "Total", gras=True)
    for i, e in enumerate(ESPACES):
        etiquette(20 + i, 1, e)
        for j, s in enumerate(LIBELLES):
            nombre(20 + i, 2 + j,
                   '=COUNTIFS(Backlog!${0}$2:${0}${1},$A{2},Backlog!${3}$2:${3}${1},{4}$19)'
                   .format(B, fin, 20 + i, S, get_column_letter(2 + j)))
        nombre(20 + i, 2 + len(LIBELLES),
               '=COUNTIF(Backlog!${0}$2:${0}${1},$A{2})'.format(B, fin, 20 + i))

    # Bloc 3 — par personne
    titre(27, "Par personne")
    etiquette(28, 1, "Personne", gras=True)
    etiquette(28, 2, "Assigné", gras=True)
    etiquette(28, 3, "En cours", gras=True)
    etiquette(28, 4, "À tester", gras=True)
    etiquette(28, 5, "Bloqué", gras=True)
    etiquette(28, 6, "En retard", gras=True)
    for i, p in enumerate(GENS):
        etiquette(29 + i, 1, p)
        nombre(29 + i, 2, '=COUNTIF(Backlog!${0}$2:${0}${1},$A{2})'.format(K, fin, 29 + i))
        for j, s in enumerate(("En cours", "À tester", "Bloqué")):
            nombre(29 + i, 3 + j,
                   '=COUNTIFS(Backlog!${0}$2:${0}${1},$A{2},Backlog!${3}$2:${3}${1},"{4}")'
                   .format(K, fin, 29 + i, S, s))
        nombre(29 + i, 6,
               '=SUMPRODUCT((Backlog!${0}$2:${0}${1}=$A{2})*(Backlog!${3}$2:${3}${1}<>"")'
               '*(Backlog!${3}$2:${3}${1}<TODAY())*(Backlog!${4}$2:${4}${1}<>"Terminé"))'
               .format(K, fin, 29 + i, D, S))

    # Bloc 4 — ce qui bloque le MVP, en clair
    titre(36, "Ce qui bloque le MVP, par module")
    etiquette(37, 1, "Module", gras=True)
    etiquette(37, 2, "Tâches bloquées", gras=True)
    MODULES_BLOQUES = [
        "Réservation", "Paiement", "Commandes", "Prestations",
        "Mon dossier", "Réservations", "Plateforme API", "Environnements",
    ]
    for i, m in enumerate(MODULES_BLOQUES):
        etiquette(38 + i, 1, m)
        nombre(38 + i, 2,
               '=COUNTIFS(Backlog!${0}$2:${0}${1},$A{2},Backlog!${3}$2:${3}${1},"Bloqué")'
               .format(M, fin, 38 + i, S))

    tb.column_dimensions["A"].width = 30
    for lettre in "BCDEFG":
        tb.column_dimensions[lettre].width = 13
    tb.sheet_view.showGridLines = False


if __name__ == "__main__":
    sys.exit(main())
