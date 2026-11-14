# Audit du 13 novembre 2026 — 01. Le joueur débutant, sur téléphone (390 × 844)

Auditeur : un joueur qui ne sait rien de Fondaco, sur un téléphone. Serveur à moi (port 3611, base PGlite neuve), web déjà construit, Chromium en WebGL logiciel. Captures : `docs/audit-2026-11-13/captures/debutant/`.

## 1. Verdict

**Est-ce que je reviendrais demain ? 4 / 10.**

L'entrée est belle et rapide (un courriel, un nom, un pavillon) et le premier fil, une fois trouvé, est un vrai bon geste : une bande rouge qui part de chez moi vers Rialto. Mais personne ne me dit quoi faire en arrivant : la planche s'ouvre sur six boutons rouges, quarante-huit Maisons, seize tours et une commande scellée impossible à servir, et le seul conseil utile (« Bâtis d'abord un atelier dans ton île ») est caché dans la fiche de ma Maison, qu'il faut deviner de toucher. Le lendemain, rien ne m'accueille, mon entrepôt est plein et à l'arrêt, le blé ne vaut plus qu'un ducat, j'ai 4 de Prestige sur les 20 du niveau 2, et la moitié des boutons (Guerre, Arsenal, Muda, Gazette) me répondent « pas encore » : je n'ai rien de nouveau à faire.

## 2. Ce que j'ai fait

- **Lundi 16 novembre, 10 h 00 (heure du jeu)** : page d'accueil, courriel, lien magique, fondation de « Ca' Novizio » (pavillon Lion). Arrivée sur la planche, sans guide. J'ai cherché ma Maison, ouvert sa fiche, je suis entré dans l'île, j'ai bâti une Ferme sur le pré (+50 %), et attendu le chantier.
- Pendant le chantier, j'ai ouvert un à un les six boutons de gauche (Compagnie, Guerre, Marée, Muda, Gazette, Problème du jour), fait glisser la planche, touché Padoue, Trévise, Murano, Mestre, Vicence, Rialto pour trouver qui achète du blé.
- **10 h 10** : la ferme sort son premier blé ; premier fil tendu vers Rialto, à l'écran.
- Premier duel de la Passe (tour « Canal 1 · Kemal Reis »), joué en suivant l'indice du jeu : perdu en cinq coups. Problème du jour : un essai, raté. Profil, rival (Ca' Contarini), Arsenal, Lido des corsaires (assaut d'entraînement, trois manches).
- **Lundi 14 h 00** (serveur relancé quatre heures plus tard sur la même base) : retour, lecture de la bourse, de l'entrepôt, de Rialto ; deuxième atelier (Sablière).
- **Mardi 17 novembre, 9 h 00** (le lendemain) : retour, profil, Guerre (premier jour des assauts), palais du Doge (rang), Rialto.
- Gestes joués à l'écran (tap à la souris tactile, glisser) ; l'API n'a servi qu'à lire l'état pour vérifier ce que l'écran affichait.

Bilan chiffré : en 23 heures de jeu, **319 ducats gagnés** pour **1 200 dépensés** (deux ateliers), **4 de Prestige** sur les 20 qu'il faut pour le niveau 2, **0 duel gagné**, **1 fil**.


### Journal de la séance, vu par le joueur

**Lundi, les dix premières minutes**

| Minute | Ce que je vois | Ce que je fais | Ce que je comprends |
|---|---|---|---|
| 0 | Accueil : logo, « Une Maison de commerce à Venise », trois pastilles, un champ courriel. | Je saisis mon courriel. | Clair. |
| 1 | « Un lien est parti… ou tape le code ». | J'ouvre le lien. | Clair. |
| 2 | « Fonde ta Maison » : nom, cinq couleurs, huit emblèmes. | « Ca' Novizio », Lion, « Fonder ». | Clair ; « Bottega » et « Fondaco » sans explication. |
| 3 | La planche, six boutons rouges à gauche, une bulle « Commande scellée à Raguse : 20 briques ». | Je cherche ce que je dois faire. | Rien. Je ne sais pas ce qu'est une commande scellée ni où est Raguse. |
| 4 | La caméra glisse vers « Ta Maison ». | Je la touche. | La fiche dit enfin : « Bâtis d'abord un atelier dans ton île ». |
| 5 | L'île : le Fondaco et trois cases, « Bâtir un atelier ». | Je prends une Ferme, la pose sur le pré (+50 %). | Très bien guidé à partir d'ici. |
| 6 | « Ferme · 1 · chantier · 8 min » (on m'avait dit 5). | J'attends. | Le compte ne bouge pas. |
| 7–9 | Six fiches de gauche ouvertes une à une. | Je lis. | Guerre, Muda, Gazette : « pas encore ». Marée : abstrait. Compagnie : formulaire vide. |
| 9 | Padoue, Trévise, Mestre, Vicence : « ton île ne fait encore rien de ce que … demande ». | Je cherche qui achète du blé. | Il faut toucher ville après ville ; Rialto est loin, hors champ. |
| 10 | Rialto : « Blé · 2 ducats · libre 100 % ». | « Tirer un fil · blé ». | Le fil rouge part : le meilleur moment de la séance. |

**Lundi, la suite de la première séance**

- La tour « Canal 1 · Kemal Reis » : « 3 sceaux : au dernier brisé, la tour change de main », « Forcer le passage · la Passe, un duel de deux minutes ». Bonne promesse.
- La Passe : un damier en losange, des bords rouges et noirs, des flèches dans les cases, des ovales rouges et gris déjà posés (des suggestions ? des pièces ?). Je suis l'indice cinq fois ; la chaîne passe. « La chaîne est tendue d'une rive à l'autre. » Durée : moins d'une minute.
- Le Problème du jour : un autre damier, « Le fil passe en 2 coups ». Je pose au milieu : « Ce n'était pas la clef ».
- Le Lido : l'écran le plus guidé (bulles « Touche une galère… »), mais je lance les trois manches sans rien poser et le jeu me laisse faire.
- Bilan de la séance : 1 atelier, 1 fil, 0 ducat gagné, 600 dépensés, deux défaites.

**Lundi 14 h (quatre heures plus tard)**

- Rien ne m'accueille ; la bourse est passée de 2 400 à 2 454.
- Entrepôt : 52 blés ; 36 livrés à Rialto (54 ducats, 1,5 ducat l'unité en moyenne, pour un prix affiché de 2).
- Je bâtis une Sablière (600 ducats) : il me reste 1 854 ducats.

**Mardi 9 h (le lendemain)**

- Rien ne m'accueille ; le rang du haut dit « 3ᵉ ▼2 ».
- Entrepôt plein : blé 230, sable 240 sur 240 : mes deux ateliers sont à l'arrêt depuis des heures, sans que la planche le dise.
- À Rialto, le blé et le sable valent 1 ducat, le sable est servi à 98 % (« libre 2 % ») : ma Sablière ne vend presque rien.
- Le profil : 4 de Prestige sur 20 pour le niveau 2.
- La Guerre a commencé (« un assaut par jour ») : « Pas de navire » sur chaque port.
- Le palais : « Tu mènes : dimanche, son pavillon ira sur ta façade ». Seule vraie raison de revenir.
- Ce que je peux faire de neuf mardi : rien, à part tendre un fil de sable vers une ville déjà saturée.

## 3. Constats

| Id | Gravité | Constat | Preuve | Proposition |
|---|---|---|---|---|
| D1 | P0 | **Aucun guide à l'arrivée.** Après « Fonder », la planche s'ouvre sans un mot sur ce qu'il faut faire. Le seul conseil (« Bâtis d'abord un atelier dans ton île… », puis « Touche une ville pour y tirer ton premier fil ») n'apparaît que dans la fiche de ma Maison, qu'il faut d'abord trouver et toucher. La seule bulle affichée est une commande scellée impossible (voir D6). C'est contraire à la décision des tutoriels guidés (CLAUDE.md : « jusqu'au Fondaco niveau 2, le jeu guide geste par geste sous un projecteur ») : la nouvelle planche, devenue la racine, n'en a aucun. | `04-planche-arrivee.png` ; `LabPlanche.tsx:1678-1683` (le conseil est dans la fiche de la Maison seulement) ; aucun « tuto » dans `porcellana/planche` hors de l'assaut et de l'Arsenal | Un parcours guidé de trois gestes sous un projecteur : (1) ta Maison → ton île → une Ferme sur le pré ; (2) Rialto → tirer un fil ; (3) une tour → la Passe d'entraînement. Rien d'autre touchable pendant ce temps. |
| D2 | P1 | **Les six boutons de gauche cachent ma propre Maison.** À l'arrivée comme au retour, la caméra se centre sur ma Maison, mais l'étiquette « Ta Maison » tombe sous la colonne Compagnie / Guerre / Marée / Muda / Gazette / Problème du jour (environ 160 × 330 px, 40 % de la largeur sur la hauteur utile). | `08-menu-cache-maison.png`, `14-retour-4h.png` (on lit « Ta Maison » coupé derrière « La Muda ») | Replier les six entrées dans un seul bouton (ou une barre basse) sur téléphone, et centrer la caméra sur la Maison dans la zone libre, pas dans l'écran entier. |
| D3 | P1 | **Pas de ville en vue à l'arrivée.** Sur 390 px, la caméra centrée sur ma Maison ne montre aucune ville : la plus proche (Padoue) est à x = 438, hors champ ; Rialto, la seule qui achète les marchandises d'un débutant, est à x = 815. Il faut glisser la planche sans savoir dans quel sens. | Positions lues dans la page juste après la fondation (Padoue 438 px, Rialto 815 px, écran 390 px) | Au premier fil, cadrer Maison + Rialto ; ou une flèche de bord « Rialto achète ton blé → ». |
| D4 | P1 | **Le premier atelier ne rapporte presque rien, et le dit mal.** La Ferme coûte 600 ducats ; le blé se vend 2 ducats à Rialto le lundi, **1 ducat** le mardi ; en 23 h, deux ateliers ont rapporté 319 ducats. L'amélioration suivante coûte 3 000 ducats. La fiche de bâtisse annonce « Blé · 2 par heure au niveau 1 », l'atelier posé affiche « 24 par heure » : l'un compte des lots, l'autre des unités, sans le dire. | `IleScreen.tsx:331` (`lotsPerHour` affiché comme « par heure ») contre `IleScreen.tsx:448` ; état lu : `earned` 31 912 deniers mardi 9 h, prix Rialto blé 2 puis 1 | Afficher la même unité partout (« 24 blé par heure ») et, à la bâtisse, ce que l'atelier rapportera à la ville visée (« ≈ 40 ducats l'heure à Rialto »). Revoir au simulateur le gain des premières heures : le premier fil doit rembourser le premier atelier dans la journée. |
| D5 | P1 | **La progression du premier jour est invisible.** 4 de Prestige après 23 heures, il en faut 20 pour le niveau 2 (une 4ᵉ bobine) : quatre à cinq jours avant le premier palier. Le Prestige ne vient que des ventes du jour et du bilan du dimanche. | Profil mardi 9 h : « Le Prestige de la semaine 4 / 500 », « 20 de Prestige pour le niveau 2 » | Un premier niveau gagné dans la première séance (premier fil, premier duel, premier atelier comptent), puis la courbe actuelle. |
| D6 | P1 | **La première bulle est une commande impossible.** « Commande scellée à Raguse : 20 briques au double du prix, jusqu'à 13 h » reste en bas de l'écran pendant toute la séance, par-dessus les fiches. Les briques demandent le niveau 3 (Briqueterie), Raguse est fermée (`data-shut="true"`). Le lendemain : même chose à Chioggia, fermée elle aussi. | `04-planche-arrivee.png`, `14-retour-4h.png` ; `LabPlanche.tsx:764` ; Briqueterie « Niveau 3 » dans le catalogue | Ne montrer une commande scellée qu'à qui peut la servir (marchandise faite par l'île, ville ouverte), et en bulle refermable, pas en bandeau permanent. |
| D7 | P1 | **Le premier duel de la Passe se perd en suivant l'indice du jeu.** Aucune explication du but avant le duel (relier mes deux bords rouges ; la chaîne relie les noirs). L'indice dit « La chaîne menace en A1 : pare, ou prends l'initiative » : je pare cinq fois de suite là où il me le dit, et je perds en cinq coups (la chaîne avait deux menaces, l'indice n'en montre qu'une). Les noms A1, B2… ne sont écrits nulle part sur le damier. Brûlot, barge, cale, maillon arrivent sans définition. | `10-passe-indice.png` (deux cercles, l'indice n'en nomme qu'un), `11-passe-perdue.png` ; `LabPasse.tsx:403-408` | Premier duel contre une tour d'entraînement, guidé coup par coup (« pose ta barge ici : elle avance ton fil »), avec la victoire au bout ; lettres et chiffres en bord de damier ; l'indice signale la double menace (« deux menaces : prends l'initiative »). |
| D8 | P2 | **Le compte à rebours du chantier est faux et figé.** Annoncé « 5 min » à la pose, l'atelier affiche « chantier · 8 min » et ne bouge plus (7 min pour la Sablière). L'écran de l'île compte depuis `state.now`, l'heure de la dernière tranche de dix minutes, pas l'heure réelle. | `07-ile-chantier.png` ; `IleScreen.tsx:65` (`const now = state.now`) ; état lu : `state.now` 10:00:00 vingt secondes après la pose, `readyAt` 10:08:14 | Compter depuis l'horloge du client recalée sur le serveur, et rafraîchir chaque seconde. |
| D9 | P2 | **Le premier blé n'apparaît qu'à la tranche suivante.** Le chantier finit à 10 h 08 ; Rialto dit « ton île n'en fait pas » jusqu'à 10 h 10 (tranche de dix minutes). Dans la première séance, c'est dix minutes sans rien à vendre. | `sliceMs: HOUR / 6` (`venice1450.planche.ts:92`), `plancheAdvance` | Premier chantier instantané (ou d'une minute) et premier lot déjà en entrepôt. |
| D10 | P2 | **Trois Puissances différentes au même instant.** Fiche de ma Maison : « Puissance 0 » ; Arsenal : « Puissance 10 » ; Guerre : « Ca' Novizio (toi) · Puissance 10 », le même lundi. Mardi : Maison 20, Guerre 20. | Textes lus des trois fiches lundi 10 h 05 | Une seule source affichée partout ; et dire au débutant ce qu'est la Puissance (règle 6 : elle sert aux appariements). |
| D11 | P2 | **Deux rangs différents.** La pastille du haut dit « 3ᵉ ▼2 » ; le palais du Doge, ouvert depuis cette pastille, dit « 11ᵉ sur 48, 2 places de moins depuis ce matin » et, dans la même phrase, « Personne n'est encore Doge : tous à égalité ». Lundi, sans avoir rien vendu, j'étais « 1ᵉ sur 48 ». | `17-palais-rang.png` ; `LabPlanche.tsx:729-734` (`planchePlace`) contre `Palais.tsx:212` (`standing`) | Une seule place, la même aux deux endroits ; pas de rang affiché tant que la Maison n'a rien vendu. |
| D12 | P2 | **Le jour 1, la moitié des lieux répondent « pas encore ».** Guerre : « Pas aujourd'hui » lundi, puis « Pas de navire » mardi ; Arsenal : « s'ouvre au niveau 6 » mais propose « Pas encore de navire : mets-en un en chantier » avec des boutons « Niveau 6 » ; Muda : « on le charge à partir de mercredi » ; Gazette : « paraît dimanche » ; Compagnie : un formulaire vide. Le bouton L'Arsenal est sur la fiche de ma Maison dès le niveau 1. | `05-fiche-maison.png` (L'Arsenal dès le niveau 1) ; textes des fiches lus lundi et mardi | Ne montrer un lieu qu'à son ouverture (niveau, jour), avec une annonce quand il s'ouvre (« La Guerre commence demain : il te faut un navire, niveau 6 »). Le jour 1, trois lieux : île, villes, tours. |
| D13 | P2 | **Le rival de la semaine est un ordinateur à l'arrêt.** « Ca' Contarini · Maison tenue par l'ordinateur · Puissance 0 · Son île fait : rien encore ». Mardi : moi 319 ducats, lui 59. Pas de duel, pas d'enjeu. | Fiche de Ca' Contarini lundi ; palais mardi | Pour un débutant seul, un rival qui joue (même un robot actif), annoncé comme tel. |
| D14 | P2 | **Le retour ne dit rien.** Quatre heures puis vingt-trois heures plus tard, aucune phrase « pendant ton absence : 226 blés livrés, +319 ducats, entrepôt plein depuis 3 h ». La bourse passe de 2 400 à 2 454 sans explication ; l'entrepôt plein (blé 230, sable 240 sur 240) n'est signalé que dans l'île, pas sur la planche. | `14-retour-4h.png` ; état lu mardi 9 h : `stock {wheat: 230, sand: 240}` ; `IleScreen.tsx:308` (seul avertissement « presque plein ») | Une carte de retour (ce qui a été vendu, ce qui est plein, ce qui est nouveau), et le repère « plein » sur l'île de la planche. |
| D15 | P2 | **Le nom de la tour change en entrant dans la Passe** : « Canal 1 · Kemal Reis » sur la planche, « Bouche du Lido » dans le duel. Après la défaite : « tu perds la cargaison engagée », alors que mon entrepôt était vide et que je n'avais rien engagé. | `11-passe-perdue.png` ; `LabPlanche.tsx:1139` | Même nom des deux côtés ; message de défaite qui dit ce qui a vraiment été perdu (ici : rien). |
| D16 | P2 | **Recouvrements sur l'île.** La carte « Entrepôt » recouvre une case achetable (« +50 % · 400 ») et une étiquette « + Sable ». En ouvrant « Bâtir un atelier », le rendu de l'île disparaît derrière la feuille (seules les étiquettes flottent). | `15-ile-entrepot-recouvre.png` | Entrepôt replié en pastille sur téléphone, ou placé hors de la zone de l'île. |
| D17 | P2 | **Étiquettes qui se chevauchent sur la planche.** « Le canal de Curzola » et « Le canal d'Otrante » passent sur des noms de Maisons ; le fil rouge passe sous « Ca' Zane » et « Ca' Loredan ». | `04-planche-arrivee.png`, `09-premier-fil.png` | Masquer les noms des Maisons robots au zoom large ; les étiquettes de la Muda seulement quand on ouvre la Muda. |
| D18 | P2 | **Le Lido laisse lancer les manches sans rien poser.** L'indice dit « Touche une galère », mais « Lancer la manche 1 » est actif sans navire posé ; trois manches lancées à vide, fin : « 0 sceau brisé ». | Parcours joué : `Lancer la manche 1/2/3` sans placement | Bouton grisé tant qu'aucun navire n'est posé au premier entraînement. |
| D19 | P2 | **Petites cibles et accessibilité.** Les six entrées de gauche font 26 px de haut (sous les 44 px recommandés au doigt) ; la pastille de rang « 1ᵉ » fait 16 × 22 px ; 36 boutons de la planche (les épingles des villes) n'ont ni texte visible ni `aria-label` sur l'écran d'accueil. | Mesures `getBoundingClientRect` à 390 × 844 | 44 px au moins ; `aria-label` sur chaque épingle. |
| D20 | P2 | Français : « Blé · 24 par heure (tous les fermes de l'île) » (« toutes les fermes ») ; le gabarit ajoute un « s » à tout nom (« camp de bûcheronss »). | `IleScreen.tsx:448` | Libellé au pluriel dans le thème, avec le genre. |
| D21 | P2 | **« toi 0 % » après le premier fil, et encore après quatre heures de ventes** à Rialto ; « patine +0 % » sans explication ; le mardi, « toi 7 % · libre 53 % ». Je ne sais pas ce que ces pourcentages mesurent. | Fiche de Rialto lundi 10 h 10 et 14 h, mardi 9 h | Une phrase au premier fil : « tu sers 7 % de ce que Rialto achète ; plus ton fil reste, plus il patine (+ de prix) ». |

### Lisibilité : ce que j'ai compté le premier jour

- **Contrôles toujours à l'écran** : 10 (médaillon, six entrées de gauche, bourse, bobines, rang) ; plus, sur la planche, 48 Maisons, 20 villes et 16 tours ou détroits nommés.
- **Fiches et écrans ouverts** : 18 (Maison, île, Bâtir, atelier en main, atelier posé, ville ×6, tour, Passe, Problème, profil, rival, Arsenal, Lido, Guerre, Marée, Muda, Gazette, Compagnie, palais).
- **Mots inconnus rencontrés** : 46, par lieu où je les ai croisés :
  - à la fondation : Bottega, Fondaco, pavillon ;
  - sur la planche : sestiere (et Cannaregio, Castello, Dorsoduro, San Polo), Bouche, Détroit, corsaire, commande scellée, bobine, fil ;
  - dans la fiche de ma Maison : Puissance, Arsenal, Lido, flotte, quai ;
  - dans l'île : Fondaco (encore), « aime pré », fournisseur, voisin qui gêne, ouvrages (au profil) ;
  - dans une ville : patine, « libre % », détour, péage ;
  - dans la Passe : chaîne, barge, cale, cargaison, maillon, brûlot, écueil, initiative, clef ;
  - à la Guerre et au Lido : sceau, ruse, flottille, galère, brigantin, galéasse, nef d'escorte, batterie ;
  - à la marée : encre, le Large, ligue, Sérénissime, détroit noir ;
  - au palais et au profil : Prestige, Doge, Négoce, cote, Garde, Livre, façade ;
  - ailleurs : Muda, Gazette, compagnie, phare.
- **Ceux qui m'ont perdu** : « sceaux » (Guerre, tour, Lido : trois sens voisins), « cale / barge / cargaison » dans la Passe, « Puissance » (trois valeurs), « patine », « ouvrages » (le niveau 3 promet « les ouvrages », le catalogue dit « Moulin… Niveau 3 »), « flottille » contre « flotte ».

### Ce que je comprends au premier jour en touchant…

- **La Guerre** : une carte de douze ports, « prépare ton port et tes ruses » (où ? comment ?), six adversaires « l'ordinateur », tous « Pas aujourd'hui ». Le mardi, « Pas de navire ». Je comprends qu'il faut des navires, pas comment en avoir (niveau 6, plusieurs semaines au rythme actuel).
- **La Muda** : un calendrier clair (charge mer.–ven., sort sam., rentre dim.) et une promesse lisible (« la moitié en plus par détroit passé »). C'est la fiche la plus claire, mais je ne peux rien en faire le lundi.
- **La marée** : « L'encre monte d'une rangée chaque lundi… tu la repousses », un damier de huit carrés gris, quatre ligues. Je ne vois pas l'encre sur la planche, ni ce qu'elle me fait. La bulle de commande recouvre le bas de la fiche.
- **La Gazette** : une phrase, « paraît dimanche ». Rien d'autre.
- **Le Problème du jour** : « Le fil passe en 2 coups · un seul essai ». Sans avoir compris la Passe, c'est un essai perdu d'avance ; le message « Perdu, rien n'est pris » rassure.

### Téléphone : tailles et lenteurs

- Avec le WebGL logiciel de la machine d'audit (à ne pas confondre avec un vrai téléphone) : accueil interactif en ~14 s, lien magique → écran de fondation ~18 s, fondation → planche ~25 s, un glisser de la planche ~40 s, entrée dans l'île ~8 s. Les écrans DOM (fiches) répondent en moins d'une seconde.
- Fiches du bas : hauteur 45 à 75 % de l'écran ; la fiche Guerre et l'Arsenal prennent 80 % et masquent toute la planche, ce qui est acceptable pour un lieu, pas pour une ville.
- Les bulles (« Fil tendu vers Rialto », « Ce n'était pas la clef ») restent plus de dix secondes et passent sur l'en-tête des fiches (Arsenal).

## 4. Ce qui marche

- **L'entrée** : un courriel, un code ou un lien, un nom, un pavillon ; « Fonde ta Maison » est clair et joli ; le pavillon en aperçu donne envie.
- **Le fil rouge** est un très bon geste : visible, épais, il part de ma Maison et va jusqu'à Rialto ; les bobines du haut se vident d'une (« 1 tendue, 2 libres »). C'est le cœur du jeu et il se comprend sans mots.
- **La pose d'un atelier dans l'île** : « Ferme en main », les cases s'allument en « +50 % / ±0 % », la carte des bonus (sur pré, fournisseur à côté, voisin qui gêne) est lisible ; le bâtiment Porcellana qui apparaît est beau.
- **Les fiches de ville** : ce qu'elles demandent, ce que mon île fait, « ton île n'en fait pas » ; Rialto « achète tout » est le bon point de départ. Murano explique bien le détour (« 60 % de la charge, sans duel ni péage »).
- **Le profil** liste les prochains paliers avec ce qu'ils ouvrent (« une 4ᵉ bobine à 20 de Prestige ») et dit la règle d'or (« un niveau ouvre de la place et du choix, jamais un rendement »).
- **Le palais, le mardi** : « Cette semaine, à Rialto : toi 319 ducats, Ca' Contarini 59. Tu mènes : dimanche, son pavillon ira sur ta façade. » C'est la meilleure phrase du premier jour : elle donne une raison de revenir dimanche.
- **Le Lido** guide par des phrases (« Touche une galère… Touche le canal sud ») : c'est le modèle à reprendre pour la Passe.
- **La Muda** se lit d'un coup d'œil (calendrier de la semaine, trois détroits, +50 % chacun).

## 5. Mes trois recommandations prioritaires

1. **Un premier quart d'heure guidé sur la planche** (D1, D3, D6, D7, D9) : sous un projecteur, île → Ferme → Rialto → fil → une tour d'entraînement gagnée. Chantier du premier atelier immédiat, premier lot déjà là, aucune commande scellée ni lieu fermé tant que ce parcours n'est pas fini. À la fin, le niveau 2 (D5).
2. **Moins de choses à l'écran le premier jour** (D2, D12, D17, D19) : les six entrées de gauche repliées en une seule sur téléphone, et chaque lieu caché jusqu'à son ouverture, annoncé ce jour-là (« La Muda charge à partir d'aujourd'hui »). Le jour 1 se joue avec trois choses : l'île, les villes, les tours.
3. **Des chiffres vrais et une raison de revenir** (D4, D8, D10, D11, D14) : une seule Puissance, un seul rang, un compte à rebours qui tourne, la même unité de production partout ; au retour, une carte « pendant ton absence » (ventes, entrepôt plein, ce qui s'est ouvert) ; et un premier atelier qui se rembourse dans la journée, vérifié au simulateur.

## Annexe : les captures

| Capture | Ce qu'elle montre |
|---|---|
| `04-planche-arrivee.png` | La planche juste après la fondation : six boutons, la bulle de commande scellée, aucune ville en vue, étiquettes qui se chevauchent. |
| `05-fiche-maison.png` | La fiche de ma Maison : le seul conseil du jeu, et L'Arsenal proposé au niveau 1. |
| `07-ile-chantier.png` | « chantier · 8 min » pour un chantier annoncé à 5 min. |
| `08-menu-cache-maison.png` | « Ta Maison » sous les boutons Gazette et Problème du jour. |
| `09-premier-fil.png` | Le premier fil vers Rialto, « toi 0 % », « patine +0 % ». |
| `10-passe-indice.png` | La Passe : deux menaces cerclées, l'indice n'en nomme qu'une. |
| `11-passe-perdue.png` | La défaite au cinquième coup. |
| `14-retour-4h.png` | Le retour quatre heures après : aucune carte de retour, « Ta Maison » encore cachée. |
| `15-ile-entrepot-recouvre.png` | La carte Entrepôt sur une case achetable ; « 2 par heure » à la bâtisse. |
| `17-palais-rang.png` | Le palais : « 11ᵉ » quand la pastille dit « 3ᵉ ». |
