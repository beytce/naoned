# 08 — QA et sécurité (audit d'ensemble du 13 novembre 2026)

Auditeur : QA et sécurité. Serveur local à moi (port 3688, base PGlite à part, `NODE_ENV=test`),
le web déjà construit, quatre comptes (Alvise `a`, Bianca `b`, Cosimo `c`, Doria `d`), du lundi
16 novembre 10 h au lundi 23 novembre 9 h 30 (heure du jeu), en relançant le serveur sur la même base.
Captures : `docs/audit-2026-11-13/captures/qa/`.

## 1. Verdict

**Note : 4/10 pour « ouvrir une bêta publique demain ».**

Les fondations tiennent : les saisies piégées sont presque toutes refusées proprement, le grand livre
de la planche colle au denier près aux bourses, et un serveur tué net (`kill -9`) ne perd aucun geste
qu'il avait confirmé. Mais quatre trous se voient en quelques minutes avec la console du navigateur.
Les ruses « secrètes » du port se lisent dans `GET /api/planche`. Une clé `toString` donne des points
au phare sans rien donner. Le serveur bloque toute la planche plus d'une seconde par Passe rejouée,
et ce lieutenant déterministe fait qu'**une seule ligne gagnante, calculée hors ligne en 4 s avec le
moteur livré au client, prend toutes les tours de bouche sans garde et remplit le plafond de Prestige
de la semaine en deux minutes**.
Il faut une demi-douzaine de petits correctifs avant une bêta ouverte. Une bêta fermée, entre amis,
reste possible tout de suite.

## 2. Ce que j'ai fait

- **Lundi 16, 10 h** : trois comptes créés par le vrai lien magique, assis à Murano (`cannaregio-1`,
  `castello-1`, `dorsoduro-1`). Un balayage de **27 routes × 8 clés piégées** (`__proto__`,
  `constructor`, `toString`, `hasOwnProperty`, `valueOf`, `prototype`, `length`, `0`) comme ville,
  marchandise, passage, détroit, puissance, sortie, passe, ruse, don, cible, puis les nombres
  (négatifs, `1.5`, `NaN`, `1e400`, ids énormes), les tableaux de 201 coups et les chaînes à la limite.
- Ateliers bâtis (sablière, ferme), fils tendus vers le Rialto et le Môle, compagnie fondée et
  rejointe, dons au phare, ruses posées, garde posée.
- Une Passe résolue **hors ligne** avec le moteur (`passeThink` profondeur 4 contre le lieutenant à 3),
  puis rejouée telle quelle par trois comptes sur quatre tours.
- **Lundi 16 à 23 h, mardi 17 à 5 h et 9 h, lundi 23 à 9 h** : relances du serveur sur la même base
  (la lagune vit entre-temps), dont un `kill -9` au milieu d'une rafale de gestes. Contrôle du grand
  livre contre les bourses, base arrêtée.
- Simulation, sur une **copie** de la base, d'une montée de ligue coupée entre « la Maison quitte la
  lagune » et « elle arrive dans l'autre » (le code de production, appelé tel quel).
- À l'écran (téléphone 390 × 844 et ordinateur 1280 × 800) : entrée par courriel, lien magique, fondation
  d'une Maison avec un nom piégé (`<img src=x onerror=…>`), puis lecture des ruses d'autrui depuis la
  console de la page.

## 3. Constats

| Id | Gravité | Constat | Preuve | Proposition |
|---|---|---|---|---|
| Q1 | **P0** | **Les ruses « secrètes » du port se lisent par tous.** La Guerre les cache dans l'assaut (`hideRuses`), mais `GET /api/planche` renvoie l'état entier des 48 Maisons, avec `houses[x].ruses`. Un assaillant connaît le brûlot et la chaîne avant d'attaquer. | Rejoué : Bianca pose `{bouche: brulot, nord: chaine}` ; Cosimo lit `{"ruses":{"bouche":"brulot","nord":"chaine"}}` dans sa planche ; depuis la page de Doria (navigateur) : `[["Ca' Bianca",{"nord":"chaine","bouche":"brulot"}]]`. Source : `plancheRoutes.ts:140` (`show` → `view.state` sans filtre), `planche.ts` `view()`. | Une vue par joueur : retirer `ruses`, `rusesDay` des autres Maisons (et tout champ futur marqué secret) dans `show()`. Un test serveur « une autre Maison ne voit pas mes ruses ». |
| Q2 | **P1** | **Une Passe gagnée se rejoue à l'infini, et elle se partage.** Le lieutenant joue sans hasard (`passeThink` sans `rng`, `planche.ts:817`). Une ligne trouvée une fois gagne chaque duel suivant contre la même position, et tous les passages « bouche-* » partagent le plateau `chioggia`. Une tour de corsaire tombe en 3 requêtes. Un sceau cassé rapporte 15 de Prestige (`maison.ts:72`) ; une fois le plafond de tours atteint, les sceaux reviennent et se recassent. Le moteur qui trouve la ligne est livré au client (`dist/assets/LabPasse-*.js`). | Ligne de 17 coups trouvée hors ligne en **4,3 s**. Alvise prend `bouche-cannaregio` en 3 requêtes (4 s). La **même** ligne, jouée par Cosimo, prend `bouche-dorsoduro` (3,7 s). Cosimo enchaîne ensuite **20 duels gagnés sur 20** en 33 s sur `bouche-sanpolo` et `bouche-castello` : 20 sceaux, soit **300 de Prestige** (plafond hebdomadaire de 500). Contre-épreuve : une garde d'un seul maillon (`[24]`) a résisté à mon solveur naïf pendant 4 minutes, donc la garde protège réellement. | Un aléa du lieutenant tiré par le serveur (graine par duel, gardée au journal pour rejouer) ; ou une position légèrement tirée par duel. Un essai par tour et par heure, ou un coût. Le Prestige des sceaux compté une fois par tour et par jour. |
| Q3 | **P1** | **Un duel rejoué bloque tout le serveur.** `force`, `noir`, `muda`, `sortie`, `order` et `daily` rejouent le duel en synchrone sur la boucle d'événements (recherche en profondeur 3 à chaque coup). Une Passe de bouche coûte **1,1 à 1,7 s de processeur**. La limite est de 20 par minute et par session, soit environ 40 % d'un cœur pour **un seul** compte. | Trois `force` simultanés : `/api/health` répond en **3 566 ms** (mesuré pendant la rafale). Les 20 duels de Q2 ont occupé le serveur 33 s. Source : `planche.ts:806-830` et `replays()`/`solves()`. | Rejouer dans un `worker_thread` (le moteur est pur, cela se fait bien) avec une file bornée ; ou bien un budget de processeur par compte et une limite globale de duels en cours. Un test de charge simple dans la CI. |
| Q4 | **P1** | **Pollution par clé héritée dans le don au phare.** `take()` (`arsenal.ts:135-138`) lit `h.stock[g] ?? 0` sans `Object.hasOwn`. Avec `g = "toString"` ou `"constructor"`, le stock « vaut » une fonction, le contrôle `< n` est faux, le don passe : le phare gagne des points pour rien et le stock reçoit des clés `NaN` (enregistrées `null`, toujours là après une relance). | `POST /api/planche/compagnie/phare {"goods":{"toString":30,"constructor":30}}` → 200, le phare passe de 120 à **180 points**, le stock d'Alvise devient `{"sand":236,"wheat":233,"toString":null,"constructor":null}`, et c'est encore vrai après une relance. Le contrôle `planche.ok` reste vrai : l'invariant ne regarde pas les stocks. | `own(h.stock, g)` dans `take`/`give`, et `plancheGive` qui refuse toute marchandise hors de `S.goods`. Le schéma zod du phare : `z.enum(goods)` plutôt que `key`. Un test du moteur avec les huit clés piégées pour chaque fonction qui reçoit une clé du joueur. |
| Q5 | **P1** | **Une montée de ligue coupée au mauvais moment fait perdre toute la Maison.** `move()` écrit d'abord « la Maison quitte la lagune A » (au journal de A), puis « elle arrive dans B », puis met à jour `planche_seats`. La marée est marquée réglée **avant** les déplacements. Un arrêt entre les deux étapes, un déploiement (`PlancheLost` pendant la relève) ou une erreur de base à l'arrivée, et la Maison n'est plus nulle part ; elle n'est jamais rejouée. Le joueur reçoit une Maison neuve dans A. Cela contredit la règle d'or 1. | Rejoué sur une copie de la base avec le code de production (`hub.leave()`, puis fermeture, puis réouverture, puis `seatOf`) : **avant** Alvise a 135 515 deniers, 3 ateliers et une tour ; **après** il a `cannaregio-1` avec **300 000 deniers**, l'île de départ, niveau 1, et `ok` reste vrai. Les 135 515 deniers sortis vers `planche:ligue` n'arrivent nulle part. Source : `plancheLagoons.ts:120-130` (claim) et `:196-212`. | Un déménagement en deux phases et rejouable : une ligne `planche_moves` (joueur, de, vers, Maison sérialisée, état), écrite avant `leave` ; au démarrage, finir ou annuler les déménagements en cours. Un contrôle : la somme de `planche:ligue` sur toutes les lagunes est nulle. |
| Q6 | P2 | **N'importe quel JSON mal formé donne une erreur 500 et éteint les alertes.** Le gestionnaire d'erreurs ne laisse pas passer les erreurs 4xx de Fastify (corps illisible, `__proto__`, `NaN`) : réponse 500, et une alerte « Erreur serveur ». Or l'anti-doublon des alertes se règle sur le **titre** seul (`monitor.ts:19-24`). Un anonyme qui envoie `{` toutes les 10 minutes empêche donc toute vraie alerte « Erreur serveur » de partir. | `curl -X POST -H 'content-type: application/json' --data '{' $B/api/auth/logout` → **500** (sans compte). `{"tollBps":NaN}` → 500 ; `{"ruses":{"__proto__":…}}` → 500. Source : `app.ts:150-175`. | Dans `setErrorHandler`, renvoyer `err.statusCode` quand il est inférieur à 500, sans alerte. Pour l'anti-doublon, utiliser le titre plus la première ligne de la pile. |
| Q7 | P2 | **Le Problème du jour se partage : une solution vaut pour toute la lagune.** C'est le même problème pour tous (voulu) et le même lieutenant déterministe. Le moteur du client le résout en 0,7 s. | Le problème `trois-16` (3 pièces) a été résolu hors ligne, puis la même suite `[21,16,26]` envoyée par 4 comptes : **4 × 20 de Prestige et 4 nœuds**. | Avec Q2 (aléa du serveur), ou un tirage du problème par Maison dans une liste de difficulté égale. |
| Q8 | P2 | **Une invitation permet de sauter les ligues.** Un nouveau venu qui rejoint par lien est assis dans la lagune de la compagnie (`prefer`), **sans contrôle de ligue** : un compte neuf peut entrer dans la Sérénissime. Il est même assis **avant** les refus (`company_full`, `mayJoin`), car `who()` passe avant `joinCompagnie`. | Lu dans le code : `plancheRoutes.ts` route `compagnie/join` (`who(req, reply, found?.worlds)` avant `joinCompagnie`) ; `plancheLagoons.ts:261` (`prefer.includes(s.worldId) && s.hub.free() > 0`). Pas rejoué : il faudrait une Sérénissime ouverte. | Garder la préférence seulement pour les lagunes de la ligue 1. Asseoir le joueur après que l'adhésion a réussi. |
| Q9 | P2 | **Une relance pendant un assaut de la Guerre le perd, avec l'essai du jour.** L'assaut en cours n'existe qu'en mémoire (`guerre.ts:107`, `running`). La ligne `guerre_assaults` est écrite au départ (`done=false`). Après une relance, `round` répond `guerre_no_assault` et `start` répond `guerre_today` : l'assaut ne compte pas et le joueur a perdu son essai. Les défis en attente (`plancheDefi.ts`) sont eux aussi en mémoire. | Lu dans le code : `start` insère avant de remplir `running`, et `round` ne lit que `running`. Pas rejoué à l'écran : il faut une flotte (Arsenal au niveau 6). | Garder l'état de l'assaut dans `guerre_assaults` (les coups y sont déjà) et le recharger au besoin ; ou rendre l'essai si l'assaut n'est pas fini à la relance. |
| Q10 | P2 | **Le grand livre de la planche n'est jamais contrôlé en production.** Les invariants horaires (`server.ts:108-118`) ne portent que sur l'ancien monde. `PlancheStore.balances()` ne sert qu'aux tests. Un écart comme celui de Q5 passerait sans être vu. | `grep -rn "balances()" apps/server/src` donne seulement sa définition. Mon contrôle manuel : 468 lignes, somme de tous les comptes = 0, **0 écart** entre `house:<id>` et la bourse des 48 Maisons. | Brancher le même contrôle sur `audit()` toutes les heures : `house:x` égal à la bourse, somme nulle par monde, somme de `planche:ligue` nulle entre les mondes. |
| Q11 | P2 | **Le Fondaco refuse un nom sans dire pourquoi, avec un message faux.** Un nom invalide garde le bouton actif, et l'erreur `invalid_input` s'affiche « Cette adresse ne va pas. », alors que le serveur dit « 3 à 20 lettres, chiffres, espaces simples, _ ou - ». Le nom piégé est bien affiché comme du texte (React échappe). | Capture `01-fonder-nom-piege.png` ; `Entree.tsx:90` (`invalid_input: "Cette adresse ne va pas."`). | Un message propre à la fondation (« 3 à 20 lettres… »), et le bouton désactivé tant que la règle n'est pas respectée. |
| Q12 | P2 | **Erreurs internes renvoyées au joueur.** Les `TypeError` du moteur remontent comme code d'erreur (`answer = e.message`, `planche.ts` `plancheDocApply`), envoyées en 409 avec le message JavaScript brut. Exemple attendu : `arsenal/ship {"kind":"constructor"}` une fois qu'on a un Arsenal (`A.ships[kind]` sans `hasOwn`, `arsenal.ts:163` et `:251` `defenses[kind]`). | Lu dans le code ; sans Arsenal, la route répond `planche_no_arsenal` avant d'y arriver. | `own(A.ships, kind)` et `own(A.port.defenses, kind)` ; dans `plancheDocApply`, transformer toute erreur qui n'est pas un code `planche_*` en `planche_unknown`, et la journaliser. |
| Q13 | P2 | **Des seuils en virgule et en dur dans l'appariement de la Guerre** (`semaine.ts:74` `a.power * 0.15`, `:169` `* 0.3`). Cela contredit les règles « taux en points de base » et « équilibrage dans `worlds.settings` ». Ce n'est pas de l'argent. | `grep -n "\* 0\." packages/engine/src/guerre/semaine.ts`. | `toleranceBps` dans le thème. |
| Q14 | P2 | **Le plafond du phare se contrôle avant d'écrire.** `giveToBeacon` lit « déjà donné aujourd'hui », puis attend le don, puis incrémente. Sur PGlite, 20 dons simultanés sont restés à 60, car tout passe par des files. Sur PostgreSQL avec un pool de 10 connexions, la fenêtre existe. | Rejoué : 20 dons de 15 en parallèle, 4 acceptés (60 au total), le plafond tient en local. Source : `plancheBeacon.ts:54-75`. | Une seule requête conditionnelle (`insert … on conflict do update … where units + x <= cap returning`) avant le don. |

## 4. Ce qui marche (à garder)

- **Les clés piégées** : sur 216 essais (27 routes × 8 clés), aucun crash du moteur et aucune
  pollution de `Object.prototype`. Le moteur utilise `Object.hasOwn` ou `own()` presque partout
  (`planche.ts`, `noir.ts`, `muda.ts`, `maree.ts`, `ligue.ts`, `encre.ts`, `garde.ts`, `jour.ts`,
  `commandes.ts`, `ile.ts`). Fastify refuse `__proto__` comme clé (avec la mauvaise réponse, voir Q6).
  Seuls `take`/`give` (Q4) et `A.ships`/`defenses` (Q12) restent à corriger.
- **La validation zod** à chaque route : entiers bornés, `tollBps` limité à 0–10 000 puis plafonné
  par le moteur à 1 500, cases de l'île par expression régulière, 200 coups au plus, 40 pour les
  commandes, chaînes bornées, `id` d'assaut entier. Les nombres négatifs, `1.5`, `1e400` et les cases
  hors damier répondent 400 ou 422.
- **Les droits** : une sortie ne se joue que par celui qui tient la tour (`planche_not_holder`), une
  seule fois (`planche_sortie_done`). Le décret est refusé hors marée et hors Doge
  (`planche_decret_none`, `planche_not_doge`). La compagnie d'un autre ne se lit pas (`not_member`).
  On ne nomme pas de Doge sans l'être (`not_doge`). Le revoir d'un assaut est réservé à l'assaillant ou
  au maître du port. Une salle de défi pleine refuse un tiers (`room_full`). Le Problème du jour se joue
  une fois (`planche_daily_tried`), le détroit noir est fermé sous le niveau 11 (`planche_level`).
  Chaque plafond est **revérifié à l'intérieur de la file du moteur**, donc deux requêtes simultanées
  ne passent pas deux fois.
- **Le serveur rejoue bien chaque duel** : on ne force pas une tour sans gagner, car un coup illégal
  donne `duel_illegal` et une défaite `duel_lost`. Le problème est le déterminisme (Q2), pas la
  vérification.
- **La durabilité** : `kill -9` au milieu de 38 gestes, et le dernier geste confirmé (péage 30) est là
  après la relance. Le journal (`world_commands`) est écrit avant la réponse.
- **Le grand livre** : 0 écart entre `ledger_entries` et les bourses des 48 Maisons après une
  semaine de jeu (ventes, achats de l'île, péages), somme nulle. Les montants sont en `bigint` de
  bout en bout (`ducats`, `minted`, péages, Muda, commandes, détroits noirs) et sérialisés en chaînes.
- **Les en-têtes** : CSP stricte (`script-src 'self'`), `frame-ancestors 'none'`, cookie de session
  `HttpOnly` et `SameSite=Lax`, `Secure` en production. Pas de `dangerouslySetInnerHTML` dans le web :
  le nom piégé s'affiche comme du texte.
- **Les limites de débit** par session sont actives (le 31ᵉ péage de la minute reçoit 429).

## 5. Trois recommandations prioritaires

1. **Une vue de la planche par joueur** (Q1) : ne plus envoyer `state` brut, mais retirer ce qui est
   secret (ruses, et à l'avenir ce qui doit l'être). C'est une petite fonction, et c'est le seul trou
   qui fausse directement le PvP. Ajouter un test.
2. **Rendre la Passe non rejouable et non bloquante** (Q2, Q3, Q7) : une graine d'aléa tirée par le
   serveur pour chaque duel (gardée au journal pour rejouer), un essai par tour et par heure, le
   Prestige des sceaux compté une fois par tour et par jour. Les rejeux tournent dans un
   `worker_thread` avec une file bornée. Sans cela, un seul script fait tomber les tours et le serveur.
3. **Fermer les bords** en un lot, avec tests : `own()` dans `take`/`give`/`ships`/`defenses` et la
   liste blanche des marchandises (Q4, Q12) ; un déménagement de ligue en deux phases et rejouable
   (Q5) ; les 4xx de Fastify rendus en 4xx sans alerte (Q6) ; le grand livre de la planche dans
   l'audit horaire (Q10).

## Annexe : reproductions

Préparation (serveur de la consigne, port 3688). Les cookies viennent du lien magique lu dans le
journal (`/api/auth/request`, puis `/api/auth/verify {"token":…}`). `$CK_A`, `$CK_B`, `$CK_C` valent
`comptoirs_session=…`, et `B=http://127.0.0.1:3688`.

```sh
# Q1 : Bianca pose ses ruses, Cosimo les lit
curl -s -b "$CK_B" -H 'content-type: application/json' -d '{"ruses":{"bouche":"brulot","nord":"chaine"}}' $B/api/planche/port/ruses >/dev/null
curl -s -b "$CK_C" $B/api/planche | jq '.planche.state.houses["castello-1"].ruses'
# → {"bouche":"brulot","nord":"chaine"}

# Q4 : des points de phare pour rien (membre d'une compagnie)
curl -s -b "$CK_A" -H 'content-type: application/json' -d '{"goods":{"toString":30,"constructor":30}}' $B/api/planche/compagnie/phare | jq .compagnie.phare.points
curl -s -b "$CK_A" $B/api/planche | jq '.planche.state.houses[.planche.me].stock'

# Q6 : 500 et alerte sans compte
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' --data '{' $B/api/auth/logout   # 500
```

Q2 et Q3 : la ligne gagnante calculée hors ligne, puis rejouée (lancé depuis `apps/server`, avec
`node --import tsx solve.mts`) :

```ts
import { passeInit, passePlay, passeThink, venice1450Lagune, venice1450Passe } from "/home/user/naoned/packages/engine/src/index.ts";
const def = venice1450Lagune.passages.find((p) => p.id === "bouche-cannaregio")!;
const b = (venice1450Passe.boards as any)[def.board];
let s = passeInit({ ...venice1450Passe.rules, ...b, cells: [...b.cells], first: 1 });
const mine = [];
while (!s.winner) {
  if (s.turn !== 1) { s = passePlay(s, passeThink(s, { depth: 3 })); continue; }
  const m = passeThink(s, { depth: 4 }); mine.push(m.fire ? { at: m.at, fire: true } : { at: m.at }); s = passePlay(s, m);
}
console.log(s.winner, JSON.stringify(mine)); // 1, 17 coups, 4,3 s
```

```sh
# trois fois la même ligne : la tour change de main ; à lancer en parallèle pour mesurer /api/health
for i in 1 2 3; do curl -s -b "$CK_C" -H 'content-type: application/json' \
  -d "{\"passage\":\"bouche-dorsoduro\",\"moves\":$LINE}" $B/api/planche/force | jq -c '.planche.state.passages["bouche-dorsoduro"]'; done
# → seals 2, 1, puis holder "dorsoduro-1" ; 3 requêtes simultanées : /api/health à 3 566 ms
```

Q5 : sur une **copie** de la base, serveur arrêté (lancé depuis `apps/server` avec
`node --import tsx`) :

```ts
const lagoons = await PlancheLagoons.open(db, plancheTheme(), now);
await lagoons.all()[0].hub.leave(alviseId, now);   // étape 1 de move(), écrite au journal
await close();                                     // « arrêt » avant hub.arrive()
// réouverture :
const l2 = await PlancheLagoons.open(db2, plancheTheme(), now + 60_000);
const { store } = await l2.seatOf(alviseId, "Ca’ Alvise", now + 60_000);
(await store.hub.view(alviseId, "Ca’ Alvise", now + 60_000)).state.houses["cannaregio-1"].ducats; // 300000n au lieu de 135515n
```

Q7 : `plancheDaily(venice1450Lagune, 20780)` donne `trois-16`. La même boucle que Q2, bornée à
`pb.moves` pièces, trouve `[{"at":21},{"at":16},{"at":26}]`. Envoyée par quatre comptes avec
`POST /api/planche/daily`, elle rapporte quatre fois 20 de Prestige.
