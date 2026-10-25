# Propositions d'interface (25 octobre 2026)

Demande du porteur : « une interface nouvelle, très intuitive et agréable visuellement ; le design doit être un point fort du jeu ». Quatre directions, chacune maquettée sur deux écrans de téléphone (390 × 844). Les maquettes sont sur une planche de design (lien privé, à partager depuis la planche) : https://claude.ai/artifact/Jh7CthADNVFZVifMsgcCfa

**Rien n'est codé.** Ce document sert à choisir une direction. Aucune proposition ne change une règle : ce sont des choix d'affichage et d'interaction sur les mécaniques actuelles (comptoir, ateliers, commandes du jour, mules, Rialto, Terraferme).

## Constat sur les captures du 25 octobre

Captures : parcours `layout.mjs` complet en 390 × 844 (guide, Rialto, ateliers, Terraferme du jeudi, Avis).

- **Le jeu se lit, il ne se voit pas.** Chaque état passe par une phrase : « À l'arrêt : lancez une production », « Amélioration déconseillée : il manque du blé », « Dogana aujourd'hui, pour cette marchandise : encore 10 à acheter… ». La fiche du blé au Rialto compte 9 blocs de texte avant le bouton.
- **Trois langages visuels cohabitent** : la carte en vignettes illustrées, les feuilles en cartes biseautées façon jeu de cartes mobile, les sur-titres en capitales espacées façon console. Aucun ne domine, l'ensemble paraît chargé.
- **L'état du comptoir est caché** : il faut ouvrir les Ateliers pour savoir ce qui tourne. Sur la carte, le comptoir n'a qu'un anneau et une pastille.
- **Rien ne dit ce qui va arriver** : la prochaine récolte, l'arrivée d'une mule, le renouvellement des commandes sont dispersés (panneau, Avis, minuterie du guide).
- **La boucle principale (livrer) demande quatre écrans** : choisir la mule, choisir la ville, cocher dans la feuille Cargaisons, puis Partir.

Ce qui marche et qu'il faut garder : la carte comme écran unique, le bleu nuit, la règle « un seul bouton or par écran », les rôles de couleur (or = argent, vert d'eau = gain, cinabre = perte, lapis = sélection), les feuilles du bas.

## A · Lagune : l'orbite (évolution, inspirée de Hades Star)

On garde la palette et la carte, on retire le texte.

- **Une ville = un astre.** Ses commandes sont des points en orbite : plein et doré si le stock les couvre, creux sinon. On lit la carte entière d'un coup d'œil, sans pastille chiffrée.
- **Le comptoir = un soleil d'or** entouré d'un anneau par atelier ; l'arc rempli est l'avancement du lot, l'anneau vert d'eau plein dit « prêt ».
- **Toucher le comptoir zoome dessus** : les ateliers se disposent en orbite, reliés par la chaîne (ferme → moulin → boulangerie). Un atelier qui attend sa matière a un contour pointillé, pas une alerte. Une parcelle libre est un cercle « + ».
- **Le HUD tient en une ligne** : blason et nom à gauche, cloche et bourse (avec le revenu horaire) à droite.
- **La frise du temps**, au-dessus des portes : « maintenant », puis les trois prochains événements (Padoue paie dans 0:45, moulin dans 12 min, commandes à 11 h).
- Une seule action dorée flottante : « Récolter et relancer ».

Effort : M. Même pile (SVG de la carte, `Markers.tsx`, `Hud.tsx`), mêmes rôles de couleur. Le plus sûr.

## B · Carnet : le livre du marchand (diégétique)

L'interface est l'objet du marchand : un portulan sur sa table et son livre de comptes.

- Carte à l'encre sur parchemin, lignes de rhumb, villes en vignettes gravées, comptoir marqué d'un **cachet de cire**.
- **Les commandes sont des billets épinglés** près de leur ville ; la route se trace à la plume pendant que la mule avance.
- **Les menus sont des signets de soie** qui dépassent du bas du livre (Ateliers, Rialto, Gazette, Palmarès).
- **La cargaison est une page de comptes** : lignes réglées, cases cochées à l'encre, points de conduite jusqu'au prix, cale en bâtons de comptage, total doublement souligné, et l'on **scelle** pour partir.

Effort : L (toutes les illustrations à reprendre). Va contre le choix du bleu du 20 octobre ; possible en version nuit (encre claire sur cuir bleu). La plus singulière : aucun jeu de commerce mobile ne ressemble à ça. Peut aussi servir de peau réservée à la cérémonie de fin de saison et au Palmarès.

## C · Flux : l'économie qui se voit (inspirée de Mini Metro)

La carte devient un schéma de réseau ; on voit la marchandise circuler.

- **Une couleur et une forme par marchandise**, partout dans le jeu : blé ● jaune, farine ■ blanc, pain ▲ orange, argile ◆ brun, briques ▬ rouge, bois ⬢ vert, planches ✚ turquoise. La forme double la couleur (daltonisme).
- **Les villes sont des stations** ; leur demande s'affiche en petites formes à côté (pleines = le stock couvre). Lignes à 45°, épaisses, colorées par la cargaison en route.
- **Les chiffres sont des débits** : « +61 d par heure » et sa courbe sous la bourse, puis trois tuiles : production, ventes, **goulot**.
- **La chaîne de production en diagramme de flux** : la largeur d'une bande est son débit, la farine qui manque est une bande fantôme rouge, et la feuille propose la correction (« Améliorer le moulin · 120 d » ou « Acheter de la farine au Rialto »).

Effort : L pour la carte, S pour le code couleur et formes (utilisable seul, dans n'importe quelle direction). Le plus lisible, et le meilleur outil d'apprentissage.

## D · Table : les commandes sont des cartes à jouer

La boucle principale devient un geste.

- **La main du jour** : les commandes du tableau existant, en cartes, en éventail au pied de l'écran. Bandeau à la couleur de la ville, quantité, prix en or, durée de route. Une carte que le stock couvre est bordée d'or et dit « en stock » ; sinon, elle dit ce qui manque.
- **Lever une carte allume sa ville** et sa route sur la carte ; les autres villes s'estompent.
- **On glisse la carte sur une mule.** La mule prend la ville de sa première carte ; les cartes d'autres villes s'estompent dans la main (règle actuelle : une charrette, une ville).
- **Le départ** : la cale en 25 crans colorés par marchandise, les cartes jouées, « +85 d payé à l'arrivée », un seul bouton or « Partir pour Padoue ».

Effort : M. Remplace la feuille Cargaisons et le panneau de départ, sans toucher au serveur. Le plus intuitif pour un joueur mobile qui ne connaît pas les jeux de gestion.

## Recommandation

Une synthèse plutôt qu'une direction seule :

1. **A comme base** (carte, astres, comptoir en orbite, frise du temps, HUD d'une ligne) : elle prolonge le choix du bleu et les règles du HUD de `design.md`.
2. **Le code couleur et formes de C** partout (carte, magasin, Rialto, commandes), et son diagramme de flux comme vue « Chaîne » des Ateliers.
3. **La main du jour de D** à la place de la feuille Cargaisons.
4. **B gardé pour les moments solennels** (cérémonie de fin de saison, Palmarès, Livre de compte), si le porteur le souhaite.

Ordre conseillé, chaque étape jouable seule : code couleur et formes (S) → frise du temps et HUD d'une ligne (S) → main du jour (M) → astres et comptoir en orbite (M) → vue Chaîne (M).

## Décisions demandées au porteur

1. Direction : A, B, C, D, ou la synthèse recommandée.
2. Code couleur et formes des marchandises : oui ou non (il touche aussi les illustrations des ressources).
3. Main du jour en cartes à la place de la feuille Cargaisons : oui ou non.
4. Le carnet (B) pour les moments solennels : oui, non, ou plus tard (IDEAS.md).

## Décisions du porteur (25 octobre 2026)

1. **Direction A retenue** (Lagune : astres, comptoir en orbite, frise du temps, HUD d'une ligne).
2. Code couleur et formes des marchandises : **plusieurs propositions demandées, à partir de A** (ci-dessous).
3. **Main du jour en cartes : non.** La feuille Cargaisons reste ; D est écartée.

## Marchandises : couleur et forme, sur la base de A

Le moteur range déjà chaque marchandise par **chaîne** et par **étape** (`packages/engine/src/themes/venice1450.ts`, champs `chain` et `tier`) : vingt marchandises, sept chaînes, quatre étapes (brut, transformé, fini, outre-mer). Un code « une couleur et une forme par marchandise » ne tient pas à vingt ; les trois propositions partagent donc la même règle : **la couleur dit la chaîne**, et l'étape se lit autrement selon la proposition.

### Six teintes, une par chaîne

| Chaîne | Marchandises | Teinte |
| --- | --- | --- |
| Vivres | blé, farine, pain | paille `#E6D3A3` |
| Construction | argile, briques | terre cuite `#C77B4A` |
| Charpente | bois, planches | mousse `#93B95C` |
| Verrerie | sable, verre, miroirs | rose de Murano `#F09CC4` |
| Draperie | laine, drap de laine, vêtements | gris de lin `#A3A8C9` |
| Outre-mer | épices, soie, sel, vin, fourrures, draps, épices préparées | pourpre `#B48BE6` |

Les épices préparées (chaîne `spicery`, une seule marchandise) prennent la teinte de l'outre-mer. Chaque teinte est à un écart ΔE ≥ 25 (CIE76) de l'or, du vert d'eau, du cinabre, du lapis et de l'eau, et de chacune des autres ; contraste ≥ 4,5:1 sur `night-2`. Le blé n'est pas doré : l'or reste l'argent et l'action.

### Trois façons de dire l'étape

1. **Astres de chaîne** : la forme dit l'étape. Rond brut, carré transformé, hexagone fini, losange d'outre-mer, plein de la couleur de la chaîne, pictogramme gravé en sombre dès 24 px. Le plus lisible en petit : sur la carte, en orbite autour des villes (plein = le stock couvre la commande, creux = il en manque).
2. **Cristaux** : la taille de la pierre dit l'étape. Pierre brute, taille à degrés, brillant ; marquise gravée de son pictogramme pour l'outre-mer. Un éclat blanc sur les marchandises finies. Le plus proche de Hades Star, et l'on « voit » la valeur ajoutée ; un peu moins net sous 16 px.
3. **Jetons gravés** : un disque de nuit cerclé de la couleur de la chaîne, gravé de son pictogramme ; l'étape en crans au-dessus du cercle (un, deux, trois), un double cercle pour l'outre-mer. Le plus explicite pour un débutant, le plus proche des illustrations actuelles ; les crans se perdent sous 20 px.

Ma recommandation : **les astres** pour la carte et les petites tailles, avec le pictogramme de la proposition 3 dès 24 px (Magasin, Rialto, Ateliers). Les trois sont maquettées sur la planche, chacune en légende complète et dans quatre situations de jeu : commandes en orbite, Magasin, chaîne au comptoir, Rialto.
