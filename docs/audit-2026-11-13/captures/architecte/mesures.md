# Mesures brutes de l'architecte (13 novembre 2026)

Machine de l'audit (partagée), serveur local port 3699, `NODE_ENV=test`, base PGlite dans le même
processus (son processeur est compté avec celui du serveur). 60 comptes créés par le vrai lien
magique (adresses de bouclage 127.0.1.x, une par compte), donc deux lagunes : Murano (48) et
Burano (12). Scripts : `scripts/` (à lancer depuis le dossier de travail, voir `lib.mjs`).

## Lecture `GET /api/planche`
| Moment | Brut | gzip | Latence p50 | Processeur par lecture |
|---|---|---|---|---|
| Lundi 16, lagune neuve | 39 177 o | 2 785 o | 9 à 16 ms | 10 à 13 ms |
| Mardi 17 (+1 jour) | 53 à 57 ko | 3,9 à 4,9 ko | 9 ms | |
| Mardi 24 (+1 semaine) | 64 à 69 ko | 4,5 à 6,7 ko | 10 à 17 ms | |
| 6 semaines (banc, moteur seul) | 86 ko (état) / 91 ko (instantané) | | | `toJson`+`stringify` 2,1 ms |

Répartition de l'état à 6 semaines : `houses` 76 ko (89 %), `rank` 3,2 ko, `muda` 3,0 ko, `gauges` 2,5 ko.

## Interrogation
| Joueurs | Rythme | Requêtes/s | p50 / p95 | Processeur |
|---|---|---|---|---|
| 20 | 2 s | 9,4 | 9,6 / 14,1 ms | 12 % d'un cœur |
| 60 | 2 s | 28 | 7,9 / 13,3 ms | 28 % |
| 60 | 2 s + `/api/maison` | 56 | 7,6 / 12,7 ms | 50 % |

## Poussée WebSocket (chaque geste réussi → chaque joueur de la lagune relit `/api/planche` et `/api/maison`)
| Scénario (48 joueurs de Murano, prise WebSocket ouverte) | Gestes | Poussées | Lectures | Geste p50 / p95 / max | Lecture p95 | `/api/health` max | Processeur | Mémoire |
|---|---|---|---|---|---|---|---|---|
| 1 geste par joueur et par minute, 60 s | 48 | 2 304 | 4 717 | 507 / 1 933 / 4 522 ms | 956 ms | 689 ms | 62 % | 1 246 Mo |
| idem, le client **ne relit pas** à la poussée | 48 | 0 | 144 | 16 / 27 / 38 ms | 25 ms | 23 ms | **6 %** | 694 Mo |
| rafale : 3 achats de case par joueur, en même temps | 144 | 6 912 | 13 404 | 16 s / 30 s / **67,5 s** | 55 s | **19 s** | 100 s de processeur | 1 032 Mo |

## Avance de la lagune (moteur, 20 joueurs assis)
| Avance | Banc moteur | Serveur (première lecture après relance) |
|---|---|---|
| 1 heure | 3 à 6 ms | |
| 1 jour | 152 ms | 107 ms (Murano), 155 ms (Burano) |
| 1 semaine | 519 ms (850 ms avec 10 tours tenues) | 363 ms, 560 ms |
| 6 semaines | 4 710 ms | |
| 1 semaine et 6 sorties de capitaines contre une tour tenue | | **6 867 ms**, `/api/health` sans aucune réponse pendant ce temps |

Profil d'une semaine (850 ms) : `structuredClone` 443 ms en propre (52 %), `plancheRobot` 390 ms
inclusif (46 %), `plancheAdvance` 416 ms inclusif.

Duel d'une sortie (capitaine profondeur 3 contre lieutenant profondeur 2, partie entière) :
lido 5×5 : 137 à 199 ms ; chioggia 7×7 : 818 à 1 159 ms ; otrante 9×9 : 4 083 à 4 550 ms.
Une Passe forcée (`/api/planche/force`) : 1 647 à 1 820 ms, `/api/health` à 1 617 ms pendant.

## Mémoire du serveur
RSS 490 Mo au démarrage (PGlite compris), 380 à 410 Mo au repos après relance, 1,25 Go au plus fort
de la poussée. Un document de lagune de 6 semaines : 0,20 Mo de tas.
Démarrage (2 lagunes) : 3 à 5 s. Processeur au repos : 180 ms par minute (ancien monde compris).

## Base
Après 3 semaines de jeu et ~600 gestes : base PGlite 31 Mo ; `world_states` 808 ko (Murano 88 ko,
Burano 90 ko par instantané) ; `world_commands` vidée à chaque instantané. Grand livre : la planche
a écrit `planche_isle` 317, `planche_sale` 249, `planche_start` 96 lignes ; l'**ancien monde**, sans
joueur, `escrow_release` 290, `escrow_lock` 189, `market_maker_sell` 135, `trade` 86, `market_tax` 86.

## Client (Chromium, WebGL logiciel, 390 × 844 et 1280 × 800)
- Racine : 30 requêtes, 3,35 Mo décodés. `index-*.js` 1 736 555 o (541 841 o gzip), `ribbon-*.js`
  (three.js) 877 111 o (234 852 o gzip), `LabPlanche-*.js` 228 687 o (74 696 o gzip),
  `index-*.css` 151 737 o.
- Sur la planche : environ **950 appels de dessin par image**, boucle de rendu continue ;
  3 457 à 3 623 tampons WebGL créés, **0 supprimé** ; **+250 tampons** après 10 fils tendus par
  d'autres joueurs (+84 au second essai).
- Tas JS : 590 à 613 Mo avant ramasse-miettes, **22 Mo** après (forte production de déchets).
- Une seule lecture `/api/planche` en 20 s quand la prise WebSocket est ouverte (`data-live=true`).
