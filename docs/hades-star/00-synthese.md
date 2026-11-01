# Hades' Star dans Fondaco — synthèse et feuille de route

*1er novembre 2026. Le porteur a demandé que la livraison de Fondaco reprenne celle de Hades' Star, avec ses gestes, ses mouvements et ses animations, et qu'on étudie tout le jeu pour en tirer ce qui est pertinent.*

## Le cadre

- **Ce qu'on reprend** : les mécaniques, les gestes, les durées et la logique des animations.
- **Ce qu'on ne reprend pas** : les visuels, les icônes, les noms et les textes. L'apparence reste la direction « Lagune » (`docs/design.md`), et le vocabulaire reste vénitien.
- **Les sources** :
  - deux enregistrements d'écran du porteur ;
  - quatre recherches en ligne :
    - [01 — livraisons et transport](01-livraisons-transport.md) ;
    - [02 — vaisseaux et modules](02-vaisseaux-modules.md) ;
    - [03 — PvE et progression](03-pve-progression.md) ;
    - [04 — interface et animations](04-interface-animations.md).
- **La limite** : le réseau de la session refusait la lecture directe des pages (wiki, blog officiel, Steam, Reddit). Les faits viennent d'extraits de moteur de recherche et d'un jeu de données public ; chaque document dit ce qui reste à vérifier.

## Ce que montrent les enregistrements

- **La sélection** : toucher un vaisseau le fait briller, l'entoure d'un grand cercle pâle et fait monter un panneau au bas de l'écran. Ce panneau montre le type, la cale ou les points de vie, et « stationnement : X » ; il porte trois boutons, des flèches < > vers le vaisseau suivant, et une croix.
- **Le déplacement** :
  - on tire un pointillé du vaisseau jusqu'à une cible, qui prend un contour doré et des chevrons ;
  - une infobulle sombre donne la destination, la durée (6 s) et la distance (215 UA) ;
  - revenir sur le vaisseau affiche « Annuler » ;
  - au lâcher, le départ décompte 10 s, avec ✓ (partir tout de suite) et ✕ (annuler) ;
  - pendant le trajet, une barre montre les secondes restantes. Le vaisseau s'oriente vers sa destination, et la durée est écrite au milieu du trait.
- **Le zoom** : les planètes et les vaisseaux rétrécissent avec la carte quand on dézoome. Chaque planète a son nom au-dessus, une petite barre de niveau et des anneaux d'orbite ; les vaisseaux à quai se tiennent en orbite à côté.

## Les décisions du porteur (deux séries de questions, 1er novembre)

| Sujet | Décision |
| --- | --- |
| Le déplacement | Saut par saut, plus de tournée planifiée |
| Les cargaisons | Seulement les commandes des villes, remplies depuis le stock des comptoirs |
| Les durées | Quelques secondes par saut ; départ en 10 s, avancé (✓) ou annulé (✕) |
| Le coût par saut | Aucun |
| Le chargement | Automatique au comptoir de départ selon les commandes, ajustable à la main ; aux comptoirs traversés, seulement avec un module |
| La portée | Partout sur ses cases |
| Les arrêts | Une file de 15 au plus ; ✕ retire le dernier ; un saut lancé ne s'arrête plus |
| Les commandes | Une vague toutes les 2 h, accumulée jusqu'à 6 (12 h) ; au plafond, rien de neuf tant qu'on ne livre pas |
| Les bonus de livraison | Aucun pour l'instant |
| Le zoom | Les lieux rétrécissent avec la carte ; dézoom jusqu'à toute la carte ; les noms se cachent de loin |
| Les places de modules | Oui, sur tous les véhicules (chantier 2) |
| La perte à la Porta | Un véhicule détruit rentre abîmé, un véhicule pris à la fermeture est perdu, et une Porta noire optionnelle met la perte définitive contre +50 % de reliques (chantier 3) |
| Les reliques | Déchiffrées en plans pour les composants de combat seulement (chantier 3) |
| Les ennemis | L'incendiaire (chantier 3) |
| L'ordre | 1) la livraison ; 2) les véhicules et les modules ; 3) la Porta ; 4) le reste de l'interface |

## Chantier 1 — la livraison saut par saut (fait, PR « livraison saut par saut »)

- **Le moteur** (`packages/engine/src/empire/moves.ts` et `orders.ts`) :
  - les commandes viennent par vagues (`orders.maxWaves`) ;
  - les sauts passent par `empireMove`, `empireDepartNow` et `empireCancelStop`, le chargement par `empireLoad` et `empireUnload` ;
  - `empireSettle` règle un saut arrivé ;
  - la reprise unique des tournées et des transferts d'avant.
- **L'écran** (`apps/web/src/empire/map/`) :
  - `Fleet.tsx` : la flotte en orbite, les trajets, le glisser, l'infobulle et l'arrivée ;
  - `VehiclePanel.tsx` : le panneau du véhicule ;
  - les lieux qui rétrécissent au zoom, dans `EmpireMap.tsx` et `index.css`.
- **Les réglages de Venise** : `moves { departSeconds 10, unitsPerSecond 8, maxStops 15 }` et `orders.maxWaves 6`.

## Chantier 2 — les véhicules et les modules (à planifier)

- **Les places de modules** typées sur tous les véhicules ; un niveau de modèle ajoute une place, comme dans Hades' Star (02, § 1).
- **Les modules de commerce** :
  - le « Livre de route » charge aux comptoirs traversés ce que demandent les arrêts suivants ;
  - d'autres candidats sont décrits dans 02, § 5, et 01, § 4.
- **La règle de combat « recharge fixe, effet qui monte »** pour les composants de la Porta (02, § 1).

## Chantier 3 — la Porta (à planifier)

- **La perte** : un véhicule détruit rentre abîmé et se répare ; un véhicule pris quand Rome ferme est perdu.
- **La Porta noire**, optionnelle : la perte définitive, contre +50 % de reliques.
- **Les reliques** se déchiffrent à la Scuola en plans pour les hauts niveaux des composants, au lieu d'être vendues ; c'est le point ouvert du plan de la Porta, § 13.
- **L'incendiaire** : un ennemi qui brûle une ville, dont les reliques sont perdues si on ne l'arrête pas.

## Chantier 4 — le reste de l'interface (à planifier)

Il est décrit dans 04, § 8 :
- le calque d'information (appui long, ou Alt sur PC) ;
- les destinations éclairées avec leur compte quand un véhicule chargé est choisi ;
- les effets de construction et d'amélioration ;
- les raccourcis restants.
