# Les ateliers de l'intérieur — plan complet (6 novembre 2026)

**Statut : plan pour développement, décidé par le porteur.** À lire en entier avant tout code. Il sera exécuté par un autre agent : tout ce qu'il faut savoir du jeu, du code et des décisions est ici ou dans les fichiers cités.

Demande du porteur (6 novembre 2026) : « Je veux que les ateliers soient vraiment gérés par le joueur avec une vraie complexité. Mais je ne pense pas que la manière actuelle soit la bonne : trop de texte et de clics. Il faudrait vraiment rentrer dans l'atelier et optimiser son fonctionnement : ses machines, ses employés, ses flux. » Réponses aux deux questions posées :

1. **Chaque atelier a son propre intérieur** : une scierie ne se joue pas comme une verrerie.
2. **On optimise une fois et ça tourne, et il y a aussi des événements à gérer** (usure, fatigue…). **L'optimisation possible doit être poussée** : un joueur appliqué doit pouvoir faire nettement mieux qu'un joueur pressé, et sentir pourquoi.

---

## 0. À lire d'abord (contexte obligatoire)

- `CLAUDE.md` : règles non négociables (montants en bigint deniers, taux en points de base, `ledger_entries` et `stock_movements`, logique pure dans `packages/engine`, production calculée **paresseusement à la lecture**, paramètres d'équilibrage dans `worlds.settings`, tests du moteur **avant** le code sur la fixture `test/fixture.ts`, jamais Venise ; tout changement d'équilibrage validé au simulateur de 24 mois et documenté dans `docs/calibration.md` ; petits commits ; langue du code anglais, interface français).
- **Les huit règles d'or** (CLAUDE.md, CADRAGE-v3 § 2). Celles qui contraignent ce plan :
  - **3. L'absence ne coûte rien, mais rien ne s'accumule sans fin.** Un atelier qu'on ne visite pas **ne perd rien** : il tourne au rythme de son dernier réglage et s'arrête quand sa file ou son stock est plein. L'usure et la fatigue **ralentissent**, elles ne **cassent** jamais rien de façon définitive et ne détruisent aucun bien.
  - **4. Le temps s'achète, la puissance jamais.** Les perles peuvent accélérer un chantier de machine, jamais acheter une machine, un ouvrier, un rendement.
  - **7. Quelques minutes, plusieurs fois par jour.** Une visite d'atelier utile tient en une à trois minutes ; le réglage profond est un plaisir, pas une corvée quotidienne.
  - **8. Tout se voit.** L'intérieur est d'abord **une scène qu'on touche** : machines, ouvriers, caisses qui circulent. Les chiffres accompagnent l'image, jamais ne la remplacent.
- **Direction visuelle** : Porcellana (`docs/plan-porcellana.md`, `docs/design.md` § Porcellana et § Porcellana ludique) — porcelaine blanche, un seul accent rouge de Venise, volumes biseautés explicites, pions tournés (`apps/web/src/porcellana/models/pawns.ts`), plateau partagé `apps/web/src/porcellana/TileBoard.tsx`, typographie Nunito/Manrope, touches en relief, monnaies dessinées (`apps/web/src/art/plateau/coins.tsx`).
- **« Chaque système absorbe les anciens au lieu de s'y ajouter »** (CLAUDE.md, façon de travailler). Ce plan **remplace** plusieurs systèmes existants (voir § 6).

## 1. Ce qui existe aujourd'hui (à remplacer ou absorber)

Moteur : `packages/engine/src/empire/workshops.ts`, `staff.ts`, `modules.ts`, `effects.ts`, `curves.ts`, `recipes.ts`, `knowledge.ts`, `family.ts`, `stores.ts`, `view.ts` ; réglages `settings.ts` (`workshops`, `staff`, `modules`, `research`, `qualities`, `arte`, `highRecipes`, `queueHours`) ; thème `packages/engine/src/themes/venice1450.ts` (15 bâtiments, leurs recettes) et `venice1450.empire.ts` (réglages, `MODULES`, `staff`).

- **Un atelier** (`EmpireWorkshop`, `state.ts`) : `type`, `recipe`, `level`, `tile` (sa case sur la carte carrée), `fitted` (modules posés), `job` (`ProductionJob` : la **file de nuit**, `batches` lots en file, `batchMs`, `startedAt`).
- **Production** : `relaunchWorkshop` remplit la file jusqu'à `queueHours` (12 h), **prélève les intrants d'un coup** ; `collectWorkshop` rend les lots finis, **à la lecture** : `Y(n)` lots × recette, `lotYieldBps(level)` (`curves.ts`, `yieldStepBps`), bonus `workshopYield` (modules, Arte, maître, lignée, savoirs) + `neighbourBonus` (cases voisines d'une chaîne qui se suit, `tilesTouch`), part de qualité (`quality` → `:fine`, `:exquisite`).
- **Effets lus par `houseEffect`** (`effects.ts`) : `workshopYield`, `workshopSpeed` (apprentis), `quality` (maître), `inputs` (four : économie d'intrants).
- **Modules d'atelier** (`MODULES`) : `tools` (rendement), `apprentices` (vitesse), `master` (qualité), `furnace` (intrants) — recherchés à la **Scuola**, posés dans les places de l'atelier (`moduleSlotsAt` : niveaux 1, 8, 15).
- **Personnel** (`staff.ts`) : `master` (placé sur un atelier : `workshopYield`, `quality`), `factor`, `captain` ; embauché à la Famille ; XP par lot.
- **Écran** : `apps/web/src/empire/map/WorkshopDock.tsx` (dock de l'atelier : lots, relance, niveau, modules, maître), `NewWorkshop.tsx`, feuilles Famille/Scuola (`World.tsx`) — **beaucoup de listes et de boutons**, ce que le porteur rejette.

## 2. La vision en une page

On **entre** dans un atelier (toucher l'atelier sur la carte, puis « Entrer » de sa fiche). L'écran devient **l'intérieur de l'atelier en porcelaine**, vu en trois quarts comme la carte : un **plancher de petites cases** (la « halle »), ses **postes** (machines) posés sur des cases, ses **ouvriers** (pions tournés) affectés aux postes, et les **flux** : les matières entrent par la **porte des intrants**, passent de poste en poste en **petites caisses** qui glissent sur des **rubans rouges** (la grammaire des routes de la carte), et sortent par la **porte des produits** vers le stock du fondaco.

Ce qu'on fait dedans, en touchant et en glissant :

- **Poser, déplacer, tourner une machine** sur le plancher. La distance entre deux postes qui se suivent coûte du temps de manutention : un plan serré produit plus.
- **Affecter des ouvriers** aux postes, les **déplacer** d'un poste à l'autre, les **faire tourner** (équipes de jour et de nuit). Chaque ouvrier a un **métier** et un **savoir-faire** qui monte en travaillant.
- **Lire le flux** : chaque poste montre son débit, ses caisses en attente, et **le goulot s'allume en rouge**. Le débit de l'atelier est celui de son poste le plus lent.
- **Régler** : la cadence d'un poste, la part de qualité (aller vite ou faire beau), la taille des lots, le stock tampon entre deux postes.
- **Entretenir** : une machine s'use et ralentit ; un ouvrier se fatigue et ralentit. Un geste (un toucher) les remet en état ; un bon plan d'atelier (un établi d'entretien, une rotation d'équipes) rend ces gestes rares.

Les **15 ateliers** ont chacun leurs postes, leur chaîne et leur difficulté propre (§ 4). Les ateliers simples (extraction) ont 2 ou 3 postes ; les ateliers d'élite (miroiterie, tailleur) en ont 5 à 7, avec des embranchements.

**Ce qui disparaît de l'interface** : la liste des modules à poser, le bouton « Tout relancer », la feuille de la Scuola pour l'atelier, le personnel « maître » en liste. Ils deviennent des **choses dans la halle** (§ 6).

## 3. Le modèle de jeu

### 3.1 La halle

- Un plancher de `W × H` cases (« dalles »), qui grandit avec le **niveau de l'atelier** : niveau 1 : 4 × 3 ; puis +1 colonne ou +1 rangée tous les quelques niveaux, jusqu'à 9 × 6 au niveau maximal (`maxLevel`). Table dans les réglages : `interior.floorAt: [[level, w, h], …]`.
- Deux **portes fixes** sur le bord : `in` (intrants, côté route du fondaco) et `out` (produits). Leur position est propre à chaque type d'atelier.
- Des dalles **murées** (piliers, foyer, puits) propres au type, qui contraignent le plan (la verrerie a son four central fixe, la scierie un canal d'eau qui traverse).

### 3.2 Les postes (machines)

Chaque type d'atelier a un **catalogue de postes** (§ 4). Un poste :

- occupe une emprise (1 × 1, 2 × 1, 2 × 2), **orientée** (entrée d'un côté, sortie de l'autre) ;
- a une **étape** de la chaîne (`stage`) : il transforme ce qui arrive de l'étape précédente ;
- a un **temps de cycle** de base `cycleS` (secondes par unité traitée), une **capacité** (unités par cycle), un **nombre de places d'ouvriers** (1 à 3) et des **métiers acceptés** ;
- a des **niveaux** (1 à 5) qui se construisent comme un petit chantier (ducats et minutes, accélérables aux perles) : −cycle, +capacité, +1 place à certains niveaux ;
- a un **état** : `wear` (usure, 0 à 10 000 bps).

Un atelier peut avoir **plusieurs postes de la même étape** en parallèle : c'est la manière normale de casser un goulot.

### 3.3 Les ouvriers

- Remplacent le personnel « maître » actuel et les modules « apprentis » : on **embauche** des ouvriers à la Famille ou **dans l'atelier** (« Embaucher » à la porte), dans la limite de places de la maison (`staffSlots`, qui grandit avec la Casa, comme aujourd'hui).
- Un ouvrier a : `trade` (métier : `sawyer` scieur, `carpenter`, `glassblower` verrier, `potter`, `weaver`, `miller`, `labourer` manœuvre polyvalent…), `skill` (savoir-faire 1 à 30, qui monte avec les unités traitées, comme `gainXp`), `rarity` (commun, rare, illustre : multiplicateurs actuels `rarityBps`), `fatigue` (0 à 10 000 bps), son **poste** et son **équipe** (`day` | `night`).
- Un ouvrier sur un poste de son métier travaille à 100 % + son savoir-faire ; un manœuvre à 70 % ; un métier étranger au poste à 50 %.
- **Fatigue** : monte pendant qu'il travaille, redescend pendant qu'il se repose. Une équipe de nuit permet de faire tourner un poste 24 h avec deux ouvriers qui se relaient ; un seul ouvrier sur un poste tourne avec un rendement qui baisse à mesure qu'il se fatigue, jusqu'à un plancher (60 %). **Jamais d'arrêt, jamais de perte.**
- Les **membres de la famille** (rares, illustres) arrivent comme des ouvriers spéciaux avec un **trait** (un effet propre : « l'œil du verrier » +qualité au soufflage, « main sûre » −usure du poste où il travaille).

### 3.4 Les flux

- Les unités circulent **en caisses** de l'étape `k` à l'étape `k+1`. Entre deux postes qui se suivent, la **manutention** coûte `handlingS × distance` (distance de Manhattan en dalles, de la sortie de l'un à l'entrée de l'autre), sauf si un **convoyeur** (rail, goulotte, chariot : un poste « de transport » d'1 dalle, posé en chaîne) les relie : alors la manutention tombe à presque rien.
- Chaque liaison a un **tampon** (nombre de caisses en attente, réglable, plafonné) : un tampon plus grand lisse les variations (une machine usée, une équipe qui change) mais immobilise des intrants.
- **Embranchements** : certains ateliers produisent un sous-produit (sciure de la scierie → combustible pour la briqueterie voisine ; chutes de verre → refondues) qu'on peut envoyer vers la porte `out` ou **recycler** dans l'atelier.

### 3.5 La qualité

- Chaque poste a un **réglage** « vite ↔ soigné » (0 à 100 %) : soigné allonge le cycle et augmente la part de produits `:fine` / `:exquisite` (les qualités existantes, `qualities` dans les réglages).
- Un poste d'**inspection** (dans les ateliers d'élite) écarte les pièces ratées vers le recyclage et relève la qualité de la suite.
- La qualité finale d'un lot est la combinaison de la qualité des étapes (règle en § 5.4).

### 3.6 Les événements (usure, fatigue, incidents)

- **Usure** d'une machine : `wear` monte avec les unités traitées (`wearPerUnitBps` par poste) ; la vitesse du poste baisse de `wear × wearSlowdown` jusqu'à un plancher (70 %). Un toucher « Entretenir » sur la machine la remet à 0 contre un peu de ducats ou de bois/métal (selon l'atelier), **sans attendre**. Un **établi d'entretien** posé dans la halle entretient tout seul les machines à moins de N dalles (l'optimisation remplace la corvée).
- **Fatigue** : § 3.3.
- **Incidents** (rares, déterministes, tirés de la graine de l'atelier et de l'heure) : une lame qui casse (le poste ralentit fort jusqu'à l'entretien), un arrivage de bois humide (cycle plus long au séchage pendant quelques heures), une commande pressée de la ville (prime si l'atelier sort N unités `:fine` avant une heure). Aucun incident ne détruit un bien ni ne coûte des ducats d'office ; tous se lisent dans la halle (une étincelle, une fumée, un pion qui lève la main) et dans l'avis du retour.
- **Règle 3** : hors de la vue du joueur, un atelier « s'auto-entretient au minimum » : l'usure plafonne au plancher, la fatigue au plancher ; il ne s'arrête que file pleine ou stock plein. Un joueur absent une semaine retrouve un atelier lent, jamais cassé.

### 3.7 Ce qu'on optimise (profondeur visée)

Le joueur appliqué agit sur, au minimum :

1. **Le plan** (placement et orientation des postes, longueur des liaisons, convoyeurs) ;
2. **L'équilibrage de la chaîne** (nombre de postes par étape pour aligner les débits ; le goulot) ;
3. **L'affectation** (le bon métier au bon poste ; le meilleur ouvrier sur le goulot ; équipes jour/nuit) ;
4. **Les niveaux des machines** (quelle machine améliorer d'abord : le goulot) ;
5. **Les tampons** (absorber les écarts sans immobiliser trop d'intrants) ;
6. **La qualité** (où soigner, où aller vite ; l'inspection) ;
7. **L'entretien** (établi bien placé, rotation) ;
8. **Les sous-produits** (recycler ou vendre) ;
9. **La chaîne entre ateliers** : les cases voisines sur la carte (bonus actuel `neighbourBonus`) deviennent une **liaison directe** : un atelier qui touche son fournisseur reçoit ses intrants sans passer par le stock (gain de manutention et de tampon).

**Ordre de grandeur cible** (à calibrer au simulateur, § 9) : un atelier « posé sans réfléchir » (plan par défaut, ouvriers au hasard) produit **100 %** ; un atelier bien optimisé au même niveau **160 à 220 %** ; la différence vient pour un tiers du plan, un tiers de l'équilibrage et de l'affectation, un tiers des niveaux de machines, de la qualité et de l'entretien. Les gains doivent être **visibles** à chaque geste (le débit de l'atelier change à l'écran au moment où l'on lâche la machine).

## 4. Les 15 intérieurs (catalogue de départ)

Chaque ligne : étapes dans l'ordre (postes possibles), particularités de la halle, difficulté. Les chiffres sont des **valeurs de départ** à calibrer ; ils vont dans `venice1450.empire.ts` (`interior.buildings[type]`), jamais en dur dans le code.

| Atelier (type) | Chaîne d'étapes et postes | Particularités | Difficulté |
|---|---|---|---|
| Ferme (`farm`) | semer (sillon) → récolter (faucille) → battre (aire de battage) | parcelles extérieures 2 × 2 ; la saison n'existe pas, mais l'aire est le goulot | ★ |
| Carrière d'argile (`clay_pit`) | extraire (pioche, puits) → laver (bac) | un puits fixe, l'eau du bac | ★ |
| Camp de bûcherons (`lumber_camp`) | abattre → ébrancher → empiler | un sous-produit : les branches (combustible) | ★ |
| Sablière (`sand_pit`) | draguer → tamiser | tamis à niveaux (qualité du sable → qualité du verre) | ★ |
| Bergerie (`sheepfold`) | tondre → trier la laine | le tri fait la qualité | ★ |
| Moulin (`mill`) | trier le blé → moudre (meule) → bluter (tamis) | la meule est une grosse machine 2 × 2 au centre, fixe ; la roue tourne avec le vent (visuel) | ★★ |
| Boulangerie (`bakery`) | pétrir → façonner → cuire (four) → refroidir | le four est le goulot ; il consomme du bois : placer la réserve de bois près du four | ★★ |
| Scierie (`sawmill`) | écorcer → scier (banc) → sécher (séchoir) → raboter | un canal d'eau qui traverse la halle (scie hydraulique : le banc près du canal va plus vite) ; sciure → combustible | ★★ |
| Briqueterie (`brickworks`) | malaxer → mouler → sécher → cuire (four) | séchoir à 2 × 2, four à 2 × 2 ; combustible bois ou sciure | ★★★ |
| Verrerie de Murano (`glassworks`) | trier le sable → fondre (four central fixe) → souffler → recuire (arche) → inspecter | four central fixe au milieu ; les souffleurs autour ; chutes recyclées au four | ★★★★ |
| Métier à tisser (`loom`) | carder → filer (rouet) → tisser (métier) → fouler | métiers 2 × 1 alignés ; la filature est le goulot naturel | ★★★ |
| Atelier de tailleur (`tailor`) | couper → coudre → broder → presser | la broderie fait l'exquis ; postes à 3 places | ★★★★ |
| Miroiterie (`mirrorworks`) | découper le verre → polir → étamer → encadrer (planches) → inspecter | deux intrants qui se rejoignent à l'encadrement : la chaîne en Y | ★★★★★ |
| Épicerie fine (`spicery`) | trier → moudre → doser → emballer | petites quantités, cycles longs : la qualité prime | ★★★ |
| Palais (`palazzo`) | — | n'est pas un atelier de production : **hors périmètre** de ce plan | — |

Postes **communs** à tous : **convoyeur** (1 × 1, relie deux dalles voisines), **réserve** (tampon matériel visible, 1 × 1), **établi d'entretien** (1 × 1), **poste d'inspection** (ateliers ★★★ et plus), **dortoir/repos** (diminue la fatigue des ouvriers qui le touchent par l'équipe au repos ; ateliers ★★ et plus).

## 5. Le moteur (packages/engine)

### 5.1 Données (état)

Dans `EmpireWorkshop` (`state.ts`), ajouter `interior?: WorkshopInterior` :

```ts
interface WorkshopInterior {
  /** Version du catalogue du type (migration). */
  v: number;
  stations: Station[];        // ordre stable, id `s1`, `s2`…
  links: Link[];              // liaisons explicites (convoyeurs) ; les autres sont implicites (étape k → k+1, au plus proche)
  buffers: Record<string, number>; // tampon réglé par liaison (« s1>s3 ») en caisses
  /** Dernier instant où l'état continu a été réglé (usure, fatigue, avance de la chaîne). */
  settledAt: number;
  /** Graine des incidents. */
  seed: number;
  incidents?: Incident[];     // en cours
}
interface Station { id: string; kind: string; x: number; y: number; rot: 0 | 1 | 2 | 3; level: number; wear: number; care: number /* 0..10000 vite→soigné */; }
interface Link { from: string; to: string; via: [number, number][] /* dalles du convoyeur */ }
```

Les ouvriers restent dans `h.staff` (`EmpireStaff`) ; on ajoute `trade`, `fatigue`, `station?: { workshopId, stationId, shift: "day" | "night" }`. Le champ `placedAt` actuel (maître) migre vers `station`.

**La file de nuit reste** (`job`) : c'est elle qui garantit la règle 3 (plafond) et la paresse. Ce qui change : `batchMs` et le rendement d'un lot ne viennent plus de `level` + effets globaux, mais du **débit calculé de l'intérieur** (§ 5.3), figé au moment où la file est remplie (comme aujourd'hui le niveau est figé : `job.level`). Un réglage de l'intérieur **règle d'abord** ce qui est fait, puis **recalcule** la cadence des lots suivants (pas de rétroactivité, pas d'exploit).

### 5.2 Réglages (`settings.ts`, validés par zod, valeurs dans le thème)

```ts
interior: z.object({
  floorAt: z.array(z.tuple([positive, positive, positive])),  // [niveau, w, h]
  handlingSPerTile: positive,
  conveyorHandlingS: qty,
  bufferMax: positive,
  wear: z.object({ perUnitBps: qty, slowdownFloorBps: bps, careCostDucats: money }),
  fatigue: z.object({ perHourBps: qty, restPerHourBps: qty, floorBps: bps }),
  tradeFit: z.object({ same: bps, labourer: bps, other: bps }),
  skillPerLevelBps: qty,
  incidents: z.object({ perDayChanceBps: bps, kinds: z.record(…) }),
  stations: z.record(z.string(), StationKind),   // catalogue commun et par type
  buildings: z.record(z.string(), z.object({
    doors: z.object({ in: z.tuple([qty, qty]), out: z.tuple([qty, qty]) }),
    walls: z.array(z.tuple([qty, qty])),
    stages: z.array(z.object({ code: z.string(), stations: z.array(z.string()) })),
    byproduct: z.object({ good: z.string(), perUnit: qty, stage: z.string() }).optional(),
    preset: z.array(…),  // le plan « par défaut » d'un atelier neuf ou migré
  })),
}).optional()
```

Absent : le monde garde les ateliers d'aujourd'hui (les tests du moteur existants passent inchangés). Le drapeau d'activation est la présence de `interior` dans les réglages — comme `map.grid` pour les cases carrées.

### 5.3 Le calcul du débit (fonction pure, le cœur)

`interiorThroughput(ws, h, s, at): { unitsPerHour: number; stageRates: number[]; bottleneck: string; qualityBps: number; byproductPerHour: number }` dans un nouveau fichier `packages/engine/src/empire/interior.ts`.

1. Pour chaque poste : `rate = capacity / effectiveCycle`, où `effectiveCycle = cycleS × levelFactor × (1 + careSlowdown) / (workersFactor × wearFactor)` ; `workersFactor` = somme sur les ouvriers présents (selon l'équipe active et la moyenne jour/nuit sur 24 h) de `tradeFit × (1 + skill × skillPerLevelBps) × rarity × fatigueFactor`, plafonnée par les places.
2. Débit d'une étape = somme des postes de l'étape.
3. Manutention : chaque liaison étape `k → k+1` ajoute `handlingSPerTile × distance` par unité (ou `conveyorHandlingS` si convoyeur) ; elle se convertit en une **perte de débit** de l'étape aval (le temps passé à porter).
4. Débit de l'atelier = **min** des débits d'étape (après manutention), × le rendement d'intrants de la recette (`inputs`/`outputs` du thème restent la vérité : une « unité » de l'intérieur = un lot de recette divisé par le nombre d'unités par lot, à fixer par type).
5. Tampons : un tampon ≥ `k` caisses rend au débit la part perdue par les **variations** (usure, changement d'équipe, incidents) : modélisée en espérance (formule fermée), pas en simulation fine.
6. Qualité : combinaison des `care` des étapes (moyenne pondérée par l'étape, + inspection), donne `qualityBps` qui remplace l'effet global `quality` pour cet atelier.

**Important** : la fonction est **pure, déterministe, en entiers** pour tout ce qui touche à l'argent et aux stocks (taux en bps, quantités entières ; les flottants seulement dans l'affichage). Elle sert au moteur (cadence de la file) **et** à l'écran (affichage instantané pendant qu'on glisse une machine) : même code, importé par le web.

### 5.4 Usure, fatigue, incidents : réglés à la lecture

`settleInterior(ws, h, s, now)` appelé par `collectWorkshop` (et par toute commande qui touche l'atelier) : avance `wear` et `fatigue` de `settledAt` à `now` en formule fermée (montée linéaire bornée par le plancher), tire les incidents dus (graine + heure, `seededRandom` du moteur), puis `settledAt = now`. Pas de tick serveur (règle « production calculée paresseusement »).

### 5.5 Commandes (`commands.ts`, préfixe `empire*`, schémas zod côté serveur `apps/server/src/game/empire.ts`)

| Commande | Effet | Coût |
|---|---|---|
| `empireInteriorPlace` `{ workshopId, kind, x, y, rot }` | pose un poste (construit au niveau 1) | ducats + minutes de chantier (file des chantiers existante, `buildSlots`) |
| `empireInteriorMove` `{ workshopId, stationId, x, y, rot }` | déplace / tourne un poste | gratuit, instantané (on veut qu'on essaie) ; interdit pendant un chantier du poste |
| `empireInteriorRemove` `{ workshopId, stationId }` | retire un poste | rend 50 % de son coût |
| `empireInteriorUpgrade` `{ workshopId, stationId }` | niveau + 1 du poste | ducats + minutes ; accélérable aux perles (règle 4) |
| `empireInteriorLink` / `Unlink` `{ workshopId, from, to, via }` | pose / retire un convoyeur | ducats par dalle |
| `empireInteriorBuffer` `{ workshopId, link, size }` | règle un tampon | gratuit |
| `empireInteriorCare` `{ workshopId, stationId, care }` | règle vite ↔ soigné | gratuit |
| `empireInteriorMaintain` `{ workshopId, stationId? }` | entretien (un poste, ou tous) | ducats ou matière, instantané |
| `empireStaffAssign` `{ staffId, workshopId, stationId, shift }` | affecte un ouvrier | gratuit, instantané ; remplace l'affectation actuelle du maître |
| `empireStaffHire` | (existe : `hireStaff`) gagne un `trade` | inchangé sauf le métier |

Toutes ces commandes : **règlent d'abord** l'atelier (`collectWorkshop` + `settleInterior`), puis modifient, puis **recalculent** la cadence des lots non commencés de la file. Elles passent par `ledger_entries` pour l'argent et `stock_movements` pour les matières (entretien, convoyeurs), comme le reste.

### 5.6 Vue (`view.ts`)

`EmpireView.house.workshops[i].interior` : la halle (dimensions, portes, murs), les postes avec leur état réglé à `now`, les liaisons, les tampons, les ouvriers affectés, et **le résultat de `interiorThroughput`** (débit, débits d'étape, goulot, qualité). Le client recalcule localement pendant les glisser-déposer (même fonction), puis envoie la commande au lâcher.

### 5.7 Migration (ateliers existants)

`migrateInterior(ws, h, s)` appelé par `ensureMap` ou l'équivalent (une fois par atelier, à la lecture, comme `migrateToSquare`) :

- La halle à la taille de `level`.
- Le **plan par défaut** du type (`preset`) posé ; le nombre de postes par étape choisi pour que le débit migré soit **égal** (± 2 %) au débit actuel de l'atelier (rendement `lotYieldBps(level)` + effets) : **personne ne perd de production à la bascule**. Test obligatoire.
- Les **modules** posés (`fitted`) deviennent des postes ou des niveaux : `tools` → +1 niveau aux postes de l'étape principale ; `apprentices` → un poste en parallèle à l'étape la plus lente ; `master` → `care` relevé + l'inspection si le type en a ; `furnace` → établi d'économie (réduction d'intrants, effet `inputs` conservé, porté par un poste « four économe » des types à four).
- Le **maître** placé sur l'atelier devient un ouvrier affecté au goulot, son niveau converti en `skill`.
- Les **recherches** de la Scuola sur l'atelier (`h.modules.tools` etc.) : remboursées en **crédits de poste** (le joueur choisit où les poser) ; jamais en ducats (règle 4 : pas de conversion qui achèterait de la puissance). À arbitrer au simulateur.

## 6. Ce qui disparaît, ce qui reste

- **Disparaît** : les modules d'atelier (`kind: "workshop"`) de la Scuola et leurs places (`moduleSlotsAt`), le personnel « maître » en tant que bonus global, le bouton « Tout relancer » (la file se remplit à la visite de l'intérieur et au geste « Relancer » de la fiche), la partie « atelier » des feuilles Famille et Scuola. Les savoirs (`knowledge.ts`) qui touchaient `workshopYield` deviennent des **recettes de postes** (débloquer un poste de niveau supérieur, un convoyeur plus rapide) — à détailler en P6.
- **Reste** : la file de nuit et son plafond `queueHours`, les recettes du thème, les niveaux d'atelier (qui agrandissent la halle et ouvrent des postes), le bonus de voisinage (§ 3.7 point 9), les qualités, l'Arte (son bonus de chaîne devient un bonus aux postes des ateliers de sa chaîne), les salaires (`salaries.ts` : le salaire d'un ouvrier suit son `skill` ; à calibrer).
- **Docs à mettre à jour** : `docs/design.md` (§ Porcellana ludique : l'intérieur), `docs/plan-porcellana.md` (lots), `CLAUDE.md` (une ligne : où vit l'intérieur), `IDEAS.md` (ce qui est repoussé).

## 7. L'écran (apps/web)

### 7.1 Entrer

- Sur la carte, la fiche d'un atelier (`PlaceCard`, `apps/web/src/porcellana/PlaceCard.tsx`) : « Entrer » ouvre l'intérieur. Le dock actuel (`WorkshopDock.tsx`) **disparaît** au profit de l'intérieur ; il ne reste sur la fiche que l'état (lots prêts, « Récolter », « Relancer ») et « Entrer ».
- L'intérieur est une scène plein écran comme la Porta (`apps/web/src/empire/porta/PortaScene.tsx` est le modèle à suivre : `TileBoard`, en-tête en pilule, dock à droite sur ordinateur, en bas sur téléphone, sous la barre du haut `--topbar`).

### 7.2 La scène (3D Porcellana)

- **Plancher** : les dalles en porcelaine, plus petites que les cases de la carte (une halle de 9 × 6 tient à l'écran d'un téléphone), avec la même lumière (`Stage`, sans occlusion sur téléphone), le même biseau.
- **Postes** : un modèle par `kind`, dans la grammaire du kit (`apps/web/src/porcellana/shapes.ts` : `box`, `cyl`, `extrude`, `cached`), **explicites** (on reconnaît une scie, un four, un rouet, une meule sans légende), animés **seulement** quand ils travaillent (lame qui va-et-vient, roue qui tourne, lueur du four `kilnGlow`), ralentis visiblement quand ils sont usés.
- **Ouvriers** : les pions tournés (`pawns.ts`) à leur poste, un petit signe de métier (outil) ; un pion fatigué se penche ; un pion de l'équipe au repos est assis au dortoir.
- **Flux** : rubans rouges (`ribbon.ts`) entre les postes, **petites caisses** qui avancent à la vitesse du débit réel (lue de `interiorThroughput`) ; un tampon se voit comme une pile de caisses sur la réserve.
- **Goulot** : le poste goulot porte un anneau rouge pulsant et son étiquette « Goulot » ; une liaison trop longue se teinte.
- **Repères** (`pc-pin`) : sur chaque poste, son débit (unités/h) en Nunito ; sur la porte `out`, le débit de l'atelier.

### 7.3 Les gestes

- **Glisser une machine** : la machine suit le doigt, se cale sur les dalles libres (dalles interdites en rouge), le **débit de l'atelier se met à jour en direct** pendant le glissé (calcul local), on lâche → commande `empireInteriorMove`.
- **Toucher une machine** : sa fiche (carte d'encre de la Porcellana ludique) : niveau, usure (anneau), « Améliorer » (touche rouge), « Entretenir », réglage **vite ↔ soigné** (un curseur), « Retirer ».
- **Glisser un ouvrier** d'un poste à l'autre ; un double toucher bascule son équipe jour/nuit.
- **Le tiroir des postes** (en bas, comme la Remise de la maquette D) : les postes disponibles du type, en vignettes rondes, à glisser sur le plancher.
- **Un bouton « Plan conseillé »** (Lorenzo) : propose un plan correct mais pas optimal (le joueur pressé s'en contente, le joueur appliqué fait mieux).

### 7.4 Interface textuelle minimale

- En tête : nom de l'atelier, niveau, **débit (unités/h)** en gros chiffres fins, qualité (losanges), et le **gain par rapport au plan par défaut** (« +64 % »).
- Aucune liste de modules, aucune table. Chaque chiffre est posé sur l'objet qu'il décrit.

### 7.5 Performance

- Un seul canvas : l'intérieur remplace la carte (sur téléphone, la carte libère sa 3D comme pour la Porta : `EmpireGame.tsx`, condition `!wide && …`).
- Modèles instanciés pour les dalles et les caisses ; `bake()` pour les postes immobiles ; `frameloop="demand"` + `Pace` quand rien ne bouge.

## 8. Lots (dans l'ordre, chacun livrable seul, petits commits)

| Lot | Contenu | Critères d'acceptation |
|---|---|---|
| **A0** | Ce plan validé, `docs/plan-ateliers.md` à jour ; un **prototype de laboratoire** (`?lab=porcellana&vue=atelier`) : la scierie en intérieur statique (plancher, 4 postes, 3 ouvriers, rubans, caisses), sans moteur | Le porteur voit la scierie et valide le rendu avant toute règle |
| **A1** | Moteur : réglages `interior` (zod), types d'état, `interiorThroughput` (pur) ; **tests avant le code** sur la fixture (`test/fixture.ts`, un type d'atelier factice à 3 étapes) | Débit = min des étapes ; manutention ; convoyeur ; métiers ; fatigue/usure en formule fermée ; déterminisme |
| **A2** | Moteur : `settleInterior`, branchement dans `collectWorkshop` / `relaunchWorkshop` (cadence de la file), migration `migrateInterior` (débit conservé ± 2 %), toutes les commandes § 5.5 | Tests : migration sans perte ; un réglage ne change que les lots non commencés ; règle 3 (absence d'une semaine : ralenti, rien de perdu, plafond tenu) ; argent par `ledger_entries`, matières par `stock_movements` |
| **A3** | Thème : les 14 intérieurs (§ 4) dans `venice1450.empire.ts` ; `preset` de chacun | Chaque type a un plan par défaut valide ; test de forme sur le thème |
| **A4** | Serveur : schémas zod des commandes, routes, vue | Tests d'intégration serveur (PGlite) : poser, déplacer, affecter, entretenir |
| **A5** | Web : la scène de l'intérieur (lecture seule) : plancher, postes, ouvriers, flux, goulot, repères ; entrée depuis la fiche | Captures bureau 1440 × 900 et téléphone 390 × 844 ; pas de débordement (`assertNoOverflow`) |
| **A6** | Web : les gestes (glisser machine avec débit en direct, fiche de poste, glisser ouvrier, tiroir des postes, plan conseillé) | e2e `apps/web/e2e/atelier.mjs` : entrer, déplacer un poste, voir le débit monter, affecter un ouvrier, entretenir, sortir |
| **A7** | Retrait : modules d'atelier de la Scuola, maître global, `WorkshopDock` remplacé, feuilles allégées ; savoirs convertis | Plus aucun écran de liste pour l'atelier ; tests et e2e verts |
| **A8** | Équilibrage : simulateur de 24 mois (`pnpm --filter @comptoirs/simulator empire`, toutes les graines), bots qui optimisent à trois niveaux (pressé, moyen, appliqué) ; `docs/calibration.md` | Écart pressé → appliqué dans la cible (§ 3.7) ; l'économie globale (prix, commandes, Casa) reste dans ses bornes actuelles ; notes de chapitre rédigées (règle : un changement du commerce s'annonce avant de s'appliquer) |
| **A9** | Incidents et commandes pressées ; avis du retour (« pendant ton absence : la lame de la scierie a cassé, ralentie de 30 % depuis 4 h ») | Tests de déterminisme ; aucun incident ne détruit de bien |

### État des lots

- **A0 — prototype fait (6 novembre 2026), en attente du regard du porteur.** `?lab=porcellana&vue=atelier` : la scierie au niveau 3, halle de 6 × 4 dalles murée au nord et à l'ouest, canal traversant (4ᵉ colonne) et sa passerelle, un pilier ; quatre postes (écorçoir, banc de scie à roue hydraulique sur le canal, séchoir, rabot), trois ouvriers (pion `worker` à bonnet), les rubans rouges de la porte des troncs à la porte des planches, des caisses qui y circulent, le goulot (banc de scie) cerné d'un anneau rouge qui respire ; repères en pilule (débit de chaque poste, « Goulot · 8/h » en rouge), fiche au toucher, en-tête (débit, qualité, « Plan par défaut »). Chiffres d'exemple, aucun moteur. Code : `apps/web/src/porcellana/LabAtelier.tsx`, modèles `apps/web/src/porcellana/models/interior.ts` ; `TileBoard` accepte un `mover` (les caisses au lieu des charrettes) et des repères `tag`/`hot`. Les questions du § 11 restent à trancher avant A1.

- **A0 validé par le porteur (6 novembre 2026).**
- **A1 — fait (6 novembre 2026).** Réglages `interior` (zod, `packages/engine/src/empire/interior/settings.ts`, optionnels : leur présence est le drapeau), types `WorkshopInterior`, `InteriorStation`, `InteriorLink` et champs d'ouvrier `trade`, `fatigue`, `station` (`state.ts`), fonctions pures `interiorThroughput`, `hallAt`, `stationPorts`, `stationTiles`, `interiorLayoutProblem`, `wearFactorBps`, `wearAfter`, `fatigueFactorBps`, `fatigueWorking`, `fatigueResting` (`interior/throughput.ts`) ; 23 tests sur la fixture (`testInterior`, atelier factice `test_works` à 3 étapes). Choix faits en codant, à relire : les débits sont en **millièmes d'unité par heure** (entiers) ; un niveau de poste est une ligne explicite (`cycleS`, `capacity`, `seats`, coût, minutes) ; l'étape d'un poste est lue dans `buildings[type].stages` (un même poste peut servir deux types) ; les tampons sont réglés par frontière d'étapes (« cut>press ») ; un poste sans place d'ouvrier (`seats: 0`) tourne seul, un poste qui en veut et n'en a pas est à l'arrêt ; une seule équipe couvre les 24 h, deux équipes donnent leur moyenne (le gain des deux équipes est la fatigue) ; le savoir-faire est le `level` de l'ouvrier ; les incidents (A9) n'ont pas encore de réglages.

- **A2 — fait (6 novembre 2026).** Moteur branché (`packages/engine/src/empire/interior/run.ts`, `commands.ts`) ; 15 tests (`test/empire/interior-run.test.ts`). Ce qui a été tranché en codant, à relire :
  - **La cadence est relative au plan par défaut, frais** : un lot dure `durée de la recette ÷ (débit de l'intérieur ÷ débit du plan par défaut neuf)`. La migration est donc exacte (cadence 10 000 bps, aucun lot perdu) et le gain s'affiche tel quel (« +11 % »). Le niveau d'atelier, Y(n), les modules, le maître et les savoirs gardent leurs effets jusqu'à A7, qui les convertira en postes.
  - **Les ouvriers sont ceux de l'atelier** (`interior.hands`, embauchés à la porte, plafond : 2 par place de poste), pas le personnel de la maison ; la migration en pose un du bon métier à chaque poste qui en veut. Le personnel de la famille pourra être affecté plus tard (le calcul le lit déjà par `station`). Pas encore de salaire (A8).
  - **Un poste placé ou amélioré** est un petit chantier propre (`readyAt`), qui n'occupe pas les `buildSlots` de la maison ; pendant l'amélioration il tourne au niveau d'avant. Perles : plus tard.
  - **Déplacer est gratuit** mais retire les convoyeurs du poste (moitié remboursée) ; retirer un poste rend `refundBps` (50 %) de ce qu'il a coûté.
  - **Usure et fatigue** réglées à la lecture : l'usure suit les unités faites pendant que la file tournait, la fatigue monte au travail (moitié du temps s'il y a deux équipes) et redescend au repos. Un atelier dont un poste attend ses ouvriers ne remplit plus sa file (rien n'est perdu, rien ne s'accumule).
  - **Équilibrage à reprendre en A8** : avec les planchers de départ (usure 70 %, fatigue 60 %), un joueur qui n'entretient jamais finit plus lent qu'avant la bascule ; § 9 veut qu'il ne perde rien : relever les planchers ou payer l'entretien de base, au simulateur.

- **A3 — fait (6 novembre 2026).** Les 14 intérieurs de Venise dans `packages/engine/src/themes/venice1450.interior.ts` (`venice1450Interior`), et `venice1450EmpireInterior` (le monde en cases carrées avec les intérieurs). **Pas branchés sur les mondes de Venise** : la présence d'`interior` est l'interrupteur, et l'allumer change le commerce ; c'est la décision du porteur, après A8 et les notes du chapitre. Chaque poste a cinq niveaux (cycle −15 % puis −28 %, −38 %, −46 % ; une place de plus au niveau 3, une unité de plus par cycle au niveau 5 ; prix doublé à chaque niveau, chantiers de 5 min à 12 h). La halle passe de 4 × 3 (niveau 1) à 9 × 6 (niveau 20). Goulots du plan par défaut, tenus par un test : l'aire de battage, la meule, le four du boulanger, le banc de scie, le four de la briqueterie, le four de Murano, le rouet. Les inspections sont des postes communs (verrerie, tailleur, miroiterie, épicerie). Pas de sous-produit pour l'instant (le thème n'a ni sciure ni branches) ; le canal de la scierie est un mur (la scie hydraulique « plus rapide près du canal » viendra avec les effets de voisinage d'un poste) ; la chaîne en Y de la miroiterie est linéaire. 46 tests de forme (`test/empire/interior-theme.test.ts`).

- **A4 — fait (6 novembre 2026).** Serveur : les onze commandes `empireInterior*` passent par la route existante `/api/empire/actions`, chacune avec son schéma zod (`apps/server/src/game/empire.ts`, coordonnées 0 à 16, soin 0 à 10 000, convoyeur de 64 dalles au plus) ; l'interrupteur **`EMPIRE_INTERIOR`** (`off` par défaut, sur les cases carrées seulement) ouvre le monde avec `venice1450EmpireInterior` ; éteint, les réglages `interior` sont retirés du monde (les intérieurs déjà posés restent dans l'état, non lus). La vue porte `interiors` (par atelier : halle, portes, murs, étapes, postes et ouvriers réglés à maintenant sur une copie, convoyeurs, tampons, débit et goulot, cadence) et `interiorRules` (les réglages, pour le calcul local pendant un glisser) ; moteur `packages/engine/src/empire/interior/view.ts`, 3 tests ; serveur 5 tests d'intégration sur PGlite (`apps/server/test/empire-interior.test.ts` : vue, poser/déplacer/entretenir avec le prix au journal, embaucher et affecter, refus du schéma (400) et du moteur (422), monde éteint).

- **A5 — fait (6 novembre 2026), en attente du regard du porteur.** La scène de l'intérieur, en lecture seule (`apps/web/src/empire/interior/InteriorScene.tsx`, plateau pur `board.ts`, 5 tests `apps/web/test/interiorBoard.test.ts`) : la halle sur le plateau Porcellana (`TileBoard`), murée au nord et à l'ouest, une arche à la porte quand elle donne sur ces murs, une pile de caisses sinon ; un mur de bout en bout devient le canal ; chaque poste sur son emprise, tourné, ses ouvriers de jour devant lui, en chantier sous un échafaudage ; les rubans rouges de la porte des intrants à chaque poste de la première étape, de chaque poste au plus proche de l'étape suivante, jusqu'à la porte des produits, et les caisses qui y glissent quand la file tourne ; le goulot cerné d'un anneau rouge qui respire et son repère « Goulot · 13/h » en rouge ; les repères parlent la marchandise de l'atelier à l'heure (le débit du poste × planches par unité), la porte des produits donne le débit de l'atelier ; l'en-tête (nom, niveau, planches/h, qualité en losanges, « +x % sur le plan d'origine ») ; au toucher, la fiche du poste (niveau, ouvriers, usure, une phrase). Modèles : les quatre postes de la scierie (ceux du laboratoire) et un modèle par famille pour les 46 autres (`porcellana/models/stations.ts` : four voûté à la bouche rougeoyante et sa fumée, roue ou meule qui tourne, séchoir à planches sous un toit, table d'inspection à la lentille rouge, établi à l'outil qui va et vient). Entrée : « Entrer dans l'atelier » en tête du dock de l'atelier (quand le monde a les intérieurs) ; le dock s'efface dedans et revient à la sortie ; la carte libère sa 3D (`useCoverBoard`). Parcours `apps/web/e2e/interior.mjs` (serveur `EMPIRE_INTERIOR=on`) : captures 1440 × 900 et 390 × 844, sans débordement. Restent pour plus tard : un modèle propre par poste des 13 autres ateliers, un pion fatigué qui se penche, une machine usée qui ralentit à l'œil, l'équipe de nuit visible.

- **A5 validé par le porteur (6 novembre 2026).**
- **A6 — fait (6 novembre 2026).** Les gestes dans la scène (`apps/web/src/empire/interior/`) :
  - **La fiche d'un poste** (`StationPanel.tsx`, à droite sur ordinateur, en bas sur téléphone) : niveau, barre d'usure, « Améliorer · prix », « Entretenir · prix » (« Comme neuve » sinon), « Déplacer », « Tourner », le curseur vite ↔ soigné (envoyé au lâcher), ses ouvriers (passer de jour à nuit, renvoyer à la porte), « Placer un … » quand quelqu'un attend à la porte, sinon « Embaucher un … · 40 d », placé dès qu'il arrive ; le jour plein, l'ouvrier va à l'équipe de nuit ; « Retirer ».
  - **Déplacer et poser** : au lieu d'un glisser-déposer, chaque dalle où le poste peut aller porte, en direct, ce que l'atelier ferait avec lui là (« +2,1/h », « −0,8/h », « = », en rouge quand c'est mieux) ; on touche la dalle choisie. Écart au plan § 7.3 (« glisser une machine ») assumé : sur téléphone, un toucher vaut mieux qu'un glisser sous le pouce, et le joueur voit toutes les options d'un coup ; un vrai glisser reste possible plus tard sur ce socle. Le calcul est celui du moteur (`reckon.ts` : `interiorThroughput`, `interiorLayoutProblem` sur les règles envoyées par le serveur), 4 tests.
  - **Le tiroir des postes** (« Poser un poste ») : les postes de l'atelier en vignettes rondes (emprise, nom, prix) ; touché, ses dalles possibles, chiffrées avec un ouvrier de son métier (posé, le poste attend son ouvrier : la fiche l'offre).
  - **« Plan conseillé »** (Lorenzo) : le meilleur déplacement unique (chaque poste, chaque dalle, chaque sens), joué d'un toucher ; « Rien de mieux à proposer » sinon. Un bon plan, pas le meilleur.
  - Thème : le rabot de la scierie passe de 35 s à 28 s (il égalait le banc de scie : un second banc ne servait à rien) ; un test de forme veut désormais un goulot seul dans chaque atelier.
  - Parcours `apps/web/e2e/atelier.mjs` (1440 × 900, 390 × 844, sans débordement) : entrer, la fiche d'un poste, « Déplacer » et ses dalles chiffrées, le plan conseillé qui fait monter le débit (12 → 12,9 planches/h, +7 %), un scieur embauché pour la nuit, le bouton d'entretien (machines neuves : « Comme neuve »), le tiroir, poser, sortir. L'entretien effectif n'est vérifié que par les tests du moteur et du serveur (il faut du temps de marche pour user une machine).

- **A6 validé par le porteur (6 novembre 2026).**
- **A7 — fait (6 novembre 2026).** Le retrait, quand le monde a les intérieurs :
  - **Moteur** : dans un atelier passé à son intérieur (`interior.v = 2`), les modules d'atelier ne comptent plus, sauf le four (son économie d'intrants reste), ni le savoir du métier (`mestiere`) en rendement ; le maître placé descend travailler à un poste (le goulot, de jour si une place est libre, sinon de nuit) et compte comme un ouvrier (`EmpireStaff.station`) ; la recherche des modules d'atelier, leur pose et l'embauche ou la pose d'un maître sont refusées (`locked`). La conversion se fait une fois, à la lecture (`absorbLegacy`, `run.ts`) : la qualité perdue devient du soin sur les postes, puis rendement et vitesse perdus deviennent des niveaux de poste au goulot (et un poste de même sorte à côté quand il est au dernier niveau, avec son ouvrier) jusqu'à ce que l'intérieur fasse au moins ce que l'atelier faisait ; ce que la halle ne peut pas encore tenir reste en part de cadence, montrée « Acquis +x % » (`interior.legacyBps`). Machines et ouvriers repartent neufs. Répétition sur les réglages de Venise (14 ateliers × niveaux 1 à 25 × modules 0 à 10, maître, savoir) : personne ne perd (rapport minimal 1,000), médiane +1,8 %, 90 % sous +9,6 %, au plus +39 % (un pas de niveau) — à reprendre au simulateur en A8.
  - **Les savoirs deviennent des postes débloqués** (décision du porteur) : `interior.unlocks` (Venise : niveau 3 pour tous, 4 avec le `mestiere`, 5 avec la `bottega`) ; au-delà, « Améliorer » dit « Niveau n : un savoir l'ouvre ».
  - **Écran** : toucher un atelier sur la carte, « Entrer » : son intérieur s'ouvre, plus de dock ; dedans, en bas, « Récolter +n planches » / « Relancer » (doré), ou ce qu'il attend, ou le prochain lot ; en tête, « Agrandir · niveau n · prix » (la halle grandit avec le niveau d'atelier), « Acquis +x % » le cas échéant. La Scuola ne montre plus les modules d'atelier, la Famille plus le rôle de maître (la vue les retire). Le dock d'atelier ne sert plus qu'aux mondes sans intérieurs.
  - Tests : 8 du moteur (`interior-legacy.test.ts` : personne ne fait moins, le maître ouvrier, la qualité en soin, le four gardé, les refus, les niveaux ouverts par le savoir, l'acquis), tous les tests verts ; parcours `interior.mjs`, `atelier.mjs` et `porcellana.mjs` verts.

- **A7 validé par le porteur.**
- **A8 — en cours (6 novembre 2026).** Fait : les intérieurs au simulateur de 24 mois (trois façons de les tenir, avec les fonctions du moteur), `adviseInterior` dans le moteur, les réglages `reference`, `basePaceBps` et `maxPaceBps`, le banc `apps/simulator/src/interior-bench.ts`, le correctif du maître placé au-delà des places à la bascule ; **et le défaut du simulateur** qui faussait tout (ses ateliers tournaient sans fin, magasins jamais pleins : la règle 3 manquait), corrigé. Résultat (docs/calibration.md, « Les ateliers de l'intérieur ») : l'économie tient avec les intérieurs, personne ne perd (pressé 1,16), le banc tient les cibles (1,40 et 2,00), **mais au monde l'écart entre joueurs s'écrase** (1,45 et 1,09) parce que la demande des villes borne les revenus : un atelier plus rapide remplit son magasin, puis s'arrête. Reste à trancher par le porteur : faire payer l'optimisation autrement qu'en volume (moins d'intrants, plus de belles pièces, des commandes de prestige), puis la note du chapitre ; et revoir l'équilibrage général au simulateur corrigé (toutes les graines, cohortes de 200).

## 9. Équilibrage et simulateur

- Le simulateur (`apps/simulator`, scénarios dans `apps/simulator/scenarios/`, bots dans `src/`) doit apprendre trois **profils d'optimisation** : `hasty` (plan par défaut, ouvriers au hasard, jamais d'entretien), `average` (casse le goulot principal, entretien quand < 80 %), `careful` (recherche locale sur le plan : déplace chaque poste sur les dalles libres et garde le meilleur débit ; affectation gloutonne métier/skill ; tampons ; qualité au goulot).
- Cibles : `careful / hasty` entre **1,6 et 2,2** à niveau égal ; `average / hasty` ≈ 1,3 ; aucune maison `hasty` ne doit perdre de ducats par rapport à aujourd'hui (la migration conserve le débit) ; le temps de jeu d'un `careful` reste dans la règle 7.
- Le prix des biens bouge si la production totale monte : vérifier les bornes des marchés (`prices.ts`) et des commandes (`orders.ts`) ; ajuster `orders.lots` ou les recettes si besoin, **documenté** dans `docs/calibration.md`.

## 10. Risques et garde-fous

- **Trop de chiffres** : chaque écran de l'intérieur passe la règle 8 ; revue visuelle à chaque lot web (captures envoyées au porteur).
- **Exploits** : déplacer gratuitement des machines pendant une file pleine → la cadence ne change que pour les lots non commencés ; poser/retirer en boucle → remboursement 50 %.
- **Performance téléphone** : une seule scène 3D à la fois ; pas d'occlusion ; caisses instanciées ; tester sur un iPhone réel (l'écran blanc de novembre 2026 venait de la mémoire graphique).
- **Migration** : la bascule ne doit faire perdre ni production, ni ducats, ni recherches ; une répétition sur une copie de la base (comme `apps/simulator/src/rehearse-square.ts` pour les cases carrées) **avant** la mise en ligne.
- **Règles stables** : ce changement touche le commerce ; il s'annonce dans les notes du chapitre avant de s'appliquer (CLAUDE.md).

## 11. Questions tranchées par le porteur (6 novembre 2026)

1. **Savoirs de la Scuola** touchant l'atelier : **convertis en postes débloqués** (un poste de niveau supérieur, un convoyeur plus rapide) ; rien n'est perdu, jamais de conversion en ducats (règle 4).
2. **Embauche** : **à la porte de l'atelier**, au pied du poste à pourvoir, le métier proposé ; la Famille ne garde que les membres de la famille, qui arrivent comme ouvriers spéciaux.
3. **Ateliers voisins d'une même chaîne** : **oui, une porte reliée dans les deux intérieurs, mais après A8** ; d'ici là, le bonus de voisinage actuel reste.
4. **Palais** : **hors de ce plan**, noté dans IDEAS.md pour un plan à part.

Les questions telles qu'elles étaient posées :

1. Les **savoirs** de la Scuola qui touchaient l'atelier : les convertir en postes débloqués, ou les retirer et rembourser ?
2. L'**embauche** : seulement à la porte de l'atelier, ou aussi à la Famille ?
3. Les **ateliers d'une même chaîne voisins sur la carte** : une liaison directe visible dans les deux intérieurs (une porte qui s'ouvre sur l'autre) ?
4. Le **Palais** : un intérieur de prestige (salons, collections) dans un autre plan ?
