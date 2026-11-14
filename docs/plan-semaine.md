# Douze systèmes et la semaine : plan (lot D de l'audit d'ensemble du 13 novembre 2026)

*Proposé le 14 novembre 2026, après l'économie (`docs/plan-economie.md`, fusionné). Décisions D1 (douze systèmes, trois le premier jour) et D3 (« la semaine » au lieu de la pile de pilules) de `docs/audit-2026-11-13/00-synthese.md`. Sources : `05-expert-game-design.md` (G1, § 4 : l'inventaire), `06-expert-ux-da.md` (UX-1 à UX-19, § 3.3 et la maquette `captures/ux/maquette-pile.png`), `01-joueur-debutant-mobile.md` (46 mots inconnus le premier jour). **Validé le 14 novembre 2026** avec les trois recommandations du § 7. Critère : la règle « une douzaine de systèmes visibles, trois le premier jour » tenue ; la planche dégagée ; le rouge pour toi seul ; chaque fiche part d'une image.*

## 1. Le problème à régler

- **Vingt-trois systèmes visibles et dix-huit compteurs** ; 46 mots inconnus le premier jour ; des lieux qui répondent « pas encore » (G1, R1).
- **Six pilules cerclées de rouge sous le médaillon** : elles couvrent la colonne gauche (15 % de l'écran du téléphone), cachent dix étiquettes à la lagune, et ne disent pas lequel attend un geste aujourd'hui (UX-1).
- **Le rouge ne veut plus dire « à toi »** : au moins dix objets rouges au sestiere, six rouges différents codés en dur (UX-2, UX-3).
- **Les étiquettes se chevauchent** : 43 à la lagune sur téléphone, 18 recouvertes ; sept styles au lieu de trois tailles (UX-4, UX-5).
- **Cibles et textes trop petits** : 51 à 79 cibles sous 44 px par écran ; des textes de 7 à 9 px (UX-14, UX-15).
- **Les fiches récentes sont des listes** : la Guerre, le palais, la Muda, la Gazette, le Livre, la marée (UX-10, UX-19 ; règle 10).
- **Plusieurs fiches et la pile à la fois** ; la nouvelle du bas posée sur les fiches ; l'échelle cachée au téléphone et sur la pile à l'ordinateur (UX-6 à UX-9, UX-18).

## 2. Ce que voit le joueur

- **En haut à gauche, le médaillon seul** : il ouvre la Maison (niveau, façade, Livre) et, en onglet, la compagnie (« ta Maison et les tiens »).
- **En haut à droite, la bourse** : ducats, bobines dessinées, « 1ᵉ du sestiere » ; le rang ouvre le palais.
- **En bas, la semaine** : sept jours, aujourd'hui en encre ; chaque jour porte son objet (le nœud du Problème, le pavillon de la Guerre du mardi au vendredi, la nef de la Muda le samedi, la feuille de la Gazette le dimanche) ; **une seule pastille rouge**, sur aujourd'hui, quand un geste t'y attend. Le titre du ruban dit la marée (« marée 1 · semaine 1 sur 6 »).
- **Les lieux permanents sont des objets de la planche** : le phare de ta compagnie près de ta Maison, la nef de la Muda au môle, l'encre au Large (la toucher ouvre la marée, sur la planche même), le palais du Doge sur la place San Marco.
- **Les lieux s'ouvrent par étapes**, chacun annoncé le jour de son ouverture (« Le Port s'ouvre : ta première galère t'attend »), jamais de bouton « pas encore » (par le niveau).
- **Le Port** remplace l'Arsenal, la Guerre et le Lido : un seul lieu, caché jusqu'au niveau 6. **Les tours** portent leurs sorties et les tours noires du Large ; **les villes** portent leurs commandes.
- **Une étiquette, trois tailles** (ville, passage, Maison), triées par priorité (toi, ton rival, ta cible, tes fils, puis le reste) et regroupées (« +3 ») quand elles se touchent ; à la lagune, les tours en simple pastille.
- **Un seul rouge** (`--pc-accent`), pour ta Maison, ton fil, ton pavillon et l'unique action ; le danger en encre et or.
- **Une fiche à la fois** ; la nouvelle et la légende se taisent sous une fiche ; l'échelle en bas à gauche, et au téléphone en segment compact.
- **Chaque fiche part d'une image** : la Guerre, la Muda, le palais, la Gazette, la marée.

## 3. Les règles

### 3.1 L'ouverture par étapes (D1)

Une fonction pure du moteur, `plancheOpens(S, s, house)`, dit les lieux ouverts d'une Maison (par son niveau : 1 les fils, l'île, les villes, les tours ; 2 le Problème du jour ; 3 les commandes, le rival, la compagnie ; 4 le duel ; 5 la Muda, le rang, la marée ; 6 le Port et les ouvrages ; 11 les tours noires) ; le Livre note « s'ouvre » le jour où un lieu s'ouvre, et la planche l'annonce une fois. Ce qui n'est pas ouvert ne se montre pas.

### 3.2 Les douze systèmes

| # | Système | Ce qu'il absorbe |
| --- | --- | --- |
| 1 | Les fils | bobines, patine, détour, péage |
| 2 | L'île | cases, ateliers, ouvrages, entrepôt |
| 3 | Les villes | demande commune, parts, **commandes scellées** |
| 4 | Les tours | sceaux, garde, péage, **sorties**, **tours noires du Large**, reliques et plans |
| 5 | Le Problème du jour | |
| 6 | Le duel | défi, cote, laurier de la Passe |
| 7 | La Maison | niveau, Prestige, titres, façade, Livre |
| 8 | Le rang | place, lauriers, Doge, palais, **rival** |
| 9 | Le Port | **Arsenal, Guerre, Lido** |
| 10 | La compagnie | phare, discussion, signes, saluts |
| 11 | La Muda | |
| 12 | La marée | encre, pierres, fin de marée ; **la Gazette** en carte du dimanche |

La Puissance n'est plus montrée (elle sert à l'appariement). Les décrets et les ligues restent retirés et gelés (D2).

## 4. La technique

- **Moteur** : `plancheOpens` et l'événement « s'ouvre » du Livre ; tests d'abord, sur les fixtures.
- **Écran** : la semaine (`Semaine.tsx`) au lieu de la pile ; le médaillon et la compagnie en onglet ; les objets de la planche (phare, nef, encre, palais) dans `PlancheBoard.tsx` ; le Port (`Port.tsx`, qui reprend `Arsenal.tsx` et l'entrée de la Guerre) ; les étiquettes (priorité, regroupement) ; le jeton rouge unique et une règle de lint contre les rouges en dur ; 44 px et 11 px ; une fiche à la fois.
- **Fiches en image** : les cinq (Guerre, Muda, palais, Gazette, marée).
- **Parcours** : e2e à 390 px et à 1280 px pour la semaine, l'ouverture d'un lieu, le Port ; captures relues avec la toile de l'audit visuel.

## 5. Les lots

| Lot | Contenu | Validation |
| --- | --- | --- |
| D1 | L'ouverture par étapes au moteur, annoncée ; rien de « pas encore ». | tests du moteur |
| D2 | La semaine au lieu de la pile ; le médaillon et la compagnie en onglet ; une fiche à la fois ; l'échelle. | e2e, captures |
| D3 | Les lieux permanents en objets de la planche : phare, nef au môle, encre, palais. | captures |
| D4 | Le Port (Arsenal, Guerre, Lido) ; les commandes dans les villes ; sorties et tours noires dans les tours. | e2e |
| D5 | Les étiquettes en trois tailles, priorité, regroupement ; un seul rouge (et son lint) ; 44 px, 11 px, contraste. | mesures DOM, captures |
| D6 | Les fiches qui partent d'une image : la Guerre, la Muda, le palais, la Gazette, la marée. | captures |
| D7 | Les parcours e2e repris, la revue des captures avec la toile, PR. | e2e à 390 px et 1280 px |

## 6. Ce qui n'est pas dans ce lot

Le premier quart d'heure guidé et la tour d'entraînement (lot E) ; la compagnie sûre (lot F) ; les coups de l'assaut joués sur la scène (UX-11, gros chantier, plus tard).

## 7. Tranché (14 novembre 2026)

1. **Le rythme d'ouverture.** (a) **Par le niveau seul** : 1 les fils, l'île, les villes, les tours ; 2 le Problème du jour ; 3 les commandes, le rival, la compagnie ; 4 le duel ; 5 la Muda, le rang, la marée ; 6 le Port et les ouvrages ; 11 les tours noires. (b) Le tableau de l'expert, qui mêle jours et niveaux (jour 2, semaine 1, semaine 2…). *Recommandation : (a). Depuis le lot C, le niveau monte dès le premier jour (niveaux 2 à 4 la première semaine) : il suffit à rythmer, et il est le même en ligne et hors ligne.*
2. **La compagnie.** (a) Un onglet de la fiche de la Maison (« ta Maison et les tiens ») et son phare posé près de ta Maison, comme la maquette ; (b) un jour de la semaine ou un bouton à part. *Recommandation : (a).*
3. **Les fiches en image, dans ce lot.** (a) Les cinq : la Guerre (le schéma des ports seul), la Muda (la route dessinée), le palais (un podium et l'échelle des rangs), la Gazette (une une imprimée), la marée (ouverte sur la planche) ; (b) trois d'abord (Muda, palais, marée), la Guerre et la Gazette au lot suivant. *Recommandation : (a), puisque le Port refait déjà l'entrée de la Guerre ; les coups de l'assaut sur la scène restent hors du lot.*

## 8. État

Fait le 14 novembre 2026 :

- **D1** : `maison.places` (le niveau de chaque lieu) et `plancheOpens` ; le Livre dit chaque ouverture (« Le Port s'ouvre : ta première galère t'attend »). Rien de « pas encore » : ce qui n'est pas ouvert ne se montre pas.
- **D2** : la semaine (`Semaine.tsx`) remplace les six pilules ; une seule pastille rouge, sur aujourd'hui ; son titre dit la marée et l'ouvre. La compagnie est l'onglet « Les tiens » de la fiche de la Maison. Une fiche ouverte replie la semaine, fait taire la nouvelle, l'échelle et la légende ; l'échelle en bas à gauche à l'ordinateur, revenue au téléphone.
- **D3** : l'encre au Large ouvre la marée ; le phare de ta compagnie l'ouvre ; le môle ouvre la Muda. Le palais reste au rang de la bourse.
- **D4** : le Port (ta flotte, tes défenses, la Guerre, le Lido) en quatre onglets, au niveau 6 ; les commandes dans les villes et les tours noires à leur niveau ; la Puissance n'est plus montrée.
- **D5** : un seul rouge en jetons, et `pnpm lint` refuse un rouge en hex dans les écrans de la planche ; le danger en or ; les étiquettes triées par priorité et regroupées (« +N ») ; aucun texte sous 11 px ; 44 px pour les touches des fiches ; l'encre douce plus foncée.
- **D6** : la Muda (sa route dessinée), le palais (son podium), la Gazette (une une même vide), la Guerre (sa carte, un port touché), la marée (la planche recule jusqu'à l'encre).

À suivre : les coups de l'assaut joués sur la scène (UX-11) ; le classement des ligues dessiné quand elles reviendront.
