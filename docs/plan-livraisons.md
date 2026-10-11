# Les livraisons par la route : note d'implémentation

11 octobre 2026. **Plan validé par le porteur du projet.** Cette note est autonome : elle doit suffire à coder la fonctionnalité de bout en bout. Lire aussi `CLAUDE.md` (règles non négociables) et `docs/CADRAGE.md` (sections « La mer » et « Le monde vivant », dont cette fonctionnalité est le pendant terrestre).

## 0. Pourquoi

Constat du porteur : une session se résume à « Tout récolter et relancer », puis le joueur s'en va. Vendre aux villes est instantané et ne demande aucun choix.

Les livraisons font de chaque vente aux villes :
- une **décision** : quelle commande, quel véhicule, avec ou sans escorte, par quelle route ;
- un **rendez-vous** : revenir à l'arrivée, réagir à une attaque.

Les brigands, joués par d'autres joueurs ou par l'ordinateur, sont l'interaction multijoueur de cette fonctionnalité.

## 1. Décisions du porteur (ne pas rediscuter)

1. La **vente instantanée aux villes disparaît** (`sellToCity`, et les Criées sous leur forme actuelle). Elle est remplacée par des commandes à livrer. Le **marché commun reste inchangé** : Dogana, offres entre joueurs, carnet.
2. Le joueur reçoit **10 à 15 commandes personnelles par jour**, tirées au hasard. Personne d'autre ne peut les prendre : aucune concurrence entre joueurs sur une commande.
3. Le joueur possède des **véhicules** (mule, charrette, chariot), qui limitent le nombre de livraisons simultanées. Un trajet aller dure **au plus 2 h**.
4. **Escorte facultative.** Sans escorte, un joueur attaqué reçoit une notification et dispose d'un **délai court pour riposter**. S'il riposte à temps, l'attaque échoue ; sinon il perd une partie de sa cargaison. Le véhicule revient toujours.
5. Les **brigands peuvent être des joueurs** :
   - le joueur poste une bande sur une route pour une durée donnée et un coût donné ;
   - les prises lui rapportent des marchandises ;
   - il ne doit jamais être systématiquement gagnant, et chaque livraison ne doit pas être attaquée.
6. Plus tard (phase 6, à ne pas coder maintenant) : le **roulage**, qui permet de confier une livraison au véhicule d'un autre joueur.

## 2. Principes d'équilibre

1. **Ne pas créer plus de monnaie qu'aujourd'hui.** Le budget quotidien des commandes reprend celui des ventes aux villes, des commandes du Doge et des familles et des Criées. Mesurer ce budget au simulateur **avant** le changement (masse créée par joueur actif et par jour, par source) et le reproduire après, à ±10 % près.
2. **Le transport est un puits** : achat, entretien et escortes détruisent des ducats (transfert vers `SINK_ACCOUNT`, comme l'entretien des navires).
3. **Brigander ne crée jamais de valeur.** La moitié de ce qui est pris est détruite, et la mise de la bande est détruite.
4. **Un joueur absent n'est jamais ruiné** :
   - pas d'attaque entre 22 h et 8 h (heure de Paris) ;
   - perte plafonnée à 30 % de la cargaison ;
   - l'escorte protège sans qu'il soit besoin d'être présent.
5. **Pass Négociant : aucun avantage** sur ces mécaniques. Pas de véhicule en plus, pas d'escorte moins chère, pas de délai de riposte plus long, pas de commande échangée.
6. **Tout réglage dans `worlds.settings`**, avec le schéma zod dans `packages/engine/src/settings.ts` et les valeurs de Venise dans `packages/engine/src/themes/venice1450.settings.ts`. Toutes les valeurs de cette note sont des **valeurs de départ, à calibrer au simulateur**.

## 3. Rappels d'architecture (constatés dans le code)

- **L'état du monde est un document unique** (`WorldState`, `packages/engine/src/state.ts`), sauvegardé dans `world_states`. Les commandes passent par `decide()` (`packages/engine/src/commands.ts`) et modifient l'état dans une transaction `Tx` (`packages/engine/src/tx.ts`).
  - **Aucune nouvelle table SQL n'est nécessaire** : ajouter des champs facultatifs à `WorldState`, comme l'ont été `expeditions`, `ships` et `raids`.
  - Une migration Drizzle n'est requise que si l'on touche à `schema.ts`, ce qui ne devrait pas arriver.
- **Monnaie** : `transfer(tx, from, to, amount)`, entre `SOURCE_ACCOUNT` (création), `cashAccount(player)`, `escrowAccount(player)` et le puits.
- **Stocks** : `removeStock` et `addStock` dans `tx.ts`, avec une raison et une référence. Le journal des stocks (`stock_movements`) est alimenté automatiquement par les effets.
- **Tirages** : `draw(ctx, key)` (`packages/engine/src/draw.ts`), déterministe à partir du secret du monde. Toujours dériver la clé de (joueur, jour, index), comme dans `contractsFor`.
- **Modèle le plus proche : la mer.**

  | Fichier | Rôle |
  | --- | --- |
  | `expeditions.ts` | Départ, cargaison, retour |
  | `privateers.ts` | `commissionPrivateers`, `resolveCrossings` à mi-voyage, `collectRaid`, garde-fous |
  | `ships.ts` | Achat, entretien, statut |

  **S'en inspirer fortement**, et réutiliser les garde-fous existants : `plunderedAt`, immunité des nouveaux venus, `minTargetWorthBps`.
- **Tick** : `tick(tx)` (`packages/engine/src/tick.ts`) tourne toutes les 60 s côté serveur. La production est paresseuse, mais les attaques et les arrivées se résolvent dans le tick ou à la lecture (voir 6.4).
- **Notifications** : `apps/server/src/notify/notifier.ts` balaie l'état chaque minute et compare les dates avec la fenêtre `within(since, now]` (voir le bloc `expeditions` et `raids`). Les textes sont dans `notify/texts.ts`. Le push respecte déjà les heures calmes et les préférences par type.
- **PNJ** : `packages/engine/src/bots.ts`, partagé avec le simulateur (`apps/simulator`).
- **Tests du moteur** : `packages/engine/test/*.test.ts`, avec **la fixture figée `test/fixture.ts`, jamais les réglages de Venise**. Écrire les tests **avant** le code.

## 4. Le monde : villes et routes

Venise n'a que 3 villes (`venezia`, `padova`, `verona` dans `themes/venice1450.ts`). Pour une carte vivante, en ajouter 3 à 5 :
- `vicenza` (Vicence), `treviso` (Trévise), `mantova` (Mantoue), `ferrara` (Ferrare), et éventuellement `bergamo` (Bergame) ;
- chacune avec une **demande** dans `settings.cities`, sur le même modèle que les villes existantes (`basePrice`, `dailyCapacityPerPlayer`, `maxDropBps`), en répartissant la capacité totale actuelle **sans l'augmenter**.

Nouveau réglage `deliveries.routes`, qui donne la durée du trajet aller en minutes pour un véhicule de vitesse normale, par région de départ et par ville :

```ts
routes: {
  terraferma: { padova: 30, verona: 45, vicenza: 25, mantova: 60, venezia: 75, treviso: 70, ferrara: 80 },
  lagoon:     { venezia: 20, treviso: 40, padova: 45, ferrara: 70, vicenza: 70, verona: 90, mantova: 100 },
  dolomites:  { treviso: 45, vicenza: 50, verona: 60, venezia: 90, padova: 75, mantova: 100, ferrara: 110 },
}
```

- L'**identifiant d'une route** est `"<région>:<ville>"`. C'est sur une route que se poste une bande.
- Durée réelle = durée de la route × facteur du véhicule, **plafonnée à 120 min** aller.
- Le retour à vide prend la même durée. Le véhicule est indisponible pendant l'aller et le retour, mais **la vente est réglée à l'arrivée**.

## 5. Réglages à ajouter (`deliveries` et `bandits` dans le schéma)

```ts
deliveries: {
  ordersPerDay: { min: 10, max: 15 },       // tirage par joueur et par jour
  // Composition du tableau : le reste du tableau est en commandes de ville.
  dogeOrdersPerDay: 2,                      // reprend contracts.perDay (prime conservée)
  // Les commandes de famille (1/jour) apparaissent aussi sur la carte, prime conservée.
  urgentPerDay: 2,                          // remplacent les Criées : 1 h pour charger, prime
  urgentPremiumBps: 1_500,
  urgentOpenMinutes: 60,
  cityPriceBps: 10_000,                     // prix de base = prix de référence…
  distanceBonusBpsPerHour: 1_000,           // … + 10 % par heure de route (aller)
  quantity: { bread: [15, 40], bricks: [6, 15], planks: [6, 15], wheat: [20, 40], flour: [15, 30],
              clay: [20, 40], wood: [20, 40] },  // fourchette tirée, puis plafonnée
  expiresAtEndOfDay: true,                  // une commande du jour expire à minuit (Paris)
  routes: { … voir §4 … },
  maxDeliveryMinutes: 120,
  vehicles: {
    mule:     { costDucats: 8_000,  costMaterials: {},            capacity: 15, speedBps: 7_500,  upkeepPerDay: 300 },
    cart:     { costDucats: 15_000, costMaterials: { planks: 10 }, capacity: 40, speedBps: 10_000, upkeepPerDay: 600 },
    wagon:    { costDucats: 30_000, costMaterials: { planks: 25 }, capacity: 90, speedBps: 13_000, upkeepPerDay: 1_200 },
  },
  startingVehicles: ["cart"],               // donnés à l'arrivée (join), comptés au patrimoine
  maxVehicles: 4,
  escorts: {
    guards:  { costBps: 400, defense: 2 },  // 4 % de la valeur de la cargaison, détruits
    company: { costBps: 900, defense: 5 },  // 9 %
  },
},
bandits: {
  hoursOptions: [2, 4, 6],                  // durée de pose au choix
  feePerHour: 2_500,                        // ducats détruits (deniers), payés d'avance
  provisionsPerHour: { bread: 2 },          // vivres consommés d'avance
  maxActivePerPlayer: 1,
  maxAttacksPerBand: 2,                     // une bande ne tente jamais plus de 2 attaques
  maxBandsPerRoute: 2,                      // au-delà, la route est « pleine »
  attackChanceBps: { 0: 4_000, 2: 1_500, 5: 500 }, // selon la défense : sans escorte, gardes, compagnie
  reactionMinutes: 10,
  takeBps: 3_000,                           // 30 % de chaque ligne de cargaison, jamais plus
  keepBps: 5_000,                           // le brigand garde 50 % de ce qui est pris, le reste est détruit
  quietHours: { from: 22, to: 8 },          // heure de Paris : aucune attaque
  newcomerDays: 3,                          // reprend privateers.newcomerDays
  minTargetWorthBps: 5_000,                 // pas de cible deux fois moins riche
  cooldownHours: 24,                        // une attaque réussie par victime et par 24 h (plunderedAt, partagé avec la mer)
  sameFamilyImmune: true,                   // pas d'attaque contre sa propre famille
  openDay: 6,                               // comme les lettres de marque
  npcBands: { perDay: 3, hours: 3 },        // bandes PNJ pour qu'un petit monde ait du risque
},
```

- La **fixture de test** (`test/fixture.ts`) reçoit ses propres valeurs, simples et figées.
- Les **réglages absents** valent « fonctionnalité désactivée » : `ordersPerDay` à 0 et pas de route, pour que les anciens mondes et les tests existants ne cassent pas. C'est la même convention que `contracts` (`.default(...)`).

## 6. Moteur (`packages/engine`)

### 6.1 Types (dans `state.ts`)

```ts
export interface Vehicle {
  id: string; playerId: PlayerId; type: string;
  investedValue: Deniers;        // compté au patrimoine comme un navire
  busyUntil: number;             // fin du retour de sa dernière livraison (0 si libre)
}

export interface DeliveryOrder {  // calculé, pas stocké (comme Contract)
  id: string;                    // `${day}:${index}`
  day: number;
  kind: "city" | "doge" | "family" | "urgent";
  city: string; resource: string; quantity: number;
  unitPrice: Deniers;
  opensAt: number; expiresAt: number;
}

export interface Delivery {
  id: string; playerId: PlayerId; orderId: string; kind: DeliveryOrder["kind"];
  vehicleId: string; route: string;           // "<région>:<ville>"
  cargo: Record<ResourceCode, number>;        // une seule ressource, gardé en table pour réutiliser le code de la mer
  payment: Deniers;                           // prix total fixé au départ
  escort: "none" | "guards" | "company";
  departAt: number; arriveAt: number; backAt: number;
  midAt: number;                              // moment où une bande peut frapper
  attack?: {
    bandId: string; banditId: PlayerId; at: number;
    chanceBps: number;
    reactBy: number;                          // at + reactionMinutes (seulement sans escorte)
    reacted: boolean;
    resolvedAt?: number; success?: boolean;
    taken: Record<ResourceCode, number>;
  };
  outcome: "en_route" | "delivered" | "robbed_delivered";
  // La livraison partiellement pillée est quand même payée, au prorata de ce qui arrive.
}

export interface BanditBand {
  id: string; playerId: PlayerId | null;      // null pour une bande PNJ
  route: string; startAt: number; endAt: number;
  attacks: number;                            // tentatives faites (≤ maxAttacksPerBand)
  dispersed: boolean;                         // riposte réussie : la bande s'arrête
  booty: Record<ResourceCode, number>;        // à encaisser par le brigand
  collected: boolean;
}
```

Dans `WorldState`, ajouter les champs facultatifs :
- `vehicles?: Record<string, Vehicle>` ;
- `deliveries?: Record<string, Delivery>` ;
- `bands?: Record<string, BanditBand>` ;
- `deliveriesDone?: Record<PlayerId, { day: number; ids: string[] }>`, sur le modèle de `contractsDone`.

### 6.2 Nouveau fichier `deliveries.ts`

| Fonction | Rôle |
| --- | --- |
| `deliveryOrdersFor(ctx, state, playerId, day)` | Tableau du jour, déterministe par `draw(ctx, "delivery:<player>:<day>:<i>")`. Nombre tiré dans [min, max]. Les `dogeOrdersPerDay` premières commandes sont celles du Doge (prime `contracts.premiumBps`), puis 1 commande de famille si le joueur a une allégeance (réutiliser le tirage de `families.ts`), puis `urgentPerDay` urgentes (ouvertes à des heures tirées entre 8 h et 21 h), puis le reste en commandes de ville. Ville tirée parmi les villes qui demandent la ressource (`settings.cities[city][resource]` existe). Prix d'une commande de ville = prix de référence × (`cityPriceBps` + `distanceBonusBpsPerHour` × heures de route) / 10 000, **arrondi vers le bas** (`applyBpsFloor`) |
| `travelMinutes(ctx, region, city, vehicleType)` | Durée de la route × 10 000 / `speedBps`, plafonnée à `maxDeliveryMinutes` |
| `buyVehicle(tx, playerId, type)` | Ducats et planches vers le puits, `investedValue` au coût. Refuse au-delà de `maxVehicles` |
| `dispatchDelivery(tx, playerId, orderId, vehicleId, escort)` | Vérifie que la commande existe aujourd'hui, est ouverte, n'est pas déjà faite et n'a pas expiré ; que le véhicule est au joueur et libre ; que la quantité tient dans la capacité ; que le stock suffit. Puis : retirer le stock (raison `"delivery"`), payer l'escorte (`costBps` × valeur au prix de la commande, vers le puits), créer la `Delivery`, marquer le véhicule occupé jusqu'à `backAt` et la commande comme faite. **Pas de paiement à ce stade** |
| `postBand(tx, playerId, route, hours)` | Vérifie `openDay`, `maxActivePerPlayer`, `maxBandsPerRoute` et que la route existe. Payer `feePerHour × hours` (ducats vers le puits) et les vivres (`removeStock`, raison `"bandits"`) |
| `react(tx, playerId, deliveryId)` | Valide seulement si l'attaque est en attente, `now ≤ reactBy`, et que le joueur est la victime. Pose `reacted = true`. L'attaque est **résolue immédiatement en échec** et la bande est dispersée |
| `resolveDeliveries(tx)` | Appelée par `tick`, voir 6.4 |
| `collectBooty(tx, playerId, bandId)` | Ajoute le butin au stock du brigand (raison `"booty"`) quand la bande est terminée ou dispersée |

### 6.3 Choix de la bande qui attaque

Au moment `midAt` d'une livraison, chercher les bandes actives (non dispersées, `attacks < maxAttacksPerBand`, `startAt ≤ midAt < endAt`) sur la même route. Aucune attaque si :
- `midAt` tombe dans les heures calmes (heure de Paris : réutiliser l'utilitaire de `apps/server/src/game/calendar.ts` ou son équivalent moteur ; s'il n'existe que côté serveur, en déplacer la partie pure dans le moteur) ;
- la victime est le brigand lui-même, un nouveau venu (moins de `newcomerDays`), ou un membre de la même famille ;
- la victime vaut moins de `minTargetWorthBps` du patrimoine du brigand ;
- la victime a déjà subi une prise réussie depuis moins de `cooldownHours` (`plunderedAt`, partagé avec la mer) ;
- la livraison a déjà été attaquée.

Pour une bande PNJ, ignorer les règles qui portent sur le patrimoine et la famille du brigand.

S'il reste plusieurs bandes, une seule attaque : la plus ancienne. On incrémente `attacks` **dès la tentative**, réussie ou non : une route fréquentée n'est donc jamais une mine d'or.

### 6.4 Résolution (dans `tick`, et aussi à la lecture si besoin)

`resolveDeliveries(tx)` parcourt les livraisons `en_route`.

**1. Mi-parcours** (`now ≥ midAt`, pas encore traité) : choisir la bande (6.3), puis tirer `draw(ctx, "ambush:<deliveryId>")`. La chance de réussite dépend de la défense de l'escorte (0, 2 ou 5) : `attackChanceBps`.
- **Avec escorte** : résoudre tout de suite, réussite si le tirage modulo 10 000 est inférieur à la chance.
- **Sans escorte** : poser `attack` avec `reactBy = midAt + reactionMinutes` et **suspendre la livraison** (`arriveAt` et `backAt` reculent de `reactionMinutes`). Ainsi, même sur un trajet de 20 min, le joueur a toujours ses 10 minutes.

**2. Fin du délai de riposte** (`now ≥ reactBy`, sans riposte) : résoudre avec la même chance (40 % par défaut). Si le tirage échoue, la bande a raté et n'est **pas** dispersée.

**3. Prise réussie** :
- `taken` = plancher de `takeBps` × chaque ligne de cargaison ;
- la cargaison diminue d'autant ;
- `booty` de la bande reçoit plancher de `keepBps` × `taken` ; le reste est détruit, avec un mouvement de stock de raison `"lost_in_flight"` ;
- poser `plunderedAt[victime] = now`.

**4. Arrivée** (`now ≥ arriveAt`) : payer `payment × cargaison restante / cargaison initiale` (arrondi vers le bas) depuis `SOURCE_ACCOUNT` vers `cashAccount`, avec la raison `"delivery"`. Puis `outcome = delivered` ou `robbed_delivered`, et appeler les compteurs de missions et de tâches du jour existants.

**5. Retour** (`now ≥ backAt`) : rien à faire, le véhicule redevient libre via `busyUntil`.

**6. Fin des bandes** (`now ≥ endAt`) : rien à faire, le brigand encaisse avec `collectBooty`. Une bande PNJ voit son butin détruit.

Émettre des événements (`emit`) à chaque étape : `delivery_dispatched`, `delivery_ambushed`, `delivery_defended`, `delivery_robbed`, `delivery_arrived`, `band_posted`, `band_dispersed`, `booty_collected`. Les ajouter dans `effects.ts` si une liste fermée existe.

### 6.5 Commandes (`commands.ts`)

Ajouter au type `Command` et à `decide()` :
- `buyVehicle { playerId, vehicleType }`
- `dispatchDelivery { playerId, orderId, vehicleId, escort }`
- `reactToAmbush { playerId, deliveryId }`
- `postBand { playerId, route, hours }`
- `collectBooty { playerId, bandId }`

Retirer ou désactiver :
- **`sellToCity`** : la garder dans le moteur, mais la refuser avec `fail("city_sales_closed")` quand `deliveries.ordersPerDay.max > 0`. Les mondes sans livraisons (fixture des anciens tests) continuent de fonctionner.
- **`fulfillContract`, `fulfillFamilyOrder` et `sellToCriee`**, même principe : quand les livraisons sont actives, les commandes du Doge, des familles et les urgentes passent par `dispatchDelivery`. Les commandes du Doge et des familles ne changent pas de logique de tirage ; seul le mode de remise change.
- **Les commandes de produits d'outre-mer** (sel, vin, soie…) **restent remises au comptoir comme aujourd'hui**, sans livraison par la route.

### 6.6 Patrimoine, entretien, invariants

- **Patrimoine** (`valuation.ts`) :
  - les véhicules comptent à `investedValue`, comme les navires ;
  - la cargaison en route compte au prix de référence (même règle que la cargaison des expéditions) ;
  - le butin non encaissé compte pour le brigand.
- **Entretien** : `chargeUpkeep` (`tick.ts`) prélève l'entretien quotidien des véhicules, réduit à 25 % en sommeil comme le reste.
- **Invariants** (`invariants.ts`) : aucune ressource ne doit apparaître ni disparaître hors du journal ; la somme des comptes reste équilibrée. Ajouter les stocks « en route » et « butin » au contrôle de conservation des stocks s'il en existe un.

### 6.7 PNJ (`bots.ts`)

Selon l'assiduité de chaque PNJ :
- il achète un deuxième véhicule quand il est rentable ;
- il livre les commandes les mieux payées par rapport à la capacité de ses véhicules ;
- il prend une escorte quand une route est guettée, en fonction d'un profil de prudence ;
- il riposte s'il est « en ligne » (même modèle de sessions que pour le reste).

En plus, quelques PNJ posent des bandes : les joueurs ne doivent pas être les seuls brigands, sinon le simulateur ne mesure rien.

### 6.8 Tests à écrire d'abord (`packages/engine/test/deliveries.test.ts`, `bandits.test.ts`)

**Commandes**
- Le tableau est déterministe, compte entre min et max commandes, et ne contient que des villes qui demandent la ressource.
- Le prix augmente avec la distance et est arrondi vers le bas.

**Départ d'une livraison**
- Il échoue si : véhicule occupé, capacité dépassée, stock insuffisant, commande expirée ou déjà faite, ou commande urgente pas encore ouverte.
- L'escorte est débitée vers le puits.

**Arrivée**
- Paiement exact.
- Le véhicule est occupé jusqu'au retour.
- Le paiement est proportionnel après une prise.

**Attaques**
- Jamais plus de `maxAttacksPerBand` tentatives par bande.
- Aucune attaque pendant les heures calmes, ni contre un nouveau venu, un joueur trop pauvre, un membre de sa famille, ou une victime en délai de récupération.
- Sans escorte : une riposte dans le délai fait échouer l'attaque et disperse la bande ; une riposte hors délai est refusée.
- La prise ne dépasse jamais 30 % ; le brigand reçoit la moitié, le reste est détruit.
- La livraison est suspendue pendant le délai de riposte.

**Économie**
- `sellToCity` est refusée quand les livraisons sont actives.
- Les invariants de monnaie et de stock tiennent sur un scénario complet.
- **Aucun avantage Pass** : un détenteur du Pass a exactement le même résultat.

## 7. Simulateur et équilibrage (`apps/simulator`)

1. **Avant tout changement**, lancer `pnpm sim` et noter dans `docs/calibration.md` :
   - la masse créée par jour et par joueur actif, pour chaque source (villes, Doge, familles, Criées) ;
   - l'indice des prix ;
   - l'écart entre joueur assidu et joueur occasionnel.
2. Brancher les livraisons et les bandes dans les bots et dans les métriques (`metrics.ts`, `report.ts`). Nouveaux indicateurs :
   - livraisons par jour et par joueur, taux d'utilisation des véhicules ;
   - attaques tentées, réussies et repoussées ;
   - perte moyenne d'un livreur, en % de la valeur livrée ;
   - **rendement du brigandage** (butin au prix de référence moins mise et vivres, divisé par mise et vivres) ;
   - monnaie détruite par le transport.
3. Calibrer jusqu'à ce que **toutes les graines** respectent ces cibles :

| Indicateur | Cible |
| --- | --- |
| Monnaie créée par jour et par joueur actif | Celle d'avant, à ±10 % |
| Indice des prix | Stable, dans les bornes actuelles |
| Rendement du brigandage, brigand actif | Entre 0 et +20 % de la mise |
| Rendement du brigandage, brigand occasionnel | Négatif |
| Perte moyenne d'un livreur | Moins de 3 % de la valeur livrée |
| Livreur prudent (escorte sur les routes guettées) contre brigand, à activité égale | Le livreur n'est jamais derrière |
| Assidu contre occasionnel | 5 à 10 % d'écart, comme aujourd'hui |
| `pnpm sim --pass 0.2` | Écart de patrimoine ≤ 5 %, un gratuit assidu devant un abonné occasionnel |
| Utilisation des véhicules d'un joueur assidu | 50 à 80 %, pour que la limite pèse sans frustrer |

4. Leviers d'équilibrage, dans cet ordre :
   - `distanceBonusBpsPerHour` et `ordersPerDay` (budget de monnaie) ;
   - `feePerHour` et `attackChanceBps` (rendement du brigand) ;
   - les coûts d'escorte ;
   - capacités et vitesses des véhicules.
5. Documenter chaque réglage retenu, avec les chiffres, dans `docs/calibration.md`.

## 8. Serveur (`apps/server`)

- **Routes** (`src/game/routes.ts`) : une route POST par commande nouvelle, sur le modèle des routes existantes (`launchExpedition`, `commissionPrivateers`).
- **Vue** (`src/game/view.ts`). Ajouter au JSON du joueur :
  - `deliveryOrders` : tableau du jour, avec l'état fait, ouvert ou expiré, et la durée par type de véhicule ;
  - `vehicles`, avec leur statut ;
  - `deliveries` en cours, avec l'attaque en attente et `reactBy` ;
  - `bands` du joueur, avec leur butin ;
  - `watchedRoutes` : routes guettées, **sans le nom du brigand**, comme `watchedRoutes` dans `privateers.ts` ;
  - les réglages utiles (véhicules, escortes, routes, durées de pose, coût).

  **Ne jamais exposer** les tirages ni les bandes des autres joueurs.
- **Tick** : appeler `resolveDeliveries` dans `tick()`, juste après `resolveCrossings`. Le délai de riposte de 10 minutes s'appuie sur ce tick d'une minute.
- **Notifications** (`notify/notifier.ts`, `notify/texts.ts`, et préférences dans `PushSettings.tsx`) :

  | Type | Moment | Destinataire |
  | --- | --- | --- |
  | `ambush` | Attaque en attente de riposte. **Prioritaire** : ne doit pas être regroupé ni retardé | La victime, avec un texte qui dit le temps restant |
  | `delivery` | Livraison arrivée et payée | Le livreur |
  | `robbed` / `defended` | Résultat d'une attaque, avec le nom de l'autre | Les deux joueurs |
  | `band_over` | Bande terminée ou dispersée, butin à encaisser | Le brigand |

  Pas de push pendant les heures calmes : c'est déjà le cas, et il n'y a pas d'attaque la nuit.
- **Gazette** : publier les prises réussies (« Des brigands ont détroussé un convoi sur la route de Vérone »), sur le modèle des nouvelles du large.
- **Tutoriel et missions** (`src/game/tutorial.ts`, `missions.ts` dans le moteur) :
  - remplacer « première vente à une ville » par « première livraison » ;
  - ajouter « premier véhicule » ;
  - ajouter « première bande », ouverte au jour `bandits.openDay`.
- **Tests serveur** (`apps/server/test/`) :
  - un scénario complet : départ, attaque, riposte, arrivée, notifications envoyées ;
  - mettre à jour les tests qui utilisaient `sellToCity`. Ils tournent sur des mondes de test : leur donner des livraisons désactivées, ou les réécrire avec `dispatchDelivery`.

## 9. Interface (`apps/web`, en français, i18n dans `src/i18n.ts`)

**1. Nouvel onglet « Routes »**, qui remplace la vente aux villes dans Marché et Contrats. Il contient :
- **une carte** (SVG simple, sans dépendance lourde) : les trois régions, les villes, les routes. Une route guettée apparaît en rouge pointillé avec une icône, une livraison en cours comme un point qui avance (calculé côté client à partir de `departAt` et `arriveAt`) ;
- **la liste des commandes du jour**, triable par prix, distance ou échéance. Les commandes du Doge et des familles sont mises en avant, les urgentes portent un compte à rebours ;
- **une fiche de commande** : choix du véhicule libre (durée et capacité affichées), choix de l'escorte (coût en ducats affiché), avertissement si la route est guettée, bouton « Charger et partir » ;
- **les véhicules**, avec leur statut et l'heure de retour, et un bouton « Acheter » (coût et entretien affichés).

**2. Alerte d'attaque** : bandeau plein écran ou modale, avec un compte à rebours de 10 minutes et un gros bouton « Riposter ». Elle s'ouvre aussi depuis la notification push : clic, ouverture du jeu sur l'alerte. `push-sw.js` gère déjà `notificationclick` ; passer l'URL de la livraison dans le message.

**3. Écran « Brigands »**, ouvert au jour 6 :
- choix d'une route sur la carte et d'une durée ;
- coût affiché, avec les règles en clair (« 2 attaques au plus, 30 % de la cargaison, la moitié se perd dans la fuite ; une victime qui riposte disperse votre bande ») ;
- bande en cours, tentatives, butin, bouton « Encaisser ».

**4. Comptoir** : le bouton « Tout récolter et relancer » reste. Ajouter un raccourci « N commandes à livrer, M véhicules libres » vers l'onglet Routes.

**5. Bon retour** (récapitulatif après absence) : ajouter les livraisons arrivées, les attaques subies et repoussées, le butin à encaisser.

**6. Aide** (`Help.tsx`) : une section « Les routes et les brigands ».

## 10. Ordre de travail (petits commits, un par ligne)

| # | Commit |
| --- | --- |
| 1 | Mesure de référence au simulateur, consignée dans `docs/calibration.md` |
| 2 | Réglages : schéma zod `deliveries` et `bandits`, valeurs de la fixture de test (désactivés par défaut) |
| 3 | Moteur : véhicules (achat, entretien, patrimoine), avec tests |
| 4 | Moteur : tableau des commandes du jour, avec tests |
| 5 | Moteur : départ, arrivée, paiement, avec tests |
| 6 | Moteur : bandes, attaques, riposte, butin, garde-fous, avec tests |
| 7 | Moteur : fermeture de `sellToCity`, des Criées et de la remise directe Doge et familles quand les livraisons sont actives ; invariants |
| 8 | PNJ : livraisons, escortes, ripostes, bandes |
| 9 | Venise : nouvelles villes, routes, réglages ; calibrage au simulateur (toutes graines, `--pass 0.2`) et `docs/calibration.md` |
| 10 | Serveur : commandes, vue, tick, tests |
| 11 | Serveur : notifications push, gazette, missions et tutoriel |
| 12 | Interface : onglet Routes (carte, commandes, fiche, véhicules) |
| 13 | Interface : alerte d'attaque et lien depuis la notification |
| 14 | Interface : écran Brigands, Bon retour, Aide |
| 15 | Documentation : section « Les routes et les brigands » dans `docs/CADRAGE.md`, mise à jour de `IDEAS.md` (roulage) |

Après chaque commit : `pnpm test`, `pnpm typecheck` et `pnpm lint` au vert.

## 11. Hors périmètre de cette note (à noter dans `IDEAS.md`, ne pas coder)

- **Le roulage** : confier une commande au véhicule d'un autre joueur contre une part du prix, avec une réputation de transporteur.
- Améliorer les véhicules (essieux, chevaux de trait).
- Des routes qui se dégradent ou des péages tenus par des joueurs.
