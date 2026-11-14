# Fondaco (ex-Comptoirs)

Jeu de commerce multijoueur de niche, web/PWA (PC + mobile) : **la planche**, une lagune partagée où chaque Maison tend des fils de son île vers les villes et force les passages par la Passe. Cadrage qui fait foi : **docs/CADRAGE-v4.md** (le fil rouge, validé par le porteur le 13 novembre 2026 avec l'audit d'ensemble). CADRAGE-v3 et v2 ne valent plus que pour l'ancien jeu et leurs parties techniques. Nom de code du dépôt : naoned.

## Stack
- Monorepo pnpm : apps/web (React + Vite + Tailwind + React Three Fiber, PWA), apps/server (Node + Fastify), apps/simulator (bancs en mémoire), packages/engine (logique pure en TypeScript).
- PostgreSQL via Drizzle ORM, migrations versionnées. Base locale : PGlite (`DATABASE_URL=pglite:…`) en dev et en test. Nouvelle table → apps/server/src/db/schema.ts puis `pnpm --filter @comptoirs/server db:generate --name <nom>`.
- Tests : Vitest. Temps réel : WebSocket.
- Commandes : `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm lint` ; bancs de la planche `pnpm --filter @comptoirs/simulator <nom>-bench` (planche, maison, hex, arsenal, assaut, guerre, muda, maree, passe) ; parcours `pnpm --filter @comptoirs/web e2e:<nom>` après le build du web (`semaine` et `maree` relancent le serveur à des heures choisies avec `CLOCK_START`).
- Déploiement : un seul service Railway (Dockerfile), voir docs/deploiement.md.

## Règles techniques (la planche, telles qu'elles sont)
- Montants en entiers (bigint, en deniers), taux en points de base. Jamais de float.
- **La logique de jeu vit dans packages/engine** (`src/planche/`, `src/passe/`, `src/guerre/`, `src/ile/`), sans accès base : fonctions pures testées, utilisées à l'identique par le serveur, le simulateur et le client hors ligne. Lire une clé saisie toujours par `Object.hasOwn` (jamais `obj[saisie]` nu).
- **Chaque lagune est un document** : un instantané (`world_states`) et le journal de ses commandes (`world_commands`), rejoué au chargement ; la planche est déterministe. Une commande à la fois par lagune (la file du PlancheHub), écrite au journal avant d'être répondue.
- **Le grand livre** (`ledger_entries`, partie double) est écrit à partir des livres des Maisons (`book` : ventes, péages, île, bourses venues ou parties) à chaque écriture ; l'invariant de la planche (tout denier est dans une bourse, brûlé, dépensé, ou venu et parti avec une Maison) est testé.
- La production se calcule par tranches à la lecture, jamais par un tick ; aucun duel ne se joue pendant une lecture (lot A du socle).
- Paramètres d'équilibrage dans le thème (`packages/engine/src/themes/venice1450.lagune.ts`), recopiés dans `worlds.settings` au chargement ; jamais en dur ailleurs.
- Toute table de la couche monde porte world_id.
- Un joueur ne reçoit que ce qui se voit sur la planche : jamais les secrets des autres (ruses, garde, entrepôt, reliques, bourse au denier près).

## Règles d'or (CADRAGE-v4 § 2)
Elles font foi pour toute mécanique et toute fonctionnalité ; en cas de conflit, elles priment.
1. **Une seule planche, aucun mode.** Rien ne se joue ailleurs que sur la planche.
2. **Un seul geste : le fil.** Le rouge est réservé à ce que le joueur a tracé et à la seule action mise en avant.
3. **Ton île t'appartient.** Personne ne prend ni ne détruit ce qui s'y trouve.
4. **On te devance, on ne te vole pas.** Ce qui se dispute, ce sont les places de la planche commune et le rang. On ne risque que ce qu'on engage.
5. **Tout est visible.** La Passe est un duel sans hasard ni pièce cachée ; sur la planche (une sortie de corsaires, la marée), rien ne tombe sans avoir été annoncé.
6. **À armes égales.** La force engagée dans un passage est fixée par le passage. Ni la caisse, ni le rang, ni l'ancienneté, ni l'argent réel ne donnent de puissance.
7. **Chacun peut être le meilleur.** Le rang repart de zéro à chaque marée ; les classements mesurent l'adresse.
8. **Rien ne s'accumule sans fin, et on ne perd rien en dormant.** Tout a un plafond ; aucune série de connexion, aucune récompense qui expire.
9. **Court si tu veux, profond si tu restes.** Cinq minutes font une bonne visite, avec au moins une vraie décision.
10. **Les graphismes sont ceux de Porcellana**, et **tout se voit** : sur la planche, par des objets, des mouvements ; un chiffre ou une liste accompagnent l'image, jamais ne la remplacent.

## Façon de travailler
- **Commencer chaque tâche en mode plan, attendre validation avant de coder.** Les questions se posent avec des options et une recommandation.
- Écrire les tests avant le code pour packages/engine ; les tests du moteur utilisent des fixtures, jamais les paramètres de Venise.
- Tout changement d'équilibrage se mesure au banc et se documente dans docs/calibration.md.
- Petits commits, un par fonctionnalité ; chaque étape fusionnée dans la branche principale par une PR.
- Chaque système absorbe les anciens au lieu de s'y ajouter : **une douzaine de systèmes visibles, trois le premier jour**, les autres ouverts par étape (décision D1 du 13 novembre).
- Hors périmètre : noter dans IDEAS.md, ne pas coder.
- Langue du code : anglais. Langue de l'interface : français (i18n prévu), tutoiement.
- Règles stables dès qu'il y a des joueurs : un changement s'annonce avant de s'appliquer.

## Où en est le jeu
- **L'audit d'ensemble du 13 novembre 2026** (`docs/audit-2026-11-13/`, neuf rapports et la synthèse `00-synthese.md`, décisions D1 à D8 validées) : il fixe la suite, lots **A le socle** (`docs/plan-socle.md`), **B les duels honnêtes**, **C l'économie**, **D douze systèmes et la semaine**, **E le premier quart d'heure et le retour**, **F la compagnie sûre**, dans cet ordre ; une bêta fermée après A, B, C et E. Décisions : ligues gelées et décrets retirés pour la bêta (D2) ; la pile de lieux remplacée par le ruban de la semaine (D3) ; le Large réglé (D4) ; un puits de ducats (D5) ; les duels contre l'ordinateur joués par le serveur coup à coup (D6) ; pas d'accélération payante (D7).
- **Le chemin de l'audit du 11 novembre** (`docs/audit-progression-2026-11-11/`), fait en neuf étapes, chacune avec son plan : `plan-compte`, `plan-lagunes`, `plan-progression-maison`, `plan-hex-commerce`, `plan-arsenal`, `plan-guerre`, `plan-compagnie`, `plan-muda`, `plan-maree` (dans docs/).
- **La planche** : la racine du site l'ouvre (`apps/web/src/porcellana/planche/LabPlanche.tsx`) ; la Passe `apps/web/src/porcellana/passe/` ; l'île `apps/web/src/porcellana/ile/` ; l'assaut `apps/web/src/porcellana/guerre/`. Serveur : `apps/server/src/game/planche*.ts`, `guerre.ts`.
- **La direction visuelle** : Porcellana (docs/plan-porcellana.md, kit `apps/web/src/porcellana/`), et la toile de l'audit visuel du 11 novembre (docs/audit-visuel-2026-11-11/00-audit.md, logo `apps/web/brand/`) : tout nouvel écran la suit.
- **Les tutoriels guidés** (décision du 8 novembre) : le début se guide geste par geste, chaque nouveau lieu a son tutoriel court à la première ouverture (lot E pour la planche).

## L'ancien jeu (endormi)
L'empire, la Porta, la Terraferme et le monde mensuel (CADRAGE-v3) vivent à `/ancien` et dans `packages/engine/src/empire/`, `apps/web/src/empire/`, `apps/server/src/game/` (hors planche). Ils sont **endormis** depuis le lot A : chargés à la demande, leurs tâches de fond arrêtées sauf `ANCIEN_JEU=on`. Aucun lot nouveau n'y est lancé ; leur suppression se décidera à part. Leurs plans et décisions restent dans docs/ (`plan-publication`, `plan-porcellana`, `plan-refonte-claire`, `plan-ateliers`, `plan-premiers-pas`, `plan-terraferme-porcellana`, `plan-porta*`, `plan-dock`, `plan-tutoriels`) ; leurs règles d'or (CADRAGE-v3 § 2) ne valent que pour eux.
